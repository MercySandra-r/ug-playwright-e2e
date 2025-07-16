/**
 * Element Visibility Utilities
 * 
 * This module provides utilities for checking element visibility and presence.
 */

const { logger } = require('./testLogger');

// Create helper functions for logging with module prefix
const logPrefix = 'ElementVisibilityUtils';

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
 * Element Visibility Utilities
 */
class ElementVisibilityUtils {
  /**
   * Create a new ElementVisibilityUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Check if element is visible
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether element is visible
   */
  async isVisible(selector) {
    try {
      logDebug(`Checking if element is visible: ${selector}`);
      
      const element = await this.page.$(selector);
      if (!element) {
        logDebug(`Element not found: ${selector}`);
        return false;
      }
      
      return await element.isVisible();
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Error checking element visibility: ${typedError.message}`, typedError);
      return false;
    }
  }

  /**
   * Check if element is present in DOM
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether element is present
   */
  async isPresent(selector) {
    try {
      logDebug(`Checking if element is present: ${selector}`);
      
      const element = await this.page.$(selector);
      return !!element;
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Error checking element presence: ${typedError.message}`, typedError);
      return false;
    }
  }

  /**
   * Check if element is enabled
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether element is enabled
   */
  async isEnabled(selector) {
    try {
      logDebug(`Checking if element is enabled: ${selector}`);
      
      const element = await this.page.$(selector);
      if (!element) {
        logDebug(`Element not found: ${selector}`);
        return false;
      }
      
      return await element.isEnabled();
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Error checking if element is enabled: ${typedError.message}`, typedError);
      return false;
    }
  }

  /**
   * Check if element is editable
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether element is editable
   */
  async isEditable(selector) {
    try {
      logDebug(`Checking if element is editable: ${selector}`);
      
      const element = await this.page.$(selector);
      if (!element) {
        logDebug(`Element not found: ${selector}`);
        return false;
      }
      
      return await element.isEditable();
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Error checking if element is editable: ${typedError.message}`, typedError);
      return false;
    }
  }

  /**
   * Check if element is checked (for checkboxes and radio buttons)
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether element is checked
   */
  async isChecked(selector) {
    try {
      logDebug(`Checking if element is checked: ${selector}`);
      
      const element = await this.page.$(selector);
      if (!element) {
        logDebug(`Element not found: ${selector}`);
        return false;
      }
      
      return await element.isChecked();
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Error checking if element is checked: ${typedError.message}`, typedError);
      return false;
    }
  }

  /**
   * Wait for element to be visible
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').ElementHandle>} Element handle
   */
  async waitForVisible(selector, timeout = 30000) {
    try {
      logDebug(`Waiting for element to be visible: ${selector} (timeout: ${timeout}ms)`);
      return await this.page.waitForSelector(selector, { state: 'visible', timeout });
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element to be visible: ${selector}`, typedError);
      throw new Error(`Element not visible within timeout: ${selector}`);
    }
  }

  /**
   * Wait for element to be hidden
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} Element handle or null
   */
  async waitForHidden(selector, timeout = 30000) {
    try {
      logDebug(`Waiting for element to be hidden: ${selector} (timeout: ${timeout}ms)`);
      return await this.page.waitForSelector(selector, { state: 'hidden', timeout });
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element to be hidden: ${selector}`, typedError);
      throw new Error(`Element not hidden within timeout: ${selector}`);
    }
  }

  /**
   * Wait for element to be present in DOM
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').ElementHandle>} Element handle
   */
  async waitForPresent(selector, timeout = 30000) {
    try {
      logDebug(`Waiting for element to be present: ${selector} (timeout: ${timeout}ms)`);
      return await this.page.waitForSelector(selector, { state: 'attached', timeout });
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element to be present: ${selector}`, typedError);
      throw new Error(`Element not present within timeout: ${selector}`);
    }
  }

  /**
   * Wait for element to be removed from DOM
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForDetached(selector, timeout = 30000) {
    try {
      logDebug(`Waiting for element to be detached: ${selector} (timeout: ${timeout}ms)`);
      await this.page.waitForSelector(selector, { state: 'detached', timeout });
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element to be detached: ${selector}`, typedError);
      throw new Error(`Element not detached within timeout: ${selector}`);
    }
  }

  /**
   * Wait for element to be enabled
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').ElementHandle>} Element handle
   */
  async waitForEnabled(selector, timeout = 30000) {
    try {
      logDebug(`Waiting for element to be enabled: ${selector} (timeout: ${timeout}ms)`);
      
      // First wait for the element to exist
      const element = await this.waitForPresent(selector, timeout);
      
      // Poll for the element to be enabled
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (await element.isEnabled()) {
          return element;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      
      throw new Error(`Element not enabled within timeout: ${selector}`);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element to be enabled: ${selector}`, typedError);
      throw new Error(`Element not enabled within timeout: ${selector}`);
    }
  }

  /**
   * Wait for element to be disabled
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').ElementHandle>} Element handle
   */
  async waitForDisabled(selector, timeout = 30000) {
    try {
      logDebug(`Waiting for element to be disabled: ${selector} (timeout: ${timeout}ms)`);
      
      // First wait for the element to exist
      const element = await this.waitForPresent(selector, timeout);
      
      // Poll for the element to be disabled
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (!(await element.isEnabled())) {
          return element;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      
      throw new Error(`Element not disabled within timeout: ${selector}`);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element to be disabled: ${selector}`, typedError);
      throw new Error(`Element not disabled within timeout: ${selector}`);
    }
  }

  /**
   * Wait for element to have text
   * @param {string} selector - Element selector
   * @param {string|RegExp} text - Text to wait for (string or regex)
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').ElementHandle>} Element handle
   */
  async waitForText(selector, text, timeout = 30000) {
    try {
      logDebug(`Waiting for element to have text: ${selector}, text: ${text} (timeout: ${timeout}ms)`);
      
      // First wait for the element to be visible
      const element = await this.waitForVisible(selector, timeout);
      
      // Poll for the element to have the expected text
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const elementText = await element.textContent() || '';
        
        if (text instanceof RegExp) {
          if (text.test(elementText)) {
            return element;
          }
        } else if (elementText.includes(text)) {
          return element;
        }
        
        await new Promise(r => setTimeout(r, 100));
      }
      
      const actualText = await element.textContent() || '';
      throw new Error(`Element text mismatch within timeout: ${selector}, expected: ${text}, actual: ${actualText}`);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Timeout waiting for element text: ${selector}, ${text}`, typedError);
      throw new Error(`Element text mismatch: ${selector}, expected: ${text}`);
    }
  }

  /**
   * Check if element exists and is visible within a timeout
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Whether element exists and is visible
   */
  async existsWithTimeout(selector, timeout = 5000) {
    try {
      logDebug(`Checking if element exists with timeout: ${selector} (timeout: ${timeout}ms)`);
      await this.page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch (error) {
      logDebug(`Element does not exist or is not visible: ${selector}`);
      return false;
    }
  }

  /**
   * Get all visible elements matching a selector
   * @param {string} selector - Element selector
   * @returns {Promise<Array<import('@playwright/test').ElementHandle>>} Array of element handles
   */
  async getAllVisibleElements(selector) {
    try {
      logDebug(`Getting all visible elements: ${selector}`);
      
      const elements = await this.page.$$(selector);
      const visibleElements = [];
      
      for (const element of elements) {
        if (await element.isVisible()) {
          visibleElements.push(element);
        }
      }
      
      return visibleElements;
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      logError(`Error getting visible elements: ${selector}`, typedError);
      throw new Error(`Failed to get visible elements: ${selector}`);
    }
  }

  /**
   * Count visible elements matching a selector
   * @param {string} selector - Element selector
   * @returns {Promise<number>} Number of visible elements
   */
  async countVisibleElements(selector) {
    const elements = await this.getAllVisibleElements(selector);
    return elements.length;
  }
}

module.exports = ElementVisibilityUtils;
