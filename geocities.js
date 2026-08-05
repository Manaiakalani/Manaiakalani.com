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

  // ---- Visitor counter (increment once per page load, not per toggle) ----
  const visitorCount = (function () {
    try {
      let count = parseInt(localStorage.getItem('gc-visitors') || '0', 10);
      if (!isFinite(count) || count < 0) count = 0;
      count += 1;
      localStorage.setItem('gc-visitors', String(count));
      return count;
    } catch (e) {
      // Storage unavailable (private mode / blocked cookies): the decorative
      // counter must never stop GeoCities mode from initialising.
      return 1;
    }
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

  // ---- Persistent guestbook (localStorage-backed, retro dialog UI) ----
  var GB_KEY = 'mnk:guestbook';
  var guestbookDialog = null;
  var GB_SEED = [
    { name: 'CoolDude99', message: 'Great site dude!!!', date: 'Aug 12, 1998' },
    { name: 'xX_ShadowWolf_Xx', message: 'awesome page, check out mine!', date: 'Sep 03, 1998' },
    { name: 'SurfGirl2000', message: 'LoVe ThE fLaMeS!!1!', date: 'Oct 21, 1998' },
    { name: 'WebMaster_Joe', message: 'Nice HTML skills!', date: 'Nov 15, 1998' }
  ];

  function sanitizeEntries(arr) {
    // Coerce every record to safe strings and bound the list, so a hand-edited
    // or corrupt localStorage payload can't crash rendering or freeze the page.
    var out = [];
    for (var i = 0; i < arr.length && out.length < 100; i++) {
      var e = arr[i];
      if (!e || typeof e !== 'object') continue;
      var name = typeof e.name === 'string' ? e.name : '';
      var message = typeof e.message === 'string' ? e.message : '';
      if (!name && !message) continue;
      var rec = {
        name: name.slice(0, 40),
        message: message.slice(0, 200),
        date: typeof e.date === 'string' ? e.date.slice(0, 40) : ''
      };
      // Preserve the client-only "pending" marker (an entry this browser created
      // that the shared backend hasn't confirmed yet) so it round-trips through
      // localStorage. The server never sends this field, so server entries stay
      // unmarked and authoritative.
      if (e.pending === true) rec.pending = true;
      // Preserve the opaque entry id (allow-listed token) so a local pending copy
      // can be matched to its backend-stored row regardless of how the server later
      // normalizes the visible name/message/date. Server rows carry it too.
      if (typeof e.id === 'string' && e.id) rec.id = e.id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 36);
      out.push(rec);
    }
    return out;
  }

  function loadGuestbook() {
    try {
      var raw = localStorage.getItem(GB_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return sanitizeEntries(parsed);
      }
    } catch (e) { /* corrupt or unavailable — fall through to seed */ }
    saveGuestbook(GB_SEED);
    return GB_SEED.slice();
  }

  function saveGuestbook(entries) {
    try { localStorage.setItem(GB_KEY, JSON.stringify(entries)); } catch (e) { /* ignore */ }
  }

  function guestbookToday() {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  // Mint an opaque, collision-resistant id for a locally-created entry. It is
  // round-tripped by the backend so a pending local copy can be matched to its
  // stored row by identity (not by the visible text/date, which the server
  // normalizes). crypto.randomUUID when available; a time+random fallback
  // otherwise. Always within the server's allow-listed charset and length.
  function newEntryId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (e) { /* fall through */ }
    return ('e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 36);
  }

  // ---- Shared backend (optional) ----------------------------------------
  // When an Azure Function + Table Storage backend is configured, the
  // guestbook becomes shared across visitors. It is same-origin (/api/*), so
  // CSP connect-src 'self' already covers it. Every call fails soft: if the
  // backend is absent or errors, the guestbook silently stays local-only.
  var GB_API = '/api/guestbook';

  // Ordering guard for shared-list syncs. Responses can arrive out of order and
  // whichever one is applied last overwrites local storage, so applying a stale
  // list can silently drop entries the backend has already accepted.
  //
  // Issue order alone is not enough: the backend may process two concurrent POSTs
  // in the opposite order, so the later-issued request can be the one carrying the
  // older list. The two orderings can't be reconciled from the client.
  //
  // What makes this tractable is that the two failure directions are not
  // symmetric. Discarding a response is always safe — the entry it would have
  // confirmed simply stays marked pending, and reconcileEntries preserves pending
  // entries — whereas applying a stale response drops already-confirmed entries.
  // So only the most recently issued sync may apply its response; every superseded
  // response is dropped, and the next sync reconciles against the real list.
  var syncSeq = 0;

  function nextSyncSeq() { return ++syncSeq; }

  // The sequence above is per-document, but the guestbook lives in localStorage,
  // which is shared across tabs — so another tab confirming a signature is just as
  // invalidating as one of our own syncs. The stored value doubles as a change
  // token: a sync records it when the request is issued and re-reads it when the
  // response lands, so any write from any tab in between is detected.
  //
  // This has to be read synchronously inside the response callback. A storage
  // event would not do: events and fetch completions are queued independently, so
  // the event can be delivered *after* the response callback has already applied a
  // stale list, which is exactly the wipe being guarded against.
  //
  // It cannot starve. The token only changes on a real write, and a sync issued
  // after the last write records the current value and still matches when it
  // returns. Where localStorage is unavailable this reads null both times and the
  // guard reduces to the sequence check.
  // Known limitation: this is a check-then-act, and localStorage offers no
  // cross-document transaction, so it cannot be made strictly atomic. The token
  // is re-read immediately before each write (see applyServerList), which leaves
  // only the gap between that read and the write itself — no await or other
  // yield point — so a competing write has to come from a tab running JS
  // genuinely concurrently in a separate process. Closing it entirely would mean
  // serialising on Web Locks and making the whole reconcile path async, with a
  // fallback that would still race on browsers lacking it.
  //
  // Worst case if it does happen: an entry the backend has already accepted
  // simply reappears on the next sync, since the backend stays authoritative.
  // An entry still pending — one whose POST later fails or is rate-limited — is
  // not recoverable that way, because the backend never received it. That is the
  // real residual risk, and it is accepted as proportionate here.
  function guestbookToken() {
    try { return localStorage.getItem(GB_KEY); } catch (e) { return null; }
  }

  // True only while no newer sync has been issued and no tab has written since.
  function isLatestSync(seq, token) {
    return seq === syncSeq && guestbookToken() === token;
  }

  function readServerList(data) {
    // A positively-unconfigured or errored backend means there is no shared book
    // to reconcile against, so the caller must stay on its local copy. This has to
    // be checked first: an unconfigured GET also answers with `entries: []`, and
    // treating that as an authoritative empty list would wipe the local entries.
    if (data && (data.backend === 'unconfigured' || data.backend === 'error')) return null;
    var arr = Array.isArray(data) ? data : (data && Array.isArray(data.entries) ? data.entries : null);
    if (!arr) return null;
    // An empty array from a configured backend IS authoritative — the shared book
    // really is empty. Returning null here would strand every visitor on the local
    // seed entries until someone happened to sign.
    return sanitizeEntries(arr);
  }

  function apiGet() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(GB_API, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return readServerList(d); })
      .catch(function () { return null; });
  }

  // Returns a typed outcome so the signer gets honest feedback instead of a
  // silent success: 'ok' with a list = the shared backend accepted and returned
  // the merged guestbook; 'ok' without a list = there's simply no shared backend
  // yet, so the local save stands; 'rate_limited'/'failed' = the local copy is
  // safe but the shared sync didn't happen.
  function apiPost(entry) {
    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: 'failed' });
    return fetch(GB_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(entry)
    })
      .then(function (r) {
        if (r.status === 429) {
          var ra = parseInt(r.headers.get('Retry-After'), 10);
          return { ok: false, reason: 'rate_limited', retryAfter: isFinite(ra) && ra > 0 ? ra : null };
        }
        if (!r.ok) return { ok: false, reason: 'failed' };
        return r.json().then(function (d) {
          var list = readServerList(d);
          if (list) return { ok: true, list: list };
          // No list came back. Only a positively-recognized 'unconfigured' backend
          // means there's no shared book yet and the local save legitimately stands;
          // anything else (backend:'error', an unexpected shape, a proxy's stray 200)
          // means the shared sync didn't happen, so don't claim a cheerful success.
          if (d && d.backend === 'unconfigured') return { ok: true };
          return { ok: false, reason: 'failed' };
        }, function () { return { ok: false, reason: 'failed' }; });
      })
      .catch(function () { return { ok: false, reason: 'failed' }; });
  }

  function paintEntries(listEl, countEl, entries) {
    listEl.textContent = '';
    if (countEl) {
      countEl.textContent = '~ ' + entries.length + (entries.length === 1 ? ' soul has' : ' souls have') + ' signed ~';
    }
    entries.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'gc-gb-entry';
      var who = document.createElement('div');
      who.className = 'gc-gb-who';
      who.textContent = entry.name; // textContent keeps user input inert (no HTML injection)
      var when = document.createElement('span');
      when.className = 'gc-gb-when';
      when.textContent = entry.date ? ' — ' + entry.date : '';
      who.appendChild(when);
      var msg = document.createElement('div');
      msg.className = 'gc-gb-msg';
      msg.textContent = entry.message;
      li.appendChild(who);
      li.appendChild(msg);
      listEl.appendChild(li);
    });
  }

  // Union two entry lists, keeping `primary` order first and dropping duplicate
  // signatures, capped at 100. Shared by the shared-list reconcile and file import.
  function mergeEntries(primary, secondary) {
    var seen = Object.create(null);
    var merged = [];
    primary.concat(secondary).forEach(function (e) {
      var key = e.name + '|' + e.message + '|' + e.date;
      if (seen[key]) return;
      seen[key] = true;
      merged.push(e);
    });
    if (merged.length > 100) merged.length = 100;
    return merged;
  }

  // Reconcile the shared server list with local entries so a signature the backend
  // hasn't accepted yet is never lost. "Pending" is an explicit client-set marker on
  // entries this browser created but the backend hasn't confirmed. Matching is by the
  // opaque entry id, NOT the visible text/date — the server normalizes whitespace and
  // regenerates the date, so a name|message|date key would desync and leave a pending
  // ghost beside its server duplicate. By id: an aged-out shared entry (no marker) and
  // a 1998 seed (no marker/id) correctly yield to the authoritative server list; a
  // genuine unsynced submission is placed first so the 100-entry cap trims the oldest
  // SHARED entry, never the visitor's own. Once the backend stores a pending entry its
  // id appears in `server` — even if the POST ack was lost — so it drops out of
  // `pending` and its canonical server copy wins: idempotent, self-clearing, no dupes.
  function reconcileEntries(server, local) {
    var onServerId = Object.create(null);
    server.forEach(function (e) { if (e.id) onServerId[e.id] = true; });
    var pending = local.filter(function (e) {
      return e.pending === true && e.id && !onServerId[e.id];
    });
    return mergeEntries(pending, server);
  }

  // Apply a server list on top of the current local list.
  //
  // `expectedToken` is the change token sampled when the request was *issued*,
  // the same one isLatestSync checked. Re-reading it immediately before the
  // write means nothing may have been written, by any tab, between issuing the
  // request and storing its result — so a list reconciled against a snapshot
  // that has since moved on is never saved over a newer one. Sampling a fresh
  // token here instead would defeat that, by adopting another tab's write as
  // the baseline rather than detecting it.
  //
  // On a mismatch we discard, which is always the safe direction: the entry
  // stays pending and the next sync confirms it. Returns the merged list, or
  // null when the write was discarded.
  function applyServerList(server, expectedToken) {
    var merged = reconcileEntries(server, loadGuestbook());
    if (guestbookToken() !== expectedToken) return null;
    saveGuestbook(merged);
    return merged;
  }

  function renderGuestbookEntries(listEl, countEl) {
    paintEntries(listEl, countEl, loadGuestbook());        // instant local paint
    var seq = nextSyncSeq();
    var token = guestbookToken();
    apiGet().then(function (server) {                      // then reconcile with the shared list
      if (!server) return;
      if (!isLatestSync(seq, token)) return;               // superseded by a newer sync or another tab
      // Keep any local-only entry the backend hasn't accepted yet; the shared
      // list stays authoritative for everything it already knows about.
      var merged = applyServerList(server, token);
      if (!merged) return;                                 // another tab wrote while we reconciled
      paintEntries(listEl, countEl, merged);
    });
  }

  function exportGuestbook() {
    var data = JSON.stringify(loadGuestbook(), null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'guestbook.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importGuestbook(file, listEl, countEl, status) {
    var reader = new FileReader();
    reader.onload = function () {
      var incoming;
      try {
        var parsed = JSON.parse(String(reader.result));
        incoming = sanitizeEntries(Array.isArray(parsed) ? parsed : (parsed && parsed.entries) || []);
      } catch (e) {
        if (status) status.textContent = 'That file isn\u2019t valid guestbook JSON.';
        return;
      }
      if (!incoming.length) {
        if (status) status.textContent = 'No valid entries in that file.';
        return;
      }
      // Imported entries are user-asserted local restores the shared backend hasn't
      // seen, so mark them pending and give each a stable id (reuse a valid one from
      // the file, else mint one) — a later reconcile keeps them by identity until (if
      // ever) the backend confirms them, instead of dropping them as stale shared data.
      var pendingIncoming = incoming.map(function (e) {
        return { name: e.name, message: e.message, date: e.date, id: e.id || newEntryId(), pending: true };
      });
      // Merge imported over existing, de-duping identical signatures, cap 100.
      // Bump the sequence so any sync still in flight is superseded and cannot
      // overwrite the freshly imported entries.
      nextSyncSeq();
      var merged = mergeEntries(pendingIncoming, loadGuestbook());
      saveGuestbook(merged);
      paintEntries(listEl, countEl, merged);
      if (listEl) listEl.scrollTop = 0;
      if (status) status.textContent = 'Imported ' + incoming.length + ' entr' + (incoming.length === 1 ? 'y' : 'ies') + '! \uD83D\uDCC2';
    };
    reader.onerror = function () { if (status) status.textContent = 'Could not read that file.'; };
    reader.readAsText(file);
  }

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

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Use form.elements to avoid the form.name property collision.
      var name = form.elements['name'].value.trim();
      var message = form.elements['message'].value.trim();
      if (!name || !message) {
        status.textContent = 'Please fill in both fields!';
        return;
      }
      var id = newEntryId();
      var entry = { name: name.slice(0, 40), message: message.slice(0, 200), date: guestbookToday(), id: id };
      var entries = loadGuestbook();
      // Store a pending-marked local copy carrying the same id, so a later reconcile
      // matches it to the backend row by identity and preserves it until confirmed.
      entries.unshift({ name: entry.name, message: entry.message, date: entry.date, id: id, pending: true });
      if (entries.length > 100) entries.length = 100;
      saveGuestbook(entries);
      form.reset();
      status.textContent = 'Thanks for signing! 📖✨';
      paintEntries(listEl, countEl, entries);
      listEl.scrollTop = 0;
      // Sync to the shared backend when present, then tell the signer the truth.
      // The entry is already saved and shown locally; keep the cheerful thanks
      // only when it's safely stored (locally when there's no shared backend yet,
      // or shared when the backend accepted). Otherwise say what really happened.
      var postSeq = nextSyncSeq();
      var postToken = guestbookToken();
      apiPost(entry).then(function (res) {
        if (res.ok && res.list) {
          // A second signature may have been issued while this one was in flight,
          // here or in another tab. Its list supersedes this one regardless of
          // which response arrives first, so drop this list; this entry is still
          // pending and survives to be confirmed by the next sync.
          if (!isLatestSync(postSeq, postToken)) return;
          // Merge so any earlier local-only entry survives the shared list replacing
          // local storage (the just-signed entry is already in res.list).
          var merged = applyServerList(res.list, postToken);
          if (!merged) return;                             // another tab wrote while we reconciled
          paintEntries(listEl, countEl, merged);
        } else if (res.reason === 'rate_limited') {
          status.textContent = res.retryAfter
            ? 'Saved locally! The shared guestbook is busy — try again in ' + res.retryAfter + 's. \u23F3'
            : 'Saved locally! The shared guestbook is busy — try again shortly. \u23F3';
        } else if (res.reason === 'failed') {
          status.textContent = 'Saved to this browser \u2014 the shared guestbook is unavailable right now. \uD83D\uDCBE';
        }
        // res.ok without a list = no shared backend yet: the local save stands and
        // the "Thanks for signing!" message already shown is accurate.
      });
    });

    exportBtn.addEventListener('click', function () {
      exportGuestbook();
      status.textContent = 'Guestbook exported! 💾';
    });
    importBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        importGuestbook(fileInput.files[0], listEl, countEl, status);
      }
      fileInput.value = ''; // allow re-importing the same file
    });

    closeBtn.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

    document.body.appendChild(dlg);
    gcElements.push(dlg);
    guestbookDialog = dlg;
    return dlg;
  }

  function openGuestbook(focusForm) {
    var dlg = buildGuestbookDialog();
    var status = dlg.querySelector('.gc-gb-status');
    if (status) status.textContent = '';
    renderGuestbookEntries(dlg.querySelector('.gc-gb-list'), dlg.querySelector('.gc-gb-count'));
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
    const sites = [
      'https://www.spacejam.com/1996/',
      'https://www.cameronsworld.net/',
      'https://therestartpage.com/',
      'https://zombo.com/',
      'https://www.hamsterdance.org/hamsterdance/',
      'https://www.arngren.net/',
      'https://www.lingscars.com/',
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
          '<button class="gc-midi-btn" title="Play" aria-label="Play" data-gc-action="play-midi">▶</button>' +
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
    // CSP-safe play handler (no inline onclick)
    var play = div.querySelector('[data-gc-action="play-midi"]');
    if (play) {
      play.addEventListener('click', function () {
        alert('🎵 Now playing: canyon.mid\n\nJust kidding — your 28.8k modem can\u0027t handle audio AND graphics!');
      });
    }
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
    var cards = document.querySelectorAll('.project-card');
    // Tag the first 3 cards as "NEW!"
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
    var digits = String(visitorCount).padStart(7, '0').split('');
    div.innerHTML =
      '<span class="gc-counter-label">~ You are visitor number ~</span>' +
      '<div class="gc-digit-display">' +
      digits.map(function(d) {
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

    // Blinking NEW! badges on project cards
    injectNewBadges();

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
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    gcElements.length = 0;
    guestbookDialog = null; // detached with gcElements; rebuild on next enable

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
})();
