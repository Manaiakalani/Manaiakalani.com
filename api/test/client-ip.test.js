'use strict';

/*
 * Zero-dependency unit tests for client-IP extraction.
 * Run: node test/client-ip.test.js  (or `npm test` inside api/)
 */

const assert = require('assert');
const { clientIpFrom, firstHop, normalizeIp } = require('../src/lib/client-ip');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

// Build a case-insensitive header accessor from a plain object.
function headers(map) {
  return function (n) { return map[String(n).toLowerCase()]; };
}

test('prefers cf-connecting-ip over x-forwarded-for', function () {
  assert.strictEqual(
    clientIpFrom(headers({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '10.0.0.1' })),
    '203.0.113.7'
  );
});
test('falls back to the first x-forwarded-for hop', function () {
  assert.strictEqual(
    clientIpFrom(headers({ 'x-forwarded-for': '198.51.100.9, 10.0.0.1, 172.16.0.1' })),
    '198.51.100.9'
  );
});
test('trims whitespace around the chosen ip', function () {
  assert.strictEqual(
    clientIpFrom(headers({ 'x-forwarded-for': '  198.51.100.9 , 10.0.0.1' })),
    '198.51.100.9'
  );
});
test('falls back to x-real-ip when nothing else is present', function () {
  assert.strictEqual(clientIpFrom(headers({ 'x-real-ip': '192.0.2.44' })), '192.0.2.44');
});
test('returns empty string when no usable header exists', function () {
  assert.strictEqual(clientIpFrom(headers({})), '');
  assert.strictEqual(clientIpFrom(null), '');
});
test('preserves IPv6 literals (colons are legitimate)', function () {
  assert.strictEqual(clientIpFrom(headers({ 'cf-connecting-ip': '2001:db8::1' })), '2001:db8::1');
});
test('firstHop handles a single value with no comma', function () {
  assert.strictEqual(firstHop('203.0.113.7'), '203.0.113.7');
});
test('normalizeIp rejects non-strings and caps length', function () {
  assert.strictEqual(normalizeIp(12345), '');
  assert.strictEqual(normalizeIp(''), '');
  assert.strictEqual(normalizeIp('x'.repeat(200)).length, 64);
});

console.log('\n' + passed + ' checks passed.');
