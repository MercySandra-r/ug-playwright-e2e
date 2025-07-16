/**
 * File Upload Utilities
 * 
 * This module provides utilities for file upload operations in Playwright tests.
 */

const fs = require('fs');
const path = require('path');
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
  info: (message) => logger.info(`[FileUploadUtils] ${message}`),
  warn: (message) => logger.warn(`[FileUploadUtils] ${message}`),
  debug: (message) => logger.debug(`[FileUploadUtils] ${message}`),
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(`[FileUploadUtils] ${message}`, error);
    } else if (error) {
      logger.error(`[FileUploadUtils] ${message} - ${String(error)}`);
    } else {
      logger.error(`[FileUploadUtils] ${message}`);
    }
  }
};

/**
 * File Upload Utilities
 */
class FileUploadUtils {
  /**
   * Create a new FileUploadUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
    this.tempDir = path.join(process.cwd(), 'temp/uploads');
    this.ensureTempDirExists();
  }

  /**
   * Ensure temporary directory exists
   * @private
   */
  ensureTempDirExists() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        moduleLogger.debug(`Created temporary upload directory: ${this.tempDir}`);
      }
    } catch (error) {
      moduleLogger.error('Error creating temporary directory', error);
    }
  }

  /**
   * Upload a file using a file input element
   * @param {string} selector - File input selector
   * @param {string} filePath - Path to the file to upload
   * @returns {Promise<void>}
   */
  async uploadFile(selector, filePath) {
    try {
      moduleLogger.debug(`Uploading file: ${filePath} to ${selector}`);
      
      // Ensure file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      // Wait for the file input to be present
      await this.page.waitForSelector(selector, { state: 'attached' });
      
      // Use Playwright's built-in upload functionality
      await this.page.setInputFiles(selector, filePath);
      
      moduleLogger.debug('File upload completed');
    } catch (error) {
      if (error instanceof Error) {
        moduleLogger.error('File upload failed', error);
      } else {
        moduleLogger.error(`File upload failed: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Upload multiple files using a file input element
   * @param {string} selector - File input selector
   * @param {Array<string>} filePaths - Paths to the files to upload
   * @returns {Promise<void>}
   */
  async uploadFiles(selector, filePaths) {
    try {
      moduleLogger.debug(`Uploading multiple files to ${selector}: ${filePaths.join(', ')}`);
      
      // Ensure all files exist
      for (const filePath of filePaths) {
        if (!fs.existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }
      }
      
      // Wait for the file input to be present
      await this.page.waitForSelector(selector, { state: 'attached' });
      
      // Use Playwright's built-in upload functionality for multiple files
      await this.page.setInputFiles(selector, filePaths);
      
      moduleLogger.debug('Multiple file upload completed');
    } catch (error) {
      moduleLogger.error('Error uploading multiple files', error);
      throw error;
    }
  }

  /**
   * Create and upload a temporary text file
   * @param {string} selector - File input selector
   * @param {string} content - Text content for the file
   * @param {string} fileName - Name for the temporary file
   * @returns {Promise<string>} Path to the created temporary file
   */
  async uploadTextFile(selector, content, fileName = 'upload.txt') {
    try {
      moduleLogger.debug(`Creating and uploading text file: ${fileName}`);
      
      // Create temporary file
      const filePath = path.join(this.tempDir, fileName);
      fs.writeFileSync(filePath, content, 'utf8');
      
      // Upload the file
      await this.uploadFile(selector, filePath);
      
      return filePath;
    } catch (error) {
      moduleLogger.error('Error creating and uploading text file', error);
      throw error;
    }
  }

  /**
   * Create and upload a temporary JSON file
   * @param {string} selector - File input selector
   * @param {Object} data - JSON data to write to the file
   * @param {string} fileName - Name for the temporary file
   * @returns {Promise<string>} Path to the created temporary file
   */
  async uploadJsonFile(selector, data, fileName = 'upload.json') {
    try {
      moduleLogger.debug(`Creating and uploading JSON file: ${fileName}`);
      
      // Create temporary file
      const filePath = path.join(this.tempDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      // Upload the file
      await this.uploadFile(selector, filePath);
      
      return filePath;
    } catch (error) {
      moduleLogger.error('Error creating and uploading JSON file', error);
      throw error;
    }
  }

  /**
   * Create and upload a temporary CSV file
   * @param {string} selector - File input selector
   * @param {Array<Array<string>>} data - CSV data as array of arrays
   * @param {string} fileName - Name for the temporary file
   * @returns {Promise<string>} Path to the created temporary file
   */
  async uploadCsvFile(selector, data, fileName = 'upload.csv') {
    try {
      moduleLogger.debug(`Creating and uploading CSV file: ${fileName}`);
      
      // Convert data to CSV format
      const csvContent = data
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      // Create temporary file
      const filePath = path.join(this.tempDir, fileName);
      fs.writeFileSync(filePath, csvContent, 'utf8');
      
      // Upload the file
      await this.uploadFile(selector, filePath);
      
      return filePath;
    } catch (error) {
      moduleLogger.error('Error creating and uploading CSV file', error);
      throw error;
    }
  }

  /**
   * Upload a file when there's no file input element (using drag and drop)
   * @param {string} dropZoneSelector - Selector for the drop zone
   * @param {string} filePath - Path to the file to upload
   * @returns {Promise<void>}
   */
  async uploadFileByDragAndDrop(dropZoneSelector, filePath) {
    try {
      moduleLogger.debug(`Uploading file by drag and drop: ${filePath} to ${dropZoneSelector}`);
      
      // Ensure file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      // Wait for the drop zone to be visible
      await this.page.waitForSelector(dropZoneSelector, { state: 'visible' });
      
      // Override file chooser behavior
      await this.page.evaluate((selector) => {
        const dropZone = document.querySelector(selector);
        if (!dropZone) return false;
        
        // Create a custom event handler for the drop zone
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        
        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        
        return true;
      }, dropZoneSelector);
      
      // Use Playwright's built-in drag and drop for files
      await this.page.setInputFiles('input[type=file]', filePath);
      
      moduleLogger.debug('File upload by drag and drop completed');
    } catch (error) {
      moduleLogger.error('Error uploading file via drop', error);
      throw error;
    }
  }

  /**
   * Upload a file using a hidden file input
   * @param {string} selector - Selector for the button/element that triggers file selection
   * @param {string} filePath - Path to the file to upload
   * @returns {Promise<void>}
   */
  async uploadFileWithHiddenInput(selector, filePath) {
    try {
      moduleLogger.debug(`Uploading file with hidden input: ${filePath}`);
      
      // Ensure file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      // Wait for the trigger element to be visible
      await this.page.waitForSelector(selector, { state: 'visible' });
      
      // Add a file input to the page
      const fileInputId = `hidden-file-input-${Date.now()}`;
      await this.page.evaluate((id) => {
        const input = document.createElement('input');
        input.id = id;
        input.type = 'file';
        input.style.opacity = '0';
        input.style.position = 'fixed';
        input.style.top = '0';
        input.style.left = '0';
        input.style.width = '1px';
        input.style.height = '1px';
        document.body.appendChild(input);
      }, fileInputId);
      
      // Set the file
      await this.page.setInputFiles(`#${fileInputId}`, filePath);
      
      // Trigger the file selection event
      await this.page.evaluate((id) => {
        const input = document.getElementById(id);
        if (input) {
          const event = new Event('change', { bubbles: true });
          if (input.dispatchEvent) {
            input.dispatchEvent(event);
          }
        }
      }, fileInputId);
      
      // Clean up
      await this.page.evaluate((id) => {
        const input = document.getElementById(id);
        if (input) document.body.removeChild(input);
      }, fileInputId);
      
      moduleLogger.debug('File upload with hidden input completed');
    } catch (error) {
      moduleLogger.error('Error uploading file from content', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   * @returns {Promise<void>}
   */
  async cleanupTempFiles() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
        
        moduleLogger.debug('Temporary files cleaned up');
      }
    } catch (error) {
      moduleLogger.error('Error cleaning up temporary files', error);
    }
  }
}

module.exports = FileUploadUtils;
