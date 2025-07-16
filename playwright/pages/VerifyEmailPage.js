// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for Verify Email related actions
 */
class VerifyEmailPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);
        // Define page selectors
        this.selectors = {
            pageTitle: 'h1:has-text("Step 1: Check your email")',
            emailText: 'h1:has-text("Step 1: Check your email") + p > strong',
            loginButton: 'button:has-text("Login to continue")',
            resendEmailButton: 'button:has-text("Resend email verification")',
            resendSuccessMessage: 'text=Verification email has been resent',
            loginToContinueText: 'text=Login to continue',
            appDetailsSection: 'div[data-cy="app-details-section"]'
        };
    }

    /**
     * Verify the email verification page is displayed
     * @returns {Promise<void>}
     */
    async verifyEmailPage() {
        await this.page.waitForURL('**/user/verify-email');
        await expect(this.page).toHaveURL(/.*verify-email/);
        await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible();
    }

    /**
     * Verify the email address displayed matches the expected email
     * @param {string} expectedEmail - The expected email address
     * @returns {Promise<void>}
     */
    async verifyEmail(expectedEmail) {
        const emailElement = this.page.locator(this.selectors.emailText);
        await expect(emailElement).toBeVisible();
        const actualEmail = await emailElement.textContent();
        expect(actualEmail).toBe(expectedEmail);
    }

    /**
     * Click the login button
     * @returns {Promise<void>}
     */
    async clickLoginButton() {
        const loginButton = this.page.locator(this.selectors.loginButton);
        await loginButton.scrollIntoViewIfNeeded();
        await loginButton.click();
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify the login button is visible and enabled
     * @returns {Promise<boolean>}
     */
    async isLoginButtonVisible() {
        return await this.page.locator(this.selectors.loginButton).isVisible();
    }

    /**
     * Click the resend email button
     * @returns {Promise<void>}
     */
    async clickResendEmail() {
        const resendButton = this.page.locator(this.selectors.resendEmailButton);
        await resendButton.click();
        // Wait for the success message to appear
        await expect(this.page.locator(this.selectors.resendSuccessMessage)).toBeVisible({
            timeout: 10000
        });
    }

    /**
     * Verify the resend email success message is displayed
     * @returns {Promise<boolean>}
     */
    async isResendSuccessMessageVisible() {
        return await this.page.locator(this.selectors.resendSuccessMessage).isVisible();
    }

    /**
     * Navigate back to the previous page
     * @returns {Promise<void>}
     */
    async goBack() {
        await this.page.goBack();
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify the app details section is visible
     * @returns {Promise<boolean>}
     */
    async isAppDetailsSectionVisible() {
        return await this.page.locator(this.selectors.appDetailsSection).isVisible();
    }
}

module.exports = VerifyEmailPage;
