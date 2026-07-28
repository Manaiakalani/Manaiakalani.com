'use strict';

/*
 * Zero-dependency unit tests for the visitor-counter core logic.
 * Run: node test/counter-core.test.js  (or `npm test` inside api/)
 * Validates the integer coercion that keeps the odometer from going negative,
 * fractional, or unbounded — without needing the Functions runtime or Azure.
 */

const assert = require('assert');
const core = require('../src/lib/counter-core');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

// ---- toCount ----
test('toCount passes through a normal integer', function () {
  assert.strictEqual(core.toCount(42), 42);
});
test('toCount parses a numeric string', function () {
  assert.strictEqual(core.toCount('1234'), 1234);
});
test('toCount floors a fractional value', function () {
  assert.strictEqual(core.toCount(7.9), 7);
});
test('toCount clamps negatives to zero', function () {
  assert.strictEqual(core.toCount(-5), 0);
});
test('toCount coerces garbage to zero', function () {
  assert.strictEqual(core.toCount('nope'), 0);
  assert.strictEqual(core.toCount(null), 0);
  assert.strictEqual(core.toCount(undefined), 0);
  assert.strictEqual(core.toCount(NaN), 0);
  assert.strictEqual(core.toCount(Infinity), 0);
});
test('toCount parses exponent-notation strings (Number, not parseInt)', function () {
  assert.strictEqual(core.toCount('1e6'), 1000000);
});
test('toCount saturates at the cap', function () {
  assert.strictEqual(core.toCount(core.MAX_COUNT + 1000), core.MAX_COUNT);
});

// ---- nextCount ----
test('nextCount increments a normal value', function () {
  assert.strictEqual(core.nextCount(99), 100);
});
test('nextCount starts a fresh counter at 1', function () {
  assert.strictEqual(core.nextCount(undefined), 1);
  assert.strictEqual(core.nextCount(0), 1);
  assert.strictEqual(core.nextCount('garbage'), 1);
});
test('nextCount recovers from a negative stored value', function () {
  assert.strictEqual(core.nextCount(-10), 1);
});
test('nextCount never exceeds the cap', function () {
  assert.strictEqual(core.nextCount(core.MAX_COUNT), core.MAX_COUNT);
});

console.log('\n' + passed + ' checks passed.');
