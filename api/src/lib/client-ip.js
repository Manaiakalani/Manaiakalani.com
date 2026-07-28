'use strict';

/*
 * Best-effort client-IP extraction for rate limiting — pure and unit-testable.
 *
 * Behind Cloudflare -> Azure Static Web Apps -> Functions, the real client IP
 * arrives in a header, not on the socket. Preference order:
 *   1. cf-connecting-ip  (Cloudflare's true client IP; a single value)
 *   2. x-forwarded-for   (the left-most hop is the original client)
 *   3. x-real-ip         (last-resort proxy convention)
 *
 * `getHeader` is any (name) => string|null|undefined accessor (case-insensitive
 * lookups expected), so this needs no Functions runtime to test.
 */

// Coerce to a trimmed, length-capped string. Non-strings / blanks -> ''.
function normalizeIp(v) {
  if (typeof v !== 'string') return '';
  var ip = v.trim();
  if (!ip) return '';
  return ip.slice(0, 64); // cap: no legitimate IPv4/IPv6 literal is longer
}

// The original client is the left-most entry of an x-forwarded-for chain.
function firstHop(xff) {
  if (typeof xff !== 'string') return '';
  var comma = xff.indexOf(',');
  return normalizeIp(comma === -1 ? xff : xff.slice(0, comma));
}

function clientIpFrom(getHeader) {
  if (typeof getHeader !== 'function') return '';
  var cf = normalizeIp(getHeader('cf-connecting-ip'));
  if (cf) return cf;
  var xff = firstHop(getHeader('x-forwarded-for'));
  if (xff) return xff;
  var real = normalizeIp(getHeader('x-real-ip'));
  if (real) return real;
  return '';
}

module.exports = {
  clientIpFrom: clientIpFrom,
  firstHop: firstHop,
  normalizeIp: normalizeIp
};
