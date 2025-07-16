// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for SHIM (Student Housing Information Management) functionality
 */
class SHIMPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'SHIMPage');
        
        // Define page selectors
        this.selectors = {
            // Email section
            emailInput: 'input[type="email"]',
            emailSubmitButton: 'button:has-text("Submit")',
            
            // Mode of Learning (MOL) options
            immersionRadioButton: 'input[type="radio"][value="immersion"]',
            onlineRadioButton: 'input[type="radio"][value="online"]',
            
            // Degree options
            degreeRadioButton: 'input[type="radio"][value="degree"]',
            nonDegreeRadioButton: 'input[type="radio"][value="nondegree"]',
            
            // Starbucks partner option
            starbucksPartnerCheckbox: 'input[type="checkbox"][name="starbucksPartner"]',
            
            // Navigation
            nextButton: 'button:has-text("Next")',
            backButton: 'button:has-text("Back")',
            
            // Error messages
            errorMessage: '.error-message',
            validationError: '.validation-error',
            
            // Confirmation
            confirmationMessage: '.confirmation-message'
        };
    }
    
    /**
     * Navigate to the SHIM page
     * @returns {Promise<void>}
     */
    async navigateToSHIMPage() {
        await this.page.goto('/shim');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the SHIM page is loaded
     * @returns {Promise<boolean>} Whether the page is loaded
     */
    async verifyPageLoaded() {
        try {
            await this.page.waitForSelector(this.selectors.emailInput, { state: 'visible' });
            return true;
        } catch (error) {
            console.error('Error loading SHIM page:', error);
            return false;
        }
    }
    
    /**
     * Enter email and submit the form
     * @param {string} email - The email to enter
     * @returns {Promise<boolean>} Whether the email was submitted successfully
     */
    async submitEmail(email) {
        try {
            // Generate a random email if none provided
            const emailToUse = email || this.generateRandomEmail();
            
            // Scroll to and fill the email input
            await this.scrollToElement(this.selectors.emailInput);
            await this.page.fill(this.selectors.emailInput, emailToUse);
            
            // Click the submit button
            await this.page.click(this.selectors.emailSubmitButton);
            
            // Wait for navigation or next step
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're on the next step
            const isNextStepVisible = await this.page.isVisible(this.selectors.immersionRadioButton);
            return isNextStepVisible;
        } catch (error) {
            console.error('Error submitting email:', error);
            return false;
        }
    }
    
    /**
     * Generate a random email for testing
     * @returns {string} A random email address
     */
    generateRandomEmail() {
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        return `${randomNumber}@test.asu.edu`;
    }
    
    /**
     * Select the immersion (in-person) mode of learning
     * @returns {Promise<boolean>} Whether the selection was successful
     */
    async selectImmersionMOL() {
        try {
            await this.scrollToElement(this.selectors.immersionRadioButton);
            await this.page.check(this.selectors.immersionRadioButton);
            
            // Verify the radio button is checked
            const isChecked = await this.page.isChecked(this.selectors.immersionRadioButton);
            return isChecked;
        } catch (error) {
            console.error('Error selecting immersion MOL:', error);
            return false;
        }
    }
    
    /**
     * Select the online mode of learning
     * @returns {Promise<boolean>} Whether the selection was successful
     */
    async selectOnlineMOL() {
        try {
            await this.scrollToElement(this.selectors.onlineRadioButton);
            await this.page.check(this.selectors.onlineRadioButton);
            
            // Verify the radio button is checked
            const isChecked = await this.page.isChecked(this.selectors.onlineRadioButton);
            return isChecked;
        } catch (error) {
            console.error('Error selecting online MOL:', error);
            return false;
        }
    }
    
    /**
     * Select the degree-seeking option
     * @returns {Promise<boolean>} Whether the selection was successful
     */
    async selectDegreeOption() {
        try {
            await this.scrollToElement(this.selectors.degreeRadioButton);
            await this.page.check(this.selectors.degreeRadioButton);
            
            // Verify the radio button is checked
            const isChecked = await this.page.isChecked(this.selectors.degreeRadioButton);
            return isChecked;
        } catch (error) {
            console.error('Error selecting degree option:', error);
            return false;
        }
    }
    
    /**
     * Select the non-degree option
     * @returns {Promise<boolean>} Whether the selection was successful
     */
    async selectNonDegreeOption() {
        try {
            await this.scrollToElement(this.selectors.nonDegreeRadioButton);
            await this.page.check(this.selectors.nonDegreeRadioButton);
            
            // Verify the radio button is checked
            const isChecked = await this.page.isChecked(this.selectors.nonDegreeRadioButton);
            return isChecked;
        } catch (error) {
            console.error('Error selecting non-degree option:', error);
            return false;
        }
    }
    
    /**
     * Toggle the Starbucks partner checkbox
     * @param {boolean} check - Whether to check or uncheck the box
     * @returns {Promise<boolean>} Whether the action was successful
     */
    async toggleStarbucksPartner(check = true) {
        try {
            await this.scrollToElement(this.selectors.starbucksPartnerCheckbox);
            
            if (check) {
                await this.page.check(this.selectors.starbucksPartnerCheckbox);
            } else {
                await this.page.uncheck(this.selectors.starbucksPartnerCheckbox);
            }
            
            // Verify the checkbox state
            const isChecked = await this.page.isChecked(this.selectors.starbucksPartnerCheckbox);
            return check ? isChecked : !isChecked;
        } catch (error) {
            console.error('Error toggling Starbucks partner checkbox:', error);
            return false;
        }
    }
    
    /**
     * Click the Next button
     * @returns {Promise<boolean>} Whether the navigation was successful
     */
    async clickNext() {
        try {
            await this.scrollToElement(this.selectors.nextButton);
            await this.page.click(this.selectors.nextButton);
            
            // Wait for navigation or next step
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're on the next step or the expected page
            return true;
        } catch (error) {
            console.error('Error clicking Next button:', error);
            return false;
        }
    }
    
    /**
     * Click the Back button
     * @returns {Promise<boolean>} Whether the navigation was successful
     */
    async clickBack() {
        try {
            await this.scrollToElement(this.selectors.backButton);
            await this.page.click(this.selectors.backButton);
            
            // Wait for navigation or previous step
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're on the previous step or the expected page
            return true;
        } catch (error) {
            console.error('Error clicking Back button:', error);
            return false;
        }
    }
    
    /**
     * Complete the SHIM flow with the provided options
     * @param {Object} options - The options for completing the SHIM flow
     * @param {string} [options.email] - The email to use (random if not provided)
     * @param {'immersion'|'online'} options.modeOfLearning - The mode of learning
     * @param {'degree'|'nondegree'} options.studentType - The student type
     * @param {boolean} [options.isStarbucksPartner=false] - Whether the user is a Starbucks partner
     * @returns {Promise<boolean>} Whether the flow was completed successfully
     */
    async completeSHIMFlow(options) {
        try {
            // Step 1: Submit email
            const emailSubmitted = await this.submitEmail(options.email);
            if (!emailSubmitted) return false;
            
            // Step 2: Select mode of learning
            const molSelected = options.modeOfLearning === 'immersion' 
                ? await this.selectImmersionMOL() 
                : await this.selectOnlineMOL();
            if (!molSelected) return false;
            
            // Click Next to proceed
            const nextClicked = await this.clickNext();
            if (!nextClicked) return false;
            
            // Step 3: Select student type
            const typeSelected = options.studentType === 'degree'
                ? await this.selectDegreeOption()
                : await this.selectNonDegreeOption();
            if (!typeSelected) return false;
            
            // Step 4: Toggle Starbucks partner if needed
            if (options.isStarbucksPartner) {
                const toggled = await this.toggleStarbucksPartner(true);
                if (!toggled) return false;
            }
            
            // Click Next to complete the flow
            return await this.clickNext();
        } catch (error) {
            console.error('Error completing SHIM flow:', error);
            return false;
        }
    }
    
    /**
     * Verify if there are any validation errors on the page
     * @returns {Promise<boolean>} Whether there are any validation errors
     */
    async hasValidationErrors() {
        try {
            const errorCount = await this.page.locator(this.selectors.errorMessage).count();
            const validationErrorCount = await this.page.locator(this.selectors.validationError).count();
            
            return (errorCount + validationErrorCount) > 0;
        } catch (error) {
            console.error('Error checking for validation errors:', error);
            return false;
        }
    }
    
    /**
     * Verify if the confirmation message is displayed
     * @returns {Promise<boolean>} Whether the confirmation message is visible
     */
    async isConfirmationDisplayed() {
        try {
            return await this.page.isVisible(this.selectors.confirmationMessage);
        } catch (error) {
            console.error('Error checking confirmation message:', error);
            return false;
        }
    }
}

module.exports = SHIMPage;
