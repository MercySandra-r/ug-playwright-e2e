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
    let testEmail;
    const newPassword = 'Testing10!';
    const verificationCode = '12345'; // Random 5-digit code

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        resetPasswordPage = new ResetPasswordPage(page);
        
        // Generate unique test email with @test.asu.edu format
        const timestamp = new Date().getTime();
        testEmail = `testuser${timestamp}@test.asu.edu`;
        
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
        
        // Verify error message is displayed without clicking send code
        const isErrorVisible = await resetPasswordPage.isInvalidEmailErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify reset password with valid email', async () => {
        // Navigate to reset password page
        await resetPasswordPage.clickResetPasswordLink();
        
        // Enter valid @test.asu.edu email and submit
        await resetPasswordPage.enterEmail(testEmail);
        await resetPasswordPage.clickSendCode();
        
        // Verify navigation to verification code page or new password page
        const isNewPasswordPage = await resetPasswordPage.isNewPasswordPageDisplayed();
        expect(isNewPasswordPage).toBeTruthy();
    });


    test('Verify password requirements validation', async () => {
        // Navigate to set new password page
        await resetPasswordPage.clickResetPasswordLink();
        await resetPasswordPage.enterEmail(testEmail);
        await resetPasswordPage.clickSendCode();
        await resetPasswordPage.isNewPasswordPageDisplayed();
        
        // Enter password that doesn't meet requirements (without clicking set new password)
        await resetPasswordPage.page.getByRole('textbox', { name: 'New Password' }).fill('short');
        
        // Verify error message is displayed
        const isErrorVisible = await resetPasswordPage.isPasswordRequirementsErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    // test('Verify successful password reset', async () => {
    //     // Navigate to set new password page
    //     await resetPasswordPage.clickResetPasswordLink();
    //     await resetPasswordPage.enterEmail(testEmail);
    //     await resetPasswordPage.clickSendCode();
    //     await resetPasswordPage.isNewPasswordPageDisplayed();
    //     
    //     // Enter valid new password
    //     await resetPasswordPage.setNewPassword(newPassword, newPassword);
    //     
    //     // Verify success message is displayed
    //     const isSuccessVisible = await resetPasswordPage.isSuccessMessageVisible();
    //     expect(isSuccessVisible).toBeTruthy();
    // });

    test('Verify return to login link', async ({ page }) => {
        // Navigate to reset password page
        await resetPasswordPage.clickResetPasswordLink();
        
        // Click return to login link
        await resetPasswordPage.clickReturnToLogin();
        
        // Verify navigation to login page
        await expect(page).toHaveURL(/.*login/);
    });
});
