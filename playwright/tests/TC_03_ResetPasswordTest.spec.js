// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ResetPasswordPage = require('../pages/ResetPasswordPage');

/**
 * Test suite for Reset Password functionality
 */
test.describe('Reset Password Tests', () => {
    let loginPage;
    let resetPasswordPage;
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const newPassword = 'NewPassword123!';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        resetPasswordPage = new ResetPasswordPage(page);
        
        // Navigate to the login page
        await loginPage.navigateToLoginPage();
    });

    test('Verify reset password link and page', async () => {
        // Click the reset password link
        await resetPasswordPage.clickResetPasswordLink();
        
        // Verify the reset password page is displayed
        await resetPasswordPage.verifyResetPasswordPage();
    });

    test('Verify invalid email validation', async () => {
        // Navigate to reset password page
        await resetPasswordPage.clickResetPasswordLink();
        
        // Enter invalid email
        await resetPasswordPage.enterEmail('invalid-email');
        await resetPasswordPage.clickSendCode();
        
        // Verify error message is displayed
        const isErrorVisible = await resetPasswordPage.isInvalidEmailErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify reset password with valid email', async () => {
        // Navigate to reset password page
        await resetPasswordPage.clickResetPasswordLink();
        
        // Enter valid email and submit
        await resetPasswordPage.enterEmail(testEmail);
        await resetPasswordPage.clickSendCode();
        
        // Verify navigation to set new password page
        const isNewPasswordPage = await resetPasswordPage.isNewPasswordPageDisplayed();
        expect(isNewPasswordPage).toBeTruthy();
    });

    test('Verify password mismatch validation', async () => {
        // Navigate to set new password page (assuming we're already there from previous test)
        await resetPasswordPage.clickResetPasswordLink();
        await resetPasswordPage.enterEmail(testEmail);
        await resetPasswordPage.clickSendCode();
        await resetPasswordPage.isNewPasswordPageDisplayed();
        
        // Enter mismatched passwords
        await resetPasswordPage.setNewPassword('NewPassword123!', 'DifferentPassword123!');
        
        // Verify error message is displayed
        const isErrorVisible = await resetPasswordPage.isPasswordMismatchErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify password requirements validation', async () => {
        // Navigate to set new password page
        await resetPasswordPage.clickResetPasswordLink();
        await resetPasswordPage.enterEmail(testEmail);
        await resetPasswordPage.clickSendCode();
        await resetPasswordPage.isNewPasswordPageDisplayed();
        
        // Enter password that doesn't meet requirements
        await resetPasswordPage.setNewPassword('short', 'short');
        
        // Verify error message is displayed
        const isErrorVisible = await resetPasswordPage.isPasswordRequirementsErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify successful password reset', async () => {
        // Navigate to set new password page
        await resetPasswordPage.clickResetPasswordLink();
        await resetPasswordPage.enterEmail(testEmail);
        await resetPasswordPage.clickSendCode();
        await resetPasswordPage.isNewPasswordPageDisplayed();
        
        // Enter valid new password
        await resetPasswordPage.setNewPassword(newPassword, newPassword);
        
        // Verify success message is displayed
        const isSuccessVisible = await resetPasswordPage.isSuccessMessageVisible();
        expect(isSuccessVisible).toBeTruthy();
    });

    test('Verify return to login link', async ({ page }) => {
        // Navigate to reset password page
        await resetPasswordPage.clickResetPasswordLink();
        
        // Click return to login link
        await resetPasswordPage.clickReturnToLogin();
        
        // Verify navigation to login page
        await expect(page).toHaveURL(/.*login/);
    });
});
