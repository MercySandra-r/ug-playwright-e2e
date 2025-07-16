/**
 * Test Retry Helper
 * 
 * This file provides advanced retry capabilities beyond Playwright's built-in retry,
 * including conditional retries based on error types and intelligent retry strategies.
 */

const fs = require('fs');
const path = require('path');
const envVariables = require('./envVariables');

// Default retry settings
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Get the maximum number of retries from configuration
 * @param {string} testName - Name of the test (optional)
 * @returns {number} Maximum number of retries
 */
function getMaxRetries(testName) {
  // Default to environment setting or built-in default
  let maxRetries = envVariables.getNumEnv('MAX_RETRIES', DEFAULT_MAX_RETRIES);
  
  // Allow override based on test name or tags
  if (testName) {
    // Example: Override for specific test types
    if (testName.includes('flaky')) {
      maxRetries = Math.max(maxRetries, 3); // More retries for known flaky tests
    } else if (testName.includes('network')) {
      maxRetries = Math.max(maxRetries, 3); // More retries for network tests
    }
  }
  
  return maxRetries;
}

/**
 * Get retry delay in milliseconds, with optional exponential backoff
 * @param {number} attempt - Current retry attempt (1-based)
 * @returns {number} Delay in milliseconds before next retry
 */
function getRetryDelay(attempt) {
  const baseDelay = envVariables.getNumEnv('RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS);
  const useExponentialBackoff = envVariables.getBoolEnv('EXPONENTIAL_BACKOFF', true);
  
  if (useExponentialBackoff && attempt > 1) {
    // Exponential backoff: delay * 2^(attempt-1)
    return baseDelay * Math.pow(2, attempt - 1);
  }
  
  return baseDelay;
}

/**
 * Check if a test should be retried based on the error
 * @param {Error} error - Error that occurred during test execution
 * @returns {boolean} True if the test should be retried
 */
function shouldRetryTest(error) {
  // Don't retry on assertion failures (these are likely real test failures)
  if (error.name === 'AssertionError' || error.message.includes('Expect')) {
    return false;
  }
  
  // Always retry on certain error types
  const retryableErrors = [
    'TimeoutError',
    'Error: net::',
    'Error: Navigation timeout',
    'Error: page.waitForSelector',
    'Error: page.click',
    'Error: page.fill',
    'Error: Target closed',
    'WebDriverError',
  ];
  
  for (const retryableError of retryableErrors) {
    if (error.name === retryableError || error.message.includes(retryableError)) {
      return true;
    }
  }
  
  // Default: retry if configured globally
  return envVariables.getBoolEnv('RETRY_ALL_ERRORS', false);
}

/**
 * Record retry statistics to help identify flaky tests
 * @param {string} testFile - Test file path
 * @param {string} testName - Test name
 * @param {number} retries - Number of retries before success
 * @param {string} errorMessage - Last error message if failed
 */
function recordRetryStatistics(testFile, testName, retries, errorMessage = '') {
  try {
    const statsDir = path.join(__dirname, '../reports/retry-stats');
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }
    
    const statsFile = path.join(statsDir, 'retry-stats.json');
    /** @type {{ [key: string]: any }} */
    let stats = {};
    
    // Load existing stats if available
    if (fs.existsSync(statsFile)) {
      stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    }
    
    // Create or update test entry
    const testKey = `${testFile}::${testName}`;
    if (!stats[testKey]) {
      stats[testKey] = {
        file: testFile,
        test: testName,
        retryCount: 0,
        successAfterRetry: 0,
        failures: 0,
        lastRun: new Date().toISOString(),
        errors: []
      };
    }
    
    // Update statistics
    stats[testKey].retryCount += retries;
    if (retries > 0 && !errorMessage) {
      stats[testKey].successAfterRetry += 1;
    }
    if (errorMessage) {
      stats[testKey].failures += 1;
      // Keep only the last 5 errors
      stats[testKey].errors = [
        { date: new Date().toISOString(), message: errorMessage },
        ...stats[testKey].errors.slice(0, 4)
      ];
    }
    stats[testKey].lastRun = new Date().toISOString();
    
    // Write updated stats
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  } catch (/** @type {any} */ error) {
    console.error('Error recording retry statistics:', error);
  }
}

/**
 * Wrapper function to add intelligent retry logic to a test
 * @param {Function} testFn - Original test function
 * @param {string} testName - Name of the test
 * @returns {Function} Wrapped test function with retry logic
 */
function withIntelligentRetry(testFn, testName) {
  /**
   * @param {any} fixtures
   * @param {import('@playwright/test').TestInfo} testInfo
   */
  return async (fixtures, testInfo) => {
    const maxRetries = getMaxRetries(testName);
    let attempt = 1;
    /** @type {any} */
    let lastError = null;
    
    while (attempt <= maxRetries + 1) { // +1 because first attempt is not a retry
      try {
        // Run the test
        await testFn(fixtures, testInfo);
        
        // Record statistics if we had to retry
        if (attempt > 1) {
          recordRetryStatistics(
            testInfo.file,
            testName,
            attempt - 1
          );
        }
        
        // Test passed, exit retry loop
        return;
      } catch (/** @type {any} */ error) {
        lastError = error;
        
        // Log retry information
        console.log(`Test "${testName}" failed (attempt ${attempt}/${maxRetries + 1}): ${error.message}`);
        
        // Check if we should retry
        if (attempt > maxRetries || !shouldRetryTest(error)) {
          break;
        }
        
        // Wait before retrying
        const delay = getRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        
        attempt++;
      }
    }
    
    // Record statistics for failed test
    recordRetryStatistics(
      testInfo.file,
      testName,
      attempt - 1,
      lastError.message
    );
    
    // All retries failed, rethrow the last error
    throw lastError;
  };
}

module.exports = {
  getMaxRetries,
  getRetryDelay,
  shouldRetryTest,
  withIntelligentRetry,
  recordRetryStatistics
};
