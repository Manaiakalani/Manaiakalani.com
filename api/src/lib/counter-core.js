'use strict';

/*
 * Visitor-counter core logic — pure, dependency-free, and unit-testable.
 * The Azure Function wrapper (../functions/counter.js) owns the Table Storage
 * read-modify-write; these helpers just coerce a possibly-garbage stored value
 * into a safe integer so the count can never go negative, fractional, or wild.
 */

// Sane upper bound. A personal guestbook-era hit counter will never approach
// this, but it guards the odometer against a corrupted stored value.
var MAX_COUNT = 1e12;

// Coerce any stored value into a whole number in [0, MAX_COUNT].
function toCount(raw) {
  var n = typeof raw === 'number' ? raw : Number(raw);
  if (!isFinite(n) || n < 0) return 0;
  if (n > MAX_COUNT) return MAX_COUNT;
  return Math.floor(n);
}

// The next value for a visit, saturating at the cap.
function nextCount(raw) {
  return Math.min(toCount(raw) + 1, MAX_COUNT);
}

module.exports = {
  toCount: toCount,
  nextCount: nextCount,
  MAX_COUNT: MAX_COUNT
};
