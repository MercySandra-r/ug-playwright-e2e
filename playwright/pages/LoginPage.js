// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for Login related actions
 */
class LoginPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);
        // Define page selectors
        this.selectors = {
            // Login Form
            // emailInput, passwordInput and loginButton now use getByRole - see respective methods
            emailInput: 'input[name="email"]', // Legacy selector - use getByRole in methods
            passwordInput: 'input[name="password"]', // Legacy selector - use getByRole in methods
            loginButton: 'button:has-text("Log In")', // Legacy selector - use getByRole in methods
            // IdP landing option; a <button> whose name comes from its text.
            loginWithAsuriteButton: 'button:has-text("Sign In with ASURITE ID")',

            // Error Messages (IdP wording, verified live 2026-11-10)
            emailNotFoundError: 'text=Email not found',
            invalidEmailFormatError: 'text=Please enter a valid email address',
            incorrectCredentialsError: 'text=Incorrect username or password',
            
            // Page Elements
            pageTitle: 'h1',
            asuLoginForm: '#login-form',
            
            // Dashboard (after successful login)
            dashboardHeader: 'h1:has-text("Dashboard")'
        };
    }

    /**
     * Navigate to the login page
     * @returns {Promise<void>}
     */
    async navigateToLoginPage() {
        // The app's own /user/login page is gone (404). Sign-in now happens on ASU's
        // IdP (login.asu.edu), reached from the app's "Sign in" button.
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
        await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
        await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
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
        return this.page.getByRole('button', { name: 'Sign in', exact: true });
    }

    /**
     * Focus and leave the empty Email and Password fields so the IdP shows its
     * "is required" messages (the disabled Sign in button can't be clicked).
     * @returns {Promise<void>}
     */
    async touchEmptyFields() {
        await this.page.getByRole('textbox', { name: 'Email', exact: true }).click();
        await this.page.getByRole('textbox', { name: 'Password', exact: true }).click();
        await this.page.getByRole('textbox', { name: 'Email', exact: true }).click();
    }

    /**
     * Click "Sign In with ASURITE ID". It lives on the IdP landing page, so step back
     * from the email form first if needed.
     * @returns {Promise<void>}
     */
    async clickLoginWithAsurite() {
        if (/email-password-login/.test(this.page.url())) {
            await this.page.getByRole('link', { name: 'Back to other sign in options' }).click();
        }
        await this.page.locator(this.selectors.loginWithAsuriteButton).click();
        await this.settle();
    }

    /**
     * Verify the ASURITE login page is displayed
     * @returns {Promise<boolean>}
     */
    async isAsuLoginPageDisplayed() {
        await this.page.waitForURL(/.*weblogin\.asu\.edu/);
        // Check for ASURITE-specific elements that are visible on the page
        const signInHeading = await this.page.getByRole('heading', { name: 'Sign In' }).isVisible();
        const asuriteUserIdField = await this.page.getByRole('textbox', { name: 'ASURITE User ID' }).isVisible();
        return signInHeading && asuriteUserIdField;
    }

    /**
     * Verify the dashboard is displayed after successful login
     * @returns {Promise<boolean>}
     */
    async isDashboardDisplayed() {
        return await this.page.getByText('Welcome').isVisible();
    }

    /**
     * Verify email not found error is displayed
     * @returns {Promise<boolean>}
     */
    async isEmailNotFoundErrorVisible() {
        return await this.page.isVisible(this.selectors.emailNotFoundError);
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
