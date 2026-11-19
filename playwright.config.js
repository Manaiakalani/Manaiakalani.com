const { defineConfig } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:4173';
const isLocal = /localhost|127\.0\.0\.1/.test(baseURL);

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
  },
  webServer: isLocal ? {
    command: 'npx serve . -l 4173',
    port: 4173,
    reuseExistingServer: true,
  } : undefined,
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'narrow', use: { viewport: { width: 320, height: 568 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'laptop', use: { viewport: { width: 1024, height: 768 } } },
    { name: 'wide', use: { viewport: { width: 1440, height: 900 } } },
    // iPhone 18 Pro Max class: 440pt wide, 3x, touch.
    { name: 'iphone-pro-max', use: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    // iPhone Duo (Apple, 2026): 5.4" outer and 7.6" inner OLED. Apple lists
    // 1398x2034 and 1878x2670 px; at the usual 3x that is ~466x678 and
    // ~626x890 CSS px. The inner panel folds without a gap, so no hinge.
    { name: 'iphone-duo-outer', use: { viewport: { width: 466, height: 678 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { name: 'iphone-duo-inner', use: { viewport: { width: 626, height: 890 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { name: 'iphone-duo-inner-landscape', use: { viewport: { width: 890, height: 626 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  ],
});
