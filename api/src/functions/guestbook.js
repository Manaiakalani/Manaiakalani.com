'use strict';

/*
 * Shared guestbook — Azure Static Web Apps managed function (Node v4 model).
 *
 * GET  /api/guestbook  -> { entries: [{name, message, date}, ...] }  (newest first)
 * POST /api/guestbook  -> { entries: [...] }  after appending {name, message}
 *
 * Storage is Azure Table Storage, addressed by the TABLES_CONNECTION_STRING app
 * setting (falls back to the built-in AzureWebJobsStorage). If neither is set the
 * function still responds 200 with a soft signal, so the browser keeps using its
 * localStorage copy and the guestbook never breaks.
 */

const { app } = require('@azure/functions');
const { TableClient, odata } = require('@azure/data-tables');
const core = require('../lib/guestbook-core');
const { checkRateLimit } = require('../lib/rate-limit');

const TABLE_NAME = 'guestbook';
const PARTITION = 'entries';
// Upper bound on rows pulled into memory per request. toPublic caps the public
// list to 100; 200 gives sorting headroom while stopping a spam flood from
// forcing an unbounded full-partition scan on every read.
const MAX_READ = 200;
// RowKeys store an inverted timestamp so Table Storage's ascending RowKey order
// yields newest-first. Base stays above Date.now() (keeping the value positive
// and, after padStart, a fixed 16-digit width so lexicographic order matches
// reverse-chronological order) until roughly the year 65,000 — no practical limit.
const ROWKEY_BASE = 2e15;

// Table creation is idempotent but costs a round-trip; cache success for the
// lifetime of this warm function instance.
let tableReady = false;

function getClient() {
  const cs = process.env.TABLES_CONNECTION_STRING || process.env.AzureWebJobsStorage || '';
  if (!cs) return null;
  return TableClient.fromConnectionString(cs, TABLE_NAME);
}

async function ensureTable(client) {
  if (tableReady) return;
  // The SDK resolves createTable() when the table already exists (409 +
  // TableAlreadyExists) and rethrows every other error — including the rare
  // 409 TableBeingDeleted. So a clean resolve means the table is usable and we
  // can cache it; a throw propagates to the handler's catch (graceful degrade)
  // and leaves tableReady false so the next request retries.
  await client.createTable();
  tableReady = true;
}

async function readRows(client) {
  // Fetch a single page capped at MAX_READ so a spam flood can't force a
  // full-partition scan. Newest-first RowKey ordering means this page holds the
  // newest rows; toPublic() then sorts by seq and caps the public list to 100.
  const iter = client
    .listEntities({ queryOptions: { filter: odata`PartitionKey eq ${PARTITION}` } })
    .byPage({ maxPageSize: MAX_READ });
  const first = await iter.next();
  const page = (first && first.value) || [];
  const rows = [];
  for (const e of page) {
    rows.push({ name: e.name, message: e.message, date: e.date, seq: e.seq });
  }
  return rows;
}

function newRowKey(now) {
  return String(ROWKEY_BASE - now).padStart(16, '0') + '-' + Math.random().toString(36).slice(2, 8);
}

app.http('guestbook', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'guestbook',
  handler: async (request, context) => {
    const client = getClient();
    try {
      if (request.method === 'GET') {
        if (!client) return { jsonBody: { entries: [], backend: 'unconfigured' } };
        await ensureTable(client);
        return { jsonBody: { entries: core.toPublic(await readRows(client)) } };
      }

      // POST — append a signature. Throttle first so a flood is shed before we
      // touch storage; the limiter fails open, so a legit signer is never blocked
      // by a backend hiccup.
      const limit = await checkRateLimit('guestbook', request);
      if (!limit.allowed) {
        return {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSec) },
          jsonBody: { error: 'Too many signatures — please wait a moment and try again.' }
        };
      }
      let raw = {};
      try { raw = await request.json(); } catch (e) { raw = {}; }
      const incoming = core.sanitizeIncoming(raw);
      if (!incoming) {
        return { status: 400, jsonBody: { error: 'name and message are required' } };
      }
      if (!client) {
        // No storage configured: acknowledge without persisting; entries:null tells
        // the client to keep the entry it already saved to localStorage.
        return { status: 200, jsonBody: { entries: null, backend: 'unconfigured' } };
      }
      await ensureTable(client);
      const now = Date.now();
      await client.createEntity({
        partitionKey: PARTITION,
        rowKey: newRowKey(now),
        name: incoming.name,
        message: incoming.message,
        date: core.today(),
        seq: now
      });
      return { status: 201, jsonBody: { entries: core.toPublic(await readRows(client)) } };
    } catch (e) {
      context.error('guestbook handler failed', e);
      // Never turn a backend hiccup into a broken guestbook: 200 + entries:null
      // keeps the client on its localStorage copy.
      return { status: 200, jsonBody: { entries: null, backend: 'error' } };
    }
  }
});
