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
        
        // Define page selectors based on actual ASU dashboard structure
        this.selectors = {
            // Header and Navigation
            pageTitle: 'h1, h2, [role="heading"]',
            welcomeMessage: 'text="Welcome! You\'re a few steps away from becoming a Sun Devil."',
            profileMenu: 'button[aria-label="Profile menu"], button:has-text("Profile")',
            
            // Loading States
            loadingIndicator: '[role="progressbar"], .loading, text="Loading"',
            
            // Personal Information Section (based on actual ASU form screenshot)
            firstNameInput: 'input[placeholder="Enter your legal first name"], input[name="firstName"], input[id*="firstName"], label:has-text("First name") + input',
            preferredFirstNameInput: 'input[placeholder="Enter your preferred first name"], input[name="preferredFirstName"], input[id*="preferred"]',
            middleNameInput: 'input[placeholder="Enter your legal middle name"], input[name="middleName"], input[id*="middle"]',
            lastNameInput: 'input[placeholder="Enter your legal last name"], input[name="lastName"], input[id*="lastName"], label:has-text("Last name") + input',
            suffixSelect: 'select:has(option:text("Please select one")), select[name="suffix"], select[id*="suffix"]',
            
            // Birthday Section (based on actual ASU form screenshot)
            birthdaySection: 'text="Birthday", [aria-label*="Birthday"], label:has-text("Birthday")',
            birthMonthSelect: 'select:has(option:text("Month")), select[name*="month"], select[id*="month"], select[aria-label*="Month"]',
            birthDaySelect: 'select:has(option:text("Day")), select[name*="day"], select[id*="day"], select[aria-label*="Day"]',
            birthYearSelect: 'select:has(option:text("Year")), select[name*="year"], select[id*="year"], select[aria-label*="Year"]',
            dateClearButton: 'button:has-text("Clear"), button[aria-label*="Clear date"]',
            
            // Contact Information (based on actual ASU form screenshot)
            emailInput: 'input[name="email"], input[type="email"], input[placeholder*="email"], input[aria-label*="email"]',
            phoneNumberInput: 'input[placeholder="Enter phone number"], input[name="phoneNumber"], input[type="tel"], input[aria-label*="Phone"]',
            phoneTypeSelect: 'select[name="phoneType"], select[aria-label*="Phone type"]',
            countryCodeSelect: 'select:has(option:text("+1")), select[name="countryCode"], select[aria-label*="Country"]',
            
            // Start New Application Button (based on screenshot)
            startNewAppButton: 'button:has-text("Start new application"), button:has-text("Start New Application"), button:has-text("Start Application")',
            
            // Error Messages (multiple possible patterns)
            errorMessage: '.error-message, .error, [role="alert"], .field-error, .validation-error',
            /**
             * Get selector for a field's error message
             * @param {string} fieldName - The name of the field
             * @returns {string} The CSS selector for the field's error message
             */
            fieldErrorMessage: (fieldName) => `[data-testid="${fieldName}-error"], .${fieldName}-error, [aria-describedby*="${fieldName}"] + .error`,
            
            // Buttons (multiple possible text variations)
            submitButton: 'button[type="submit"], button:has-text("Submit")',
            cancelButton: 'button:has-text("Cancel"), button:has-text("Back")',
            saveAndContinueButton: 'button:has-text("Save & Continue"), button:has-text("Continue"), button:has-text("Next")',
            
            // Modal Dialogs
            confirmationModal: '.modal, .dialog, [role="dialog"]',
            modalConfirmButton: '.modal button:has-text("Confirm"), .modal button:has-text("OK"), .modal button:has-text("Yes")',
            modalCancelButton: '.modal button:has-text("Cancel"), .modal button:has-text("No")'
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
        
        // Wait for loading to complete
        try {
            await this.page.waitForSelector(this.selectors.loadingIndicator, { state: 'hidden', timeout: 30000 });
        } catch (error) {
            // Loading indicator might not be present, continue
            this.logger.warn('Loading indicator not found or did not disappear');
        }
        
        // Check for either welcome message or page title
        try {
            await expect(this.page.locator(this.selectors.welcomeMessage)).toBeVisible({ timeout: 10000 });
        } catch (error) {
            // If welcome message not found, check for any heading
            await expect(this.page.locator(this.selectors.pageTitle).first()).toBeVisible({ timeout: 10000 });
        }
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
        console.log('Starting to fill personal information...');
        
        // Fill First name - try multiple approaches
        await this.fillFieldWithFallbacks('firstName', firstName, [
            this.selectors.firstNameInput,
            'input[placeholder*="First name" i]',
            'input[aria-label*="First name" i]',
            'label:has-text("First name") + input',
            'input[name="firstName"]'
        ]);
        
        // Fill Preferred first name (optional)
        if (preferredFirstName) {
            await this.fillFieldWithFallbacks('preferredFirstName', preferredFirstName, [
                this.selectors.preferredFirstNameInput,
                'input[placeholder*="Preferred" i]',
                'input[aria-label*="Preferred" i]',
                'input[name="preferredFirstName"]'
            ], true);
        }
        
        // Fill Middle name (optional)
        if (middleName) {
            await this.fillFieldWithFallbacks('middleName', middleName, [
                this.selectors.middleNameInput,
                'input[placeholder*="Middle" i]',
                'input[aria-label*="Middle" i]',
                'input[name="middleName"]'
            ], true);
        }
        
        // Fill Last name - try multiple approaches
        await this.fillFieldWithFallbacks('lastName', lastName, [
            this.selectors.lastNameInput,
            'input[placeholder*="Last name" i]',
            'input[aria-label*="Last name" i]',
            'label:has-text("Last name") + input',
            'input[name="lastName"]'
        ]);
        
        // Select suffix (optional)
        if (suffix) {
            await this.selectFieldWithFallbacks('suffix', suffix, [
                this.selectors.suffixSelect,
                'select[aria-label*="Suffix" i]',
                'select:has(option:text("Jr"))',
                'select[name="suffix"]'
            ], true);
        }
        
        console.log('✓ Personal information filling completed');
    }

    /**
     * Helper method to fill a field with multiple fallback selectors
     * @param {string} fieldName - Name of the field for logging
     * @param {string} value - Value to fill
     * @param {string[]} selectors - Array of selectors to try
     * @param {boolean} [optional=false] - Whether the field is optional
     * @returns {Promise<void>}
     */
    async fillFieldWithFallbacks(fieldName, value, selectors, optional = false) {
        for (const selector of selectors) {
            try {
                const field = this.page.locator(selector).first();
                if (await field.count() > 0 && await field.isVisible()) {
                    await field.fill(value);
                    console.log(`✓ Filled ${fieldName}: ${value}`);
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        
        if (!optional) {
            console.log(`❌ Required field ${fieldName} not found with any selector`);
        } else {
            console.log(`⚠️ Optional field ${fieldName} not found, skipping`);
        }
    }

    /**
     * Helper method to select from dropdown with multiple fallback selectors
     * @param {string} fieldName - Name of the field for logging
     * @param {string} value - Value to select
     * @param {string[]} selectors - Array of selectors to try
     * @param {boolean} [optional=false] - Whether the field is optional
     * @returns {Promise<void>}
     */
    async selectFieldWithFallbacks(fieldName, value, selectors, optional = false) {
        for (const selector of selectors) {
            try {
                const field = this.page.locator(selector).first();
                if (await field.count() > 0 && await field.isVisible()) {
                    await field.selectOption({ value: value });
                    console.log(`✓ Selected ${fieldName}: ${value}`);
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        
        if (!optional) {
            console.log(`❌ Required dropdown ${fieldName} not found with any selector`);
        } else {
            console.log(`⚠️ Optional dropdown ${fieldName} not found, skipping`);
        }
    }

    /**
     * Set birthday (ASU uses "Birthday" instead of "Date of Birth")
     * @param {Object} date - Date object with month, day, and year
     * @param {string|number} date.month - Month (1-12 or month name)
     * @param {string|number} date.day - Day (1-31)
     * @param {string|number} date.year - Year (e.g., 1990)
     * @returns {Promise<void>}
     */
    async setDateOfBirth({ month, day, year }) {
        try {
            // Try to clear any existing date first
            const clearButton = this.page.locator(this.selectors.dateClearButton);
            if (await clearButton.count() > 0) {
                await clearButton.click();
            }
        } catch (error) {
            // Clear button might not exist, continue
            this.logger.warn('Clear button not found, continuing with date selection');
        }
        
        // Set month - try multiple selectors
        const monthSelect = this.page.locator(this.selectors.birthMonthSelect).first();
        if (await monthSelect.count() > 0) {
            await monthSelect.selectOption({ value: month.toString() });
        }
        
        // Set day - try multiple selectors
        const daySelect = this.page.locator(this.selectors.birthDaySelect).first();
        if (await daySelect.count() > 0) {
            await daySelect.selectOption({ value: day.toString() });
        }
        
        // Set year - try multiple selectors
        const yearSelect = this.page.locator(this.selectors.birthYearSelect).first();
        if (await yearSelect.count() > 0) {
            await yearSelect.selectOption({ value: year.toString() });
        }
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
     * Set date of birth for age > 24 (Adult category)
     * Uses verified dropdown behavior: click to open, then select by name
     * @returns {Promise<void>}
     */
    async setDateOfBirthForAdult() {
        console.log('Setting date of birth for age > 24 (Adult)...');
        
        try {
            // Generate date for someone aged 25-35
            const age = Math.floor(Math.random() * 11) + 25; // Random age between 25-35
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - age;
            
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = months[Math.floor(Math.random() * 12)];
            const day = Math.floor(Math.random() * 28) + 1; // 1-28
            
            console.log(`Setting birth date: ${monthName} ${day}, ${birthYear} (Age: ${age})`);
            
            // Select Month
            const monthField = this.page.getByRole('combobox', { name: 'Month' });
            await monthField.waitFor({ state: 'visible', timeout: 10000 });
            await monthField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: monthName }).click();
            
            // Select Day
            const dayField = this.page.getByRole('combobox', { name: 'Day' });
            await dayField.waitFor({ state: 'visible', timeout: 10000 });
            await dayField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: day.toString() }).click();
            
            // Select Year
            const yearField = this.page.getByRole('combobox', { name: 'Year' });
            await yearField.waitFor({ state: 'visible', timeout: 10000 });
            await yearField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: birthYear.toString() }).click();
            
            console.log(`✓ Adult date of birth set: ${monthName} ${day}, ${birthYear}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`⚠️ Failed to set adult date of birth: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Set date of birth for age between 18-24 (Young Adult category)
     * Uses verified dropdown behavior: click to open, then select by name
     * @returns {Promise<void>}
     */
    async setDateOfBirthForYoungAdult() {
        console.log('Setting date of birth for age 18-24 (Young Adult)...');
        
        try {
            // Generate date for someone aged 18-24
            const age = Math.floor(Math.random() * 7) + 18; // Random age between 18-24
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - age;
            
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = months[Math.floor(Math.random() * 12)];
            const day = Math.floor(Math.random() * 28) + 1; // 1-28
            
            console.log(`Setting birth date: ${monthName} ${day}, ${birthYear} (Age: ${age})`);
            
            // Select Month
            const monthField = this.page.getByRole('combobox', { name: 'Month' });
            await monthField.waitFor({ state: 'visible', timeout: 10000 });
            await monthField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: monthName }).click();
            
            // Select Day
            const dayField = this.page.getByRole('combobox', { name: 'Day' });
            await dayField.waitFor({ state: 'visible', timeout: 10000 });
            await dayField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: day.toString() }).click();
            
            // Select Year
            const yearField = this.page.getByRole('combobox', { name: 'Year' });
            await yearField.waitFor({ state: 'visible', timeout: 10000 });
            await yearField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: birthYear.toString() }).click();
            
            console.log(`✓ Young Adult date of birth set: ${monthName} ${day}, ${birthYear}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`⚠️ Failed to set young adult date of birth: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Set date of birth for exactly age 18 (Exactly 18 category)
     * Uses verified dropdown behavior: click to open, then select by name
     * @returns {Promise<void>}
     */
    async setDateOfBirthForExactly18() {
        console.log('Setting date of birth for exactly age 18...');
        
        try {
            // Generate date for someone exactly 18 years old
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - 18;
            
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = months[Math.floor(Math.random() * 12)];
            const day = Math.floor(Math.random() * 28) + 1; // 1-28
            
            console.log(`Setting birth date: ${monthName} ${day}, ${birthYear} (Age: 18)`);
            
            // Select Month
            const monthField = this.page.getByRole('combobox', { name: 'Month' });
            await monthField.waitFor({ state: 'visible', timeout: 10000 });
            await monthField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: monthName }).click();
            
            // Select Day
            const dayField = this.page.getByRole('combobox', { name: 'Day' });
            await dayField.waitFor({ state: 'visible', timeout: 10000 });
            await dayField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: day.toString() }).click();
            
            // Select Year
            const yearField = this.page.getByRole('combobox', { name: 'Year' });
            await yearField.waitFor({ state: 'visible', timeout: 10000 });
            await yearField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: birthYear.toString() }).click();
            
            console.log(`✓ Exactly 18 date of birth set: ${monthName} ${day}, ${birthYear}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`⚠️ Failed to set exactly 18 date of birth: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Set date of birth for age < 18 (Minor category)
     * Uses verified dropdown behavior: click to open, then select by name
     * @returns {Promise<void>}
     */
    async setDateOfBirthForMinor() {
        console.log('Setting date of birth for age < 18 (Minor)...');
        
        try {
            // Generate date for someone aged 16-17
            const age = Math.floor(Math.random() * 2) + 16; // Random age between 16-17
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - age;
            
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = months[Math.floor(Math.random() * 12)];
            const day = Math.floor(Math.random() * 28) + 1; // 1-28
            
            console.log(`Setting birth date: ${monthName} ${day}, ${birthYear} (Age: ${age})`);
            
            // Select Month
            const monthField = this.page.getByRole('combobox', { name: 'Month' });
            await monthField.waitFor({ state: 'visible', timeout: 10000 });
            await monthField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: monthName }).click();
            
            // Select Day
            const dayField = this.page.getByRole('combobox', { name: 'Day' });
            await dayField.waitFor({ state: 'visible', timeout: 10000 });
            await dayField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: day.toString() }).click();
            
            // Select Year
            const yearField = this.page.getByRole('combobox', { name: 'Year' });
            await yearField.waitFor({ state: 'visible', timeout: 10000 });
            await yearField.click();
            await this.page.waitForTimeout(1000);
            await this.page.getByRole('option', { name: birthYear.toString() }).click();
            
            console.log(`✓ Minor date of birth set: ${monthName} ${day}, ${birthYear}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`⚠️ Failed to set minor date of birth: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fill in contact information
     * @param {Object} contactInfo - Contact information
     * @param {string} contactInfo.email - Email address
     * @param {string} contactInfo.phoneNumber - US Phone number (digits only)
     * @param {string} [contactInfo.phoneType] - Phone type (e.g., 'Mobile', 'Home', 'Work')
     * @param {string} [contactInfo.countryCode] - Country code (e.g., '+1' for US)
     * @returns {Promise<void>}
     */
    async fillContactInformation({ email, phoneNumber, phoneType = 'Mobile', countryCode = '+1' }) {
        // Fill email
        const emailField = this.page.locator(this.selectors.emailInput).first();
        if (await emailField.count() > 0) {
            await emailField.fill(email);
            this.logger.info(`Filled email: ${email}`);
        } else {
            this.logger.warn('Email field not found');
        }
        
        // Fill US Phone number
        const phoneField = this.page.locator(this.selectors.phoneNumberInput).first();
        if (await phoneField.count() > 0) {
            await phoneField.fill(phoneNumber);
            this.logger.info(`Filled US phone number: ${phoneNumber}`);
        } else {
            this.logger.warn('US Phone number field not found');
        }
        
        // Select country code if available
        if (countryCode) {
            const countryField = this.page.locator(this.selectors.countryCodeSelect).first();
            if (await countryField.count() > 0) {
                await countryField.selectOption({ value: countryCode });
                this.logger.info(`Selected country code: ${countryCode}`);
            }
        }
        
        // Select phone type if available
        if (phoneType) {
            const phoneTypeField = this.page.locator(this.selectors.phoneTypeSelect).first();
            if (await phoneTypeField.count() > 0) {
                await phoneTypeField.selectOption({ label: phoneType });
                this.logger.info(`Selected phone type: ${phoneType}`);
            }
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
        // Wait for loading to complete first
        try {
            await this.page.waitForSelector(this.selectors.loadingIndicator, { state: 'hidden', timeout: 30000 });
        } catch (error) {
            this.logger.warn('Loading indicator not found or did not disappear');
        }
        
        // Try to find and click the start application button
        const startButton = this.page.locator(this.selectors.startNewAppButton);
        const alternativeButton = this.page.locator('button').filter({ hasText: /start|begin|application/i });
        
        if (await startButton.count() > 0) {
            this.logger.info('Clicking Start New Application button');
            await startButton.first().click();
        } else if (await alternativeButton.count() > 0) {
            this.logger.info('Clicking alternative application button');
            await alternativeButton.first().click();
        } else {
            throw new Error('No Start Application button found on the page');
        }
        
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000); // Additional wait for form to load
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
