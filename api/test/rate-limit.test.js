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
