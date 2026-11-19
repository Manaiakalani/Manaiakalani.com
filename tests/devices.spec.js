// Device fit: iPhone Pro Max, iPhone Duo (outer, inner, inner landscape), desktop.
// Guards the UX/spacing pass: iOS input zoom, pre-rendered chrome, the scroll-up
// mini nav, readable measure, and a header that fits short landscape screens.
const { test, expect } = require('@playwright/test');

const MOCK_REPOS = [
  { name: 'project-alpha', description: 'A test project', language: 'TypeScript', html_url: 'https://github.com/test/alpha', fork: false, stargazers_count: 10, forks_count: 2, pushed_at: new Date().toISOString() },
  { name: 'project-beta', description: 'Another project', language: 'Python', html_url: 'https://github.com/test/beta', fork: false, stargazers_count: 3, forks_count: 1, pushed_at: new Date().toISOString() },
  { name: 'project-gamma', description: 'Third project', language: 'JavaScript', html_url: 'https://github.com/test/gamma', fork: false, stargazers_count: 1, forks_count: 0, pushed_at: new Date().toISOString() },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/analytics.manaiakalani.info/**', route => route.abort());
  await page.route('**/api.github.com/users/*/repos*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REPOS) })
  );
  await page.route('**/vendor/web-vitals@*/**', route => route.abort());
  await page.addInitScript(() => {
    try { localStorage.removeItem('mnk:gh_repos_cache'); } catch (e) {}
  });
});

test.describe('single screen', () => {
  for (const [path, sel] of [['/thoughts', '#thought-search'], ['/thoughts', '#thoughts-jump-nav'], ['/projects', '.search-input']]) {
    test(`${path} ${sel}: font-size is >=16px so iOS Safari does not zoom on focus`, async ({ page }) => {
      await page.goto(path);
      const size = await page.locator(sel).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeGreaterThanOrEqual(16);
    });
  }

  test('chrome is pre-rendered: real h1, nav and footer without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('header h1')).toHaveText('MANAIAKALANI');
    await expect(page.locator('.site-nav a')).toHaveCount(4);
    await expect(page.locator('footer .social-icons a')).toHaveCount(6);
    await expect(page.locator('.theme-toggle svg')).toHaveCount(2);
    await ctx.close();
  });

  test('chrome is not injected twice when JS runs over the pre-rendered markup', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header h1')).toHaveCount(1);
    await expect(page.locator('.site-nav')).toHaveCount(1);
    await expect(page.locator('#ascii-cube')).toHaveCount(1);
  });

  test('mini nav slides in on scroll-up past the header, then hides at the top', async ({ page }) => {
    await page.goto('/thoughts');
    const mini = page.locator('.mini-nav');
    await expect(mini).toHaveAttribute('inert', '');
    await expect(mini).not.toHaveClass(/is-shown/);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollBy(0, -200));
    await expect(mini).toHaveClass(/is-shown/);
    await expect(mini).not.toHaveAttribute('inert', '');
    await expect(mini.locator('a[aria-current="page"]')).toHaveAttribute('href', '/thoughts');
    const heights = await mini.locator('a').evaluateAll(els => els.map(a => a.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    const width = await mini.evaluate(el => el.scrollWidth - el.clientWidth);
    expect(width, 'mini nav fits without horizontal scroll').toBeLessThanOrEqual(1);

    await mini.locator('.mini-nav__top').click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(mini).not.toHaveClass(/is-shown/);
  });

  test('header gradient pauses once the header scrolls out of view', async ({ page }) => {
    await page.goto('/thoughts');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('#site-header')).toHaveClass(/is-offscreen/);
    const state = await page.locator('#site-header').evaluate(el => getComputedStyle(el).animationPlayState);
    expect(state).toBe('paused');
  });

  test('about copy and thoughts keep a readable line length', async ({ page }) => {
    await page.goto('/');
    const ch = await page.locator('.about-text p').first().evaluate(el => {
      const probe = document.createElement('span');
      probe.textContent = '0';
      el.appendChild(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      return el.getBoundingClientRect().width / w;
    });
    expect(ch, "about measure (was ~120ch before the 65ch cap)").toBeLessThanOrEqual(70);
    await page.goto('/thoughts');
    const listWidth = await page.locator('.thoughts-list').evaluate(el => el.getBoundingClientRect().width);
    expect(listWidth).toBeLessThanOrEqual(46 * 16 + 1);
  });

  test('featured project cards are h3 under the "Featured Projects" h2', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#featured-projects .project-card h3').first()).toBeVisible();
    await expect(page.locator('#featured-projects .project-card h2')).toHaveCount(0);
  });

  test('handmade-homepages webring is gone everywhere', async ({ page }) => {
    for (const path of ['/', '/now', '/colophon']) {
      await page.goto(path);
      const html = await page.content();
      expect(html).not.toMatch(/cameronsworld|zombo\.com|handmade homepages/i);
    }
  });

  test('footer text links and the fishhook line meet the 44px touch target', async ({ page }) => {
    await page.goto('/');
    const sizes = await page.locator('.footer-links a, .scorpius-trigger').evaluateAll(els =>
      els.map(el => ({ t: el.textContent.trim().slice(0, 20), h: el.getBoundingClientRect().height }))
    );
    expect(sizes.length).toBeGreaterThanOrEqual(7);
    for (const s of sizes) expect(s.h, s.t).toBeGreaterThanOrEqual(44);
  });

  test('footer animation toggle: Cube / Swarm switch, persist, and meet 44px', async ({ page }) => {
    await page.goto('/');
    const sw = page.locator('.viz-switch');
    await sw.scrollIntoViewIfNeeded();
    await expect(sw).toBeVisible();
    await expect(sw.locator('[aria-pressed="true"]')).toHaveText('Cube');
    for (const b of await sw.locator('button').all()) {
      const box = await b.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await sw.getByRole('button', { name: 'Swarm' }).click();
    await expect(sw.locator('[aria-pressed="true"]')).toHaveText('Swarm');
    await expect(page.locator('#ascii-cube')).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem('mnk:footer-viz'))).toBe('swarm');
    await page.reload();
    await expect(page.locator('.viz-switch [aria-pressed="true"]')).toHaveText('Swarm');
  });

  test('footer animation toggle stays hidden without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('.viz-switch')).toBeHidden();
    await ctx.close();
  });

  test('short landscape screens keep the header compact so About starts above the fold', async ({ page }, info) => {
    const vp = page.viewportSize();
    test.skip(!(vp.width > vp.height && vp.height <= 700), 'short landscape only');
    await page.goto('/');
    const h = await page.locator('#site-header').evaluate(el => el.getBoundingClientRect().height);
    expect(h, 'header height').toBeLessThanOrEqual(vp.height * 0.6);
    const about = await page.locator('#about h2').boundingBox();
    expect(about.y).toBeLessThan(vp.height);
  });

  test('header controls clear the wordmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cmdk-launcher')).toBeVisible();
    // Measure the glyphs, not the full-width block: on wide, short screens the
    // corner controls sit beside the wordmark rather than above it.
    const word = await page.locator('header h1').evaluate(el => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const b = r.getBoundingClientRect();
      return { x: b.left, y: b.top, width: b.width, height: b.height };
    });
    for (const sel of ['.theme-toggle', '.geocities-toggle', '.cmdk-launcher']) {
      const b = await page.locator(sel).boundingBox();
      const overlaps = b.x < word.x + word.width - 1 && b.x + b.width > word.x + 1 &&
        b.y < word.y + word.height - 1 && b.y + b.height > word.y + 1;
      expect(overlaps, `${sel} overlaps the wordmark`).toBe(false);
    }
  });
});
