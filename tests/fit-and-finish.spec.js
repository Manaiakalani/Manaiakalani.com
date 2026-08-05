const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/', title: 'Maximilian Stein', name: 'index' },
  { path: '/projects.html', title: 'Projects — Maximilian Stein', name: 'projects' },
  { path: '/thoughts.html', title: 'Thoughts — Maximilian Stein', name: 'thoughts' },
  { path: '/uses.html', title: 'Uses — Maximilian Stein', name: 'uses' },
];

// Block the analytics domain — its SSL cert is broken and hangs the load event in CI
// Mock GitHub API to avoid rate limits and make tests deterministic
// pushed_at/stargazers_count are staggered so sort order (impact/recent/name) and the
// "currently building" widget (most recent pushed_at) are all independently deterministic.
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = n => new Date(NOW - n * DAY).toISOString();
const MOCK_REPOS = [
  { name: 'project-alpha', description: 'A test project', language: 'TypeScript', html_url: 'https://github.com/test/alpha', fork: false, stargazers_count: 10, forks_count: 2, pushed_at: daysAgo(5) },
  { name: 'project-beta', description: 'Another project', language: 'Python', html_url: 'https://github.com/test/beta', fork: false, stargazers_count: 3, forks_count: 1, pushed_at: daysAgo(10) },
  { name: 'project-gamma', description: 'Third project', language: 'JavaScript', html_url: 'https://github.com/test/gamma', fork: false, stargazers_count: 1, forks_count: 0, pushed_at: daysAgo(1) },
  { name: 'project-delta', description: 'Fourth project', language: 'Go', html_url: 'https://github.com/test/delta', fork: false, stargazers_count: 50, forks_count: 5, pushed_at: daysAgo(20) },
  { name: 'project-epsilon', description: 'Fifth project', language: 'Rust', html_url: 'https://github.com/test/epsilon', fork: false, stargazers_count: 0, forks_count: 0, pushed_at: daysAgo(15) },
  { name: 'project-zeta', description: 'Sixth project', language: 'HTML', html_url: 'https://github.com/test/zeta', fork: false, stargazers_count: 0, forks_count: 0, pushed_at: daysAgo(30) },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/users/*/repos*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REPOS) })
  );
  // Block web-vitals CDN to avoid external dependency in tests
  await page.route('**/cdn.jsdelivr.net/npm/web-vitals**', route => route.abort());
  // Clear localStorage cache to ensure mock data is used
  await page.addInitScript(() => {
    try { localStorage.removeItem('mnk:gh_repos_cache'); } catch (e) {}
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
    await expect(nav.locator('a[href="projects.html"], a[href="/projects.html"]')).toBeVisible();
    await expect(nav.locator('a[href="thoughts.html"], a[href="/thoughts.html"]')).toBeVisible();
    await expect(nav.locator('a[href="uses.html"], a[href="/uses.html"]')).toBeVisible();
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

// ── Currently building widget ──
test('index: currently building widget shows most recently active project', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#currently-building .building-card', { timeout: 10000 });
  await expect(page.locator('.currently-building-teaser')).toBeVisible();
  // project-gamma has the most recent pushed_at in the mock data
  await expect(page.locator('#currently-building .building-card h3')).toHaveText('project-gamma');
  await expect(page.locator('#currently-building .skeleton-card')).toHaveCount(0);
});

test('index: currently building widget hides when GitHub API fails', async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/**', route => route.abort());
  await page.route('**/cdn.jsdelivr.net/npm/web-vitals**', route => route.abort());
  await page.addInitScript(() => {
    try { localStorage.removeItem('mnk:gh_repos_cache'); } catch (e) {}
  });
  await page.goto('/');
  await page.waitForSelector('.featured-teaser .projects-fallback', { timeout: 10000 });
  await expect(page.locator('.currently-building-teaser')).toBeHidden();
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

// ── Projects: search/filter ──
test('projects: search filters visible cards', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  const search = page.locator('#project-search');
  await expect(search).toBeVisible();

  // Type a query that matches one mock repo
  await search.fill('alpha');
  await page.waitForTimeout(300); // debounce
  const filtered = await page.locator('.project-card').count();
  expect(filtered).toBe(1);

  // Clear restores all
  await search.fill('');
  await page.waitForTimeout(300);
  const restored = await page.locator('.project-card').count();
  expect(restored).toBeGreaterThanOrEqual(3);
});

test('projects: search shows no-results message', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  await page.locator('#project-search').fill('zzz-no-match-zzz');
  await page.waitForTimeout(300);
  await expect(page.locator('.projects-fallback')).toBeVisible();
});

// ── Projects: sort control ──
test('projects: sort control reorders cards by impact, recency, and name', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  const sortSelect = page.locator('#project-sort');
  await expect(sortSelect).toBeVisible();

  // Default sort is "impact" — most stars first (project-delta has the most in mock data)
  await expect(page.locator('.project-card h2').first()).toHaveText('project-delta');

  await sortSelect.selectOption('recent');
  await page.waitForTimeout(200);
  await expect(page.locator('.project-card h2').first()).toHaveText('project-gamma');

  await sortSelect.selectOption('name');
  await page.waitForTimeout(200);
  await expect(page.locator('.project-card h2').first()).toHaveText('project-alpha');
});

test('projects: sort note only shows for the impact sort', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  const note = page.locator('#projects-sort-note');
  await expect(note).toBeVisible();

  await page.locator('#project-sort').selectOption('recent');
  await page.waitForTimeout(200);
  await expect(note).toBeHidden();

  await page.locator('#project-sort').selectOption('impact');
  await page.waitForTimeout(200);
  await expect(note).toBeVisible();
});

// ── Thoughts page ──
test('thoughts: has thought entries', async ({ page }) => {
  await page.goto('/thoughts.html');
  const entries = page.locator('.thought-entry');
  const count = await entries.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

test('thoughts: reading time is shown for each entry', async ({ page }) => {
  await page.goto('/thoughts.html');
  const dateEl = page.locator('.thought-entry .thought-date').first();
  await expect(dateEl).toContainText('min read');
});

test('thoughts: search filters entries and shows no-results message', async ({ page }) => {
  await page.goto('/thoughts.html');
  const search = page.locator('#thought-search');
  await expect(search).toBeVisible();

  await search.fill('GeoCities');
  await page.waitForTimeout(300);
  const visibleEntries = await page.locator('.thought-entry:visible').count();
  expect(visibleEntries).toBe(1);

  await search.fill('zzz-no-match-zzz');
  await page.waitForTimeout(300);
  await expect(page.locator('#thoughts-no-results')).toBeVisible();

  await search.fill('');
  await page.waitForTimeout(300);
  const restored = await page.locator('.thought-entry:visible').count();
  expect(restored).toBeGreaterThanOrEqual(10);
});

test('thoughts: jump-to-entry nav lists all entries and navigates', async ({ page }) => {
  await page.goto('/thoughts.html');
  const jumpNav = page.locator('#thoughts-jump-nav');
  await expect(jumpNav).toBeVisible();
  const optionCount = await jumpNav.locator('option').count();
  expect(optionCount).toBe(11); // 10 entries + the "Jump to an entry…" placeholder

  await jumpNav.selectOption('the-clippy-philosophy');
  await expect(page).toHaveURL(/#the-clippy-philosophy$/);
  await expect(page.locator('#the-clippy-philosophy')).toBeFocused();
});

test('thoughts: random thought button jumps to a valid entry', async ({ page }) => {
  await page.goto('/thoughts.html');
  const btn = page.locator('#random-thought-btn');
  await expect(btn).toBeVisible();
  await btn.click();
  await page.waitForTimeout(100);
  const hash = await page.evaluate(() => window.location.hash.slice(1));
  expect(hash.length).toBeGreaterThan(0);
  await expect(page.locator('.thought-entry#' + hash)).toBeFocused();
});

test('thoughts: copy-link button copies the entry URL to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/thoughts.html');
  const firstEntry = page.locator('.thought-entry').first();
  const entryId = await firstEntry.getAttribute('id');
  const copyBtn = firstEntry.locator('.copy-link-btn');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(copyBtn).toHaveClass(/copied/);
  const clipText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipText).toContain('#' + entryId);
});

// ── Uses page ──
test('uses: hero heading is visible', async ({ page }) => {
  await page.goto('/uses.html');
  const h1 = page.locator('h1');
  await expect(h1).toBeVisible();
  await expect(h1).toContainText('Uses');
});

test('uses: has content sections', async ({ page }) => {
  await page.goto('/uses.html');
  const sections = page.locator('.uses-section');
  const count = await sections.count();
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

// ── Web Vitals script ──
test('index: web-vitals script tag is present', async ({ page }) => {
  await page.goto('/');
  const wvScript = page.locator('script[type="module"][src*="web-vitals-report"]');
  await expect(wvScript).toHaveCount(1);
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
      !e.includes('Failed to load resource') && !e.includes('web-vitals')
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

// Also test overflow on all pages at current viewport
for (const pg of PAGES) {
  test(`${pg.name}: no horizontal overflow`, async ({ page }) => {
    await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewWidth + 5);
  });
}

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
  await page.route('**/cdn.jsdelivr.net/npm/web-vitals**', route => route.abort());
  await page.addInitScript(() => {
    try { localStorage.removeItem('mnk:gh_repos_cache'); } catch (e) {}
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
  const blocks = await jsonLd.allTextContents();
  expect(blocks.length).toBeGreaterThanOrEqual(1);
  const data = blocks.map(b => JSON.parse(b));
  const types = data.map(d => d['@type']);
  expect(types).toContain('Person');
  const person = data.find(d => d['@type'] === 'Person');
  expect(person.name).toBe('Maximilian Stein');
  expect(types).toContain('WebSite');
});

test('projects: has JSON-LD structured data', async ({ page }) => {
  await page.goto('/projects.html');
  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  const data = JSON.parse(content);
  expect(data['@type']).toBe('CollectionPage');
});

test('uses: has JSON-LD structured data', async ({ page }) => {
  await page.goto('/uses.html');
  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  const data = JSON.parse(content);
  expect(data['@type']).toBe('WebPage');
});

// ── Accessibility: skip-link target is focusable ──
const A11Y_PAGES = ['/', '/projects.html', '/thoughts.html', '/uses.html', '/404.html'];
for (const path of A11Y_PAGES) {
  test(`${path}: <main> is focusable so the skip link lands`, async ({ page }) => {
    await page.goto(path);
    const main = page.locator('main#main');
    await expect(main).toHaveAttribute('tabindex', '-1');
    // Programmatic focus should stick on the main element itself.
    await main.evaluate(el => el.focus());
    const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(focusedId).toBe('main');
  });
}

// ── Accessibility: live regions announce dynamic state ──
test('index: projects status live region exists and is polite', async ({ page }) => {
  await page.goto('/');
  const region = page.locator('#projects-status');
  await expect(region).toHaveCount(1);
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await expect(region).toHaveAttribute('role', 'status');
});

test('thoughts: status live region exists and announces filtered count', async ({ page }) => {
  await page.goto('/thoughts.html');
  const region = page.locator('#thoughts-status');
  await expect(region).toHaveCount(1);
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await page.locator('#thought-search').fill('zzz-no-match-zzz');
  await page.waitForTimeout(300);
  await expect(region).toHaveText(/No thoughts match/i);
});

test('projects: live region announces result count on search', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  await page.locator('#project-search').fill('alpha');
  await page.waitForTimeout(300);
  await expect(page.locator('#projects-status')).toHaveText(/1 project found/i);
});

test('index: projects status live region is announced after featured load', async ({ page }) => {
  await page.goto('/');
  // Wait for the featured grid to render real cards, then the live region must not be empty.
  await page.waitForSelector('#featured-projects .project-card', { timeout: 10000 });
  await expect(page.locator('#projects-status')).toHaveText(/featured project/i);
});

// ── Projects: valid-but-empty API response uses a consistent empty state ──
test('projects: empty GitHub response shows a consistent empty state (not a loading/error message)', async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/cdn.jsdelivr.net/npm/web-vitals**', route => route.abort());
  await page.route('**/api.github.com/users/*/repos*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.addInitScript(() => { try { localStorage.removeItem('mnk:gh_repos_cache'); } catch (e) {} });
  await page.goto('/projects.html');
  await page.waitForSelector('.projects-fallback', { timeout: 10000 });
  await expect(page.locator('.projects-fallback')).toContainText(/No public projects/i);
  // Visible message and the screen-reader announcement must agree (no "loading"/"failed" mismatch).
  await expect(page.locator('#projects-status')).toHaveText(/No public projects/i);
  await expect(page.locator('.projects-fallback')).not.toContainText(/loading/i);
});

// ── No-JS: dynamic skeleton loaders are hidden so they don't spin forever ──
for (const { path, sel } of [
  { path: '/projects.html', sel: '#all-projects' },
  { path: '/', sel: '#featured-projects' },
]) {
  test(`${path}: <noscript> hides the dynamic loader (${sel})`, async ({ page }) => {
    // page.content() serialises the DOM including the (inert-with-JS) <noscript> text,
    // so we can assert the no-JS hide rule ships without needing a JS-disabled context.
    await page.goto(path);
    const html = await page.content();
    const noscriptBlocks = html.match(/<noscript>[\s\S]*?<\/noscript>/gi) || [];
    const joined = noscriptBlocks.join('\n');
    expect(joined).toContain(sel);
    expect(joined).toMatch(/display:\s*none/i);
  });
}

// ── GeoCities assets are referenced root-relative so retro mode works on deep 404 URLs ──
test('boot.js references GeoCities assets root-relative', async ({ page }) => {
  const res = await page.request.get('/boot.js');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('"/geocities.css?v=6"');
  expect(body).toContain('"/geocities.js?v=15"');
});

// ── Accessibility: aria-busy is cleared once content loads ──
test('projects: grid clears aria-busy after cards render', async ({ page }) => {
  await page.goto('/projects.html');
  await page.waitForSelector('.project-card', { timeout: 10000 });
  await expect(page.locator('#all-projects')).toHaveAttribute('aria-busy', 'false');
});

// ── Analytics coverage on every page ──
for (const path of ['/projects.html', '/thoughts.html', '/404.html']) {
  test(`${path}: analytics script is present`, async ({ page }) => {
    await page.goto(path);
    const analytics = page.locator('script[src="https://analytics.manaiakalani.info/api/script.js"]');
    await expect(analytics).toHaveCount(1);
    await expect(analytics).toHaveAttribute('data-site-id', 'c24b6c864956');
  });
}

// ── GeoCities retro mode: CSP-safe handlers (no inline onclick / javascript: URLs) ──
test('geocities: guestbook opens a real persistent dialog and saves entries (CSP-safe)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.geocities-toggle').click();
  await expect(page.locator('.gc-bottom-links')).toBeVisible();

  await page.locator('[data-gc-action="sign-guestbook"]').click();
  const dlg = page.locator('.gc-guestbook-dialog');
  await expect(dlg).toBeVisible();

  await dlg.locator('input[name="name"]').fill('TestVisitor');
  await dlg.locator('textarea[name="message"]').fill('hello from the suite');
  await dlg.locator('.gc-gb-sign').click();

  const first = dlg.locator('.gc-gb-entry').first();
  await expect(first).toContainText('TestVisitor');
  await expect(first).toContainText('hello from the suite');

  // Persists to localStorage under the namespaced key.
  const saved = await page.evaluate(() => localStorage.getItem('mnk:guestbook'));
  expect(saved).toContain('TestVisitor');
});

// ── Round 9: the shared guestbook reconcile must not lose confirmed entries ──
// A GET issued before a signature is accepted can resolve *after* the POST has
// been confirmed. The confirmed entry is no longer marked pending, so replaying
// that stale (and legitimately empty) shared list would reconcile it straight
// back out of local storage. A sync generation counter discards the late GET.
test('geocities: a slow GET cannot roll back a signature the backend already confirmed', async ({ page }) => {
  await page.addInitScript(() => {
    try { navigator.serviceWorker.register = () => Promise.reject(new Error('sw blocked in test')); } catch (e) {}
  });

  let releaseGet;
  const getHeld = new Promise(resolve => { releaseGet = resolve; });

  await page.route('**/api/guestbook', async route => {
    if (route.request().method() === 'POST') {
      // The backend accepted the signature and echoes the authoritative list.
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [{ name: body.name, message: body.message, date: '2026 Aug 05', id: body.id }]
        })
      });
    }
    // The GET is a configured backend that is still empty, held open until after
    // the POST has been confirmed.
    await getHeld;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [] })
    });
  });

  await page.goto('/');
  await page.locator('.geocities-toggle').click();
  await page.locator('[data-gc-action="sign-guestbook"]').click();
  const dlg = page.locator('.gc-guestbook-dialog');
  await expect(dlg).toBeVisible();

  await dlg.locator('input[name="name"]').fill('RaceVisitor');
  await dlg.locator('textarea[name="message"]').fill('confirmed before the slow GET landed');
  await dlg.locator('.gc-gb-sign').click();

  // Wait for the POST to be applied (the entry is rendered from the server list).
  await expect(dlg.locator('.gc-gb-entry').first()).toContainText('RaceVisitor');

  // Now let the stale GET resolve; it must be discarded, not replayed.
  releaseGet();
  await page.waitForTimeout(500);

  await expect(dlg.locator('.gc-gb-entry').first()).toContainText('RaceVisitor');
  const saved = await page.evaluate(() => localStorage.getItem('mnk:guestbook'));
  expect(saved).toContain('RaceVisitor');
});

// An empty list from a *configured* backend is authoritative — the shared book is
// genuinely empty, so the 1998 seed entries must clear. An `unconfigured` backend
// also answers with `entries: []`, and that one must leave local entries alone.
test('geocities: an empty configured backend clears seed entries, but unconfigured does not', async ({ page }) => {
  await page.addInitScript(() => {
    try { navigator.serviceWorker.register = () => Promise.reject(new Error('sw blocked in test')); } catch (e) {}
  });

  // 1. Configured but empty → authoritative, seeds clear.
  await page.route('**/api/guestbook', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [] }) })
  );
  await page.goto('/');
  await page.locator('.geocities-toggle').click();
  await page.locator('[data-gc-action="sign-guestbook"]').click();
  await expect(page.locator('.gc-guestbook-dialog')).toBeVisible();
  await expect.poll(
    () => page.locator('.gc-guestbook-dialog .gc-gb-entry').count(),
    { timeout: 5000 }
  ).toBe(0);

  // 2. Unconfigured → not authoritative, the local seed entries stay.
  await page.unroute('**/api/guestbook');
  await page.route('**/api/guestbook', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [], backend: 'unconfigured' })
    })
  );
  await page.evaluate(() => { try { localStorage.removeItem('mnk:guestbook'); } catch (e) {} });
  await page.goto('/');
  await page.locator('[data-gc-action="sign-guestbook"]').click();
  const dlg2 = page.locator('.gc-guestbook-dialog');
  await expect(dlg2).toBeVisible();
  await page.waitForTimeout(500);
  expect(await dlg2.locator('.gc-gb-entry').count()).toBeGreaterThan(0);
});

test('geocities: no inline event handlers or javascript: URLs in retro DOM', async ({ page }) => {
  await page.goto('/');
  await page.locator('.geocities-toggle').click();
  await expect(page.locator('.gc-construction-banner')).toBeVisible();
  const violations = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[class^="gc-"], [class*=" gc-"]'));
    let inlineHandlers = 0;
    let jsUrls = 0;
    nodes.forEach(el => {
      for (const attr of el.attributes) {
        if (/^on/i.test(attr.name)) inlineHandlers++;
      }
      if (el.tagName === 'A' && (el.getAttribute('href') || '').trim().toLowerCase().startsWith('javascript:')) jsUrls++;
    });
    return { inlineHandlers, jsUrls };
  });
  expect(violations.inlineHandlers).toBe(0);
  expect(violations.jsUrls).toBe(0);
});

// ── PWA manifest declares real icon sizes ──
test('manifest.json declares accurate icon sizes', async ({ page }) => {
  const res = await page.request.get('/manifest.json');
  expect(res.status()).toBe(200);
  const manifest = await res.json();
  const sizes = manifest.icons.map(i => i.sizes);
  expect(sizes).toContain('180x180');
  expect(sizes).toContain('32x32');
  // The old manifest lied about a non-existent 512x512 icon — guard against regressing.
  expect(sizes).not.toContain('512x512');
});

// ── Command palette (⌘K / Ctrl-K) ──
test('command palette: opens with Ctrl+K and lists page + action commands', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cmdk-launcher')).toBeVisible();
  await page.keyboard.press('Control+KeyK');
  const dlg = page.locator('.cmdk');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.cmdk__label', { hasText: 'Projects' })).toBeVisible();
  await expect(dlg.locator('.cmdk__label', { hasText: 'Toggle light / dark theme' })).toBeVisible();
});

test('command palette: filtering then Enter runs the active command', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cmdk-launcher').click();
  const dlg = page.locator('.cmdk');
  await expect(dlg).toBeVisible();
  await page.locator('.cmdk__input').fill('projects');
  await expect(dlg.locator('.cmdk__item').first()).toContainText('Projects');
  await page.keyboard.press('Enter');
  // `serve` strips the .html extension (clean URLs); Azure SWA keeps it.
  await expect(page).toHaveURL(/\/projects(\.html)?$/);
});

test('command palette: launcher is present on every page', async ({ page }) => {
  for (const pg of PAGES) {
    await page.goto(pg.path);
    await expect(page.locator('.cmdk-launcher')).toBeVisible();
  }
});

// ── Prefetch on intent ──
test('prefetch: hovering an internal link injects a document prefetch hint', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('nav a[href="projects.html"], nav a[href="/projects.html"]').first();
  await link.hover();
  await expect.poll(() => page.locator('head link[rel="prefetch"]').count()).toBeGreaterThan(0);
  const hrefs = await page.locator('head link[rel="prefetch"]').evaluateAll(els => els.map(e => e.getAttribute('href')));
  expect(hrefs.join(' ')).toContain('projects');
});

// ── Service worker registration ──
test('service worker: registers and activates for offline support', async ({ page }) => {
  await page.goto('/');
  const state = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no-sw-api';
    const timeout = new Promise(res => setTimeout(() => res('timeout'), 8000));
    const ready = navigator.serviceWorker.ready.then(reg => (reg && reg.active) ? 'active' : 'no-active');
    return Promise.race([ready, timeout]);
  });
  expect(state).toBe('active');
});

// ── Cross-document view transitions opt-in ──
test('view transitions: cross-document navigation opt-in is present', async ({ page }) => {
  const res = await page.request.get('/style.css');
  expect(res.status()).toBe(200);
  const css = await res.text();
  expect(css).toMatch(/@view-transition\s*\{\s*navigation:\s*auto/);
});

// ── Per-thought permalink arrival highlight ──
test('thoughts: arriving via a permalink highlights the target entry', async ({ page }) => {
  await page.goto('/thoughts.html');
  const id = await page.locator('.thought-entry[id]').first().getAttribute('id');
  expect(id).toBeTruthy();
  await page.goto('/thoughts.html#' + id);
  await expect(page.locator('#' + id)).toHaveClass(/thought-entry--highlight/);
});

test('thoughts: every entry has a copy-link button', async ({ page }) => {
  await page.goto('/thoughts.html');
  const entries = await page.locator('.thought-entry[id]').count();
  const buttons = await page.locator('.thought-entry .copy-link-btn').count();
  expect(entries).toBeGreaterThan(0);
  expect(buttons).toBe(entries);
});

// ── Round 5: palette content search (search.json) ──
test('search index: search.json is served with thoughts, uses, and about entries', async ({ page }) => {
  const res = await page.request.get('/search.json');
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(Array.isArray(data.items)).toBe(true);
  const kinds = new Set(data.items.map(i => i.s));
  expect(kinds.has('Thought')).toBe(true);
  expect(kinds.has('Uses')).toBe(true);
  expect(kinds.has('About')).toBe(true);
  // Content deep-links to permalinks / section anchors.
  expect(data.items.find(i => i.s === 'Thought').u).toMatch(/\/thoughts\.html#/);
  expect(data.items.find(i => i.s === 'Uses').u).toMatch(/\/uses\.html#/);
});

test('uses: each section has a deep-link anchor id', async ({ page }) => {
  await page.goto('/uses.html');
  const ids = await page.locator('.uses-section[id]').evaluateAll(els => els.map(e => e.id));
  expect(ids).toEqual(expect.arrayContaining([
    'editor-terminal', 'hardware', 'productivity', 'development', 'creative-media', 'homelab-self-hosting'
  ]));
});

test('command palette: content search surfaces page text under a group and navigates to a permalink', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cmdk-launcher').click();
  const dlg = page.locator('.cmdk');
  await expect(dlg).toBeVisible();
  await page.locator('.cmdk__input').fill('geocities');
  // The content group appears once search.json has loaded (fetched on first open).
  await expect(dlg.locator('.cmdk__group')).toContainText('From your pages');
  const contentItem = dlg.locator('.cmdk__item', { hasText: 'GeoCities Mode Exists' });
  await expect(contentItem).toBeVisible();
  await contentItem.click();
  await expect(page).toHaveURL(/thoughts(\.html)?#/);
});

test('command palette: content results are gated to queries of 2+ characters', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cmdk-launcher').click();
  const dlg = page.locator('.cmdk');
  await expect(dlg).toBeVisible();
  await page.locator('.cmdk__input').fill('ge');
  await expect(dlg.locator('.cmdk__group')).toBeVisible();   // 2 chars → content shows
  await page.locator('.cmdk__input').fill('g');
  await expect(dlg.locator('.cmdk__group')).toHaveCount(0);   // 1 char → content hidden
});

// ── Round 5: Web Share command (feature-detected) ──
test('command palette: Web Share command is offered when supported and invokes navigator.share', async ({ page }) => {
  await page.addInitScript(() => {
    window.__shared = null;
    navigator.share = (data) => { window.__shared = data; return Promise.resolve(); };
  });
  await page.goto('/');
  await page.locator('.cmdk-launcher').click();
  const dlg = page.locator('.cmdk');
  await expect(dlg).toBeVisible();
  await page.locator('.cmdk__input').fill('share');
  const shareItem = dlg.locator('.cmdk__item', { hasText: 'Share this page' });
  await expect(shareItem).toBeVisible();
  await shareItem.click();
  const shared = await page.evaluate(() => window.__shared);
  expect(shared).toBeTruthy();
  expect(typeof shared.url).toBe('string');
});

// ── Round 5: guestbook export / import ──
test('geocities: guestbook exposes export/import tools and import restores entries', async ({ page }) => {
  await page.goto('/');
  await page.locator('.geocities-toggle').click();
  await page.locator('[data-gc-action="sign-guestbook"]').click();
  const dlg = page.locator('.gc-guestbook-dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('[data-gc-gb="export"]')).toBeVisible();
  await expect(dlg.locator('[data-gc-gb="import"]')).toBeVisible();
  // Importing a crafted backup prepends its entries (client degrades to localStorage; no API locally).
  const payload = JSON.stringify([{ name: 'ImportedPal', message: 'restored from backup', date: 'Jan 01, 2000' }]);
  await dlg.locator('.gc-gb-file').setInputFiles({ name: 'guestbook.json', mimeType: 'application/json', buffer: Buffer.from(payload) });
  await expect(dlg.locator('.gc-gb-entry').first()).toContainText('ImportedPal');
  await expect(dlg.locator('.gc-gb-status')).toContainText('Imported');
});

// ── Round 5: deploy config for the shared backend + Web Share ──
test('config: web-share is allowed, api runtime is pinned, and the api build is wired', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const cfg = fs.readFileSync(path.join(root, 'staticwebapp.config.json'), 'utf8');
  expect(cfg).toContain('web-share=(self)');
  expect(cfg).toContain('"apiRuntime": "node:20"');
  const wf = fs.readFileSync(path.join(root, '.github', 'workflows', 'azure-static-web-apps-gray-smoke-07ceed71e.yml'), 'utf8');
  expect(wf).toMatch(/api_location:\s*"api"/);
});

// ── Round 6: retro visitor hit counter ──
test('counter: footer counter stays hidden when no backend is configured', async ({ page }) => {
  // Local `serve` returns 404 for /api/*, so the counter must degrade to hidden.
  await page.goto('/');
  const panel = page.locator('.footer-visits');
  await expect(panel).toHaveCount(1);
  await page.waitForTimeout(600); // let the fetch fail and settle
  await expect(panel).toBeHidden();
});

test('counter: reveals an amber odometer with the count when the backend responds', async ({ page }) => {
  // Neutralize the SW so the counter fetch hits the route mock, not the SW's
  // network-first passthrough to the (mock-less) real dev server.
  await page.addInitScript(() => {
    try { navigator.serviceWorker.register = () => Promise.reject(new Error('sw blocked in test')); } catch (e) {}
  });
  await page.route('**/api/counter', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 12483 }) })
  );
  await page.goto('/');
  const panel = page.locator('.footer-visits');
  await expect(panel).toBeVisible();
  const odo = panel.locator('.visits-odometer');
  await expect(odo).toHaveAttribute('aria-label', /12,483 visitors/);
  await expect(panel.locator('.visits-digit')).toHaveCount(6); // fixed-width odometer
  await expect(odo).toContainText('012483');
});

test('counter: increments once per session (POST first visit, GET thereafter)', async ({ page }) => {
  // Neutralize the SW so both navigations reach the route mock deterministically.
  await page.addInitScript(() => {
    try { navigator.serviceWorker.register = () => Promise.reject(new Error('sw blocked in test')); } catch (e) {}
  });
  const methods = [];
  await page.route('**/api/counter', route => {
    methods.push(route.request().method());
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 7 }) });
  });
  await page.goto('/');
  await expect(page.locator('.footer-visits')).toBeVisible();
  await page.goto('/uses.html'); // same tab → sessionStorage guard is set
  await expect(page.locator('.footer-visits')).toBeVisible();
  expect(methods[0]).toBe('POST');
  expect(methods.slice(1)).not.toContain('POST');
});

// ── Round 6: richer per-page social cards ──
const OG_CARDS = [
  { path: '/', img: 'og-home.png', alt: 'Maximilian Stein — Community Strategy Lead' },
  { path: '/thoughts.html', img: 'og-thoughts.png', alt: 'Maximilian Stein — Thoughts' },
  { path: '/uses.html', img: 'og-uses.png', alt: 'Maximilian Stein — Uses' },
  { path: '/projects.html', img: 'og-projects.png', alt: 'Maximilian Stein — Projects' },
];
for (const o of OG_CARDS) {
  test(`${o.path}: ships a per-page social card with dimensions and alt text`, async ({ page }) => {
    await page.goto(o.path);
    const meta = (p) => page.locator(`head meta[property="${p}"]`).getAttribute('content');
    expect(await meta('og:site_name')).toBe('Maximilian Stein');
    expect(await meta('og:image')).toBe(`https://manaiakalani.com/${o.img}`);
    expect(await meta('og:image:width')).toBe('1200');
    expect(await meta('og:image:height')).toBe('630');
    expect(await meta('og:image:alt')).toBe(o.alt);
    expect(await meta('twitter:image')).toBe(`https://manaiakalani.com/${o.img}`);
    expect(await meta('twitter:image:alt')).toBe(o.alt);
  });
}

test('404: carries social card tags and stays noindex', async ({ page }) => {
  await page.goto('/404.html');
  const meta = (sel) => page.locator(`head ${sel}`).getAttribute('content');
  expect(await meta('meta[property="og:image"]')).toContain('/og-home.png');
  expect(await meta('meta[property="og:site_name"]')).toBe('Maximilian Stein');
  expect(await meta('meta[name="robots"]')).toContain('noindex');
});

test('social cards: every per-page OG image is served as a PNG', async ({ page }) => {
  for (const img of ['og-home.png', 'og-thoughts.png', 'og-uses.png', 'og-projects.png']) {
    const res = await page.request.get('/' + img);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

