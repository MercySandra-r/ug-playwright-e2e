/**
 * IFrame Utilities
 * 
 * This module provides utilities for working with iframes in Playwright tests.
 */

/**
 * @typedef {import('@playwright/test').Frame} Frame
 */

const { logger } = require('./testLogger');

// Create helper functions for logging with module prefix
const logPrefix = 'IframeUtils';
/**
 * Log a debug message with the module prefix
 * @param {string} message - The message to log
 */
const logDebug = (message) => logger.debug(`[${logPrefix}] ${message}`);

/**
 * Log an info message with the module prefix
 * @param {string} message - The message to log
 */
const logInfo = (message) => logger.info(`[${logPrefix}] ${message}`);

/**
 * Log a warning message with the module prefix
 * @param {string} message - The message to log
 */
const logWarn = (message) => logger.warn(`[${logPrefix}] ${message}`);

/**
 * Log an error message with the module prefix
 * @param {string} message - The message to log
 * @param {Error|undefined} error - Optional error object
 */
const logError = (message, error) => logger.error(`[${logPrefix}] ${message}`, error);

/**
 * IFrame Utilities
 */
class IframeUtils {
  /**
   * Create a new IframeUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Get a frame by its name or id attribute
   * @param {string} nameOrId - The name or id attribute of the iframe
   * @returns {Promise<Frame|null>} The frame object or null if not found
   */
  async getFrameByNameOrId(nameOrId) {
    try {
      logDebug(`Getting frame by name or id: ${nameOrId}`);
      
      // Try to get the frame directly by name
      let frame = this.page.frame(nameOrId);
      
      if (frame) {
        return frame;
      }
      
      // Try to get by id selector
      const elementHandle = await this.page.$(`iframe#${nameOrId}`);
      if (elementHandle) {
        frame = await elementHandle.contentFrame();
        if (frame) {
          return frame;
        }
      }
      
      // Try to get by name selector
      const elementHandleByName = await this.page.$(`iframe[name="${nameOrId}"]`);
      if (elementHandleByName) {
        frame = await elementHandleByName.contentFrame();
        if (frame) {
          return frame;
        }
      }
      
      logWarn(`No frame found with name or id: ${nameOrId}`);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        logError(`Error getting frame by name or id: ${error.message}`, error);
      } else {
        logError('Unknown error occurred getting frame by name or id', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get a frame by its index
   * @param {number} index - The zero-based index of the frame
   * @returns {Promise<Frame|null>} The frame object or null if not found
   */
  async getFrameByIndex(index) {
    try {
      logger.debug(`Getting frame by index: ${index}`);
      
      const frames = this.page.frames();
      
      // Skip the main frame (index 0)
      const iframeIndex = index + 1;
      
      if (iframeIndex < frames.length) {
        return frames[iframeIndex];
      }
      
      logger.warn(`No frame found at index: ${index}`);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting frame by index: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred getting frame by index', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get a frame by CSS selector of its iframe element
   * @param {string} selector - The CSS selector for the iframe element
   * @returns {Promise<Frame|null>} The frame object or null if not found
   */
  async getFrameBySelector(selector) {
    try {
      logger.debug(`Getting frame by selector: ${selector}`);
      
      // Find the iframe element
      const elementHandle = await this.page.$(selector);
      
      if (!elementHandle) {
        logger.warn(`No iframe element found with selector: ${selector}`);
        return null;
      }
      
      // Get the content frame from the element handle
      const frame = await elementHandle.contentFrame();
      
      if (!frame) {
        logger.warn(`Could not access content frame for iframe with selector: ${selector}`);
        return null;
      }
      
      return frame;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting frame by selector: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred getting frame by selector', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Find an element in a frame by selector
   * @param {string} frameSelector - The CSS selector for the iframe element
   * @param {string} elementSelector - The CSS selector for the element within the iframe
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} The element handle or null if not found
   */
  async getElementInFrame(frameSelector, elementSelector) {
    try {
      logger.debug(`Getting element ${elementSelector} in frame ${frameSelector}`);
      
      const frame = await this.getFrameBySelector(frameSelector);
      
      if (!frame) {
        return null;
      }
      
      // Find the element within the frame
      return await frame.$(elementSelector);
    } catch (error) {
      if (error instanceof Error) {
        logError(`Error getting element in frame: ${error.message}`, error);
      } else {
        logError('Unknown error occurred getting element in frame', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Wait for a frame to be loaded
   * @param {string} selector - The CSS selector for the iframe element
   * @param {WaitForFrameOptions} options - Options for waiting for the frame
   * @returns {Promise<Frame>} The frame object
   */
  async waitForFrameLoad(selector, options = {}) {
    const { timeout = 30000, state = 'load' } = options;
    
    try {
      logger.debug(`Waiting for frame to load: ${selector} (timeout: ${timeout}ms)`);
      
      const start = Date.now();
      let frame = null;
      
      while (Date.now() - start < timeout) {
        // Find the iframe element
        const elementHandle = await this.page.$(selector);
        
        if (elementHandle) {
          frame = await elementHandle.contentFrame();
          
          if (frame) {
            // Wait for frame to load
            try {
              await frame.waitForLoadState(state, { timeout: 1000 });
              logger.debug(`Frame loaded: ${selector}`);
              return frame;
            } catch (e) {
              // Frame not ready yet, continue waiting
            }
          }
        }
        
        await this.page.waitForTimeout(100);
      }
      
      throw new Error(`Timeout waiting for frame to load: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error waiting for frame load: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred waiting for frame load', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Wait for an element in a frame
   * @param {string|Frame} frameOrSelector - The frame or CSS selector for the iframe
   * @param {string} elementSelector - The CSS selector for the element within the iframe
   * @param {{ state: 'visible' | 'hidden', timeout: number } & import('@playwright/test').WaitForSelectorOptions} options - Wait options
   * @returns {Promise<import('@playwright/test').ElementHandle>} The element handle
   */
  async waitForElementInFrame(frameOrSelector, elementSelector, options = { state: 'visible', timeout: 30000 }) {
    try {
      const { state, timeout } = options;
      logger.debug(`Waiting for element ${elementSelector} in frame (state: ${state}, timeout: ${timeout}ms)`);
      
      // Get the frame if a selector was provided
      let frame;
      if (typeof frameOrSelector === 'string') {
        frame = await this.waitForFrameLoad(frameOrSelector, { timeout });
      } else {
        frame = frameOrSelector;
      }
      
      if (!frame) {
        throw new Error('Frame not found');
      }
      
      // Wait for the element within the frame
      return await frame.waitForSelector(elementSelector, { state, timeout });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error waiting for element in frame: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred waiting for element in frame', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Fill a form field in a frame
   * @param {string|Frame} frameOrSelector - The frame or CSS selector for the iframe
   * @param {string} fieldSelector - The CSS selector for the form field
   * @param {string} value - The value to fill
   * @returns {Promise<void>}
   */
  async fillFieldInFrame(frameOrSelector, fieldSelector, value) {
    try {
      logger.debug(`Filling field ${fieldSelector} in frame with value: ${value}`);
      
      // Get the frame if a selector was provided
      let frame;
      if (typeof frameOrSelector === 'string') {
        frame = await this.getFrameBySelector(frameOrSelector);
      } else {
        frame = frameOrSelector;
      }
      
      if (!frame) {
        throw new Error('Frame not found');
      }
      
      // Fill the field
      await frame.fill(fieldSelector, value);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error filling field in frame: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred filling field in frame', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Click an element in a frame
   * @param {string|Frame} frameOrSelector - The frame or CSS selector for the iframe
   * @param {string} elementSelector - The CSS selector for the element
   * @param {Object} options - Click options
   * @returns {Promise<void>}
   */
  async clickInFrame(frameOrSelector, elementSelector, options = {}) {
    try {
      logger.debug(`Clicking element ${elementSelector} in frame`);
      
      // Get the frame if a selector was provided
      let frame;
      if (typeof frameOrSelector === 'string') {
        frame = await this.getFrameBySelector(frameOrSelector);
      } else {
        frame = frameOrSelector;
      }
      
      if (!frame) {
        throw new Error('Frame not found');
      }
      
      // Click the element
      await frame.click(elementSelector, options);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error clicking in frame: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred clicking in frame', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get text content of an element within a frame
   * @param {string|Frame} frameOrSelector - The frame or CSS selector for the iframe
   * @param {string} elementSelector - The CSS selector for the element
   * @returns {Promise<string>} The text content
   */
  async getTextInFrame(frameOrSelector, elementSelector) {
    try {
      logger.debug(`Getting text of element ${elementSelector} in frame`);
      
      // Get the frame if a selector was provided
      let frame;
      if (typeof frameOrSelector === 'string') {
        frame = await this.getFrameBySelector(frameOrSelector);
      } else {
        frame = frameOrSelector;
      }
      
      if (!frame) {
        throw new Error('Frame not found');
      }
      
      // Get the text content
      const textContent = await frame.textContent(elementSelector);
      return textContent || '';
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting text in frame: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred getting text in frame', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Execute JavaScript in a frame
   * @param {string|Frame} frameOrSelector - The frame or CSS selector for the iframe
   * @param {string|((...args: any[]) => any)} pageFunction - The function to execute or a string of JavaScript code
   * @param {Array<any>} args - Arguments to pass to the function
   * @returns {Promise<any>} The result of the function execution
   */
  async evaluateInFrame(frameOrSelector, pageFunction, ...args) {
    try {
      logger.debug(`Executing JavaScript in frame`);
      
      // Get the frame if a selector was provided
      let frame;
      if (typeof frameOrSelector === 'string') {
        frame = await this.getFrameBySelector(frameOrSelector);
      } else {
        frame = frameOrSelector;
      }
      
      if (!frame) {
        throw new Error('Frame not found');
      }
      
      // Execute the function
      return await frame.evaluate(pageFunction, ...args);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error executing JavaScript in frame: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred executing JavaScript in frame', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get all frames on the page
   * @returns {Promise<Array<Frame>>} Array of frames
   */
  async getAllFrames() {
    try {
      logger.debug('Getting all frames');
      
      // Get all frames
      const frames = this.page.frames();
      
      // Skip the main frame
      return frames.slice(1);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting all frames: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred getting all frames', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get nested frame (frame within a frame)
   * @param {string|Frame} parentFrameOrSelector - The parent frame or CSS selector
   * @param {string} childFrameSelector - The CSS selector for the child iframe element
   * @returns {Promise<Frame|null>} The child frame object or null if not found
   */
  async getNestedFrame(parentFrameOrSelector, childFrameSelector) {
    try {
      logger.debug(`Getting nested frame with selector ${childFrameSelector}`);
      
      // Get the parent frame if a selector was provided
      let parentFrame;
      if (typeof parentFrameOrSelector === 'string') {
        parentFrame = await this.getFrameBySelector(parentFrameOrSelector);
      } else {
        parentFrame = parentFrameOrSelector;
      }
      
      if (!parentFrame) {
        throw new Error('Parent frame not found');
      }
      
      // Find the iframe element in the parent frame
      const elementHandle = await parentFrame.$(childFrameSelector);
      
      if (!elementHandle) {
        logger.warn(`No iframe element found with selector: ${childFrameSelector}`);
        return null;
      }
      
      // Get the content frame from the element handle
      const childFrame = await elementHandle.contentFrame();
      
      if (!childFrame) {
        logger.warn(`Could not access content frame for iframe with selector: ${childFrameSelector}`);
        return null;
      }
      
      return childFrame;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting nested frame: ${error.message}`, error);
      } else {
        logger.error('Unknown error occurred getting nested frame', new Error(String(error)));
      }
      throw error;
    }
  }
}

/**
 * @typedef {Object} WaitForFrameOptions
 * @property {number} [timeout]
 * @property {'load'|'domcontentloaded'|'networkidle'} [state]
 */

module.exports = IframeUtils;
