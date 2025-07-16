// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ResetPasswordPage = require('../pages/ResetPasswordPage');

/**
 * Test suite for Login functionality
 */
test.describe('Login Tests', () => {
    let loginPage;
    let resetPasswordPage;
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!';
    const invalidEmail = 'invalid-email';
    const nonExistentEmail = 'nonexistent@example.com';
    const invalidPassword = 'short';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        resetPasswordPage = new ResetPasswordPage(page);
        
        // Navigate to the login page before each test
        await loginPage.navigateToLoginPage();
    });

    test('Verify login page elements', async () => {
        // Verify page title
        await expect(loginPage.page.locator(loginPage.selectors.pageTitle))
            .toHaveText('Log In');
            
        // Verify all required elements are visible
        await expect(loginPage.page.locator(loginPage.selectors.emailInput)).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.passwordInput)).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.loginButton)).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.loginWithAsuriteButton)).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.createAccountLink)).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.resetPasswordLink)).toBeVisible();
    });

    test('Verify login with invalid email format', async () => {
        // Enter invalid email and any password
        await loginPage.enterCredentials(invalidEmail, 'anypassword');
        
        // Verify login button is disabled or shows error
        const isErrorVisible = await loginPage.isInvalidEmailFormatErrorVisible();
        expect(isErrorVisible).toBeTruthy();
        
        // Verify login button is disabled when email is invalid
        const isLoginButtonEnabled = await loginPage.page.isEnabled(loginPage.selectors.loginButton);
        expect(isLoginButtonEnabled).toBeFalsy();
    });

    test('Verify login with non-existent email', async () => {
        // Enter non-existent email and any password
        await loginPage.enterCredentials(nonExistentEmail, 'anypassword');
        await loginPage.clickLogin();
        
        // Verify email not found error is displayed
        const isErrorVisible = await loginPage.isEmailNotFoundErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify login with incorrect password', async () => {
        // Enter valid email but incorrect password
        await loginPage.enterCredentials(testEmail, 'IncorrectPassword123!');
        await loginPage.clickLogin();
        
        // Verify incorrect credentials error is displayed
        const isErrorVisible = await loginPage.isIncorrectCredentialsErrorVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify login with ASURITE', async () => {
        // Click the Log In with ASURITE button
        await loginPage.clickLoginWithAsurite();
        
        // Verify ASURITE login page is displayed
        const isAsuLoginPage = await loginPage.isAsuLoginPageDisplayed();
        expect(isAsuLoginPage).toBeTruthy();
    });

    test('Verify create account link', async () => {
        // Click the create account link
        await loginPage.clickCreateAccountLink();
        
        // Verify navigation to create account page
        await expect(loginPage.page).toHaveURL(/.*\/user\/signup/);
    });

    test('Verify reset password link', async () => {
        // Click the reset password link
        await loginPage.clickResetPasswordLink();
        
        // Verify navigation to reset password page
        await expect(loginPage.page).toHaveURL(/.*\/user\/reset-password/);
    });

    test('Verify successful login with valid credentials', async ({ page }) => {
        // Skip if no test credentials are provided
        test.skip(!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD, 
            'Skipping login test - TEST_EMAIL and TEST_PASSWORD environment variables not set');
            
        // Perform login with valid credentials
        const isLoggedIn = await loginPage.login(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
        
        // Verify login was successful by checking for dashboard
        expect(isLoggedIn).toBeTruthy();
        
        // Additional verification of dashboard elements if needed
        const isDashboardVisible = await loginPage.isDashboardDisplayed();
        expect(isDashboardVisible).toBeTruthy();
    });

    test('Verify login form validation', async () => {
        // Test empty email and password
        await loginPage.clickLogin();
        
        // Verify required field validation errors using Playwright's built-in validation
        const emailInput = loginPage.page.locator('input[name="email"]');
        const passwordInput = loginPage.page.locator('input[name="password"]');
        
        // Check required validation
        const isEmailRequired = await emailInput.evaluate((input) => {
            return input.required && !input.value;
        });
        
        const isPasswordRequired = await passwordInput.evaluate((input) => {
            return input.required && !input.value;
        });
        
        // Check if the required validation is triggered
        expect(isEmailRequired).toBeTruthy();
        expect(isPasswordRequired).toBeTruthy();
        
        // Also verify the validation messages are shown (if any)
        const emailValidation = await emailInput.evaluate((input) => input.validationMessage);
        const passwordValidation = await passwordInput.evaluate((input) => input.validationMessage);
        
        expect(emailValidation).toBeTruthy();
        expect(passwordValidation).toBeTruthy();
    });
});
