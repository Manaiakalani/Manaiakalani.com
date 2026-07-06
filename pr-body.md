## Summary

Implements 10 pre-approved hardening/feature items for the production site.

### Changes

1. **Lighthouse CI performance budgets** — Added `@lhci/cli` devDependency, `lighthouserc.json` config, and a workflow step after Playwright. Scores: performance/best-practices/SEO at `warn >= 0.8-0.9`, accessibility at `error >= 0.9`. Uploads to temporary public storage for report links.

2. **localStorage key namespacing** — Renamed `theme` → `mnk:theme`, `geocities` → `mnk:geocities`, `gh_repos_cache` → `mnk:gh_repos_cache`. One-time migration in `boot.js` copies old→new and removes old keys. All read/write sites updated across `boot.js`, `script.js`, `geocities.js`, and tests.

3. **Mobile touch-target sizing** — Increased `.theme-toggle` and `.geocities-toggle` from 2.6rem/2.2rem to 2.75rem (44px) at all breakpoints for WCAG 2.5.5 compliance.

4. **Expanded Playwright viewport matrix** — Added `narrow` (320x568), `tablet` (768x1024), `laptop` (1024x768), and `wide` (1440x900) projects. Added per-page horizontal overflow tests that run at every viewport.

5. **Missing preconnect hints** — Added `api.github.com` preconnect to `index.html` and `projects.html`. Added `cdn.jsdelivr.net` preconnect to `projects.html` and `404.html`.

6. **GitHub API pagination** — Implemented `Link` header parsing and `rel=next` following in `loadRepos()`. Handles: no Link header (single page), partial page failures (uses what was fetched), preserves existing rate-limit/cache fallback logic.

7. **Web Vitals reporting via Rybbit** — Created `web-vitals-report.js` that dynamically imports `web-vitals@5.3.0` from CDN (no import map change needed) and reports CLS/FCP/INP/LCP/TTFB metrics via `window.rybbit.event()`. Guarded for missing rybbit and CDN failures. Included on all pages as `<script type="module">`.

8. **View Transitions API** — Added `@view-transition { navigation: auto }` for smooth cross-document navigation (Chrome 126+, no-op elsewhere). Added `view-transition-name` on header and footer.

9. **Project search/filter** — Added `<input type="search">` with accessible label on `projects.html`. Debounced (150ms) case-insensitive filtering against repo name, description, and language. Shows empty-state message when no results match. New Playwright tests for filter and restore.

10. **New /uses page** — Created `uses.html` with full site template, JSON-LD structured data (`WebPage` type), placeholder tool/hardware categories (marked with TODO comment), ASCII cube, analytics, and consistent nav. Added `Uses` nav link to all 5 pages. Added to `sitemap.xml` with priority 0.6.

### Cross-cutting changes
- **Cache-busting versions bumped**: `style.css` v4→v5, `boot.js` v2→v3, `script.js` v5→v6, `geocities.js` v2→v3
- **CSP updated**: Added SHA-256 hash for uses.html JSON-LD block, added `cdn.jsdelivr.net` to `connect-src` for web-vitals dynamic import
- **Import map verified**: Byte-identical across all 5 pages — shared hash unchanged
- Blocked `lighthouserc.json` and `compute-hashes.js` from public serving via staticwebapp.config.json routes
