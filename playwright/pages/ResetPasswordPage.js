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
            invalidEmailError: 'text=Invalid email.',
            
            // Verification Code Page
            verificationCodeInput: 'input[name="verificationCode"]',
            verifyCodeButton: 'button:has-text("Verify Code")',
            resendCodeButton: 'button:has-text("Resend Code")',
            invalidCodeError: 'text=Invalid verification code',
            
            // Set New Password Page
            newPasswordInput: 'input[name="newPassword"]',
            confirmPasswordInput: 'input[name="confirmPassword"]',
            setNewPasswordButton: 'button:has-text("Set new password")',
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
        await expect(this.page.locator(this.selectors.pageTitle)).toContainText('Reset password');
    }

    /**
     * Enter email in the reset password form
     * @param {string} email - The email address to enter
     * @returns {Promise<void>}
     */
    async enterEmail(email) {
        await this.page.getByRole('textbox', { name: 'Email' }).fill(email);
    }

    /**
     * Click the send code button
     * @returns {Promise<void>}
     */
    async clickSendCode() {
        await this.page.click(this.selectors.sendCodeButton);
        // Wait for navigation to the set new password page
        await this.page.waitForURL(/.*/, { timeout: 60000 });
        await this.page.waitForLoadState('networkidle', { timeout: 60000 });
        // Additional wait to ensure page is fully loaded
        await this.page.waitForTimeout(3000);
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
        // Check if we're on the set new password page by looking for the heading
        const heading = this.page.getByRole('heading', { name: 'Set new password' });
        return await heading.isVisible();
    }

    /**
     * Enter verification code
     * @param {string} code - The 5-digit verification code
     * @returns {Promise<void>}
     */
    async enterVerificationCode(code) {
        await this.page.fill(this.selectors.verificationCodeInput, code);
    }

    /**
     * Click the verify code button
     * @returns {Promise<void>}
     */
    async clickVerifyCode() {
        await this.page.click(this.selectors.verifyCodeButton);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Click the resend code button
     * @returns {Promise<void>}
     */
    async clickResendCode() {
        await this.page.click(this.selectors.resendCodeButton);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify invalid code error is displayed
     * @returns {Promise<boolean>}
     */
    async isInvalidCodeErrorVisible() {
        return await this.page.isVisible(this.selectors.invalidCodeError);
    }

    /**
     * Set a new password
     * @param {string} newPassword - The new password
     * @param {string} confirmPassword - The password confirmation (not used as field removed from UI)
     * @returns {Promise<void>}
     */
    async setNewPassword(newPassword, confirmPassword) {
        await this.page.getByRole('textbox', { name: 'New Password' }).fill(newPassword);
        await this.page.click(this.selectors.setNewPasswordButton);
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
        return await this.page.getByText('The password must contain at').isVisible();
    }

    /**
     * Click the return to login link
     * @returns {Promise<void>}
     */
    async clickReturnToLogin() {
        await this.page.getByRole('button', { name: 'Return to login screen' }).click();
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
