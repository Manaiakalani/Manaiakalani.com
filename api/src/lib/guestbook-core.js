'use strict';

/*
 * Guestbook core logic — pure, dependency-free, and unit-testable.
 * The Azure Function wrapper (../functions/guestbook.js) handles I/O and
 * delegates all validation, sanitization, and shaping to these helpers so the
 * security-critical code can be tested without the Functions runtime or Azure.
 */

var MAX_NAME = 40;
var MAX_MESSAGE = 200;
var MAX_RETURN = 100;

// Coerce to a safe single-line string: drop control chars, collapse whitespace,
// trim, and hard-cap the length. Non-strings become ''.
function cleanStr(v, max) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function today() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

// Validate + sanitize an inbound POST body. Returns a clean {name, message}
// or null when either field is missing/blank after sanitization.
function sanitizeIncoming(body) {
  if (!body || typeof body !== 'object') return null;
  var name = cleanStr(body.name, MAX_NAME);
  var message = cleanStr(body.message, MAX_MESSAGE);
  if (!name || !message) return null;
  return { name: name, message: message };
}

// Shape stored rows into the public payload: newest first (by seq), capped,
// and re-sanitized so nothing that reaches a browser is ever unbounded/dirty.
function toPublic(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .slice()
    .sort(function (a, b) { return (Number(b && b.seq) || 0) - (Number(a && a.seq) || 0); })
    .slice(0, MAX_RETURN)
    .map(function (r) {
      return {
        name: cleanStr(r && r.name, MAX_NAME),
        message: cleanStr(r && r.message, MAX_MESSAGE),
        date: cleanStr(r && r.date, MAX_NAME)
      };
    })
    .filter(function (e) { return e.name || e.message; });
}

module.exports = {
  cleanStr: cleanStr,
  today: today,
  sanitizeIncoming: sanitizeIncoming,
  toPublic: toPublic,
  MAX_NAME: MAX_NAME,
  MAX_MESSAGE: MAX_MESSAGE,
  MAX_RETURN: MAX_RETURN
};
