// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ProfilePage = require('../pages/ProfilePage');

/**
 * Test data for profile information
 */
const testUser = {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'TestPassword123!',
    personalInfo: {
        firstName: 'John',
        middleName: 'William',
        lastName: 'Doe',
        preferredName: 'Johnny',
        dateOfBirth: '2000-01-01'
    },
    contactInfo: {
        phoneNumber: '555-123-4567',
        addressLine1: '123 University Ave',
        addressLine2: 'Apt 4B',
        city: 'Tempe',
        state: 'AZ',
        zipCode: '85281',
        country: 'United States'
    },
    emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Mother',
        phone: '555-987-6543',
        email: 'jane.doe@example.com'
    },
    pronouns: 'he/him/his',
    gender: 'Male',
    customPronouns: 'they/them/theirs',
    customGender: 'Non-binary'
};

/**
 * Test suite for Profile page functionality
 */
test.describe('Profile Page Tests', () => {
    let loginPage;
    let profilePage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        profilePage = new ProfilePage(page);

        // Login and navigate to profile page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await profilePage.navigateToProfile();
    });

    test('Verify Profile page loads successfully', async () => {
        // Verify page title and URL
        await expect(profilePage.page).toHaveURL(/.*profile/);
        await expect(profilePage.page.locator(profilePage.selectors.profileEmail)).toBeVisible();
    });

    test('Open profile edit mode', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Verify we're in edit mode by checking for input fields
        await expect(profilePage.page.locator(profilePage.selectors.firstNameInput)).toBeVisible();
    });

    test('Validate email displayed on profile', async () => {
        // Verify the email matches the logged-in user
        const isEmailValid = await profilePage.validateEmail(testUser.email);
        expect(isEmailValid).toBeTruthy();
    });

    test('Update personal information', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Update personal information
        await profilePage.updatePersonalInfo(testUser.personalInfo);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the updated information
        const firstNameValue = await profilePage.page.inputValue(profilePage.selectors.firstNameInput);
        expect(firstNameValue).toBe(testUser.personalInfo.firstName);
        
        const lastNameValue = await profilePage.page.inputValue(profilePage.selectors.lastNameInput);
        expect(lastNameValue).toBe(testUser.personalInfo.lastName);
    });

    test('Select pronouns from dropdown', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Select pronouns
        await profilePage.selectPronouns(testUser.pronouns);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the selected pronouns
        const selectedPronouns = await profilePage.page.$eval(
            profilePage.selectors.pronounsDropdown,
            select => select.value
        );
        expect(selectedPronouns).toBe(testUser.pronouns);
    });

    test('Select custom pronouns', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Select custom pronouns
        await profilePage.selectPronouns('custom', testUser.customPronouns);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the custom pronouns
        const selectedPronouns = await profilePage.page.$eval(
            profilePage.selectors.pronounsDropdown,
            select => select.value
        );
        expect(selectedPronouns).toBe('custom');
        
        const customPronounsValue = await profilePage.page.inputValue(profilePage.selectors.customPronounsInput);
        expect(customPronounsValue).toBe(testUser.customPronouns);
    });

    test('Select gender from dropdown', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Select gender
        await profilePage.selectGender(testUser.gender);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the selected gender
        const selectedGender = await profilePage.page.$eval(
            profilePage.selectors.genderDropdown,
            select => select.value
        );
        expect(selectedGender).toBe(testUser.gender.toLowerCase());
    });

    test('Select custom gender', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Select custom gender
        await profilePage.selectGender('custom', testUser.customGender);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the custom gender
        const selectedGender = await profilePage.page.$eval(
            profilePage.selectors.genderDropdown,
            select => select.value
        );
        expect(selectedGender).toBe('custom');
        
        const customGenderValue = await profilePage.page.inputValue(profilePage.selectors.customGenderInput);
        expect(customGenderValue).toBe(testUser.customGender);
    });

    test('Update contact information', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Scroll to contact information section
        await profilePage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Update contact information
        await profilePage.updateContactInfo(testUser.contactInfo);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the updated contact information
        const phoneValue = await profilePage.page.inputValue(profilePage.selectors.phoneNumberInput);
        expect(phoneValue).toBe(testUser.contactInfo.phoneNumber);
        
        const addressValue = await profilePage.page.inputValue(profilePage.selectors.addressLine1Input);
        expect(addressValue).toBe(testUser.contactInfo.addressLine1);
    });

    test('Update emergency contact information', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Scroll to emergency contact section
        await profilePage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Update emergency contact information
        await profilePage.updateEmergencyContact(testUser.emergencyContact);
        
        // Save changes
        const isSaveSuccessful = await profilePage.save();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Reopen profile to verify changes
        await profilePage.openProfile();
        
        // Verify the updated emergency contact information
        const emergencyNameValue = await profilePage.page.inputValue(profilePage.selectors.emergencyContactNameInput);
        expect(emergencyNameValue).toBe(testUser.emergencyContact.name);
        
        const emergencyPhoneValue = await profilePage.page.inputValue(profilePage.selectors.emergencyContactPhoneInput);
        expect(emergencyPhoneValue).toBe(testUser.emergencyContact.phone);
    });

    test('Verify error messages for required fields', async () => {
        // Open profile edit mode
        await profilePage.openProfile();
        
        // Clear required fields
        await profilePage.page.fill(profilePage.selectors.firstNameInput, '');
        await profilePage.page.fill(profilePage.selectors.lastNameInput, '');
        
        // Try to save
        await profilePage.page.click(profilePage.selectors.saveButton);
        
        // Verify error message is displayed
        const hasError = await profilePage.verifyErrorMessage('Please fill in all required fields');
        expect(hasError).toBeTruthy();
    });

    test('Return to dashboard', async () => {
        // Return to dashboard
        await profilePage.returnToDashboard();
        
        // Verify navigation to dashboard
        await expect(profilePage.page).toHaveURL(/.*dashboard/);
    });

    test('Check application status', async () => {
        // Check status
        const status = await profilePage.checkStatus();
        
        // Verify status is displayed (exact text may vary)
        expect(status).toBeTruthy();
        expect(typeof status).toBe('string');
    });
});
