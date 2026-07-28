'use strict';

/*
 * Visitor counter — Azure Static Web Apps managed function (Node v4 model).
 *
 * GET  /api/counter  -> { count }            (read only)
 * POST /api/counter  -> { count }            (increment, then read)
 *
 * A single Table Storage entity holds the running total. Azure Tables has no
 * atomic increment, so POST does an optimistic-concurrency read-modify-write:
 * read the entity + ETag, write the next value with If-Match, and retry on a
 * 412 (someone else incremented first). Like the guestbook it shares
 * TABLES_CONNECTION_STRING; with no storage configured it returns count:null so
 * the browser simply hides the counter — the page never breaks.
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const core = require('../lib/counter-core');

const TABLE_NAME = 'counter';
const PARTITION = 'site';
const ROW = 'hits';
const MAX_ATTEMPTS = 5;

let tableReady = false;

function getClient() {
  const cs = process.env.TABLES_CONNECTION_STRING || process.env.AzureWebJobsStorage || '';
  if (!cs) return null;
  return TableClient.fromConnectionString(cs, TABLE_NAME);
}

async function ensureTable(client) {
  if (tableReady) return;
  // The SDK resolves createTable() when the table already exists and rethrows
  // anything else, so a clean resolve is safe to cache for this warm instance.
  await client.createTable();
  tableReady = true;
}

async function readEntity(client) {
  try {
    return await client.getEntity(PARTITION, ROW);
  } catch (e) {
    if (e && e.statusCode === 404) return null;
    throw e;
  }
}

async function readCount(client) {
  await ensureTable(client);
  const cur = await readEntity(client);
  return cur ? core.toCount(cur.count) : 0;
}

async function incrementCount(client) {
  await ensureTable(client);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cur = await readEntity(client);
    if (!cur) {
      try {
        await client.createEntity({ partitionKey: PARTITION, rowKey: ROW, count: 1 });
        return 1;
      } catch (e) {
        if (e && e.statusCode === 409) continue; // created concurrently → retry as an update
        throw e;
      }
    }
    const next = core.nextCount(cur.count);
    try {
      await client.updateEntity(
        { partitionKey: PARTITION, rowKey: ROW, count: next },
        'Replace',
        { etag: cur.etag }
      );
      return next;
    } catch (e) {
      if (e && e.statusCode === 412) continue; // lost the race → re-read and retry
      throw e;
    }
  }
  // Gave up racing under heavy contention: report the current total, best effort.
  return await readCount(client);
}

app.http('counter', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'counter',
  handler: async (request, context) => {
    const client = getClient();
    try {
      if (!client) return { jsonBody: { count: null, backend: 'unconfigured' } };
      const count = request.method === 'POST'
        ? await incrementCount(client)
        : await readCount(client);
      return { jsonBody: { count: count } };
    } catch (e) {
      context.error('counter handler failed', e);
      // Never turn a backend hiccup into a broken page: the client hides the
      // counter when count is null.
      return { status: 200, jsonBody: { count: null, backend: 'error' } };
    }
  }
});
