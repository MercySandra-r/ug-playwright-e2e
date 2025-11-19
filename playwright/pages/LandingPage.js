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
const VerifyEmailPage = require('./VerifyEmailPage');

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
    
    // Page verification elements
    this.pageTitle = 'Arizona State University | ASU';
    
    // Define selectors for page elements
    this.selectors = {
      // Navigation and main elements
      viewAppDetailsBtn: 'button:has-text("View Application Details")',
      appDetailsSection: 'main',
      createAccountLink: 'button:has-text("Create account")',
      loginBtn: 'role=link[name="Log in"]',
      molRadioGroup: 'div[role="radiogroup"]',

      // Footer container
      footerContainer: 'footer[role="contentinfo"]',

      // MOL (Mode of Learning) options - using role and name for better reliability
      inPersonRadioButton: 'role=radio[name*="In-person"]',
      onlineRadioButton: 'role=radio[name*="Online Online I want to take"]',
      molSelection: 'role=radiogroup',
      inPersonMolTitle: 'role=heading[name*="In-person" i]',
      inPersonLearnMore: 'role=link[name*="Learn more about in-person programs" i]',
      onlineLearnMore: 'role=link[name*="Learn more about online programs" i]',
      inPersonTitle: 'role=heading[name*="In-Person Programs" i]',
      onlineTitle: 'role=heading[name*="Online Programs" i]',
      molBackBtn: 'role=button[name="Back"]',

      // Degree type options - using role and name for better reliability
      pursueDegreeRadio: 'role=radio[name*="Yes, I want to pursue an"]',
      individualCoursesRadio: 'role=radio[name*="No, I want to take individual"]',
      degreeTypeContinueBtn: 'role=button[name="Continue"]',

      // Account creation
      email: 'role=textbox[name="Enter your email"]',
      reemail: 'role=textbox[name="Confirm your email"]', 
      password: 'role=textbox[name="Create a password"]',
      repassword: 'role=textbox[name="Confirm your password"]',
      recaptcha: '[data-cy="recaptcha-container"]',

      // Validation elements
      emailValidation: 'getByText("Invalid email.")',
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

    // Define expected elements for page verification
    this.expectedElements = [
      this.selectors.viewAppDetailsBtn,
      this.selectors.createAccountLink,
      this.selectors.loginBtn,
      this.selectors.molRadioGroup
    ];

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
    
    // First, select a radio button (either In-person or Online)
    await this.chooseInPersonMOL();
    await this.page.waitForTimeout(1000); // Wait for UI to update
    
    // Scroll to the create account section before validation
    await this.scrollToCreateAccountSection();
    
    // Fill out the required form fields before attempting navigation
    this.logger.debug('Filling out account creation form fields');
    
    // Generate test credentials
    const testEmail = `test.user+${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Fill email field
    await this.elementAssert.assertVisible(this.selectors.email);
    await this.fill(this.selectors.email, testEmail);
    this.logger.debug('Email field filled');
    
    // Fill confirm email field
    await this.elementAssert.assertVisible(this.selectors.reemail);
    await this.fill(this.selectors.reemail, testEmail);
    this.logger.debug('Confirm email field filled');
    
    // Fill password field
    await this.elementAssert.assertVisible(this.selectors.password);
    await this.fill(this.selectors.password, testPassword);
    this.logger.debug('Password field filled');
    
    // Fill confirm password field
    await this.elementAssert.assertVisible(this.selectors.repassword);
    await this.fill(this.selectors.repassword, testPassword);
    this.logger.debug('Confirm password field filled');
    
    // Wait for form validation to complete
    await this.page.waitForTimeout(1000);
    
    // Now the Create Account link should be visible and enabled
    await this.elementAssert.assertVisible(this.selectors.createAccountLink);
    
    // Scroll to the create account link
    const createAccountElement = await this.page.$(this.selectors.createAccountLink);
    if (!createAccountElement) {
      throw new Error(`Create account element not found with selector: ${this.selectors.createAccountLink}`);
    }
    await createAccountElement.scrollIntoViewIfNeeded();
    
    // Get current page information before clicking
    const currentPageUrl = this.page.url();
    
    // Click the create account link which may open in a new tab
    await this.click(this.selectors.createAccountLink);
    await this.page.waitForTimeout(5000); // Wait for new tab to open
    
    // Check for new tab/window
    const pages = this.page.context().pages();
    let createAccountPage = pages[pages.length - 1];
    
    try {
      // If new page opened, verify the URL and close it
      if (pages.length > 1 && createAccountPage !== this.page) {
        const newPageUrl = createAccountPage.url();
        
        if (newPageUrl.includes('webapp4.asu.edu/uga_admissionsapp/') || newPageUrl.includes('apply-qa.apps.asu.edu/user/verify-email')) {
          this.logger.debug('Create An Account here link works as expected!');
          await createAccountPage.close();
        } else {
          this.logger.error(`Unexpected URL in new tab: ${newPageUrl}`);
          throw new Error(`Create account link navigated to unexpected URL: ${newPageUrl}`);
        }
      } else {
        // Check if we're still on the same page or redirected
        const newUrl = this.page.url();
        if (newUrl !== currentPageUrl && (newUrl.includes('uga_admissionsapp') || newUrl.includes('apply-qa.apps.asu.edu/user/verify-email'))) {
          this.logger.debug('Create An Account here link works as expected!');
          await this.page.goBack();
          await this.waitForPageLoad();
        } else {
          throw new Error('Create account link did not navigate to expected page');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error validating create account link: ${errorMessage}`);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Scroll to the create account section to ensure elements are visible
   * @returns {Promise<void>}
   */
  async scrollToCreateAccountSection() {
    try {
      this.logger.debug('Scrolling to create account section...');
      
      // Try to scroll to the "Ok, let's get your account created" heading
      const accountHeading = this.page.locator('h2:has-text("Ok, let\'s get your account created")');
      
      if (await accountHeading.count() > 0) {
        await accountHeading.scrollIntoViewIfNeeded();
        // Wait a moment for the scroll to complete
        await this.page.waitForTimeout(500);
        this.logger.debug('Scrolled to account creation heading');
      } else {
        // Fallback: scroll to first email textbox
        const emailField = this.page.locator(this.selectors.email);
        if (await emailField.count() > 0) {
          await emailField.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(500);
          this.logger.debug('Scrolled to email field');
        } else {
          this.logger.warn('Could not find account creation section to scroll to');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to scroll to create account section: ${errorMessage}`);
      // Don't throw error here, let the visibility assertions handle it
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
   * @param {Object} options - Options for MOL selection
   * @param {string} [options.degreeType='pursue'] - Type of degree to select ('pursue' or 'individual')
   * @returns {Promise<string>} The selected MOL text
   */
  async chooseRandomMOL(options = {}) {
    const { degreeType = 'pursue' } = options;
    this.logger.info('Choosing random MOL');
    
    await this.waitForPageLoad();
    
    // Get all MOL radio buttons
    const radioButtons = [
      { selector: this.selectors.inPersonRadioButton, method: this.chooseInPersonMOL.bind(this) },
      { selector: this.selectors.onlineRadioButton, method: this.chooseOnlineMOL.bind(this) }
    ];
    
    // Choose a random radio button
    const randomIndex = Math.floor(Math.random() * radioButtons.length);
    const selectedOption = radioButtons[randomIndex];
    
    // Use the appropriate method to select the MOL and handle degree type
    const molText = await selectedOption.method({ degreeType });
    
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }

  /**
   * Select degree type after MOL selection
   * @param {string} degreeType - Type of degree to select ('pursue' or 'individual')
   * @returns {Promise<void>}
   */
  async selectDegreeType(degreeType = 'pursue') {
    this.logger.info(`Selecting degree type: ${degreeType}`);
    
    // Check if Edit link is visible (degree type already selected)
    const editLink = this.page.getByRole('link', { name: 'Edit' });
    const isEditVisible = await editLink.isVisible().catch(() => false);
    
    if (isEditVisible) {
      this.logger.debug('Degree type already selected, clicking Edit to modify');
      await editLink.click();
      await this.page.waitForTimeout(1000); // Wait for UI to expand
    }
    
    // Wait for the degree type options to be visible
    await this.page.waitForSelector(this.selectors.pursueDegreeRadio, { state: 'visible' });
    
    // Select the appropriate radio button
    if (degreeType.toLowerCase() === 'pursue') {
      await this.click(this.selectors.pursueDegreeRadio);
    } else {
      await this.click(this.selectors.individualCoursesRadio);
    }
    
    // Wait for the form to update (no Continue button needed)
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Choose the In-person MOL option
   * @param {Object} options - Options for MOL selection
   * @param {string} [options.degreeType='pursue'] - Type of degree to select ('pursue' or 'individual')
   * @returns {Promise<string>} The selected MOL text
   */
  async chooseInPersonMOL(options = {}) {
    const { degreeType = 'pursue' } = options;
    this.logger.info('Choosing In-person MOL');
    
    await this.waitForPageLoad();
    
    // Scroll to the in-person radio button and click it
    const inPersonRadioElement = await this.page.$(this.selectors.inPersonRadioButton);
    if (!inPersonRadioElement) {
      throw new Error(`In-person radio button not found with selector: ${this.selectors.inPersonRadioButton}`);
    }
    await inPersonRadioElement.scrollIntoViewIfNeeded();
    await this.click(this.selectors.inPersonRadioButton);
    
    // Handle degree type selection
    await this.selectDegreeType(degreeType);
    
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
   * @param {Object} options - Options for MOL selection
   * @param {string} [options.degreeType='pursue'] - Type of degree to select ('pursue' or 'individual')
   * @returns {Promise<string>} The selected MOL text
   */
  async chooseOnlineMOL(options = {}) {
    const { degreeType = 'pursue' } = options;
    this.logger.info('Choosing Online MOL');
    
    await this.waitForPageLoad();
    
    // Scroll to the online radio button and click it
    const onlineRadioElement = await this.page.$(this.selectors.onlineRadioButton);
    if (!onlineRadioElement) {
      throw new Error(`Online radio button not found with selector: ${this.selectors.onlineRadioButton}`);
    }
    await onlineRadioElement.scrollIntoViewIfNeeded();
    await this.click(this.selectors.onlineRadioButton);
    
    // Handle degree type selection
    await this.selectDegreeType(degreeType);
    
    // Get the selected MOL text from the Online heading
    const onlineHeading = this.page.getByRole('heading', { name: 'Online', level: 3 });
    const molText = await onlineHeading.textContent();
    if (molText === null) {
      throw new Error('Online MOL text content is null');
    }
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }




  /**
   * Enter account information into the form fields
   * @param {string} email - Email address
   * @param {string} reemail - Re-entered email address
   * @param {string} password - Password
   * @param {string} repassword - Re-entered password
   * @returns {Promise<void>}
   */
  async enterAccountInfo(email, reemail, password, repassword) {
    this.logger.info(`Creating account with email: ${email}`);
    await this.fill(this.selectors.email, email);
    await this.fill(this.selectors.reemail, reemail);
    await this.fill(this.selectors.password, password);
    await this.fill(this.selectors.repassword, repassword);
  }

  /**
   * Submit the account creation form by clicking the Create account button
   * @returns {Promise<void>}
   */
  async submitAccountForm() {
    this.logger.info('Submitting account creation form');
    
    // Click the Create account button to submit the form
    await this.click(this.selectors.createAccountLink);
    
    // Wait 20 seconds after clicking Create account button for processing
    this.logger.info('Waiting 20 seconds for account creation to process...');
    await this.page.waitForTimeout(20000);
    
    // Then wait for navigation to verify-email page
    try {
      await this.page.waitForURL('**/user/verify-email', { timeout: 45000 });
      this.logger.debug('Navigated to verify email page');
    } catch (e) {
      // Fallback small delay to allow late navigation in slower environments
      this.logger.warn('Verify email navigation not detected within timeout; adding short delay');
      await this.page.waitForTimeout(3000);
    }
  }

  /**
   * Create a random account with valid information
   * @param {{ mode?: 'in-person'|'online'|'random', degreeType?: 'pursue'|'individual' }} [options]
   * @returns {Promise<{email: string, password: string}>} Account credentials
   */
  async createRandomAccount(options = {}) {
    // Options: { mode: 'in-person' | 'online' | 'random', degreeType: 'pursue' | 'individual' }
    const { mode = 'random', degreeType = 'pursue' } = options;
    
    // Ensure an MOL (In-person/Online) is selected and degree type is set before filling
    await this.waitForPageLoad();
    
    // First select MOL to make the account creation form visible
    if (mode === 'in-person') {
      await this.chooseInPersonMOL({ degreeType });
    } else if (mode === 'online') {
      await this.chooseOnlineMOL({ degreeType });
    } else {
      await this.chooseRandomMOL({ degreeType });
    }
    
    // Wait for the account creation form to be fully loaded
    await this.page.waitForLoadState('networkidle');
    
    // Ensure the email field is visible before proceeding
    await this.waitForVisible(this.selectors.email, this.assertionTimeout);

    // Generate random email with timestamp to ensure uniqueness
    const timestamp = new Date().getTime();
    const randomEmail = `test.user.${timestamp}@example.com`;
    const validPassword = 'Test1234Pass!'; // Valid password meeting complexity requirements
    
    // Enter account information
    await this.enterAccountInfo(randomEmail, randomEmail, validPassword, validPassword);
    
    // Submit the form by clicking the Create account button
    await this.submitAccountForm();
    
    // Store credentials for later use
    const credentials = {
      email: randomEmail,
      password: validPassword
    };
    
    return credentials;
  }

  /**
   * Wait for Verify Email page and return its page object
   * @returns {Promise<import('./VerifyEmailPage')>}
   */
  async waitForVerifyEmailPage() {
    await this.page.waitForURL('**/user/verify-email', { timeout: 45000 });
    await expect(this.page.getByRole('heading', { name: 'Step 1: Check your email' })).toBeVisible();
    return new VerifyEmailPage(this.page);
  }

  /**
   * Create a random account and proceed to the Verify Email page
   * @param {{ mode?: 'in-person'|'online'|'random', degreeType?: 'pursue'|'individual' }} [options]
   * @returns {Promise<{ credentials: { email: string, password: string }, verifyEmailPage: any }>}
   */
  async createAccountAndGoToVerifyEmail(options = {}) {
    const credentials = await this.createRandomAccount(options);
    const verifyEmailPage = await this.waitForVerifyEmailPage();
    return { credentials, verifyEmailPage };
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
    
    // Validate email format - Updated regex to allow dots in email
    const emailRegex = /^[a-zA-Z0-9.]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,4}$/;
    if (!emailRegex.test(email)) {
      this.logger.debug(`Invalid email format detected: ${email}`);
      isValid = false;
    }
    
    // Validate reentered email
    if (!emailRegex.test(reemail) || reemail !== email) {
      this.logger.debug(`Email mismatch or invalid reentered email detected: ${reemail}`);
      isValid = false;
    }
    
    // Validate password length
    if (password.length < 10) {
      this.logger.debug("Password too short detected.");
      isValid = false;
    }
    
    // Validate password contains at least 1 number
    if (!/\d/.test(password)) {
      this.logger.debug("Password missing number detected.");
      isValid = false;
    }
    
    // Validate password contains at least 1 uppercase letter
    if (!/[A-Z]/.test(password)) {
      this.logger.debug("Password missing uppercase letter detected.");
      isValid = false;
    }
    
    // Validate password contains at least 1 lowercase letter
    if (!/[a-z]/.test(password)) {
      this.logger.debug("Password missing lowercase letter detected.");
      isValid = false;
    }
    
    // Validate confirm password length
    if (repassword.length < 10) {
      this.logger.debug("Confirm password too short detected.");
      isValid = false;
    }
    
    // Validate confirm password contains at least 1 number
    if (!/\d/.test(repassword)) {
      this.logger.debug("Confirm password missing number detected.");
      isValid = false;
    }
    
    // Validate confirm password contains at least 1 uppercase letter
    if (!/[A-Z]/.test(repassword)) {
      this.logger.debug("Confirm password missing uppercase letter detected.");
      isValid = false;
    }
    
    // Validate confirm password contains at least 1 lowercase letter
    if (!/[a-z]/.test(repassword)) {
      this.logger.debug("Confirm password missing lowercase letter detected.");
      isValid = false;
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
