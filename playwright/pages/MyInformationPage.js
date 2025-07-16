// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for My Information related actions
 */
class MyInformationPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'MyInformationPage');
        
        // Define page selectors
        this.selectors = {
            // Page header and navigation
            pageTitle: 'h1',
            
            // Personal Information Section
            firstNameInput: 'input[name="firstName"]',
            middleNameInput: 'input[name="middleName"]',
            lastNameInput: 'input[name="lastName"]',
            suffixSelect: 'select[name="suffix"]',
            
            // Former Names Section
            addFormerNameBtn: 'button:has-text("Add Former Name")',
            formerNameInput: 'input[name="formerName"]',
            saveFormerNameBtn: 'button:has-text("Save")',
            cancelFormerNameBtn: 'button:has-text("Cancel")',
            editFormerNameBtn: (name) => `button[aria-label="Edit ${name}"]`,
            deleteFormerNameBtn: (name) => `button[aria-label="Delete ${name}"]`,
            formerNameItem: (name) => `div.former-name-item:has-text("${name}")`,
            
            // Legal Sex Section
            legalSexSelect: 'select[name="legalSex"]',
            
            // Primary Language Section
            primaryLanguageSelect: 'select[name="primaryLanguage"]',
            
            // Contact Information Section
            emailInput: 'input[name="email"]',
            phoneNumberInput: 'input[name="phoneNumber"]',
            phoneTypeSelect: 'select[name="phoneType"]',
            
            // Address Section
            addressLine1Input: 'input[name="addressLine1"]',
            addressLine2Input: 'input[name="addressLine2"]',
            cityInput: 'input[name="city"]',
            stateSelect: 'select[name="state"]',
            zipCodeInput: 'input[name="zipCode"]',
            countrySelect: 'select[name="country"]',
            
            // Ethnicity and Background Section
            ethnicitySelect: 'select[name="ethnicity"]',
            raceCheckbox: (race) => `input[name="${race}"]`,
            
            // Citizenship Section
            citizenshipStatusSelect: 'select[name="citizenshipStatus"]',
            visaTypeSelect: 'select[name="visaType"]',
            
            // Military Service Section
            militaryAffiliationSelect: 'select[name="militaryAffiliation"]',
            branchOfServiceSelect: 'select[name="branchOfService"]',
            
            // Form Actions
            saveBtn: 'button:has-text("Save")',
            saveAndContinueBtn: 'button:has-text("Save & Continue")',
            cancelBtn: 'button:has-text("Cancel")',
            
            // Error Messages
            fieldError: (fieldName) => `[data-testid="${fieldName}-error"]`,
            formError: '.form-error-message',
            
            // Success Message
            successMessage: '.success-message'
        };
    }
    
    /**
     * Navigate to the My Information page
     * @returns {Promise<void>}
     */
    async navigateToMyInformation() {
        await this.page.goto('/my-information');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the My Information page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*my-information/);
        await expect(this.page.locator(this.selectors.pageTitle)).toContainText('My Information');
    }
    
    /**
     * Fill in personal information
     * @param {Object} personalInfo - Personal information object
     * @param {string} [personalInfo.firstName] - First name
     * @param {string} [personalInfo.middleName] - Middle name
     * @param {string} [personalInfo.lastName] - Last name
     * @param {string} [personalInfo.suffix] - Name suffix
     * @returns {Promise<void>}
     */
    async fillPersonalInformation({ firstName, middleName, lastName, suffix }) {
        if (firstName) {
            await this.page.fill(this.selectors.firstNameInput, firstName);
        }
        
        if (middleName) {
            await this.page.fill(this.selectors.middleNameInput, middleName);
        }
        
        if (lastName) {
            await this.page.fill(this.selectors.lastNameInput, lastName);
        }
        
        if (suffix) {
            await this.page.selectOption(this.selectors.suffixSelect, { value: suffix });
        }
    }
    
    /**
     * Add a former name
     * @param {string} formerName - The former name to add
     * @returns {Promise<void>}
     */
    async addFormerName(formerName) {
        await this.page.click(this.selectors.addFormerNameBtn);
        await this.page.fill(this.selectors.formerNameInput, formerName);
        await this.page.click(this.selectors.saveFormerNameBtn);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Edit an existing former name
     * @param {string} oldName - The current former name
     * @param {string} newName - The new former name
     * @returns {Promise<void>}
     */
    async editFormerName(oldName, newName) {
        await this.page.click(this.selectors.editFormerNameBtn(oldName));
        await this.page.fill(this.selectors.formerNameInput, newName);
        await this.page.click(this.selectors.saveFormerNameBtn);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Delete a former name
     * @param {string} name - The former name to delete
     * @returns {Promise<void>}
     */
    async deleteFormerName(name) {
        await this.page.click(this.selectors.deleteFormerNameBtn(name));
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Verify a former name is displayed
     * @param {string} name - The former name to verify
     * @returns {Promise<boolean>} Whether the former name is displayed
     */
    async isFormerNameDisplayed(name) {
        return await this.page.isVisible(this.selectors.formerNameItem(name));
    }
    
    /**
     * Select legal sex
     * @param {string} sex - The legal sex to select
     * @returns {Promise<void>}
     */
    async selectLegalSex(sex) {
        await this.page.selectOption(this.selectors.legalSexSelect, { value: sex });
    }
    
    /**
     * Select primary language
     * @param {string} language - The language to select
     * @returns {Promise<void>}
     */
    async selectPrimaryLanguage(language) {
        await this.page.selectOption(this.selectors.primaryLanguageSelect, { value: language });
    }
    
    /**
     * Fill in contact information
     * @param {Object} contactInfo - Contact information object
     * @param {string} [contactInfo.email] - Email address
     * @param {string} [contactInfo.phoneNumber] - Phone number
     * @param {string} [contactInfo.phoneType] - Phone type (e.g., 'Mobile', 'Home')
     * @returns {Promise<void>}
     */
    async fillContactInformation({ email, phoneNumber, phoneType }) {
        if (email) {
            await this.page.fill(this.selectors.emailInput, email);
        }
        
        if (phoneNumber) {
            await this.page.fill(this.selectors.phoneNumberInput, phoneNumber);
        }
        
        if (phoneType) {
            await this.page.selectOption(this.selectors.phoneTypeSelect, { label: phoneType });
        }
    }
    
    /**
     * Fill in address information
     * @param {Object} address - Address information object
     * @param {string} [address.line1] - Address line 1
     * @param {string} [address.line2] - Address line 2 (optional)
     * @param {string} [address.city] - City
     * @param {string} [address.state] - State/Province
     * @param {string} [address.zipCode] - ZIP/Postal code
     * @param {string} [address.country] - Country
     * @returns {Promise<void>}
     */
    async fillAddressInformation({ line1, line2, city, state, zipCode, country }) {
        if (line1) await this.page.fill(this.selectors.addressLine1Input, line1);
        if (line2) await this.page.fill(this.selectors.addressLine2Input, line2);
        if (city) await this.page.fill(this.selectors.cityInput, city);
        if (state) await this.page.selectOption(this.selectors.stateSelect, { value: state });
        if (zipCode) await this.page.fill(this.selectors.zipCodeInput, zipCode);
        if (country) await this.page.selectOption(this.selectors.countrySelect, { value: country });
    }
    
    /**
     * Select ethnicity and race
     * @param {Object} options - Ethnicity and race options
     * @param {string} [options.ethnicity] - Ethnicity value
     * @param {string[]} [options.races] - Array of race values
     * @returns {Promise<void>}
     */
    async selectEthnicityAndRace({ ethnicity, races = [] }) {
        if (ethnicity) {
            await this.page.selectOption(this.selectors.ethnicitySelect, { value: ethnicity });
        }
        
        // Uncheck all race checkboxes first
        const raceCheckboxes = await this.page.$$('input[type="checkbox"][name^="race"]');
        for (const checkbox of raceCheckboxes) {
            if (await checkbox.isChecked()) {
                await checkbox.uncheck();
            }
        }
        
        // Check the specified races
        for (const race of races) {
            await this.page.check(this.selectors.raceCheckbox(race));
        }
    }
    
    /**
     * Select citizenship status
     * @param {Object} options - Citizenship options
     * @param {string} options.status - Citizenship status (e.g., 'US_CITIZEN', 'PERMANENT_RESIDENT')
     * @param {string} [options.visaType] - Visa type (if applicable)
     * @returns {Promise<void>}
     */
    async selectCitizenshipStatus({ status, visaType }) {
        await this.page.selectOption(this.selectors.citizenshipStatusSelect, { value: status });
        
        if (visaType) {
            await this.page.selectOption(this.selectors.visaTypeSelect, { value: visaType });
        }
    }
    
    /**
     * Select military affiliation
     * @param {Object} options - Military affiliation options
     * @param {string} options.affiliation - Military affiliation (e.g., 'ACTIVE_DUTY', 'VETERAN', 'NONE')
     * @param {string} [options.branch] - Branch of service (if applicable)
     * @returns {Promise<void>}
     */
    async selectMilitaryAffiliation({ affiliation, branch }) {
        await this.page.selectOption(this.selectors.militaryAffiliationSelect, { value: affiliation });
        
        if (branch) {
            await this.page.selectOption(this.selectors.branchOfServiceSelect, { value: branch });
        }
    }
    
    /**
     * Save the form
     * @param {'save'|'continue'} [action='save'] - The save action to perform
     * @returns {Promise<void>}
     */
    async saveForm(action = 'save') {
        if (action === 'continue') {
            await this.page.click(this.selectors.saveAndContinueBtn);
        } else {
            await this.page.click(this.selectors.saveBtn);
        }
        
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Verify field error message
     * @param {string} fieldName - The name of the field
     * @param {string} expectedMessage - The expected error message
     * @returns {Promise<boolean>} Whether the error message matches
     */
    async verifyFieldError(fieldName, expectedMessage) {
        const errorLocator = this.page.locator(this.selectors.fieldError(fieldName));
        const isVisible = await errorLocator.isVisible();
        
        if (!isVisible) return false;
        
        const actualMessage = await errorLocator.textContent();
        return actualMessage.includes(expectedMessage);
    }
    
    /**
     * Verify form was saved successfully
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async isSaveSuccessful() {
        try {
            await this.page.waitForSelector(this.selectors.successMessage, { timeout: 5000 });
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = MyInformationPage;
