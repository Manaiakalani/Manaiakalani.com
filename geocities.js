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

  // ---- Visitor counter (persisted) ----
  function getVisitorCount() {
    let count = parseInt(localStorage.getItem('gc-visitors') || '0', 10);
    count += 1;
    localStorage.setItem('gc-visitors', String(count));
    return count;
  }

  // ---- Build HTML elements ----
  function createFlamesBar() {
    const bar = document.createElement('div');
    bar.className = 'gc-flames-bar';
    const flames = '🔥'.repeat(40);
    bar.innerHTML = flames.split('').map(f =>
      '<span class="gc-flame">' + f + '</span>'
    ).join('');
    return bar;
  }

  function createConstructionBanner() {
    const banner = document.createElement('div');
    banner.className = 'gc-construction-banner';
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
      String(getVisitorCount()).padStart(6, '0') +
      '! ★ This site is best viewed in Netscape Navigator 4.0 at 800x600 ★ ' +
      'Sign my guestbook!! ★ Last updated: ' +
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' ★ Ask Jeeves if you need help finding anything! ★ ' +
      'FREE MIDI FILES ★ Cool Links ★ Powered by GeoCities ★' +
      '</span>';
    return container;
  }

  function createRainbowHr() {
    const hr = document.createElement('hr');
    hr.className = 'gc-hr-rainbow';
    return hr;
  }

  function createVisitorCounter() {
    const div = document.createElement('div');
    div.className = 'gc-visitor-counter';
    const count = parseInt(localStorage.getItem('gc-visitors') || '1', 10);
    div.innerHTML =
      '<span class="gc-counter-label">~ You are visitor number ~</span>' +
      '<span class="gc-counter-display">' + String(count).padStart(7, '0') + '</span>';
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
    const div = document.createElement('div');
    div.className = 'gc-webring';
    div.innerHTML =
      '<span class="gc-webring-title">🌐 The Cool Homepages Webring 🌐</span>' +
      '<a href="javascript:void(0)" title="Previous site">&lt;&lt; Prev</a>' +
      ' | <a href="javascript:void(0)" title="Random site">Random</a> | ' +
      '<a href="javascript:void(0)" title="Next site">Next &gt;&gt;</a>';
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
    return div;
  }

  function createButtonsRow() {
    const div = document.createElement('div');
    div.className = 'gc-buttons-row';
    const buttons = [
      { text: 'Made with<br>Notepad', bg: '#000080' },
      { text: 'GeoCities<br>Homesteader', bg: '#336633' },
      { text: 'Powered by<br>HTML 3.2', bg: '#660000' },
      { text: 'JavaScript<br>Enhanced!', bg: '#663399' },
      { text: 'Y2K<br>Compliant!', bg: '#006666' },
      { text: 'IE Free<br>Zone!', bg: '#cc3300' },
    ];
    buttons.forEach(b => {
      const span = document.createElement('span');
      span.className = 'gc-88x31';
      span.style.background = b.bg;
      span.innerHTML = b.text;
      div.appendChild(span);
    });
    return div;
  }

  function createBestViewed() {
    const div = document.createElement('div');
    div.className = 'gc-best-viewed';
    div.textContent =
      'Best viewed in Netscape Navigator 4.0 or higher at 800x600 resolution with 256 colors. ' +
      'This page made entirely with Notepad.exe. © 1997 Manaiakalani\'s Homepage';
    return div;
  }

  function createAsciiDivider() {
    const div = document.createElement('div');
    div.className = 'gc-ascii-divider';
    div.textContent = '═'.repeat(60);
    return div;
  }

  // ---- Cursor trail ----
  function onMouseMove(e) {
    if (!cursorTrailEnabled) return;
    const sparkles = ['✨', '⭐', '💫', '🌟', '✦', '★'];
    const el = document.createElement('div');
    el.className = 'gc-cursor-trail';
    el.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
    el.style.left = e.clientX + 'px';
    el.style.top = e.clientY + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 600);
  }

  // ---- Inject all geocities elements ----
  function injectGeoCities() {
    if (injected) return;
    injected = true;

    const header = document.querySelector('header');
    const about = document.querySelector('#about');
    const footer = document.querySelector('footer');
    if (!header || !about || !footer) return;

    // Construction banner above header
    const banner = createConstructionBanner();
    header.parentNode.insertBefore(banner, header);
    gcElements.push(banner);

    // Flames bar after header
    const flames = createFlamesBar();
    header.parentNode.insertBefore(flames, header.nextSibling);
    gcElements.push(flames);

    // Marquee after flames
    const marquee = createMarquee();
    flames.parentNode.insertBefore(marquee, flames.nextSibling);
    gcElements.push(marquee);

    // Rainbow HR before about
    const hr1 = createRainbowHr();
    about.parentNode.insertBefore(hr1, about);
    gcElements.push(hr1);

    // ASCII divider after about
    const ascii = createAsciiDivider();
    about.parentNode.insertBefore(ascii, about.nextSibling);
    gcElements.push(ascii);

    // Rainbow HR before footer
    const hr2 = createRainbowHr();
    footer.parentNode.insertBefore(hr2, footer);
    gcElements.push(hr2);

    // Flames before footer
    const flames2 = createFlamesBar();
    footer.parentNode.insertBefore(flames2, footer);
    gcElements.push(flames2);

    // Inside footer: visitor counter, links, webring, badges, netscape, best-viewed
    const footerContainer = footer.querySelector('.container');
    if (footerContainer) {
      const elements = [
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
  }

  // ---- Remove all geocities elements ----
  function removeGeoCities() {
    if (!injected) return;
    injected = false;
    cursorTrailEnabled = false;
    document.removeEventListener('mousemove', onMouseMove);

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
    const isActive = root.getAttribute('data-geocities') === 'true';
    const next = !isActive;
    localStorage.setItem(GC_KEY, next ? 'true' : 'false');
    applyGeoCities(next);
  });

  // ---- Initialize from stored state ----
  if (localStorage.getItem(GC_KEY) === 'true') {
    applyGeoCities(true);
  }
})();
