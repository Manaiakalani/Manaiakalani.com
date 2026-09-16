#!/usr/bin/env node
/**
 * Puppeteer spacing / UI audit.
 * Uses puppeteer-core against Playwright's Chromium so CI and local match.
 *
 * Usage: node scripts/puppeteer-spacing-audit.mjs [baseURL]
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:4173';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'spacing-audit');

const PAGES = ['/', '/projects.html', '/thoughts.html', '/uses.html', '/404.html'];
const VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1440, height: 900 },
];

const INTERACTIVE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

async function collect(page, meta) {
  return page.evaluate(({ INTERACTIVE }) => {
    const findings = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const docW = document.documentElement.scrollWidth;
    const docH = document.documentElement.scrollHeight;

    if (docW > vw + 1) {
      findings.push({
        kind: 'overflow-x',
        severity: 'P1',
        detail: `document scrollWidth ${docW} > viewport ${vw}`,
      });
    }

    const header = document.querySelector('header');
    if (header && header.scrollWidth > header.clientWidth + 1) {
      findings.push({
        kind: 'overflow-x',
        severity: 'P1',
        selector: 'header',
        detail: `header scrollWidth ${header.scrollWidth} > clientWidth ${header.clientWidth}`,
      });
    }

    const controls = [...document.querySelectorAll('.geocities-toggle, .cmdk-launcher, .theme-toggle')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { sel: el.className.split(' ')[0], r: { x: r.x, y: r.y, w: r.width, h: r.height } };
      })
      .filter((c) => c.r.w > 0 && c.r.h > 0);

    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i].r;
        const b = controls[j].r;
        const overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
        const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
        const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
        const sep = overlap ? 0 : (dy === 0 ? dx : dx === 0 ? dy : Math.hypot(dx, dy));
        if (overlap) {
          findings.push({
            kind: 'overlap',
            severity: 'P0',
            detail: `${controls[i].sel} overlaps ${controls[j].sel}`,
          });
        } else if (sep < 8) {
          findings.push({
            kind: 'tight-controls',
            severity: 'P1',
            detail: `${controls[i].sel} and ${controls[j].sel} are ${sep.toFixed(1)}px apart (need ≥8px)`,
          });
        }
      }
    }

    const MIN_TARGET = 44;
    const seen = new Set();
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Skip skip-link when off-screen
      if (el.classList.contains('skip-link') && r.bottom <= 0) continue;
      const key = `${el.tagName}.${el.className}:${Math.round(r.x)}:${Math.round(r.y)}:${Math.round(r.w || r.width)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (r.width < MIN_TARGET || r.height < MIN_TARGET) {
        // Inline text links inside running copy are not chrome controls.
        const inCopy = el.closest('p, li, .thought-excerpt, .about-text, .thought-title');
        const isChrome = el.closest('nav, header, footer, .page-toolbar');
        if (inCopy && !isChrome) continue;
        const label = el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40) || el.className;
        findings.push({
          kind: 'touch-target',
          severity: vw <= 768 ? 'P1' : 'P2',
          selector: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''),
          label,
          detail: `${Math.round(r.width)}×${Math.round(r.height)}px (need ${MIN_TARGET}×${MIN_TARGET})`,
        });
      }
    }

    const headings = [...document.querySelectorAll('h1, h2, h3')];
    for (const h of headings) {
      const cs = getComputedStyle(h);
      const mt = parseFloat(cs.marginTop) || 0;
      const mb = parseFloat(cs.marginBottom) || 0;
      const r = h.getBoundingClientRect();
      if (r.width === 0) continue;
      // Skip in-card headings that are first children
      const isCardHeading = h.closest('.project-card, .building-card, .thought-entry');
      if (!isCardHeading && mb > mt + 8 && mt < 8) {
        findings.push({
          kind: 'heading-rhythm',
          severity: 'P2',
          selector: h.tagName.toLowerCase() + (h.className ? '.' + String(h.className).trim().split(/\s+/)[0] : ''),
          text: h.textContent.trim().slice(0, 48),
          detail: `margin-top ${mt}px < margin-bottom ${mb}px (want more space above than below)`,
        });
      }
    }

    const sections = [...document.querySelectorAll('header, main > section, footer, .page-hero, .uses-section, .currently-building-teaser, .featured-teaser, #about')];
    const sectionBoxes = sections.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel: el.id ? `#${el.id}` : el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : el.tagName.toLowerCase(),
        top: r.top + window.scrollY,
        bottom: r.bottom + window.scrollY,
        padT: parseFloat(cs.paddingTop) || 0,
        padB: parseFloat(cs.paddingBottom) || 0,
        height: r.height,
      };
    }).filter((s) => s.height > 0);

    for (let i = 0; i < sectionBoxes.length - 1; i++) {
      const gap = sectionBoxes[i + 1].top - sectionBoxes[i].bottom;
      if (gap < -1) {
        findings.push({
          kind: 'section-overlap',
          severity: 'P1',
          detail: `${sectionBoxes[i].sel} overlaps ${sectionBoxes[i + 1].sel} by ${(-gap).toFixed(1)}px`,
        });
      }
    }

    const about = document.querySelector('.about-text, .page-hero p, .thought-excerpt, .uses-list');
    if (about) {
      const cs = getComputedStyle(about);
      const ch = parseFloat(cs.fontSize) || 16;
      const widthCh = about.getBoundingClientRect().width / ch;
      if (widthCh > 80) {
        findings.push({
          kind: 'measure',
          severity: 'P2',
          selector: about.className ? '.' + String(about.className).trim().split(/\s+/)[0] : about.tagName.toLowerCase(),
          detail: `line measure ~${widthCh.toFixed(0)}ch (prefer 65–75ch)`,
        });
      }
    }

    const nav = document.querySelector('.site-nav');
    if (nav) {
      const r = nav.getBoundingClientRect();
      if (r.bottom > vh && vw <= 375) {
        findings.push({
          kind: 'nav-wrap',
          severity: 'P2',
          detail: `nav extends below first viewport (${r.bottom.toFixed(0)}px > ${vh}px)`,
        });
      }
      const links = [...nav.querySelectorAll('a')].map((a) => a.getBoundingClientRect());
      for (let i = 0; i < links.length - 1; i++) {
        const a = links[i];
        const b = links[i + 1];
        const sameRow = Math.abs(a.top - b.top) < 8;
        if (sameRow) {
          const gap = b.left - a.right;
          if (gap < 4) {
            findings.push({
              kind: 'nav-gap',
              severity: 'P1',
              detail: `nav links ${i} and ${i + 1} are ${gap.toFixed(1)}px apart`,
            });
          }
        }
      }
    }

    // Text that overflows its box
    for (const el of document.querySelectorAll('h1, h2, .brand-text, .header-subtitle, .site-nav a')) {
      if (el.scrollWidth > el.clientWidth + 2) {
        findings.push({
          kind: 'text-overflow',
          severity: 'P1',
          selector: el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : el.tagName.toLowerCase(),
          text: el.textContent.trim().slice(0, 48),
          detail: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
        });
      }
    }

    return {
      vw, vh, docW, docH,
      controls,
      findings,
    };
  }, { INTERACTIVE });
}

function summarize(all) {
  const byKind = {};
  for (const row of all) {
    for (const f of row.findings) {
      const key = `${f.kind}|${f.selector || ''}|${f.label || f.text || f.detail}`;
      if (!byKind[key]) {
        byKind[key] = { ...f, pages: new Set(), viewports: new Set() };
      }
      byKind[key].pages.add(row.page);
      byKind[key].viewports.add(row.viewport);
    }
  }
  return Object.values(byKind).map((f) => ({
    ...f,
    pages: [...f.pages],
    viewports: [...f.viewports],
  })).sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });
}

const browser = await puppeteer.launch({
  executablePath: chromium.executablePath(),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const all = [];
mkdirSync(OUT_DIR, { recursive: true });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('analytics.manaiakalani.info') || url.includes('api.github.com') || url.includes('cdn.jsdelivr.net')) {
      return req.abort();
    }
    return req.continue();
  });

  for (const path of PAGES) {
    const url = BASE.replace(/\/$/, '') + path;
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('header', { timeout: 10000 });
    // Let fonts/layout settle
    await new Promise((r) => setTimeout(r, 250));
    const shotName = `${vp.name}${path.replace(/\W+/g, '_') || '_home'}.png`;
    await page.screenshot({ path: join(OUT_DIR, shotName), fullPage: false });
    const result = await collect(page, { path, vp });
    all.push({
      page: path,
      viewport: vp.name,
      status: res ? res.status() : 0,
      screenshot: shotName,
      ...result,
    });
  }
  await page.close();
}

await browser.close();

const summary = summarize(all);
const report = { base: BASE, generatedAt: new Date().toISOString(), summary, raw: all };
writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

const p0 = summary.filter((f) => f.severity === 'P0');
const p1 = summary.filter((f) => f.severity === 'P1');
const p2 = summary.filter((f) => f.severity === 'P2');

console.log(`Puppeteer spacing audit → ${OUT_DIR}`);
console.log(`P0 ${p0.length}  P1 ${p1.length}  P2 ${p2.length}  total unique ${summary.length}`);
for (const f of summary) {
  console.log(`[${f.severity}] ${f.kind}  ${f.selector || ''}  ${f.label || f.text || ''}  ${f.detail}`);
  console.log(`         pages=${f.pages.join(',')}  viewports=${f.viewports.join(',')}`);
}

if (p0.length) process.exit(2);
