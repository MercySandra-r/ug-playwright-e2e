// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ReviewPage = require('../pages/ReviewPage');
const path = require('path');

// Test data
const testUser = {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'TestPassword123!',
    paymentInfo: {
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123',
        nameOnCard: 'Test User',
        address: '123 Test St',
        city: 'Test City',
        state: 'AZ',
        zip: '85281',
        country: 'United States'
    }
};

/**
 * Test suite for Review Page functionality
 */
test.describe('Review Page Tests', () => {
    let loginPage;
    let reviewPage;
    
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        reviewPage = new ReviewPage(page);
        
        // Login and navigate to review page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await reviewPage.navigateToReviewPage();
    });
    
    test('Verify Review page loads successfully', async () => {
        // Verify page title and URL
        await expect(reviewPage.page).toHaveURL(/.*review/);
        await expect(reviewPage.page.locator(reviewPage.selectors.pageTitle)).toBeVisible();
    });
    
    test('Validate Review page content', async () => {
        // Verify the page content is valid
        const isPageValid = await reviewPage.validateReview();
        expect(isPageValid).toBeTruthy();
    });
    
    test('Verify Profile section details', async () => {
        // Get profile section details
        const profileDetails = await reviewPage.getProfileSection();
        
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
        const myInfoDetails = await reviewPage.getMyInfoSection();
        
        // Verify we have some details
        expect(myInfoDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('My Info Details:', JSON.stringify(myInfoDetails, null, 2));
    });
    
    test('Verify My Program section details', async () => {
        // Get my program section details
        const myProgramDetails = await reviewPage.getMyProgramSection();
        
        // Verify we have some details
        expect(myProgramDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('My Program Details:', JSON.stringify(myProgramDetails, null, 2));
    });
    
    test('Verify My Schools section details', async () => {
        // Get my schools section details
        const mySchoolsDetails = await reviewPage.getMySchoolsSection();
        
        // Verify we have some details
        expect(mySchoolsDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('My Schools Details:', JSON.stringify(mySchoolsDetails, null, 2));
    });
    
    test('Verify High School Grades section details', async () => {
        // Get high school grades section details
        const highSchoolGradesDetails = await reviewPage.getHighSchoolGradesSection();
        
        // Verify we have some details
        expect(highSchoolGradesDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('High School Grades Details:', JSON.stringify(highSchoolGradesDetails, null, 2));
    });
    
    test('Verify Arizona Residency section details', async () => {
        // Get Arizona residency section details
        const arizonaResidencyDetails = await reviewPage.getArizonaResidencySection();
        
        // Verify we have some details
        expect(arizonaResidencyDetails.length).toBeGreaterThan(0);
        
        // Log the details for debugging
        console.log('Arizona Residency Details:', JSON.stringify(arizonaResidencyDetails, null, 2));
    });
    
    test('Verify Application Affidavit section', async () => {
        // Verify the application affidavit section
        const isAffidavitValid = await reviewPage.verifyApplicationAffidavit();
        expect(isAffidavitValid).toBeTruthy();
    });
    
    test('Verify Application Fee section', async () => {
        // Verify the application fee section
        const isFeeSectionValid = await reviewPage.verifyApplicationFeeSection();
        expect(isFeeSectionValid).toBeTruthy();
    });
    
    test('Select Visa payment method', async () => {
        // Select Visa as payment method
        await reviewPage.selectPaymentMethod('visa');
        
        // Verify the selection (assuming there's a way to verify the selected payment method)
        // This is a placeholder - adjust based on your actual implementation
        const isVisaSelected = await reviewPage.page.isVisible(reviewPage.selectors.visaCardOption);
        expect(isVisaSelected).toBeTruthy();
    });
    
    test('Select MasterCard payment method', async () => {
        // Select MasterCard as payment method
        await reviewPage.selectPaymentMethod('mastercard');
        
        // Verify the selection
        const isMastercardSelected = await reviewPage.page.isVisible(reviewPage.selectors.mastercardOption);
        expect(isMastercardSelected).toBeTruthy();
    });
    
    test('Select Discover payment method', async () => {
        // Select Discover as payment method
        await reviewPage.selectPaymentMethod('discover');
        
        // Verify the selection
        const isDiscoverSelected = await reviewPage.page.isVisible(reviewPage.selectors.discoverOption);
        expect(isDiscoverSelected).toBeTruthy();
    });
    
    test('Select Pay Later option', async () => {
        // Select Pay Later option
        await reviewPage.selectPaymentMethod('paylater');
        
        // Verify the selection
        const isPayLaterSelected = await reviewPage.page.isVisible(reviewPage.selectors.payLaterOption);
        expect(isPayLaterSelected).toBeTruthy();
    });
    
    test('Verify external links', async () => {
        // Skip if running in CI environment
        test.skip(process.env.CI, 'Skipping external links test in CI environment');
        
        // Verify all external links
        const linkResults = await reviewPage.verifyExternalLinks();
        
        // Log the results
        console.log('Link verification results:', JSON.stringify(linkResults, null, 2));
        
        // Check for any failed links
        const failedLinks = linkResults.filter(link => link.status !== 200);
        expect(failedLinks.length).toBe(0);
    });
    
    test('Compare profile section with Excel data', async () => {
        // Skip if running in CI environment without file access
        test.skip(process.env.CI, 'Skipping Excel comparison test in CI environment');
        
        // Path to the Excel file
        const excelFilePath = path.join(__dirname, 'test-data', 'review-data.xlsx');
        
        // Compare profile section with Excel data
        const { matches, mismatches } = await reviewPage.compareWithExcel(
            excelFilePath,
            'Profile',
            'profile'
        );
        
        // Log the comparison results
        console.log('Profile Section - Matches:', matches.length);
        console.log('Profile Section - Mismatches:', mismatches.length);
        
        if (mismatches.length > 0) {
            console.log('Mismatch Details:', JSON.stringify(mismatches, null, 2));
        }
        
        // Verify there are no mismatches
        expect(mismatches.length).toBe(0);
    });
    
    test('Submit application with confirmation', async () => {
        // Skip if running in CI environment
        test.skip(process.env.CI, 'Skipping application submission test in CI environment');
        
        // Select a payment method
        await reviewPage.selectPaymentMethod('visa');
        
        // Fill in payment details (assuming there are fields for this)
        // This is a placeholder - adjust based on your actual implementation
        // await reviewPage.page.fill('#card-number', testUser.paymentInfo.cardNumber);
        // await reviewPage.page.fill('#expiry-date', testUser.paymentInfo.expiryDate);
        // await reviewPage.page.fill('#cvv', testUser.paymentInfo.cvv);
        // await reviewPage.page.fill('#name-on-card', testUser.paymentInfo.nameOnCard);
        
        // Check the affidavit checkbox
        await reviewPage.page.check(reviewPage.selectors.affidavitCheckbox);
        
        // Submit the application with confirmation
        const isSubmitted = await reviewPage.submitApplication({ confirm: true });
        
        // Verify the submission was successful
        expect(isSubmitted).toBeTruthy();
        
        // Verify we're redirected to a confirmation/success page
        await expect(reviewPage.page).toHaveURL(/.*confirmation|success/);
    });
    
    test('Cancel application submission', async () => {
        // Click the submit button
        await reviewPage.page.click(reviewPage.selectors.submitApplicationButton);
        
        // Wait for the confirmation modal
        await reviewPage.page.waitForSelector(reviewPage.selectors.confirmationModal, { state: 'visible' });
        
        // Click the cancel button
        await reviewPage.page.click(reviewPage.selectors.cancelButton);
        
        // Verify we're still on the review page
        await expect(reviewPage.page).toHaveURL(/.*review/);
    });
    
    test('Verify error message when submitting without required fields', async () => {
        // Try to submit without checking the affidavit
        await reviewPage.page.click(reviewPage.selectors.submitApplicationButton);
        
        // Verify error message is displayed
        const hasError = await reviewPage.page.isVisible(reviewPage.selectors.errorMessage);
        expect(hasError).toBeTruthy();
        
        // Verify the error message text
        const errorText = await reviewPage.page.textContent(reviewPage.selectors.errorMessage);
        expect(errorText).toContain('Please complete all required sections');
    });
});
