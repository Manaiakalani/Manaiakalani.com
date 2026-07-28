/*
 * Service worker — offline support for manaiakalani.com
 * Strategy:
 *   - HTML documents (navigations AND prefetched pages): network-first, fall back
 *     to cache, then to the cached home page / 404 when fully offline. Routing by
 *     destination (not just req.mode) keeps prefetched documents off the cache-first
 *     path so they can never strand users on a stale page.
 *   - Versioned static assets (?v=…): cache-first (immutable — a new deploy requests
 *     a new URL and never serves stale content).
 *   - Unversioned assets (favicon, manifest, og-image): network-first so they can't
 *     get locked to a stale copy until the cache name is bumped.
 *   - Same-origin API calls (/api/*): never intercepted — always go straight to the
 *     network so a live count / guestbook can never be served from a stale cache.
 *   - Cross-origin requests (fonts, CDN, analytics, GitHub API): left to the
 *     network — the worker never intercepts them.
 * Bump CACHE on every deploy so the activate step purges the previous cache.
 */
var CACHE = 'mnk-cache-v4';
var CORE = [
    '/',
    '/projects.html',
    '/thoughts.html',
    '/uses.html',
    '/404.html',
    '/manifest.json',
    '/favicon.png',
    '/favicon-32.png',
    '/og-image.png'
];

self.addEventListener('install', function (event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            // Add individually so one missing file can't abort the whole precache.
            return Promise.all(CORE.map(function (url) {
                return cache.add(url).catch(function () { /* ignore */ });
            }));
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key !== CACHE) return caches.delete(key);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;

    var url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (url.origin !== self.location.origin) return; // never touch cross-origin
    if (url.pathname.indexOf('/api/') === 0) return; // never cache API calls — always hit the network

    // Treat HTML documents (real navigations AND prefetched documents, which are
    // NOT req.mode==='navigate') as network-first so a new deploy is picked up and
    // a prefetch can never pin a stale page into the cache-first bucket.
    var isDoc = req.mode === 'navigate' || req.destination === 'document' ||
        url.pathname === '/' || /\.html$/.test(url.pathname);

    if (isDoc) {
        event.respondWith(
            fetch(req).then(function (res) {
                if (res && res.status === 200 && res.type === 'basic') {
                    var copy = res.clone();
                    event.waitUntil(caches.open(CACHE).then(function (cache) {
                        return cache.put(req, copy);
                    }).catch(function () { /* ignore */ }));
                }
                return res;
            }).catch(function () {
                return caches.match(req, { ignoreSearch: true }).then(function (hit) {
                    if (hit) return hit;
                    return caches.match('/404.html').then(function (f404) {
                        return f404 || caches.match('/');
                    });
                });
            })
        );
        return;
    }

    // Versioned static assets (?v=…) are immutable → cache-first.
    // Unversioned assets (favicon, manifest, og-image) → network-first so they
    // can't get locked to a stale copy until the cache name is bumped.
    if (url.search.indexOf('v=') !== -1) {
        event.respondWith(
            caches.match(req).then(function (hit) {
                if (hit) return hit;
                return fetch(req).then(function (res) {
                    if (res && res.status === 200 && res.type === 'basic') {
                        var copy = res.clone();
                        event.waitUntil(caches.open(CACHE).then(function (cache) {
                            return cache.put(req, copy);
                        }).catch(function () { /* ignore */ }));
                    }
                    return res;
                });
            }).catch(function () { return caches.match(req, { ignoreSearch: true }); })
        );
    } else {
        event.respondWith(
            fetch(req).then(function (res) {
                if (res && res.status === 200 && res.type === 'basic') {
                    var copy = res.clone();
                    event.waitUntil(caches.open(CACHE).then(function (cache) {
                        return cache.put(req, copy);
                    }).catch(function () { /* ignore */ }));
                }
                return res;
            }).catch(function () { return caches.match(req, { ignoreSearch: true }); })
        );
    }
});
