/**
 * Global setup for Playwright tests
 * This file runs once before all tests
 */

const { chromium } = require('@playwright/test');
const { logger } = require('./testLogger');
const fs = require('fs');
const path = require('path');
const envVariables = require('./envVariables');

/**
 * Global setup function for Playwright tests
 * @param {Object} config - Playwright configuration
 */
async function globalSetup(config) {
  // Load environment variables
  envVariables.loadEnvFile();
  
  // Create state directory if it doesn't exist
  const stateDir = path.join(__dirname, '../state');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  
  // Create authenticated state if configured
  if (envVariables.getBoolEnv('SAVE_AUTH_STATE', false)) {
    const username = envVariables.getEnv('DEFAULT_USERNAME', '');
    const password = envVariables.getEnv('DEFAULT_PASSWORD', '');
    
    if (username && password) {
      // Launch browser
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        logger.info('Setting up authenticated state...');
        
        // Navigate to login page
        await page.goto(`${envVariables.getEnv('BASE_URL')}/user/login`);
        
        // Perform login
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        
        // Wait for login to complete
        await page.waitForNavigation();
        
        // Check if login was successful
        const isLoggedIn = await page.isVisible('text=My Application');
        
        if (isLoggedIn) {
          logger.info('Login successful, saving authentication state');
          // Save storage state to use in tests
          await context.storageState({ path: path.join(stateDir, 'authenticated.json') });
        } else {
          logger.error('Login failed, authentication state not saved');
        }
      } catch (error) {
        if (error instanceof Error) {
  logger.error('Error during authentication setup', error);
} else {
  logger.error(`Error during authentication setup: ${String(error)}`);
}
      } finally {
        // Close browser
        await browser.close();
      }
    }
  }
  
  logger.info('Global setup complete');
}

module.exports = globalSetup;
