// Thought permalinks, related links, the Now page stamp, self-hosted vendor code
// and speculation-rules prefetch.
const { test, expect } = require('@playwright/test');
const thoughts = require('../thoughts.json');

test.beforeEach(async ({ page }) => {
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
});

const onlyOnce = (info) => test.skip(!['desktop', 'mobile'].includes(info.project.name), 'content checks run on desktop + mobile');

test('every thought has its own page with title, canonical, social card and pager', async ({ page, request }, info) => {
  onlyOnce(info);
  for (const [i, t] of thoughts.entries()) {
    await page.goto('/thoughts/' + t.slug);
    await expect(page.locator('h1')).toHaveText(t.title);
    await expect(page).toHaveTitle(t.title + ' | Maximilian Stein');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://manaiakalani.com/thoughts/' + t.slug);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toBe('https://manaiakalani.com/og/thoughts/' + t.slug + '.jpg');
    const res = await request.get('/og/thoughts/' + t.slug + '.jpg');
    expect(res.status(), t.slug + ' og card').toBe(200);
    await expect(page.locator('.thought-pager a')).toHaveCount((i > 0) + (i < thoughts.length - 1));
    await expect(page.locator('.site-nav a[href="/thoughts"]')).toHaveAttribute('aria-current', 'page');
  }
});

test('thought page: back link, related links and no list-page controls', async ({ page }, info) => {
  onlyOnce(info);
  await page.goto('/thoughts/old-art-new-doors');
  await expect(page.locator('.thought-back a')).toHaveAttribute('href', '/thoughts');
  await expect(page.locator('.thought-related a')).toHaveAttribute('href', 'https://github.com/Manaiakalani/sans-comic');
  await expect(page.locator('#thought-search')).toHaveCount(0);
  await expect(page.locator('.thought-date')).toContainText('min read');
  // Shell assets resolve from a nested path.
  const css = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(css.length).toBeGreaterThan(0);
  await expect(page.locator('header .site-nav')).toBeVisible();
});

test('thoughts list links each entry to its page and related projects', async ({ page }, info) => {
  onlyOnce(info);
  await page.goto('/thoughts');
  const first = page.locator('.thought-entry').first();
  await expect(first.locator('.thought-permalink a')).toHaveAttribute('href', '/thoughts/' + thoughts[0].slug);
  await expect(first).toHaveAttribute('data-permalink', '/thoughts/' + thoughts[0].slug);
  await expect(page.locator('.thought-related')).toHaveCount(thoughts.filter(t => t.related).length);
});

test('now page shows when it was last updated and this month', async ({ page }, info) => {
  onlyOnce(info);
  await page.goto('/now');
  await expect(page.locator('.now-updated time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
  await expect(page.locator('#this-month li')).not.toHaveCount(0);
});

test('footer cube loads three.js from this origin, never a CDN', async ({ page }, info) => {
  onlyOnce(info);
  const cdn = [];
  page.on('request', r => { if (/cdn\.jsdelivr\.net|unpkg\.com/.test(r.url())) cdn.push(r.url()); });
  const vendor = page.waitForRequest(r => r.url().includes('/vendor/three@0.170.0/build/three.module.min.js'));
  await page.goto('/now');
  await page.locator('.cube-wrapper').scrollIntoViewIfNeeded();
  await vendor;
  await page.waitForTimeout(500);
  expect(cdn).toEqual([]);
});

test('pages declare speculation-rules prefetch', async ({ page }, info) => {
  onlyOnce(info);
  for (const p of ['/', '/thoughts', '/thoughts/' + thoughts[0].slug]) {
    await page.goto(p);
    const rules = await page.locator('script[type="speculationrules"]').textContent();
    expect(JSON.parse(rules).prefetch[0].eagerness).toBe('moderate');
  }
});
