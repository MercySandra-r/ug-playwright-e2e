// @ts-check
const { test: baseTest } = require('@playwright/test');
const path = require('path');
const { logger } = require('./testLogger');

/**
 * Capture a screenshot of the current page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} name - Screenshot name (without extension)
 * @returns {Promise<string>} Path to the saved screenshot
 */
async function captureScreenshot(page, name) {
  const screenshotPath = path.join(__dirname, `../screenshots/${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

// Extend the base test with our custom fixtures
const test = baseTest.extend({
  // Add logger to test context
  logger: async ({}, use) => {
    await use(logger);
  },
  
  // Add screenshot utility to test context
  takeScreenshot: async ({ page }, use) => {
    /**
     * Takes a screenshot of the current page
     * @param {string} name - Name for the screenshot (without extension)
     * @returns {Promise<string>} Path to the saved screenshot
     */
    const screenshotFn = async (name) => captureScreenshot(page, name);
    await use(screenshotFn);
  },
  
  // Page fixture with enhanced logging
  page: async ({ page }, use) => {
    // Set up page error handling
    page.on('pageerror', (error) => {
      logger.error('Page error:', error);
    });
    
    page.on('console', (msg) => {
      const text = msg.text();
      switch (msg.type()) {
        case 'error':
          logger.error(`Console error: ${text}`);
          break;
        case 'warning':
          logger.warn(`Console warning: ${text}`);
          break;
        default:
          logger.debug(`Console ${msg.type()}: ${text}`);
      }
    });
    
    await use(page);
  }
});

module.exports = { test };
