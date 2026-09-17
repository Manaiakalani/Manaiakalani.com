'use strict';

/*
 * Shape GitHub repo payloads into the fields the homepage grid actually
 * renders. Pure so it can be unit-tested without hitting api.github.com.
 */

function normalizeRepo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.name !== 'string' || typeof raw.html_url !== 'string') return null;
  var pushed = null;
  if (raw.pushed_at) {
    var t = new Date(raw.pushed_at);
    if (!isNaN(t.getTime())) pushed = raw.pushed_at;
  }
  return {
    name: raw.name,
    html_url: raw.html_url,
    description: typeof raw.description === 'string' ? raw.description : null,
    language: typeof raw.language === 'string' ? raw.language : null,
    fork: raw.fork === true,
    stargazers_count: (typeof raw.stargazers_count === 'number' && raw.stargazers_count >= 0) ? raw.stargazers_count : 0,
    forks_count: (typeof raw.forks_count === 'number' && raw.forks_count >= 0) ? raw.forks_count : 0,
    pushed_at: pushed
  };
}

function normalizeRepos(list) {
  if (!Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var n = normalizeRepo(list[i]);
    if (n) out.push(n);
  }
  return out;
}

function parseLinkHeader(header) {
  if (!header) return {};
  var links = {};
  String(header).split(',').forEach(function (part) {
    var match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  });
  return links;
}

module.exports = { normalizeRepo, normalizeRepos, parseLinkHeader };
