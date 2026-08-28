import { defineConfig, devices } from '@playwright/test'

/**
 * Visual Regression & E2E Test Configuration
 *
 * Projects:
 * - chromium/firefox/webkit: Functional E2E tests
 * - Mobile Chrome/Safari: Mobile functional tests
 * - visual-*: Visual regression tests (desktop, tablet, mobile)
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as [string]] : []),
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video recording for debugging */
    video: process.env.CI ? 'retain-on-failure' : 'off',
    /* Action timeout */
    actionTimeout: 15000,
    /* Navigation timeout */
    navigationTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Functional E2E tests (ignore visual regression tests)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /visual\.spec\.ts$/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /visual\.spec\.ts$/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /visual\.spec\.ts$/,
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: /visual\.spec\.ts$/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: /visual\.spec\.ts$/,
    },

    // Visual Regression Tests - Desktop
    {
      name: 'visual-desktop',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1,
        viewport: { width: 1920, height: 1080 },
        // Freeze timezone for consistent timestamps
        timezoneId: 'America/New_York',
        locale: 'en-US',
        // Emulate reduced motion for stable screenshots
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
      testMatch: /visual\.spec\.ts/,
      // Visual tests need more retries for flakiness
      retries: process.env.CI ? 3 : 1,
    },

    // Visual Regression Tests - Tablet
    {
      name: 'visual-tablet',
      use: {
        ...devices['iPad Pro 11'],
        deviceScaleFactor: 2,
        viewport: { width: 834, height: 1194 },
        timezoneId: 'America/New_York',
        locale: 'en-US',
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
      testMatch: /visual\.spec\.ts/,
      retries: process.env.CI ? 3 : 1,
    },

    // Visual Regression Tests - Mobile
    {
      name: 'visual-mobile',
      use: {
        ...devices['Pixel 5'],
        deviceScaleFactor: 2.75,
        viewport: { width: 393, height: 851 },
        timezoneId: 'America/New_York',
        locale: 'en-US',
        contextOptions: {
          reducedMotion: 'reduce',
        },
        // Mobile-specific permissions
        permissions: ['notifications'],
        geolocation: { latitude: 40.7128, longitude: -74.0060 },
      },
      testMatch: /visual\.spec\.ts/,
      retries: process.env.CI ? 3 : 1,
    },

    // Visual Regression - Dark Mode (Desktop)
    {
      name: 'visual-dark',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1,
        viewport: { width: 1920, height: 1080 },
        timezoneId: 'America/New_York',
        locale: 'en-US',
        contextOptions: {
          reducedMotion: 'reduce',
          colorScheme: 'dark',
        },
      },
      testMatch: /visual\.spec\.ts/,
      retries: process.env.CI ? 3 : 1,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: process.env.DEMO_MODE_ENABLED
      ? {
          DEMO_MODE_ENABLED: 'true',
          NODE_ENV: 'development',
        }
      : undefined,
  },

  /* Snapshot configuration for visual regression */
  snapshotDir: './e2e/__screenshots__',
  expect: {
    toHaveScreenshot: {
      // Small threshold for minor rendering differences
      threshold: 0.05,
      // Maximum pixel difference ratio
      maxDiffPixelRatio: 0.02,
      // Animation must complete before screenshot
      animations: 'disabled',
    },
  },
})
