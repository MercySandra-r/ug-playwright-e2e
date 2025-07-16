/**
 * BasePage Class
 * 
 * This class provides the foundation for all page objects in the framework.
 * It includes common functionality for element interaction, navigation, waiting,
 * and page state verification.
 * 
 * @typedef {import('@playwright/test').Page} Page
 * @typedef {import('@playwright/test').Locator} Locator
 */

const { expect } = require('@playwright/test');
const { logger } = require('../utils/testLogger');
const configLoader = require('../utils/configLoader');
const timeoutManager = require('../utils/timeoutManager');

class BasePage {
  /**
   * Create a new BasePage instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {string} pageName - Name of the page for logging
   */
  /**
   * Create a new BasePage instance
   * @param {Page} page - Playwright page object
   * @param {string} [pageName='BasePage'] - Name of the page for logging
   */
  constructor(page, pageName = 'BasePage') {
    /** @type {Page} */
    this.page = page;
    /** @type {string} */
    this.pageName = pageName;
    /** @type {import('../utils/testLogger').Logger} */
    this.logger = logger;
    /** @type {string} */
    this.baseUrl = configLoader.getBaseUrl() || '';
    
    // Default timeouts with fallbacks
    /** @type {number} */
    this.navigationTimeout = timeoutManager.getTimeout('navigation') || 30000;
    /** @type {number} */
    this.actionTimeout = timeoutManager.getTimeout('action') || 10000;
    /** @type {number} */
    this.assertionTimeout = timeoutManager.getTimeout('assertion') || 10000;
  }

  /**
   * Navigate to a specific URL
   * @param {string} url - URL to navigate to
   * @returns {Promise<void>}
   */
  async navigate(url) {
    this.logger.info(`Navigating to ${url}`);
    await this.page.goto(url, { timeout: this.navigationTimeout });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a relative path within the application
   * @param {string} path - Relative path
   * @returns {Promise<void>}
   */
  async navigateTo(path) {
    const url = `${this.baseUrl}${path}`;
    await this.navigate(url);
  }

  /**
   * Get the current URL
   * @returns {string} Current URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Verify the current page URL contains specific text
   * @param {string} urlText - Text that should be present in URL
   * @returns {Promise<void>}
   */
  async verifyUrl(urlText) {
    this.logger.debug(`Verifying URL contains: ${urlText}`);
    await expect(this.page).toHaveURL(new RegExp(urlText), { timeout: this.assertionTimeout });
  }

  /**
   * Verify page title
   * @param {string|RegExp} title - Expected title or pattern
   * @returns {Promise<void>}
   */
  async verifyTitle(title) {
    this.logger.debug(`Verifying page title: ${title}`);
    await expect(this.page).toHaveTitle(title, { timeout: this.assertionTimeout });
  }

  /**
   * Click on an element
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async click(selector) {
    this.logger.debug(`Clicking element: ${selector}`);
    await this.page.click(selector, { timeout: this.actionTimeout });
  }

  /**
   * Double-click on an element
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async doubleClick(selector) {
    this.logger.debug(`Double-clicking element: ${selector}`);
    await this.page.dblclick(selector, { timeout: this.actionTimeout });
  }

  /**
   * Right-click on an element
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async rightClick(selector) {
    this.logger.debug(`Right-clicking element: ${selector}`);
    await this.page.click(selector, { button: 'right', timeout: this.actionTimeout });
  }

  /**
   * Hover over an element
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async hover(selector) {
    this.logger.debug(`Hovering over element: ${selector}`);
    await this.page.hover(selector, { timeout: this.actionTimeout });
  }

  /**
   * Type text into an element
   * @param {string} selector - Element selector
   * @param {string} text - Text to type
   * @param {boolean} clearFirst - Whether to clear the field first
   * @returns {Promise<void>}
   */
  async type(selector, text, clearFirst = true) {
    this.logger.debug(`Typing "${text}" into ${selector}`);
    
    if (clearFirst) {
      await this.page.fill(selector, '', { timeout: this.actionTimeout });
    }
    
    await this.page.type(selector, text, { timeout: this.actionTimeout });
  }

  /**
   * Fill a form field with text (replaces existing content)
   * @param {string} selector - Element selector
   * @param {string} text - Text to fill
   * @returns {Promise<void>}
   */
  async fill(selector, text) {
    this.logger.debug(`Filling "${text}" into ${selector}`);
    await this.page.fill(selector, text, { timeout: this.actionTimeout });
  }

  /**
   * Clear text from an input field
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async clearField(selector) {
    this.logger.debug(`Clearing text field: ${selector}`);
    await this.page.fill(selector, '', { timeout: this.actionTimeout });
  }

  /**
   * Select an option from a dropdown
   * @param {string} selector - Dropdown selector
   * @param {string} value - Value to select
   * @returns {Promise<void>}
   */
  async selectOption(selector, value) {
    this.logger.debug(`Selecting option "${value}" in dropdown ${selector}`);
    await this.page.selectOption(selector, value, { timeout: this.actionTimeout });
  }

  /**
   * Select an option by visible text
   * @param {string} selector - Dropdown selector
   * @param {string} text - Text of the option to select
   * @returns {Promise<void>}
   */
  async selectByText(selector, text) {
    this.logger.debug(`Selecting option with text "${text}" in dropdown ${selector}`);
    
    // Open the dropdown
    await this.click(selector);
    
    // Find and click the option with matching text
    const optionSelector = `${selector} option, ${selector} >> xpath=.//*[contains(text(), "${text}")]`;
    await this.click(optionSelector);
  }

  /**
   * Check a checkbox or radio button
   * @param {string} selector - Element selector
   * @param {boolean} check - Whether to check or uncheck
   * @returns {Promise<void>}
   */
  async setChecked(selector, check = true) {
    this.logger.debug(`Setting checked state of ${selector} to ${check}`);
    await this.page.setChecked(selector, check, { timeout: this.actionTimeout });
  }

  /**
   * Upload a file
   * @param {string} selector - File input selector
   * @param {string} filePath - Path to the file
   * @returns {Promise<void>}
   */
  async uploadFile(selector, filePath) {
    this.logger.debug(`Uploading file ${filePath} to ${selector}`);
    await this.page.setInputFiles(selector, filePath, { timeout: this.actionTimeout });
  }

  /**
   * Get text content of an element
   * @param {string} selector - Element selector
   * @returns {Promise<string>} Element text content (empty string if not found)
   */
  async getText(selector) {
    this.logger.debug(`Getting text from element: ${selector}`);
    const text = await this.page.textContent(selector, { timeout: this.actionTimeout });
    return text || ''; // Return empty string if null/undefined
  }

  /**
   * Get attribute value of an element
   * @param {string} selector - Element selector
   * @param {string} attributeName - Name of the attribute
   * @returns {Promise<string>} Attribute value (empty string if not found)
   */
  async getAttribute(selector, attributeName) {
    this.logger.debug(`Getting attribute "${attributeName}" from element: ${selector}`);
    const value = await this.page.getAttribute(selector, attributeName, { timeout: this.actionTimeout });
    return value || ''; // Return empty string if null/undefined
  }

  /**
   * Check if an element is visible
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether the element is visible
   */
  async isVisible(selector) {
    this.logger.debug(`Checking if element is visible: ${selector}`);
    return await this.page.isVisible(selector, { timeout: this.assertionTimeout });
  }

  /**
   * Wait for an element to be visible
   * @param {string} selector - Element selector
   * @param {number} [timeout] - Optional custom timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForVisible(selector, timeout) {
    this.logger.debug(`Waiting for element to be visible: ${selector}`);
    const effectiveTimeout = timeout ?? this.actionTimeout;
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: effectiveTimeout
    });
  }

  /**
   * Wait for an element to be hidden
   * @param {string} selector - Element selector
   * @param {number} [timeout] - Optional custom timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForElementToBeHidden(selector, timeout) {
    const effectiveTimeout = timeout ?? this.assertionTimeout;
    this.logger.debug(`Waiting for element to be hidden: ${selector} (timeout: ${effectiveTimeout}ms)`);
    await this.page.waitForSelector(selector, { 
      state: 'hidden', 
      timeout: effectiveTimeout 
    });
  }

  /**
   * Wait for navigation to complete
   * @param {string} selector - Element selector
   * @param {number} [timeout] - Optional custom timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForElement(selector, timeout) {
    return this.waitForVisible(selector, timeout);
  }

  /**
   * Wait for a specific navigation event
   * @param {Function} navigationPromise - Promise that resolves after navigation
   * @returns {Promise<void>}
   */
  async waitForNavigation(navigationPromise) {
    this.logger.debug('Waiting for navigation');
    await Promise.all([
      this.page.waitForNavigation({ timeout: this.navigationTimeout }),
      navigationPromise
    ]);
  }

  /**
   * Press a keyboard key
   * @param {string} key - Key to press (e.g., 'Enter', 'Tab', etc.)
   * @returns {Promise<void>}
   */
  async pressKey(key) {
    this.logger.debug(`Pressing key: ${key}`);
    await this.page.keyboard.press(key);
  }

  /**
   * Take a screenshot
   * @param {string} name - Screenshot name
   * @returns {Promise<string>} Path to the screenshot
   */
  async takeScreenshot(name) {
    const screenshotPath = `screenshots/${this.pageName}_${name}_${Date.now()}.png`;
    this.logger.debug(`Taking screenshot: ${screenshotPath}`);
    await this.page.screenshot({ path: screenshotPath });
    return screenshotPath;
  }

  /**
   * Verify an element contains specific text
   * @param {string} selector - Element selector
   * @param {string|RegExp} text - Text to verify
   * @returns {Promise<void>}
   */
  async verifyElementText(selector, text) {
    this.logger.debug(`Verifying element ${selector} contains text: ${text}`);
    const locator = this.page.locator(selector);
    await expect(locator).toContainText(text, { timeout: this.assertionTimeout });
  }

  /**
   * Verify an element has a specific attribute value
   * @param {string} selector - Element selector
   * @param {string} attributeName - Attribute name
   * @param {string|RegExp} value - Expected attribute value
   * @returns {Promise<void>}
   */
  async verifyAttribute(selector, attributeName, value) {
    this.logger.debug(`Verifying element ${selector} has attribute ${attributeName}=${value}`);
    const locator = this.page.locator(selector);
    await expect(locator).toHaveAttribute(attributeName, value, { timeout: this.assertionTimeout });
  }

  /**
   * Verify element is enabled
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async verifyElementEnabled(selector) {
    this.logger.debug(`Verifying element ${selector} is enabled`);
    const locator = this.page.locator(selector);
    await expect(locator).toBeEnabled({ timeout: this.assertionTimeout });
  }

  /**
   * Verify element is disabled
   * @param {string} selector - Element selector
   * @returns {Promise<void>}
   */
  async verifyElementDisabled(selector) {
    this.logger.debug(`Verifying element ${selector} is disabled`);
    const locator = this.page.locator(selector);
    await expect(locator).toBeDisabled({ timeout: this.assertionTimeout });
  }

  /**
   * Verify page state by checking presence of key elements
   * @param {Array<string>} selectors - Array of element selectors that should be present
   * @returns {Promise<boolean>} Whether the page is in expected state
   */
  async verifyPageState(selectors) {
    this.logger.info(`Verifying page state for ${this.pageName}`);
    
    for (const selector of selectors) {
      try {
        await this.waitForElement(selector);
      } catch (error) {
        this.logger.error(`Page state verification failed: Element not found: ${selector}`);
        return false;
      }
    }
    
    this.logger.info('Page state verification successful');
    return true;
  }
}

module.exports = BasePage;
