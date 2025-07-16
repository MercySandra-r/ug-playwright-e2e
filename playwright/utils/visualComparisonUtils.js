/**
 * Visual Comparison Utilities
 * 
 * This module provides utilities for visual comparison and screenshot-based testing.
 */

/**
 * @typedef {object} ScreenshotOptions
 * @property {string} [selector] - Element selector (if omitted, takes full page screenshot)
 * @property {string} [name] - Name for the screenshot file
 * @property {boolean} [fullPage] - Whether to take a full page screenshot
 * @property {{x: number, y: number, width: number, height: number}} [clip] - Clip area for the screenshot
 */

/**
 * @typedef {object} ComparisonResult
 * @property {boolean} passed - Whether the comparison passed
 * @property {string} message - Result message with details
 * @property {string} [diffPath] - Path to the diff image file
 * @property {string} baselinePath - Path to the baseline image
 * @property {string} currentPath - Path to the current screenshot
 * @property {number} [diffPercentage] - Percentage of pixels that differ (0-1)
 */

const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');
const { logger } = require('./testLogger');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

/**
 * @typedef {Object} PNGData
 * @property {Buffer} buffer - PNG data buffer
 */

/**
 * @typedef {Object} PNGInterface
 * @property {Buffer} data - PNG data buffer
 * @property {number} width - Image width
 * @property {number} height - Image height
 * @property {function(Buffer): PNGInterface} parse - Parse PNG data
 * @property {function(): Buffer} pack - Pack PNG data
 */

/**
 * @typedef {Object} PNGSyncModule
 * @property {function(Buffer): PNGInterface} read - Read PNG data from buffer
 * @property {function(PNGInterface): Buffer} write - Write PNG data to buffer
 */

// TypeScript needs to know about PNG methods
/**
 * Visual Comparison Utilities
 */
class VisualComparisonUtils {
  /**
   * Create a new VisualComparisonUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
    this.screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
    this.baselineDir = path.join(process.cwd(), 'test-results', 'baselines');
    
    // Add basePath and currentPath properties for comparison results
    this.basePath = this.baselineDir;
    this.currentPath = this.screenshotsDir;
    
    // Ensure directories exist
    this._ensureDirectoryExists(this.screenshotsDir);
    this._ensureDirectoryExists(this.baselineDir);
  }

  /**
   * Ensure a directory exists
   * @param {string} dir - Directory path
   * @private
   */
  _ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Generate a filename for screenshots
   * @param {string} name - Base name for the screenshot
   * @param {string} [suffix=''] - Optional suffix
   * @returns {string} Filename
   * @private
   */
  _generateFilename(name, suffix = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${safeName}${suffix ? '-' + suffix : ''}-${timestamp}.png`;
  }

  /**
   * Take a screenshot of an element or page
   * @param {Object} options - Screenshot options
   * @param {string} [options.selector] - Element selector (if omitted, takes full page screenshot)
   * @param {string} [options.name='screenshot'] - Name for the screenshot file
   * @param {boolean} [options.fullPage=false] - Whether to take a full page screenshot
   * @param {{x: number, y: number, width: number, height: number}} [options.clip] - Clip area for the screenshot
   * @returns {Promise<string>} Path to the saved screenshot
   */
  async takeScreenshot(options = {}) {
    try {
      const { selector, name = 'screenshot', fullPage = false, clip } = options;
      logger.debug(`Taking screenshot${selector ? ` of element ${selector}` : ''} with name: ${name}`);
      
      const filename = this._generateFilename(name);
      const filepath = path.join(this.screenshotsDir, filename);
      
      const screenshotOptions = {
        path: filepath,
        fullPage: fullPage && !selector && !clip,
        clip: clip
      };
      
      if (selector) {
        // Take screenshot of specific element
        const element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        await element.screenshot(screenshotOptions);
      } else {
        // Take screenshot of entire page
        await this.page.screenshot(screenshotOptions);
      }
      
      logger.debug(`Screenshot saved to: ${filepath}`);
      return filepath;
    } catch (/** @type {any} */ error) {
      logger.error(`Error taking screenshot: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Save a screenshot as a baseline for future comparisons
   * @param {object} options - Screenshot options
 * @param {string} [options.selector] - Element selector (if omitted, takes full page screenshot)
 * @param {string} [options.name] - Name for the screenshot file
 * @param {boolean} [options.fullPage] - Whether to take a full page screenshot
 * @param {{x: number, y: number, width: number, height: number}} [options.clip] - Clip area for the screenshot
   * @param {string} [options.selector] - Element selector (if omitted, takes full page screenshot)
   * @param {string} options.name - Name for the baseline
   * @param {boolean} [options.fullPage=false] - Whether to take a full page screenshot
   * @param {{x: number, y: number, width: number, height: number}} [options.clip] - Clip area for the screenshot
   * @returns {Promise<string>} Path to the saved baseline
   */
  async saveBaseline(options) {
    try {
      const { selector, name, fullPage = false, clip } = options;
      
      if (!name) {
        throw new Error('Name is required for baseline screenshots');
      }
      
      logger.debug(`Saving baseline${selector ? ` of element ${selector}` : ''} with name: ${name}`);
      
      const filename = `${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
      const filepath = path.join(this.baselineDir, filename);
      
      const screenshotOptions = {
        path: filepath,
        fullPage: fullPage && !selector && !clip,
        clip: clip
      };
      
      if (selector) {
        // Take screenshot of specific element
        const element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        await element.screenshot(screenshotOptions);
      } else {
        // Take screenshot of entire page
        await this.page.screenshot(screenshotOptions);
      }
      
      logger.debug(`Baseline saved to: ${filepath}`);
      return filepath;
    } catch (/** @type {any} */ error) {
      logger.error(`Error saving baseline: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Compare a screenshot with a baseline
   * @param {object} options - Comparison options
   * @param {string} [options.selector] - Element selector (if omitted, uses full page)
   * @param {string} options.name - Name of the baseline to compare against
   * @param {number} [options.threshold=0.1] - Threshold for pixel difference (0-1)
   * @param {boolean} [options.fullPage=false] - Whether to take a full page screenshot
   * @returns {Promise<ComparisonResult>} Comparison result object with passed, message, diffPath, baselinePath, currentPath, and diffPercentage properties
   */
  async compareWithBaseline(options) {
    try {
      const { selector, name, threshold = 0.1, fullPage = false } = options;
      
      if (!name) {
        throw new Error('Name is required to identify the baseline');
      }
      
      logger.debug(`Comparing${selector ? ` element ${selector}` : ' page'} with baseline: ${name}`);
      
      // Check if baseline exists
      const baselineFilename = `${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
      const baselinePath = path.join(this.baselineDir, baselineFilename);
      
      if (!fs.existsSync(baselinePath)) {
        logger.warn(`Baseline not found: ${baselinePath}`);
        throw new Error(`Baseline not found: ${name}`);
      }
      
      // Take current screenshot
      const currentScreenshotPath = await this.takeScreenshot({
        selector,
        name: `${name}-current`,
        fullPage
      });
      
      // Generate diff filename
      const diffFilename = this._generateFilename(name, 'diff');
      const diffPath = path.join(this.screenshotsDir, diffFilename);
      
      // Use Playwright's built-in comparison
      // Since we're not directly in a test, we need to use a different approach
      // Here we'll use the expect function with toMatchSnapshot
      
      // Read baseline as buffer
      const baselineBuffer = fs.readFileSync(baselinePath);
      
      // Wrap in a try-catch to handle the comparison
      let diffBuffer;
      let diff;
      try {
        // For simplicity, using the page.screenshot to get the buffer
        let screenshotBuffer;
        if (selector) {
          const element = await this.page.$(selector);
          if (!element) {
            throw new Error(`Element not found: ${selector}`);
          }
          screenshotBuffer = await element.screenshot();
        } else {
          screenshotBuffer = await this.page.screenshot({ fullPage });
        }
        
        // Using Playwright's comparator
        const { writeFileSync } = require('fs');
        
        // Parse the images
        // @ts-ignore
        const img1 = PNG.sync.read(baselineBuffer);
        // @ts-ignore
        const img2 = PNG.sync.read(screenshotBuffer);
        
        // Create the diff output
        const { width, height } = img1;
        const diff = new PNG({ width, height });
        
        /**
         * @typedef {Object} ComparisonResult
         * @property {boolean} passed - Whether the comparison passed
         * @property {string} message - Comparison result message
         * @property {string} diffPath - Path to diff image
         * @property {string} baselinePath - Path to baseline image
         * @property {string} currentPath - Path to current image
         * @property {number} diffPercentage - Percentage of pixels that differ
         */

        // Compare pixels
        const numDiffPixels = pixelmatch(
          img1.data,
          img2.data,
          diff.data,
          width,
          height,
          { threshold }
        );
        
        // Save diff image
        // @ts-ignore
        diffBuffer = PNG.sync.write(diff);
        fs.writeFileSync(diffPath, diffBuffer);
        
        // Calculate difference percentage
        const totalPixels = width * height;
        const diffPercentage = numDiffPixels / totalPixels;
        
        const passed = diffPercentage <= threshold;
        
        if (!passed) {
          logger.warn(`Visual comparison failed: ${name}, diff: ${(diffPercentage * 100).toFixed(2)}%`);
        } else {
          logger.debug(`Visual comparison passed: ${name}, diff: ${(diffPercentage * 100).toFixed(2)}%`);
        }
        
        return {
          passed,
          diffPath,
          diffPercentage,
          baselinePath,
          currentPath: currentScreenshotPath,
          message: passed 
            ? `Visual comparison passed with ${(diffPercentage * 100).toFixed(2)}% difference`
            : `Visual comparison failed with ${(diffPercentage * 100).toFixed(2)}% difference (threshold: ${threshold * 100}%)`
        };
      } catch (/** @type {any} */ error) {
        logger.error(`Error during visual comparison: ${error.message}`, error);
        
        return {
          passed: false,
          baselinePath,
          currentPath: currentScreenshotPath,
          message: `Error during comparison: ${error.message}`
        };
      }
    } catch (/** @type {any} */ error) {
      logger.error(`Error comparing with baseline: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Assert that an element or page matches a baseline
   * @param {object} options - Assertion options
   * @param {string} [options.selector] - Element selector (if omitted, uses full page)
   * @param {string} options.name - Name of the baseline to compare against
   * @param {number} [options.threshold=0.1] - Threshold for pixel difference (0-1)
   * @param {boolean} [options.fullPage=false] - Whether to take a full page screenshot
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if assertion passes
   */
  async assertVisualMatch(options) {
    try {
      const { selector, name, threshold = 0.1, fullPage = false, message } = options;
      
      if (!name) {
        throw new Error('Name is required to identify the baseline');
      }
      
      logger.debug(`Asserting${selector ? ` element ${selector}` : ' page'} visually matches baseline: ${name}`);
      
      /** @type {import('./visualComparisonUtils').ComparisonResult} */
      const result = await this.compareWithBaseline({ selector, name, threshold, fullPage });
      
      if (!result.passed) {
        // Using custom error class to properly handle additional properties
        /**
         * @typedef {Object} VisualComparisonErrorOptions
         * @property {string} message - Error message
         * @property {string} diffPath - Path to diff image
         * @property {string} baselinePath - Path to baseline image
         * @property {string} currentPath - Path to current image
         * @property {number} diffPercentage - Percentage of pixels that differ
         */

        /**
         * @class
         * @extends {Error}
         */
        class VisualComparisonError extends Error {
          /**
           * @param {string} message - Error message
           * @param {string} diffPath - Path to diff image
           * @param {string} baselinePath - Path to baseline image
           * @param {string} currentPath - Path to current image
           * @param {number} diffPercentage - Percentage of pixels that differ
           */
          constructor(message, diffPath, baselinePath, currentPath, diffPercentage) {
            super(message);
            this.name = 'VisualComparisonError';
            this.diffPath = diffPath;
            this.baselinePath = baselinePath;
            this.currentPath = currentPath;
            this.diffPercentage = diffPercentage;
          }
        }
        
        const error = new VisualComparisonError(
          message || result.message || 'Visual comparison failed',
          result.diffPath || '',
          result.baselinePath,
          result.currentPath,
          result.diffPercentage || 0
        );
        
        logger.error(`Visual assertion failed: ${error.message}`, error);
        throw error;
      }
      
      logger.debug(`Visual assertion passed: ${name}`);
      return true;
    } catch (/** @type {any} */ error) {
      logger.error(`Visual assertion error: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Capture screenshots of multiple elements and compare with baselines
   * @param {Array<{selector?: string, name: string, threshold?: number, fullPage?: boolean}>} items - Array of items to compare
   * @returns {Promise<Array<ComparisonResult>>} Array of comparison results
   */
  async batchCompare(items) {
    try {
      logger.debug(`Batch comparing ${items.length} items`);
      
      const results = [];
      
      for (const item of items) {
        try {
          const result = await this.compareWithBaseline(item);
          results.push({
            ...item,
            ...result
          });
        } catch (/** @type {any} */ error) {
          // Ensure all required ComparisonResult properties are included
          results.push({
            ...item,
            passed: false,
            message: `Error during comparison: ${error.message || 'Unknown error'}`,
            baselinePath: error.baselinePath || path.join(this.basePath, `${item.name}.png`),
            currentPath: error.currentPath || path.join(this.currentPath, `${item.name}.png`)
          });
        }
      }
      
      const passedCount = results.filter(r => r.passed).length;
      logger.debug(`Batch comparison completed: ${passedCount}/${results.length} passed`);
      
      return results;
    } catch (/** @type {any} */ error) {
      logger.error(`Error in batch comparison: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Take a screenshot of the current state and return the buffer
   * @param {object} options - Screenshot options
 * @param {string} [options.selector] - Element selector (if omitted, takes full page screenshot)
 * @param {string} [options.name] - Name for the screenshot file
 * @param {boolean} [options.fullPage] - Whether to take a full page screenshot
 * @param {{x: number, y: number, width: number, height: number}} [options.clip] - Clip area for the screenshot
   * @param {string} [options.selector] - Element selector (if omitted, takes full page screenshot)
   * @param {boolean} [options.fullPage=false] - Whether to take a full page screenshot
   * @param {{x: number, y: number, width: number, height: number}} [options.clip] - Clip area for the screenshot
   * @returns {Promise<Buffer>} Screenshot as Buffer
   */
  async getScreenshotBuffer(options = {}) {
    try {
      const { selector, fullPage = false, clip } = options;
      
      let screenshotOptions = {};
      
      if (fullPage && !selector && !clip) {
        screenshotOptions = { fullPage: true };
      } else if (clip) {
        screenshotOptions = { clip };
      }
      
      let buffer;
      
      if (selector) {
        // Take screenshot of specific element
        const element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        buffer = await element.screenshot(screenshotOptions);
      } else {
        // Take screenshot of entire page
        buffer = await this.page.screenshot(screenshotOptions);
      }
      
      return buffer;
    } catch (/** @type {any} */ error) {
      logger.error(`Error getting screenshot buffer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get the size of an element
   * @param {string} selector - Element selector
   * @returns {Promise<{width: number, height: number}>} Element dimensions
   */
  async getElementSize(selector) {
    try {
      logger.debug(`Getting size of element: ${selector}`);
      
      const boundingBox = await this.page.locator(selector).boundingBox();
      
      if (!boundingBox) {
        throw new Error(`Element not found or not visible: ${selector}`);
      }
      
      return {
        width: boundingBox.width,
        height: boundingBox.height
      };
    } catch (/** @type {any} */ error) {
      logger.error(`Error getting element size: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Compare layout of two elements
   * @param {string} selector1 - First element selector
   * @param {string} selector2 - Second element selector
   * @param {object} [options={}] - Layout comparison options
   * @param {number} [options.widthTolerance=0] - Tolerance for width difference in pixels
   * @param {number} [options.heightTolerance=0] - Tolerance for height difference in pixels
   * @returns {Promise<{passed: boolean, message: string, dimensions1: {width: number, height: number}, dimensions2: {width: number, height: number}, widthDiff: number, heightDiff: number}>} Comparison result
   */
  async compareElementLayout(selector1, selector2, options = {}) {
    try {
      const { widthTolerance = 0, heightTolerance = 0 } = options;
      logger.debug(`Comparing layout of elements: ${selector1} and ${selector2}`);
      
      const size1 = await this.getElementSize(selector1);
      const size2 = await this.getElementSize(selector2);
      
      const widthDiff = Math.abs(size1.width - size2.width);
      const heightDiff = Math.abs(size1.height - size2.height);
      
      const widthPassed = widthDiff <= widthTolerance;
      const heightPassed = heightDiff <= heightTolerance;
      const passed = widthPassed && heightPassed;
      
      /** @type {{passed: boolean, message: string, dimensions1: {width: number, height: number}, dimensions2: {width: number, height: number}, widthDiff: number, heightDiff: number}} */
      const result = {
        passed,
        message: passed 
          ? `Elements have matching layout (within tolerance)`
          : `Elements have different layout: width diff=${widthDiff}px (tolerance=${widthTolerance}px), height diff=${heightDiff}px (tolerance=${heightTolerance}px)`,
        dimensions1: size1,
        dimensions2: size2,
        widthDiff,
        heightDiff
      };
      
      return result;
    } catch (/** @type {any} */ error) {
      logger.error(`Error comparing element layout: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Assert that two elements have the same layout
   * @param {string} selector1 - First element selector
   * @param {string} selector2 - Second element selector
   * @param {object} [options={}] - Assertion options
   * @param {number} [options.widthTolerance=0] - Tolerance for width difference in pixels
   * @param {number} [options.heightTolerance=0] - Tolerance for height difference in pixels
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if assertion passes
   */
  async assertSameLayout(selector1, selector2, options = {}) {
    try {
      const { widthTolerance = 0, heightTolerance = 0, message } = options;
      logger.debug(`Asserting elements have same layout: ${selector1} and ${selector2}`);
      
      const result = await this.compareElementLayout(selector1, selector2, { widthTolerance, heightTolerance });
      
      if (!result.passed) {
        // Create a custom error with additional properties
        const error = new Error(message || result.message);
        
        // Add custom properties to the error object
        Object.defineProperties(error, {
          dimensions1: { value: result.dimensions1, enumerable: true },
          dimensions2: { value: result.dimensions2, enumerable: true },
          widthDiff: { value: result.widthDiff, enumerable: true },
          heightDiff: { value: result.heightDiff, enumerable: true }
        });
        
        logger.error(`Layout assertion failed: ${error.message}`, error);
        throw error;
      }
      
      logger.debug(`Layout assertion passed: ${selector1} and ${selector2}`);
      return true;
    } catch (/** @type {any} */ error) {
      logger.error(`Layout assertion error: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = VisualComparisonUtils;
