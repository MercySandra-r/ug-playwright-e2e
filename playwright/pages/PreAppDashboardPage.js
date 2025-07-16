// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');
const { faker } = require('@faker-js/faker');

/**
 * Page Object for Pre-Application Dashboard related actions
 */
class PreAppDashboardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'PreAppDashboardPage');
        
        // Define page selectors
        this.selectors = {
            // Header and Navigation
            pageTitle: 'h1',
            startNewAppButton: 'button:has-text("Start New Application")',
            
            // Personal Information Section
            firstNameInput: 'input[name="firstName"]',
            preferredFirstNameInput: 'input[name="preferredFirstName"]',
            middleNameInput: 'input[name="middleName"]',
            lastNameInput: 'input[name="lastName"]',
            suffixSelect: 'select[name="suffix"]',
            /**
             * Get selector for a specific suffix option
             * @param {string} suffix - The suffix value
             * @returns {string} The CSS selector for the suffix option
             */
            suffixOption: (suffix) => `select[name="suffix"] option[value="${suffix}"]`,
            
            // Date of Birth Section
            birthMonthSelect: 'select[name="birthMonth"]',
            birthDaySelect: 'select[name="birthDay"]',
            birthYearSelect: 'select[name="birthYear"]',
            dateClearButton: 'button:has-text("Clear")',
            
            // Contact Information
            emailInput: 'input[name="email"]',
            phoneNumberInput: 'input[name="phoneNumber"]',
            phoneTypeSelect: 'select[name="phoneType"]',
            countryCodeSelect: 'select[name="countryCode"]',
            
            // Error Messages
            errorMessage: '.error-message',
            /**
             * Get selector for a field's error message
             * @param {string} fieldName - The name of the field
             * @returns {string} The CSS selector for the field's error message
             */
            fieldErrorMessage: (fieldName) => `[data-testid="${fieldName}-error"]`,
            
            // Buttons
            submitButton: 'button[type="submit"]',
            cancelButton: 'button:has-text("Cancel")',
            saveAndContinueButton: 'button:has-text("Save & Continue")',
            
            // Modal Dialogs
            confirmationModal: '.confirmation-modal',
            modalConfirmButton: '.modal-confirm-button',
            modalCancelButton: '.modal-cancel-button'
        };
        
        // Initialize any page-specific properties
        this.currentYear = new Date().getFullYear();
    }

    /**
     * Navigate to the Pre-Application Dashboard
     * @returns {Promise<void>}
     */
    async navigateToDashboard() {
        await this.page.goto('/dashboard');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }

    /**
     * Verify the Pre-Application Dashboard page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*dashboard/);
        await expect(this.page.locator(this.selectors.pageTitle)).toContainText('Pre-Application Dashboard');
    }

    /**
     * Fill in personal information
     * @param {Object} userData - User data object
     * @param {string} userData.firstName - First name
     * @param {string} [userData.preferredFirstName] - Preferred first name (optional)
     * @param {string} [userData.middleName] - Middle name (optional)
     * @param {string} userData.lastName - Last name
     * @param {string} [userData.suffix] - Name suffix (e.g., 'Jr', 'Sr', 'III')
     * @returns {Promise<void>}
     */
    async fillPersonalInformation({ firstName, preferredFirstName, middleName, lastName, suffix }) {
        await this.page.fill(this.selectors.firstNameInput, firstName);
        
        if (preferredFirstName) {
            await this.page.fill(this.selectors.preferredFirstNameInput, preferredFirstName);
        }
        
        if (middleName) {
            await this.page.fill(this.selectors.middleNameInput, middleName);
        }
        
        await this.page.fill(this.selectors.lastNameInput, lastName);
        
        if (suffix) {
            await this.page.selectOption(this.selectors.suffixSelect, { value: suffix });
        }
    }

    /**
     * Set date of birth
     * @param {Object} date - Date object with month, day, and year
     * @param {string|number} date.month - Month (1-12 or month name)
     * @param {string|number} date.day - Day (1-31)
     * @param {string|number} date.year - Year (e.g., 1990)
     * @returns {Promise<void>}
     */
    async setDateOfBirth({ month, day, year }) {
        // Clear any existing date
        await this.page.click(this.selectors.dateClearButton);
        
        // Set month
        await this.page.selectOption(this.selectors.birthMonthSelect, { value: month.toString() });
        
        // Set day
        await this.page.selectOption(this.selectors.birthDaySelect, { value: day.toString() });
        
        // Set year
        await this.page.selectOption(this.selectors.birthYearSelect, { value: year.toString() });
    }

    /**
     * Generate a random date of birth for a specific age
     * @param {number} age - Desired age
     * @returns {Object} Object with month, day, and year
     */
    generateRandomBirthDateForAge(age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        const month = Math.floor(Math.random() * 12) + 1; // 1-12
        const day = Math.floor(Math.random() * 28) + 1; // 1-28 (to handle February)
        
        return {
            month,
            day,
            year: birthYear
        };
    }

    /**
     * Fill in contact information
     * @param {Object} contactInfo - Contact information
     * @param {string} contactInfo.email - Email address
     * @param {string} contactInfo.phoneNumber - Phone number (digits only)
     * @param {string} [contactInfo.phoneType] - Phone type (e.g., 'Mobile', 'Home', 'Work')
     * @param {string} [contactInfo.countryCode] - Country code (e.g., '+1' for US)
     * @returns {Promise<void>}
     */
    async fillContactInformation({ email, phoneNumber, phoneType = 'Mobile', countryCode = '+1' }) {
        await this.page.fill(this.selectors.emailInput, email);
        
        if (countryCode) {
            await this.page.selectOption(this.selectors.countryCodeSelect, { value: countryCode });
        }
        
        await this.page.fill(this.selectors.phoneNumberInput, phoneNumber);
        
        if (phoneType) {
            await this.page.selectOption(this.selectors.phoneTypeSelect, { label: phoneType });
        }
    }

    /**
     * Validate phone number format
     * @param {string} phone - The phone number to validate
     * @param {string} [countryCode='US'] - ISO country code (default: 'US')
     * @returns {Promise<boolean>} Whether the phone number is valid
     */
    async isValidPhoneNumber(phone, countryCode = 'US') {
        try {
            const isValid = await this.page.evaluate((phoneNum) => {
                // This is a simplified validation - in a real app, you'd use a library like libphonenumber-js
                const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
                return phoneRegex.test(phoneNum);
            }, phone);
            
            return isValid;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error validating phone number: ${errorMessage}`);
            return false;
        }
    }

    /**
     * Click the Start New Application button
     * @returns {Promise<void>}
     */
    async startNewApplication() {
        await this.page.click(this.selectors.startNewAppButton);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Submit the form
     * @param {'save'|'continue'|'submit'} [action='continue'] - Form submission action
     * @returns {Promise<void>}
     */
    async submitForm(action = 'continue') {
        switch (action.toLowerCase()) {
            case 'save':
                await this.page.click(this.selectors.cancelButton);
                break;
            case 'submit':
                await this.page.click(this.selectors.submitButton);
                break;
            case 'continue':
            default:
                await this.page.click(this.selectors.saveAndContinueButton);
        }
        
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify error message is displayed for a field
     * @param {string} fieldName - Name of the field
     * @param {string} expectedMessage - Expected error message
     * @returns {Promise<boolean>} Whether the error message is displayed and matches
     */
    /**
     * Verify error message is displayed for a field
     * @param {string} fieldName - Name of the field
     * @param {string} expectedMessage - Expected error message
     * @returns {Promise<boolean>} Whether the error message is displayed and matches
     */
    async verifyFieldError(fieldName, expectedMessage) {
        const errorLocator = this.page.locator(this.selectors.fieldErrorMessage(fieldName));
        const isVisible = await errorLocator.isVisible();
        
        if (!isVisible) return false;
        
        const actualMessage = await errorLocator.textContent();
        return actualMessage?.includes(expectedMessage) ?? false;
    }

    /**
     * Verify the application is started successfully
     * @returns {Promise<boolean>} Whether the application was started successfully
     */
    async isApplicationStarted() {
        try {
            await this.page.waitForURL(/.*application/);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = PreAppDashboardPage;
