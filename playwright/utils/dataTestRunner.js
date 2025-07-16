/**
 * Data-Driven Test Runner
 * 
 * This utility provides support for data-driven testing,
 * allowing tests to be run with multiple data sets.
 */

const { test } = require('./baseTest');
const TestDataLoader = require('./testDataLoader');
const { logger } = require('./testLogger');

/**
 * @typedef {Object} ModuleLogger
 * @property {(message: string) => void} info
 * @property {(message: string) => void} warn
 * @property {(message: string, error?: Error|unknown) => void} error
 * @property {(message: string) => void} debug
 */

/** @type {ModuleLogger} */
const moduleLogger = {
  info: (message) => logger.info(`[DataTestRunner] ${message}`),
  warn: (message) => logger.warn(`[DataTestRunner] ${message}`),
  debug: (message) => logger.debug(`[DataTestRunner] ${message}`),
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(`[DataTestRunner] ${message}`, error);
    } else if (error) {
      logger.error(`[DataTestRunner] ${message} - ${String(error)}`);
    } else {
      logger.error(`[DataTestRunner] ${message}`);
    }
  }
};

/**
 * Run a test for each item in a data set
 * @param {string} title - Test title template (can include {placeholders})
 * @param {string|Array<Record<string, unknown>>} dataSource - JSON file name or array of data objects
 * @param {Function} testFn - Test function to run for each data item
 * @returns {void}
 */
function dataTest(title, dataSource, testFn) {
  // Load data if a string (file name) is provided
  const testDataLoader = new TestDataLoader();
  const testData = typeof dataSource === 'string'
    ? testDataLoader.loadJson(dataSource)
    : dataSource;
  
  if (!testData || (Array.isArray(testData) && testData.length === 0)) {
    moduleLogger.warn(`No test data available for "${title}", skipping tests`);
    test(`${title} [NO DATA]`, () => {
      test.skip();
    });
    return;
  }
  
  // Handle array data
  if (Array.isArray(testData)) {
    testData.forEach((data, index) => {
      // Replace placeholders in title with data values
      let testTitle = title;
      for (const [key, value] of Object.entries(data)) {
        // Only use string/number values in the title
        if (typeof value === 'string' || typeof value === 'number') {
          testTitle = testTitle.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
      }
      
      // Add index if title still has placeholders
      if (testTitle.includes('{')) {
        testTitle = testTitle.replace(/\{[^}]+\}/g, `[${index + 1}]`);
      }
      
      // Define the test with this data
      test(testTitle, async ({ page }, testInfo) => {
        // Add test data to test info for reporting
        testInfo.annotations.push({ type: 'testData', description: JSON.stringify(data) });
        
        // Call the test function with the data
        await testFn({ page, testData: data }, testInfo);
      });
    });
  } 
  // Handle object data (key-value pairs)
  else if (typeof testData === 'object') {
    for (const [key, data] of Object.entries(testData)) {
      // Replace placeholders in title with data values
      let testTitle = title.replace('{key}', key);
      
      if (typeof data === 'object') {
        for (const [dataKey, value] of Object.entries(data)) {
          // Only use string/number values in the title
          if (typeof value === 'string' || typeof value === 'number') {
            testTitle = testTitle.replace(new RegExp(`\\{${dataKey}\\}`, 'g'), String(value));
          }
        }
      }
      
      // Add key if title still has placeholders
      if (testTitle.includes('{')) {
        testTitle = testTitle.replace(/\{[^}]+\}/g, `[${key}]`);
      }
      
      // Define the test with this data
      test(testTitle, async ({ page }, testInfo) => {
        // Add test data to test info for reporting
        testInfo.annotations.push({ 
          type: 'testData', 
          description: JSON.stringify({ key, data })
        });
        
        // Call the test function with the data
        await testFn({ page, testData: data, dataKey: key }, testInfo);
      });
    }
  }
}

/**
 * Create a parameterized test with multiple data sets
 * @param {string} title - Test title template
 * @param {Array<Record<string, unknown>>} paramSets - Array of parameter sets
 * @param {Function} testFn - Test function
 * @returns {void}
 */
function parameterizedTest(title, paramSets, testFn) {
  paramSets.forEach((params, index) => {
    let testTitle = title;
    
    // Replace placeholders in title
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' || typeof value === 'number') {
        testTitle = testTitle.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }
    
    // Use index if no replacements were made
    if (testTitle === title) {
      testTitle = `${title} [${index + 1}]`;
    }
    
    test(testTitle, async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'parameters', description: JSON.stringify(params) });
      await testFn({ page, params }, testInfo);
    });
  });
}

/**
 * Create a data matrix for testing all combinations of parameters
 * @param {Record<string, Array<unknown>>} parameters - Object with parameter keys and possible values
 * @returns {Array<Record<string, unknown>>} Array of parameter combinations
 * @example
 * // Returns [{ browser: 'chrome', theme: 'light' }, { browser: 'chrome', theme: 'dark' }, ...]
 * createDataMatrix({
 *   browser: ['chrome', 'firefox'],
 *   theme: ['light', 'dark']
 * });
 */
function createDataMatrix(parameters) {
  // Get all parameter keys and their possible values
  const keys = Object.keys(parameters);
  const values = Object.values(parameters);
  
  // Initialize with an empty object
  /** @type {Array<Record<string, unknown>>} */
  let combinations = [{}];
  
  // For each parameter, expand the combinations
  keys.forEach((key, i) => {
    /** @type {Array<Record<string, unknown>>} */
    const newCombinations = [];
    
    // For each existing combination
    combinations.forEach(combination => {
      // For each possible value of this parameter
      values[i].forEach((value) => {
        // Create a new combination with this value
        newCombinations.push({
          ...combination,
          [key]: value
        });
      });
    });
    
    combinations = newCombinations;
  });
  
  return combinations;
}

module.exports = {
  dataTest,
  parameterizedTest,
  createDataMatrix
};
