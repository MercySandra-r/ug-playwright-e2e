/**
 * Timeout Manager
 * 
 * This file provides utilities for managing timeouts in tests,
 * including dynamic timeout adjustments based on test type and environment.
 */

const envVariables = require('./envVariables');
const { logger } = require('./testLogger');

/**
 * @typedef {Object} TimeoutConfig
 * @property {number} test - Default test timeout
 * @property {number} navigation - Navigation timeout
 * @property {number} action - Action timeout (clicks, fills, etc.)
 * @property {number} assertion - Assertion timeout
 * @property {number} api - API request timeout
 * @property {number} slow - Timeout for tests marked as slow
 * @property {number} animation - Wait for animations
 * @property {number} load - Page load wait
 * @property {number} render - UI rendering wait
 */

/**
 * @typedef {TimeoutConfig & Record<string, number>} TimeoutConfigWithIndex
 */

// Default timeout values (in milliseconds)
/** @type {TimeoutConfigWithIndex} */
const DEFAULT_TIMEOUTS = {
  test: 60000,           // Default test timeout
  navigation: 30000,     // Navigation timeout
  action: 10000,         // Action timeout (clicks, fills, etc.)
  assertion: 5000,       // Assertion timeout
  api: 15000,            // API request timeout
  slow: 120000,          // Timeout for tests marked as slow
  animation: 2000,       // Wait for animations
  load: 10000,           // Page load wait
  render: 1000,          // UI rendering wait
};

/**
 * Get timeout value with optional environment adjustment
 * @param {string} timeoutType - Type of timeout to get
 * @returns {number} Timeout value in milliseconds
 */
function getTimeout(timeoutType = 'test') {
  try {
    // Get base timeout value
    const baseTimeout = envVariables.getNumEnv(
      `TIMEOUT_${timeoutType.toUpperCase()}`,
      DEFAULT_TIMEOUTS[timeoutType] || DEFAULT_TIMEOUTS.test
    );
    
    // Apply environment-specific multipliers
    let multiplier = 1;
    
    // Slow environments get longer timeouts
    if (envVariables.getBoolEnv('SLOW_ENVIRONMENT', false)) {
      multiplier = envVariables.getNumEnv('TIMEOUT_MULTIPLIER', 1.5);
    }
    
    // CI environments often need longer timeouts
    if (envVariables.isCI()) {
      multiplier = Math.max(multiplier, envVariables.getNumEnv('CI_TIMEOUT_MULTIPLIER', 2));
    }
    
    return Math.round(baseTimeout * multiplier);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error in getTimeout for type: ${timeoutType}`, error);
    } else {
      logger.error(`Error in getTimeout for type: ${timeoutType}: ${String(error)}`);
    }
    // Fallback to default test timeout
    return DEFAULT_TIMEOUTS.test;
  }
}

/**
 * @typedef {Object} TimeoutOptions
 * @property {boolean} [slow] - Whether the test is slow
 * @property {number} [factor] - Custom timeout factor
 */

/**
 * Configure timeouts for a test
 * @param {import('@playwright/test').TestType<any, any>} test - Playwright test object
 * @param {TimeoutOptions} [options] - Timeout options
 */
function configureTestTimeouts(test, options = {}) {
  try {
    const { slow = false, factor = 1 } = options;
    
    // Set test timeout
    const testTimeout = slow 
      ? getTimeout('slow')
      : getTimeout('test');
    test.setTimeout(testTimeout * factor);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error in configureTestTimeouts', error);
    } else {
      logger.error(`Error in configureTestTimeouts: ${String(error)}`);
    }
  }
}

/**
 * Get expect timeout for assertions
 * @param {string} type - Type of assertion
 * @returns {number} Timeout in milliseconds
 */
function getExpectTimeout(type = 'default') {
  try {
    switch (type) {
      case 'visibility':
        return getTimeout('assertion');
      case 'network':
        return getTimeout('api');
      case 'animation':
        return getTimeout('animation');
      default:
        return getTimeout('assertion');
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error in getExpectTimeout for type: ${type}`, error);
    } else {
      logger.error(`Error in getExpectTimeout for type: ${type}: ${String(error)}`);
    }
    return DEFAULT_TIMEOUTS.assertion;
  }
}

/**
 * @typedef {Object} PlaywrightConfigObject
 * @property {Object} [expect] - Expect options
 * @property {Object} [use] - Use options for browser context
 * @property {number} [timeout] - Global timeout
 */

/**
 * Configure all timeouts in Playwright config
 * @param {PlaywrightConfigObject} playwrightConfig - Playwright configuration object
 * @returns {PlaywrightConfigObject} Updated configuration with timeouts
 */
function configureTimeouts(playwrightConfig) {
  try {
    return {
      ...playwrightConfig,
      timeout: getTimeout('test'),
      expect: {
        timeout: getTimeout('assertion'),
        ...(playwrightConfig.expect || {}),
      },
      use: {
        ...(playwrightConfig.use || {}),
        actionTimeout: getTimeout('action'),
        navigationTimeout: getTimeout('navigation'),
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error in configureTimeouts', error);
    } else {
      logger.error(`Error in configureTimeouts: ${String(error)}`);
    }
    return playwrightConfig;
  }
// Removed duplicate code
}

module.exports = {
  getTimeout,
  configureTestTimeouts,
  getExpectTimeout,
  configureTimeouts,
};
