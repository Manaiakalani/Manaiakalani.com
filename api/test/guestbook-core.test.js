'use strict';

/*
 * Zero-dependency unit tests for the guestbook core logic.
 * Run: node test/guestbook-core.test.js  (or `npm test` inside api/)
 * Validates the sanitization/validation/shaping that guards the endpoint,
 * without needing the Functions runtime or Azure.
 */

const assert = require('assert');
const core = require('../src/lib/guestbook-core');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

// ---- cleanStr ----
test('cleanStr caps length', function () {
  assert.strictEqual(core.cleanStr('x'.repeat(200), 40).length, 40);
});
test('cleanStr strips control chars and collapses whitespace', function () {
  assert.strictEqual(core.cleanStr('a\u0000b\t\t c\nd', 40), 'a b c d');
});
test('cleanStr coerces non-strings to empty', function () {
  [null, undefined, 42, {}, [], true].forEach(function (v) {
    assert.strictEqual(core.cleanStr(v, 40), '');
  });
});
test('cleanStr trims surrounding whitespace', function () {
  assert.strictEqual(core.cleanStr('   hi   ', 40), 'hi');
});

// ---- cleanId ----
test('cleanId keeps allow-listed chars, strips the rest, and caps length', function () {
  assert.strictEqual(core.cleanId('Ab3-9xY'), 'Ab3-9xY');
  assert.strictEqual(core.cleanId('a b|c<d>e"f'), 'abcdef');
  assert.strictEqual(core.cleanId('z'.repeat(80)).length, core.MAX_ID);
});
test('cleanId coerces non-strings to empty', function () {
  [null, undefined, 42, {}, [], true].forEach(function (v) {
    assert.strictEqual(core.cleanId(v), '');
  });
});

// ---- sanitizeIncoming ----
test('sanitizeIncoming accepts a valid body', function () {
  assert.deepStrictEqual(core.sanitizeIncoming({ name: 'Ada', message: 'hello' }), { name: 'Ada', message: 'hello', id: '' });
});
test('sanitizeIncoming rejects blank / whitespace-only fields', function () {
  assert.strictEqual(core.sanitizeIncoming({ name: '   ', message: 'hi' }), null);
  assert.strictEqual(core.sanitizeIncoming({ name: 'Ada', message: '' }), null);
});
test('sanitizeIncoming rejects missing fields and non-objects', function () {
  assert.strictEqual(core.sanitizeIncoming({ name: 'Ada' }), null);
  assert.strictEqual(core.sanitizeIncoming(null), null);
  assert.strictEqual(core.sanitizeIncoming('nope'), null);
});
test('sanitizeIncoming ignores extra keys (no prototype pollution vector)', function () {
  var out = core.sanitizeIncoming({ name: 'Ada', message: 'hi', __proto__: { polluted: true }, date: 'evil', seq: 9 });
  assert.deepStrictEqual(Object.keys(out).sort(), ['id', 'message', 'name']);
  assert.strictEqual(({}).polluted, undefined);
});
test('sanitizeIncoming keeps a clean client id and strips a dirty one', function () {
  var clean = core.sanitizeIncoming({ name: 'Ada', message: 'hi', id: 'a1b2-c3d4-EF' });
  assert.strictEqual(clean.id, 'a1b2-c3d4-EF');
  var dirty = core.sanitizeIncoming({ name: 'Ada', message: 'hi', id: 'ab cd-EF!' });
  assert.strictEqual(dirty.id, 'abcd-EF');
  assert.strictEqual(core.sanitizeIncoming({ name: 'Ada', message: 'hi', id: 'z'.repeat(80) }).id.length, core.MAX_ID);
  assert.strictEqual(core.sanitizeIncoming({ name: 'Ada', message: 'hi', id: 42 }).id, '');
});
test('sanitizeIncoming enforces field caps', function () {
  var out = core.sanitizeIncoming({ name: 'n'.repeat(100), message: 'm'.repeat(500) });
  assert.strictEqual(out.name.length, core.MAX_NAME);
  assert.strictEqual(out.message.length, core.MAX_MESSAGE);
});

// ---- toPublic ----
test('toPublic sorts newest-first by seq', function () {
  var out = core.toPublic([
    { name: 'old', message: 'a', date: 'x', seq: 1 },
    { name: 'new', message: 'b', date: 'y', seq: 3 },
    { name: 'mid', message: 'c', date: 'z', seq: 2 }
  ]);
  assert.deepStrictEqual(out.map(function (e) { return e.name; }), ['new', 'mid', 'old']);
});
test('toPublic caps at MAX_RETURN', function () {
  var many = [];
  for (var i = 0; i < 250; i++) many.push({ name: 'n' + i, message: 'm', date: 'd', seq: i });
  assert.strictEqual(core.toPublic(many).length, core.MAX_RETURN);
});
test('toPublic re-sanitizes stored rows and drops empties', function () {
  var out = core.toPublic([
    { name: 'A\u0000B', message: 'hi\tthere', date: '2026', seq: 2, id: 'good-id-1' },
    { name: '', message: '', date: '', seq: 1 }
  ]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].name, 'A B');
  assert.strictEqual(out[0].message, 'hi there');
  assert.strictEqual(out[0].id, 'good-id-1');
});
test('toPublic echoes a cleaned id and tolerates a missing one', function () {
  var out = core.toPublic([
    { name: 'A', message: 'a', date: 'd', seq: 2, id: 'x y|z-9' },
    { name: 'B', message: 'b', date: 'd', seq: 1 }
  ]);
  assert.strictEqual(out[0].id, 'xyz-9');
  assert.strictEqual(out[1].id, '');
});
test('toPublic tolerates non-array input', function () {
  assert.deepStrictEqual(core.toPublic(null), []);
  assert.deepStrictEqual(core.toPublic('nope'), []);
});

console.log('\n' + passed + ' checks passed.');
