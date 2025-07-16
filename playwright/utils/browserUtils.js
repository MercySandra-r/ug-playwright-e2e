/**
 * Browser Utilities
 * 
 * This module provides browser-related utility functions for working with:
 * - JavaScript execution
 * - Window/tab management
 * - Alert/dialog handling
 * - Browser storage (localStorage, sessionStorage)
 * - Cookie management
 * 
 * @typedef {import('@playwright/test').Page} Page
 * @typedef {import('@playwright/test').BrowserContext} BrowserContext
 * @typedef {import('@playwright/test').Dialog} Dialog
 * @typedef {import('@playwright/test').Cookie} Cookie
 */

// Import logger
const { logger } = require('./testLogger');

/**
 * Centralized error handling for browser utilities
 * @param {string} method - Name of the method where the error occurred
 * @param {unknown} error - The error that was caught
 * @returns {never} - Always throws an error
 * @throws {Error} Always throws an error with the formatted message
 */
/**
 * Centralized error handling for browser utilities
 * @param {string} method - Name of the method where the error occurred
 * @param {unknown} error - The error that was caught
 * @returns {never} - Always throws an error
 * @throws {Error} Always throws an error with the formatted message
 */
function handleError(method, error) {
  let errorMessage = `Error in ${method}: `;
  
  if (error instanceof Error) {
    errorMessage += error.message;
    // Create a new error to ensure stack trace is preserved
    const newError = new Error(errorMessage);
    newError.stack = error.stack;
    newError.name = error.name;
    
    // Add original error as a property (non-enumerable to avoid circular references)
    Object.defineProperty(newError, 'originalError', {
      value: error,
      enumerable: false,
      writable: true,
      configurable: true
    });
    
    moduleLogger.error(errorMessage, newError);
    throw newError;
  } 
  
  if (typeof error === 'string') {
    errorMessage += error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage += String(error.message);
  } else {
    errorMessage += 'Unknown error occurred';
  }
  
  const newError = new Error(errorMessage);
  moduleLogger.error(errorMessage, newError);
  throw newError;
}

/** @type {import('./testLogger').Logger} */
const moduleLogger = {
  /** @param {string} message */
  info: (message) => logger.info(message),
  /** @param {string} message */
  warn: (message) => logger.warn(message),
  /** 
   * @param {string} message 
   * @param {Error|unknown} [error] 
   */
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(message, error);
    } else if (error) {
      logger.error(`${message} - ${String(error)}`);
    } else {
      logger.error(message);
    }
  },
  /** @param {string} message */
  debug: (message) => logger.debug(message)
};

/**
 * JavaScript execution utilities
 */
class JSExecutor {
  /**
   * Create a new JSExecutor instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {import('@playwright/test').BrowserContext} [context] - Optional browser context
   */
  constructor(page, context) {
    this.page = page;
    this.context = context || page.context();
  }

  /**
   * Execute JavaScript in the page context
   * @template T
   * @param {string} script - JavaScript code to execute
   * @param {...any} args - Arguments to pass to the script
   * @returns {Promise<T>} Result of the script execution
   */
  async executeScript(script, ...args) {
    try {
      moduleLogger.debug(`Executing script: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
      return await this.page.evaluate(script, ...args);
    } catch (error) {
      return handleError('executeScript', error);
    }
  }

  /**
   * Execute JavaScript and wait for page load
   * @template T
   * @param {string} script - JavaScript code to execute
   * @param {...any} args - Arguments to pass to the script
   * @returns {Promise<T>} Result of the script execution
   */
  async executeScriptWithPageLoad(script, ...args) {
    try {
      moduleLogger.debug(`Executing script with page load: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
      const navigationPromise = this.page.waitForNavigation();
      const result = await this.page.evaluate(script, ...args);
      await navigationPromise;
      return result;
    } catch (error) {
      return handleError('executeScriptWithPageLoad', error);
    }
  }

  /**
   * Execute async JavaScript in the page context
   * @template T
   * @param {string} script - Async JavaScript code to execute
   * @param {...any} args - Arguments to pass to the script
   * @returns {Promise<T>} Result of the async script execution
   */
  /**
   * Execute async JavaScript in the page context
   * @template T
   * @param {string} script - Async JavaScript code to execute
   * @param {...any} args - Arguments to pass to the script
   * @returns {Promise<T>} Result of the async script execution
   */
  /**
   * Execute async JavaScript in the page context
   * @template T
   * @param {string} script - Async JavaScript code to execute
   * @param {...any} args - Arguments to pass to the script
   * @returns {Promise<import('@playwright/test').JSHandle<T>>} Handle to the result of the async script execution
   */
  async executeAsyncScript(script, ...args) {
    try {
      moduleLogger.debug(`Executing async script: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
      return await this.page.evaluateHandle(script, ...args);
    } catch (error) {
      return handleError('executeAsyncScript', error);
    }
  }

  /**
   * Scroll element into view
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  /**
   * Scroll element into view
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} True if element was found and scrolled into view
   */
  async scrollIntoView(selector) {
    try {
      moduleLogger.debug(`Scrolling element into view: ${selector}`);
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      }, selector);
    } catch (error) {
      return handleError('scrollIntoView', error);
    }
  }

  /**
   * Highlight an element on the page
   * @param {string} selector - Element selector
   * @param {string} color - Highlight color (default: red)
   * @param {number} duration - Duration in milliseconds (default: 1000)
   * @returns {Promise<void>}
   */
  /**
   * Highlight an element on the page
   * @param {string} selector - Element selector
   * @param {string} [color='red'] - Highlight color
   * @param {number} [duration=1000] - Highlight duration in milliseconds
   * @returns {Promise<boolean>} True if element was found and highlighted
   */
  async highlightElement(selector, color = 'red', duration = 1000) {
    try {
      moduleLogger.debug(`Highlighting element: ${selector}`);
      return await this.page.evaluate(({ sel, clr, dur }) => {
        const element = document.querySelector(sel);
        if (element) {
          const originalStyle = element.getAttribute('style') || '';
          element.setAttribute(
            'style',
            `${originalStyle}; border: 2px solid ${clr} !important; background-color: rgba(255, 0, 0, 0.2) !important`
          );
          setTimeout(() => {
            element.setAttribute('style', originalStyle);
          }, dur);
          return true;
        }
        return false;
      }, { sel: selector, clr: color, dur: duration });
    } catch (error) {
      moduleLogger.error('Error highlighting element', error instanceof Error ? error : new Error(String(error)));
      return false; // Don't throw error as this is a visual aid only
    }
  }

  /**
   * Get page dimensions
   * @returns {Promise<{width: number, height: number}>} Page dimensions
   */
  /**
   * Get page dimensions
   * @returns {Promise<{width: number, height: number}>} Object containing width and height
   */
  async getPageDimensions() {
    try {
      moduleLogger.debug('Getting page dimensions');
      const dimensions = await this.page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      }));
      
      if (!dimensions || typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number') {
        throw new Error('Failed to retrieve valid page dimensions');
      }
      
      return dimensions;
    } catch (error) {
      return handleError('getPageDimensions', error);
    }
  }

  /**
   * Wait for a condition to be true
   * @param {() => boolean | Promise<boolean>} condition - Function that returns a boolean or Promise<boolean>
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @param {string} [timeoutMsg='Condition not met within timeout'] - Error message for timeout
   * @param {number} [interval=500] - Polling interval in milliseconds
   * @returns {Promise<boolean>} True if condition is met, false otherwise
   */
  /**
   * Wait for a condition to be true
   * @template T
   * @param {() => T | Promise<T>} condition - Function that returns a truthy value when condition is met
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @param {string} [timeoutMsg='Condition not met within timeout'] - Error message for timeout
   * @param {number} [interval=500] - Polling interval in milliseconds
   * @returns {Promise<boolean>} True if condition is met within timeout
   */
  /**
   * Wait for a condition to be true
   * @template T
   * @param {() => T | Promise<T>} condition - Function that returns a truthy value when condition is met
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @param {string} [timeoutMsg='Condition not met within timeout'] - Error message for timeout
   * @param {number} [interval=500] - Polling interval in milliseconds
   * @returns {Promise<boolean>} True if condition is met within timeout
   */
  async waitForCondition(condition, timeout = 5000, timeoutMsg = 'Condition not met within timeout', interval = 500) {
    try {
      moduleLogger.debug(`Waiting for condition with ${timeout}ms timeout`);
      await this.page.waitForFunction(condition, { timeout, polling: interval });
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError') {
        moduleLogger.warn(timeoutMsg);
        return false;
      }
      return handleError('waitForCondition', error);
    }
  }

  /**
   * Get the current page URL
   * @returns {Promise<string>} The current page URL
   */
  async getCurrentUrl() {
    try {
      return await this.page.url();
    } catch (error) {
      return handleError('getCurrentUrl', error);
    }
  }
}

/**
 * Cookie management utilities
 */
class CookieManager {
  /**
   * Create a new CookieManager instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {import('@playwright/test').BrowserContext} [context] - Optional browser context
   */
  constructor(page, context) {
    this.page = page;
    this.context = context || page.context();
  }

  /**
   * Get all cookies from the browser context
   * @returns {Promise<import('@playwright/test').Cookie[]>} Array of cookies
   */
  async getAllCookies() {
    try {
      moduleLogger.debug('Getting all cookies');
      return await this.context.cookies();
    } catch (error) {
      return handleError('getAllCookies', error);
    }
  }

  /**
   * Get cookies for a specific URL
   * @param {string} url - URL to get cookies for
   * @returns {Promise<import('@playwright/test').Cookie[]>} Array of cookies for the URL
   */
  async getCookiesForUrl(url) {
    try {
      moduleLogger.debug(`Getting cookies for URL: ${url}`);
      return await this.context.cookies(url);
    } catch (error) {
      return handleError('getCookiesForUrl', error);
    }
  }

  /**
   * Get a specific cookie by name
   * @param {string} name - Name of the cookie to get
   * @returns {Promise<import('@playwright/test').Cookie | null>} The cookie if found, null otherwise
   */
  async getCookie(name) {
    try {
      moduleLogger.debug(`Getting cookie: ${name}`);
      const cookies = await this.context.cookies();
      return cookies.find(cookie => cookie.name === name) || null;
    } catch (error) {
      return handleError('getCookie', error);
    }
  }

  /**
   * Add multiple cookies to the browser context
   * @param {import('@playwright/test').Cookie[]} cookies - Array of cookies to add
   * @returns {Promise<void>}
   */
  async addCookies(cookies) {
    if (!Array.isArray(cookies)) {
      throw new Error('Cookies must be an array');
    }
    
    try {
      moduleLogger.debug(`Adding ${cookies.length} cookies`);
      await this.context.addCookies(cookies);
    } catch (error) {
      return handleError('addCookies', error);
    }
  }

  /**
   * Clear all cookies from the browser context
   * @returns {Promise<void>}
   */
  async clearAllCookies() {
    try {
      moduleLogger.debug('Clearing all cookies');
      await this.context.clearCookies();
    } catch (error) {
      return handleError('clearAllCookies', error);
    }
  }

  /**
   * Wait for a specific cookie to be set
   * @param {string} name - Cookie name
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').Cookie | null>} Cookie object if found, null otherwise
   */
  async waitForCookie(name, timeout = 5000) {
    try {
      moduleLogger.debug(`Waiting for cookie: ${name} with timeout: ${timeout}ms`);
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const cookie = await this.getCookie(name);
        if (cookie) {
          return cookie;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      
      throw new Error(`Timeout waiting for cookie: ${name}`);
    } catch (error) {
      if (error instanceof Error) {
        moduleLogger.error(`Error waiting for cookie: ${error.message}`, error);
      } else {
        moduleLogger.error(`Error waiting for cookie: ${String(error)}`);
      }
      throw error;
    }
  }
}

/**
 * Window/tab management utilities
 */
class WindowManager {
  /**
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {import('@playwright/test').BrowserContext} [context] - Optional browser context
   */
  constructor(page, context) {
    this.page = page;
    this.context = context || page.context();
    this.pages = [page];
  }

  /**
   * Open a URL in a new tab
   * @param {string} url - URL to open
   * @returns {Promise<import('@playwright/test').Page>} New page object
   */
  async openInNewTab(url) {
    try {
      moduleLogger.debug(`Opening URL in new tab: ${url}`);
      const pagePromise = this.context.waitForEvent('page');
      await this.page.evaluate((targetUrl) => {
        window.open(targetUrl, '_blank');
      }, url);
      
      const newPage = await pagePromise;
      await newPage.waitForLoadState('networkidle');
      this.pages.push(newPage);
      return newPage;
    } catch (error) {
      return handleError('openInNewTab', error);
    }
  }

  /**
   * Close a specific tab
   * @param {number} index - Index of the tab to close
   * @returns {Promise<void>}
   */
  async closeTab(index) {
    try {
      const pageToClose = this.pages[index];
      if (!pageToClose) {
        throw new Error(`No tab found at index ${index}`);
      }
      
      moduleLogger.debug(`Closing tab at index ${index}`);
      await pageToClose.close();
      this.pages = this.pages.filter(page => page !== pageToClose);
    } catch (error) {
      return handleError('closeTab', error);
    }
  }

  /**
   * Switch to a specific tab
   * @param {number} index - Index of the tab to switch to
   * @returns {Promise<import('@playwright/test').Page>} Active page object
   */
  async switchToTab(index) {
    try {
      const targetPage = this.pages[index];
      if (!targetPage) {
        throw new Error(`No tab found at index ${index}`);
      }
      
      moduleLogger.debug(`Switching to tab at index ${index}`);
      await targetPage.bringToFront();
      return targetPage;
    } catch (error) {
      return handleError('switchToTab', error);
    }
  }
}

/**
 * Alert/dialog handling utilities
 */
class DialogHandler {
  /**
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
    /** @type {Promise<import('@playwright/test').Dialog> | null} */
    this.dialogPromise = null;
    /** @type {((value: import('@playwright/test').Dialog) => void) | null} */
    this.dialogResolver = null;
    /** @type {'accept' | 'dismiss'} */
    this.defaultAction = 'accept';
    this.setupDialogListener();
  }

  /**
   * Set up listener for dialogs
   */
  setupDialogListener() {
    this.page.on('dialog', async (dialog) => {
      moduleLogger.debug(`Dialog detected: ${dialog.type()}, message: ${dialog.message()}`);
      
      if (this.dialogResolver) {
        this.dialogResolver(dialog);
        this.dialogPromise = null;
        this.dialogResolver = null;
      } else if (this.defaultAction === 'accept') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Wait for a dialog to appear
   * @param {number} [timeoutMs=5000] - Timeout in milliseconds
   * @returns {Promise<import('@playwright/test').Dialog>} Dialog object
   */
  async waitForDialog(timeoutMs = 5000) {
    try {
      const timeoutValue = Number(timeoutMs) || 5000;
      moduleLogger.debug(`Waiting for dialog with timeout: ${timeoutValue}ms`);
      
      return await new Promise((resolve, reject) => {
        /** @param {import('@playwright/test').Dialog} dialog */
        const dialogHandler = (dialog) => {
          moduleLogger.debug(`Dialog detected: ${dialog.type()}, message: ${dialog.message()}`);
          cleanup();
          resolve(dialog);
        };
        
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout of ${timeoutValue}ms exceeded while waiting for dialog`));
        }, timeoutValue);
        
        const cleanup = () => {
          this.page.off('dialog', dialogHandler);
          clearTimeout(timeoutId);
        };
        
        // Set up the dialog handler
        this.page.on('dialog', dialogHandler);
      });
    } catch (error) {
      return handleError('waitForDialog', error);
    }
  }
}

/**
 * Storage management utilities
 */
class StorageManager {
  /**
   * Create a new StorageManager instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Get a value from localStorage
   * @param {string} key - The key to get
   * @returns {Promise<string | null>} The stored value or null if not found
   */
  async getLocalStorageItem(key) {
    try {
      moduleLogger.debug(`Getting localStorage item: ${key}`);
      return await this.page.evaluate((k) => localStorage.getItem(k), key);
    } catch (error) {
      return handleError('getLocalStorageItem', error);
    }
  }

  /**
   * Set a value in localStorage
   * @param {string} key - The key to set
   * @param {string} value - The value to store
   * @returns {Promise<void>}
   */
  async setLocalStorageItem(key, value) {
    try {
      moduleLogger.debug(`Setting localStorage item: ${key} = ${value}`);
      await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    } catch (error) {
      return handleError('setLocalStorageItem', error);
    }
  }

  /**
   * Remove a value from localStorage
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async removeLocalStorageItem(key) {
    try {
      moduleLogger.debug(`Removing localStorage item: ${key}`);
      await this.page.evaluate((k) => localStorage.removeItem(k), key);
    } catch (error) {
      return handleError('removeLocalStorageItem', error);
    }
  }

  /**
   * Clear all localStorage
   * @returns {Promise<void>}
   */
  async clearLocalStorage() {
    try {
      moduleLogger.debug('Clearing localStorage');
      await this.page.evaluate(() => localStorage.clear());
    } catch (error) {
      return handleError('clearLocalStorage', error);
    }
  }

  /**
   * Get a value from sessionStorage
   * @param {string} key - The key to get
   * @returns {Promise<string | null>} The stored value or null if not found
   */
  async getSessionStorageItem(key) {
    try {
      moduleLogger.debug(`Getting sessionStorage item: ${key}`);
      return await this.page.evaluate((k) => sessionStorage.getItem(k), key);
    } catch (error) {
      return handleError('getSessionStorageItem', error);
    }
  }

  /**
   * Set a value in sessionStorage
   * @param {string} key - The key to set
   * @param {string} value - The value to store
   * @returns {Promise<void>}
   */
  async setSessionStorageItem(key, value) {
    try {
      moduleLogger.debug(`Setting sessionStorage item: ${key} = ${value}`);
      await this.page.evaluate(
        ([k, v]) => sessionStorage.setItem(k, v),
        [key, value]
      );
    } catch (error) {
      return handleError('setSessionStorageItem', error);
    }
  }

  /**
   * Remove a value from sessionStorage
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async removeSessionStorageItem(key) {
    try {
      moduleLogger.debug(`Removing sessionStorage item: ${key}`);
      await this.page.evaluate((k) => sessionStorage.removeItem(k), key);
    } catch (error) {
      return handleError('removeSessionStorageItem', error);
    }
  }

  /**
   * Clear all sessionStorage
   * @returns {Promise<void>}
   */
  async clearSessionStorage() {
    try {
      moduleLogger.debug('Clearing sessionStorage');
      await this.page.evaluate(() => sessionStorage.clear());
    } catch (error) {
      return handleError('clearSessionStorage', error);
    }
  }
}

/**
 * Browser Utils class combining all utilities
 */
class BrowserUtils {
  /**
   * Create a new BrowserUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {import('@playwright/test').BrowserContext} context - Playwright browser context
   */
  constructor(page, context) {
    this.page = page;
    this.context = context;
    
    // Initialize utilities
    this.js = new JSExecutor(page);
    this.window = new WindowManager(page, context);
    this.dialog = new DialogHandler(page);
    this.storage = new StorageManager(page);
    this.cookie = new CookieManager(page, context);
  }
}

/**
 * Factory function to create a BrowserUtils instance
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {import('@playwright/test').BrowserContext} [context] - Optional browser context
 * @returns {BrowserUtils} New BrowserUtils instance
 */
function createBrowserUtils(page, context) {
  return new BrowserUtils(page, context || page.context());
}

// Export individual utilities for direct use
module.exports = {
  JSExecutor,
  WindowManager,
  DialogHandler,
  StorageManager,
  CookieManager,
  BrowserUtils,
  createBrowserUtils
};
