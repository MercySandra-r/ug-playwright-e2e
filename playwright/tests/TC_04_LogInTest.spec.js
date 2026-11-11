// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');

/**
 * Test suite for Login functionality.
 * Sign-in now happens on ASU's IdP (login.asu.edu); LoginPage drives it.
 * Messages below are the IdP's wording (verified live 2026-11-10).
 *
 * POM: every element comes from LoginPage; this spec has no locators of its own.
 */
test.describe('Login Tests', () => {
    /** @type {LoginPage} */
    let loginPage;
    const testEmail = process.env.TEST_EMAIL || 'myah.koepp@test.asu.edu';
    const invalidEmail = 'invalid-email';
    const nonExistentEmail = 'nonexistent@example.com';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);

        // Opens the IdP "Sign in with email" form via the app's Sign in button
        await loginPage.navigateToLoginPage();
    });

    test('Verify login with invalid email format', async () => {
        await loginPage.enterCredentials(invalidEmail, 'anypassword');

        // The IdP validates the format inline and keeps Sign in disabled
        expect(await loginPage.isInvalidEmailFormatErrorVisible()).toBeTruthy();
        await expect(loginPage.signInButton()).toBeDisabled();
    });

    test('Verify login with non-existent email', async () => {
        await loginPage.enterCredentials(nonExistentEmail, 'anypassword');
        await loginPage.clickLogin();

        // The IdP gives the same generic message for unknown accounts and bad passwords
        expect(await loginPage.isIncorrectCredentialsErrorVisible()).toBeTruthy();
    });

    test('Verify login with incorrect password', async () => {
        await loginPage.enterCredentials(testEmail, 'IncorrectPassword123!');
        await loginPage.clickLogin();

        expect(await loginPage.isIncorrectCredentialsErrorVisible()).toBeTruthy();
    });

    test('Verify login with ASURITE', async () => {
        // "Sign In with ASURITE ID" hands off to ASU web login (weblogin.asu.edu)
        await loginPage.clickLoginWithAsurite();

        expect(await loginPage.isAsuLoginPageDisplayed()).toBeTruthy();
    });

    test('Verify login form validation', async () => {
        // Touch and leave both fields empty: the IdP flags them and keeps Sign in disabled
        await loginPage.touchEmptyFields();
        await loginPage.verifyRequiredFieldErrors();
    });
});
