/**
 * Element Assertion Utilities
 * 
 * This module provides utilities for verifying element states and properties.
 * It includes functions to assert element visibility, presence, state, and attributes.
 */

const { expect } = require('@playwright/test');
const { logger } = require('./testLogger');

/**
 * Element Assertion Utilities
 */
class ElementAssertUtils {
  /**
   * Create a new ElementAssertUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Assert that element is visible
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertVisible(selector, message) {
    try {
      logger.debug(`Asserting element is visible: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be visible`).toBeVisible();
      
      logger.debug(`Element is visible: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element visibility assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element visibility assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is hidden
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertHidden(selector, message) {
    try {
      logger.debug(`Asserting element is hidden: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be hidden`).toBeHidden();
      
      logger.debug(`Element is hidden: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      if (error instanceof Error) {
        logger.error(`Element hidden assertion failed: ${selector}`, error);
      } else {
        logger.error(`Element hidden assertion failed: ${selector}: ${String(error)}`);
      }
    } else {
      logger.error(`Element hidden assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is enabled
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertEnabled(selector, message) {
    try {
      logger.debug(`Asserting element is enabled: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be enabled`).toBeEnabled();
      
      logger.debug(`Element is enabled: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element enabled assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element enabled assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is disabled
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertDisabled(selector, message) {
    try {
      logger.debug(`Asserting element is disabled: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be disabled`).toBeDisabled();
      
      logger.debug(`Element is disabled: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element disabled assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element disabled assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is checked
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertChecked(selector, message) {
    try {
      logger.debug(`Asserting element is checked: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be checked`).toBeChecked();
      
      logger.debug(`Element is checked: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element checked assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element checked assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is not checked
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertNotChecked(selector, message) {
    try {
      logger.debug(`Asserting element is not checked: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should not be checked`).not.toBeChecked();
      
      logger.debug(`Element is not checked: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Element not checked assertion failed: ${selector}`, error);
      } else {
        logger.error(`Element not checked assertion failed: ${selector}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Assert that element is focused
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertFocused(selector, message) {
    try {
      logger.debug(`Asserting element is focused: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be focused`).toBeFocused();
      
      logger.debug(`Element is focused: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element focused assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element focused assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is not focused
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertNotFocused(selector, message) {
    try {
      logger.debug(`Asserting element is not focused: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should not be focused`).not.toBeFocused();
      
      logger.debug(`Element is not focused: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element not focused assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element not focused assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is present
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertPresent(selector, message) {
    try {
      logger.debug(`Asserting element is present: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should be present`).toBeAttached();
      
      logger.debug(`Element is present: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element presence assertion failed: ${selector}`, error);
    } else {
      logger.error(`Element presence assertion failed: ${selector}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element is not present
   * @param {string} selector - Element selector
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertNotPresent(selector, message) {
    try {
      logger.debug(`Asserting element is not present: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should not be present`).not.toBeAttached();
      
      logger.debug(`Element is not present: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Element not present assertion failed: ${selector}`, error);
      } else {
        logger.error(`Element not present assertion failed: ${selector}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Assert that element has specific attribute
   * @param {string} selector - Element selector
   * @param {string} attribute - Attribute name
   * @param {string|RegExp} value - Expected attribute value
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertAttribute(selector, attribute, value, message) {
    try {
      logger.debug(`Asserting element has attribute ${attribute}="${value}": ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should have attribute ${attribute}="${value}"`).toHaveAttribute(attribute, value);
      
      logger.debug(`Element has attribute ${attribute}="${value}": ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element attribute assertion failed: ${selector}, ${attribute}=${value}`, error);
    } else {
      logger.error(`Element attribute assertion failed: ${selector}, ${attribute}=${value}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element does not have specific attribute
   * @param {string} selector - Element selector
   * @param {string} attribute - Attribute name
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertNotHasAttribute(selector, attribute, message) {
    try {
      logger.debug(`Asserting element does not have attribute ${attribute}: ${selector}`);
      
      const locator = this.page.locator(selector);
      const hasAttribute = await locator.getAttribute(attribute) !== null;
      
      if (hasAttribute) {
        const error = new Error(message || `Element ${selector} should not have attribute ${attribute}`);
        logger.error(`Element has attribute that it shouldn't: ${selector}, ${attribute}`, error);
        throw error;
      }
      
      logger.debug(`Element does not have attribute ${attribute}: ${selector}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('should not have attribute')) {
        throw error;
      }
      if (error instanceof Error) {
        logger.error(`Element attribute assertion failed: ${selector}, ${attribute}`, error);
      } else {
        logger.error(`Element attribute assertion failed: ${selector}, ${attribute}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Assert that element has specific CSS class
   * @param {string} selector - Element selector
   * @param {string} className - CSS class name
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertHasClass(selector, className, message) {
    try {
      logger.debug(`Asserting element has class "${className}": ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should have class "${className}"`).toHaveClass(new RegExp(`\\b${className}\\b`));
      
      logger.debug(`Element has class "${className}": ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element class assertion failed: ${selector}, class=${className}`, error);
    } else {
      logger.error(`Element class assertion failed: ${selector}, class=${className}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element does not have specific CSS class
   * @param {string} selector - Element selector
   * @param {string} className - CSS class name
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertNotHasClass(selector, className, message) {
    try {
      logger.debug(`Asserting element does not have class "${className}": ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should not have class "${className}"`).not.toHaveClass(new RegExp(`\\b${className}\\b`));
      
      logger.debug(`Element does not have class "${className}": ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Element not has class assertion failed: ${selector}, class=${className}`, error);
      } else {
        logger.error(`Element not has class assertion failed: ${selector}, class=${className}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Assert that element has specific CSS property
   * @param {string} selector - Element selector
   * @param {string} property - CSS property name
   * @param {string|RegExp} value - Expected CSS property value
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertCssProperty(selector, property, value, message) {
    try {
      logger.debug(`Asserting element has CSS property ${property}="${value}": ${selector}`);
      
      // Get computed style for the element
      const propertyValue = await this.page.locator(selector).evaluate((el, prop) => {
        return window.getComputedStyle(el).getPropertyValue(prop);
      }, property);
      
      // Check if the property matches expected value
      let matches = false;
      if (value instanceof RegExp) {
        matches = value.test(propertyValue);
      } else {
        matches = propertyValue === value;
      }
      
      if (!matches) {
        const error = new Error(message || `Element ${selector} should have CSS property ${property}="${value}", but got "${propertyValue}"`);
        logger.error(`Element CSS property assertion failed: ${selector}, ${property}=${value}, actual=${propertyValue}`, error);
        throw error;
      }
      
      logger.debug(`Element has CSS property ${property}="${value}": ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Element CSS property assertion failed: ${selector}, ${property}=${value}`, error);
      } else {
        logger.error(`Element CSS property assertion failed: ${selector}, ${property}=${value}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Assert element count
   * @param {string} selector - Element selector
   * @param {number} count - Expected count
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertCount(selector, count, message) {
    try {
      logger.debug(`Asserting element count ${count} for: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should have count ${count}`).toHaveCount(count);
      
      logger.debug(`Element has count ${count}: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element count assertion failed: ${selector}, expected=${count}`, error);
    } else {
      logger.error(`Element count assertion failed: ${selector}, expected=${count}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that element's value matches expected value
   * @param {string} selector - Element selector
   * @param {string|RegExp} value - Expected value
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertValue(selector, value, message) {
    try {
      logger.debug(`Asserting element has value "${value}": ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} should have value "${value}"`).toHaveValue(value);
      
      logger.debug(`Element has value "${value}": ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
      logger.error(`Element value assertion failed: ${selector}, value=${value}`, error);
    } else {
      logger.error(`Element value assertion failed: ${selector}, value=${value}: ${String(error)}`);
    }
      throw error;
    }
  }

  /**
   * Assert that selected option in dropdown has expected text
   * @param {string} selector - Dropdown selector
   * @param {string|RegExp} optionText - Expected option text
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertSelectedOption(selector, optionText, message) {
    try {
      logger.debug(`Asserting dropdown has selected option "${optionText}": ${selector}`);
      
      const selectedOption = await this.page.locator(`${selector} option:checked`).innerText();
      
      // Check if the option text matches expected value
      let matches = false;
      if (optionText instanceof RegExp) {
        matches = optionText.test(selectedOption);
      } else {
        matches = selectedOption === optionText;
      }
      
      if (!matches) {
        const error = new Error(message || `Dropdown ${selector} should have selected option "${optionText}", but got "${selectedOption}"`);
        logger.error(`Dropdown selected option assertion failed: ${selector}, expected=${optionText}, actual=${selectedOption}`, error);
        throw error;
      }
      
      logger.debug(`Dropdown has selected option "${optionText}": ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Dropdown selected option assertion failed: ${selector}, option=${optionText}`, error);
      } else {
        logger.error(`Dropdown selected option assertion failed: ${selector}, option=${optionText}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Assert a custom condition on an element
   * @param {string} selector - Element selector
   * @param {(element: HTMLElement | SVGElement) => boolean} conditionFn - Custom condition function to evaluate
   * @param {string} [message] - Custom error message
   * @returns {Promise<void>}
   */
  async assertCustom(selector, conditionFn, message) {
    try {
      logger.debug(`Asserting custom condition for: ${selector}`);
      
      // Wrap the condition function to ensure it has the correct type signature
      /**
       * @param {HTMLElement | SVGElement} element - DOM element from the page
       * @returns {boolean}
       */
      const wrappedConditionFn = (element) => {
        try {
          return Boolean(conditionFn(element)); // Pass the DOM element to conditionFn
        } catch (e) {
          if (e instanceof Error) {
            logger.error(`Error in custom condition function: ${e.message}`);
          } else {
            logger.error(`Error in custom condition function: ${String(e)}`);
          }
          return false;
        }
      };
      
      const result = await this.page.locator(selector).evaluate(wrappedConditionFn);
      
      if (!result) {
        throw new Error(message || `Element ${selector} failed custom assertion`);
      }
      
      logger.debug(`Element passed custom assertion: ${selector}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Element custom assertion failed: ${selector}`, error);
      } else {
        logger.error(`Element custom assertion failed: ${selector}: ${String(error)}`);
      }
      throw error;
    }
  }
}

module.exports = ElementAssertUtils;
