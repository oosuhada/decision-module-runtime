import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3103',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'corepack pnpm dev',
    url: 'http://127.0.0.1:3103',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
});
