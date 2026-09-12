import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300000,
  workers: 1,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 960 },
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev -- --port 5173`,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
