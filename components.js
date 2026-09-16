(function () {
    function ic(name) {
        return (typeof mnkIcon === 'function') ? mnkIcon(name) : '';
    }

    function injectHeader() {
        var header = document.getElementById('site-header') || document.querySelector('header');
        if (!header || header.dataset.injected === 'true') return;
        var variant = header.getAttribute('data-variant') || 'page';
        var brand = variant === 'home'
            ? '<h1>MANAIAKALANI</h1>'
            : '<span class="brand-text">MANAIAKALANI</span>';
        var typing = variant === 'home' ? '<p id="typing-effect"></p>' : '';
        header.innerHTML =
            '<div class="container">' +
                brand +
                '<p class="header-subtitle">Aloha, I\'m Maximilian (Manaiakalani) Stein</p>' +
                '<p class="header-hook"><em>Manaiakalani is Maui\'s fishhook \u2014 the Hawaiian name for Scorpius.</em></p>' +
                typing +
                '<nav class="site-nav" aria-label="Main">' +
                    '<a href="/">About</a>' +
                    '<a href="/thoughts.html">Thoughts</a>' +
                    '<a href="/projects.html">Projects</a>' +
                    '<a href="/uses.html">Uses</a>' +
                '</nav>' +
            '</div>' +
            '<button class="theme-toggle" aria-label="Toggle dark mode">' +
                '<span class="theme-icon theme-icon--moon" data-icon="moon"></span>' +
                '<span class="theme-icon theme-icon--sun" data-icon="sun"></span>' +
            '</button>' +
            '<button class="geocities-toggle" aria-label="Toggle GeoCities mode" title="Welcome to 1997!">' +
                '<span class="gc-icon" data-icon="geocities"></span>' +
            '</button>';
        header.dataset.injected = 'true';
        if (typeof mnkIconsHydrate === 'function') mnkIconsHydrate(header);
    }

    function openGuestbookFromChrome(focusForm) {
        var go = function () {
            if (typeof window.openGuestbook === 'function') window.openGuestbook(!!focusForm);
        };
        if (typeof window.openGuestbook === 'function') {
            go();
            return;
        }
        if (typeof window.loadGeoCitiesAssets === 'function') {
            window.loadGeoCitiesAssets().then(go).catch(function () {});
        }
    }

    function injectFooter() {
        var footerContent = document.getElementById('footer-content');
        if (!footerContent || footerContent.dataset.injected === 'true') return;

        footerContent.innerHTML =
            '<div class="cube-wrapper" aria-hidden="true">' +
                '<canvas id="ascii-cube"></canvas>' +
            '</div>' +
            '<div class="social-icons">' +
                '<a href="https://www.linkedin.com/in/manaiakalani/" target="_blank" rel="noopener noreferrer me" aria-label="LinkedIn">' + ic('linkedin') + '</a>' +
                '<a href="https://x.com/manaiakalani" target="_blank" rel="noopener noreferrer me" aria-label="X (formerly Twitter)">' + ic('x') + '</a>' +
                '<a href="https://github.com/manaiakalani" target="_blank" rel="noopener noreferrer me" aria-label="GitHub">' + ic('github') + '</a>' +
                '<a href="https://instagram.com/manaiakalani" target="_blank" rel="noopener noreferrer me" aria-label="Instagram">' + ic('instagram') + '</a>' +
                '<a href="https://www.youtube.com/kimaker213" target="_blank" rel="noopener noreferrer me" aria-label="YouTube">' + ic('youtube') + '</a>' +
                '<a href="https://bsky.app/profile/did:plc:kurxpumma6piictgpr424wcj" target="_blank" rel="noopener noreferrer me" aria-label="Bluesky">' + ic('bluesky') + '</a>' +
            '</div>' +
            '<p class="footer-text">Made with <span class="heart-beat" aria-hidden="true">' + ic('heart') + '</span> in Seattle, WA</p>' +
            '<p class="footer-links">' +
                '<button type="button" class="footer-text-btn" id="sign-the-book">' + ic('book') + ' Sign the book</button>' +
                '<a href="/colophon.html">Colophon</a>' +
                '<a href="/feed.xml">RSS</a>' +
            '</p>' +
            '<p class="footer-visits" hidden>' +
                '<span class="visits-odometer" aria-label="Visitor count"></span>' +
                '<span class="visits-label">Visitors</span>' +
            '</p>';
        footerContent.dataset.injected = 'true';
        var bookBtn = document.getElementById('sign-the-book');
        if (bookBtn) {
            bookBtn.addEventListener('click', function () { openGuestbookFromChrome(true); });
        }
        ensureCubeLoader();
        initVisitorCounter();
    }

    function ensureCubeLoader() {
        var canvas = document.getElementById('ascii-cube');
        if (!canvas || document.querySelector('script[data-cube-loader="true"]')) return;
        var moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.dataset.cubeLoader = 'true';
        moduleScript.src = '/cube-loader.js?v=2';
        document.body.appendChild(moduleScript);
    }

    var COUNTER_ENDPOINT = '/api/counter';
    var COUNTER_MIN_DIGITS = 6;
    var COUNTER_SESSION_KEY = 'mnk:counted';

    function padCount(n) {
        var s = String(n);
        while (s.length < COUNTER_MIN_DIGITS) s = '0' + s;
        return s;
    }

    function renderVisitorCount(panel, count) {
        var odometer = panel.querySelector('.visits-odometer');
        if (!odometer) return;
        var digits = padCount(count);
        var cells = '';
        for (var i = 0; i < digits.length; i++) {
            cells += '<span class="visits-digit" aria-hidden="true">' + digits.charAt(i) + '</span>';
        }
        odometer.innerHTML = cells;
        odometer.setAttribute('aria-label', Number(count).toLocaleString('en-US') + ' visitors');
        panel.hidden = false;
        requestAnimationFrame(function () { panel.classList.add('is-visible'); });
        window.mnkVisitorCount = Math.max(0, Math.floor(count));
        if (typeof window.mnkSyncGcCounter === 'function') window.mnkSyncGcCounter(window.mnkVisitorCount);
    }

    function initVisitorCounter() {
        var panel = document.querySelector('.footer-visits');
        if (!panel || panel.dataset.done === 'true' || typeof fetch !== 'function') return;
        panel.dataset.done = 'true';
        var counted = false;
        try { counted = sessionStorage.getItem(COUNTER_SESSION_KEY) === '1'; } catch (e) {}
        var method = counted ? 'GET' : 'POST';
        fetch(COUNTER_ENDPOINT, { method: method, headers: { accept: 'application/json' } })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (!data || typeof data.count !== 'number' || !isFinite(data.count)) return;
                if (!counted) {
                    try { sessionStorage.setItem(COUNTER_SESSION_KEY, '1'); } catch (e) {}
                }
                renderVisitorCount(panel, Math.max(0, Math.floor(data.count)));
            })
            .catch(function () { /* offline or no backend → stay hidden */ });
    }

    function injectChrome() {
        injectHeader();
        injectFooter();
    }

    window.injectFooter = injectFooter;
    window.injectHeader = injectHeader;
    window.openGuestbookFromChrome = openGuestbookFromChrome;

    injectChrome();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChrome, { once: true });
    }
})();
