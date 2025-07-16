/**
 * Test Data Loader
 * 
 * This utility loads test data from various sources (JSON files, CSV, etc.)
 * and provides an interface for accessing it in tests.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { logger } from './testLogger';
import { csvParse } from 'd3-dsv';
import envVariables from './envVariables';

// Create logger
// Removed loggerInstance creation line

/**
 * @typedef {Object} TestData
 * @property {Object.<string, any>} data
 */

/**
 * Test Data Loader Class
 */
class TestDataLoader {
  /**
   * Create a new TestDataLoader instance
   */
  constructor() {
    this.dataCache = new Map();
    this.dataDir = path.join(__dirname, '../fixtures/testData');
    this.environment = envVariables.getEnv('NODE_ENV', 'local');
  }

  /**
   * Load test data from a JSON file
   * @param {string} fileName - Name of the JSON file (without extension)
   * @returns {Object} Test data object
   */
  loadJson(fileName) {
    try {
      // Check if data is already cached
      const cacheKey = `json:${fileName}`;
      if (this.dataCache.has(cacheKey)) {
        logger.debug(`Using cached data for ${fileName}`);
        return this.dataCache.get(cacheKey);
      }

      // Check for environment-specific file first
      const envFileName = `${fileName}.${this.environment}.json`;
      const envFilePath = path.join(this.dataDir, envFileName);
      const defaultFilePath = path.join(this.dataDir, `${fileName}.json`);
      
      let filePath;
      if (fs.existsSync(envFilePath)) {
        logger.info(`Loading environment-specific test data: ${envFileName}`);
        filePath = envFilePath;
      } else {
        logger.info(`Loading default test data: ${fileName}.json`);
        filePath = defaultFilePath;
      }

      // Read and parse JSON file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Cache the data
      this.dataCache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to load JSON test data ${fileName}: ${error.message}`, error);
      } else {
        logger.error(`Failed to load JSON test data ${fileName}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Load test data from a CSV file
   * @param {string} fileName - Name of the CSV file (without extension)
   * @param {Object} options - CSV parsing options
   * @returns {Array<Object>} Array of data objects
   */
  loadCsv(fileName, options = {}) {
    try {
      // Check if data is already cached
      const cacheKey = `csv:${fileName}`;
      if (this.dataCache.has(cacheKey)) {
        logger.debug(`Using cached data for ${fileName}`);
        return this.dataCache.get(cacheKey);
      }

      // Check for environment-specific file first
      const envFileName = `${fileName}.${this.environment}.csv`;
      const envFilePath = path.join(this.dataDir, envFileName);
      const defaultFilePath = path.join(this.dataDir, `${fileName}.csv`);
      
      let filePath;
      if (fs.existsSync(envFilePath)) {
        logger.info(`Loading environment-specific CSV data: ${envFileName}`);
        filePath = envFilePath;
      } else {
        logger.info(`Loading default CSV data: ${fileName}.csv`);
        filePath = defaultFilePath;
      }

      // Read and parse CSV file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Default CSV options
      const csvOptions = {
        columns: true, // Use first row as column names
        skip_empty_lines: true,
        ...options
      };
      
      const data = csvParse(fileContent, csvOptions);
      
      // Cache the data
      this.dataCache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to load CSV test data ${fileName}: ${error.message}`, error);
      } else {
        logger.error(`Failed to load CSV test data ${fileName}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Get a specific test data item by key
   * @param {string} fileName - Name of the data file (without extension)
   * @param {string} key - Key to retrieve data
   * @returns {*} Test data for the specified key
   */
  getDataByKey(fileName, key) {
    try {
      /** @type {Record<string, any>} */
      const data = this.loadJson(fileName);
      
      if (!data[key]) {
        logger.warn(`Data key "${key}" not found in ${fileName}`);
        return null;
      }
      
      return data[key];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get test data by key ${key} from ${fileName}: ${error.message}`, error);
      } else {
        logger.error(`Failed to get test data by key ${key} from ${fileName}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Get a filtered subset of test data based on criteria
   * @param {string} fileName - Name of the data file (without extension)
   * @param {(value: any, key: string) => boolean} filterFn - Filter function
   * @returns {Array<Object>|Object} Filtered test data
   */
  getFilteredData(fileName, filterFn) {
    try {
      let data;
      
      // Determine file type from extension
      if (fileName.endsWith('.csv')) {
        data = this.loadCsv(fileName.replace('.csv', ''));
      } else {
        data = this.loadJson(fileName.replace('.json', ''));
      }
      
      // Handle both array and object data
      if (Array.isArray(data)) {
        return data.filter((value, index, array) => filterFn(value, index.toString()));
      } else {
        /**
         * @type {Record<string, any>}
         */
        const result = {};
        for (const [key, value] of Object.entries(data)) {
          if (filterFn(value, key)) {
            result[key] = value;
          }
        }
        return result;
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get filtered test data from ${fileName}: ${error.message}`, error);
      } else {
        logger.error(`Failed to get filtered test data from ${fileName}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Clear the data cache
   */
  clearCache() {
    try {
      this.dataCache.clear();
      logger.info('Test data cache cleared');
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to clear test data cache: ${error.message}`, error);
      } else {
        logger.error(`Failed to clear test data cache: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Create test data directory structure if it doesn't exist
   */
  createTestDataDirectories() {
    try {
      // Create main test data directory
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.info(`Created test data directory: ${this.dataDir}`);
      }
      
      // Create common data subdirectories
      const subdirs = ['users', 'forms', 'results', 'credentials'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(this.dataDir, subdir);
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true });
          logger.info(`Created test data subdirectory: ${subdir}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to create test data directories: ${error.message}`, error);
      } else {
        logger.error(`Failed to create test data directories: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Save test data to a JSON file
   * @param {string} fileName - File name (without extension)
   * @param {Object} data - Data to save
   * @param {boolean} isEnvironmentSpecific - Whether to save as environment-specific
   * @returns {string} Path to the saved file
   */
  saveData(fileName, data, isEnvironmentSpecific = false) {
    try {
      // Create directories if needed
      this.createTestDataDirectories();
      
      // Determine file name and path
      let filePath;
      if (isEnvironmentSpecific) {
        filePath = path.join(this.dataDir, `${fileName}.${this.environment}.json`);
      } else {
        filePath = path.join(this.dataDir, `${fileName}.json`);
      }
      
      // Write data to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      logger.info(`Saved test data to ${filePath}`);
      
      // Update cache
      const cacheKey = `json:${fileName}`;
      this.dataCache.set(cacheKey, data);
      
      return filePath;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to save test data ${fileName}: ${error.message}`, error);
      } else {
        logger.error(`Failed to save test data ${fileName}: ${String(error)}`);
      }
      throw error;
    }
  }
}

// Create a singleton instance
const testDataLoader = new TestDataLoader();

module.exports = testDataLoader;
