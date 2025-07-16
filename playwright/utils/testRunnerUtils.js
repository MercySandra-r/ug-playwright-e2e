/**
 * Test Runner Utilities
 * 
 * This file provides utilities for test parallelization, filtering, tagging, and retry logic.
 */

const { test } = require('@playwright/test');
const configLoader = require('./configLoader');
const envVariables = require('./envVariables');

/**

 * @typedef {import('@playwright/test').Page} Page
 * @typedef {Object} TestArgs
 * @property {Page} page - Playwright Page object
 * @typedef {import('@playwright/test').TestInfo} TestInfo
 */

/**
 * Extended test fixture with tags support
 * @param {string} title - Test title
 * @param {Array<string>} tags - Array of tags for filtering
 * @param {(args: TestArgs, testInfo: TestInfo) => Promise<void>} testFunction - The test function to execute
 */
function taggedTest(title, tags, testFunction) {
  // Skip test if it doesn't match the tag filter
  const tagFilter = envVariables.getEnv('TAG_FILTER', '');
  
  if (tagFilter && tags && tags.length > 0) {
    const filterTags = tagFilter.split(',').map(t => t.trim().toLowerCase());
    const hasMatchingTag = tags.some(tag => filterTags.includes(tag.toLowerCase()));
    
    // Skip if no matching tags and we're filtering
    if (!hasMatchingTag) {
      test.skip(title, () => {}); // Empty function for skipped test
      return;
    }
  }
  
  // Run the test with the tags as an annotation
  test(title, async (args, testInfo) => {
    // Set tags in test metadata
    testInfo.annotations.push({ type: 'tags', description: tags.join(',') });
    await testFunction(args, testInfo);
  });
}

/**
 * Fixture for data-driven tests
 * @param {string} title - Test title template with {param} placeholders
 * @param {Array<Object>} dataItems - Array of data objects for parameterized tests
 * @param {Function} testFunction - The test function to execute
 */
function dataTest(title, dataItems, testFunction) {
  for (const data of dataItems) {
    // Replace placeholders in title with data values
    let testTitle = title;
    for (const [key, value] of Object.entries(data)) {
      testTitle = testTitle.replace(`{${key}}`, value);
    }
    
    // Create a test for this data item
    test(testTitle, async ({ page }, testInfo) => {
      // Add data to test info for reporting
      testInfo.annotations.push({ type: 'data', description: JSON.stringify(data) });
      await testFunction({ page, data }, testInfo);
    });
  }
}

/**
 * Retry handler to implement custom retry logic
 * @param {number} maxRetries - Maximum number of retries
 * @param {Function} testFunction - The test function to execute
 * @returns {Function} Wrapped test function with retry logic
 */
/**
 * @param {number} maxRetries
 * @param {(fixtures: any, testInfo: import('@playwright/test').TestInfo) => Promise<void>} testFunction
 */
function withRetry(maxRetries, testFunction) {
  /**
   * @param {any} fixtures
   * @param {import('@playwright/test').TestInfo} testInfo
   */
  return async (fixtures, testInfo) => {
    let attempt = 0;
    let lastError = null;
    
    /**
     * @param {any} error
     */
    const shouldRetry = (error) => {
      // Add custom logic here to determine if we should retry based on error type
      // For example, don't retry on assertion errors but do retry on network errors
      if (error.message.includes('AssertionError')) {
        return false;
      }
      return true;
    };
    
    while (attempt <= maxRetries) {
      try {
        await testFunction(fixtures, testInfo);
        // Success, exit retry loop
        return;
      } catch (/** @type {any} */ error) {
        lastError = error;
        attempt++;
        
        // Log retry attempt
        console.log(`Test failed, attempt ${attempt}/${maxRetries + 1}`);
        
        if (attempt > maxRetries || !shouldRetry(error)) {
          break;
        }
        
        // Wait before retrying
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    // All retries failed, rethrow the last error
    throw lastError;
  };
}

/**
 * Group tests for parallel execution
 * @param {string} groupName - Name of the test group
 * @param {Array<Function>} testFunctions - Array of test functions to execute in parallel
 */
function parallelGroup(groupName, testFunctions) {
  const parallelTests = envVariables.getBoolEnv('PARALLEL_TESTS', true);
  
  if (parallelTests) {
    test.describe.configure({ mode: 'parallel' });
  }
  
  test.describe(groupName, () => {
    for (const testFn of testFunctions) {
      testFn();
    }
  });
}

/**
 * Setup timeouts for a test based on configuration
 * @param {number} customTimeout - Custom timeout in milliseconds (optional)
 * @returns {number} Calculated timeout value
 */
function setupTestTimeout(customTimeout) {
  // Use custom timeout if provided, otherwise use from config or default
  const defaultTimeout = configLoader.getTimeout();
  const timeout = customTimeout || defaultTimeout;
  
  // Apply multiplier for slow environments if configured
  const timeoutMultiplier = envVariables.getNumEnv('TIMEOUT_MULTIPLIER', 1);
  
  return timeout * timeoutMultiplier;
}

module.exports = {
  taggedTest,
  dataTest,
  withRetry,
  parallelGroup,
  setupTestTimeout
};
