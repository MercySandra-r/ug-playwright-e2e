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
    /**
     * Application ID for /ug-app/<id>/ routes, when the test already knows it.
     * @type {string|undefined}
     */
    this.applicationId = undefined;
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
   * Give the page a moment to go network-idle, without failing if it never does.
   * The app sometimes keeps background requests open (analytics/polling), so a hard
   * 'networkidle' wait can hang; callers wait for their real UI afterwards.
   * @param {number} [timeoutMs]
   * @returns {Promise<void>}
   */
  async settle(timeoutMs = 10000) {
    await this.page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
  }

  /**
   * Work out the signed-in user's application ID. The application wizard lives at
   * /ug-app/<id>/<step> (old flat routes like /my-information now 404).
   * Order: this.applicationId (set by the test) -> current URL -> APPLICATION_ID env
   * -> dashboard "Continue" (resumes the app).
   * @returns {Promise<string>}
   */
  async getApplicationId() {
    if (this.applicationId) return this.applicationId;
    const fromUrl = this.page.url().match(/\/ug-app\/(\d+)\//);
    if (fromUrl) return fromUrl[1];
    if (process.env.APPLICATION_ID) return process.env.APPLICATION_ID;

    await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
    const resume = this.page.getByRole('button', { name: 'Continue', exact: true });
    await resume.waitFor({ state: 'visible', timeout: this.navigationTimeout });
    await resume.click();
    await this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: this.navigationTimeout });
    const m = this.page.url().match(/\/ug-app\/(\d+)\//);
    if (!m) throw new Error(`Could not resolve application ID from ${this.page.url()}`);
    return m[1];
  }

  /**
   * Open a step of the application wizard: my-information, my-program, my-schools,
   * my-high-school-grades, arizona-residency, review, preview.
   *
   * Steps are gated: the app redirects to the first incomplete step if earlier ones
   * aren't finished. That redirect is logged, not thrown, so callers' own assertions
   * report what page they actually got.
   * @param {string} slug
   * @returns {Promise<void>}
   */
  async gotoApplicationStep(slug) {
    const id = await this.getApplicationId();
    await this.page.goto(`/ug-app/${id}/${slug}`, { timeout: this.navigationTimeout });
    await this.settle();
    if (!this.page.url().includes(`/${slug}`)) {
      this.logger.warn(`Requested step "${slug}" but app redirected to ${this.page.url()} (earlier steps incomplete?)`);
    }
  }

  /**
   * On a form that hasn't been filled in yet, click its submit button (by default the
   * wizard footer's "Continue" / "Save and Continue") and capture the field-level
   * validation messages it shows. The page must stay put; if it moves on, nothing was
   * required and this throws.
   *
   * Refuses to run on Review and Preview, where the footer button submits the application,
   * unless `allowSubmitPage` is set by a caller that has made sure it can't submit
   * (ReviewPage.captureSubmitValidations checks the certification is unticked).
   * Inside a test, the list and a full-page screenshot are attached to the report.
   *
   * @param {{ stepName?: string, button?: Locator, allowSubmitPage?: boolean, reload?: boolean }} [options]
   *   stepName: name used in the log and report attachments; button: the submit button to click;
   *   reload: reload the page afterwards so filling starts from a clean form (default: on wizard
   *   steps, i.e. when no custom button is given)
   * @returns {Promise<Array<{ field: string, message: string }>>}
   */
  async captureFieldValidations({ stepName, button, allowSubmitPage = false, reload = !button } = {}) {
    const url = this.page.url();
    const name = stepName || (url.match(/\/ug-app\/\d+\/([\w-]+)/)?.[1] ?? 'step');
    if (!allowSubmitPage && /\/ug-app\/\d+\/(review|preview)\b/.test(url)) {
      throw new Error(`captureFieldValidations: not allowed on ${url} (the footer button submits the application)`);
    }
    const errorSelector = '.invalid-feedback:visible, .radio-card-error:visible, [role="alert"]:visible, .alert-danger:visible';

    await (button || this.page.locator('button[type="submit"][form="page-form"]')).click();
    await this.page.locator(errorSelector).first().waitFor({ state: 'visible', timeout: this.assertionTimeout })
      .catch(() => {});
    await this.page.waitForTimeout(500); // let every field render its message
    if (this.page.url() !== url) {
      throw new Error(`captureFieldValidations: ${name} moved on to ${this.page.url()} instead of showing validation`);
    }

    const errors = await this.page.evaluate(() => {
      /** @param {string|null|undefined} s */
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
      /** @param {Element} el */
      const visible = (el) => el instanceof HTMLElement && el.getClientRects().length > 0;
      /**
       * First line of an element's rendered text: a label's heading without its help text.
       * @param {Element|null|undefined} node
       */
      const firstLine = (node) => {
        if (!node) return '';
        const text = node instanceof HTMLElement ? node.innerText : node.textContent || '';
        return clean(text.split('\n').find((line) => line.trim()) || '');
      };
      const labelSelector = 'label.form-label .label-text, label.form-label, legend, label.m-checkbox';
      /** @param {Element} el @param {string} message */
      const fieldOf = (el, message) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          if (p.matches('[role="radiogroup"]')) {
            const ids = (p.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
            const text = ids.length ? firstLine(document.getElementById(ids[0])) : clean(p.getAttribute('aria-label'));
            const field = text.replace(message, '').trim();
            if (field) return field;
          }
          // The closest label above the message inside this container.
          const before = [...p.querySelectorAll(labelSelector)]
            .filter((l) => !l.contains(el) && (l.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
          const label = before[before.length - 1];
          if (label) {
            const field = firstLine(label).replace(message, '').trim();
            if (field) return field;
          }
        }
        return '(unlabelled field)';
      };
      const seen = new Set();
      const out = [];
      // Field errors, plus page-level banners such as My program's "Please select a first choice program."
      for (const el of document.querySelectorAll('.invalid-feedback, .radio-card-error, [role="alert"], .alert-danger')) {
        if (!visible(el)) continue;
        const banner = !el.matches('.invalid-feedback, .radio-card-error');
        if (banner && el.querySelector('.invalid-feedback, .radio-card-error')) continue;
        const message = clean(el instanceof HTMLElement ? el.innerText : el.textContent);
        if (!message) continue;
        const field = banner ? '(page message)' : fieldOf(el, message);
        const key = `${field}|${message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ field: field.length > 120 ? `${field.slice(0, 117)}...` : field, message });
      }
      return out;
    });

    this.logger.info(`${name}: ${errors.length} field validation message(s) on an empty submit`);
    errors.forEach((e) => this.logger.info(`  ${e.field}: ${e.message}`));
    try {
      const info = require('@playwright/test').test.info();
      await info.attach(`${name} - field validations.json`, { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
      await info.attach(`${name} - field validations.png`, { body: await this.page.screenshot({ fullPage: true }), contentType: 'image/png' });
    } catch {
      // not running inside a test
    }
    if (reload) {
      // Start the fill from a clean form: nothing was saved, and the empty submit can leave
      // fields (e.g. My information's home address) in a state that doesn't save properly.
      await this.page.reload({ timeout: this.navigationTimeout });
      await this.page.locator('button[type="submit"][form="page-form"]').waitFor({ state: 'visible', timeout: this.navigationTimeout });
    }
    return errors;
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
    const loc = this.page.locator(selector);
    await expect(loc).toBeVisible({ timeout: this.assertionTimeout });
    await loc.fill(text, { timeout: this.actionTimeout });
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
    const screenshotPath = require('../utils/artifactPaths').screenshotPath(`${this.pageName}_${name}_${Date.now()}.png`);
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
