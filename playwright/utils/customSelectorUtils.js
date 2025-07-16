/**
 * Custom Selector Utilities
 * 
 * This module provides utilities for creating and using custom selectors
 * beyond the standard CSS and XPath selectors provided by Playwright.
 */

// @ts-check

// Type imports for better type checking
/** @typedef {import('@playwright/test').Locator} Locator */
/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('@playwright/test').ElementHandle} ElementHandle */
/** @typedef {import('@playwright/test').JSHandle} JSHandle */

// Import logger
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
  info: (message) => logger.info(`[CustomSelectorUtils] ${message}`),
  warn: (message) => logger.warn(`[CustomSelectorUtils] ${message}`),
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(`[CustomSelectorUtils] ${message}`, error);
    } else if (error) {
      logger.error(`[CustomSelectorUtils] ${message} - ${String(error)}`);
    } else {
      logger.error(`[CustomSelectorUtils] ${message}`);
    }
  },
  debug: (message) => logger.debug(`[CustomSelectorUtils] ${message}`)
};

/**
 * Custom Selector Utilities
 */
class CustomSelectorUtils {
  /**
   * Create a new CustomSelectorUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Find element by text content
   * @param {string} text - Text to search for
   * @param {string} [tag='*'] - HTML tag to search within
   * @param {boolean} [exact=false] - Whether to match exact text or partial text
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} Element handle or null
   */
  /**
   * Find element by text content
   * @param {string} text - Text to search for
   * @param {string} [tag='*'] - HTML tag to search within
   * @param {boolean} [exact=false] - Whether to match exact text or partial text
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} Element handle or null
   */
  async getByText(text, tag = '*', exact = false) {
    try {
      if (typeof text !== 'string') {
        throw new TypeError('Text parameter must be a string');
      }
      
      const escapedText = text.replace(/"/g, '\\"');
      const selector = exact
        ? `//${tag}[normalize-space()="${escapedText}"]`
        : `//${tag}[contains(normalize-space(), "${escapedText}")]`;
      
      // Wait for the element to be attached to the DOM
      await this.page.waitForSelector(`xpath=${selector}`, { state: 'attached' });
      
      return await this.page.$(`xpath=${selector}`);
    } catch (error) {
      const errorMessage = `Failed to find element by text: ${text}`;
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all elements by text content (exact or partial match)
   * @param {string} text - Text to search for
   * @param {string} [tag='*'] - HTML tag to search within
   * @param {boolean} [exact=false] - Whether to match exact text or partial text
   * @returns {Promise<import('@playwright/test').ElementHandle<Element>[]>} Array of element handles
   */
  async getAllByText(text, tag = '*', exact = false) {
    try {
      if (typeof text !== 'string') {
        throw new TypeError('Text parameter must be a string');
      }
      
      const escapedText = text.replace(/"/g, '\\"');
      const selector = exact
        ? `//${tag}[normalize-space()="${escapedText}"]`
        : `//${tag}[contains(normalize-space(), "${escapedText}")]`;
      
      // Wait for at least one element to be present
      await this.page.waitForSelector(`xpath=${selector}`, { state: 'attached' });
      
      const elements = await this.page.$$(`xpath=${selector}`);
      
      if (!elements || elements.length === 0) {
        throw new Error(`No elements found with text: ${text}`);
      }
      
      return elements;
    } catch (error) {
      const errorMessage = `Failed to find elements by text: ${text}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }

  /**
   * Get element by test ID
   * @param {string} testId - Test ID to search for
   * @param {string} [testIdAttribute='data-testid'] - Test ID attribute name
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} Element handle or null
   */
  async getByTestId(testId, testIdAttribute = 'data-testid') {
    try {
      if (typeof testId !== 'string') {
        throw new TypeError('Test ID must be a string');
      }
      
      // First try to find with the exact test ID attribute
      const selector = `[${testIdAttribute}="${testId}"]`;
      
      // Wait for the element to be attached to the DOM
      await this.page.waitForSelector(selector, { 
        state: 'attached',
        timeout: 10000 // 10 seconds timeout
      });
      
      return await this.page.$(selector);
    } catch (error) {
      const errorMessage = `Failed to find element with test ID: ${testId}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }

  /**
   * Get element by label text
   * @param {string} labelText - The text of the label element
   * @param {string} [tag='*'] - The type of form element to find (input, select, textarea, etc.)
   * @returns {Promise<import('@playwright/test').ElementHandle<Element>|null>} The found element or null
   */
  async getByLabel(labelText, tag = '*') {
    try {
      if (typeof labelText !== 'string') {
        throw new TypeError('Label text must be a string');
      }

      // First try to find the label by exact text
      const label = await this.page.$(`label:has-text("${labelText}")`);
      
      if (label) {
        // If we found a label, get its 'for' attribute to find the associated input
        const forId = await label.getAttribute('for');
        if (forId) {
          return await this.page.$(`#${forId}`);
        }
        
        // If no 'for' attribute, look for a nested input
        const nestedInput = await label.$(tag);
        if (nestedInput) {
          return nestedInput;
        }
      }
      
      // If no label found or no associated input, try to find by aria-label or aria-labelledby
      const ariaSelector = `[aria-label="${labelText}"], ` +
                         `[aria-labelledby*="${labelText}"], ` +
                         `${tag}[placeholder*="${labelText}"]`;
      
      await this.page.waitForSelector(ariaSelector, { 
        state: 'attached',
        timeout: 10000 // 10 seconds timeout
      });
      
      return await this.page.$(ariaSelector);
    } catch (error) {
      const errorMessage = `Failed to find element with label: ${labelText}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element by placeholder text
   * @param {string} placeholderText - Placeholder text to search for
   * @param {boolean} [exact=false] - Whether to match exact text or partial text
   * @returns {Promise<ElementHandle|null>} Element handle or null
   */
  async getByPlaceholder(placeholderText, exact = false) {
    try {
      logger.debug(`Finding element by ${exact ? 'exact' : 'partial'} placeholder: "${placeholderText}"`);
      
      const selector = exact
        ? `[placeholder="${placeholderText}"]`
        : `[placeholder*="${placeholderText}"]`;
      
      return await this.page.$(selector);
    } catch (error) {
      const errorMessage = `Failed to find element by placeholder: ${placeholderText}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element by title attribute
   * @param {string} titleText - Title text to search for
   * @param {boolean} [exact=false] - Whether to match exact text or partial text
   * @returns {Promise<ElementHandle|null>} Element handle or null
   */
  async getByTitle(titleText, exact = false) {
    try {
      logger.debug(`Finding element by ${exact ? 'exact' : 'partial'} title: "${titleText}"`);
      
      const selector = exact
        ? `[title="${titleText}"]`
        : `[title*="${titleText}"]`;
      
      return await this.page.$(selector);
    } catch (error) {
      const errorMessage = `Failed to find element by title: ${titleText}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element by ARIA role
   * @param {string} role - ARIA role to search for (e.g., 'button', 'link', 'textbox')
   * @param {string} [name] - Accessible name
   * @param {boolean} [exact=true] - Whether to match exact name
   * @returns {Promise<Locator|null>} Locator or null
   * @private
   */
  async getByRole(role, name, exact = true) {
    // Cast the role to any to bypass TypeScript's strict type checking
    // since we want to allow any string as role for maximum flexibility
    const roleAsAny = /** @type {any} */ (role);
    try {
      if (name) {
        moduleLogger.debug(`Finding element by role: "${role}" and ${exact ? 'exact' : 'partial'} name: "${name}"`);
      } else {
        moduleLogger.debug(`Finding element by role: "${role}"`);
      }
      
      const options = name ? { name, exact } : {};
      return this.page.getByRole(roleAsAny, options);
    } catch (error) {
      const errorMessage = `Failed to find element by role: ${role}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }

  /**
   * Find an input element by its name attribute
   * @param {string} name - Input name attribute
   * @returns {Promise<ElementHandle|null>} Element handle or null
   */
  async getInputByName(name) {
    try {
      moduleLogger.debug(`Finding input by name: "${name}"`);
      
      return await this.page.$(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
    } catch (error) {
      const errorMessage = `Failed to find input by name: ${name}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find nth element matching a selector
   * @param {string} selector - CSS or XPath selector
   * @param {number} index - Zero-based index
   * @returns {Promise<ElementHandle|null>} Element handle or null
   */
  async getNthElement(selector, index) {
    try {
      logger.debug(`Finding ${index}th element matching: "${selector}"`);
      
      const elements = await this.page.$$(selector);
      
      if (elements.length > index) {
        return elements[index];
      }
      
      logger.warn(`No element found at index ${index} for selector: ${selector}`);
      return null;
    } catch (error) {
      const errorMessage = `Failed to find nth element: ${selector}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element with specific attribute value
   * @param {string} attributeName - Attribute name
   * @param {string} attributeValue - Attribute value
   * @param {string} [tag='*'] - HTML tag to search within
   * @param {boolean} [exact=true] - Whether to match exact attribute value
   * @returns {Promise<ElementHandle|null>} Element handle or null
   */
  async getByAttribute(attributeName, attributeValue, tag = '*', exact = true) {
    try {
      logger.debug(`Finding element by ${exact ? 'exact' : 'partial'} attribute: ${attributeName}="${attributeValue}" in tag: ${tag}`);
      
      let selector;
      
      if (exact) {
        selector = `//${tag}[@${attributeName}="${attributeValue}"]`;
      } else {
        selector = `//${tag}[contains(@${attributeName}, "${attributeValue}")]`;
      }
      
      return await this.page.$(selector);
    } catch (error) {
      const errorMessage = `Failed to find element by attribute: ${attributeName}="${attributeValue}"`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element with a specific CSS class
   * @param {string} className - CSS class name
   * @param {string} [tag='*'] - HTML tag to search within
   * @returns {Promise<ElementHandle|null>} Element handle or null
   */
  async getByClass(className, tag = '*') {
    try {
      logger.debug(`Finding element by class: "${className}" in tag: ${tag}`);
      
      return await this.page.$(`${tag}.${className}`);
    } catch (error) {
      const errorMessage = `Failed to find element by class: ${className}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element that contains another element
   * @param {string} parentSelector - Parent element selector
   * @param {string} childSelector - Child element selector
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} Parent element handle or null
   */
  async getParentContaining(parentSelector, childSelector) {
    try {
      logger.debug(`Finding parent "${parentSelector}" containing "${childSelector}"`);
      
      const parentElements = await this.page.$$(parentSelector);
      
      for (const parent of parentElements) {
        const child = await parent.$(childSelector);
        if (child) {
          return parent;
        }
      }
      moduleLogger.warn(`No parent "${parentSelector}" found containing "${childSelector}"`);
      return null;
    } catch (error) {
      const errorMessage = `Error finding parent containing element: ${childSelector}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }

  /**
   * Find element by its XPath position
   * @param {string} tag - HTML tag
   * @param {number} position - 1-based position
   * @returns {Promise<import('@playwright/test').ElementHandle|null>} Element handle or null
   */
  async getByPosition(tag, position) {
    try {
      logger.debug(`Finding ${tag} element at position ${position}`);
      
      const selector = `//${tag}[${position}]`;
      return await this.page.$(selector);
    } catch (error) {
      const errorMessage = `Error finding element by position: ${tag}[${position}]`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }

  /**
   * Register a custom selector engine
   * Note: In Playwright, custom selector engines should be registered in the playwright.config.js
   * @param {string} name - Name of the selector engine
   * @param {string|Function} script - Script to register
   * @returns {Promise<void>}
   */
  async registerSelectorEngine(name, script) {
    try {
      // If a function was provided, convert it to a string for demonstration purposes
      if (typeof script === 'function') {
        const scriptString = script.toString();
        logger.debug(`Selector engine function: ${scriptString}`);
      }
    } catch (error) {
      const errorMessage = `Error registering custom selector engine: ${name}`;
      if (error instanceof Error) {
        moduleLogger.error(errorMessage, error);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
      moduleLogger.error(errorMessage, String(error));
      throw new Error(errorMessage);
    }
  }
}

module.exports = CustomSelectorUtils;
