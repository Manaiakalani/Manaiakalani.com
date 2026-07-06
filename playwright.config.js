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
  ],
});
