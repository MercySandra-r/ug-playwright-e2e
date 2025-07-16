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
            emailInput: 'input[name="email"]',
            passwordInput: 'input[name="password"]',
            loginButton: 'button:has-text("Log In")',
            loginWithAsuriteButton: 'button:has-text("Log In with ASURITE")',
            createAccountLink: 'a[href*="/user/signup"]',
            resetPasswordLink: 'a[href*="/user/reset-password"]',
            
            // Error Messages
            emailNotFoundError: 'text=Email not found',
            invalidEmailFormatError: 'text=Invalid email format',
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
        await this.page.goto('/user/login');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Enter login credentials
     * @param {string} email - The email to enter
     * @param {string} password - The password to enter
     * @returns {Promise<void>}
     */
    async enterCredentials(email, password) {
        await this.page.fill(this.selectors.emailInput, email);
        await this.page.fill(this.selectors.passwordInput, password);
    }

    /**
     * Click the login button
     * @returns {Promise<void>}
     */
    async clickLogin() {
        await this.page.click(this.selectors.loginButton);
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
        return await this.page.isVisible(this.selectors.asuLoginForm);
    }

    /**
     * Verify the dashboard is displayed after successful login
     * @returns {Promise<boolean>}
     */
    async isDashboardDisplayed() {
        return await this.page.isVisible(this.selectors.dashboardHeader);
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
        return await this.page.isVisible(this.selectors.invalidEmailFormatError);
    }

    /**
     * Verify incorrect credentials error is displayed
     * @returns {Promise<boolean>}
     */
    async isIncorrectCredentialsErrorVisible() {
        return await this.page.isVisible(this.selectors.incorrectCredentialsError);
    }

    /**
     * Click the create account link
     * @returns {Promise<void>}
     */
    async clickCreateAccountLink() {
        await this.page.click(this.selectors.createAccountLink);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Click the reset password link
     * @returns {Promise<void>}
     */
    async clickResetPasswordLink() {
        await this.page.click(this.selectors.resetPasswordLink);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Perform a complete login with credentials
     * @param {string} email - The email to login with
     * @param {string} password - The password to login with
     * @returns {Promise<boolean>} - Returns true if login was successful, false otherwise
     */
    async login(email, password) {
        await this.navigateToLoginPage();
        await this.enterCredentials(email, password);
        await this.clickLogin();
        
        // Check if login was successful by looking for dashboard
        try {
            await this.page.waitForSelector(this.selectors.dashboardHeader, { timeout: 5000 });
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
