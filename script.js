// Theme Toggle
(function() {
    const toggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
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
            localStorage.setItem('theme', next);
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
    var CACHE_KEY = 'gh_repos_cache';
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

    function renderAll(repos) {
        var container = document.getElementById('all-projects');
        if (!container) return;
        // Lead with the highest-impact repos, then the rest by recency.
        var filtered = repos
            .filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name) === -1; })
            .sort(byImpact);
        container.innerHTML = filtered.map(buildCard).join('');
        var note = document.getElementById('projects-sort-note');
        if (note && filtered.length) note.hidden = false;
    }

    function showFallback(message) {
        var containers = [
            document.getElementById('featured-projects'),
            document.getElementById('all-projects')
        ];
        containers.forEach(function (el) {
            if (el) el.innerHTML = '<p class="projects-fallback" style="text-align:center;color:var(--text-secondary);padding:2rem;">' + message + '</p>';
        });
    }

    function loadRepos() {
        // Check cache first
        var cached;
        try {
            cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
                renderFeatured(cached.data);
                renderAll(cached.data);
                return;
            }
        } catch (e) { /* ignore */ }

        fetch(API_URL)
            .then(function (res) {
                if (res.status === 403 || res.status === 429) throw new Error('rate-limited');
                if (!res.ok) throw new Error('GitHub API returned ' + res.status);
                return res.json();
            })
            .then(function (repos) {
                if (!Array.isArray(repos)) return;
                try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: repos })); } catch (e) { /* quota */ }
                renderFeatured(repos);
                renderAll(repos);
            })
            .catch(function (err) {
                // Use stale cache if available, otherwise show fallback
                if (cached && Array.isArray(cached.data)) {
                    renderFeatured(cached.data);
                    renderAll(cached.data);
                } else {
                    var msg = err && err.message === 'rate-limited'
                        ? 'GitHub API rate limit reached — projects will reload shortly. <a href="https://github.com/Manaiakalani" style="color:var(--accent)">View them directly</a>.'
                        : 'Projects are loading from GitHub — <a href="https://github.com/Manaiakalani" style="color:var(--accent)">view them directly</a>.';
                    showFallback(msg);
                }
            });
    }

    // Only run if either target container exists
    if (document.getElementById('featured-projects') || document.getElementById('all-projects')) {
        loadRepos();
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