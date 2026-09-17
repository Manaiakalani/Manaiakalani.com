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

    // Bright Scorpius stars, J2000. North up, RA increasing to the right so the
    // tail hooks like Maui's fishhook. Magnitudes set the disc size; Antares is M.
    var SCORPIUS_STARS = [
        { id: 'nu', ra: 16.200, dec: -19.460, mag: 4.00, kind: 'hot', name: 'Jabbah' },
        { id: 'beta', ra: 16.090, dec: -19.805, mag: 2.62, kind: 'hot', name: 'Acrab' },
        { id: 'delta', ra: 16.005, dec: -22.622, mag: 2.32, kind: 'hot', name: 'Dschubba' },
        { id: 'pi', ra: 15.982, dec: -26.114, mag: 2.89, kind: 'hot', name: 'Fang' },
        { id: 'sigma', ra: 16.357, dec: -25.593, mag: 2.91, kind: 'hot', name: 'Alniyat' },
        { id: 'alpha', ra: 16.490, dec: -26.432, mag: 0.96, kind: 'antares', name: 'Antares' },
        { id: 'tau', ra: 16.598, dec: -28.216, mag: 2.82, kind: 'hot', name: 'Paikauhale' },
        { id: 'epsilon', ra: 16.837, dec: -34.293, mag: 2.29, kind: 'warm', name: 'Larawag' },
        { id: 'mu', ra: 16.862, dec: -38.048, mag: 2.98, kind: 'hot', name: 'Xamidimura' },
        { id: 'zeta', ra: 16.902, dec: -42.362, mag: 3.62, kind: 'hot', name: 'ζ Sco' },
        { id: 'eta', ra: 17.204, dec: -43.239, mag: 3.33, kind: 'hot', name: 'η Sco' },
        { id: 'theta', ra: 17.621, dec: -42.998, mag: 1.87, kind: 'hot', name: 'Sargas' },
        { id: 'iota', ra: 17.794, dec: -40.127, mag: 2.99, kind: 'hot', name: 'ι Sco' },
        { id: 'kappa', ra: 17.708, dec: -39.030, mag: 2.39, kind: 'hot', name: 'κ Sco' },
        { id: 'lambda', ra: 17.560, dec: -37.104, mag: 1.63, kind: 'hot', name: 'Shaula' },
        { id: 'upsilon', ra: 17.512, dec: -37.296, mag: 2.70, kind: 'hot', name: 'Lesath' }
    ];
    var SCORPIUS_LINES = [
        ['nu', 'beta', 'delta', 'pi'],
        ['delta', 'sigma', 'alpha', 'tau', 'epsilon', 'mu', 'zeta', 'eta', 'theta'],
        ['theta', 'iota', 'kappa', 'lambda'],
        ['lambda', 'upsilon']
    ];

    function projectScorpius(ra, dec) {
        return {
            x: (ra - 15.82) * 48 + 6,
            y: (-18.6 - dec) * 3.55 + 4
        };
    }

    function starRadius(mag) {
        return Math.max(0.55, 3.55 - mag * 0.82);
    }

    function scorpiusSvg() {
        var pos = {};
        SCORPIUS_STARS.forEach(function (s) { pos[s.id] = projectScorpius(s.ra, s.dec); });
        var field = '';
        var seed = 7;
        for (var i = 0; i < 46; i++) {
            seed = (seed * 16807 + i * 13) % 2147483647;
            var fx = 4 + (seed % 1080) / 10;
            seed = (seed * 48271) % 2147483647;
            var fy = 3 + (seed % 1000) / 10;
            seed = (seed * 69621) % 2147483647;
            var fr = 0.18 + (seed % 28) / 100;
            field += '<circle class="scorpius-field" cx="' + fx.toFixed(1) + '" cy="' + fy.toFixed(1) + '" r="' + fr.toFixed(2) + '" />';
        }
        var lines = SCORPIUS_LINES.map(function (chain) {
            var pts = chain.map(function (id) { return pos[id].x.toFixed(1) + ',' + pos[id].y.toFixed(1); }).join(' ');
            return '<polyline class="scorpius-line" fill="none" points="' + pts + '" />';
        }).join('');
        var stars = SCORPIUS_STARS.map(function (s) {
            var p = pos[s.id];
            var r = starRadius(s.mag);
            var cls = 'scorpius-star scorpius-star--' + s.kind;
            var glow = s.kind === 'antares'
                ? '<circle class="scorpius-halo" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (r * 2.4).toFixed(1) + '" />'
                : '';
            return glow + '<circle class="' + cls + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(2) + '" />';
        }).join('');
        var antares = pos.alpha;
        var shaula = pos.lambda;
        var labels =
            '<text class="scorpius-label" x="' + (antares.x + 4.2).toFixed(1) + '" y="' + (antares.y + 1.2).toFixed(1) + '">Antares</text>' +
            '<text class="scorpius-label" x="' + (shaula.x + 3.6).toFixed(1) + '" y="' + (shaula.y - 2.4).toFixed(1) + '">Shaula</text>';
        return (
            '<svg viewBox="0 0 118 108" role="img" aria-labelledby="scorpius-caption">' +
                '<title id="scorpius-caption">Manaiakalani — Maui\'s fishhook, the tail of Scorpius. Antares is the red heart; Shaula and Lesath are the stinger.</title>' +
                '<defs>' +
                    '<radialGradient id="scorpius-milky" cx="48%" cy="62%" r="58%">' +
                        '<stop offset="0%" stop-color="#c8b89a" stop-opacity="0.16" />' +
                        '<stop offset="70%" stop-color="#121218" stop-opacity="0" />' +
                    '</radialGradient>' +
                    '<filter id="scorpius-glow" x="-80%" y="-80%" width="260%" height="260%">' +
                        '<feGaussianBlur stdDeviation="1.05" result="b" />' +
                        '<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>' +
                    '</filter>' +
                '</defs>' +
                '<rect width="118" height="108" fill="#07080f" />' +
                '<ellipse cx="62" cy="64" rx="48" ry="28" fill="url(#scorpius-milky)" />' +
                field + lines +
                '<g filter="url(#scorpius-glow)">' + stars + '</g>' +
                labels +
            '</svg>'
        );
    }

    function paintScorpiusMoon(dlg) {
        var el = dlg.querySelector('.scorpius-moon');
        if (!el) return;
        var moon = hawaiianMoon(new Date());
        el.innerHTML = 'Tonight is <strong>' + moon.name + '</strong> — ' + moon.phase + '.';
    }

    function bindScorpius() {
        var trigger = document.querySelector('.scorpius-trigger');
        if (!trigger) return;
        var dlg = document.getElementById('scorpius-sky');
        if (!dlg) {
            dlg = document.createElement('dialog');
            dlg.id = 'scorpius-sky';
            dlg.className = 'scorpius-sky';
            dlg.setAttribute('aria-label', 'Scorpius, the fishhook');
            dlg.innerHTML =
                '<div class="scorpius-sky-inner">' +
                    '<button type="button" class="scorpius-close" aria-label="Close constellation">Close</button>' +
                    scorpiusSvg() +
                    '<p>Maui fished the islands with this hook. The western sky still hangs it as Scorpius.</p>' +
                    '<p class="scorpius-moon"></p>' +
                '</div>';
            document.body.appendChild(dlg);
            dlg.querySelector('.scorpius-close').addEventListener('click', function () { dlg.close(); });
            dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
            dlg.addEventListener('close', function () { trigger.setAttribute('aria-expanded', 'false'); });
        }
        trigger.addEventListener('click', function () {
            paintScorpiusMoon(dlg);
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
