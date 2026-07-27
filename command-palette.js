/*
 * Command palette (⌘K / Ctrl-K)
 * Keyboard- and touch-driven launcher for pages and actions.
 * Self-contained: injects its own trigger button and <dialog>, reuses the
 * page's existing theme / retro toggles so behaviour stays in one place.
 * No inline scripts or styles (CSP-safe); progressive enhancement — if the
 * native <dialog> API is unavailable the feature simply does nothing.
 */
(function () {
    'use strict';

    var doc = document;
    var probe = doc.createElement('dialog');
    if (typeof probe.showModal !== 'function') return; // graceful no-op on old browsers

    var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
    var modLabel = isMac ? '\u2318' : 'Ctrl';

    // ---- Command set -------------------------------------------------------
    var commands = [];
    function add(cmd) { commands.push(cmd); }

    function go(path) { window.location.href = path; }

    add({ icon: '\uD83C\uDFE0', title: 'About', hint: 'Page', keys: 'home index start bio intro', run: function () { go('/'); } });
    add({ icon: '\uD83D\uDDC2\uFE0F', title: 'Projects', hint: 'Page', keys: 'work repos code github', run: function () { go('/projects.html'); } });
    add({ icon: '\uD83D\uDCAD', title: 'Thoughts', hint: 'Page', keys: 'blog posts writing notes', run: function () { go('/thoughts.html'); } });
    add({ icon: '\uD83D\uDEE0\uFE0F', title: 'Uses', hint: 'Page', keys: 'gear setup tools stack hardware', run: function () { go('/uses.html'); } });

    var themeBtn = doc.querySelector('.theme-toggle');
    if (themeBtn) add({ icon: '\uD83C\uDF17', title: 'Toggle light / dark theme', hint: 'Action', keys: 'dark light mode colour appearance', run: function () { themeBtn.click(); } });

    var retroBtn = doc.querySelector('.geocities-toggle');
    if (retroBtn) add({ icon: '\uD83D\uDD79\uFE0F', title: 'Toggle retro mode', hint: 'Action', keys: 'geocities 90s nostalgia web1 old', run: function () { retroBtn.click(); } });

    add({ icon: '\uD83D\uDD17', title: 'Copy link to this page', hint: 'Action', keys: 'url share clipboard permalink', run: copyPageLink });

    var randThought = doc.getElementById('random-thought-btn');
    add({ icon: '\uD83C\uDFB2', title: 'Random thought', hint: randThought ? 'Action' : 'Thoughts', keys: 'shuffle surprise lucky', run: function () { randThought ? randThought.click() : go('/thoughts.html'); } });

    var randProject = doc.getElementById('random-project-btn');
    add({ icon: '\uD83C\uDFB2', title: 'Random project', hint: randProject ? 'Action' : 'Projects', keys: 'shuffle surprise lucky repo', run: function () { randProject ? randProject.click() : go('/projects.html'); } });

    add({ icon: '\uD83D\uDCE1', title: 'Subscribe via RSS', hint: 'Feed', keys: 'feed rss atom follow updates', run: function () { go('/feed.xml'); } });

    var ghLink = doc.querySelector('a[href*="github.com"]');
    var ghHref = ghLink ? ghLink.href : 'https://github.com/manaiakalani';
    add({ icon: '\uD83D\uDC19', title: 'Open GitHub profile', hint: 'External', keys: 'github source code repos', run: function () { window.open(ghHref, '_blank', 'noopener'); } });

    function copyPageLink() {
        var url = window.location.href;
        function fallback() {
            var ta = doc.createElement('textarea');
            ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
            doc.body.appendChild(ta); ta.select();
            try { doc.execCommand('copy'); } catch (e) { /* ignore */ }
            doc.body.removeChild(ta);
        }
        // Try the async Clipboard API, but fall back to execCommand when it is
        // unavailable or rejected (e.g. a restrictive Permissions-Policy).
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).catch(fallback);
        } else {
            fallback();
        }
    }

    // ---- Fuzzy matching ----------------------------------------------------
    function subseq(q, text) {
        var pos = [], ti = 0;
        for (var qi = 0; qi < q.length; qi++) {
            var found = -1;
            for (; ti < text.length; ti++) {
                if (text[ti] === q[qi]) { found = ti; ti++; break; }
            }
            if (found === -1) return null;
            pos.push(found);
        }
        return pos;
    }

    function evaluate(cmd, q) {
        if (!q) return { ok: true, score: 0, marks: null };
        var title = cmd.title.toLowerCase();
        var tpos = subseq(q, title);
        if (tpos) {
            var span = tpos[tpos.length - 1] - tpos[0];
            return { ok: true, score: 1000 - tpos[0] * 4 - span, marks: tpos };
        }
        var hay = (cmd.title + ' ' + cmd.hint + ' ' + cmd.keys).toLowerCase();
        var hpos = subseq(q, hay);
        if (hpos) return { ok: true, score: 200 - hpos[0], marks: null };
        return { ok: false };
    }

    function esc(s) {
        return s.replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function highlight(title, marks) {
        if (!marks || !marks.length) return esc(title);
        var set = {}; marks.forEach(function (p) { set[p] = true; });
        var out = '';
        for (var i = 0; i < title.length; i++) {
            var ch = esc(title[i]);
            out += set[i] ? '<mark>' + ch + '</mark>' : ch;
        }
        return out;
    }

    // ---- DOM ---------------------------------------------------------------
    var dialog = doc.createElement('dialog');
    dialog.className = 'cmdk';
    dialog.id = 'cmdk-dialog';
    dialog.setAttribute('aria-label', 'Command menu');
    dialog.innerHTML =
        '<div class="cmdk__box">' +
            '<div class="cmdk__search">' +
                '<span class="cmdk__search-icon" aria-hidden="true">\uD83D\uDD0D</span>' +
                '<input type="text" class="cmdk__input" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" placeholder="Search pages and actions\u2026" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search pages and actions" />' +
            '</div>' +
            '<ul class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Commands"></ul>' +
            '<p class="cmdk__empty" hidden>No matches. Try &ldquo;theme&rdquo; or &ldquo;projects&rdquo;.</p>' +
            '<div class="cmdk__foot">' +
                '<span><kbd>\u2191</kbd><kbd>\u2193</kbd> navigate</span>' +
                '<span><kbd>\u21B5</kbd> select</span>' +
                '<span><kbd>esc</kbd> close</span>' +
            '</div>' +
        '</div>';
    doc.body.appendChild(dialog);

    var input = dialog.querySelector('.cmdk__input');
    var list = dialog.querySelector('.cmdk__list');
    var empty = dialog.querySelector('.cmdk__empty');

    var results = [];   // current filtered command objects
    var activeIdx = 0;

    function render() {
        var q = input.value.toLowerCase().replace(/\s+/g, '');
        var scored = [];
        commands.forEach(function (cmd) {
            var r = evaluate(cmd, q);
            if (r.ok) scored.push({ cmd: cmd, score: r.score, marks: r.marks });
        });
        scored.sort(function (a, b) { return b.score - a.score; });
        results = scored;
        list.innerHTML = '';
        empty.hidden = scored.length !== 0;
        scored.forEach(function (item, i) {
            var li = doc.createElement('li');
            li.className = 'cmdk__item';
            li.id = 'cmdk-opt-' + i;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');
            li.innerHTML =
                '<span class="cmdk__icon" aria-hidden="true">' + item.cmd.icon + '</span>' +
                '<span class="cmdk__label">' + highlight(item.cmd.title, item.marks) + '</span>' +
                '<span class="cmdk__tag">' + esc(item.cmd.hint) + '</span>';
            li.addEventListener('click', function () { runIndex(i); });
            li.addEventListener('pointermove', function () { setActive(i); });
            list.appendChild(li);
        });
        setActive(0);
    }

    function setActive(i) {
        if (!results.length) { input.removeAttribute('aria-activedescendant'); return; }
        activeIdx = (i + results.length) % results.length;
        var items = list.children;
        for (var n = 0; n < items.length; n++) {
            var on = n === activeIdx;
            items[n].classList.toggle('is-active', on);
            items[n].setAttribute('aria-selected', on ? 'true' : 'false');
        }
        input.setAttribute('aria-activedescendant', 'cmdk-opt-' + activeIdx);
        var el = items[activeIdx];
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }

    function runIndex(i) {
        var item = results[i];
        if (!item) return;
        // Execute within the originating user gesture (Clipboard API and
        // window.open require transient activation), then close the dialog.
        try { item.cmd.run(); } finally { close(); }
    }

    function open(prefill) {
        if (dialog.open) { input.focus(); return; } // idempotent: showModal() twice throws
        input.value = prefill || '';
        render();
        dialog.showModal();
        doc.documentElement.classList.add('cmdk-open');
        launcher.setAttribute('aria-expanded', 'true');
        input.focus();
    }

    function close() {
        if (dialog.open) dialog.close();
    }

    function toggle() { dialog.open ? close() : open(); }

    dialog.addEventListener('close', function () {
        doc.documentElement.classList.remove('cmdk-open');
        launcher.setAttribute('aria-expanded', 'false');
    });

    // Click on the backdrop (the dialog element itself, outside the box) closes.
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) close();
    });

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); runIndex(activeIdx); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
        else if (e.key === 'End') { e.preventDefault(); setActive(results.length - 1); }
    });

    // ---- Global triggers ---------------------------------------------------
    function isTyping(el) {
        if (!el) return false;
        var tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    doc.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            toggle();
        } else if (!dialog.open && e.key === '?' && !isTyping(e.target)) {
            e.preventDefault();
            open();
        }
    });

    // ---- Launcher button (discoverable trigger for touch users) ------------
    var launcher = doc.createElement('button');
    launcher.type = 'button';
    launcher.className = 'cmdk-launcher';
    launcher.setAttribute('aria-label', 'Open command menu (' + modLabel + ' K)');
    launcher.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'cmdk-dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.title = 'Command menu (' + modLabel + 'K)';
    launcher.innerHTML = '<svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 512 512" fill="currentColor"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>';
    launcher.addEventListener('click', function () { open(); });
    var header = doc.querySelector('header') || doc.body;
    header.appendChild(launcher);
})();
