'use strict';

const assert = require('assert');
const core = require('../src/lib/repos-core');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

test('normalizeRepo keeps a well-formed repo', function () {
  const n = core.normalizeRepo({
    name: 'alpha', html_url: 'https://github.com/t/alpha', description: 'hi',
    language: 'Go', fork: false, stargazers_count: 3, forks_count: 1,
    pushed_at: '2026-01-01T00:00:00Z'
  });
  assert.strictEqual(n.name, 'alpha');
  assert.strictEqual(n.stargazers_count, 3);
  assert.strictEqual(n.pushed_at, '2026-01-01T00:00:00Z');
});

test('normalizeRepo drops missing name or url', function () {
  assert.strictEqual(core.normalizeRepo({ html_url: 'https://x' }), null);
  assert.strictEqual(core.normalizeRepo({ name: 'x' }), null);
});

test('normalizeRepo clamps junk counts and invalid dates', function () {
  const n = core.normalizeRepo({
    name: 'x', html_url: 'https://x', stargazers_count: -4, forks_count: 'nope', pushed_at: 'whenever'
  });
  assert.strictEqual(n.stargazers_count, 0);
  assert.strictEqual(n.forks_count, 0);
  assert.strictEqual(n.pushed_at, null);
});

test('normalizeRepos skips garbage entries', function () {
  const out = core.normalizeRepos([null, { name: 'ok', html_url: 'https://x' }, 5]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].name, 'ok');
});

test('parseLinkHeader reads rel=next', function () {
  const links = core.parseLinkHeader('<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=3>; rel="last"');
  assert.strictEqual(links.next, 'https://api.github.com/x?page=2');
  assert.strictEqual(links.last, 'https://api.github.com/x?page=3');
});

if (!process.exitCode) console.log(passed + ' passing');
