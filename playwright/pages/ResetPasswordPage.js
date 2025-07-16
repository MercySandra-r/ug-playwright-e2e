// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for Reset Password related actions
 */
class ResetPasswordPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);
        // Define page selectors
        this.selectors = {
            // Reset Password Page
            resetPasswordLink: 'a[href*="/user/reset-password"]',
            resetPasswordEmail: 'input[name="email"]',
            sendCodeButton: 'button:has-text("Send Code")',
            invalidEmailError: 'text=Invalid email format',
            
            // Set New Password Page
            newPasswordInput: 'input[name="newPassword"]',
            confirmPasswordInput: 'input[name="confirmPassword"]',
            resetPasswordButton: 'button:has-text("Reset Password")',
            returnToLoginLink: 'a[href*="/user/login"]',
            passwordMismatchError: 'text=Passwords do not match',
            passwordRequirements: 'text=Password must be at least 8 characters long',
            
            // Common
            pageTitle: 'h1',
            successMessage: 'text=Password reset successful'
        };
    }

    /**
     * Click the reset password link from the login page
     * @returns {Promise<void>}
     */
    async clickResetPasswordLink() {
        await this.page.click(this.selectors.resetPasswordLink);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify the reset password page is displayed
     * @returns {Promise<void>}
     */
    async verifyResetPasswordPage() {
        await expect(this.page).toHaveURL(/.*reset-password/);
        await expect(this.page.locator(this.selectors.pageTitle)).toContainText('Reset Password');
    }

    /**
     * Enter email in the reset password form
     * @param {string} email - The email address to enter
     * @returns {Promise<void>}
     */
    async enterEmail(email) {
        await this.page.fill(this.selectors.resetPasswordEmail, email);
    }

    /**
     * Click the send code button
     * @returns {Promise<void>}
     */
    async clickSendCode() {
        await this.page.click(this.selectors.sendCodeButton);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify invalid email error is displayed
     * @returns {Promise<boolean>}
     */
    async isInvalidEmailErrorVisible() {
        return await this.page.isVisible(this.selectors.invalidEmailError);
    }

    /**
     * Verify the set new password page is displayed
     * @returns {Promise<boolean>}
     */
    async isNewPasswordPageDisplayed() {
        await this.page.waitForURL(/.*new-password/);
        return await this.page.isVisible(this.selectors.newPasswordInput);
    }

    /**
     * Set a new password
     * @param {string} newPassword - The new password
     * @param {string} confirmPassword - The password confirmation
     * @returns {Promise<void>}
     */
    async setNewPassword(newPassword, confirmPassword) {
        await this.page.fill(this.selectors.newPasswordInput, newPassword);
        await this.page.fill(this.selectors.confirmPasswordInput, confirmPassword);
        await this.page.click(this.selectors.resetPasswordButton);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify password mismatch error is displayed
     * @returns {Promise<boolean>}
     */
    async isPasswordMismatchErrorVisible() {
        return await this.page.isVisible(this.selectors.passwordMismatchError);
    }

    /**
     * Verify password requirements error is displayed
     * @returns {Promise<boolean>}
     */
    async isPasswordRequirementsErrorVisible() {
        return await this.page.isVisible(this.selectors.passwordRequirements);
    }

    /**
     * Click the return to login link
     * @returns {Promise<void>}
     */
    async clickReturnToLogin() {
        await this.page.click(this.selectors.returnToLoginLink);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify success message is displayed
     * @returns {Promise<boolean>}
     */
    async isSuccessMessageVisible() {
        return await this.page.isVisible(this.selectors.successMessage);
    }
}

module.exports = ResetPasswordPage;
