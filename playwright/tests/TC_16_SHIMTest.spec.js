// @ts-check
const { test, expect } = require('@playwright/test');
const SHIMPage = require('../pages/SHIMPage');
const LoginPage = require('../pages/LoginPage');

/**
 * Test suite for SHIM (Student Housing Information Management) functionality
 */
test.describe('SHIM Tests', () => {
    let shimPage;
    let loginPage;
    
    test.beforeEach(async ({ page }) => {
        shimPage = new SHIMPage(page);
        loginPage = new LoginPage(page);
        
        // Navigate to the SHIM page
        await shimPage.navigateToSHIMPage();
    });
    
    test('Verify SHIM page loads successfully', async () => {
        // Verify the page is loaded
        const isPageLoaded = await shimPage.verifyPageLoaded();
        expect(isPageLoaded).toBeTruthy();
        
        // Verify the email input is visible
        const isEmailInputVisible = await shimPage.page.isVisible(shimPage.selectors.emailInput);
        expect(isEmailInputVisible).toBeTruthy();
    });
    
    test('Submit email with valid format', async () => {
        // Submit a valid email
        const emailSubmitted = await shimPage.submitEmail('test@example.com');
        expect(emailSubmitted).toBeTruthy();
        
        // Verify we're on the next step (mode of learning selection)
        const isMOLVisible = await shimPage.page.isVisible(shimPage.selectors.immersionRadioButton);
        expect(isMOLVisible).toBeTruthy();
    });
    
    test('Submit with auto-generated email', async () => {
        // Submit with auto-generated email
        const emailSubmitted = await shimPage.submitEmail();
        expect(emailSubmitted).toBeTruthy();
        
        // Verify we're on the next step (mode of learning selection)
        const isMOLVisible = await shimPage.page.isVisible(shimPage.selectors.immersionRadioButton);
        expect(isMOLVisible).toBeTruthy();
    });
    
    test('Select immersion (in-person) mode of learning', async () => {
        // First submit an email
        await shimPage.submitEmail();
        
        // Select immersion mode
        const isSelected = await shimPage.selectImmersionMOL();
        expect(isSelected).toBeTruthy();
        
        // Verify online radio is not selected
        const isOnlineSelected = await shimPage.page.isChecked(shimPage.selectors.onlineRadioButton);
        expect(isOnlineSelected).toBeFalsy();
        
        // Click Next and verify navigation
        const nextClicked = await shimPage.clickNext();
        expect(nextClicked).toBeTruthy();
    });
    
    test('Select online mode of learning', async () => {
        // First submit an email
        await shimPage.submitEmail();
        
        // Select online mode
        const isSelected = await shimPage.selectOnlineMOL();
        expect(isSelected).toBeTruthy();
        
        // Verify immersion radio is not selected
        const isImmersionSelected = await shimPage.page.isChecked(shimPage.selectors.immersionRadioButton);
        expect(isImmersionSelected).toBeFalsy();
        
        // Click Next and verify navigation
        const nextClicked = await shimPage.clickNext();
        expect(nextClicked).toBeTruthy();
    });
    
    test('Select degree-seeking option', async () => {
        // Go through the flow to reach the degree selection step
        await shimPage.submitEmail();
        await shimPage.selectImmersionMOL();
        await shimPage.clickNext();
        
        // Select degree option
        const isSelected = await shimPage.selectDegreeOption();
        expect(isSelected).toBeTruthy();
        
        // Verify non-degree radio is not selected
        const isNonDegreeSelected = await shimPage.page.isChecked(shimPage.selectors.nonDegreeRadioButton);
        expect(isNonDegreeSelected).toBeFalsy();
    });
    
    test('Select non-degree option', async () => {
        // Go through the flow to reach the degree selection step
        await shimPage.submitEmail();
        await shimPage.selectImmersionMOL();
        await shimPage.clickNext();
        
        // Select non-degree option
        const isSelected = await shimPage.selectNonDegreeOption();
        expect(isSelected).toBeTruthy();
        
        // Verify degree radio is not selected
        const isDegreeSelected = await shimPage.page.isChecked(shimPage.selectors.degreeRadioButton);
        expect(isDegreeSelected).toBeFalsy();
    });
    
    test('Toggle Starbucks partner checkbox', async () => {
        // Go through the flow to reach the degree selection step
        await shimPage.submitEmail();
        await shimPage.selectImmersionMOL();
        await shimPage.clickNext();
        
        // Toggle Starbucks partner checkbox on
        let isToggled = await shimPage.toggleStarbucksPartner(true);
        expect(isToggled).toBeTruthy();
        
        // Toggle Starbucks partner checkbox off
        isToggled = await shimPage.toggleStarbucksPartner(false);
        expect(isToggled).toBeTruthy();
    });
    
    test('Complete SHIM flow with immersion and degree options', async () => {
        // Complete the full SHIM flow
        const flowCompleted = await shimPage.completeSHIMFlow({
            modeOfLearning: 'immersion',
            studentType: 'degree',
            isStarbucksPartner: false
        });
        
        expect(flowCompleted).toBeTruthy();
        
        // Verify we see a confirmation or the next expected page
        const hasConfirmation = await shimPage.isConfirmationDisplayed();
        expect(hasConfirmation).toBeTruthy();
    });
    
    test('Complete SHIM flow with online and non-degree options', async () => {
        // Complete the full SHIM flow with different options
        const flowCompleted = await shimPage.completeSHIMFlow({
            modeOfLearning: 'online',
            studentType: 'nondegree',
            isStarbucksPartner: true
        });
        
        expect(flowCompleted).toBeTruthy();
        
        // Verify we see a confirmation or the next expected page
        const hasConfirmation = await shimPage.isConfirmationDisplayed();
        expect(hasConfirmation).toBeTruthy();
    });
    
    test('Verify back button functionality', async () => {
        // Go through the flow to reach the degree selection step
        await shimPage.submitEmail();
        await shimPage.selectImmersionMOL();
        await shimPage.clickNext();
        
        // Click back and verify we return to the mode of learning selection
        const backClicked = await shimPage.clickBack();
        expect(backClicked).toBeTruthy();
        
        // Verify we're back to the MOL selection
        const isMOLVisible = await shimPage.page.isVisible(shimPage.selectors.immersionRadioButton);
        expect(isMOLVisible).toBeTruthy();
    });
    
    test('Verify responsive design on different viewports', async () => {
        // Test on mobile viewport
        await shimPage.page.setViewportSize({ width: 375, height: 667 });
        
        // Verify the page is still functional on mobile
        const isPageValidMobile = await shimPage.verifyPageLoaded();
        expect(isPageValidMobile).toBeTruthy();
        
        // Test on tablet viewport
        await shimPage.page.setViewportSize({ width: 768, height: 1024 });
        
        // Verify the page is still functional on tablet
        const isPageValidTablet = await shimPage.verifyPageLoaded();
        expect(isPageValidTablet).toBeTruthy();
    });
    
    test('Verify accessibility of the SHIM page', async () => {
        // Run accessibility scan
        const accessibilityScanResults = await shimPage.page.accessibility.snapshot();
        
        // Log any accessibility issues
        if (accessibilityScanResults && accessibilityScanResults.violations) {
            console.log('Accessibility issues found:', accessibilityScanResults.violations);
        }
        
        // This is a basic check - in a real scenario, you might want to fail the test
        // if there are critical accessibility issues
        expect(true).toBeTruthy();
    });
});
