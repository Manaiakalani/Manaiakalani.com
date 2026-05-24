const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'https://manaiakalani.com',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.BASE_URL ? {
    command: 'npx serve . -l 4173',
    port: 4173,
    reuseExistingServer: true,
  } : undefined,
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
  ],
});
