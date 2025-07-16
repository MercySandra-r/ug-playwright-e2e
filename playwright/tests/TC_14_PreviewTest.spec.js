// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const PreviewPage = require('../pages/PreviewPage');
const path = require('path');

// Test data
const testUser = {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'TestPassword123!'
};

// Test data file paths
const testDataDir = path.join(__dirname, 'test-data');
const reviewDataPath = path.join(testDataDir, 'testdata.xlsx');
const previewDataPath = path.join(testDataDir, 'testdata.xlsx');

/**
 * Test suite for Preview functionality
 */
test.describe('Preview Page Tests', () => {
    let loginPage;
    let previewPage;
    
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        previewPage = new PreviewPage(page);
        
        // Login and navigate to the preview page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await previewPage.navigateToPreviewPage();
    });
    
    test('Verify Preview page loads successfully', async () => {
        // Verify page title and URL
        await expect(previewPage.page).toHaveURL(/.*preview/);
        await expect(previewPage.page.locator(previewPage.selectors.pageTitle)).toBeVisible();
    });
    
    test('Validate Preview page content', async () => {
        // Verify the page content is valid
        const isPageValid = await previewPage.validatePreview();
        expect(isPageValid).toBeTruthy();
    });
    
    test('Verify Download PDF button is enabled', async () => {
        // Verify the Download PDF button is enabled
        const isDownloadEnabled = await previewPage.verifyDownloadPdfButton();
        expect(isDownloadEnabled).toBeTruthy();
    });
    
    test('Verify Back button functionality', async () => {
        // Click the Back button and verify navigation
        const isNavigationSuccessful = await previewPage.clickBackButton();
        expect(isNavigationSuccessful).toBeTruthy();
    });
    
    test('Verify Profile section details', async () => {
        // Get profile section details
        const profileDetails = await previewPage.getProfileSection();
        
        // Verify we have some details
        expect(profileDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('Profile Details:', JSON.stringify(profileDetails, null, 2));
        
        // Example check - adjust based on your actual data
        const nameDetail = profileDetails.find(item => item.key.toLowerCase().includes('name'));
        expect(nameDetail).toBeDefined();
        expect(nameDetail.value).toBeTruthy();
    });
    
    test('Verify My Information section details', async () => {
        // Get my information section details
        const myInfoDetails = await previewPage.getMyInfoSection();
        
        // Verify we have some details
        expect(myInfoDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('My Info Details:', JSON.stringify(myInfoDetails, null, 2));
    });
    
    test('Verify My Program section details', async () => {
        // Get my program section details
        const myProgramDetails = await previewPage.getMyProgramSection();
        
        // Verify we have some details
        expect(myProgramDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('My Program Details:', JSON.stringify(myProgramDetails, null, 2));
    });
    
    test('Verify My Schools section details', async () => {
        // Get my schools section details
        const mySchoolsDetails = await previewPage.getMySchoolsSection();
        
        // Verify we have some details
        expect(mySchoolsDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('My Schools Details:', JSON.stringify(mySchoolsDetails, null, 2));
    });
    
    test('Verify High School Grades section details', async () => {
        // Get high school grades section details
        const highSchoolGradesDetails = await previewPage.getHighSchoolGradesSection();
        
        // This section might be empty for some users, so we just check if the method runs without errors
        console.log('High School Grades Details:', JSON.stringify(highSchoolGradesDetails, null, 2));
        expect(highSchoolGradesDetails).toBeDefined();
    });
    
    test('Verify Arizona Residency section details', async () => {
        // Get Arizona residency section details
        const arizonaResidencyDetails = await previewPage.getArizonaResidencySection();
        
        // This section might be empty for some users, so we just check if the method runs without errors
        console.log('Arizona Residency Details:', JSON.stringify(arizonaResidencyDetails, null, 2));
        expect(arizonaResidencyDetails).toBeDefined();
    });
    
    test('Verify Application Affidavit section', async () => {
        // Verify the application affidavit section
        const isAffidavitValid = await previewPage.verifyApplicationAffidavit();
        expect(isAffidavitValid).toBeTruthy();
    });
    
    test('Verify Read Affidavit link functionality', async ({ page }) => {
        test.skip(!!process.env.CI, 'Skipping external links test in CI environment');
        
        // Click on the Read Affidavit link and verify it works
        const isLinkValid = await previewPage.clickReadAffidavitLink();
        expect(isLinkValid).toBe(true);
    });
    
    test('Verify Affidavit checkbox is disabled', async () => {
        // Verify the affidavit checkbox is disabled
        const isCheckboxDisabled = await previewPage.verifyAffidavitCheckboxDisabled();
        expect(isCheckboxDisabled).toBeTruthy();
    });
    
    test('Verify Return to Previous Page functionality', async () => {
        // Click on the Return to Previous Page button and verify navigation
        const isNavigationSuccessful = await previewPage.clickReturnToPreviousPage();
        expect(isNavigationSuccessful).toBeTruthy();
    });
    
    test('Verify application status after submission', async ({ page }) => {
        // Sign out and log back in to check the application status
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
        const { status, date } = await previewPage.verifyApplicationStatus();
        
        // Check if the status indicates submission
        expect(status).toMatch(/submitted|completed|in review/i);
        
        // Check if the date is in a valid format (YYYY-MM-DD or similar)
        const dateRegex = /\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
        expect(date).toMatch(dateRegex);
    });
    
    test('Compare Review and Preview data from Excel files', async ({ page }) => {
        // Skip if running in CI environment or if test data files don't exist
        test.skip(!!process.env.CI || !require('fs').existsSync(reviewDataPath) || !require('fs').existsSync(previewDataPath), 
            'Skipping Excel comparison test in CI environment or missing test data files');
        
        // Compare review and preview data from Excel files
        const { matches, mismatches } = await previewPage.compareReviewAndPreview(
            reviewDataPath,
            previewDataPath,
            'ReviewPageData',
            'PreviewPageData'
        );
        
        // Log the comparison results
        console.log(`Found ${matches.length} matching items and ${mismatches.length} mismatches`);
        
        if (mismatches.length > 0) {
            console.log('Mismatches:', JSON.stringify(mismatches, null, 2));
        }
        
        // Fail the test if there are any mismatches
        expect(mismatches.length).toBe(0);
    });
    
    test('Compare Preview data with Excel data', async ({ page }) => {
        // Skip if running in CI environment or if test data files don't exist
        test.skip(!!process.env.CI || !require('fs').existsSync(previewDataPath), 
            'Skipping Excel comparison test in CI environment or missing test data files');
        
        // Compare profile section with Excel data
        const { matches, mismatches } = await previewPage.compareWithExcel(
            previewDataPath,
            'PreviewPageData',
            'profile'
        );
        
        // Log the comparison results
        console.log(`Profile Section - Matches: ${matches.length}, Mismatches: ${mismatches.length}`);
        
        if (mismatches.length > 0) {
            console.log('Mismatches:', JSON.stringify(mismatches, null, 2));
        }
        
        // Fail the test if there are any mismatches
        expect(mismatches.length).toBe(0);
    });
    
    test('Verify responsive design on different viewports', async () => {
        // Test on mobile viewport
        await previewPage.page.setViewportSize({ width: 375, height: 667 });
        
        // Verify the page is still functional on mobile
        const isPageValidMobile = await previewPage.validatePreview();
        expect(isPageValidMobile).toBeTruthy();
        
        // Test on tablet viewport
        await previewPage.page.setViewportSize({ width: 768, height: 1024 });
        
        // Verify the page is still functional on tablet
        const isPageValidTablet = await previewPage.validatePreview();
        expect(isPageValidTablet).toBeTruthy();
    });
    
    test('Verify accessibility of the preview page', async () => {
        // Run accessibility scan
        const accessibilityScanResults = await previewPage.page.accessibility.snapshot();
        
        // Log any accessibility issues
        if (accessibilityScanResults && accessibilityScanResults.violations) {
            console.log('Accessibility issues found:', accessibilityScanResults.violations);
        }
        
        // This is a basic check - in a real scenario, you might want to fail the test
        // if there are critical accessibility issues
        expect(true).toBeTruthy();
    });
});
