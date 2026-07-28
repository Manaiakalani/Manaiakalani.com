/*
 * Build search.json — a lightweight content index for the command palette.
 * Zero dependencies. Parses the site's own (regular) markup and writes search.json.
 *
 * Run after editing thoughts.html / uses.html / index.html content:
 *   node build-search-index.js
 *
 * Dev-only: this file is rewritten to /404.html in staticwebapp.config.json, so it
 * is never publicly served and never runs in the browser.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&rsquo;': '\u2019', '&lsquo;': '\u2018', '&ldquo;': '\u201C', '&rdquo;': '\u201D',
  '&mdash;': '\u2014', '&ndash;': '\u2013', '&hellip;': '\u2026', '&nbsp;': ' '
};
function decode(s) {
  return String(s)
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(parseInt(n, 10)); })
    .replace(/&[a-z]+;/gi, function (m) { return ENTITIES[m] != null ? ENTITIES[m] : m; });
}
function clean(html) {
  return decode(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function cap(s, n) { return s.length > n ? s.slice(0, n - 1).trim() + '\u2026' : s; }

const items = [];

// ---- Thoughts: one entry per .thought-entry, linked to its permalink ----
read('thoughts.html').split('<div class="thought-entry"').slice(1).forEach(function (chunk) {
  const id = (chunk.match(/\bid="([^"]+)"/) || [])[1];
  if (!id) return;
  const title = clean((chunk.match(/class="thought-title">\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
  const date = clean((chunk.match(/class="thought-date">([\s\S]*?)<\/div>/) || [])[1] || '');
  const body = clean((chunk.match(/class="thought-excerpt">([\s\S]*?)<\/p>/) || [])[1] || '');
  if (!title) return;
  items.push({ t: title, u: '/thoughts.html#' + id, s: 'Thought', d: date, b: cap(body, 400) });
});

// ---- Uses: one entry per .uses-section, linked to its anchor ----
read('uses.html').split('<section class="uses-section"').slice(1).forEach(function (chunk) {
  const id = (chunk.match(/\bid="([^"]+)"/) || [])[1] || '';
  const h2 = clean((chunk.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '');
  const list = (chunk.match(/<ul class="uses-list">([\s\S]*?)<\/ul>/) || [])[1] || '';
  if (!h2) return;
  items.push({ t: h2, u: '/uses.html' + (id ? '#' + id : ''), s: 'Uses', d: '', b: cap(clean(list), 400) });
});

// ---- About (home page) ----
const about = clean((read('index.html').match(/<section id="about">([\s\S]*?)<\/section>/) || [])[1] || '');
if (about) items.push({ t: 'About Maximilian', u: '/#about', s: 'About', d: '', b: cap(about, 400) });

// Guard against silent markup drift.
if (items.filter(function (i) { return i.s === 'Thought'; }).length === 0) {
  console.error('ERROR: parsed 0 thoughts — thoughts.html markup may have changed. Aborting.');
  process.exit(1);
}

const out = { v: 1, generated: new Date().toISOString(), items: items };
fs.writeFileSync(path.join(ROOT, 'search.json'), JSON.stringify(out) + '\n');
console.log('Wrote search.json — ' + items.length + ' items (' +
  items.filter(function (i) { return i.s === 'Thought'; }).length + ' thoughts, ' +
  items.filter(function (i) { return i.s === 'Uses'; }).length + ' uses, ' +
  items.filter(function (i) { return i.s === 'About'; }).length + ' about).');
