// GeoCities Mode — Welcome to 1997! 🚧🔥
(function () {
  'use strict';

  const GC_KEY = 'mnk:geocities';
  const root = document.documentElement;
  const toggle = document.querySelector('.geocities-toggle');
  if (!toggle) return;

  let injected = false;
  const gcElements = [];
  let cursorTrailEnabled = false;
  let lastTrailTime = 0;
  const TRAIL_THROTTLE_MS = 50;

  // Prefer the live /api/counter odometer so the 1997 display matches the footer.
  function sharedVisitorDigits() {
    if (typeof window.mnkVisitorCount === 'number' && isFinite(window.mnkVisitorCount)) {
      return String(Math.max(0, Math.floor(window.mnkVisitorCount))).padStart(7, '0');
    }
    var odo = document.querySelector('.visits-odometer');
    if (odo) {
      var painted = Array.prototype.map.call(odo.querySelectorAll('.visits-digit'), function (el) {
        return el.textContent;
      }).join('');
      if (painted) return painted.padStart(7, '0');
    }
    return '0000001';
  }

  function paintGcCounter(count) {
    var display = document.querySelector('.gc-digit-display');
    if (!display) return;
    var digits = String(count).padStart(7, '0').split('');
    display.innerHTML = digits.map(function (d) {
      return '<span class="gc-digit">' + d + '</span>';
    }).join('');
  }

  window.mnkSyncGcCounter = function (count) {
    paintGcCounter(count);
  };

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
      sharedVisitorDigits() +
      '! ★ This site is best viewed in Netscape Navigator 4.0 at 800x600 ★ ' +
      'Sign my guestbook!! ★ ' +
      (window.mnkBuilding && window.mnkBuilding.name
        ? ('Currently pushing ' + window.mnkBuilding.name +
          (window.mnkBuilding.rel ? ' · ' + window.mnkBuilding.rel : '') + ' ★ ')
        : ('Last updated: ' +
          new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ★ ')) +
      'Ask Jeeves if you need help finding anything! ★ ' +
      'FREE MIDI FILES ★ Cool Links ★ Powered by GeoCities ★' +
      '</span>';
    return decorative(container);
  }

  function createRainbowHr() {
    const hr = document.createElement('hr');
    hr.className = 'gc-hr-rainbow';
    return decorative(hr);
  }

  // ---- Persistent guestbook (retro dialog UI; data layer is guestbook.js) ----
  var guestbookDialog = null;
  function gb() { return window.mnkGuestbook; }


  function buildGuestbookDialog() {
    if (guestbookDialog) return guestbookDialog;
    var dlg = document.createElement('dialog');
    dlg.className = 'gc-guestbook-dialog';
    dlg.setAttribute('aria-label', 'Guestbook');
    dlg.innerHTML =
      '<div class="gc-gb-titlebar">' +
        '<span>📖 Sign My Guestbook!</span>' +
        '<button type="button" class="gc-gb-close" aria-label="Close guestbook">✕</button>' +
      '</div>' +
      '<div class="gc-gb-body">' +
        '<form class="gc-gb-form">' +
          '<label class="gc-gb-field">Your name:' +
            '<input type="text" name="name" maxlength="40" required autocomplete="off" placeholder="xX_CoolVisitor_Xx">' +
          '</label>' +
          '<label class="gc-gb-field">Your message:' +
            '<textarea name="message" maxlength="200" required rows="3" placeholder="Sign my guestbook!!1!"></textarea>' +
          '</label>' +
          '<div class="gc-gb-actions">' +
            '<button type="submit" class="gc-gb-sign">✍️ Sign it!</button>' +
            '<span class="gc-gb-status" role="status" aria-live="polite"></span>' +
          '</div>' +
        '</form>' +
        '<hr class="gc-hr-rainbow" aria-hidden="true">' +
        '<div class="gc-gb-tools">' +
          '<button type="button" class="gc-gb-tool" data-gc-gb="export">\uD83D\uDCBE Export</button>' +
          '<button type="button" class="gc-gb-tool" data-gc-gb="import">\uD83D\uDCC2 Import</button>' +
          '<input type="file" class="gc-gb-file" accept="application/json,.json" hidden aria-hidden="true" tabindex="-1">' +
        '</div>' +
        '<div class="gc-gb-count" aria-live="polite"></div>' +
        '<ul class="gc-gb-list"></ul>' +
      '</div>';

    var listEl = dlg.querySelector('.gc-gb-list');
    var countEl = dlg.querySelector('.gc-gb-count');
    var form = dlg.querySelector('.gc-gb-form');
    var status = dlg.querySelector('.gc-gb-status');
    var closeBtn = dlg.querySelector('.gc-gb-close');
    var exportBtn = dlg.querySelector('[data-gc-gb="export"]');
    var importBtn = dlg.querySelector('[data-gc-gb="import"]');
    var fileInput = dlg.querySelector('.gc-gb-file');
    var book = gb();
    if (book) {
      book.bindForm(form, listEl, countEl, status);
      exportBtn.addEventListener('click', function () {
        book.exportBook();
        status.textContent = 'Guestbook exported! \uD83D\uDCBE';
      });
      importBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) {
          book.importBook(fileInput.files[0], listEl, countEl, status);
        }
        fileInput.value = '';
      });
    }

    closeBtn.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

    document.body.appendChild(dlg);
    guestbookDialog = dlg;
    return dlg;
  }

  function openGuestbook(focusForm) {
    var dlg = buildGuestbookDialog();
    var status = dlg.querySelector('.gc-gb-status');
    if (status) status.textContent = '';
    if (gb()) gb().render(dlg.querySelector('.gc-gb-list'), dlg.querySelector('.gc-gb-count'));
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    if (focusForm) {
      var nameInput = dlg.querySelector('input[name="name"]');
      if (nameInput) nameInput.focus();
    }
  }

  function createBottomLinks() {
    const div = document.createElement('div');
    div.className = 'gc-bottom-links';
    div.innerHTML =
      '📖 <a href="#" data-gc-action="sign-guestbook">Sign My Guestbook!</a>' +
      ' <span class="gc-separator">|</span> ' +
      '📖 <a href="#" data-gc-action="view-guestbook">View Guestbook</a>' +
      ' <span class="gc-separator">|</span> ' +
      '✉️ <a href="mailto:webmaster@manaiakalani.com">Email the Webmaster</a>';
    // CSP-safe handlers (no inline onclick / javascript: URLs)
    var sign = div.querySelector('[data-gc-action="sign-guestbook"]');
    if (sign) {
      sign.addEventListener('click', function (e) {
        e.preventDefault();
        openGuestbook(true);
      });
    }
    var viewBook = div.querySelector('[data-gc-action="view-guestbook"]');
    if (viewBook) {
      viewBook.addEventListener('click', function (e) {
        e.preventDefault();
        openGuestbook(false);
      });
    }
    return div;
  }

  function createWebring() {
    var sites = [
      { name: 'This homepage', href: 'https://manaiakalani.com/' },
      { name: 'Space Jam 1996', href: 'https://www.spacejam.com/1996/' },
      { name: "Cameron's World", href: 'https://www.cameronsworld.net/' },
      { name: 'The Restart Page', href: 'https://therestartpage.com/' },
      { name: 'Zombo.com', href: 'https://zombo.com/' },
      { name: 'Hamster Dance', href: 'https://www.hamsterdance.org/hamsterdance/' },
      { name: 'Arngren', href: 'https://www.arngren.net/' },
      { name: "Ling's Cars", href: 'https://www.lingscars.com/' }
    ];
    var here = window.location.hostname.replace(/^www\./, '');
    var idx = 0;
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].href.indexOf(here) !== -1) { idx = i; break; }
    }
    function at(n) { return sites[(n + sites.length) % sites.length]; }
    var rand = sites[Math.floor(Math.random() * sites.length)];
    var div = document.createElement('div');
    div.className = 'gc-webring';
    div.innerHTML =
      '<span class="gc-webring-title">🌐 The Cool Homepages Webring 🌐</span>' +
      '<a href="' + at(idx - 1).href + '" target="_blank" rel="noopener noreferrer" title="' + at(idx - 1).name + '">&lt;&lt; Prev</a>' +
      ' | <a href="' + rand.href + '" target="_blank" rel="noopener noreferrer" title="Random site">Random</a> | ' +
      '<a href="' + at(idx + 1).href + '" target="_blank" rel="noopener noreferrer" title="' + at(idx + 1).name + '">Next &gt;&gt;</a>';
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
    var homeBadge = document.createElement('a');
    homeBadge.href = '/';
    homeBadge.className = 'gc-88x31-link';
    homeBadge.innerHTML = '<img src="/badge-88x31.png" width="88" height="31" alt="manaiakalani.com">';
    div.insertBefore(homeBadge, div.firstChild);
    return decorative(div);
  }

  function createMinesweeper() {
    var ROWS = 9, COLS = 9, MINES = 10;
    var wrap = document.createElement('div');
    wrap.className = 'gc-mines';
    wrap.innerHTML =
      '<div class="gc-mines-title">Minesweeper</div>' +
      '<div class="gc-mines-bar">' +
        '<span class="gc-mines-count" aria-live="polite">010</span>' +
        '<button type="button" class="gc-mines-reset" aria-label="New game">:-)</button>' +
        '<span class="gc-mines-time">000</span>' +
      '</div>' +
      '<div class="gc-mines-grid" role="grid" aria-label="Minesweeper, 9 by 9"></div>';
    var gridEl = wrap.querySelector('.gc-mines-grid');
    var countEl = wrap.querySelector('.gc-mines-count');
    var timeEl = wrap.querySelector('.gc-mines-time');
    var resetBtn = wrap.querySelector('.gc-mines-reset');
    var board, mines, revealed, flagged, started, dead, won, timer, ticks;

    function pad(n) {
      n = Math.max(0, Math.min(999, n));
      return ('000' + n).slice(-3);
    }
    function idx(r, c) { return r * COLS + c; }
    function neighbors(r, c) {
      var out = [];
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push([rr, cc]);
        }
      }
      return out;
    }
    function plant(safe) {
      mines = {};
      var placed = 0;
      while (placed < MINES) {
        var r = Math.floor(Math.random() * ROWS);
        var c = Math.floor(Math.random() * COLS);
        var i = idx(r, c);
        if (mines[i] || i === safe) continue;
        mines[i] = true;
        placed++;
      }
    }
    function countAdj(r, c) {
      var n = 0;
      neighbors(r, c).forEach(function (p) { if (mines[idx(p[0], p[1])]) n++; });
      return n;
    }
    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function startTimer() {
      stopTimer();
      ticks = 0;
      timeEl.textContent = '000';
      timer = setInterval(function () {
        ticks += 1;
        timeEl.textContent = pad(ticks);
      }, 1000);
    }
    function remaining() {
      var n = MINES;
      Object.keys(flagged).forEach(function (k) { if (flagged[k]) n--; });
      countEl.textContent = pad(n);
    }
    function paintCell(r, c) {
      var i = idx(r, c);
      var btn = board[i];
      btn.className = 'gc-mines-cell';
      btn.textContent = '';
      btn.disabled = false;
      if (flagged[i] && !revealed[i]) {
        btn.classList.add('is-flag');
        btn.textContent = 'F';
        return;
      }
      if (!revealed[i]) return;
      btn.classList.add('is-open');
      if (mines[i]) {
        btn.classList.add('is-mine');
        btn.textContent = '*';
        return;
      }
      var n = countAdj(r, c);
      if (n) {
        btn.textContent = String(n);
        btn.setAttribute('data-n', String(n));
      }
    }
    function flood(r, c) {
      var stack = [[r, c]];
      while (stack.length) {
        var cur = stack.pop();
        var i = idx(cur[0], cur[1]);
        if (revealed[i] || flagged[i]) continue;
        revealed[i] = true;
        var n = countAdj(cur[0], cur[1]);
        paintCell(cur[0], cur[1]);
        if (n === 0 && !mines[i]) {
          neighbors(cur[0], cur[1]).forEach(function (p) { stack.push(p); });
        }
      }
    }
    function checkWin() {
      var hidden = 0;
      for (var i = 0; i < ROWS * COLS; i++) if (!revealed[i]) hidden++;
      if (hidden === MINES) {
        won = true;
        dead = false;
        stopTimer();
        resetBtn.textContent = 'B-)';
        Object.keys(mines).forEach(function (k) { flagged[k] = true; });
        remaining();
      }
    }
    function boom() {
      dead = true;
      stopTimer();
      resetBtn.textContent = 'X(';
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var i = idx(r, c);
          if (mines[i]) revealed[i] = true;
          paintCell(r, c);
        }
      }
    }
    function click(r, c) {
      if (dead || won) return;
      var i = idx(r, c);
      if (flagged[i]) return;
      if (!started) {
        plant(i);
        started = true;
        startTimer();
      }
      if (mines[i]) { boom(); return; }
      flood(r, c);
      checkWin();
    }
    function flag(r, c) {
      if (dead || won) return;
      var i = idx(r, c);
      if (revealed[i]) return;
      flagged[i] = !flagged[i];
      paintCell(r, c);
      remaining();
    }
    function reset() {
      stopTimer();
      started = dead = won = false;
      revealed = {};
      flagged = {};
      mines = {};
      resetBtn.textContent = ':-)';
      timeEl.textContent = '000';
      countEl.textContent = pad(MINES);
      gridEl.textContent = '';
      board = [];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          (function (rr, cc) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gc-mines-cell';
            btn.setAttribute('role', 'gridcell');
            btn.addEventListener('click', function () { click(rr, cc); });
            btn.addEventListener('contextmenu', function (e) { e.preventDefault(); flag(rr, cc); });
            gridEl.appendChild(btn);
            board.push(btn);
          })(r, c);
        }
      }
    }
    resetBtn.addEventListener('click', reset);
    reset();
    wrap.stopMines = stopTimer;
    return wrap;
  }

  function createMidiPlayer() {
    var tracks = [
      { name: 'canyon.mid', seed: 0 },
      { name: 'cloud-city.mid', seed: 1 },
      { name: 'under-construction.mid', seed: 2 }
    ];
    var idx = 0;
    var ctx = null;
    var playing = false;
    var nodes = [];
    var div = document.createElement('div');
    div.className = 'gc-midi-player';
    div.innerHTML =
      '<div class="gc-midi-header">' +
        '<span>🎵 MIDI Jukebox</span>' +
        '<button type="button" class="gc-midi-close" title="Close" aria-label="Close MIDI player">✕</button>' +
      '</div>' +
      '<div class="gc-midi-body">' +
        '<div class="gc-midi-controls">' +
          '<button type="button" class="gc-midi-btn" data-gc-midi="prev" title="Previous" aria-label="Previous track">⏮</button>' +
          '<button type="button" class="gc-midi-btn" data-gc-midi="play" title="Play" aria-label="Play">▶</button>' +
          '<button type="button" class="gc-midi-btn" data-gc-midi="stop" title="Stop" aria-label="Stop">⏹</button>' +
          '<button type="button" class="gc-midi-btn" data-gc-midi="next" title="Next" aria-label="Next track">⏭</button>' +
        '</div>' +
        '<div class="gc-midi-track">♫ ' + tracks[0].name + '</div>' +
        '<div class="gc-midi-eq" aria-hidden="true">' +
          '<div class="gc-midi-eq-bar"></div><div class="gc-midi-eq-bar"></div>' +
          '<div class="gc-midi-eq-bar"></div><div class="gc-midi-eq-bar"></div>' +
          '<div class="gc-midi-eq-bar"></div>' +
        '</div>' +
      '</div>';

    var trackEl = div.querySelector('.gc-midi-track');
    var playBtn = div.querySelector('[data-gc-midi="play"]');
    function setTrackLabel() {
      trackEl.textContent = '♫ ' + tracks[idx].name;
    }
    function stopMidi() {
      playing = false;
      div.classList.remove('is-playing');
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Play');
      nodes.forEach(function (n) {
        try { n.stop(); } catch (e) {}
      });
      nodes = [];
    }
    function playMidi() {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      stopMidi();
      playing = true;
      div.classList.add('is-playing');
      playBtn.textContent = '⏸';
      playBtn.setAttribute('aria-label', 'Pause');
      // Four-bar square-wave sting. Names are 1997; the oscillator is 2026.
      var scale = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 261.63];
      var shift = [0, 2, 4][tracks[idx].seed] || 0;
      var t0 = ctx.currentTime + 0.05;
      var beat = 0.22;
      for (var n = 0; n < 16; n++) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = scale[(n + shift) % scale.length] * (n % 8 === 7 ? 0.5 : 1);
        gain.gain.setValueAtTime(0.0001, t0 + n * beat);
        gain.gain.exponentialRampToValueAtTime(0.05, t0 + n * beat + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n * beat + beat * 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0 + n * beat);
        osc.stop(t0 + n * beat + beat);
        nodes.push(osc);
      }
      var last = nodes[nodes.length - 1];
      if (last) last.onended = function () {
        if (playing) stopMidi();
      };
    }
    div.querySelector('[data-gc-midi="play"]').addEventListener('click', function () {
      if (playing) stopMidi();
      else playMidi();
    });
    div.querySelector('[data-gc-midi="stop"]').addEventListener('click', stopMidi);
    div.querySelector('[data-gc-midi="prev"]').addEventListener('click', function () {
      idx = (idx + tracks.length - 1) % tracks.length;
      setTrackLabel();
      if (playing) playMidi();
    });
    div.querySelector('[data-gc-midi="next"]').addEventListener('click', function () {
      idx = (idx + 1) % tracks.length;
      setTrackLabel();
      if (playing) playMidi();
    });
    div.querySelector('.gc-midi-close').addEventListener('click', function () {
      stopMidi();
      div.hidden = true;
    });
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
    var charCount = Math.min(60, Math.floor(window.innerWidth / 10));
    div.textContent = '\u2550'.repeat(charCount);
    return decorative(div);
  }

  // ---- Blinking NEW! badges on project cards ----
  function injectNewBadges() {
    document.querySelectorAll('.gc-new-badge').forEach(function (el) { el.remove(); });
    var cards = document.querySelectorAll('.project-card');
    for (var i = 0; i < Math.min(3, cards.length); i++) {
      var badge = document.createElement('span');
      badge.className = 'gc-new-badge';
      badge.textContent = 'NEW!';
      badge.setAttribute('aria-hidden', 'true');
      cards[i].style.position = 'relative';
      cards[i].appendChild(badge);
      gcElements.push(badge);
    }
  }

  // ---- Construction cones near page titles ----
  function createConstructionCones() {
    var hero = document.querySelector('.page-hero h1, .page-hero h2');
    if (!hero) return null;
    var wrapper = document.createElement('span');
    wrapper.className = 'gc-construction-cones';
    wrapper.innerHTML = ' 🚧🏗️👷';
    wrapper.setAttribute('aria-hidden', 'true');
    hero.appendChild(wrapper);
    return wrapper;
  }

  // ---- Twinkling stars overlay ----
  function createTwinklingStars() {
    var container = document.createElement('div');
    container.className = 'gc-twinkling-stars';
    container.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 25; i++) {
      var star = document.createElement('span');
      star.className = 'gc-twinkle-star';
      star.textContent = ['✦', '✧', '⋆', '★', '☆'][Math.floor(Math.random() * 5)];
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = (Math.random() * 3).toFixed(1) + 's';
      star.style.animationDuration = (1.5 + Math.random() * 2).toFixed(1) + 's';
      star.style.fontSize = (8 + Math.random() * 14) + 'px';
      container.appendChild(star);
    }
    return container;
  }

  // ---- Graphical hit counter (digit-by-digit) ----
  function createGraphicalCounter() {
    var div = document.createElement('div');
    div.className = 'gc-graphical-counter';
    var digits = sharedVisitorDigits().split('');
    div.innerHTML =
      '<span class="gc-counter-label">~ You are visitor number ~</span>' +
      '<div class="gc-digit-display">' +
      digits.map(function (d) {
        return '<span class="gc-digit">' + d + '</span>';
      }).join('') +
      '</div>';
    return div;
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
    var footer = document.querySelector('footer');
    if (!header || !footer) return;

    // Find the main content section (works on all pages)
    var mainContent = document.querySelector('#about') || document.querySelector('.page-hero') || document.querySelector('main');

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

    // Rainbow HR + ASCII divider around main content
    if (mainContent) {
      var hr1 = createRainbowHr();
      mainContent.parentNode.insertBefore(hr1, mainContent);
      gcElements.push(hr1);

      var ascii = createAsciiDivider();
      mainContent.parentNode.insertBefore(ascii, mainContent.nextSibling);
      gcElements.push(ascii);
    }

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
        createMinesweeper(),
        createGraphicalCounter(),
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

    injectNewBadges();
    ['featured-projects', 'all-projects'].forEach(function (id) {
      var grid = document.getElementById(id);
      if (!grid || typeof MutationObserver !== 'function') return;
      var obs = new MutationObserver(function () { injectNewBadges(); });
      obs.observe(grid, { childList: true });
      gcElements.push({ parentNode: { removeChild: function () { obs.disconnect(); } } });
    });

    // Construction cones on sub-page titles
    var cones = createConstructionCones();
    if (cones) gcElements.push(cones);

    // Twinkling stars overlay
    var stars = createTwinklingStars();
    document.body.appendChild(stars);
    gcElements.push(stars);

    // Enable cursor trail (skip under reduced motion)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cursorTrailEnabled = true;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('touchmove', onTouchMove, { passive: true });
    }
  }

  // ---- Remove all geocities elements ----
  function removeGeoCities() {
    if (!injected) return;
    injected = false;
    cursorTrailEnabled = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);

    // Close the guestbook modal before detaching it so focus and scroll-lock
    // state are properly restored (showModal leaves them set otherwise).
    if (guestbookDialog && guestbookDialog.open) {
      try { guestbookDialog.close(); } catch (e) { /* ignore */ }
    }

    gcElements.forEach(function (el) {
      if (el && typeof el.stopMines === 'function') el.stopMines();
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    gcElements.length = 0;
    // Guestbook dialog is independent of retro chrome so footer/⌘K can keep it.

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
    try { localStorage.setItem(GC_KEY, next ? 'true' : 'false'); } catch (e) { /* storage unavailable */ }
    toggle.setAttribute('aria-pressed', String(next));
    applyGeoCities(next);
  });

  // ---- Initialize from stored state ----
  var storedGeo = null;
  try { storedGeo = localStorage.getItem(GC_KEY); } catch (e) { /* storage unavailable */ }
  if (storedGeo === 'true') {
    applyGeoCities(true);
  }

  window.openGuestbook = openGuestbook;
  window.enableGeoCities = function () {
    if (root.getAttribute('data-geocities') === 'true') return;
    toggle.click();
  };
})();
