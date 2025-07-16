const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * @typedef {Object} EnvironmentConfig
 * @property {string} baseUrl - Base URL for the environment
 * @property {string} apiBaseUrl - Base URL for API endpoints
 * @property {number} [timeout] - Default timeout in milliseconds
 * @property {number} [retries] - Number of retries for failed tests
 * @property {boolean} [headless] - Whether to run in headless mode
 * @property {boolean} [screenshot] - Whether to take screenshots on failure
 * @property {boolean} [video] - Whether to record video
 * @property {boolean} [tracing] - Whether to enable tracing
 * @property {Object} [defaultUser] - Default user credentials
 * @property {string} [defaultUser.username] - Default username
 * @property {string} [defaultUser.password] - Default password
 * @property {string} [slackWebhookUrl] - Webhook URL for Slack notifications
 * @property {string} [dropboxToken] - Token for Dropbox integration
 * @property {string} [googleDriveToken] - Token for Google Drive integration
 */

// Set default environment to 'qa' if not specified
const env = process.env.NODE_ENV || 'qa';

// Basic configuration with defaults
/** @type {EnvironmentConfig} */
const defaultConfig = {
  baseUrl: 'https://apply-qa.apps.asu.edu',
  apiBaseUrl: 'https://api-qa.apps.asu.edu',
  timeout: 30000,
  retries: 1,
  headless: true,
  screenshot: true,
  video: false,
  tracing: false,
  defaultUser: {
    username: '',
    password: ''
  },
  slackWebhookUrl: '',
  dropboxToken: '',
  googleDriveToken: ''
};

/** @type {{ [key: string]: Partial<EnvironmentConfig> }} */
const envConfigs = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiBaseUrl: 'http://localhost:8080',
    timeout: 60000,
    retries: 2,
    headless: false,
    tracing: true
  },
  qa: {
    baseUrl: 'https://apply-qa.apps.asu.edu',
    apiBaseUrl: 'https://api-qa.apps.asu.edu',
    timeout: 30000
  },
  staging: {
    baseUrl: 'https://apply-staging.apps.asu.edu',
    apiBaseUrl: 'https://api-staging.apps.asu.edu',
    timeout: 30000
  },
  prod: {
    baseUrl: 'https://apply.asu.edu',
    apiBaseUrl: 'https://api.asu.edu',
    timeout: 20000,
    retries: 0
  }
};

// Merge default config with environment specific config
/** @type {EnvironmentConfig & { [key: string]: any }} */
const config = { 
  ...defaultConfig, 
  ...(env in envConfigs ? envConfigs[env] : {}) 
};

// Override with environment variables if present
if (process.env.BASE_URL) config.baseUrl = process.env.BASE_URL;
if (process.env.API_BASE_URL) config.apiBaseUrl = process.env.API_BASE_URL;
if (process.env.TIMEOUT) config.timeout = parseInt(process.env.TIMEOUT, 10);
if (process.env.RETRIES) config.retries = parseInt(process.env.RETRIES, 10);
if (process.env.HEADLESS) config.headless = process.env.HEADLESS === 'true';
if (process.env.SCREENSHOT) config.screenshot = process.env.SCREENSHOT === 'true';
if (process.env.VIDEO) config.video = process.env.VIDEO === 'true';
if (process.env.TRACING) config.tracing = process.env.TRACING === 'true';

// Safely handle defaultUser properties
if (process.env.DEFAULT_USERNAME) {
  config.defaultUser = config.defaultUser || {};
  config.defaultUser.username = process.env.DEFAULT_USERNAME;
}
if (process.env.DEFAULT_PASSWORD) {
  config.defaultUser = config.defaultUser || {};
  config.defaultUser.password = process.env.DEFAULT_PASSWORD;
}

// Handle other optional properties
if (process.env.SLACK_WEBHOOK_URL) config.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
if (process.env.DROPBOX_TOKEN) config.dropboxToken = process.env.DROPBOX_TOKEN;
if (process.env.GOOGLE_DRIVE_TOKEN) config.googleDriveToken = process.env.GOOGLE_DRIVE_TOKEN;

/**
 * Returns the configuration for the current environment
 * @returns {Object} Configuration object
 */
function getConfig() {
  return config;
}

/**
 * Returns the current environment name
 * @returns {string} Environment name (local, qa, staging, prod)
 */
function getEnv() {
  return env;
}

/**
 * Returns a specific configuration value
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if key not found
 * @returns {any} Configuration value
 */
function getValue(key, defaultValue = null) {
  // Use type assertion to allow string indexing
  const configAny = /** @type {Record<string, any>} */ (config);
  return key in configAny ? configAny[key] : defaultValue;
}

module.exports = {
  getConfig,
  getEnv,
  getValue
};
