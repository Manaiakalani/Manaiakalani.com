const { test, expect } = require('@playwright/test');

const PAGES = ['/', '/projects', '/thoughts', '/uses', '/404.html', '/colophon'];
const TOUCH = 44;

test.beforeEach(async ({ page }) => {
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/cdn.jsdelivr.net/npm/web-vitals**', route => route.abort());
});

function box(locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

function overlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function gap(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  if (dx === 0 && dy === 0) return 0;
  if (dy === 0) return dx;
  if (dx === 0) return dy;
  return Math.hypot(dx, dy);
}

for (const path of PAGES) {
  test(`${path}: no horizontal overflow`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
  });

  test(`${path}: header controls do not overlap and stay ≥8px apart`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.cmdk-launcher')).toBeVisible();
    const geo = await box(page.locator('.geocities-toggle'));
    const cmdk = await box(page.locator('.cmdk-launcher'));
    const theme = await box(page.locator('.theme-toggle'));
    expect(overlap(geo, cmdk), 'geocities overlaps cmdk').toBe(false);
    expect(overlap(geo, theme), 'geocities overlaps theme').toBe(false);
    expect(overlap(cmdk, theme), 'cmdk overlaps theme').toBe(false);
    expect(gap(cmdk, theme)).toBeGreaterThanOrEqual(8);
  });

  test(`${path}: nav links meet 44px touch height`, async ({ page }) => {
    await page.goto(path);
    const sizes = await page.locator('.site-nav a').evaluateAll(els =>
      els.map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim(), w: r.width, h: r.height };
      })
    );
    expect(sizes.length).toBeGreaterThanOrEqual(4);
    for (const s of sizes) {
      expect(s.h, `${s.text} height ${s.h}`).toBeGreaterThanOrEqual(TOUCH);
    }
  });
}

test('active nav grey hugs the label instead of filling the 44px hit box', async ({ page }) => {
  await page.goto('/');
  const metrics = await page.locator('.site-nav a.active').evaluate(el => {
    const r = el.getBoundingClientRect();
    const pill = getComputedStyle(el, '::before');
    return {
      hit: r.height,
      pill: parseFloat(pill.height),
      fill: getComputedStyle(el).backgroundColor,
    };
  });
  expect(metrics.hit).toBeGreaterThanOrEqual(TOUCH);
  expect(metrics.pill).toBeGreaterThan(16);
  expect(metrics.pill).toBeLessThan(metrics.hit);
  expect(metrics.fill).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
});

test('thought titles are left-aligned, not centered via h2 inheritance', async ({ page }) => {
  await page.goto('/thoughts');
  const align = await page.locator('.thought-title').first().evaluate(el => getComputedStyle(el).textAlign);
  expect(align).toBe('left');
});

test('copy-link buttons meet 44px touch target', async ({ page }) => {
  await page.goto('/thoughts');
  const first = page.locator('.copy-link-btn').first();
  await expect(first).toBeVisible();
  const r = await box(first);
  expect(r.w).toBeGreaterThanOrEqual(TOUCH);
  expect(r.h).toBeGreaterThanOrEqual(TOUCH);
});

test('footer social icons meet 44px touch target', async ({ page }) => {
  await page.goto('/');
  await page.locator('.social-icons a').first().waitFor();
  const sizes = await page.locator('.social-icons a').evaluateAll(els =>
    els.map(el => {
      const r = el.getBoundingClientRect();
      return { label: el.getAttribute('aria-label'), w: r.width, h: r.height };
    })
  );
  expect(sizes.length).toBeGreaterThanOrEqual(5);
  for (const s of sizes) {
    expect(s.w, s.label).toBeGreaterThanOrEqual(TOUCH);
    expect(s.h, s.label).toBeGreaterThanOrEqual(TOUCH);
  }
});

test('search and sort controls meet 44px touch height', async ({ page }) => {
  await page.goto('/projects');
  const search = await box(page.locator('#project-search'));
  const sort = await box(page.locator('#project-sort'));
  expect(search.h).toBeGreaterThanOrEqual(TOUCH);
  expect(sort.h).toBeGreaterThanOrEqual(TOUCH);
});

test('projects: sort dropdown is centered under Sort projects', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('label[for="project-sort"]')).toHaveText('Sort projects');
  const toolbar = await box(page.locator('.page-toolbar'));
  const sort = await box(page.locator('#project-sort'));
  const label = await box(page.locator('label[for="project-sort"]'));
  const mid = (el) => el.x + el.w / 2;
  expect(Math.abs(mid(sort) - mid(toolbar))).toBeLessThan(8);
  expect(Math.abs(mid(label) - mid(toolbar))).toBeLessThan(8);
});
