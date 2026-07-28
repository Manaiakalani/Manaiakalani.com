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

const TABLE_NAME = 'guestbook';
const PARTITION = 'entries';

function getClient() {
  const cs = process.env.TABLES_CONNECTION_STRING || process.env.AzureWebJobsStorage || '';
  if (!cs) return null;
  return TableClient.fromConnectionString(cs, TABLE_NAME);
}

async function ensureTable(client) {
  try { await client.createTable(); } catch (e) { /* already exists — fine */ }
}

async function readRows(client) {
  const rows = [];
  const iter = client.listEntities({ queryOptions: { filter: odata`PartitionKey eq ${PARTITION}` } });
  for await (const e of iter) {
    rows.push({ name: e.name, message: e.message, date: e.date, seq: e.seq });
  }
  return rows;
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

      // POST — append a signature.
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
        rowKey: String(now) + '-' + Math.random().toString(36).slice(2, 8),
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
