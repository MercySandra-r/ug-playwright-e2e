// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const MyInformationPage = require('../pages/MyInformationPage');

/**
 * Test suite for My Information page functionality
 */
test.describe('My Information Page Tests', () => {
    let loginPage;
    let myInfoPage;
    let testUser;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        myInfoPage = new MyInformationPage(page);
        
        // Test user data
        testUser = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            password: process.env.TEST_PASSWORD || 'TestPassword123!',
            personalInfo: {
                firstName: 'Test',
                middleName: 'Middle',
                lastName: 'User',
                suffix: 'Jr',
                legalSex: 'MALE',
                primaryLanguage: 'ENGLISH',
                email: 'test@example.com',
                phoneNumber: '5551234567',
                phoneType: 'Mobile',
                address: {
                    line1: '123 Test St',
                    city: 'Tempe',
                    state: 'AZ',
                    zipCode: '85281',
                    country: 'US'
                },
                ethnicity: 'HISPANIC',
                races: ['WHITE', 'ASIAN'],
                citizenshipStatus: 'US_CITIZEN',
                militaryAffiliation: 'NONE'
            }
        };

        // Login and navigate to My Information page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await myInfoPage.navigateToMyInformation();
    });

    test('Verify My Information page loads successfully', async () => {
        // Verify page title and URL
        await expect(myInfoPage.page).toHaveURL(/.*my-information/);
        await expect(myInfoPage.page.locator(myInfoPage.selectors.pageTitle))
            .toContainText('My Information');
    });

    test('Update personal information', async () => {
        // Fill in personal information
        await myInfoPage.fillPersonalInformation({
            firstName: testUser.personalInfo.firstName,
            middleName: testUser.personalInfo.middleName,
            lastName: testUser.personalInfo.lastName,
            suffix: testUser.personalInfo.suffix
        });

        // Select legal sex
        await myInfoPage.selectLegalSex(testUser.personalInfo.legalSex);
        
        // Select primary language
        await myInfoPage.selectPrimaryLanguage(testUser.personalInfo.primaryLanguage);
        
        // Save the form
        await myInfoPage.saveForm('save');
        
        // Verify save was successful
        const isSaveSuccessful = await myInfoPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Add and manage former names', async () => {
        const formerName = 'Previous Name';
        const updatedName = 'Updated Previous Name';
        
        // Add a former name
        await myInfoPage.addFormerName(formerName);
        
        // Verify the former name was added
        let isNameDisplayed = await myInfoPage.isFormerNameDisplayed(formerName);
        expect(isNameDisplayed).toBeTruthy();
        
        // Edit the former name
        await myInfoPage.editFormerName(formerName, updatedName);
        
        // Verify the former name was updated
        isNameDisplayed = await myInfoPage.isFormerNameDisplayed(updatedName);
        expect(isNameDisplayed).toBeTruthy();
        
        // Delete the former name
        await myInfoPage.deleteFormerName(updatedName);
        
        // Verify the former name was deleted
        isNameDisplayed = await myInfoPage.isFormerNameDisplayed(updatedName);
        expect(isNameDisplayed).toBeFalsy();
    });

    test('Update contact information', async () => {
        // Fill in contact information
        await myInfoPage.fillContactInformation({
            email: testUser.personalInfo.email,
            phoneNumber: testUser.personalInfo.phoneNumber,
            phoneType: testUser.personalInfo.phoneType
        });
        
        // Save the form
        await myInfoPage.saveForm('save');
        
        // Verify save was successful
        const isSaveSuccessful = await myInfoPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Update address information', async () => {
        // Fill in address information
        await myInfoPage.fillAddressInformation(testUser.personalInfo.address);
        
        // Save the form
        await myInfoPage.saveForm('save');
        
        // Verify save was successful
        const isSaveSuccessful = await myInfoPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Update ethnicity and race information', async () => {
        // Select ethnicity and race
        await myInfoPage.selectEthnicityAndRace({
            ethnicity: testUser.personalInfo.ethnicity,
            races: testUser.personalInfo.races
        });
        
        // Save the form
        await myInfoPage.saveForm('save');
        
        // Verify save was successful
        const isSaveSuccessful = await myInfoPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Update citizenship status', async () => {
        // Select citizenship status
        await myInfoPage.selectCitizenshipStatus({
            status: testUser.personalInfo.citizenshipStatus
        });
        
        // Save the form
        await myInfoPage.saveForm('save');
        
        // Verify save was successful
        const isSaveSuccessful = await myInfoPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Update military affiliation', async () => {
        // Select military affiliation
        await myInfoPage.selectMilitaryAffiliation({
            affiliation: testUser.personalInfo.militaryAffiliation
        });
        
        // Save the form
        await myInfoPage.saveForm('save');
        
        // Verify save was successful
        const isSaveSuccessful = await myInfoPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Verify required field validations', async () => {
        // Clear required fields
        await myInfoPage.page.fill(myInfoPage.selectors.firstNameInput, '');
        await myInfoPage.page.fill(myInfoPage.selectors.lastNameInput, '');
        
        // Try to save the form
        await myInfoPage.saveForm('save');
        
        // Verify error messages for required fields
        const firstNameError = await myInfoPage.verifyFieldError(
            'firstName', 'First name is required'
        );
        const lastNameError = await myInfoPage.verifyFieldError(
            'lastName', 'Last name is required'
        );
        
        expect(firstNameError).toBeTruthy();
        expect(lastNameError).toBeTruthy();
    });

    test('Save and continue to next section', async () => {
        // Fill in required information
        await myInfoPage.fillPersonalInformation({
            firstName: testUser.personalInfo.firstName,
            lastName: testUser.personalInfo.lastName
        });
        
        // Save and continue
        await myInfoPage.saveForm('continue');
        
        // Verify navigation to next section
        await expect(myInfoPage.page).toHaveURL(/.*next-section/);
    });
});
