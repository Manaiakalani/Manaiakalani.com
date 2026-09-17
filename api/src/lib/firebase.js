'use strict';

/*
 * Lazy Firebase Admin / Firestore handle for the Azure Functions API.
 *
 * Credentials (first match wins):
 *   FIREBASE_SERVICE_ACCOUNT  — full service-account JSON (private_key may use \n)
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *
 * Returns null when nothing is configured so callers can degrade the same way
 * they did with a missing TABLES_CONNECTION_STRING: the page never breaks.
 *
 * preferRest: Azure SWA's Node runtime has no reliable gRPC binary; REST
 * keeps Firestore talking over HTTPS.
 */

const admin = require('firebase-admin');

let cachedDb = null;
let initAttempted = false;

function parseServiceAccount(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const json = JSON.parse(raw);
    const projectId = json.project_id || json.projectId;
    const clientEmail = json.client_email || json.clientEmail;
    let privateKey = json.private_key || json.privateKey;
    if (!projectId || !clientEmail || !privateKey) return null;
    if (typeof privateKey === 'string') privateKey = privateKey.replace(/\\n/g, '\n');
    return { projectId: projectId, clientEmail: clientEmail, privateKey: privateKey };
  } catch (e) {
    return null;
  }
}

function credentialsFromFile() {
  const fs = require('fs');
  const path = require('path');
  const p = path.join(__dirname, '..', '..', '.firebase-sa.json');
  try {
    if (!fs.existsSync(p)) return null;
    return parseServiceAccount(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function credentialsFromEnv(env) {
  env = env || process.env;
  const fromJson = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT || '');
  if (fromJson) return fromJson;
  const fromFile = credentialsFromFile();
  if (fromFile) return fromFile;
  const projectId = env.FIREBASE_PROJECT_ID || '';
  const clientEmail = env.FIREBASE_CLIENT_EMAIL || '';
  let privateKey = env.FIREBASE_PRIVATE_KEY || '';
  if (!projectId || !clientEmail || !privateKey) return null;
  privateKey = privateKey.replace(/\\n/g, '\n');
  return { projectId: projectId, clientEmail: clientEmail, privateKey: privateKey };
}

function getDb() {
  if (cachedDb) return cachedDb;
  if (initAttempted) return null;
  initAttempted = true;
  const cred = credentialsFromEnv();
  if (!cred) return null;
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: cred.projectId,
          clientEmail: cred.clientEmail,
          privateKey: cred.privateKey
        })
      });
    }
    const db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true, preferRest: true });
    cachedDb = db;
    return cachedDb;
  } catch (e) {
    return null;
  }
}

function statusErr(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function mapGrpcStatus(e) {
  if (!e) return e;
  // firebase-admin / grpc: ALREADY_EXISTS=6, NOT_FOUND=5, FAILED_PRECONDITION=9
  if (e.code === 6 || e.code === 'already-exists') e.statusCode = 409;
  else if (e.code === 5 || e.code === 'not-found') e.statusCode = 404;
  else if (e.code === 9 || e.code === 'failed-precondition') e.statusCode = 412;
  return e;
}

// Table-shaped wrapper so the rate limiter's etag-style _commit stays testable
// against an in-memory fake while production talks to Firestore.
function tableLike(collectionName) {
  const db = getDb();
  if (!db) return null;
  const col = db.collection(collectionName);
  function id(partition, row) { return partition + '_' + row; }
  return {
    async getEntity(partition, row) {
      const snap = await col.doc(id(partition, row)).get();
      if (!snap.exists) throw statusErr('not-found', 404);
      const d = snap.data() || {};
      return {
        windowStart: d.windowStart,
        count: d.count,
        etag: snap.updateTime
      };
    },
    async createEntity(entity) {
      try {
        await col.doc(id(entity.partitionKey, entity.rowKey)).create({
          windowStart: entity.windowStart,
          count: entity.count
        });
      } catch (e) {
        throw mapGrpcStatus(e);
      }
    },
    async updateEntity(entity, _mode, opts) {
      const ref = col.doc(id(entity.partitionKey, entity.rowKey));
      const data = { windowStart: entity.windowStart, count: entity.count };
      try {
        if (opts && opts.etag) {
          await ref.update(data, { lastUpdateTime: opts.etag });
        } else {
          await ref.update(data);
        }
      } catch (e) {
        throw mapGrpcStatus(e);
      }
    }
  };
}

module.exports = {
  credentialsFromEnv: credentialsFromEnv,
  parseServiceAccount: parseServiceAccount,
  getDb: getDb,
  tableLike: tableLike,
  mapGrpcStatus: mapGrpcStatus,
  statusErr: statusErr
};
