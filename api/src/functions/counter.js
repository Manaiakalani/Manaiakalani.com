'use strict';

/*
 * Visitor counter — Azure Static Web Apps managed function (Node v4 model).
 *
 * GET  /api/counter  -> { count }            (read only)
 * POST /api/counter  -> { count }            (increment, then read)
 *
 * A single Firestore document holds the running total. FieldValue.increment
 * is atomic, so we don't need the Table Storage etag loop. If Firebase isn't
 * configured, count is null and the browser hides the odometer.
 */

const { app } = require('@azure/functions');
const { FieldValue } = require('firebase-admin/firestore');
const core = require('../lib/counter-core');
const { checkRateLimit } = require('../lib/rate-limit');
const firebase = require('../lib/firebase');

const COLLECTION = 'counter';
const DOC = 'hits';

async function readCount(db) {
  const snap = await db.collection(COLLECTION).doc(DOC).get();
  if (!snap.exists) return 0;
  return core.toCount(snap.get('count'));
}

async function incrementCount(db) {
  const ref = db.collection(COLLECTION).doc(DOC);
  await ref.set({ count: FieldValue.increment(1) }, { merge: true });
  const snap = await ref.get();
  return core.toCount(snap.exists ? snap.get('count') : 1);
}

async function respond(request, context) {
  try {
    const db = firebase.getDb();
    if (!db) return { jsonBody: { count: null, backend: 'unconfigured' } };
    if (request.method === 'POST') {
      const limit = await checkRateLimit('counter', request);
      if (!limit.allowed) {
        return {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSec) },
          jsonBody: { count: null, backend: 'rate_limited' }
        };
      }
    }
    const count = request.method === 'POST'
      ? await incrementCount(db)
      : await readCount(db);
    return { jsonBody: { count: count } };
  } catch (e) {
    context.error('counter handler failed', e);
    return { status: 200, jsonBody: { count: null, backend: 'error' } };
  }
}

app.http('counter', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'counter',
  handler: async (request, context) => {
    const res = await respond(request, context);
    res.headers = { ...(res.headers || {}), 'Cache-Control': 'no-store' };
    return res;
  }
});
