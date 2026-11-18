/**
 * LandingPage Class
 * 
 * This page object represents the landing/entry page of the application.
 * It includes functionality for navigating the landing page, interacting with MOL options,
 * and starting sign-in / sign-up (which now happen on ASU's IdP, login.asu.edu).
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
    
    // Page verification elements
    this.pageTitle = 'Arizona State University | ASU';
    
    // Define selectors for page elements
    this.selectors = {
      // Navigation and main elements
      viewAppDetailsBtn: 'button:has-text("View Application Details")',
      appDetailsSection: 'main',
      loginBtn: 'role=button[name="Sign in"]',
      molRadioGroup: 'div[role="radiogroup"]',

      // Footer container
      footerContainer: 'footer[role="contentinfo"]',

      // MOL (Mode of Learning) options - using role and name for better reliability
      // Mode-of-learning options are <button role="radio" value="..."> with no accessible
      // name of their own, so match on value (verified live 2026-11-10).
      inPersonRadioButton: '[role="radio"][value="in-person"]',
      onlineRadioButton: '[role="radio"][value="online"]',
      // Shown as the chosen mode on the ASU Local landing link (/?asulocal=)
      asuLocalChoice: 'text=ASU Local',
      molSelection: 'role=radiogroup',
      inPersonMolTitle: 'role=heading[name*="In-person" i]',
      inPersonLearnMore: 'role=link[name*="Learn more about in-person programs" i]',
      onlineLearnMore: 'role=link[name*="Learn more about online programs" i]',
      inPersonTitle: 'role=heading[name*="In-Person Programs" i]',
      onlineTitle: 'role=heading[name*="Online Programs" i]',
      molBackBtn: 'role=button[name="Back"]',

      // Degree type options - using role and name for better reliability
      pursueDegreeRadio: '[role="radio"][value="DG"]',
      individualCoursesRadio: '[role="radio"][value="NDG"]',
      degreeTypeContinueBtn: 'role=button[name="Continue"]',

      // Progress elements
      loader: '[data-cy="loader"]',
      progressbar: '[data-cy="progress-bar"]'
    };

    // Define expected elements for page verification
    this.expectedElements = [
      this.selectors.viewAppDetailsBtn,
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
   * Validate the "Sign in" button: it should hand off to ASU's IdP (login.asu.edu).
   * The old "Log in" link and in-app /user/login page no longer exist.
   * @returns {Promise<void>}
   */
  async validateLoginFunctionality() {
    this.logger.info('Validating Sign in functionality');

    await this.elementAssert.assertVisible(this.selectors.loginBtn);
    this.logger.debug('Sign in button is present on the landing page');

    await this.click(this.selectors.loginBtn);
    await this.page.waitForURL(/login\.asu\.edu/, { timeout: this.navigationTimeout });
    this.logger.debug(`Redirected to IdP: ${this.getCurrentUrl()}`);

    // Navigate back to landing page
    await this.page.goBack();
    await this.waitForPageLoad();
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
    
    // Wait for the radio: after a back navigation the page redraws it a moment later.
    const radio = this.page.locator(this.selectors.inPersonRadioButton).first();
    await radio.waitFor({ state: 'visible', timeout: this.navigationTimeout }).catch(() => {
      throw new Error(`In-person radio button not found with selector: ${this.selectors.inPersonRadioButton}`);
    });
    await radio.scrollIntoViewIfNeeded();
    await this.click(this.selectors.inPersonRadioButton);
    
    // Handle degree type selection
    await this.selectDegreeType(degreeType);
    
    // After selection the option collapses to a summary ("In-person Edit"), so record
    // the chosen mode directly instead of reading it back from a heading.
    const molText = 'In-person';
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }

  /**
   * ASU Local: opened through its own landing link (/?asulocal=), which preselects the mode
   * ("ASU Local" with an Edit link) and asks no degree question; Continue is next.
   * @returns {Promise<string>} the selected MOL text
   */
  async verifyAsuLocalMOL() {
    await this.waitForPageLoad();
    await this.page.locator(this.selectors.asuLocalChoice).first()
      .waitFor({ state: 'visible', timeout: this.navigationTimeout });
    this.selectedMOL = 'ASU Local';
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
    
    // Wait for the radio: after a back navigation the page redraws it a moment later.
    const radio = this.page.locator(this.selectors.onlineRadioButton).first();
    await radio.waitFor({ state: 'visible', timeout: this.navigationTimeout }).catch(() => {
      throw new Error(`Online radio button not found with selector: ${this.selectors.onlineRadioButton}`);
    });
    await radio.scrollIntoViewIfNeeded();
    await this.click(this.selectors.onlineRadioButton);
    
    // Handle degree type selection
    await this.selectDegreeType(degreeType);
    
    const molText = 'Online';
    this.selectedMOL = molText;
    this.logger.debug(`How would you like to attend? ${this.selectedMOL}`);
    
    return this.selectedMOL;
  }




  /**
   * Create a random account with valid information
   * @param {{ mode?: 'in-person'|'online'|'asu-local'|'random', degreeType?: 'pursue'|'individual' }} [options]
   * @returns {Promise<{email: string, password: string}>} Account credentials
   */
  async createRandomAccount(options = {}) {
    const { mode = 'random', degreeType = 'pursue' } = options;

    // The in-app account form is gone. New accounts are created on ASU's IdP
    // (landing -> mode -> degree -> Continue -> login.asu.edu sign-up) and verified
    // with the emailed code via the Gmail test inbox. See docs/EMAIL_VERIFICATION_SETUP.md.
    const { signUpVerifiedAccount } = require('../utils/authHelper');
    return signUpVerifiedAccount(this.page, { mode, degreeType });
  }

  /**
   * Create a random account and proceed to the Verify Email page
   * @param {{ mode?: 'in-person'|'online'|'asu-local'|'random', degreeType?: 'pursue'|'individual' }} [options]
   * @returns {Promise<{ credentials: { email: string, password: string }, verifyEmailPage: any }>}
   */
  async createAccountAndGoToVerifyEmail(options = {}) {
    // Verification now completes inside createRandomAccount (IdP code via Gmail), and
    // the old /user/verify-email page no longer exists, so there is no page to return.
    const credentials = await this.createRandomAccount(options);
    return { credentials, verifyEmailPage: null };
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
