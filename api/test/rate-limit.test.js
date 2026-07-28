'use strict';

/*
 * Tests for the Table Storage-backed rate limiter's I/O-free guarantees:
 * fail-open behaviour and the privacy-preserving IP hash. The concurrency /
 * windowing logic lives in rate-limit-core (separately unit-tested); here we
 * only assert the wrapper never breaks the endpoint and never stores a raw IP.
 * Uses node:test so the async fail-open paths are awaited correctly.
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Guarantee the unconfigured path: no storage env for this test process.
delete process.env.TABLES_CONNECTION_STRING;
delete process.env.AzureWebJobsStorage;

const rl = require('../src/lib/rate-limit');

function reqWith(map) {
  return { headers: { get: function (n) { return map[String(n).toLowerCase()]; } } };
}

test('fails open (allowed) when storage is unconfigured', async () => {
  const r = await rl.checkRateLimit('guestbook', reqWith({ 'cf-connecting-ip': '203.0.113.5' }));
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.retryAfterSec, 0);
});

test('fails open when the header accessor throws', async () => {
  const badReq = { headers: { get: function () { throw new Error('boom'); } } };
  const r = await rl.checkRateLimit('counter', badReq);
  assert.strictEqual(r.allowed, true);
});

test('unknown bucket still resolves (falls back to a policy, fails open)', async () => {
  const r = await rl.checkRateLimit('nope', reqWith({ 'cf-connecting-ip': '203.0.113.5' }));
  assert.strictEqual(r.allowed, true);
});

test('hashIp is deterministic, fixed-width, and never contains the raw ip', () => {
  const a = rl.hashIp('203.0.113.5');
  assert.strictEqual(a, rl.hashIp('203.0.113.5'));
  assert.strictEqual(a.length, 32);
  assert.ok(!a.includes('203.0.113.5'));
});

test('different ips hash to different keys', () => {
  assert.notStrictEqual(rl.hashIp('203.0.113.5'), rl.hashIp('203.0.113.6'));
});

/*
 * _commit() exercises the concurrency-controlled read-modify-write against an
 * injected fake client (no Azure). These cover the storage path the wrapper
 * tests above deliberately skip: the etag guard, skip-write-on-deny, the
 * 409/412 retry, and deny-on-contention.
 */
function err(statusCode) {
  const e = new Error('status ' + statusCode);
  e.statusCode = statusCode;
  return e;
}

// A minimal in-memory TableClient: one row, monotonically bumped etag, with
// If-Match enforcement and create-if-absent semantics, plus call counters.
function fakeClient(initial) {
  let store = initial ? Object.assign({}, initial) : null;
  let seq = store && store.etag ? 1 : 0;
  const calls = { create: 0, update: 0 };
  return {
    calls,
    row: function () { return store; },
    getEntity: async function () {
      if (!store) throw err(404);
      return { windowStart: store.windowStart, count: store.count, etag: store.etag };
    },
    createEntity: async function (entity) {
      calls.create++;
      if (store) throw err(409); // someone created it first
      seq++;
      store = { windowStart: entity.windowStart, count: entity.count, etag: 'W/"' + seq + '"' };
    },
    updateEntity: async function (entity, mode, opts) {
      calls.update++;
      if (!store) throw err(404);
      if (opts && opts.etag && opts.etag !== store.etag) throw err(412); // lost the race
      seq++;
      store = { windowStart: entity.windowStart, count: entity.count, etag: 'W/"' + seq + '"' };
    }
  };
}

const policy2 = { limit: 2, windowMs: 1000 };

test('_commit creates the row on the first request and allows it', async () => {
  const c = fakeClient(null);
  const r = await rl._commit(c, 'rl-guestbook', 'k', policy2, 1000);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(c.calls.create, 1);
  assert.strictEqual(c.row().count, 1);
});

test('_commit allows exactly `limit` per window, then denies without writing', async () => {
  const c = fakeClient(null);
  const p = 'rl-guestbook', k = 'k', now = 5000;
  assert.strictEqual((await rl._commit(c, p, k, policy2, now)).allowed, true);  // 1
  assert.strictEqual((await rl._commit(c, p, k, policy2, now)).allowed, true);  // 2
  const writesBefore = c.calls.create + c.calls.update;
  const denied = await rl._commit(c, p, k, policy2, now);                       // 3 -> denied
  assert.strictEqual(denied.allowed, false);
  assert.ok(denied.retryAfterSec > 0);
  // A denied request must not touch storage.
  assert.strictEqual(c.calls.create + c.calls.update, writesBefore);
  assert.strictEqual(c.row().count, 2);
});

test('_commit retries and succeeds after a 412 (lost etag race)', async () => {
  // Row exists at count 1; the first updateEntity throws 412, then succeeds.
  const c = fakeClient({ windowStart: 1000, count: 1, etag: 'W/"1"' });
  let firstUpdate = true;
  const realUpdate = c.updateEntity;
  c.updateEntity = async function (entity, mode, opts) {
    if (firstUpdate) { firstUpdate = false; c.calls.update++; throw err(412); }
    return realUpdate.call(c, entity, mode, opts);
  };
  const r = await rl._commit(c, 'rl-guestbook', 'k', { limit: 5, windowMs: 1000 }, 1500);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(c.row().count, 2); // counted against the fresh re-read
});

test('_commit denies (throttles) when contention never clears', async () => {
  const c = fakeClient({ windowStart: 1000, count: 1, etag: 'W/"1"' });
  c.updateEntity = async function () { c.calls.update++; throw err(412); }; // always loses
  const r = await rl._commit(c, 'rl-guestbook', 'k', { limit: 5, windowMs: 2000 }, 1500);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.retryAfterSec, 2); // ceil(windowMs/1000)
  assert.ok(c.calls.update >= 5); // exhausted the retry budget
});
