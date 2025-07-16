// @ts-check
const { test, expect } = require('@playwright/test');
const LandingPage = require('../pages/LandingPage');
const VerifyEmailPage = require('../pages/VerifyEmailPage');
const testDataLoader = require('../utils/testDataLoader');

/**
 * Test suite for Email Verification functionality
 */
test.describe('Email Verification Tests', () => {
    let landingPage;
    let verifyEmailPage;

    test.beforeEach(async ({ page }) => {
        landingPage = new LandingPage(page);
        verifyEmailPage = new VerifyEmailPage(page);
        
        // Navigate to the landing page and perform necessary steps to reach verify email
        await landingPage.navigateToLandingPage();
        // Assuming we need to go through account creation first
        // This would be replaced with actual navigation to verify email page
        await page.goto('/user/verify-email');
    });

    test('Verify email page elements', async ({ page }) => {
        // Verify the email verification page is displayed
        await verifyEmailPage.verifyEmailPage();
        
        // Verify email is displayed (using test data or environment variable)
        const testEmail = process.env.TEST_EMAIL || 'test@example.com';
        await verifyEmailPage.verifyEmail(testEmail);
        
        // Verify login button is visible
        const isLoginButtonVisible = await verifyEmailPage.isLoginButtonVisible();
        expect(isLoginButtonVisible).toBeTruthy();
    });

    test('Verify resend email functionality', async ({ page }) => {
        // Click resend email button
        await verifyEmailPage.clickResendEmail();
        
        // Verify success message is displayed
        const isSuccessMessageVisible = await verifyEmailPage.isResendSuccessMessageVisible();
        expect(isSuccessMessageVisible).toBeTruthy();
    });

    test('Verify login navigation', async ({ page }) => {
        // Click login button
        await verifyEmailPage.clickLoginButton();
        
        // Verify navigation to login page
        await expect(page).toHaveURL(/.*login/);
    });

    test('Verify back button navigation', async ({ page }) => {
        // Go back to previous page
        await verifyEmailPage.goBack();
        
        // Verify we're not on the verify email page anymore
        await expect(page).not.toHaveURL(/.*verify-email/);
    });

    test('Verify app details section', async () => {
        // Verify app details section is visible
        const isAppDetailsVisible = await verifyEmailPage.isAppDetailsSectionVisible();
        expect(isAppDetailsVisible).toBeTruthy();
    });
});
