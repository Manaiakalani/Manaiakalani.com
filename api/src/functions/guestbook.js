'use strict';

/*
 * Shared guestbook — Azure Static Web Apps managed function (Node v4 model).
 *
 * GET  /api/guestbook  -> { entries: [{name, message, date}, ...] }  (newest first)
 * POST /api/guestbook  -> { entries: [...] }  after appending {name, message}
 *
 * Storage is Cloud Firestore via Firebase Admin. Credentials come from
 * FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_PROJECT_ID + CLIENT_EMAIL +
 * PRIVATE_KEY. If none are set the function still responds 200 with a soft
 * signal, so the browser keeps using its localStorage copy.
 */

const { app } = require('@azure/functions');
const core = require('../lib/guestbook-core');
const { checkRateLimit } = require('../lib/rate-limit');
const firebase = require('../lib/firebase');

const COLLECTION = 'guestbook';
const MAX_READ = 100;

async function readRows(db) {
  const snap = await db.collection(COLLECTION)
    .orderBy('seq', 'desc')
    .limit(MAX_READ)
    .get();
  const rows = [];
  snap.forEach(function (doc) {
    rows.push(core.projectRow(doc.data()));
  });
  return rows;
}

async function respond(request, context) {
  try {
    const db = firebase.getDb();
    if (request.method === 'GET') {
      if (!db) return { jsonBody: { entries: [], backend: 'unconfigured' } };
      return { jsonBody: { entries: core.toPublic(await readRows(db)) } };
    }

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
    if (!db) {
      return { status: 200, jsonBody: { entries: null, backend: 'unconfigured' } };
    }
    const now = Date.now();
    await db.collection(COLLECTION).add({
      name: incoming.name,
      message: incoming.message,
      date: core.today(),
      id: incoming.id,
      seq: now
    });
    return { status: 201, jsonBody: { entries: core.toPublic(await readRows(db)) } };
  } catch (e) {
    context.error('guestbook handler failed', e);
    return { status: 200, jsonBody: { entries: null, backend: 'error' } };
  }
}

app.http('guestbook', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'guestbook',
  handler: async (request, context) => {
    const res = await respond(request, context);
    res.headers = { ...(res.headers || {}), 'Cache-Control': 'no-store' };
    return res;
  }
});
