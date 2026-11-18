#!/usr/bin/env node
/*
 * Pre-render the shared header + footer into every page.
 *
 * components.js stays the single source of truth for the markup: this script
 * evaluates it (plus icons.js) in a sandbox, calls window.mnkChrome.header()
 * / .footer(), inlines the SVG icons, and writes the result between the
 * <header id="site-header"> and #footer-content placeholders, marked
 * data-injected="true" so components.js only binds behaviour at runtime.
 * Result: the chrome paints with the HTML (no CLS, a real <h1> without JS).
 *
 *   node build-chrome.js          # rewrite in place
 *   node build-chrome.js --check  # CI: fail if a page is out of date
 *
 * Run before stamp-assets.js. Dev-only: rewritten to /404.html in
 * staticwebapp.config.json.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const checkMode = process.argv.includes('--check');
const PAGES = [
  'index.html', 'thoughts.html', 'projects.html', 'uses.html', 'colophon.html',
  '404.html', 'guestbook.html', 'now.html'
];

function loadChrome() {
  const noop = () => {};
  const document = {
    readyState: 'complete',
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    documentElement: { getAttribute: () => null }
  };
  const sandbox = { document, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['icons.js', 'components.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  }
  if (!sandbox.mnkChrome || !sandbox.mnkIcon) throw new Error('components.js/icons.js did not expose mnkChrome/mnkIcon');
  const hydrate = (html) =>
    html.replace(/(<span\b[^>]*\bdata-icon="([\w-]+)"[^>]*>)<\/span>/g, (m, open, name) => open + (sandbox.mnkIcon(name) || '') + '</span>');
  return {
    header: (variant) => hydrate(sandbox.mnkChrome.header(variant)),
    footer: () => hydrate(sandbox.mnkChrome.footer())
  };
}

const chrome = loadChrome();
let dirty = 0;

for (const file of PAGES) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  let out = src.replace(
    /<header id="site-header" data-variant="([\w-]+)"[^>]*>[\s\S]*?<\/header>/,
    (m, variant) => '<header id="site-header" data-variant="' + variant + '" data-injected="true">' + chrome.header(variant) + '</header>'
  );
  out = out.replace(
    /(<div class="container" id="footer-content")[^>]*>[\s\S]*?(\s*<\/footer>)/,
    (m, open, close) => open + ' data-injected="true">' + chrome.footer() + '</div>' + close
  );
  if (out === src) continue;
  dirty += 1;
  if (checkMode) {
    console.error('STALE CHROME: ' + file + ' header/footer differ from components.js. Run `node build-chrome.js`.');
  } else {
    fs.writeFileSync(p, out);
    console.log('rendered chrome into ' + file);
  }
}

if (checkMode && dirty) process.exit(1);
if (!checkMode && !dirty) console.log('chrome already current');
