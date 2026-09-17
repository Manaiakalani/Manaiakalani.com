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
                '<p class="header-hook"><button type="button" class="scorpius-trigger" aria-expanded="false" aria-controls="scorpius-sky"><em>Manaiakalani is Maui\'s fishhook \u2014 the Hawaiian name for Scorpius.</em></button></p>' +
                typing +
                '<nav class="site-nav" aria-label="Main">' +
                    '<a href="/">About</a>' +
                    '<a href="/thoughts">Thoughts</a>' +
                    '<a href="/projects">Projects</a>' +
                    '<a href="/uses">Uses</a>' +
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
        window.location.href = focusForm ? '/guestbook#sign' : '/guestbook';
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
                '<a href="/guestbook#sign" class="footer-text-btn" id="sign-the-book">' + ic('book') + ' Sign the book</a>' +
                '<a href="/now">Now</a>' +
                '<a href="/colophon">Colophon</a>' +
                '<a href="https://github.com/Manaiakalani/Manaiakalani.com">Source</a>' +
                '<a href="mailto:webmaster@manaiakalani.com">Email</a>' +
                '<a href="/feed.xml">RSS</a>' +
            '</p>' +
            '<p class="footer-badge">' +
                '<a href="/" title="manaiakalani.com 88x31"><img src="/badge-88x31.png" width="88" height="31" alt="manaiakalani.com"></a>' +
            '</p>' +
            '<p class="footer-visits" hidden>' +
                '<span class="visits-odometer" aria-label="Visitor count"></span>' +
                '<span class="visits-label">Visitors</span>' +
            '</p>';
        footerContent.dataset.injected = 'true';
        ensureCubeLoader();
        initVisitorCounter();
        bindScorpius();
        bindOdometer();
        fillHandmadeHomepages();
    }

    function ensureCubeLoader() {
        var canvas = document.getElementById('ascii-cube');
        if (!canvas || document.querySelector('script[data-cube-loader="true"]')) return;
        var moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.dataset.cubeLoader = 'true';
        moduleScript.src = '/cube-loader.js?v=a1adcf71';
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

    // Manaiakalani is the fishhook of Scorpius. Click the italic line to trace it.
    var SCORPIUS = [
        [42, 18], [28, 28], [56, 24], [48, 42], [52, 56], [58, 70],
        [66, 82], [78, 88], [90, 80], [88, 64], [80, 52], [70, 44], [64, 38]
    ];

    function bindScorpius() {
        var trigger = document.querySelector('.scorpius-trigger');
        if (!trigger) return;
        var dlg = document.getElementById('scorpius-sky');
        if (!dlg) {
            dlg = document.createElement('dialog');
            dlg.id = 'scorpius-sky';
            dlg.className = 'scorpius-sky';
            dlg.setAttribute('aria-label', 'Scorpius, the fishhook');
            var pts = SCORPIUS.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
            var stars = SCORPIUS.map(function (p, i) {
                var r = i === 3 ? 3.2 : 1.6;
                return '<circle class="scorpius-star" cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" />';
            }).join('');
            var moon = hawaiianMoon(new Date());
            dlg.innerHTML =
                '<div class="scorpius-sky-inner">' +
                    '<button type="button" class="scorpius-close" aria-label="Close constellation">Close</button>' +
                    '<svg viewBox="0 0 120 110" role="img" aria-labelledby="scorpius-caption">' +
                        '<title id="scorpius-caption">Manaiakalani — Maui\'s fishhook, the tail of Scorpius. Antares is the larger star.</title>' +
                        '<polyline class="scorpius-line" fill="none" points="' + pts + '" />' +
                        stars +
                    '</svg>' +
                    '<p>Maui fished the islands with this hook. The western sky still hangs it as Scorpius.</p>' +
                    '<p class="scorpius-moon">Tonight is <strong>' + moon.name + '</strong> — ' + moon.phase + '.</p>' +
                '</div>';
            document.body.appendChild(dlg);
            dlg.querySelector('.scorpius-close').addEventListener('click', function () { dlg.close(); });
            dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
            dlg.addEventListener('close', function () { trigger.setAttribute('aria-expanded', 'false'); });
        }
        trigger.addEventListener('click', function () {
            trigger.setAttribute('aria-expanded', 'true');
            if (typeof dlg.showModal === 'function') dlg.showModal();
            else dlg.setAttribute('open', '');
        });
    }

    var MAHINA = [
        'Hilo', 'Hoaka', 'Kūkahi', 'Kūlua', 'Kūkolu', 'Kūpau',
        'ʻOle kūkahi', 'ʻOle kūlua', 'ʻOle kūkolu', 'ʻOle pau',
        'Huna', 'Mōhalu', 'Hua', 'Akua', 'Hoku',
        'Māhealani', 'Kulu',
        'Lāʻau kūkahi', 'Lāʻau kūlua', 'Lāʻau pau',
        'ʻOle kūkahi', 'ʻOle kūlua', 'ʻOle pau',
        'Kāloa kūkahi', 'Kāloa kūlua', 'Kāloa pau',
        'Kāne', 'Lono', 'Mauli', 'Muku'
    ];

    function hawaiianMoon(d) {
        var syn = 29.530588853;
        var known = Date.UTC(2000, 0, 6, 18, 14);
        var age = ((d.getTime() - known) / 86400000) % syn;
        if (age < 0) age += syn;
        var i = Math.min(29, Math.floor(age / syn * 30));
        var illum = (1 - Math.cos(2 * Math.PI * age / syn)) / 2;
        var phase = illum < 0.05 ? 'new moon' : illum < 0.35 ? 'crescent' : illum < 0.65 ? 'quarter' : illum < 0.95 ? 'gibbous' : 'full moon';
        return { name: MAHINA[i], phase: phase };
    }

    var HANDMADE = [
        { name: 'This homepage', href: 'https://manaiakalani.com/' },
        { name: "Cameron's World", href: 'https://www.cameronsworld.net/' },
        { name: 'Space Jam 1996', href: 'https://www.spacejam.com/1996/' },
        { name: 'The Restart Page', href: 'https://therestartpage.com/' },
        { name: 'Zombo.com', href: 'https://zombo.com/' }
    ];

    function fillHandmadeHomepages() {
        var navs = document.querySelectorAll('.site-webring');
        if (!navs.length) return;
        var here = 0;
        var host = (window.location.hostname || '').replace(/^www\./, '');
        for (var i = 0; i < HANDMADE.length; i++) {
            if (HANDMADE[i].href.indexOf(host) !== -1) { here = i; break; }
        }
        var prev = HANDMADE[(here - 1 + HANDMADE.length) % HANDMADE.length];
        var next = HANDMADE[(here + 1) % HANDMADE.length];
        var html = '<a href="' + prev.href + '" rel="noopener noreferrer">' + prev.name + '</a>' +
            '<span>handmade homepages</span>' +
            '<a href="' + next.href + '" rel="noopener noreferrer">' + next.name + '</a>';
        for (var n = 0; n < navs.length; n++) navs[n].innerHTML = html;
    }

    function bindOdometer() {
        var odo = document.querySelector('.visits-odometer');
        if (!odo || odo.dataset.tick === 'true') return;
        odo.dataset.tick = 'true';
        odo.setAttribute('role', 'button');
        odo.setAttribute('tabindex', '0');
        odo.setAttribute('title', 'Click to tick');
        function tick() {
            odo.classList.remove('is-ticking');
            void odo.offsetWidth;
            odo.classList.add('is-ticking');
        }
        odo.addEventListener('click', tick);
        odo.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tick(); }
        });
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
