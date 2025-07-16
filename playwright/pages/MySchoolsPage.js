// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for My Schools related actions
 */
class MySchoolsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'MySchoolsPage');
        
        // Define page selectors
        this.selectors = {
            // Page header and navigation
            pageTitle: 'h1',
            
            // School Information Section
            schoolInfoSection: '.school-information',
            addSchoolButton: 'button:has-text("Add School")',
            
            // School Form
            schoolForm: '.school-form',
            countryDropdown: 'select[name="country"]',
            stateDropdown: 'select[name="state"]',
            cityDropdown: 'select[name="city"]',
            schoolNameInput: 'input[name="schoolName"]',
            schoolSearchInput: 'input[placeholder="Search for a school..."]',
            schoolSearchResults: '.school-search-results',
            schoolSearchResultItem: '.school-result-item',
            schoolSAISInput: 'input[name="saisNumber"]',
            graduationDateMonth: 'select[name="graduationMonth"]',
            graduationDateYear: 'select[name="graduationYear"]',
            isGraduatedCheckbox: 'input[name="isGraduated"]',
            
            // School List
            schoolList: '.school-list',
            schoolListItem: '.school-list-item',
            schoolName: '.school-name',
            schoolLocation: '.school-location',
            schoolGraduationDate: '.graduation-date',
            editSchoolButton: 'button:has-text("Edit")',
            removeSchoolButton: 'button:has-text("Remove")',
            
            // Confirmation Modal
            confirmationModal: '.confirmation-modal',
            confirmButton: 'button:has-text("Confirm")',
            cancelButton: 'button:has-text("Cancel")',
            
            // Form Actions
            saveButton: 'button:has-text("Save")',
            saveAndContinueButton: 'button:has-text("Save & Continue")',
            
            // Error Messages
            errorMessage: '.error-message',
            validationError: '.validation-error',
            
            // Recent High School Section
            recentHighSchoolSection: '.recent-high-school',
            recentHighSchoolName: '.recent-high-school-name',
            recentHighSchoolLocation: '.recent-high-school-location',
            editRecentHighSchoolButton: 'button:has-text("Edit High School")'
        };
    }
    
    /**
     * Navigate to the My Schools page
     * @returns {Promise<void>}
     */
    async navigateToMySchools() {
        await this.page.goto('/my-schools');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the My Schools page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*my-schools/);
        await expect(this.page.locator(this.selectors.pageTitle))
            .toContainText('My Schools');
    }
    
    /**
     * Validate the My Schools page content
     * @returns {Promise<boolean>} Whether the page content is valid
     */
    async validateMySchools() {
        try {
            await this.page.waitForSelector(this.selectors.schoolInfoSection, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.addSchoolButton, { state: 'visible' });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Select a random high school country
     * @returns {Promise<string>} The selected country
     */
    async selectRandomHighSchoolCountry() {
        // Click the add school button
        await this.page.click(this.selectors.addSchoolButton);
        
        // Wait for the country dropdown to be visible
        await this.page.waitForSelector(this.selectors.countryDropdown, { state: 'visible' });
        
        // Get all country options
        const countryOptions = await this.page.$$eval(
            `${this.selectors.countryDropdown} option:not([value=""])`,
            options => options.map(option => ({
                value: option.value,
                text: option.textContent.trim()
            }))
        );
        
        // Select a random country
        const randomIndex = Math.floor(Math.random() * countryOptions.length);
        const selectedCountry = countryOptions[randomIndex];
        
        // Select the country
        await this.page.selectOption(this.selectors.countryDropdown, selectedCountry.value);
        
        // Wait for any dependent fields to load
        await this.page.waitForLoadState('networkidle');
        
        return selectedCountry.text;
    }
    
    /**
     * Add a graduating school
     * @param {Object} schoolData - School data
     * @param {string} schoolData.state - School state
     * @param {string} schoolData.city - School city
     * @param {string} schoolData.name - School name
     * @param {string} schoolData.saisNumber - School SAIS number
     * @returns {Promise<void>}
     */
    async addGraduatingSchool({ state, city, name, saisNumber }) {
        // Click the add school button
        await this.page.click(this.selectors.addSchoolButton);
        
        // Fill in school details
        await this.page.selectOption(this.selectors.stateDropdown, state);
        await this.page.waitForLoadState('networkidle');
        
        await this.page.selectOption(this.selectors.cityDropdown, city);
        await this.page.waitForLoadState('networkidle');
        
        // Search for the school
        await this.page.fill(this.selectors.schoolSearchInput, name);
        await this.page.waitForSelector(this.selectors.schoolSearchResults, { state: 'visible' });
        
        // Select the first matching school
        await this.page.click(this.selectors.schoolSearchResultItem + ':first-child');
        
        // Fill in SAIS number if provided
        if (saisNumber) {
            await this.page.fill(this.selectors.schoolSAISInput, saisNumber);
        }
        
        // Set graduation date (default to next year)
        const nextYear = new Date().getFullYear() + 1;
        await this.page.selectOption(this.selectors.graduationDateMonth, '5'); // May
        await this.page.selectOption(this.selectors.graduationDateYear, nextYear.toString());
        
        // Save the school
        await this.page.click(this.selectors.saveButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Validate a graduating school was added
     * @param {Object} schoolData - Expected school data
     * @param {string} schoolData.state - Expected school state
     * @param {string} schoolData.city - Expected school city
     * @param {string} schoolData.name - Expected school name
     * @param {string} schoolData.saisNumber - Expected school SAIS number
     * @returns {Promise<boolean>} Whether the school was validated successfully
     */
    async validateGraduatingSchool({ state, city, name, saisNumber }) {
        try {
            // Find the school in the list
            const schoolItems = await this.page.$$(this.selectors.schoolListItem);
            
            for (const schoolItem of schoolItems) {
                const schoolName = await schoolItem.$(this.selectors.schoolName);
                const schoolLocation = await schoolItem.$(this.selectors.schoolLocation);
                
                if (schoolName && schoolLocation) {
                    const schoolNameText = await schoolName.textContent();
                    const schoolLocationText = await schoolLocation.textContent();
                    
                    if (schoolNameText.includes(name) && 
                        schoolLocationText.includes(city) && 
                        schoolLocationText.includes(state)) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error validating graduating school:', error);
            return false;
        }
    }
    
    /**
     * Edit a school
     * @param {string} currentName - Current school name
     * @param {Object} updates - Updated school data
     * @returns {Promise<boolean>} Whether the edit was successful
     */
    async editSchool(currentName, updates) {
        try {
            // Find the school in the list
            const schoolItems = await this.page.$$(this.selectors.schoolListItem);
            
            for (const [index, schoolItem] of schoolItems.entries()) {
                const schoolName = await schoolItem.$(this.selectors.schoolName);
                
                if (schoolName) {
                    const schoolNameText = await schoolName.textContent();
                    
                    if (schoolNameText.includes(currentName)) {
                        // Click the edit button for this school
                        const editButton = await schoolItem.$(this.selectors.editSchoolButton);
                        if (editButton) {
                            await editButton.click();
                            
                            // Wait for the form to load
                            await this.page.waitForSelector(this.selectors.schoolForm, { state: 'visible' });
                            
                            // Update fields if provided
                            if (updates.name) {
                                await this.page.fill(this.selectors.schoolSearchInput, updates.name);
                                await this.page.waitForSelector(this.selectors.schoolSearchResults, { state: 'visible' });
                                await this.page.click(this.selectors.schoolSearchResultItem + ':first-child');
                            }
                            
                            if (updates.saisNumber) {
                                await this.page.fill(this.selectors.schoolSAISInput, updates.saisNumber);
                            }
                            
                            // Save the changes
                            await this.page.click(this.selectors.saveButton);
                            await this.page.waitForLoadState('networkidle');
                            
                            return true;
                        }
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error editing school:', error);
            return false;
        }
    }
    
    /**
     * Remove a school
     * @param {string} schoolName - Name of the school to remove
     * @returns {Promise<boolean>} Whether the removal was successful
     */
    async removeSchool(schoolName) {
        try {
            // Find the school in the list
            const schoolItems = await this.page.$$(this.selectors.schoolListItem);
            
            for (const [index, schoolItem] of schoolItems.entries()) {
                const nameElement = await schoolItem.$(this.selectors.schoolName);
                
                if (nameElement) {
                    const nameText = await nameElement.textContent();
                    
                    if (nameText.includes(schoolName)) {
                        // Click the remove button for this school
                        const removeButton = await schoolItem.$(this.selectors.removeSchoolButton);
                        if (removeButton) {
                            await removeButton.click();
                            
                            // Confirm removal in the modal
                            await this.page.waitForSelector(this.selectors.confirmationModal, { state: 'visible' });
                            await this.page.click(this.selectors.confirmButton);
                            await this.page.waitForLoadState('networkidle');
                            
                            return true;
                        }
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error removing school:', error);
            return false;
        }
    }
    
    /**
     * Save and continue to the next section
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.page.click(this.selectors.saveAndContinueButton);
        await this.page.waitForLoadState('networkidle');
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

module.exports = MySchoolsPage;
