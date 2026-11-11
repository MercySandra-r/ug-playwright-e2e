// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for signing in. The app's own /user/login page is gone (404): sign-in
 * happens on ASU's IdP (login.asu.edu), reached from the app's "Sign in" button.
 * Messages are the IdP's wording (verified live 2026-11-10).
 *
 * POM rule for this page: every element is declared in `this.selectors`. Specs use
 * these names and the methods below, never their own locators.
 */
class LoginPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);
        this.selectors = {
            // IdP "Sign in with email" form
            emailInput: 'role=textbox[name="Email"s]',
            passwordInput: 'role=textbox[name="Password"s]',
            signInButton: 'role=button[name="Sign in"s]',
            backToOptionsLink: 'role=link[name="Back to other sign in options"]',
            forgotPasswordLink: 'role=link[name="Forgot password?"]',
            // IdP landing option; hands off to ASU web login (weblogin.asu.edu)
            asuriteButton: 'role=button[name="Sign In with ASURITE ID"]',

            // Messages (IdP wording)
            invalidEmailFormatError: 'text=Please enter a valid email address',
            incorrectCredentialsError: 'text=Incorrect username or password',
            emailRequiredError: 'text="Email is required"',
            passwordRequiredError: 'text="Password is required"',

            // ASU web login (weblogin.asu.edu)
            asuriteSignInHeading: 'role=heading[name="Sign In"]',
            asuriteUserIdInput: 'role=textbox[name="ASURITE User ID"]',

            // App after sign-in
            welcomeText: 'text=Welcome',
        };
    }

    /**
     * Open the IdP "Sign in with email" form via the app's Sign in button.
     * @returns {Promise<void>}
     */
    async navigateToLoginPage() {
        const AsuIdpPage = require('./AsuIdpPage');
        const idp = new AsuIdpPage(this.page);
        await idp.startFromApp();
        await idp.openLoginFromIdp();
    }

    /**
     * Enter login credentials on the IdP "Sign in with email" form.
     * @param {string} email - The email to enter
     * @param {string} password - The password to enter
     * @returns {Promise<void>}
     */
    async enterCredentials(email, password) {
        await this.page.locator(this.selectors.emailInput).fill(email);
        await this.page.locator(this.selectors.passwordInput).fill(password);
    }

    /**
     * Submit the IdP sign-in form.
     * @returns {Promise<void>}
     */
    async clickLogin() {
        await this.signInButton().click();
        await this.settle();
    }

    /**
     * The IdP email form's submit button (disabled until the form is valid).
     * @returns {import('@playwright/test').Locator}
     */
    signInButton() {
        return this.page.locator(this.selectors.signInButton);
    }

    /**
     * Focus and leave the empty Email and Password fields so the IdP shows its
     * "is required" messages (the disabled Sign in button can't be clicked).
     * @returns {Promise<void>}
     */
    async touchEmptyFields() {
        await this.page.locator(this.selectors.emailInput).click();
        await this.page.locator(this.selectors.passwordInput).click();
        await this.page.locator(this.selectors.emailInput).click();
    }

    /**
     * Both "is required" messages are shown and Sign in stays disabled.
     * @returns {Promise<void>}
     */
    async verifyRequiredFieldErrors() {
        await expect(this.page.locator(this.selectors.emailRequiredError)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.passwordRequiredError)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.signInButton()).toBeDisabled();
    }

    /**
     * Click "Forgot password?" on the email sign-in form.
     * @returns {Promise<import('./ForgotPasswordPage')>} the reset page, on its email step
     */
    async openForgotPassword() {
        const ForgotPasswordPage = require('./ForgotPasswordPage');
        await this.page.locator(this.selectors.forgotPasswordLink).click();
        const forgot = new ForgotPasswordPage(this.page);
        await forgot.waitForEmailStep();
        return forgot;
    }

    /**
     * Click "Sign In with ASURITE ID". It lives on the IdP landing page, so step back
     * from the email form first if needed.
     * @returns {Promise<void>}
     */
    async clickLoginWithAsurite() {
        if (/email-password-login/.test(this.page.url())) {
            await this.page.locator(this.selectors.backToOptionsLink).click();
        }
        await this.page.locator(this.selectors.asuriteButton).click();
        await this.settle();
    }

    /**
     * Verify the ASURITE login page is displayed
     * @returns {Promise<boolean>}
     */
    async isAsuLoginPageDisplayed() {
        await this.page.waitForURL(/.*weblogin\.asu\.edu/);
        const signInHeading = await this.page.locator(this.selectors.asuriteSignInHeading).isVisible();
        const asuriteUserIdField = await this.page.locator(this.selectors.asuriteUserIdInput).isVisible();
        return signInHeading && asuriteUserIdField;
    }

    /**
     * Is the IdP sign-in options page (login.asu.edu/login) shown?
     * @returns {Promise<boolean>}
     */
    async isSignInOptionsPageDisplayed() {
        await this.page.waitForURL(/login\.asu\.edu\/login/, { timeout: this.navigationTimeout });
        return this.page.locator(this.selectors.asuriteButton).isVisible();
    }

    /**
     * Verify the dashboard is displayed after successful login
     * @returns {Promise<boolean>}
     */
    async isDashboardDisplayed() {
        return this.page.locator(this.selectors.welcomeText).first().isVisible();
    }

    /**
     * Verify invalid email format error is displayed
     * @returns {Promise<boolean>}
     */
    async isInvalidEmailFormatErrorVisible() {
        return this.page.locator(this.selectors.invalidEmailFormatError).first()
            .waitFor({ state: 'visible', timeout: this.assertionTimeout })
            .then(() => true).catch(() => false);
    }

    /**
     * Verify incorrect credentials error is displayed
     * @returns {Promise<boolean>}
     */
    async isIncorrectCredentialsErrorVisible() {
        // The IdP answers after a server round-trip, so wait rather than check once.
        return this.page.locator(this.selectors.incorrectCredentialsError).first()
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true).catch(() => false);
    }

    /**
     * Perform a complete login with credentials
     * @param {string} email - The email to login with
     * @param {string} password - The password to login with
     * @returns {Promise<boolean>} - Returns true if login was successful, false otherwise
     */
    async login(email, password) {
        // Callers often run navigateToLoginPage() first; only start over if we're not
        // already on the IdP email sign-in form.
        if (!/login\.asu\.edu\/email-password-login/.test(this.page.url())) {
            await this.navigateToLoginPage();
        }
        await this.enterCredentials(email, password);
        await this.clickLogin();

        // Success = the OAuth callback returned us to the application.
        try {
            await this.page.waitForURL(/apply-qa\.apps\.asu\.edu\/(?!easso)/, { timeout: 45000 });
            await this.settle();
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Validate email format
     * @param {string} email - The email to validate
     * @returns {boolean}
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password meets requirements
     * @param {string} password - The password to validate
     * @returns {boolean}
     */
    isValidPassword(password) {
        // At least 10 characters, one uppercase, one lowercase, one number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
        return passwordRegex.test(password);
    }
}

module.exports = LoginPage;
