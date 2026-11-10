// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');

/**
 * Test suite for Login functionality.
 * Sign-in now happens on ASU's IdP (login.asu.edu); LoginPage drives it.
 */
test.describe('Login Tests', () => {
    let loginPage;
    const testEmail = process.env.TEST_EMAIL || 'myah.koepp@test.asu.edu';
    const testPassword = process.env.TEST_PASSWORD || 'Testing10!';
    const invalidEmail = 'invalid-email';
    const nonExistentEmail = 'nonexistent@example.com';
    const invalidPassword = 'short';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);

        // Navigate to the login page before each test
        await loginPage.navigateToLoginPage();
    });

    test('Verify login with invalid email format', async () => {
        // Enter invalid email and any password
        await loginPage.enterCredentials(invalidEmail, 'anypassword');
        
        // Verify invalid email validation message is displayed
        const isErrorVisible = await loginPage.isInvalidEmailFormatErrorVisible();
        expect(isErrorVisible).toBeTruthy();
        
        // Note: Login button remains enabled - validation happens on submit
        // This is the expected behavior for this application
    });

    test('Verify login with non-existent email', async () => {
        // Enter non-existent email and any password
        await loginPage.enterCredentials(nonExistentEmail, 'anypassword');
        await loginPage.clickLogin();
        
        // Wait for error message to appear after login attempt
        await loginPage.page.waitForSelector('text=Incorrect email or password.', { timeout: 70000 });
        
        // Verify "Incorrect email or password." error message is displayed
        const isErrorVisible = await loginPage.page.getByText('Incorrect email or password.').isVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify login with incorrect password', async () => {
        // Enter valid email but incorrect password
        await loginPage.enterCredentials(testEmail, 'IncorrectPassword123!');
        await loginPage.clickLogin();
        
        // Wait for error message to appear after login attempt
        await loginPage.page.waitForSelector('text=Incorrect email or password.', { timeout: 10000 });
        
        // Verify "Incorrect email or password." error message is displayed
        const isErrorVisible = await loginPage.page.getByText('Incorrect email or password.').isVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify login with ASURITE', async () => {
        // Click the Log In with ASURITE button
        await loginPage.clickLoginWithAsurite();
        
        // Verify ASURITE login page is displayed
        const isAsuLoginPage = await loginPage.isAsuLoginPageDisplayed();
        expect(isAsuLoginPage).toBeTruthy();
    });

    test('Verify login form validation', async () => {
        // Test empty email and password
        await loginPage.clickLogin();
        
        // Verify validation messages are displayed for required fields
        const isEmailValidationVisible = await loginPage.page.getByText('Email is required.').isVisible();
        const isPasswordValidationVisible = await loginPage.page.getByRole('alert').filter({ hasText: 'Password is required.' }).isVisible();
        
        // Check if the required validation messages are shown
        expect(isEmailValidationVisible).toBeTruthy();
        expect(isPasswordValidationVisible).toBeTruthy();
    });

});
