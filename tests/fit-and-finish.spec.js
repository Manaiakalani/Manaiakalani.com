const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/', title: 'Maximilian Stein', name: 'index' },
  { path: '/projects.html', title: 'Projects — Maximilian Stein', name: 'projects' },
  { path: '/thoughts.html', title: 'Thoughts — Maximilian Stein', name: 'thoughts' },
];

// Block the analytics domain — its SSL cert is broken and hangs the load event in CI
// Mock GitHub API to avoid rate limits and make tests deterministic
const MOCK_REPOS = [
  { name: 'project-alpha', description: 'A test project', language: 'TypeScript', html_url: 'https://github.com/test/alpha', fork: false },
  { name: 'project-beta', description: 'Another project', language: 'Python', html_url: 'https://github.com/test/beta', fork: false },
  { name: 'project-gamma', description: 'Third project', language: 'JavaScript', html_url: 'https://github.com/test/gamma', fork: false },
  { name: 'project-delta', description: 'Fourth project', language: 'Go', html_url: 'https://github.com/test/delta', fork: false },
  { name: 'project-epsilon', description: 'Fifth project', language: 'Rust', html_url: 'https://github.com/test/epsilon', fork: false },
  { name: 'project-zeta', description: 'Sixth project', language: 'HTML', html_url: 'https://github.com/test/zeta', fork: false },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/users/*/repos*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REPOS) })
  );
  // Clear localStorage cache to ensure mock data is used
  await page.addInitScript(() => {
    try { localStorage.removeItem('gh_repos_cache'); } catch (e) {}
  });
});

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
    await expect(nav.locator('a[href="/"]')).toBeVisible();
    await expect(nav.locator('a[href="projects.html"]')).toBeVisible();
    await expect(nav.locator('a[href="thoughts.html"]')).toBeVisible();
  }
});

// ── Index page specifics ──
test('index: hero section with Aloha greeting', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('header');
  await expect(hero).toBeVisible();
  await expect(page.locator('text=Aloha')).toBeVisible();
});

test('index: about section exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#about')).toBeVisible();
});

test('index: featured projects teaser exists', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.featured-teaser .project-card', { timeout: 10000 });
  const cards = page.locator('.featured-teaser .project-card');
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
  await page.waitForSelector('.project-card', { timeout: 10000 });
  const cards = page.locator('.project-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

test('projects: cards have title and description', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  const firstCard = page.locator('.project-card').first();
  await expect(firstCard.locator('h2')).toBeVisible();
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
test('theme toggle switches dark/light and updates aria-pressed', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  await expect(toggle).toBeVisible();

  const initial = await page.locator('html').getAttribute('data-theme');
  const initialPressed = await toggle.getAttribute('aria-pressed');

  await toggle.click();
  const after = await page.locator('html').getAttribute('data-theme');
  expect(after).not.toBe(initial);

  const afterPressed = await toggle.getAttribute('aria-pressed');
  expect(afterPressed).not.toBe(initialPressed);
});

// ── GeoCities toggle ──
test('geocities toggle activates retro mode', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.geocities-toggle');
  await expect(toggle).toBeVisible();

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-geocities', 'true');
  await expect(page.locator('.gc-construction-banner')).toBeVisible();
  await expect(page.locator('.gc-flames-bar').first()).toBeVisible();
});

test('geocities toggle deactivates cleanly', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.geocities-toggle');

  await toggle.click();
  await expect(page.locator('.gc-construction-banner')).toBeVisible();
  await toggle.click({ force: true });

  await expect(page.locator('.gc-construction-banner')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-geocities', 'true');
});

// ── Analytics script ──
test('index: analytics script is present and configured correctly', async ({ page }) => {
  await page.goto('/');
  const analyticsScript = page.locator(
    'script[src="https://analytics.manaiakalani.info/api/script.js"]'
  );

  await expect(analyticsScript).toHaveCount(1);
  await expect(analyticsScript).toHaveAttribute(
    'src',
    'https://analytics.manaiakalani.info/api/script.js'
  );
  await expect(analyticsScript).toHaveAttribute('defer', '');
  await expect(analyticsScript).toHaveAttribute('data-site-id', 'c24b6c864956');
});

// ── No console errors ──
for (const pg of PAGES) {
  test(`${pg.name}: no console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
    const real = errors.filter(e =>
      !e.includes('favicon') && !e.includes('fonts.googleapis') &&
      !e.includes('WebGL') && !e.includes('THREE.') &&
      !e.includes('ERR_CERT') && !e.includes('analytics') &&
      !e.includes('Failed to load resource')
    );
    expect(real).toEqual([]);
  });
}

// ── No broken images ──
for (const pg of PAGES) {
  test(`${pg.name}: no broken images`, async ({ page }) => {
    await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
    const images = await page.locator('img').all();
    for (const img of images) {
      const nat = await img.evaluate(el => el.naturalWidth);
      const src = await img.getAttribute('src');
      expect(nat, `broken image: ${src}`).toBeGreaterThan(0);
    }
  });
}

// ── Responsive: no horizontal overflow ──
test('no horizontal overflow on narrow viewport', async ({ page }) => {
  await page.goto('/');
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewWidth + 5);
});

// ── Links don't 404 ──
test('internal links resolve (no 404s)', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('nav a').evaluateAll(els =>
    els.map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('http'))
  );
  for (const href of hrefs) {
    const url = href.startsWith('/') ? href : `/${href}`;
    const res = await page.goto(url);
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

// ── 404 page ──
test('404: shows custom 404 page', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist-at-all');
  expect(res.status()).toBe(404);
  await expect(page.locator('.glitch-code')).toBeVisible();
  await expect(page.locator('.glitch-code')).toHaveText('404');
  await expect(page.locator('.home-btn')).toBeVisible();
});

test('404: table flip easter egg works', async ({ page }) => {
  await page.goto('/nope-404');
  const egg = page.locator('#egg');
  await expect(egg).toContainText('╯︵ ┻━┻');
  await egg.click();
  await expect(egg).toContainText('┬─┬');
});

test('404: nav links present', async ({ page }) => {
  await page.goto('/nope-404');
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.locator('nav a[href="/"]')).toBeVisible();
});

test('404: shows attempted path', async ({ page }) => {
  await page.goto('/some/fake/path');
  await expect(page.locator('#path-display')).toContainText('/some/fake/path');
});

// ── Font loading ──
test('index: Doto font is loaded', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const fontLoaded = await page.evaluate(() =>
    document.fonts.check('16px "Doto"')
  );
  expect(fontLoaded).toBe(true);
});

// ── Accessibility: aria-current on active nav ──
test('active nav link has aria-current="page"', async ({ page }) => {
  await page.goto('/');
  const activeLink = page.locator('nav a.active');
  await expect(activeLink).toHaveAttribute('aria-current', 'page');
});

// ── Accessibility: heading hierarchy ──
test('subpages have correct h1 for page title', async ({ page }) => {
  await page.goto('/projects.html');
  const h1 = page.locator('h1');
  await expect(h1).toBeVisible();
  await expect(h1).toContainText('Projects');
});

// ── Accessibility: theme toggle has aria-pressed ──
test('theme toggle has aria-pressed attribute', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  const pressed = await toggle.getAttribute('aria-pressed');
  expect(['true', 'false']).toContain(pressed);
});

// ── Projects: skeleton loading shows then replaces ──
test('projects: skeleton cards are replaced by real content', async ({ page }) => {
  await page.goto('/projects.html');
  // Wait for real project cards to appear
  await page.waitForSelector('.project-card', { timeout: 10000 });
  // Skeleton cards should be gone
  const skeletons = await page.locator('.skeleton-card').count();
  expect(skeletons).toBe(0);
});

// ── Projects: fallback on API failure ──
test('projects: shows fallback when GitHub API fails', async ({ page }) => {
  // Override the mock with an abort to simulate failure
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/**', route => route.abort());
  await page.addInitScript(() => {
    try { localStorage.removeItem('gh_repos_cache'); } catch (e) {}
  });
  await page.goto('/projects.html');
  await page.waitForSelector('.projects-fallback', { timeout: 10000 });
  const fallback = page.locator('.projects-fallback');
  await expect(fallback).toBeVisible();
});

// ── Structured data ──
test('index: has JSON-LD structured data', async ({ page }) => {
  await page.goto('/');
  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  const data = JSON.parse(content);
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe('Maximilian Stein');
});

test('projects: has JSON-LD structured data', async ({ page }) => {
  await page.goto('/projects.html');
  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  const data = JSON.parse(content);
  expect(data['@type']).toBe('CollectionPage');
});
