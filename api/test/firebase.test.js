'use strict';

const assert = require('assert');
const { parseServiceAccount, credentialsFromEnv } = require('../src/lib/firebase');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

test('parseServiceAccount reads a standard service-account JSON', function () {
  const cred = parseServiceAccount(JSON.stringify({
    project_id: 'mnk',
    client_email: 'fn@mnk.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n'
  }));
  assert.strictEqual(cred.projectId, 'mnk');
  assert.strictEqual(cred.clientEmail, 'fn@mnk.iam.gserviceaccount.com');
  assert.ok(cred.privateKey.indexOf('\n') !== -1);
  assert.ok(cred.privateKey.indexOf('\\n') === -1);
});

test('parseServiceAccount rejects junk', function () {
  assert.strictEqual(parseServiceAccount(''), null);
  assert.strictEqual(parseServiceAccount('{'), null);
  assert.strictEqual(parseServiceAccount(JSON.stringify({ project_id: 'x' })), null);
});

test('credentialsFromEnv prefers FIREBASE_SERVICE_ACCOUNT JSON', function () {
  const cred = credentialsFromEnv({
    FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
      project_id: 'from-json',
      client_email: 'a@b.c',
      private_key: 'KEY'
    }),
    FIREBASE_PROJECT_ID: 'ignored'
  });
  assert.strictEqual(cred.projectId, 'from-json');
});

test('credentialsFromEnv falls back to split vars', function () {
  const cred = credentialsFromEnv({
    FIREBASE_PROJECT_ID: 'split',
    FIREBASE_CLIENT_EMAIL: 'a@b.c',
    FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nZ\\n-----END PRIVATE KEY-----\\n'
  });
  assert.strictEqual(cred.projectId, 'split');
  assert.ok(cred.privateKey.indexOf('\nZ\n') !== -1);
});

test('credentialsFromEnv returns null when nothing is set', function () {
  assert.strictEqual(credentialsFromEnv({}), null);
});

if (!process.exitCode) console.log(passed + ' passing');
