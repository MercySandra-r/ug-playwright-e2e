/**
 * Data Provider Utilities
 * 
 * This module provides functions to load and manage test data from various sources
 * such as JSON files, Excel files, or CSV files.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { parse } = require('csv-parse/sync');
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
  info: (message) => logger.info(`[DataProvider] ${message}`),
  warn: (message) => logger.warn(`[DataProvider] ${message}`),
  debug: (message) => logger.debug(`[DataProvider] ${message}`),
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(`[DataProvider] ${message}`, error);
    } else if (error) {
      logger.error(`[DataProvider] ${message} - ${String(error)}`);
    } else {
      logger.error(`[DataProvider] ${message}`);
    }
  }
};

class DataProvider {
  /**
   * Get test data from a JSON file
   * @param {string} dataFile - Path to the JSON file
   * @returns {Object} Test data object
   */
  static getJsonData(dataFile) {
    try {
      const fullPath = path.resolve(process.cwd(), dataFile);
      const rawData = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      moduleLogger.error(`Error loading JSON data from ${dataFile}`, error);
      throw error;
    }
  }

  /**
   * Get test data from an Excel file
   * @param {string} dataFile - Path to the Excel file
   * @param {string} sheetName - Name of the sheet to read
   * @returns {Promise<Array<Record<string, unknown>>>} Array of row objects with column headers as keys
   */
  static async getExcelData(dataFile, sheetName) {
    try {
      const fullPath = path.resolve(process.cwd(), dataFile);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(fullPath);
      
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found in Excel file`);
      }
      
      /** @type {Array<Record<string, unknown>>} */
      const data = [];
      /** @type {Array<string>} */
      const headers = [];
      
      // Get headers from the first row
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        // Ensure cell.value is not null/undefined and convert to string
        const cellValue = cell.value !== null && cell.value !== undefined ? cell.value.toString() : '';
        headers[colNumber - 1] = cellValue;
      });
      
      // Get data from remaining rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          /** @type {Record<string, unknown>} */
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            // Ensure index exists in headers array
            const headerIndex = colNumber - 1;
            if (headers[headerIndex]) {
              rowData[headers[headerIndex]] = cell.value;
            }
          });
          data.push(rowData);
        }
      });
      
      return data;
    } catch (error) {
      moduleLogger.error(`Error loading Excel data from ${dataFile}`, error);
      throw error;
    }
  }

  /**
   * Get test data from a CSV file
   * @param {string} dataFile - Path to the CSV file
   * @param {Object} options - CSV parsing options
   * @returns {Array<Object>} Array of row objects with column headers as keys
   */
  static getCsvData(dataFile, options = { columns: true, skip_empty_lines: true }) {
    try {
      const fullPath = path.resolve(process.cwd(), dataFile);
      const rawData = fs.readFileSync(fullPath, 'utf8');
      return parse(rawData, options);
    } catch (error) {
      moduleLogger.error(`Error loading CSV data from ${dataFile}`, error);
      throw error;
    }
  }

  /**
   * Get test data based on file type
   * @param {string} dataFile - Path to the data file
   * @param {string} [sheetName] - Sheet name for Excel files
   * @returns {Promise<Object|Array<Record<string, unknown>>>} Test data
   */
  static async getTestData(dataFile, sheetName) {
    const fileExtension = path.extname(dataFile).toLowerCase();
    
    switch (fileExtension) {
      case '.json':
        return this.getJsonData(dataFile);
      case '.xlsx':
      case '.xls':
        return await this.getExcelData(dataFile, sheetName || 'Sheet1');
      case '.csv':
        return this.getCsvData(dataFile);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  /**
   * DataProvider for TestNG-like data-driven testing
   * Returns test data from specified file to be used with test.each()
   * @param {string} dataFile - Path to the data file
   * @param {string} [sheetName] - Sheet name for Excel files
   * @returns {Promise<Array<Record<string, unknown>>>} Test data array
   */
  static async dp(dataFile, sheetName) {
    const data = await this.getTestData(dataFile, sheetName);
    
    // Filter data to only include rows with Runmode=Y if that field exists
    if (Array.isArray(data)) {
      return data.filter(row => !row.hasOwnProperty('Runmode') || row.Runmode === 'Y');
    } else {
      // Convert non-array data to an array with a single properly typed record
      /** @type {Record<string, unknown>} */
      const typedData = {};
      
      // Copy properties from data to typedData
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          typedData[key] = value;
        });
      }
      
      return [typedData];
    }
  }
}

// Export individual functions for direct import
module.exports = {
  getTestData: DataProvider.getTestData,
  getJsonData: DataProvider.getJsonData,
  getExcelData: DataProvider.getExcelData,
  getCsvData: DataProvider.getCsvData,
  dp: DataProvider.dp
};
