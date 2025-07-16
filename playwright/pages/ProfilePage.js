// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for Profile related actions
 */
class ProfilePage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'ProfilePage');
        
        // Define page selectors
        this.selectors = {
            // Profile icon and navigation
            profileIcon: '[data-cy="profile-icon"]',
            editProfileButton: 'button:has-text("Edit Profile")',
            
            // Profile information
            profileEmail: '[data-cy="profile-email"]',
            
            // Personal Information Section
            firstNameInput: 'input[name="firstName"]',
            middleNameInput: 'input[name="middleName"]',
            lastNameInput: 'input[name="lastName"]',
            preferredNameInput: 'input[name="preferredName"]',
            dateOfBirthInput: 'input[name="dateOfBirth"]',
            
            // Pronouns
            pronounsDropdown: 'select[name="pronouns"]',
            customPronounsInput: 'input[name="customPronouns"]',
            
            // Gender Identity
            genderDropdown: 'select[name="gender"]',
            customGenderInput: 'input[name="customGender"]',
            
            // Contact Information
            phoneNumberInput: 'input[name="phoneNumber"]',
            addressLine1Input: 'input[name="addressLine1"]',
            addressLine2Input: 'input[name="addressLine2"]',
            cityInput: 'input[name="city"]',
            stateDropdown: 'select[name="state"]',
            zipCodeInput: 'input[name="zipCode"]',
            countryDropdown: 'select[name="country"]',
            
            // Emergency Contact
            emergencyContactNameInput: 'input[name="emergencyContactName"]',
            emergencyContactRelationshipInput: 'input[name="emergencyContactRelationship"]',
            emergencyContactPhoneInput: 'input[name="emergencyContactPhone"]',
            emergencyContactEmailInput: 'input[name="emergencyContactEmail"]',
            
            // Form Actions
            saveButton: 'button:has-text("Save")',
            cancelButton: 'button:has-text("Cancel")',
            returnToDashboardButton: 'a:has-text("Return to Dashboard")',
            
            // Status Section
            statusSection: '.status-section',
            applicationStatus: '.application-status',
            
            // Error Messages
            errorMessage: '.error-message',
            validationError: '.validation-error',
            
            // Success Message
            successMessage: '.success-message'
        };
    }
    
    /**
     * Navigate to the profile page
     * @returns {Promise<void>}
     */
    async navigateToProfile() {
        await this.page.goto('/profile');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Open the profile edit mode
     * @returns {Promise<void>}
     */
    async openProfile() {
        // Click on profile icon
        await this.page.click(this.selectors.profileIcon);
        await this.page.waitForTimeout(1000);
        
        // Click on edit profile button
        await this.page.click(this.selectors.editProfileButton);
        await this.page.waitForLoadState('networkidle');
        
        // Verify the page is in edit mode
        await expect(this.page.locator(this.selectors.firstNameInput)).toBeVisible();
    }
    
    /**
     * Verify the profile page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*profile/);
        await expect(this.page.locator(this.selectors.profileEmail)).toBeVisible();
    }
    
    /**
     * Validate the email displayed on the profile page
     * @param {string} expectedEmail - The expected email address
     * @returns {Promise<boolean>} Whether the email matches the expected value
     */
    async validateEmail(expectedEmail) {
        try {
            const actualEmail = await this.page.textContent(this.selectors.profileEmail);
            return actualEmail.trim() === expectedEmail.trim();
        } catch (error) {
            console.error('Error validating email:', error);
            return false;
        }
    }
    
    /**
     * Select pronouns from dropdown or enter custom pronouns
     * @param {string} pronouns - The pronouns to select or 'custom' for custom input
     * @param {string} [customPronouns] - Custom pronouns (required if pronouns is 'custom')
     * @returns {Promise<void>}
     */
    async selectPronouns(pronouns, customPronouns) {
        if (pronouns.toLowerCase() === 'custom' && customPronouns) {
            await this.page.selectOption(this.selectors.pronounsDropdown, 'custom');
            await this.page.fill(this.selectors.customPronounsInput, customPronouns);
        } else {
            await this.page.selectOption(this.selectors.pronounsDropdown, pronouns);
        }
    }
    
    /**
     * Select gender from dropdown or enter custom gender
     * @param {string} gender - The gender to select or 'custom' for custom input
     * @param {string} [customGender] - Custom gender (required if gender is 'custom')
     * @returns {Promise<void>}
     */
    async selectGender(gender, customGender) {
        if (gender.toLowerCase() === 'custom' && customGender) {
            await this.page.selectOption(this.selectors.genderDropdown, 'custom');
            await this.page.fill(this.selectors.customGenderInput, customGender);
        } else {
            await this.page.selectOption(this.selectors.genderDropdown, gender);
        }
    }
    
    /**
     * Update personal information
     * @param {Object} personalInfo - Object containing personal information
     * @param {string} [personalInfo.firstName] - First name
     * @param {string} [personalInfo.middleName] - Middle name
     * @param {string} [personalInfo.lastName] - Last name
     * @param {string} [personalInfo.preferredName] - Preferred name
     * @param {string} [personalInfo.dateOfBirth] - Date of birth (format: YYYY-MM-DD)
     * @returns {Promise<void>}
     */
    async updatePersonalInfo(personalInfo) {
        if (personalInfo.firstName) {
            await this.page.fill(this.selectors.firstNameInput, personalInfo.firstName);
        }
        
        if (personalInfo.middleName) {
            await this.page.fill(this.selectors.middleNameInput, personalInfo.middleName);
        }
        
        if (personalInfo.lastName) {
            await this.page.fill(this.selectors.lastNameInput, personalInfo.lastName);
        }
        
        if (personalInfo.preferredName) {
            await this.page.fill(this.selectors.preferredNameInput, personalInfo.preferredName);
        }
        
        if (personalInfo.dateOfBirth) {
            await this.page.fill(this.selectors.dateOfBirthInput, personalInfo.dateOfBirth);
        }
    }
    
    /**
     * Update contact information
     * @param {Object} contactInfo - Object containing contact information
     * @param {string} [contactInfo.phoneNumber] - Phone number
     * @param {string} [contactInfo.addressLine1] - Address line 1
     * @param {string} [contactInfo.addressLine2] - Address line 2
     * @param {string} [contactInfo.city] - City
     * @param {string} [contactInfo.state] - State
     * @param {string} [contactInfo.zipCode] - ZIP code
     * @param {string} [contactInfo.country] - Country
     * @returns {Promise<void>}
     */
    async updateContactInfo(contactInfo) {
        if (contactInfo.phoneNumber) {
            await this.page.fill(this.selectors.phoneNumberInput, contactInfo.phoneNumber);
        }
        
        if (contactInfo.addressLine1) {
            await this.page.fill(this.selectors.addressLine1Input, contactInfo.addressLine1);
        }
        
        if (contactInfo.addressLine2) {
            await this.page.fill(this.selectors.addressLine2Input, contactInfo.addressLine2);
        }
        
        if (contactInfo.city) {
            await this.page.fill(this.selectors.cityInput, contactInfo.city);
        }
        
        if (contactInfo.state) {
            await this.page.selectOption(this.selectors.stateDropdown, contactInfo.state);
        }
        
        if (contactInfo.zipCode) {
            await this.page.fill(this.selectors.zipCodeInput, contactInfo.zipCode);
        }
        
        if (contactInfo.country) {
            await this.page.selectOption(this.selectors.countryDropdown, contactInfo.country);
        }
    }
    
    /**
     * Update emergency contact information
     * @param {Object} emergencyContact - Object containing emergency contact information
     * @param {string} [emergencyContact.name] - Emergency contact name
     * @param {string} [emergencyContact.relationship] - Relationship to the applicant
     * @param {string} [emergencyContact.phone] - Emergency contact phone number
     * @param {string} [emergencyContact.email] - Emergency contact email
     * @returns {Promise<void>}
     */
    async updateEmergencyContact(emergencyContact) {
        if (emergencyContact.name) {
            await this.page.fill(this.selectors.emergencyContactNameInput, emergencyContact.name);
        }
        
        if (emergencyContact.relationship) {
            await this.page.fill(this.selectors.emergencyContactRelationshipInput, emergencyContact.relationship);
        }
        
        if (emergencyContact.phone) {
            await this.page.fill(this.selectors.emergencyContactPhoneInput, emergencyContact.phone);
        }
        
        if (emergencyContact.email) {
            await this.page.fill(this.selectors.emergencyContactEmailInput, emergencyContact.email);
        }
    }
    
    /**
     * Save the profile changes
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async save() {
        try {
            await this.page.click(this.selectors.saveButton);
            await this.page.waitForLoadState('networkidle');
            
            // Check for success message or redirect
            const success = await this.page.$(this.selectors.successMessage) || 
                           !(await this.page.$(this.selectors.saveButton));
            
            return !!success;
        } catch (error) {
            console.error('Error saving profile:', error);
            return false;
        }
    }
    
    /**
     * Return to the dashboard
     * @returns {Promise<void>}
     */
    async returnToDashboard() {
        await this.page.click(this.selectors.returnToDashboardButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Check the application status
     * @returns {Promise<string>} The application status text
     */
    async checkStatus() {
        await this.page.waitForSelector(this.selectors.statusSection, { state: 'visible' });
        const statusElement = await this.page.$(this.selectors.applicationStatus);
        return statusElement ? statusElement.textContent() : 'Status not found';
    }
    
    /**
     * Verify error message is displayed
     * @param {string} expectedMessage - The expected error message
     * @returns {Promise<boolean>} Whether the error message is displayed and matches
     */
    async verifyErrorMessage(expectedMessage) {
        try {
            const errorLocator = this.page.locator(this.selectors.errorMessage);
            await errorLocator.waitFor({ state: 'visible', timeout: 5000 });
            const actualMessage = await errorLocator.textContent();
            return actualMessage.includes(expectedMessage);
        } catch (error) {
            return false;
        }
    }
}

module.exports = ProfilePage;
