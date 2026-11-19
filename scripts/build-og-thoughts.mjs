#!/usr/bin/env node
// Social cards for each thought: og/thoughts/<slug>.jpg (1200x630).
// Same look as og-thoughts.png: charcoal gradient, dot grid, Doto, coral accent.
//
//   node scripts/build-og-thoughts.mjs           # render missing cards
//   node scripts/build-og-thoughts.mjs --force   # re-render all of them
//
// Dev-only (scripts/* is rewritten to /404.html).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'og', 'thoughts');
const force = process.argv.includes('--force');
const thoughts = JSON.parse(fs.readFileSync(path.join(ROOT, 'thoughts.json'), 'utf8'));
// Inline the font: setContent pages can't load file:// URLs.
const font = 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', 'doto-latin.woff2')).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function card(t) {
  const size = t.title.length > 30 ? 66 : t.title.length > 20 ? 78 : 92;
  return `<!doctype html><html><head><style>
@font-face { font-family: Doto; src: url("${font}") format("woff2"); font-weight: 100 900; }
html, body { margin: 0; width: 1200px; height: 630px; }
body {
  box-sizing: border-box; padding: 84px 90px; display: flex; flex-direction: column;
  font-family: Doto, ui-monospace, monospace; color: #f2f2f2;
  background:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0) 0 0 / 24px 24px,
    radial-gradient(900px 500px at 92% 0%, rgba(214, 102, 82, .22), transparent 70%),
    radial-gradient(700px 420px at 0% 100%, rgba(40, 90, 140, .25), transparent 70%),
    #121218;
}
.site { display: flex; align-items: center; gap: 16px; font-size: 28px; color: #9aa3b2; font-weight: 600; letter-spacing: .02em; }
.dot { width: 18px; height: 18px; border-radius: 4px; background: #e2604f; box-shadow: 0 0 18px rgba(226,96,79,.7); }
.grow { flex: 1; }
.bar { width: 88px; height: 6px; border-radius: 3px; background: #e2604f; margin-bottom: 34px; }
h1 { margin: 0 0 30px; font-size: ${size}px; line-height: 1.08; font-weight: 800; letter-spacing: -.01em; max-width: 1020px; }
.meta { font-size: 34px; font-weight: 700; color: #e2604f; }
.meta span { color: #9aa3b2; }
</style></head><body>
<div class="site"><div class="dot"></div>manaiakalani.com</div>
<div class="grow"></div>
<div class="bar"></div>
<h1>${esc(t.title)}</h1>
<div class="meta">Thoughts · ${t.date.replace(/-/g, '.')} <span>· Maximilian Stein</span></div>
</body></html>`;
}

fs.mkdirSync(OUT, { recursive: true });
const todo = thoughts.filter((t) => force || !fs.existsSync(path.join(OUT, t.slug + '.jpg')));
if (!todo.length) {
  console.log('og cards already current');
  process.exit(0);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const t of todo) {
  await page.setContent(card(t), { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.load('800 40px Doto'); await document.fonts.ready; });
  await page.screenshot({ path: path.join(OUT, t.slug + '.jpg'), type: 'jpeg', quality: 86 });
  console.log('rendered og/thoughts/' + t.slug + '.jpg');
}
await browser.close();
