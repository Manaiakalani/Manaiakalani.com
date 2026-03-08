// GeoCities Mode — Welcome to 1997! 🚧🔥
(function () {
  'use strict';

  const GC_KEY = 'geocities';
  const root = document.documentElement;
  const toggle = document.querySelector('.geocities-toggle');
  if (!toggle) return;

  let injected = false;
  const gcElements = [];
  let cursorTrailEnabled = false;
  let lastTrailTime = 0;
  const TRAIL_THROTTLE_MS = 50;

  // ---- Visitor counter (increment once per page load, not per toggle) ----
  const visitorCount = (function () {
    let count = parseInt(localStorage.getItem('gc-visitors') || '0', 10);
    count += 1;
    localStorage.setItem('gc-visitors', String(count));
    return count;
  })();

  // ---- Helper: create element with aria-hidden for decorative content ----
  function decorative(el) {
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  // ---- Build HTML elements ----
  function createFlamesBar() {
    const bar = document.createElement('div');
    bar.className = 'gc-flames-bar';
    const flames = '🔥'.repeat(40);
    bar.innerHTML = flames.split('').map(function (f) {
      return '<span class="gc-flame">' + f + '</span>';
    }).join('');
    return decorative(bar);
  }

  function createConstructionBanner() {
    const banner = document.createElement('div');
    banner.className = 'gc-construction-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML =
      '<span>' +
        '<span class="gc-hardhat">⛑️</span> ' +
        '<span class="gc-construction-text">🚧 UNDER CONSTRUCTION 🚧</span> ' +
        '<span class="gc-hardhat">⛑️</span>' +
      '</span>';
    return banner;
  }

  function createMarquee() {
    const container = document.createElement('div');
    container.className = 'gc-marquee-container';
    container.innerHTML =
      '<span class="gc-marquee-text">' +
      '★ Welcome to my AWESOME homepage!! ★ You are visitor #' +
      String(visitorCount).padStart(6, '0') +
      '! ★ This site is best viewed in Netscape Navigator 4.0 at 800x600 ★ ' +
      'Sign my guestbook!! ★ Last updated: ' +
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' ★ Ask Jeeves if you need help finding anything! ★ ' +
      'FREE MIDI FILES ★ Cool Links ★ Powered by GeoCities ★' +
      '</span>';
    return decorative(container);
  }

  function createRainbowHr() {
    const hr = document.createElement('hr');
    hr.className = 'gc-hr-rainbow';
    return decorative(hr);
  }

  function createVisitorCounter() {
    const div = document.createElement('div');
    div.className = 'gc-visitor-counter';
    div.innerHTML =
      '<span class="gc-counter-label">~ You are visitor number ~</span>' +
      '<span class="gc-counter-display">' + String(visitorCount).padStart(7, '0') + '</span>';
    return div;
  }

  function createBottomLinks() {
    const div = document.createElement('div');
    div.className = 'gc-bottom-links';
    div.innerHTML =
      '📖 <a href="javascript:void(0)" onclick="alert(\'Thanks for signing my guestbook! 📖\')">Sign My Guestbook!</a>' +
      ' <span class="gc-separator">|</span> ' +
      '📖 <a href="javascript:void(0)" onclick="alert(\'Guestbook entries:\\n\\n' +
        'CoolDude99: Great site dude!!!\\n' +
        'xX_ShadowWolf_Xx: awesome page, check out mine!\\n' +
        'SurfGirl2000: LoVe ThE fLaMeS!!1!\\n' +
        'WebMaster_Joe: Nice HTML skills!\')">View Guestbook</a>' +
      ' <span class="gc-separator">|</span> ' +
      '✉️ <a href="mailto:webmaster@manaiakalani.com">Email the Webmaster</a>';
    return div;
  }

  function createWebring() {
    const sites = [
      'https://www.spacejam.com/1996/',
      'https://www.cameronsworld.net/',
      'https://therestartpage.com/',
    ];
    var rand = sites[Math.floor(Math.random() * sites.length)];
    const div = document.createElement('div');
    div.className = 'gc-webring';
    div.innerHTML =
      '<span class="gc-webring-title">🌐 The Cool Homepages Webring 🌐</span>' +
      '<a href="' + sites[0] + '" target="_blank" rel="noopener noreferrer" title="Previous site">&lt;&lt; Prev</a>' +
      ' | <a href="' + rand + '" target="_blank" rel="noopener noreferrer" title="Random site">Random</a> | ' +
      '<a href="' + sites[sites.length - 1] + '" target="_blank" rel="noopener noreferrer" title="Next site">Next &gt;&gt;</a>';
    return div;
  }

  function createNetscapeBadge() {
    const div = document.createElement('div');
    div.className = 'gc-netscape-badge';
    div.innerHTML =
      '<span class="gc-badge">' +
        '<span class="gc-badge-text">⚓ Netscape Now!</span>' +
        '<span class="gc-badge-sub">Best viewed in<br>Netscape Navigator 4.0</span>' +
      '</span>';
    return decorative(div);
  }

  function createButtonsRow() {
    const div = document.createElement('div');
    div.className = 'gc-buttons-row';
    var buttons = [
      { text: 'Made with<br>Notepad', bg: '#000080' },
      { text: 'GeoCities<br>Homesteader', bg: '#336633' },
      { text: 'Powered by<br>HTML 3.2', bg: '#660000' },
      { text: 'JavaScript<br>Enhanced!', bg: '#663399' },
      { text: 'Y2K<br>Compliant!', bg: '#006666' },
      { text: 'IE Free<br>Zone!', bg: '#cc3300' },
    ];
    buttons.forEach(function (b) {
      var span = document.createElement('span');
      span.className = 'gc-88x31';
      span.style.background = b.bg;
      span.innerHTML = b.text;
      div.appendChild(span);
    });
    return decorative(div);
  }

  function createMidiPlayer() {
    var div = document.createElement('div');
    div.className = 'gc-midi-player';
    div.innerHTML =
      '<div class="gc-midi-header">' +
        '<span>🎵 MIDI Jukebox</span>' +
        '<span title="Close">✕</span>' +
      '</div>' +
      '<div class="gc-midi-body">' +
        '<div class="gc-midi-controls">' +
          '<button class="gc-midi-btn" title="Previous" aria-label="Previous track">⏮</button>' +
          '<button class="gc-midi-btn" title="Play" aria-label="Play" onclick="alert(\'🎵 Now playing: canyon.mid\\n\\nJust kidding — your 28.8k modem can\\u0027t handle audio AND graphics!\')">▶</button>' +
          '<button class="gc-midi-btn" title="Stop" aria-label="Stop">⏹</button>' +
          '<button class="gc-midi-btn" title="Next" aria-label="Next track">⏭</button>' +
        '</div>' +
        '<div class="gc-midi-track">♫ canyon.mid</div>' +
        '<div class="gc-midi-eq">' +
          '<div class="gc-midi-eq-bar" style="height:8px"></div>' +
          '<div class="gc-midi-eq-bar" style="height:12px"></div>' +
          '<div class="gc-midi-eq-bar" style="height:6px"></div>' +
          '<div class="gc-midi-eq-bar" style="height:14px"></div>' +
          '<div class="gc-midi-eq-bar" style="height:10px"></div>' +
        '</div>' +
      '</div>';
    return div;
  }

  function createBestViewed() {
    var div = document.createElement('div');
    div.className = 'gc-best-viewed';
    div.textContent =
      'Best viewed in Netscape Navigator 4.0 or higher at 800x600 resolution with 256 colors. ' +
      'This page made entirely with Notepad.exe. \u00A9 1997 Manaiakalani\'s Homepage';
    return div;
  }

  function createAsciiDivider() {
    var div = document.createElement('div');
    div.className = 'gc-ascii-divider';
    // Responsive: use viewport-aware count
    var charCount = Math.min(60, Math.floor(window.innerWidth / 10));
    div.textContent = '\u2550'.repeat(charCount);
    return decorative(div);
  }

  // ---- Cursor trail (throttled, with touch support) ----
  function spawnTrail(x, y) {
    var now = performance.now();
    if (now - lastTrailTime < TRAIL_THROTTLE_MS) return;
    lastTrailTime = now;

    var sparkles = ['\u2728', '\u2B50', '\uD83D\uDCAB', '\uD83C\uDF1F', '\u2726', '\u2605'];
    var el = document.createElement('div');
    el.className = 'gc-cursor-trail';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 600);
  }

  function onMouseMove(e) {
    if (!cursorTrailEnabled) return;
    spawnTrail(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (!cursorTrailEnabled) return;
    var touch = e.touches[0];
    if (touch) spawnTrail(touch.clientX, touch.clientY);
  }

  // ---- Inject all geocities elements ----
  function injectGeoCities() {
    if (injected) return;
    injected = true;

    var header = document.querySelector('header');
    var about = document.querySelector('#about');
    var footer = document.querySelector('footer');
    if (!header || !about || !footer) return;

    // Construction banner above header
    var banner = createConstructionBanner();
    header.parentNode.insertBefore(banner, header);
    gcElements.push(banner);

    // Flames bar after header
    var flames = createFlamesBar();
    header.parentNode.insertBefore(flames, header.nextSibling);
    gcElements.push(flames);

    // Marquee after flames
    var marquee = createMarquee();
    flames.parentNode.insertBefore(marquee, flames.nextSibling);
    gcElements.push(marquee);

    // Rainbow HR before about
    var hr1 = createRainbowHr();
    about.parentNode.insertBefore(hr1, about);
    gcElements.push(hr1);

    // ASCII divider after about
    var ascii = createAsciiDivider();
    about.parentNode.insertBefore(ascii, about.nextSibling);
    gcElements.push(ascii);

    // Rainbow HR before footer
    var hr2 = createRainbowHr();
    footer.parentNode.insertBefore(hr2, footer);
    gcElements.push(hr2);

    // Flames before footer
    var flames2 = createFlamesBar();
    footer.parentNode.insertBefore(flames2, footer);
    gcElements.push(flames2);

    // Inside footer: MIDI player, visitor counter, links, webring, badges, netscape, best-viewed
    var footerContainer = footer.querySelector('.container');
    if (footerContainer) {
      var elements = [
        createMidiPlayer(),
        createVisitorCounter(),
        createRainbowHr(),
        createBottomLinks(),
        createWebring(),
        createButtonsRow(),
        createNetscapeBadge(),
        createBestViewed(),
      ];
      elements.forEach(function (el) {
        footerContainer.appendChild(el);
        gcElements.push(el);
      });
    }

    // Enable cursor trail
    cursorTrailEnabled = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
  }

  // ---- Remove all geocities elements ----
  function removeGeoCities() {
    if (!injected) return;
    injected = false;
    cursorTrailEnabled = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);

    gcElements.forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    gcElements.length = 0;

    // Clean up any leftover cursor trails
    document.querySelectorAll('.gc-cursor-trail').forEach(function (el) { el.remove(); });
  }

  // ---- Apply state ----
  function applyGeoCities(enabled) {
    if (enabled) {
      root.setAttribute('data-geocities', 'true');
      injectGeoCities();
    } else {
      root.removeAttribute('data-geocities');
      removeGeoCities();
    }
  }

  // ---- Toggle handler ----
  toggle.addEventListener('click', function () {
    var isActive = root.getAttribute('data-geocities') === 'true';
    var next = !isActive;
    localStorage.setItem(GC_KEY, next ? 'true' : 'false');
    applyGeoCities(next);
  });

  // ---- Initialize from stored state ----
  if (localStorage.getItem(GC_KEY) === 'true') {
    applyGeoCities(true);
  }
})();
