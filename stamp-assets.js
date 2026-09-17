#!/usr/bin/env node
/*
 * Content-hash cache-bust stamper.
 * One source of truth: the file bytes. Writes ?v=<8 hex> onto known assets
 * in HTML/JS so a CSS/JS change cannot ship with a stale query string.
 *
 *   node stamp-assets.js          # rewrite in place
 *   node stamp-assets.js --check  # CI: fail if the tree is unstamped
 *
 * Dev-only: rewritten to /404.html in staticwebapp.config.json.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const checkMode = process.argv.includes('--check');

const ASSETS = [
  'style.css',
  'script.js',
  'boot.js',
  'icons.js',
  'components.js',
  'command-palette.js',
  'geocities.css',
  'geocities.js',
  'guestbook.js',
  'cube-loader.js',
  'cube.js',
  'web-vitals-report.js',
  'clippy.webp'
];

const TARGETS = [
  'index.html', 'thoughts.html', 'projects.html', 'uses.html', 'colophon.html',
  '404.html', 'guestbook.html', 'now.html',
  'boot.js', 'components.js', 'cube-loader.js', 'script.js', 'guestbook.js'
];

function hashFile(name) {
  const buf = fs.readFileSync(path.join(ROOT, name));
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

function currentHashes() {
  const hashes = {};
  for (const name of ASSETS) {
    const p = path.join(ROOT, name);
    if (fs.existsSync(p)) hashes[name] = hashFile(name);
  }
  return hashes;
}

function stamp(source, hashes) {
  let out = source;
  for (const name of Object.keys(hashes)) {
    const v = hashes[name];
    const re = new RegExp(name.replace(/\./g, '\\.') + '\\?v=[^"\'\\s]+', 'g');
    out = out.replace(re, name + '?v=' + v);
  }
  return out;
}

// boot.js/components.js embed hashes of other files; HTML embeds hashes of
// those scripts. Repeat until a pass writes nothing.
let dirty = 0;
let pass = 0;
let changed = true;
while (changed && pass < 6) {
  pass += 1;
  changed = false;
  const hashes = currentHashes();
  for (const file of TARGETS) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const next = stamp(src, hashes);
    if (next === src) continue;
    changed = true;
    dirty += 1;
    if (checkMode) {
      console.error('UNSTAMPED: ' + file + ' still has stale asset query strings. Run `node stamp-assets.js`.');
    } else {
      fs.writeFileSync(p, next);
      console.log('stamped ' + file + ' (pass ' + pass + ')');
    }
  }
  if (checkMode && dirty) break;
}

if (checkMode && dirty) process.exit(1);
if (!checkMode && !dirty) console.log('asset hashes already current');
