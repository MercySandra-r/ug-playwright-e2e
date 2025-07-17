/**
 * LandingPage Class
 * 
 * This page object represents the landing/entry page of the application.
 * It includes functionality for navigating the landing page, interacting with MOL options,
 * and handling account creation flow.
 */

const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');
const ElementAssertUtils = require('../utils/elementAssertUtils');
const TextVerificationUtils = require('../utils/textVerificationUtils');
const CustomSelectorUtils = require('../utils/customSelectorUtils');

class LandingPage extends BasePage {
  /**
   * Create a new LandingPage instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    super(page, 'LandingPage');
    this.elementAssert = new ElementAssertUtils(page);
    this.textVerify = new TextVerificationUtils(page);
    this.customSelector = new CustomSelectorUtils(page);
    
    // Define selectors for page elements
    this.selectors = {
      // Navigation and main elements
      viewAppDetailsBtn: 'button:has-text("View Application Details")',
      appDetailsSection: 'div[role="main"]',
      createAccountLink: 'a:has-text("Create Account")',
      loginBtn: 'button:has-text("Login")',
      molRadioGroup: 'div[role="radiogroup"]',
      // Add other selectors as needed
    };
    
    // Page verification elements
    this.pageTitle = 'Arizona State University | ASU';
    this.expectedElements = [
      this.selectors.viewAppDetailsBtn,
      this.selectors.createAccountLink,
      this.selectors.loginBtn,
      this.selectors.molRadioGroup
    ];

    // Define selectors for page elements
    this.selectors = {
      // Navigation and main elements
      viewAppDetailsBtn: 'button:has-text("View Application Details")',
      appDetailsSection: 'div[role="main"]', // Updated to match the main content area
      createAccountLink: 'a:has-text("Create Account")',
      loginBtn: 'button:has-text("Login")',

      // Footer container
      footerContainer: 'footer[role="contentinfo"]',

      // MOL (Mode of Learning) options - updated to match actual page structure
      molRadioGroup: 'div[role="radiogroup"]',
      inPersonRadioButton: 'input[type="radio"]:nth-child(1)',
      onlineRadioButton: 'input[type="radio"]:nth-child(2)',
      molSelection: 'label[for^="mol-option"]',
      inPersonMolTitle: 'h3:has-text("In-Person")',
      inPersonLearnMore: 'a:has-text("Learn more about in-person programs")',
      onlineLearnMore: 'a:has-text("Learn more about online programs")',
      inPersonTitle: 'h2:has-text("In-Person Programs")',
      onlineTitle: 'h2:has-text("Online Programs")',
      molBackBtn: 'button:has-text("Back")',

      // Degree type options - updated to match actual page structure
      assOrBachDegreeType: 'input[value="associate-or-bachelor"]',
      pursueDegreeType: 'input[value="pursue"]',
      ndgvusDegreeType: 'input[value="ndgvus"]',

      // Account creation
      email: '[data-cy="email-input"]',
      reemail: '[data-cy="reemail-input"]',
      password: '[data-cy="password-input"]',
      repassword: '[data-cy="repassword-input"]',
      recaptcha: '[data-cy="recaptcha-container"]',

      // Validation elements
      emailValidation: '[data-cy="email-validation"]',
      reemailValidation: '[data-cy="reemail-validation"]',
      reemailValidationAlt: '[data-cy="reemail-validation-alt"]',
      passwordValidation10: '[data-cy="password-validation-10-chars"]',
      passwordValidation1: '[data-cy="password-validation-1-number"]',
      passwordValidation1U: '[data-cy="password-validation-1-uppercase"]',
      passwordValidation1L: '[data-cy="password-validation-1-lowercase"]',

      // Progress elements
      loader: '[data-cy="loader"]',
      progressbar: '[data-cy="progress-bar"]'
    };

    // Store the selected MOL for later verification
    this.selectedMOL = '';
  }

  /**
   * Navigate to the landing page
   * @returns {Promise<void>}
   */
  async navigateToLandingPage() {
    await this.navigateTo('/');
    await this.waitForPageLoad();
  }

  /**
   * Wait for loader and progress bar to disappear
   * @returns {Promise<void>}
   */
  async waitForPageLoad() {
    try {
      // Wait for the loader to disappear if it's present
      if (await this.isVisible(this.selectors.loader)) {
        await this.waitForElementToBeHidden(this.selectors.loader);
      }
      
      // Wait for the progress bar to disappear if it's present
      if (await this.isVisible(this.selectors.progressbar)) {
        await this.waitForElementToBeHidden(this.selectors.progressbar);
      }
    } catch (error) {
      // It's okay if the elements don't exist or disappear quickly
      this.logger.debug('Loader or progress bar not present or already gone');
    }
  }

  /**
   * Validate the "Log In" functionality
   * @returns {Promise<void>}
   */
  async validateLoginFunctionality() {
    this.logger.info('Validating Log In functionality');
    
    // Verify login button is present
    await this.elementAssert.assertVisible(this.selectors.loginBtn);
    this.logger.debug('Log In button is present on the Entry/Home page');

    // Click the login button
    await this.click(this.selectors.loginBtn);
    await this.page.waitForTimeout(500); // Small wait for navigation

    // Verify redirect to login page
    const currentUrl = this.getCurrentUrl();
    if (currentUrl.includes('user/login')) {
      this.logger.debug('Successfully redirected to the login page');
    } else {
      this.logger.error(`Failed to redirect to login page. Current URL: ${currentUrl}`);
      throw new Error('Login redirection failed');
    }

    // Navigate back to landing page
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Validate the "Create Account Here" functionality
   * @returns {Promise<void>}
   */
  async validateCreateAccount() {
    this.logger.info('Validating Create Account Here link');
    
    // Scroll to the create account link
    const createAccountElement = await this.page.$(this.selectors.createAccountLink);
    if (!createAccountElement) {
      throw new Error(`Create account element not found with selector: ${this.selectors.createAccountLink}`);
    }
    await createAccountElement.scrollIntoViewIfNeeded();
    
    // Get current page information before clicking
    const currentPageUrl = this.getCurrentUrl();
    const currentContext = this.page;
    
    // Click the create account link which may open in a new tab
    await this.click(this.selectors.createAccountLink);
    await this.page.waitForTimeout(2000); // Wait for new tab to open
    
    // Check for new tab/window
    const pages = await this.page.context().pages();
    let createAccountPage = pages[pages.length - 1];
    
    try {
      // If new page opened, verify the URL and close it
      if (pages.length > 1 && createAccountPage !== this.page) {
        const newPageUrl = createAccountPage.url();
        
        if (newPageUrl.includes('webapp4.asu.edu/uga_admissionsapp/')) {
          this.logger.debug('Create An Account here link works as expected!');
          await createAccountPage.close();
        } else {
          this.logger.error(`Unexpected URL in new tab: ${newPageUrl}`);
        }
      } else {
        // Check if we're still on the same page or redirected
        const newUrl = this.getCurrentUrl();
        if (newUrl !== currentPageUrl && newUrl.includes('uga_admissionsapp')) {
          this.logger.debug('Create An Account here link works as expected!');
          await this.page.goBack();
        } else {
          this.logger.error('Create account link did not navigate to expected page');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error validating create account link: ${errorMessage}`);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Validate the "View App Details" functionality
   * @returns {Promise<void>}
   */
  async validateViewAppDetails() {
    this.logger.info('Validating View Application Details functionality');
    
    // Verify View App Details button is present
    await this.elementAssert.assertVisible(this.selectors.viewAppDetailsBtn);
    this.logger.debug('View application details button is present on the landing page');
    
    // Click the button
    await this.click(this.selectors.viewAppDetailsBtn);
    await this.page.waitForTimeout(500); // Small wait for any animations
    
    // Verify the Application details section is displayed
    await this.elementAssert.assertVisible(this.selectors.appDetailsSection);
    this.logger.debug('Application details is displayed on the landing page');
  }

  /**
   * Choose a random MOL (Mode of Learning) option
   * @returns {Promise<string>} The selected MOL text
   */
  async chooseRandomMOL() {
    this.logger.info('Choosing random MOL');
    await this.waitForPageLoad();
    
    // Get all MOL radio buttons
    const radioButtons = await this.page.$$(this.selectors.molRadioGroup + ' label');
    this.logger.debug(`Number of MOL options: ${radioButtons.length}`);
    
    if (radioButtons.length === 0) {
      throw new Error('No MOL radio buttons found');
    }
    
    // Choose a random radio button
    const randomIndex = Math.floor(Math.random() * radioButtons.length);
    await radioButtons[randomIndex].click();
    await this.page.waitForTimeout(1000); // Wait for selection to register
    
    // Get the selected MOL text
    const selectedMOLElement = await this.page.$(this.selectors.molSelection);
    if (!selectedMOLElement) {
      throw new Error(`MOL selection element not found with selector: ${this.selectors.molSelection}`);
    }
    const molText = await selectedMOLElement.textContent();
    if (molText === null) {
      throw new Error('Selected MOL text content is null');
    }
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }

  /**
   * Choose the In-person MOL option
   * @returns {Promise<string>} The selected MOL text
   */
  async chooseInPersonMOL() {
    this.logger.info('Choosing In-person MOL');
    await this.waitForPageLoad();
    
    // Scroll to the in-person radio button
    const inPersonRadioElement = await this.page.$(this.selectors.inPersonRadioButton);
    if (!inPersonRadioElement) {
      throw new Error(`In-person radio button not found with selector: ${this.selectors.inPersonRadioButton}`);
    }
    await inPersonRadioElement.scrollIntoViewIfNeeded();
    
    // Click the in-person radio button
    await this.click(this.selectors.inPersonRadioButton);
    await this.page.waitForTimeout(500); // Wait for selection to register
    
    // Get the selected MOL text
    const selectedMOLElement = await this.page.$(this.selectors.inPersonMolTitle);
    if (!selectedMOLElement) {
      throw new Error(`In-person MOL title element not found with selector: ${this.selectors.inPersonMolTitle}`);
    }
    const molText = await selectedMOLElement.textContent();
    if (molText === null) {
      throw new Error('In-person MOL text content is null');
    }
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }

  /**
   * Choose the Online MOL option
   * @returns {Promise<string>} The selected MOL text
   */
  async chooseOnlineMOL() {
    this.logger.info('Choosing Online MOL');
    await this.waitForPageLoad();
    
    // Scroll to the online radio button
    const onlineRadioElement = await this.page.$(this.selectors.onlineRadioButton);
    if (!onlineRadioElement) {
      throw new Error(`Online radio button not found with selector: ${this.selectors.onlineRadioButton}`);
    }
    await onlineRadioElement.scrollIntoViewIfNeeded();
    
    // Click the online radio button
    await this.click(this.selectors.onlineRadioButton);
    await this.page.waitForTimeout(1000); // Wait for selection to register
    
    // Get the selected MOL text
    const selectedMOLElement = await this.page.$(this.selectors.molSelection);
    if (!selectedMOLElement) {
      throw new Error(`MOL selection element not found with selector: ${this.selectors.molSelection}`);
    }
    const molText = await selectedMOLElement.textContent();
    if (molText === null) {
      throw new Error('Online MOL text content is null');
    }
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }

  /**
   * Choose Associate or Bachelor degree type
   */
  async chooseAssOrBachDegreeType() {
    this.logger.info('Choosing Associate or Bachelor degree type');
    await this.waitForPageLoad();
    
    // Click the Associate or Bachelor degree type option
    await this.click(this.selectors.assOrBachDegreeType);
    await this.waitForPageLoad();
    
    // Verify selection
    await this.elementAssert.assertChecked(this.selectors.assOrBachDegreeType);
  }

  /**
   * Choose Pursue Degree degree type
   */
  async choosePursueDegreeType() {
    this.logger.info('Choosing Pursue Degree type');
    await this.waitForPageLoad();
    
    // Click the Pursue Degree type option
    await this.click(this.selectors.pursueDegreeType);
    await this.waitForPageLoad();
    
    // Verify selection
    await this.elementAssert.assertChecked(this.selectors.pursueDegreeType);
  }

  /**
   * Choose NDGVUS degree type
   */
  async chooseNDGVUSDegreeType() {
    this.logger.info('Choosing NDGVUS degree type');
    await this.waitForPageLoad();
    
    // Click the NDGVUS degree type option
    await this.click(this.selectors.ndgvusDegreeType);
    await this.waitForPageLoad();
    
    // Verify selection
    await this.elementAssert.assertChecked(this.selectors.ndgvusDegreeType);
  }

  /**
   * Enter account creation information
   * @param {string} email - Email address
   * @param {string} reemail - Re-entered email address
   * @param {string} password - Password
   * @param {string} repassword - Re-entered password
   * @returns {Promise<void>}
   */
  async enterAccountInfo(email, reemail, password, repassword) {
    this.logger.info(`Creating account with email: ${email}`);
    
    // Fill in account details
    await this.fill(this.selectors.email, email);
    await this.fill(this.selectors.reemail, reemail);
    await this.fill(this.selectors.password, password);
    await this.fill(this.selectors.repassword, repassword);
  }

  /**
   * Create a random account with valid information
   * @returns {Promise<object>} Account credentials
   */
  async createRandomAccount() {
    // Generate random email with timestamp to ensure uniqueness
    const timestamp = new Date().getTime();
    const randomEmail = `test.user.${timestamp}@example.com`;
    const validPassword = 'Test1234Pass!'; // Valid password meeting complexity requirements
    
    // Enter account information
    await this.enterAccountInfo(randomEmail, randomEmail, validPassword, validPassword);
    
    // Store credentials for later use
    const credentials = {
      email: randomEmail,
      password: validPassword
    };
    
    return credentials;
  }

  /**
   * Validate account creation inputs and error messages
   * @param {string} email - Email address
   * @param {string} reemail - Re-entered email address
   * @param {string} password - Password
   * @param {string} repassword - Re-entered password
   * @returns {Promise<boolean>} Whether the validation passed
   */
  async validateAccountInputs(email, reemail, password, repassword) {
    this.logger.info('Validating account creation inputs');
    let isValid = true;
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z]+\.[a-zA-Z]{2,4}$/;
    if (!emailRegex.test(email)) {
      try {
        await this.elementAssert.assertVisible(this.selectors.emailValidation);
        const emailError = await this.getText(this.selectors.emailValidation);
        await expect(emailError).toBe("Invalid email format.");
        this.logger.debug("Error message is visible for: Invalid email format.");
        isValid = false;
      } catch (error) {
        this.logger.debug("Error element not found for: Invalid email format.");
      }
    }
    
    // Validate reentered email
    if (emailRegex.test(reemail)) {
      this.logger.debug("Email is valid: " + reemail);
      if (reemail !== email) {
        try {
          const reemailError = await this.page.$(this.selectors.reemailValidation);
          const reemailErrorAlt = await this.page.$(this.selectors.reemailValidationAlt);
          
          if (reemailError || reemailErrorAlt) {
            if (reemailError) {
              const errorText = await reemailError.textContent();
              await expect(errorText).toBe("Email does not match.");
            } else if (reemailErrorAlt) {
              const errorText = await reemailErrorAlt.textContent();
              await expect(errorText).toBe("Invalid email format.");
            }
            this.logger.debug("Error message is visible in Reenter Email.");
            isValid = false;
          }
        } catch (error) {
          this.logger.debug("Error element not found in Reenter Email");
        }
      }
    }
    
    // Validate password length
    if (password.length < 10) {
      try {
        await this.elementAssert.assertVisible(this.selectors.passwordValidation10);
        const errorText = await this.getText(this.selectors.passwordValidation10);
        await expect(errorText).toBe("The password must be at least 10 characters long.");
        this.logger.debug("Correct error message displayed for password length");
        isValid = false;
      } catch (error) {
        this.logger.debug("Error element not found for: The password must be at least 10 characters long.");
      }
    }
    
    // Validate password contains at least 1 number
    if (!/\d/.test(password)) {
      try {
        await this.elementAssert.assertVisible(this.selectors.passwordValidation1);
        const errorText = await this.getText(this.selectors.passwordValidation1);
        await expect(errorText).toBe("The password must contain at least 1 number.");
        this.logger.debug("Correct error message displayed for password number requirement");
        isValid = false;
      } catch (error) {
        this.logger.debug("Error element not found for: The password must contain at least 1 number.");
      }
    }
    
    // Validate password contains at least 1 uppercase letter
    if (!/[A-Z]/.test(password)) {
      try {
        await this.elementAssert.assertVisible(this.selectors.passwordValidation1U);
        const errorText = await this.getText(this.selectors.passwordValidation1U);
        await expect(errorText).toBe("The password must contain at least 1 uppercase letter.");
        this.logger.debug("Correct error message displayed for password uppercase requirement");
        isValid = false;
      } catch (error) {
        this.logger.debug("Error element not found for: The password must contain at least 1 uppercase letter.");
      }
    }
    
    // Validate password contains at least 1 lowercase letter
    if (!/[a-z]/.test(password)) {
      try {
        await this.elementAssert.assertVisible(this.selectors.passwordValidation1L);
        const errorText = await this.getText(this.selectors.passwordValidation1L);
        await expect(errorText).toBe("The password must contain at least 1 lowercase letter.");
        this.logger.debug("Correct error message displayed for password lowercase requirement");
        isValid = false;
      } catch (error) {
        this.logger.debug("Error element not found for: The password must contain at least 1 lowercase letter.");
      }
    }
    
    return isValid;
  }

  /**
   * Verify the recaptcha element is present
   * @returns {Promise<boolean>} Whether the recaptcha is present
   */
  async verifyRecaptchaPresent() {
    try {
      await this.elementAssert.assertVisible(this.selectors.recaptcha);
      this.logger.debug('Recaptcha is present on the page');
      return true;
    } catch (error) {
      this.logger.error('Recaptcha is not present on the page');
      return false;
    }
  }

  /**
   * Verify that the landing page has loaded successfully
   * @returns {Promise<void>}
   */
  async verifyPageLoaded() {
    try {
      // Verify page title
      await expect(this.page).toHaveTitle(this.pageTitle, { timeout: this.assertionTimeout });
      
      // Verify key elements are visible
      for (const selector of this.expectedElements) {
        await expect(this.page.locator(selector)).toBeVisible({ 
          timeout: this.assertionTimeout 
        });
      }
      
      this.logger.info('Verified landing page loaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error verifying landing page: ${errorMessage}`);
      throw new Error(`Landing page did not load correctly: ${errorMessage}`);
    }
  }
}

module.exports = LandingPage;
