// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const PreviewPage = require('../pages/PreviewPage');
const LandingPage = require('../pages/LandingPage');

// Test data
const testUser = {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'TestPassword123!'
};

/**
 * Test suite for Duplicate Application Check functionality
 */
test.describe('Duplicate Application Check Tests', () => {
    let loginPage;
    let previewPage;
    let landingPage;
    
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        previewPage = new PreviewPage(page);
        landingPage = new LandingPage(page);
        
        // Login and navigate to the preview page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await previewPage.navigateToPreviewPage();
    });
    
    test('Verify sign out functionality from preview page', async ({ page }) => {
        // Sign out from the application
        try {
            // Navigate to a page that has the profile menu (like the dashboard)
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            
            // Click profile icon and sign out
            await page.click('[data-cy="profile-icon"]');
            await page.click('button:has-text("Sign Out")');
            await page.waitForLoadState('networkidle');
        } catch (error) {
            console.log('Cleanup - User was not signed in or sign out failed:', error.message);
            throw error; // Re-throw to fail the test if sign out fails
        }
        
        // Verify we're on the landing page after sign out
        await expect(page).toHaveURL(/.*landing/);
        
        // Verify the landing page is displayed
        const isLandingPageVisible = await landingPage.isPageVisible();
        expect(isLandingPageVisible).toBeTruthy();
        
        // Verify the login button is visible
        const isLoginButtonVisible = await landingPage.isLoginButtonVisible();
        expect(isLoginButtonVisible).toBeTruthy();
    });
    
    test('Verify duplicate application prevention after sign out and login', async ({ page }) => {
        // 1. Sign out from the application
        try {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            await page.click('[data-cy="profile-icon"]');
            await page.click('button:has-text("Sign Out")');
            await page.waitForLoadState('networkidle');
        } catch (error) {
            console.log('Sign out failed:', error.message);
            throw error;
        }
        
        // 2. Log back in
        await loginPage.navigateToLoginPage();
        const isLoggedIn = await loginPage.login(testUser.email, testUser.password);
        expect(isLoggedIn).toBeTruthy();
        
        // 3. Try to access the preview page again
        await previewPage.navigateToPreviewPage();
        
        // 4. Verify if there's a message about existing application
        const hasExistingAppMessage = await previewPage.hasExistingApplicationMessage();
        expect(hasExistingAppMessage).toBeTruthy();
    });
    
    test('Verify application status after sign out and login', async ({ page }) => {
        // Sign out from the application
        try {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            await page.click('[data-cy="profile-icon"]');
            await page.click('button:has-text("Sign Out")');
            await page.waitForLoadState('networkidle');
        } catch (error) {
            console.log('Sign out failed:', error.message);
            throw error;
        }
        
        // Log back in
        await loginPage.navigateToLoginPage();
        const isLoggedIn = await loginPage.login(testUser.email, testUser.password);
        expect(isLoggedIn).toBeTruthy();
        
        // Verify the application status
        const { status } = await previewPage.verifyApplicationStatus();
        
        // Check if the status indicates submission
        expect(status).toMatch(/submitted|completed|in review/i);
    });
    
    test('Verify application data persistence after sign out and login', async ({ page }) => {
        // Get application data before sign out
        const profileBeforeSignOut = await previewPage.getProfileSection();
        
        // Sign out from the application
        try {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            await page.click('[data-cy="profile-icon"]');
            await page.click('button:has-text("Sign Out")');
            await page.waitForLoadState('networkidle');
        } catch (error) {
            console.log('Sign out failed:', error.message);
            throw error;
        }
        
        // Log back in
        await loginPage.navigateToLoginPage();
        const isLoggedIn = await loginPage.login(testUser.email, testUser.password);
        expect(isLoggedIn).toBeTruthy();
        
        // Navigate back to preview page
        await previewPage.navigateToPreviewPage();
        
        // Get application data after login
        const profileAfterLogin = await previewPage.getProfileSection();
        
        // Verify the data is the same
        expect(profileAfterLogin).toEqual(profileBeforeSignOut);
    });
    
    test('Verify session timeout after sign out', async ({ page }) => {
        // Sign out from the application
        try {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            await page.click('[data-cy="profile-icon"]');
            await page.click('button:has-text("Sign Out")');
            await page.waitForLoadState('networkidle');
        } catch (error) {
            console.log('Sign out failed:', error.message);
            throw error;
        }
        
        // Try to access a protected page directly
        await page.goto('/preview');
        
        // Verify we're redirected to login page
        await expect(page).toHaveURL(/.*login/);
        
        // Verify login page is displayed
        const isLoginPageVisible = await loginPage.isPageVisible();
        expect(isLoginPageVisible).toBeTruthy();
    });
});
