'use strict';

/*
 * Fixed-window rate-limit decision logic — pure, dependency-free, unit-testable.
 *
 * No I/O and no clock of its own: the caller passes the current time and the
 * previously stored record, so the security-critical decision can be tested
 * without Table Storage or the Functions runtime.
 *
 * A record is { windowStart: <epoch ms>, count: <n> }. evaluate() returns the
 * next record to persist, whether this request is allowed, and — when denied —
 * how many seconds until the window resets.
 */

var DEFAULT_LIMIT = 10;
var DEFAULT_WINDOW_MS = 60 * 1000;

function toInt(v, fallback) {
  var n = typeof v === 'number' ? v : Number(v);
  return isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// record: previous {windowStart,count} or null/undefined for a first request.
// now: current epoch ms. opts: { limit, windowMs } (falsy/invalid -> defaults).
function evaluate(record, now, opts) {
  opts = opts || {};
  var limit = toInt(opts.limit, DEFAULT_LIMIT) || DEFAULT_LIMIT;
  var windowMs = toInt(opts.windowMs, DEFAULT_WINDOW_MS) || DEFAULT_WINDOW_MS;
  var t = toInt(now, 0);

  var start = record ? toInt(record.windowStart, 0) : 0;
  var count = record ? toInt(record.count, 0) : 0;

  // Fresh window when there is no record, the previous window has fully elapsed,
  // or the stored window is (impossibly) in the future — never let a poisoned
  // future timestamp lock a visitor out.
  if (!record || start > t || t - start >= windowMs) {
    return { allowed: true, record: { windowStart: t, count: 1 }, retryAfterSec: 0 };
  }

  // Within the current window and under the cap: count this request.
  if (count < limit) {
    return { allowed: true, record: { windowStart: start, count: count + 1 }, retryAfterSec: 0 };
  }

  // Over the cap: deny, keep the window untouched, report the remaining wait.
  var remainMs = windowMs - (t - start);
  if (remainMs < 0) remainMs = 0;
  return {
    allowed: false,
    record: { windowStart: start, count: count },
    retryAfterSec: Math.ceil(remainMs / 1000)
  };
}

module.exports = {
  evaluate: evaluate,
  DEFAULT_LIMIT: DEFAULT_LIMIT,
  DEFAULT_WINDOW_MS: DEFAULT_WINDOW_MS
};
