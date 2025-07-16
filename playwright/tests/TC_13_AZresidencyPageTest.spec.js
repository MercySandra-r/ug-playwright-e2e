// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const path = require('path');

/**
 * Test suite for AZ Residency page functionality
 */
test.describe('AZ Residency Page Tests', () => {
    let loginPage;
    let azResidencyPage;
    let testUser;
    
    // Test documents
    const testDocuments = [
        {
            name: 'proof_of_residence.pdf',
            type: 'proof_of_residence',
            description: 'Proof of residence in Arizona'
        },
        {
            name: 'lease_agreement.pdf',
            type: 'lease_agreement',
            description: 'Lease agreement for Arizona residence'
        },
        {
            name: 'utility_bill.pdf',
            type: 'utility_bill',
            description: 'Utility bill showing Arizona address'
        }
    ];

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        azResidencyPage = new AZResidencyPage(page);
        
        // Test user data
        testUser = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            password: process.env.TEST_PASSWORD || 'TestPassword123!',
            residencyInfo: {
                isAZResident: true,
                hasLivedInAZ: true,
                hasAZParent: false,
                isMilitary: false,
                additionalInfo: 'Additional information about Arizona residency'
            }
        };

        // Login and navigate to AZ Residency page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await azResidencyPage.navigateToAZResidency();
    });

    test('Verify AZ Residency page loads successfully', async () => {
        // Verify page title and URL
        await expect(azResidencyPage.page).toHaveURL(/.*az-residency/);
        await expect(azResidencyPage.page.locator(azResidencyPage.selectors.pageTitle))
            .toContainText('Arizona Residency');
    });

    test('Validate AZ Residency page content', async () => {
        // Verify the page content is valid
        const isPageValid = await azResidencyPage.validateAZresidencyPage();
        expect(isPageValid).toBeTruthy();
    });

    test('Answer permanent home question (AZ resident)', async () => {
        // Answer as AZ resident
        await azResidencyPage.answerPermanentHomeQuestion(true);
        
        // Verify the selection
        const isAZResidentSelected = await azResidencyPage.page.isChecked(azResidencyPage.selectors.permanentHomeYesRadio);
        expect(isAZResidentSelected).toBeTruthy();
    });

    test('Answer permanent home question (non-AZ resident)', async () => {
        // Answer as non-AZ resident
        await azResidencyPage.answerPermanentHomeQuestion(false);
        
        // Verify the selection
        const isNonAZResidentSelected = await azResidencyPage.page.isChecked(azResidencyPage.selectors.permanentHomeNoRadio);
        expect(isNonAZResidentSelected).toBeTruthy();
    });

    test('Answer living in AZ question', async () => {
        // First answer the permanent home question to reveal the living in AZ question
        await azResidencyPage.answerPermanentHomeQuestion(true);
        
        // Answer living in AZ question
        await azResidencyPage.answerLivingInAZQuestion(true);
        
        // Verify the selection
        const hasLivedInAZ = await azResidencyPage.page.isChecked(azResidencyPage.selectors.livingInAZYesRadio);
        expect(hasLivedInAZ).toBeTruthy();
    });

    test('Answer parent/guardian question', async () => {
        // First answer the permanent home question to reveal the parent/guardian question
        await azResidencyPage.answerPermanentHomeQuestion(false);
        
        // Answer parent/guardian question
        await azResidencyPage.answerParentGuardianQuestion(true);
        
        // Verify the selection
        const hasAZParent = await azResidencyPage.page.isChecked(azResidencyPage.selectors.parentGuardianYesRadio);
        expect(hasAZParent).toBeTruthy();
    });

    test('Answer military question', async () => {
        // Answer military question
        await azResidencyPage.answerMilitaryQuestion(true);
        
        // Verify the selection
        const isMilitary = await azResidencyPage.page.isChecked(azResidencyPage.selectors.militaryYesRadio);
        expect(isMilitary).toBeTruthy();
    });

    test('Add additional information', async () => {
        const additionalInfo = 'Additional information about my Arizona residency status.';
        
        // Add additional information
        await azResidencyPage.addAdditionalInfo(additionalInfo);
        
        // Verify the additional information was added
        const actualInfo = await azResidencyPage.page.inputValue(azResidencyPage.selectors.additionalInfoTextarea);
        expect(actualInfo).toBe(additionalInfo);
    });

    test('Upload a document', async () => {
        // Skip if running in CI environment without file access
        test.skip(process.env.CI, 'Skipping file upload test in CI environment');
        
        const testDocument = testDocuments[0];
        const filePath = path.join(__dirname, 'test-data', testDocument.name);
        
        // Upload the document
        await azResidencyPage.uploadDocument(
            filePath,
            testDocument.type,
            testDocument.description
        );
        
        // Verify the document appears in the list
        const documentItems = await azResidencyPage.page.$$(azResidencyPage.selectors.documentItem);
        let documentFound = false;
        
        for (const item of documentItems) {
            const nameElement = await item.$(azResidencyPage.selectors.documentName);
            if (nameElement) {
                const nameText = await nameElement.textContent();
                if (nameText.includes(testDocument.name)) {
                    documentFound = true;
                    break;
                }
            }
        }
        
        expect(documentFound).toBeTruthy();
    });

    test('Remove a document', async () => {
        // Skip if running in CI environment without file access
        test.skip(process.env.CI, 'Skipping file upload test in CI environment');
        
        const testDocument = testDocuments[0];
        const filePath = path.join(__dirname, 'test-data', testDocument.name);
        
        // First upload a document to remove
        await azResidencyPage.uploadDocument(
            filePath,
            testDocument.type,
            testDocument.description
        );
        
        // Remove the document
        const isRemoved = await azResidencyPage.removeDocument(testDocument.name);
        expect(isRemoved).toBeTruthy();
        
        // Verify the document is no longer in the list
        const documentItems = await azResidencyPage.page.$$(azResidencyPage.selectors.documentItem);
        let documentFound = false;
        
        for (const item of documentItems) {
            const nameElement = await item.$(azResidencyPage.selectors.documentName);
            if (nameElement) {
                const nameText = await nameElement.textContent();
                if (nameText.includes(testDocument.name)) {
                    documentFound = true;
                    break;
                }
            }
        }
        
        expect(documentFound).toBeFalsy();
    });

    test('Verify error message for required fields', async () => {
        // Try to save without filling required fields
        await azResidencyPage.save();
        
        // Verify error message is displayed
        const hasError = await azResidencyPage.verifyErrorMessage('Please answer all required questions');
        expect(hasError).toBeTruthy();
    });

    test('Complete AZ residency form for AZ resident', async () => {
        // Answer all questions for an AZ resident
        await azResidencyPage.answerPermanentHomeQuestion(true);
        await azResidencyPage.answerLivingInAZQuestion(true);
        await azResidencyPage.answerParentGuardianQuestion(false);
        await azResidencyPage.answerMilitaryQuestion(false);
        
        // Add additional information
        await azResidencyPage.addAdditionalInfo(testUser.residencyInfo.additionalInfo);
        
        // Save the form
        const isSaveSuccessful = await azResidencyPage.save();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Complete AZ residency form for non-AZ resident with AZ parent', async () => {
        // Answer all questions for a non-AZ resident with AZ parent
        await azResidencyPage.answerPermanentHomeQuestion(false);
        await azResidencyPage.answerParentGuardianQuestion(true);
        await azResidencyPage.answerMilitaryQuestion(false);
        
        // Add additional information
        await azResidencyPage.addAdditionalInfo('My parent is an Arizona resident.');
        
        // Save the form
        const isSaveSuccessful = await azResidencyPage.save();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Save and continue to next section', async () => {
        // Answer required questions
        await azResidencyPage.answerPermanentHomeQuestion(true);
        await azResidencyPage.answerLivingInAZQuestion(true);
        
        // Save and continue
        await azResidencyPage.saveAndContinue();
        
        // Verify navigation to next section
        await expect(azResidencyPage.page).toHaveURL(/.*next-section/);
    });

    test('Verify document upload validation', async () => {
        // Skip if running in CI environment without file access
        test.skip(process.env.CI, 'Skipping file upload test in CI environment');
        
        // Try to upload a document without selecting a file
        await azResidencyPage.page.selectOption(azResidencyPage.selectors.documentTypeDropdown, 'proof_of_residence');
        await azResidencyPage.page.click(azResidencyPage.selectors.addDocumentButton);
        
        // Verify error message is displayed
        const hasError = await azResidencyPage.verifyErrorMessage('Please select a file to upload');
        expect(hasError).toBeTruthy();
    });

    test('Verify document type validation', async () => {
        // Skip if running in CI environment without file access
        test.skip(process.env.CI, 'Skipping file upload test in CI environment');
        
        const testDocument = testDocuments[0];
        const filePath = path.join(__dirname, 'test-data', testDocument.name);
        
        // Try to upload a document without selecting a document type
        await azResidencyPage.page.setInputFiles(azResidencyPage.selectors.uploadDocumentInput, filePath);
        await azResidencyPage.page.click(azResidencyPage.selectors.addDocumentButton);
        
        // Verify error message is displayed
        const hasError = await azResidencyPage.verifyErrorMessage('Please select a document type');
        expect(hasError).toBeTruthy();
    });
});
