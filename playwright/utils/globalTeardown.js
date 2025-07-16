/**
 * Global teardown for Playwright tests
 * This file runs once after all tests
 */

const fs = require('fs');
const path = require('path');
const envVariables = require('./envVariables');

/**
 * Global teardown function for Playwright tests
 * @param {Object} config - Playwright configuration
 */
async function globalTeardown(config) {
  console.log('Running global teardown...');
  
  // Clean up temporary files if configured
  if (envVariables.getBoolEnv('CLEAN_TEMP_FILES', true)) {
    try {
      const tempDir = path.join(__dirname, '../temp');
      if (fs.existsSync(tempDir)) {
        // Delete temporary files but keep the directory
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          if (!fs.lstatSync(filePath).isDirectory()) {
            fs.unlinkSync(filePath);
          }
        }
        console.log('Temporary files cleaned up');
      }
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
    }
  }
  
  // Process test results
  try {
    const resultsDir = path.join(__dirname, '../test-results');
    if (fs.existsSync(resultsDir)) {
      // Implement any custom test results processing here
      console.log('Test results processed');
    }
  } catch (error) {
    console.error('Error processing test results:', error);
  }
  
  console.log('Global teardown complete');
}

module.exports = globalTeardown;
