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
            loginWithAsuriteButton: 'button:has-text("Log In with ASURITE")',
            
            // Error Messages
            emailNotFoundError: 'text=Email not found',
            invalidEmailFormatError: 'text=Invalid email format', // Legacy selector - use getByText in methods
            incorrectCredentialsError: 'text=Incorrect email or password',
            
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
        await this.page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Click the "Log In with ASURITE" button
     * @returns {Promise<void>}
     */
    async clickLoginWithAsurite() {
        await this.page.click(this.selectors.loginWithAsuriteButton);
        await this.page.waitForLoadState('networkidle');
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
        return await this.page.getByText('Invalid email.').isVisible();
    }

    /**
     * Verify incorrect credentials error is displayed
     * @returns {Promise<boolean>}
     */
    async isIncorrectCredentialsErrorVisible() {
        return await this.page.isVisible(this.selectors.incorrectCredentialsError);
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
            await this.page.waitForLoadState('networkidle');
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
