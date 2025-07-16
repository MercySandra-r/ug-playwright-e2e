/**
 * Environment Variables Handler
 * 
 * This utility provides functions to work with environment variables,
 * ensuring consistent access and validation throughout the test framework.
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Default .env path
const defaultEnvPath = path.resolve(__dirname, '../.env');

/**
 * Load environment variables from .env file
 * @param {string} envPath - Path to .env file
 * @returns {Object} Loaded environment variables
 */
function loadEnvFile(envPath = defaultEnvPath) {
  // Check if custom environment file exists, fallback to default
  const finalPath = fs.existsSync(envPath) ? envPath : defaultEnvPath;
  
  // Use dotenv to load the environment file
  const result = dotenv.config({ path: finalPath });
  
  if (result.error) {
    console.warn(`Warning: Error loading environment file from ${finalPath}:`, result.error);
  }
  
  return process.env;
}

/**
 * Get environment variable value
 * @param {string} key - Environment variable name
 * @param {any} defaultValue - Default value if variable is not defined
 * @returns {string} Environment variable value or default
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

/**
 * Get environment variable as boolean
 * @param {string} key - Environment variable name
 * @param {boolean} defaultValue - Default value if variable is not defined
 * @returns {boolean} Environment variable as boolean
 */
function getBoolEnv(key, defaultValue = false) {
  const value = process.env[key];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

/**
 * Get environment variable as number
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default value if variable is not defined or not a number
 * @returns {number} Environment variable as number
 */
function getNumEnv(key, defaultValue = 0) {
  const value = process.env[key];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Check if running in CI environment
 * @returns {boolean} True if running in CI
 */
function isCI() {
  return getBoolEnv('CI', false) || !!process.env.CI || !!process.env.GITHUB_ACTIONS;
}

/**
 * Check if running in debug mode
 * @returns {boolean} True if running in debug mode
 */
function isDebug() {
  return getBoolEnv('DEBUG', false) || process.env.NODE_ENV === 'debug';
}

/**
 * Get current environment name
 * @returns {string} Environment name (local, qa, staging, prod)
 */
function getCurrentEnv() {
  return getEnv('NODE_ENV', 'qa');
}

/**
 * Get browser to use for testing
 * @returns {string} Browser name (chromium, firefox, webkit)
 */
function getBrowser() {
  return getEnv('BROWSER', 'chromium');
}

/**
 * Create a custom .env file for a specific environment
 * @param {string} env - Environment name
 * @param {Object} variables - Environment variables to set
 * @param {string} outputPath - Path to save the .env file
 */
function createEnvFile(env, variables = {}, outputPath) {
  const envFilePath = outputPath || path.resolve(__dirname, `../.env.${env}`);
  let content = `# ${env.toUpperCase()} Environment Configuration\n`;
  content += `NODE_ENV=${env}\n\n`;
  
  Object.entries(variables).forEach(([key, value]) => {
    content += `${key}=${value}\n`;
  });
  
  fs.writeFileSync(envFilePath, content, 'utf8');
  console.log(`Environment file created: ${envFilePath}`);
}

module.exports = {
  loadEnvFile,
  getEnv,
  getBoolEnv,
  getNumEnv,
  isCI,
  isDebug,
  getCurrentEnv,
  getBrowser,
  createEnvFile
};
