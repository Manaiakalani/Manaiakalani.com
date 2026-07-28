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
    return { windowStart: Number(e.windowStart) || 0, count: Number(e.count) || 0 };
  } catch (e) {
    if (e && e.statusCode === 404) return null;
    throw e;
  }
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
    const partition = 'rl-' + bucket;
    const row = hashIp(ip);
    const prev = await readRecord(client, partition, row);
    const decision = core.evaluate(prev, t, policy);

    // Persist the new window/count. Last-write-wins is acceptable for a rate
    // limiter: a rare concurrent race lets at most a couple extra requests slip.
    await client.upsertEntity({
      partitionKey: partition,
      rowKey: row,
      windowStart: decision.record.windowStart,
      count: decision.record.count
    }, 'Replace');

    return { allowed: decision.allowed, retryAfterSec: decision.retryAfterSec };
  } catch (e) {
    return { allowed: true, retryAfterSec: 0 }; // fail open: never break the endpoint
  }
}

module.exports = {
  checkRateLimit: checkRateLimit,
  hashIp: hashIp,
  POLICIES: POLICIES
};
