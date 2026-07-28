'use strict';

/*
 * Zero-dependency unit tests for the fixed-window rate-limit decision logic.
 * Run: node test/rate-limit-core.test.js  (or `npm test` inside api/)
 */

const assert = require('assert');
const core = require('../src/lib/rate-limit-core');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

const OPTS = { limit: 3, windowMs: 1000 };

test('first request in a fresh window is allowed with count 1', function () {
  const r = core.evaluate(null, 1000, OPTS);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 1);
  assert.strictEqual(r.record.windowStart, 1000);
});
test('requests under the limit increment and stay allowed', function () {
  const r = core.evaluate({ windowStart: 1000, count: 1 }, 1200, OPTS);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 2);
  assert.strictEqual(r.record.windowStart, 1000);
});
test('the request that reaches the limit is still allowed', function () {
  const r = core.evaluate({ windowStart: 1000, count: 2 }, 1300, OPTS); // -> count 3 == limit
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 3);
});
test('requests over the limit are denied and not counted', function () {
  const r = core.evaluate({ windowStart: 1000, count: 3 }, 1400, OPTS);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.record.count, 3);
  assert.strictEqual(r.retryAfterSec, 1); // ceil((1000 - 400) / 1000)
});
test('a fully elapsed window resets the counter', function () {
  const r = core.evaluate({ windowStart: 1000, count: 3 }, 2500, OPTS);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 1);
  assert.strictEqual(r.record.windowStart, 2500);
});
test('the exact window boundary starts a new window', function () {
  const r = core.evaluate({ windowStart: 1000, count: 3 }, 2000, OPTS); // 2000 - 1000 >= 1000
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 1);
});
test('a record dated in the future is treated as fresh (no lock-out)', function () {
  const r = core.evaluate({ windowStart: 5000, count: 3 }, 1000, OPTS);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.windowStart, 1000);
  assert.strictEqual(r.record.count, 1);
});
test('garbage record fields coerce safely', function () {
  const r = core.evaluate({ windowStart: 'x', count: 'y' }, 1000, OPTS);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 1);
});
test('a zero/invalid limit falls back to the default (never locks all out)', function () {
  const r = core.evaluate({ windowStart: 1000, count: 5 }, 1100, { limit: 0, windowMs: 1000 });
  assert.strictEqual(r.allowed, true); // default limit 10 > 5
});
test('retryAfterSec reflects the remaining window', function () {
  const r = core.evaluate({ windowStart: 1000, count: 3 }, 1050, { limit: 3, windowMs: 2000 });
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.retryAfterSec, 2); // ceil((2000 - 50) / 1000)
});
test('defaults apply when opts is omitted', function () {
  const r = core.evaluate(null, 0);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.record.count, 1);
});

console.log('\n' + passed + ' checks passed.');
