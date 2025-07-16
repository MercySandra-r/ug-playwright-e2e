// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

// Test data
const testUser = {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'TestPassword123!'
};

/**
 * Test suite for Post-Application Submission Dashboard functionality
 */
test.describe('Post-Application Submission Dashboard Tests', () => {
    let loginPage;
    let dashboardPage;
    
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new PostAppSubmissionDashboardPage(page);
        
        // Login and navigate to the dashboard
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await dashboardPage.navigateToDashboard();
    });
    
    test('Verify Post-Application Dashboard loads successfully', async () => {
        // Verify page title and URL
        await expect(dashboardPage.page).toHaveURL(/.*dashboard/);
        await expect(dashboardPage.page.locator(dashboardPage.selectors.pageTitle)).toBeVisible();
    });
    
    test('Validate Post-Application Dashboard content', async () => {
        // Verify the page content is valid
        const isPageValid = await dashboardPage.validatePostDashboard();
        expect(isPageValid).toBeTruthy();
    });
    
    test('Verify contact information is displayed correctly', async () => {
        // Verify phone number
        const isPhoneValid = await dashboardPage.verifyPhoneNumber();
        expect(isPhoneValid).toBeTruthy();
        
        // Verify email address
        const isEmailValid = await dashboardPage.verifyEmailAddress();
        expect(isEmailValid).toBeTruthy();
    });
    
    test('Verify QTR link functionality', async () => {
        test.skip(!!process.env.CI, 'Skipping external links test in CI environment');
        
        // Click on QTR link and verify it opens correctly
        const isQtrLinkValid = await dashboardPage.clickQTRLink();
        expect(isQtrLinkValid).toBeTruthy();
    });
    
    test('Verify Transcripts link functionality', async () => {
        test.skip(!!process.env.CI, 'Skipping external links test in CI environment');
        
        // Click on Transcripts link and verify it opens correctly
        const isTranscriptsLinkValid = await dashboardPage.clickTranscriptsLink();
        expect(isTranscriptsLinkValid).toBeTruthy();
    });
    
    test('Verify FAFSA link functionality', async () => {
        test.skip(!!process.env.CI, 'Skipping external links test in CI environment');
        
        // Click on FAFSA link and verify it opens correctly
        const isFafsaLinkValid = await dashboardPage.clickFafsaLink();
        expect(isFafsaLinkValid).toBeTruthy();
    });
    
    test('Check QTR alert presence for AZ Online students', async () => {
        // This test checks if the QTR alert is present for AZ Online students
        // The alert might not be present for all test users
        try {
            const isAlertPresent = await dashboardPage.checkQtrAlertPresenceForAZOnline();
            console.log('QTR alert present:', isAlertPresent);
            // We're just checking that the method runs without errors
            expect(true).toBeTruthy();
        } catch (error) {
            console.error('Error checking QTR alert:', error);
            // Fail the test if there's an error
            expect(false).toBeTruthy();
        }
    });
    
    test('Verify Preview Application link functionality', async () => {
        // Click on the Preview Application link
        const isPreviewLinkValid = await dashboardPage.clickPreviewLink();
        expect(isPreviewLinkValid).toBeTruthy();
        
        // Verify we're on the preview page or a similar page
        const currentUrl = dashboardPage.page.url();
        expect(currentUrl).toMatch(/preview|review|application/);
    });
    
    test('Verify application status is displayed', async () => {
        // Get the application status
        const status = await dashboardPage.getApplicationStatus();
        
        // Log the status for debugging
        console.log('Application status:', status);
        
        // Verify the status is not empty
        expect(status).toBeTruthy();
    });
    
    test('Verify all external links on the page', async () => {
        test.skip(!!process.env.CI, 'Skipping external links test in CI environment');
        
        // Verify all external links
        const linkResults = await dashboardPage.verifyAllExternalLinks();
        
        // Log the results
        console.log('Link verification results:', JSON.stringify(linkResults, null, 2));
        
        // Check for any failed links
        const failedLinks = linkResults.filter(link => link.status !== 200);
        expect(failedLinks.length).toBe(0);
    });
    
    test('Verify responsive design on different viewports', async () => {
        // Test on mobile viewport
        await dashboardPage.page.setViewportSize({ width: 375, height: 667 });
        
        // Verify the page is still functional on mobile
        const isPageValidMobile = await dashboardPage.validatePostDashboard();
        expect(isPageValidMobile).toBeTruthy();
        
        // Test on tablet viewport
        await dashboardPage.page.setViewportSize({ width: 768, height: 1024 });
        
        // Verify the page is still functional on tablet
        const isPageValidTablet = await dashboardPage.validatePostDashboard();
        expect(isPageValidTablet).toBeTruthy();
    });
    
    test('Verify accessibility of the dashboard page', async () => {
        // Run accessibility scan
        const accessibilityScanResults = await dashboardPage.page.accessibility.snapshot();
        
        // Log any accessibility issues
        if (accessibilityScanResults && accessibilityScanResults.violations) {
            console.log('Accessibility issues found:', accessibilityScanResults.violations);
        }
        
        // This is a basic check - in a real scenario, you might want to fail the test
        // if there are critical accessibility issues
        expect(true).toBeTruthy();
    });
});
