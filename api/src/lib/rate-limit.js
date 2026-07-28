'use strict';

/*
 * Per-IP rate limiter shared by the anonymous POST endpoints (guestbook +
 * counter). Backed by its own Table Storage table so it never contends with the
 * data tables.
 *
 * Privacy-first: the client IP is salted-hashed into an opaque RowKey — raw
 * visitor IPs are never written to storage. This matches the site's
 * privacy-respecting posture (no raw PII at rest).
 *
 * Fail-open by design: when storage is unconfigured, the client IP is unknown,
 * or anything throws, the request is ALLOWED. A cosmetic personal-site
 * guestbook/counter must never break because the rate-limit backend hiccuped;
 * Cloudflare's optional edge rule is the hard backstop (see api/README.md).
 */

const crypto = require('crypto');
const { TableClient } = require('@azure/data-tables');
const core = require('./rate-limit-core');
const { clientIpFrom } = require('./client-ip');

const TABLE_NAME = 'ratelimit';
// Optimistic-concurrency retry budget, mirroring the counter's read-modify-write
// loop. Azure Tables has no atomic increment, so a burst against one IP can lose
// the etag race; we re-read and retry rather than clobber a concurrent write.
const MAX_ATTEMPTS = 5;

function intEnv(name, fallback) {
  const n = Number(process.env[name]);
  return isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Per-bucket policy. Env overrides let the owner tune limits without a redeploy.
const POLICIES = {
  // A human filling in the guestbook signs a handful of times at most.
  guestbook: {
    limit: intEnv('RL_GUESTBOOK_LIMIT', 5),
    windowMs: intEnv('RL_GUESTBOOK_WINDOW_MS', 10 * 60 * 1000)
  },
  // The browser only POSTs the counter once per session, so anything past a
  // generous handful from one IP (shared NAT included) is a flood.
  counter: {
    limit: intEnv('RL_COUNTER_LIMIT', 20),
    windowMs: intEnv('RL_COUNTER_WINDOW_MS', 5 * 60 * 1000)
  }
};

let tableReady = false;

function getClient() {
  const cs = process.env.TABLES_CONNECTION_STRING || process.env.AzureWebJobsStorage || '';
  if (!cs) return null;
  return TableClient.fromConnectionString(cs, TABLE_NAME);
}

async function ensureTable(client) {
  if (tableReady) return;
  await client.createTable(); // resolves if it already exists, rethrows otherwise
  tableReady = true;
}

// Opaque, deterministic, fixed-width key. Never reversible to the raw IP.
function hashIp(ip) {
  const salt = process.env.RATE_LIMIT_SALT || 'mnk-rl-v1';
  return crypto.createHash('sha256').update(salt + '|' + ip).digest('hex').slice(0, 32);
}

// Read the header accessor defensively — Functions v4 gives a Headers object
// (.get), but never assume; any failure just yields '' (-> fail open upstream).
function headerGetter(request) {
  return function (name) {
    try {
      const h = request && request.headers;
      if (!h) return '';
      if (typeof h.get === 'function') return h.get(name);
      return h[name] || h[String(name).toLowerCase()] || '';
    } catch (e) {
      return '';
    }
  };
}

async function readRecord(client, partition, row) {
  try {
    const e = await client.getEntity(partition, row);
    // Keep the etag so the write can use If-Match optimistic concurrency.
    return { windowStart: Number(e.windowStart) || 0, count: Number(e.count) || 0, etag: e.etag };
  } catch (e) {
    if (e && e.statusCode === 404) return null;
    throw e;
  }
}

/*
 * Read-modify-write the window record under optimistic concurrency, mirroring
 * counter.js. Returns { allowed, retryAfterSec }. Assumes the table exists.
 *
 * Two correctness properties the plain last-write-wins upsert lacked:
 *   1. Denied requests never write — the stored window/count is already right,
 *      so a flood costs zero storage writes and can't keep resetting the row.
 *   2. Allowed writes are guarded by If-Match (updates) or create-if-absent, so
 *      concurrent requests can't both read count=N-1 and both commit N; the
 *      loser gets a 409/412, re-reads, and re-counts against the fresh value.
 */
async function commit(client, partition, row, policy, t) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prev = await readRecord(client, partition, row);
    const decision = core.evaluate(prev, t, policy);

    if (!decision.allowed) {
      return { allowed: false, retryAfterSec: decision.retryAfterSec };
    }

    const entity = {
      partitionKey: partition,
      rowKey: row,
      windowStart: decision.record.windowStart,
      count: decision.record.count
    };
    try {
      if (!prev) {
        // No row yet: create it, but if a concurrent request created it first
        // (409) re-read and retry so we count against its window.
        await client.createEntity(entity);
      } else {
        // Row exists: commit only if nobody moved it since we read (If-Match);
        // a 412 means we lost the race → re-read and retry.
        await client.updateEntity(entity, 'Replace', { etag: prev.etag });
      }
      return { allowed: true, retryAfterSec: 0 };
    } catch (e) {
      if (e && (e.statusCode === 409 || e.statusCode === 412)) continue;
      throw e;
    }
  }

  // Storage is healthy but this one key is under heavy write contention — i.e.
  // a burst/flood against a single IP, which a genuine visitor never generates.
  // Throttle rather than fail open, so contention can't be used to slip through.
  return { allowed: false, retryAfterSec: Math.ceil(policy.windowMs / 1000) };
}

/*
 * checkRateLimit(bucket, request[, now]) -> { allowed, retryAfterSec }
 * Never throws. `now` is injectable for tests; defaults to Date.now().
 */
async function checkRateLimit(bucket, request, now) {
  const policy = POLICIES[bucket] || POLICIES.guestbook;
  const t = typeof now === 'number' ? now : Date.now();
  try {
    const client = getClient();
    if (!client) return { allowed: true, retryAfterSec: 0 }; // unconfigured -> fail open

    const ip = clientIpFrom(headerGetter(request));
    if (!ip) return { allowed: true, retryAfterSec: 0 }; // no IP to bucket by -> fail open

    await ensureTable(client);
    return await commit(client, 'rl-' + bucket, hashIp(ip), policy, t);
  } catch (e) {
    return { allowed: true, retryAfterSec: 0 }; // fail open: never break the endpoint
  }
}

module.exports = {
  checkRateLimit: checkRateLimit,
  hashIp: hashIp,
  POLICIES: POLICIES,
  // Exported for tests: the concurrency-controlled read-modify-write against an
  // injected client, isolated from env/IP resolution.
  _commit: commit
};
