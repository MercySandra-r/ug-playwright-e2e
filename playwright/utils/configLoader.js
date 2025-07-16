/**
 * Configuration Loader
 * 
 * This utility loads and provides access to configuration settings from various sources:
 * 1. Environment variables
 * 2. Configuration files
 * 3. Command line arguments
 * 
 * @typedef {Object} AppConfig
 * @property {string} baseUrl - Base URL for the application
 * @property {string} apiBaseUrl - Base URL for API endpoints
 * @property {number} timeout - Default timeout in milliseconds
 * @property {number} retries - Number of retries for failed tests
 * @property {boolean} headless - Whether to run in headless mode
 * @property {boolean} screenshot - Whether to take screenshots on failure
 * @property {boolean} video - Whether to record video
 * @property {boolean} tracing - Whether to enable tracing
 * @property {Object} defaultUser - Default user credentials
 * @property {string} defaultUser.username - Default username
 * @property {string} defaultUser.password - Default password
 * @property {string} [slackWebhookUrl] - Webhook URL for Slack notifications
 * @property {string} [dropboxToken] - Token for Dropbox integration
 * @property {string} [googleDriveToken] - Token for Google Drive integration
 * @property {Object.<string, any>} [testData] - Test data loaded from fixtures
 */

const { getConfig, getValue } = require('../config/env.config');
const path = require('path');
const fs = require('fs');

/**
 * ConfigLoader class to handle configuration loading and access
 */
class ConfigLoader {
  /**
   * @type {AppConfig}
   */
  config;
  
  /**
   * @type {Object.<string, any>}
   */
  testData = {};
  constructor() {
    // Use type assertion for the config object
    this.config = /** @type {AppConfig} */ (getConfig());
    this.testData = {};
    this.loadTestData();
  }

  /**
   * Get all configuration settings
   * @returns {AppConfig} Complete configuration object
   */
  getAll() {
    return this.config;
  }

  /**
   * Get a specific configuration value
   * @template T
   * @param {string} key - Configuration key
   * @param {T} [defaultValue] - Default value if key not found
   * @returns {T} Configuration value or defaultValue
   */
  get(key, defaultValue) {
    const value = getValue(key, defaultValue);
    // Use type assertion with null check
    return /** @type {T} */ (value !== null && value !== undefined ? value : defaultValue);
  }

  /**
   * Get base URL for the application
   * @returns {string} Base URL
   */
  getBaseUrl() {
    return this.config?.baseUrl || '';
  }

  /**
   * Get API base URL
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    return this.config?.apiBaseUrl || '';
  }

  /**
   * Get default timeout value in milliseconds
   * @returns {number} Timeout value
   */
  getTimeout() {
    return this.config?.timeout || 30000; // Default 30 seconds
  }

  /**
   * Get default user credentials
   * @returns {{username: string, password: string}} User credentials object with username and password
   */
  getDefaultUser() {
    return {
      username: this.config?.defaultUser?.username || '',
      password: this.config?.defaultUser?.password || ''
    };
  }

  /**
   * Load test data from JSON files
   * @private
   */
  loadTestData() {
    const testDataDir = path.resolve(__dirname, '../fixtures/testData');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
      return;
    }

    try {
      // Read all JSON files from the test data directory
      const files = fs.readdirSync(testDataDir)
        .filter(file => file.endsWith('.json'));

      files.forEach(file => {
        const filePath = path.join(testDataDir, file);
        const dataType = file.replace('.json', '');
        
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          this.testData[dataType] = JSON.parse(fileContent);
        } catch (err) {
          console.error(`Error loading test data from ${file}:`, err);
        }
      });
    } catch (err) {
      console.error('Error reading test data directory:', err);
    }
  }

  /**
   * Get test data by type
   * @template {string} T - The type of the test data to retrieve
   * @param {T} dataType - Type of test data to retrieve
   * @returns {Record<string, any> | any[]} Test data object or array
   */
  getTestData(dataType) {
    return this.testData[dataType] || {};
  }

  /**
   * Get test data item by type and key
   * @template {string} T - The type of the test data to retrieve
   * @template {string|number|symbol} K - The type of the key (must be string, number, or symbol)
   * @param {T} dataType - Type of test data to retrieve
   * @param {K} key - Key of the specific test data item
   * @returns {any} Test data item or null if not found
   */
  getTestDataItem(dataType, key) {
    const data = this.getTestData(dataType);
    // Use type assertion to allow string indexing and handle the key type
    if (data && typeof data === 'object' && key in data) {
      return data[/** @type {keyof typeof data} */ (key)];
    }
    return null;
  }
}

// Export singleton instance
const configLoader = new ConfigLoader();
module.exports = configLoader;
