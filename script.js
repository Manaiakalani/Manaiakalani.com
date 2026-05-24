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
        var href = link.getAttribute('href');
        if (path.endsWith(href) || (href === '/' && (path === '/' || path.endsWith('/')))) {
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
    var EXCLUDE = ['Manaiakalani', 'manaiakalani.info', 'seatac.social', 'manaiakalani.github.io'];

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
        return div.innerHTML;
    }

    function buildCard(repo) {
        var name = escapeHtml(repo.name);
        var desc = repo.description ? escapeHtml(repo.description) : 'No description provided.';
        var lang = repo.language || '';
        var color = LANG_COLORS[lang] || '#888';
        var langBadge = lang
            ? '<div class="project-meta"><span class="lang-badge"><span class="lang-dot" style="background:' + color + '"></span> ' + escapeHtml(lang) + '</span></div>'
            : '';

        return '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer" class="project-card">' +
            '<h3>' + name + '</h3>' +
            '<p>' + desc + '</p>' +
            langBadge +
            '</a>';
    }

    function renderFeatured(repos) {
        var container = document.getElementById('featured-projects');
        if (!container) return;
        // Show top 3 most recently pushed non-fork repos
        var featured = repos.filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name) === -1 && r.description; }).slice(0, 3);
        container.innerHTML = featured.map(buildCard).join('');
    }

    function renderAll(repos) {
        var container = document.getElementById('all-projects');
        if (!container) return;
        var filtered = repos.filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name) === -1; });
        container.innerHTML = filtered.map(buildCard).join('');
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
                if (!res.ok) throw new Error('GitHub API returned ' + res.status);
                return res.json();
            })
            .then(function (repos) {
                if (!Array.isArray(repos)) return;
                try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: repos })); } catch (e) { /* quota */ }
                renderFeatured(repos);
                renderAll(repos);
            })
            .catch(function () {
                // Use stale cache if available, otherwise show fallback
                if (cached && Array.isArray(cached.data)) {
                    renderFeatured(cached.data);
                    renderAll(cached.data);
                } else {
                    showFallback('Projects are loading from GitHub — <a href="https://github.com/Manaiakalani" style="color:var(--accent)">view them directly</a>.');
                }
            });
    }

    // Only run if either target container exists
    if (document.getElementById('featured-projects') || document.getElementById('all-projects')) {
        loadRepos();
    }
})();