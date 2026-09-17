/*
 * Shared guestbook data layer — modern wall + GeoCities dialog.
 * CSP-safe, no inline handlers. Degrades to localStorage when /api/guestbook
 * is missing, matching the "no fake numbers" rule.
 */
(function () {
    'use strict';

    var GB_KEY = 'mnk:guestbook';
    var GB_API = '/api/guestbook';
    var GB_SEED = [
        { name: 'CoolDude99', message: 'Great site dude!!!', date: 'Aug 12, 1998' },
        { name: 'xX_ShadowWolf_Xx', message: 'awesome page, check out mine!', date: 'Sep 03, 1998' },
        { name: 'SurfGirl2000', message: 'LoVe ThE fLaMeS!!1!', date: 'Oct 21, 1998' },
        { name: 'WebMaster_Joe', message: 'Nice HTML skills!', date: 'Nov 15, 1998' }
    ];
    var syncSeq = 0;

    function sanitizeEntries(arr) {
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
            if (e.pending === true) rec.pending = true;
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
        } catch (e) { /* fall through */ }
        saveGuestbook(GB_SEED);
        return GB_SEED.slice();
    }

    function saveGuestbook(entries) {
        try { localStorage.setItem(GB_KEY, JSON.stringify(entries)); } catch (e) { /* ignore */ }
    }

    function guestbookToday() {
        return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    }

    function newEntryId() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        } catch (e) { /* fall through */ }
        return ('e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 36);
    }

    function nextSyncSeq() { return ++syncSeq; }

    function guestbookToken() {
        try { return localStorage.getItem(GB_KEY); } catch (e) { return null; }
    }

    function isLatestSync(seq, token) {
        return seq === syncSeq && guestbookToken() === token;
    }

    function readServerList(data) {
        if (data && (data.backend === 'unconfigured' || data.backend === 'error')) return null;
        var arr = Array.isArray(data) ? data : (data && Array.isArray(data.entries) ? data.entries : null);
        if (!arr) return null;
        return sanitizeEntries(arr);
    }

    function apiGet() {
        if (typeof fetch !== 'function') return Promise.resolve(null);
        return fetch(GB_API, { headers: { Accept: 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { return readServerList(d); })
            .catch(function () { return null; });
    }

    function apiPost(entry) {
        if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: 'failed' });
        return fetch(GB_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
                    if (d && d.backend === 'unconfigured') return { ok: true };
                    return { ok: false, reason: 'failed' };
                }, function () { return { ok: false, reason: 'failed' }; });
            })
            .catch(function () { return { ok: false, reason: 'failed' }; });
    }

    function classNames(listEl) {
        var retro = listEl && listEl.classList.contains('gc-gb-list');
        return retro
            ? { entry: 'gc-gb-entry', who: 'gc-gb-who', when: 'gc-gb-when', msg: 'gc-gb-msg' }
            : { entry: 'gb-entry', who: 'gb-who', when: 'gb-when', msg: 'gb-msg' };
    }

    function paintEntries(listEl, countEl, entries) {
        if (!listEl) return;
        listEl.textContent = '';
        if (countEl) {
            countEl.textContent = entries.length
                ? (entries.length === 1 ? '1 signature' : entries.length + ' signatures')
                : 'No signatures yet.';
            if (listEl.classList.contains('gc-gb-list')) {
                countEl.textContent = '~ ' + entries.length + (entries.length === 1 ? ' soul has' : ' souls have') + ' signed ~';
            }
        }
        var cls = classNames(listEl);
        entries.forEach(function (entry) {
            var li = document.createElement('li');
            li.className = cls.entry;
            var who = document.createElement('div');
            who.className = cls.who;
            who.textContent = entry.name;
            var when = document.createElement('span');
            when.className = cls.when;
            when.textContent = entry.date ? ' — ' + entry.date : '';
            who.appendChild(when);
            var msg = document.createElement('div');
            msg.className = cls.msg;
            msg.textContent = entry.message;
            li.appendChild(who);
            li.appendChild(msg);
            listEl.appendChild(li);
        });
    }

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

    function reconcileEntries(server, local) {
        var onServerId = Object.create(null);
        server.forEach(function (e) { if (e.id) onServerId[e.id] = true; });
        var pending = local.filter(function (e) {
            return e.pending === true && e.id && !onServerId[e.id];
        });
        return mergeEntries(pending, server);
    }

    function applyServerList(server, expectedToken) {
        var merged = reconcileEntries(server, loadGuestbook());
        if (guestbookToken() !== expectedToken) return null;
        saveGuestbook(merged);
        return merged;
    }

    function renderGuestbookEntries(listEl, countEl) {
        paintEntries(listEl, countEl, loadGuestbook());
        var seq = nextSyncSeq();
        var token = guestbookToken();
        apiGet().then(function (server) {
            if (!server) return;
            if (!isLatestSync(seq, token)) return;
            var merged = applyServerList(server, token);
            if (!merged) return;
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
                if (status) status.textContent = 'That file isn’t valid guestbook JSON.';
                return;
            }
            if (!incoming.length) {
                if (status) status.textContent = 'No valid entries in that file.';
                return;
            }
            var pendingIncoming = incoming.map(function (e) {
                return { name: e.name, message: e.message, date: e.date, id: e.id || newEntryId(), pending: true };
            });
            nextSyncSeq();
            var merged = mergeEntries(pendingIncoming, loadGuestbook());
            saveGuestbook(merged);
            paintEntries(listEl, countEl, merged);
            if (listEl) listEl.scrollTop = 0;
            if (status) status.textContent = 'Imported ' + incoming.length + ' entr' + (incoming.length === 1 ? 'y' : 'ies') + '!';
        };
        reader.onerror = function () { if (status) status.textContent = 'Could not read that file.'; };
        reader.readAsText(file);
    }

    function bindForm(form, listEl, countEl, status) {
        if (!form || form.dataset.bound === 'true') return;
        form.dataset.bound = 'true';
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = form.elements['name'].value.trim();
            var message = form.elements['message'].value.trim();
            if (!name || !message) {
                if (status) status.textContent = 'Please fill in both fields.';
                return;
            }
            var id = newEntryId();
            var entry = { name: name.slice(0, 40), message: message.slice(0, 200), date: guestbookToday(), id: id };
            var entries = loadGuestbook();
            entries.unshift({ name: entry.name, message: entry.message, date: entry.date, id: id, pending: true });
            if (entries.length > 100) entries.length = 100;
            saveGuestbook(entries);
            form.reset();
            if (status) status.textContent = 'Thanks for signing.';
            paintEntries(listEl, countEl, entries);
            if (listEl) listEl.scrollTop = 0;
            var postSeq = nextSyncSeq();
            var postToken = guestbookToken();
            apiPost(entry).then(function (res) {
                if (res.ok && res.list) {
                    if (!isLatestSync(postSeq, postToken)) return;
                    var merged = applyServerList(res.list, postToken);
                    if (!merged) return;
                    paintEntries(listEl, countEl, merged);
                } else if (res.reason === 'rate_limited') {
                    if (status) {
                        status.textContent = res.retryAfter
                            ? 'Saved locally. The shared book is busy — try again in ' + res.retryAfter + 's.'
                            : 'Saved locally. The shared book is busy — try again shortly.';
                    }
                } else if (res.reason === 'failed') {
                    if (status) status.textContent = 'Saved in this browser — the shared book is unavailable right now.';
                }
            });
        });
    }

    function mountWall() {
        var listEl = document.getElementById('gb-list');
        if (!listEl) return;
        var countEl = document.getElementById('gb-count');
        var form = document.getElementById('gb-form');
        var status = document.getElementById('gb-status');
        var exportBtn = document.getElementById('gb-export');
        var importBtn = document.getElementById('gb-import');
        var fileInput = document.getElementById('gb-file');
        bindForm(form, listEl, countEl, status);
        if (exportBtn) exportBtn.addEventListener('click', function () {
            exportGuestbook();
            if (status) status.textContent = 'Guestbook exported.';
        });
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', function () {
                if (fileInput.files && fileInput.files[0]) {
                    importGuestbook(fileInput.files[0], listEl, countEl, status);
                }
                fileInput.value = '';
            });
        }
        renderGuestbookEntries(listEl, countEl);
        if (window.location.hash === '#sign' && form) {
            var nameInput = form.querySelector('input[name="name"]');
            if (nameInput) nameInput.focus();
        }
    }

    window.mnkGuestbook = {
        sanitizeEntries: sanitizeEntries,
        load: loadGuestbook,
        save: saveGuestbook,
        today: guestbookToday,
        newEntryId: newEntryId,
        apiGet: apiGet,
        apiPost: apiPost,
        nextSyncSeq: nextSyncSeq,
        token: guestbookToken,
        isLatestSync: isLatestSync,
        mergeEntries: mergeEntries,
        applyServerList: applyServerList,
        paintEntries: paintEntries,
        render: renderGuestbookEntries,
        exportBook: exportGuestbook,
        importBook: importGuestbook,
        bindForm: bindForm
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountWall, { once: true });
    } else {
        mountWall();
    }
})();
