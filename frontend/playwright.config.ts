import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chrome/Edge if Playwright browser download fails:
        // channel: 'chrome' or channel: 'msedge'
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev --workspace backend',
      port: 4000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev --workspace frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
