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
    // Surface Duo, one screen.
    { name: 'duo-single', use: { viewport: { width: 540, height: 720 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true } },
    // Surface Duo spanned across both screens (34px hinge). Segment emulation
    // needs the ViewportSegments flag; tests/devices.spec.js adds the hinge via CDP.
    {
      name: 'duo-spanned',
      testMatch: /devices\.spec\.js/,
      use: {
        viewport: { width: 1114, height: 720 },
        launchOptions: { args: ['--enable-experimental-web-platform-features', '--enable-features=ViewportSegments'] },
      },
    },
  ],
});
