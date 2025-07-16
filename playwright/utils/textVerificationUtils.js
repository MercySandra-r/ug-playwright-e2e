/**
 * Text Verification Utilities
 * 
 * This module provides utilities for verifying text content and attributes in web elements.
 */

const { expect } = require('@playwright/test');
const { logger } = require('./testLogger');

/**
 * Text Verification Utilities
 */
class TextVerificationUtils {
  /**
   * Create a new TextVerificationUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Verify element has exact text
   * @param {string} selector - Element selector
   * @param {string|RegExp} expectedText - Expected text content
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing text
   * @param {boolean} [options.trimWhitespace=true] - Whether to trim whitespace before comparing
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyExactText(selector, expectedText, options = {}) {
    const { ignoreCase = false, trimWhitespace = true, message } = options;
    try {
      logger.debug(`Verifying exact text "${expectedText}" for element: ${selector}`);
      
      const locator = this.page.locator(selector);
      
      if (expectedText instanceof RegExp) {
        await expect(locator, message || `Element ${selector} should have text matching ${expectedText}`).toHaveText(expectedText);
      } else {
        // Get the text content
        let actualText = await locator.textContent() || '';
        let textToCompare = expectedText;
        
        if (trimWhitespace) {
          actualText = actualText.trim();
          if (typeof textToCompare === 'string') {
            textToCompare = textToCompare.trim();
          }
        }
        
        if (ignoreCase) {
          actualText = actualText.toLowerCase();
          if (typeof textToCompare === 'string') {
            textToCompare = textToCompare.toLowerCase();
          }
        }
        
        // Use Playwright's expect for nice error messages
        // Using RegExp for comparison function to match Playwright's expected types
        const expectedRegex = ignoreCase ? 
          new RegExp(`^${typeof textToCompare === 'string' ? textToCompare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : textToCompare}$`, 'i') : 
          new RegExp(`^${typeof textToCompare === 'string' ? textToCompare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : textToCompare}$`);
          
        await expect(locator, message || `Element ${selector} should have text "${expectedText}"`).toHaveText(expectedRegex);
      }
      
      logger.debug(`Element has exact text "${expectedText}": ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Text verification failed for: ${selector}, expected="${expectedText}"`, error);
      } else {
        logger.error(`Text verification failed for: ${selector}, expected="${expectedText}": ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify element contains text
   * @param {string} selector - Element selector
   * @param {string|RegExp} expectedText - Text content that should be contained
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing text
   * @param {boolean} [options.trimWhitespace=true] - Whether to trim whitespace before comparing
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyContainsText(selector, expectedText, options = {}) {
    const { ignoreCase = false, trimWhitespace = true, message } = options;
    try {
      logger.debug(`Verifying element contains text "${expectedText}": ${selector}`);
      
      const locator = this.page.locator(selector);
      
      if (expectedText instanceof RegExp) {
        // For regex, we use the Playwright's built-in containsText
        await expect(locator, message || `Element ${selector} should contain text matching ${expectedText}`).toContainText(expectedText);
      } else {
        // Get the text content
        let actualText = await locator.textContent() || '';
        let textToFind = expectedText;
        
        if (trimWhitespace) {
          actualText = actualText.trim();
          if (typeof textToFind === 'string') {
            textToFind = textToFind.trim();
          }
        }
        
        if (ignoreCase) {
          actualText = actualText.toLowerCase();
          if (typeof textToFind === 'string') {
            textToFind = textToFind.toLowerCase();
          }
        }
        
        // Use Playwright's expect for nice error messages
        await expect(locator, message || `Element ${selector} should contain text "${expectedText}"`).toContainText(textToFind);
      }
      
      logger.debug(`Element contains text "${expectedText}": ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Text contains verification failed for: ${selector}, expected="${expectedText}"`, error);
      } else {
        logger.error(`Text contains verification failed for: ${selector}, expected="${expectedText}": ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify element does not have text
   * @param {string} selector - Element selector
   * @param {string|RegExp} textToNotHave - Text content that should not be present
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing text
   * @param {boolean} [options.trimWhitespace=true] - Whether to trim whitespace before comparing
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyNotHasText(selector, textToNotHave, options = {}) {
    const { ignoreCase = false, trimWhitespace = true, message } = options;
    try {
      logger.debug(`Verifying element does not have text "${textToNotHave}": ${selector}`);
      
      const locator = this.page.locator(selector);
      
      if (textToNotHave instanceof RegExp) {
        // For regex, we check that the text does not match the pattern
        await expect(locator, message || `Element ${selector} should not contain text matching ${textToNotHave}`).not.toContainText(textToNotHave);
      } else {
        // Get the text content
        let actualText = await locator.textContent() || '';
        let textToCheck = textToNotHave;
        
        if (trimWhitespace) {
          actualText = actualText.trim();
          if (typeof textToCheck === 'string') {
            textToCheck = textToCheck.trim();
          }
        }
        
        if (ignoreCase) {
          actualText = actualText.toLowerCase();
          if (typeof textToCheck === 'string') {
            textToCheck = textToCheck.toLowerCase();
          }
        }
        
        // Use Playwright's expect for nice error messages
        await expect(locator, message || `Element ${selector} should not contain text "${textToNotHave}"`).not.toContainText(textToCheck);
      }
      
      logger.debug(`Element does not have text "${textToNotHave}": ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Text not-has verification failed for: ${selector}, not expected="${textToNotHave}"`, error);
      } else {
        logger.error(`Text not-has verification failed for: ${selector}, not expected="${textToNotHave}": ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify element text matches a pattern
   * @param {string} selector - Element selector
   * @param {RegExp} pattern - Regular expression pattern
   * @param {Object} [options] - Options for the verification
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyTextMatches(selector, pattern, options = {}) {
    const { message } = options;
    try {
      logger.debug(`Verifying element text matches pattern ${pattern}: ${selector}`);
      
      const locator = this.page.locator(selector);
      await expect(locator, message || `Element ${selector} text should match pattern ${pattern}`).toHaveText(pattern);
      
      logger.debug(`Element text matches pattern ${pattern}: ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Text pattern match verification failed for: ${selector}, pattern=${pattern}`, error);
      } else {
        logger.error(`Text pattern match verification failed for: ${selector}, pattern=${pattern}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify page title
   * @param {string|RegExp} expectedTitle - Expected page title
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing
   * @param {boolean} [options.partialMatch=false] - Whether to check for partial match
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyPageTitle(expectedTitle, options = {}) {
    const { ignoreCase = false, partialMatch = false, message } = options;
    try {
      logger.debug(`Verifying page title is "${expectedTitle}"`);
      
      const actualTitle = await this.page.title();
      
      if (expectedTitle instanceof RegExp) {
        // For regex, we check that the title matches the pattern
        await expect(this.page, message || `Page title should match ${expectedTitle}`).toHaveTitle(expectedTitle);
      } else {
        let titleToCompare = expectedTitle;
        let actualTitleForComparison = actualTitle;
        
        if (ignoreCase) {
          titleToCompare = titleToCompare.toLowerCase();
          actualTitleForComparison = actualTitleForComparison.toLowerCase();
        }
        
        if (partialMatch) {
          // Use Playwright's built-in expect for partial match
          await expect(this.page, message || `Page title should contain "${expectedTitle}"`).toHaveTitle(new RegExp(titleToCompare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        } else {
          // Use Playwright's built-in expect for exact match
          await expect(this.page, message || `Page title should be "${expectedTitle}"`).toHaveTitle(titleToCompare);
        }
      }
      
      logger.debug(`Page title verification passed for "${expectedTitle}"`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Page title verification failed, expected="${expectedTitle}"`, error);
      } else {
        logger.error(`Page title verification failed, expected="${expectedTitle}": ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify URL
   * @param {string|RegExp} expectedUrl - Expected URL
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing
   * @param {boolean} [options.partialMatch=false] - Whether to check for partial match
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyUrl(expectedUrl, options = {}) {
    const { ignoreCase = false, partialMatch = false, message } = options;
    try {
      logger.debug(`Verifying URL is "${expectedUrl}"`);
      
      if (expectedUrl instanceof RegExp) {
        // For regex, we check that the URL matches the pattern
        await expect(this.page, message || `URL should match ${expectedUrl}`).toHaveURL(expectedUrl);
      } else {
        let urlToCompare = expectedUrl;
        
        if (ignoreCase) {
          // For case-insensitive, use regex with i flag
          const regexPattern = partialMatch 
            ? new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            : new RegExp(`^${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          await expect(this.page, message || `URL should ${partialMatch ? 'contain' : 'be'} "${expectedUrl}" (case insensitive)`).toHaveURL(regexPattern);
        } else {
          // For case-sensitive, use string or regex depending on partialMatch
          if (partialMatch) {
            await expect(this.page, message || `URL should contain "${expectedUrl}"`).toHaveURL(new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
          } else {
            await expect(this.page, message || `URL should be "${expectedUrl}"`).toHaveURL(urlToCompare);
          }
        }
      }
      
      logger.debug(`URL verification passed for "${expectedUrl}"`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`URL verification failed, expected="${expectedUrl}"`, error);
      } else {
        logger.error(`URL verification failed, expected="${expectedUrl}": ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify attribute value
   * @param {string} selector - Element selector
   * @param {string} attributeName - Attribute name
   * @param {string|RegExp} expectedValue - Expected attribute value
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing
   * @param {boolean} [options.partialMatch=false] - Whether to check for partial match
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyAttribute(selector, attributeName, expectedValue, options = {}) {
    const { ignoreCase = false, partialMatch = false, message } = options;
    try {
      logger.debug(`Verifying element attribute ${attributeName}="${expectedValue}" for: ${selector}`);
      
      const locator = this.page.locator(selector);
      
      if (expectedValue instanceof RegExp) {
        // For regex, we use the Playwright's built-in toHaveAttribute with regex
        await expect(locator, message || `Element ${selector} should have attribute ${attributeName} matching ${expectedValue}`).toHaveAttribute(attributeName, expectedValue);
      } else {
        if (ignoreCase || partialMatch) {
          // Get the attribute value for manual comparison
          const attributeValue = await locator.getAttribute(attributeName);
          
          if (attributeValue === null) {
            const error = new Error(message || `Element ${selector} should have attribute ${attributeName}`);
            logger.error(`Attribute verification failed: ${selector}, attribute=${attributeName} does not exist`, error);
            throw error;
          }
          
          let valueToCompare = expectedValue;
          let attributeValueForComparison = attributeValue;
          
          if (ignoreCase) {
            valueToCompare = valueToCompare.toLowerCase();
            attributeValueForComparison = attributeValueForComparison.toLowerCase();
          }
          
          if (partialMatch) {
            if (!attributeValueForComparison.includes(valueToCompare)) {
              const error = new Error(message || `Element ${selector} attribute ${attributeName}="${attributeValue}" should contain "${expectedValue}"`);
              logger.error(`Attribute partial match verification failed: ${selector}, ${attributeName}="${attributeValue}", expected to contain "${expectedValue}"`, error);
              throw error;
            }
          } else {
            // Use Playwright's built-in expect for the actual check
            if (ignoreCase) {
              // Create a case-insensitive regex for the exact match
              await expect(locator, message || `Element ${selector} should have attribute ${attributeName}="${expectedValue}" (case insensitive)`).toHaveAttribute(attributeName, new RegExp(`^${valueToCompare}$`, 'i'));
            } else {
              await expect(locator, message || `Element ${selector} should have attribute ${attributeName}="${expectedValue}"`).toHaveAttribute(attributeName, expectedValue);
            }
          }
        } else {
          // Simple exact match case
          await expect(locator, message || `Element ${selector} should have attribute ${attributeName}="${expectedValue}"`).toHaveAttribute(attributeName, expectedValue);
        }
      }
      
      logger.debug(`Element has attribute ${attributeName}="${expectedValue}": ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Attribute verification failed: ${selector}, ${attributeName}=${expectedValue}`, error);
      } else {
        logger.error(`Attribute verification failed: ${selector}, ${attributeName}=${expectedValue}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify element has an attribute (regardless of its value)
   * @param {string} selector - Element selector
   * @param {string} attributeName - Attribute name
   * @param {Object} [options] - Options for the verification
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyHasAttribute(selector, attributeName, options = {}) {
    const { message } = options;
    try {
      logger.debug(`Verifying element has attribute ${attributeName}: ${selector}`);
      
      const locator = this.page.locator(selector);
      const attributeValue = await locator.getAttribute(attributeName);
      
      if (attributeValue === null) {
        const error = new Error(message || `Element ${selector} should have attribute ${attributeName}`);
        logger.error(`Has attribute verification failed: ${selector}, attribute=${attributeName} does not exist`, error);
        throw error;
      }
      
      logger.debug(`Element has attribute ${attributeName}: ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Has attribute verification failed: ${selector}, attribute=${attributeName}`, error);
      } else {
        logger.error(`Has attribute verification failed: ${selector}, attribute=${attributeName}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify element does not have an attribute
   * @param {string} selector - Element selector
   * @param {string} attributeName - Attribute name
   * @param {Object} [options] - Options for the verification
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyNotHasAttribute(selector, attributeName, options = {}) {
    const { message } = options;
    try {
      logger.debug(`Verifying element does not have attribute ${attributeName}: ${selector}`);
      
      const locator = this.page.locator(selector);
      const attributeValue = await locator.getAttribute(attributeName);
      
      if (attributeValue !== null) {
        const error = new Error(message || `Element ${selector} should not have attribute ${attributeName}`);
        logger.error(`Not has attribute verification failed: ${selector}, attribute=${attributeName} exists with value="${attributeValue}"`, error);
        throw error;
      }
      
      logger.debug(`Element does not have attribute ${attributeName}: ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Not has attribute verification failed: ${selector}, attribute=${attributeName}`, error);
      } else {
        logger.error(`Not has attribute verification failed: ${selector}, attribute=${attributeName}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify HTML content of an element
   * @param {string} selector - Element selector
   * @param {string|RegExp} expectedHtml - Expected HTML content
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing
   * @param {boolean} [options.partialMatch=false] - Whether to check for partial match
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyHtml(selector, expectedHtml, options = {}) {
    const { ignoreCase = false, partialMatch = false, message } = options;
    try {
      logger.debug(`Verifying element HTML content matches "${expectedHtml}": ${selector}`);
      
      const locator = this.page.locator(selector);
      const html = await locator.innerHTML();
      
      if (expectedHtml instanceof RegExp) {
        // For regex, we check that the HTML matches the pattern
        const matches = expectedHtml.test(html);
        if (!matches) {
          const error = new Error(message || `Element ${selector} HTML should match ${expectedHtml}, but got "${html}"`);
          logger.error(`HTML regex verification failed: ${selector}, expected pattern=${expectedHtml}, actual="${html}"`, error);
          throw error;
        }
      } else {
        let htmlToCompare = html;
        let expectedHtmlToCompare = expectedHtml;
        
        if (ignoreCase) {
          htmlToCompare = htmlToCompare.toLowerCase();
          expectedHtmlToCompare = expectedHtmlToCompare.toLowerCase();
        }
        
        if (partialMatch) {
          if (!htmlToCompare.includes(expectedHtmlToCompare)) {
            const error = new Error(message || `Element ${selector} HTML should contain "${expectedHtml}", but got "${html}"`);
            logger.error(`HTML partial match verification failed: ${selector}, expected to contain="${expectedHtml}", actual="${html}"`, error);
            throw error;
          }
        } else {
          if (htmlToCompare !== expectedHtmlToCompare) {
            const error = new Error(message || `Element ${selector} HTML should be "${expectedHtml}", but got "${html}"`);
            logger.error(`HTML exact match verification failed: ${selector}, expected="${expectedHtml}", actual="${html}"`, error);
            throw error;
          }
        }
      }
      
      logger.debug(`Element HTML content verification passed for "${expectedHtml}": ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`HTML verification failed: ${selector}, expected="${expectedHtml}"`, error);
      } else {
        logger.error(`HTML verification failed: ${selector}, expected="${expectedHtml}": ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify text for multiple elements
   * @param {string} selector - Element selector (should match multiple elements)
   * @param {Array<string|RegExp>} expectedTexts - Array of expected text values for each element
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing text
   * @param {boolean} [options.trimWhitespace=true] - Whether to trim whitespace before comparing
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyMultipleElementTexts(selector, expectedTexts, options = {}) {
    const { ignoreCase = false, trimWhitespace = true, message } = options;
    try {
      logger.debug(`Verifying multiple elements have expected texts: ${selector}`);
      
      // Get all elements matching the selector
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      if (count !== expectedTexts.length) {
        const error = new Error(message || `Expected ${expectedTexts.length} elements for selector ${selector}, but found ${count}`);
        logger.error(`Multiple element text verification failed: element count mismatch`, error);
        throw error;
      }
      
      // Check text of each element
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const actualText = await element.textContent() || '';
        const expectedText = expectedTexts[i];
        
        let textToCompare = actualText;
        if (trimWhitespace && textToCompare) {
          textToCompare = textToCompare.trim();
        }
        
        if (expectedText instanceof RegExp) {
          if (!expectedText.test(textToCompare)) {
            const error = new Error(message || `Element ${selector}[${i}] text "${textToCompare}" should match ${expectedText}`);
            logger.error(`Multiple element text verification failed at index ${i}: ${selector}`, error);
            throw error;
          }
        } else {
          let expectedTextToCompare = expectedText;
          
          if (trimWhitespace) {
            expectedTextToCompare = expectedTextToCompare.trim();
          }
          
          if (ignoreCase) {
            textToCompare = textToCompare.toLowerCase();
            expectedTextToCompare = expectedTextToCompare.toLowerCase();
          }
          
          if (textToCompare !== expectedTextToCompare) {
            const error = new Error(message || `Element ${selector}[${i}] text should be "${expectedText}", but got "${actualText}"`);
            logger.error(`Multiple element text verification failed at index ${i}: ${selector}`, error);
            throw error;
          }
        }
      }
      
      logger.debug(`All ${count} elements have expected texts: ${selector}`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Multiple element text verification failed: ${selector}`, error);
      } else {
        logger.error(`Multiple element text verification failed: ${selector}: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Verify that all matching elements contain the same text
   * @param {string} selector - Element selector (should match multiple elements)
   * @param {string|RegExp} expectedText - Expected text content for all elements
   * @param {Object} [options] - Options for the verification
   * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing text
   * @param {boolean} [options.trimWhitespace=true] - Whether to trim whitespace before comparing
   * @param {string} [options.message] - Custom error message
   * @returns {Promise<boolean>} True if verification passes
   */
  async verifyAllElementsHaveSameText(selector, expectedText, options = {}) {
    const { ignoreCase = false, trimWhitespace = true, message } = options;
    try {
      logger.debug(`Verifying all elements have same text "${expectedText}": ${selector}`);
      
      // Get all elements matching the selector
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      if (count === 0) {
        const error = new Error(message || `No elements found for selector ${selector}`);
        if (error instanceof Error) {
        logger.error(`All elements text verification failed: no elements found`, error);
      } else {
        logger.error(`All elements text verification failed: no elements found: ${String(error)}`);
      }
        throw error;
      }
      
      // Check text of each element
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const actualText = await element.textContent() || '';
        
        let textToCompare = actualText;
        if (trimWhitespace && textToCompare) {
          textToCompare = textToCompare.trim();
        }
        
        if (expectedText instanceof RegExp) {
          if (!expectedText.test(textToCompare)) {
            const error = new Error(message || `Element ${selector}[${i}] text "${textToCompare}" should match ${expectedText}`);
            logger.error(`All elements text verification failed at index ${i}: ${selector}`, error);
            throw error;
          }
        } else {
          let expectedTextToCompare = expectedText;
          
          if (trimWhitespace) {
            expectedTextToCompare = expectedTextToCompare.trim();
          }
          
          if (ignoreCase) {
            textToCompare = textToCompare.toLowerCase();
            expectedTextToCompare = expectedTextToCompare.toLowerCase();
          }
          
          if (textToCompare !== expectedTextToCompare) {
            const error = new Error(message || `Element ${selector}[${i}] text should be "${expectedText}", but got "${actualText}"`);
            logger.error(`All elements text verification failed at index ${i}: ${selector}`, error);
            throw error;
          }
        }
      }
      
      logger.debug(`All ${count} elements have text "${expectedText}": ${selector}`);
      return true;
    } catch (error) {
      // Type guard for error object
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`All elements text verification failed: ${selector}, expected="${expectedText}"`, err);
      throw err;
    }
  }
}

module.exports = TextVerificationUtils;
