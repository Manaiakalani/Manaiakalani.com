// Theme Toggle
(function() {
    const toggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    const stored = localStorage.getItem('mnk:theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    function updateToggleState(isDark) {
        if (toggle) toggle.setAttribute('aria-pressed', String(isDark));
    }

    if (stored === 'dark' || (!stored && prefersDark)) {
        root.setAttribute('data-theme', 'dark');
        updateToggleState(true);
    } else {
        updateToggleState(false);
    }

    if (toggle) {
        toggle.addEventListener('click', function() {
            const isDark = root.getAttribute('data-theme') === 'dark';
            const next = isDark ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem('mnk:theme', next);
            updateToggleState(!isDark);
        });
    }
})();

// Active Nav Link
(function() {
    var path = window.location.pathname;
    var links = document.querySelectorAll('.site-nav a');
    links.forEach(function(link) {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        var href = link.getAttribute('href');
        var isHome = href === '/' && (path === '/' || path === '/index.html' || path.endsWith('/'));
        var isPage = href !== '/' && path.endsWith(href);
        if (isHome || isPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
})();

// Typing Effect (respects prefers-reduced-motion)
var typingEl = document.getElementById('typing-effect');
if (typingEl) {
    var typingText = "Turning problems into solutions, framing memories, and dad 24/7.";
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        typingEl.textContent = typingText;
    } else {
        var index = 0;
        function type() {
            if (index < typingText.length) {
                typingEl.textContent += typingText.charAt(index);
                index++;
                setTimeout(type, 100);
            }
        }
        type();
    }
}

// --- Dynamic GitHub Projects ---
(function () {
    var GITHUB_USER = 'Manaiakalani';
    var API_URL = 'https://api.github.com/users/' + GITHUB_USER + '/repos?sort=pushed&per_page=100&type=owner';
    var CACHE_KEY = 'mnk:gh_repos_cache';
    var CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    // Repos to exclude from display (e.g. profile repo, portfolio itself)
    var EXCLUDE = ['Manaiakalani', 'Manaiakalani.com', 'manaiakalani.info', 'seatac.social', 'manaiakalani.github.io'];

    var LANG_COLORS = {
        TypeScript: '#3178c6',
        JavaScript: '#f1e05a',
        Python: '#3572A5',
        HTML: '#e34c26',
        CSS: '#563d7c',
        'C++': '#f34b7d',
        MDX: '#fcb32c',
        Shell: '#89e051',
        Go: '#00ADD8',
        Rust: '#dea584'
    };

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML.replace(/"/g, '&quot;');
    }

    function buildCard(repo) {
        if (!repo || typeof repo.name !== 'string' || typeof repo.html_url !== 'string') return '';
        var name = escapeHtml(repo.name);
        var desc = repo.description ? escapeHtml(repo.description) : 'No description provided.';
        var lang = repo.language || '';
        var color = LANG_COLORS[lang] || '#888';

        var metaParts = [];
        if (lang) {
            metaParts.push('<span class="lang-badge"><span class="lang-dot" style="background:' + color + '"></span> ' + escapeHtml(lang) + '</span>');
        }
        var stars = repo.stargazers_count || 0;
        if (stars > 0) {
            metaParts.push('<span class="star-badge" role="img" aria-label="' + stars + ' star' + (stars === 1 ? '' : 's') + ' on GitHub">' +
                '<svg aria-hidden="true" width="0.85em" height="0.85em" fill="currentColor" viewBox="0 0 576 512"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg> ' + stars + '</span>');
        }
        var meta = metaParts.length
            ? '<div class="project-meta">' + metaParts.join('') + '</div>'
            : '';

        return '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer" class="project-card">' +
            '<h2>' + name + '</h2>' +
            '<p>' + desc + '</p>' +
            meta +
            '</a>';
    }

    // Rank by community impact: stars first, then forks, then recency (stable).
    function byImpact(a, b) {
        var sa = a.stargazers_count || 0, sb = b.stargazers_count || 0;
        if (sb !== sa) return sb - sa;
        var fa = a.forks_count || 0, fb = b.forks_count || 0;
        if (fb !== fa) return fb - fa;
        return new Date(b.pushed_at) - new Date(a.pushed_at);
    }

    // Sort strategies for the Projects page sort control.
    var SORT_FNS = {
        impact: byImpact,
        recent: function (a, b) { return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0); },
        name: function (a, b) {
            var an = (a.name || '').toLowerCase(), bn = (b.name || '').toLowerCase();
            return an < bn ? -1 : (an > bn ? 1 : 0);
        }
    };
    var currentSort = 'impact';

    function renderFeatured(repos) {
        var container = document.getElementById('featured-projects');
        if (!container) return;
        // Show the 3 highest-impact (most-starred) repos with a description.
        var featured = repos
            .filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name) === -1 && r.description; })
            .sort(byImpact)
            .slice(0, 3);
        container.innerHTML = featured.map(buildCard).join('');
    }

    function formatRelativeTime(date) {
        var diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
        if (isNaN(diffDays)) return '';
        if (diffDays <= 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return diffDays + ' days ago';
        if (diffDays < 30) {
            var weeks = Math.floor(diffDays / 7);
            return weeks + (weeks === 1 ? ' week ago' : ' weeks ago');
        }
        if (diffDays < 365) {
            var months = Math.floor(diffDays / 30);
            return months + (months === 1 ? ' month ago' : ' months ago');
        }
        var years = Math.floor(diffDays / 365);
        return years + (years === 1 ? ' year ago' : ' years ago');
    }

    // "Currently building" homepage widget: the most recently pushed-to repo.
    function renderCurrentlyBuilding(repos) {
        var container = document.getElementById('currently-building');
        if (!container) return;
        var section = container.closest('.currently-building-teaser');
        var candidates = repos
            .filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name) === -1; })
            .sort(function (a, b) { return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0); });
        if (!candidates.length) {
            if (section) section.hidden = true;
            return;
        }
        var repo = candidates[0];
        var desc = repo.description ? '<p>' + escapeHtml(repo.description) + '</p>' : '';
        var updatedHtml = '';
        if (repo.pushed_at) {
            var rel = formatRelativeTime(new Date(repo.pushed_at));
            if (rel) updatedHtml = '<span class="building-updated">Updated ' + rel + '</span>';
        }
        container.innerHTML =
            '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer" class="building-card">' +
            '<span class="building-label">\uD83D\uDD28 Currently building</span>' +
            '<h3>' + escapeHtml(repo.name) + '</h3>' +
            desc +
            updatedHtml +
            '</a>';
        if (section) section.hidden = false;
    }

    // Persistent reference for search/filter (item 9)
    var allLoadedRepos = [];

    // Search input + sort select are wired further below, before loadRepos() is
    // triggered, so they're always assigned by the time any render happens.
    var searchInput;

    function getVisibleProjects() {
        var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var list = allLoadedRepos.filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name) === -1; });
        if (query) {
            list = list.filter(function (r) {
                var name = (r.name || '').toLowerCase();
                var desc = (r.description || '').toLowerCase();
                var lang = (r.language || '').toLowerCase();
                return name.indexOf(query) !== -1 || desc.indexOf(query) !== -1 || lang.indexOf(query) !== -1;
            });
        }
        return list.sort(SORT_FNS[currentSort] || byImpact);
    }

    function renderAll() {
        var container = document.getElementById('all-projects');
        if (!container) return;
        var filtered = getVisibleProjects();
        var note = document.getElementById('projects-sort-note');
        if (filtered.length) {
            container.innerHTML = filtered.map(buildCard).join('');
        } else {
            container.innerHTML = '<p class="projects-fallback" style="text-align:center;color:var(--text-secondary);padding:2rem;">No projects match your search.</p>';
        }
        // The note describes the "impact" sort specifically, so only show it when that's active.
        if (note) note.hidden = !(filtered.length && currentSort === 'impact');
    }

    function showFallback(message) {
        var containers = [
            document.getElementById('featured-projects'),
            document.getElementById('all-projects')
        ];
        containers.forEach(function (el) {
            if (el) el.innerHTML = '<p class="projects-fallback" style="text-align:center;color:var(--text-secondary);padding:2rem;">' + message + '</p>';
        });
        var buildingContainer = document.getElementById('currently-building');
        var buildingSection = buildingContainer && buildingContainer.closest('.currently-building-teaser');
        if (buildingSection) buildingSection.hidden = true;
    }

    function parseLinkHeader(header) {
        if (!header) return {};
        var links = {};
        header.split(',').forEach(function (part) {
            var match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
            if (match) links[match[2]] = match[1];
        });
        return links;
    }

    function loadRepos() {
        // Check cache first
        var cached;
        try {
            cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
                allLoadedRepos = cached.data;
                renderFeatured(cached.data);
                renderAll();
                renderCurrentlyBuilding(cached.data);
                return;
            }
        } catch (e) { /* ignore */ }

        var allRepos = [];
        var MAX_PAGES = 10; // safety cap (10 * per_page=100 = 1,000 repos); guards against a malformed/cyclical Link header
        function fetchPage(url, pageNum) {
            if (pageNum > MAX_PAGES) return Promise.resolve();
            return fetch(url)
                .then(function (res) {
                    if (res.status === 403 || res.status === 429) throw new Error('rate-limited');
                    if (!res.ok) throw new Error('GitHub API returned ' + res.status);
                    var linkHeader = res.headers.get('Link');
                    var links = parseLinkHeader(linkHeader);
                    return res.json().then(function (repos) {
                        if (!Array.isArray(repos)) return;
                        allRepos = allRepos.concat(repos);
                        if (links.next) {
                            // If a later page fails, we still use what we fetched so far
                            return fetchPage(links.next, pageNum + 1).catch(function () {});
                        }
                    });
                });
        }

        fetchPage(API_URL, 1)
            .then(function () {
                if (!allRepos.length) return;
                try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: allRepos })); } catch (e) { /* quota */ }
                allLoadedRepos = allRepos;
                renderFeatured(allRepos);
                renderAll();
                renderCurrentlyBuilding(allRepos);
            })
            .catch(function (err) {
                // Use stale cache if available, otherwise show fallback
                if (cached && Array.isArray(cached.data)) {
                    allLoadedRepos = cached.data;
                    renderFeatured(cached.data);
                    renderAll();
                    renderCurrentlyBuilding(cached.data);
                } else {
                    var msg = err && err.message === 'rate-limited'
                        ? 'GitHub API rate limit reached — projects will reload shortly. <a href="https://github.com/Manaiakalani" style="color:var(--accent)">View them directly</a>.'
                        : 'Projects are loading from GitHub — <a href="https://github.com/Manaiakalani" style="color:var(--accent)">view them directly</a>.';
                    showFallback(msg);
                }
            });
    }

    // --- Project search/sort controls (projects.html only) ---
    // Declared before the loadRepos() trigger below so both are always
    // assigned by the time any render (including a synchronous cache-hit) runs.
    searchInput = document.getElementById('project-search');
    var sortSelect = document.getElementById('project-sort');

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            currentSort = sortSelect.value;
            renderAll();
        });
    }

    if (searchInput && document.getElementById('all-projects')) {
        var debounceTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(renderAll, 150);
        });
    }

    // Only run if any target container exists
    if (document.getElementById('featured-projects') || document.getElementById('all-projects') || document.getElementById('currently-building')) {
        loadRepos();
    }
})();

// --- Thoughts page: reading time, copy-link, search/filter, jump nav, random (thoughts.html only) ---
(function () {
    var thoughtsList = document.querySelector('.thoughts-list');
    if (!thoughtsList) return;

    var entries = Array.prototype.slice.call(thoughtsList.querySelectorAll('.thought-entry'));

    // Reading time — derived from the excerpt (which is the full entry content on this site).
    entries.forEach(function (entry) {
        var excerpt = entry.querySelector('.thought-excerpt');
        var dateEl = entry.querySelector('.thought-date');
        if (!excerpt || !dateEl) return;
        var words = excerpt.textContent.trim().split(/\s+/).filter(Boolean).length;
        var minutes = Math.max(1, Math.round(words / 200));
        dateEl.appendChild(document.createTextNode(' \u00B7 ' + minutes + ' min read'));
    });

    // Copy-link button per entry.
    entries.forEach(function (entry) {
        var titleEl = entry.querySelector('.thought-title');
        if (!titleEl || !entry.id) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-link-btn';
        btn.setAttribute('aria-label', 'Copy link to this entry');
        btn.textContent = '🔗';
        btn.addEventListener('click', function () {
            var url = window.location.origin + window.location.pathname + '#' + entry.id;
            var reset = function () {
                btn.classList.remove('copied');
                btn.setAttribute('aria-label', 'Copy link to this entry');
            };
            var confirmCopy = function () {
                btn.classList.add('copied');
                btn.setAttribute('aria-label', 'Link copied!');
                setTimeout(reset, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(confirmCopy).catch(function () {});
            } else {
                // Fallback for browsers without the async Clipboard API
                var ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); confirmCopy(); } catch (e) { /* ignore */ }
                document.body.removeChild(ta);
            }
        });
        titleEl.appendChild(btn);
    });

    // Search/filter over existing entries (no re-fetch — content is static).
    var searchInput = document.getElementById('thought-search');
    var noResults = document.getElementById('thoughts-no-results');

    function applyFilter() {
        var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var visibleCount = 0;
        entries.forEach(function (entry) {
            var li = entry.closest('li');
            var match = !query || entry.textContent.toLowerCase().indexOf(query) !== -1;
            if (li) li.hidden = !match;
            if (match) visibleCount++;
        });
        if (noResults) noResults.hidden = visibleCount !== 0;
    }

    function clearFilter() {
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            applyFilter();
        }
    }

    if (searchInput) {
        var debounceTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilter, 150);
        });
    }

    // Jump-to-entry dropdown.
    var jumpNav = document.getElementById('thoughts-jump-nav');
    if (jumpNav) {
        entries.forEach(function (entry) {
            var titleLink = entry.querySelector('.thought-title a.thought-anchor');
            if (!titleLink || !entry.id) return;
            var opt = document.createElement('option');
            opt.value = entry.id;
            opt.textContent = titleLink.textContent;
            jumpNav.appendChild(opt);
        });
        jumpNav.addEventListener('change', function () {
            if (!jumpNav.value) return;
            clearFilter(); // guarantee the target isn't hidden by an active search
            var target = document.getElementById(jumpNav.value);
            window.location.hash = jumpNav.value;
            if (target) {
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
            jumpNav.selectedIndex = 0;
        });
    }

    // Random thought button.
    var randomBtn = document.getElementById('random-thought-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', function () {
            clearFilter(); // pick from the full set, not whatever's currently filtered
            var currentId = window.location.hash.slice(1);
            var candidates = entries.filter(function (e) { return e.id !== currentId; });
            var pool = candidates.length ? candidates : entries;
            var pick = pool[Math.floor(Math.random() * pool.length)];
            if (!pick) return;
            window.location.hash = pick.id;
            pick.setAttribute('tabindex', '-1');
            pick.focus({ preventScroll: true });
        });
    }
})();

// --- 404 page: show attempted path + table-flip easter egg ---
(function () {
    var pathDisplay = document.getElementById('path-display');
    if (pathDisplay) {
        pathDisplay.textContent = window.location.pathname;
    }

    var egg = document.getElementById('egg');
    if (egg) {
        var flipped = false;
        egg.addEventListener('click', function () {
            if (!flipped) {
                egg.textContent = '┬─┬ ノ( ゜-゜ノ)';
                flipped = true;
            } else {
                egg.textContent = '( ╯°□°)╯︵ ┻━┻';
                flipped = false;
            }
        });
    }
})();