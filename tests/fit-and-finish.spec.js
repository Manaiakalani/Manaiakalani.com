const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/', title: 'Maximilian Stein', name: 'index' },
  { path: '/projects.html', title: 'Projects — Maximilian Stein', name: 'projects' },
  { path: '/thoughts.html', title: 'Thoughts — Maximilian Stein', name: 'thoughts' },
];

// ── Page loads & titles ──
for (const pg of PAGES) {
  test(`${pg.name}: loads with correct title`, async ({ page }) => {
    const res = await page.goto(pg.path);
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(pg.title);
  });
}

// ── Navigation ──
test('nav links are present and correct on all pages', async ({ page }) => {
  for (const pg of PAGES) {
    await page.goto(pg.path);
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a[href="index.html"]')).toBeVisible();
    await expect(nav.locator('a[href="projects.html"]')).toBeVisible();
    await expect(nav.locator('a[href="thoughts.html"]')).toBeVisible();
  }
});

// ── Index page specifics ──
test('index: hero section with Aloha greeting', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('header');
  await expect(hero).toBeVisible();
  // Check for "Aloha" somewhere on the page
  await expect(page.locator('text=Aloha')).toBeVisible();
});

test('index: about section exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#about')).toBeVisible();
});

test('index: featured projects teaser exists', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.project-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

test('index: footer with ASCII cube canvas exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.locator('#ascii-cube')).toBeVisible();
});

// ── Projects page ──
test('projects: has project cards', async ({ page }) => {
  await page.goto('/projects.html');
  const cards = page.locator('.project-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(5);
});

test('projects: cards have title and description', async ({ page }) => {
  await page.goto('/projects.html');
  const firstCard = page.locator('.project-card').first();
  await expect(firstCard.locator('h3')).toBeVisible();
  await expect(firstCard.locator('p')).toBeVisible();
});

test('projects: GitHub link is visible', async ({ page }) => {
  await page.goto('/projects.html');
  const ghLink = page.locator('a.github-link');
  await expect(ghLink).toBeVisible();
});

// ── Thoughts page ──
test('thoughts: has thought entries', async ({ page }) => {
  await page.goto('/thoughts.html');
  const entries = page.locator('.thought-entry');
  const count = await entries.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

// ── Theme toggle ──
test('theme toggle switches dark/light', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  await expect(toggle).toBeVisible();

  // Get initial theme
  const initial = await page.locator('html').getAttribute('data-theme');

  // Click toggle
  await toggle.click();
  const after = await page.locator('html').getAttribute('data-theme');
  expect(after).not.toBe(initial);
});

// ── GeoCities toggle ──
test('geocities toggle activates retro mode', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.geocities-toggle');
  await expect(toggle).toBeVisible();

  // Activate
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-geocities', 'true');

  // Check injected elements appear
  await expect(page.locator('.gc-construction-banner')).toBeVisible();
  await expect(page.locator('.gc-flames-bar').first()).toBeVisible();
});

test('geocities toggle deactivates cleanly', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.geocities-toggle');

  // Activate then deactivate
  await toggle.click();
  await expect(page.locator('.gc-construction-banner')).toBeVisible();
  await toggle.click({ force: true });

  // Elements should be removed
  await expect(page.locator('.gc-construction-banner')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-geocities', 'true');
});

// ── No dead Umami scripts ──
test('no dead analytics scripts on any page', async ({ page }) => {
  for (const pg of PAGES) {
    await page.goto(pg.path);
    const html = await page.content();
    expect(html).not.toContain('analytics.manaiakalani.info');
  }
});

// ── No console errors ──
for (const pg of PAGES) {
  test(`${pg.name}: no console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(pg.path, { waitUntil: 'networkidle' });
    // Filter out known third-party noise (e.g. font loading, favicon)
    const real = errors.filter(e =>
      !e.includes('favicon') && !e.includes('fonts.googleapis') &&
      !e.includes('WebGL') && !e.includes('THREE.')
    );
    expect(real).toEqual([]);
  });
}

// ── No broken images ──
for (const pg of PAGES) {
  test(`${pg.name}: no broken images`, async ({ page }) => {
    await page.goto(pg.path, { waitUntil: 'networkidle' });
    const images = await page.locator('img').all();
    for (const img of images) {
      const nat = await img.evaluate(el => el.naturalWidth);
      const src = await img.getAttribute('src');
      expect(nat, `broken image: ${src}`).toBeGreaterThan(0);
    }
  });
}

// ── Responsive: nav doesn't overflow on mobile ──
test('mobile: no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewWidth + 5); // small tolerance
});

// ── Links don't 404 ──
test('internal links resolve (no 404s)', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('nav a').evaluateAll(els =>
    els.map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('http'))
  );
  for (const href of hrefs) {
    const res = await page.goto(`/${href}`);
    expect(res.status(), `${href} returned ${res.status()}`).toBe(200);
  }
});

// ── Meta tags ──
test('index: has meta description', async ({ page }) => {
  await page.goto('/');
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  expect(desc).toBeTruthy();
  expect(desc.length).toBeGreaterThan(20);
});

// ── Font loading ──
test('index: Doto font is loaded', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const fontLoaded = await page.evaluate(() =>
    document.fonts.check('16px "Doto"')
  );
  expect(fontLoaded).toBe(true);
});
