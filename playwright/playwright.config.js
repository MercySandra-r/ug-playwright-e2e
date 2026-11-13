// @ts-check
const { defineConfig, devices } = require('@playwright/test');
// .env always wins over values left in the environment by an earlier run (the VS Code test
// runner keeps its process alive, so without override a changed .env would be ignored).
require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Number of retries for failing tests
  retries: 3,
  // Workers for running tests in parallel
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000, // Global timeout: 60 seconds
  expect: {
    timeout: 10000, // Assertion timeout: 10 seconds
  },
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['list']
  ],

  // Global setup/teardown file
  globalSetup: require.resolve('./utils/globalSetup.js'),
  globalTeardown: require.resolve('./utils/globalTeardown.js'),

  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'https://apply-qa.apps.asu.edu',
    
    // Viewport dimensions
    viewport: { width: 1280, height: 720 },
    
    // Capture screenshot after each test
    screenshot: 'only-on-failure',
    
    // Trace for first retry and CI
    trace: process.env.CI ? 'on' : 'on-first-retry',
    
    // Video recording
    video: 'on-first-retry',
    
    // Browser navigation options
    navigationTimeout: 30000,
    
    // Default timeout for all actions
    actionTimeout: 15000,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  // Project configurations for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'msedge',
      use: { 
        channel: 'msedge',
        ...devices['Desktop Edge'],
      },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    // Test against branded browsers
    {
      name: 'chrome-beta',
      use: { 
        channel: 'chrome-beta',
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
