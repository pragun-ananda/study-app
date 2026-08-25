import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Study App
 * Runs backend in-memory Express server and Vite frontend, testing real browser DOM, WebGL canvas, and API flows.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    // Launch Chrome with WebGL flags for headless 3D Three.js rendering
    launchOptions: {
      args: [
        '--enable-webgl',
        '--use-gl=angle',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization'
      ]
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Launch both backend test server and Vite frontend dev server
  webServer: [
    {
      command: 'npm --prefix ../backend run dev:test',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ]
});
