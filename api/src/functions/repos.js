'use strict';

/*
 * GitHub repos proxy — Azure Static Web Apps managed function.
 *
 * GET /api/repos -> { repos: [...], backend: 'github' }
 *
 * The homepage used to call api.github.com from every visitor's browser
 * (60 req/hr unauthenticated per IP). This endpoint fetches from the
 * function's IP, caches in memory for a couple of minutes, and degrades
 * to { repos: [], backend: 'unconfigured' } so the page can fall back.
 */

const { app } = require('@azure/functions');
const core = require('../lib/repos-core');

const USER = 'Manaiakalani';
const FIRST_URL = 'https://api.github.com/users/' + USER + '/repos?sort=pushed&per_page=100&type=owner';
const MAX_PAGES = 10;
const TTL_MS = 2 * 60 * 1000;

let cache = { ts: 0, repos: null };

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'manaiakalani.com'
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

async function fetchPage(url, pageNum, acc) {
  if (pageNum > MAX_PAGES) return acc;
  const res = await fetch(url, { headers: githubHeaders() });
  if (res.status === 403 || res.status === 429) {
    const err = new Error('rate-limited');
    err.code = 'rate_limited';
    throw err;
  }
  if (!res.ok) {
    const err = new Error('GitHub ' + res.status);
    err.code = 'upstream';
    throw err;
  }
  const body = await res.json();
  if (Array.isArray(body)) acc = acc.concat(body);
  const links = core.parseLinkHeader(res.headers.get('link') || res.headers.get('Link'));
  if (links.next) return fetchPage(links.next, pageNum + 1, acc);
  return acc;
}

async function loadRepos() {
  const now = Date.now();
  if (cache.repos && (now - cache.ts) < TTL_MS) return cache.repos;
  const raw = await fetchPage(FIRST_URL, 1, []);
  const repos = core.normalizeRepos(raw);
  cache = { ts: now, repos: repos };
  return repos;
}

app.http('repos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'repos',
  handler: async (request, context) => {
    try {
      const repos = await loadRepos();
      return {
        jsonBody: { repos: repos, backend: 'github' },
        headers: { 'Cache-Control': 'public, max-age=60' }
      };
    } catch (e) {
      context.error('repos handler failed', e);
      if (cache.repos) {
        return {
          jsonBody: { repos: cache.repos, backend: 'stale' },
          headers: { 'Cache-Control': 'public, max-age=30' }
        };
      }
      const backend = e && e.code === 'rate_limited' ? 'rate_limited' : 'error';
      return {
        status: 200,
        jsonBody: { repos: [], backend: backend },
        headers: { 'Cache-Control': 'no-store' }
      };
    }
  }
});
