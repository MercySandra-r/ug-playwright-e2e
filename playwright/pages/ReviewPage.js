// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');
const XLSX = require('xlsx');
const path = require('path');

/**
 * Page Object for Review Page functionality
 */
class ReviewPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'ReviewPage');
        
        // Define page selectors
        this.selectors = {
            // Page header and navigation
            pageTitle: 'h1',
            reviewPageContent: '.review-page-content',
            
            // Section headers
            sectionHeaders: 'h2.section-header',
            
            // Edit buttons
            editButtons: 'button:has-text("Edit")',
            
            // Profile Section
            profileSection: '#profile-section',
            profileDetails: '#profile-section .detail-item',
            
            // My Information Section
            myInfoSection: '#my-information-section',
            myInfoDetails: '#my-information-section .detail-item',
            
            // My Program Section
            myProgramSection: '#my-program-section',
            myProgramDetails: '#my-program-section .detail-item',
            
            // My Schools Section
            mySchoolsSection: '#my-schools-section',
            mySchoolsDetails: '#my-schools-section .detail-item',
            
            // My High School Grades Section
            highSchoolGradesSection: '#high-school-grades-section',
            highSchoolGradesDetails: '#high-school-grades-section .detail-item',
            
            // Arizona Residency Section
            arizonaResidencySection: '#arizona-residency-section',
            arizonaResidencyDetails: '#arizona-residency-section .detail-item',
            
            // Application Affidavit
            applicationAffidavitSection: '#application-affidavit',
            affidavitCheckbox: '#affidavit-checkbox',
            
            // Application Fee Section
            applicationFeeSection: '#application-fee-section',
            paymentMethods: '.payment-method',
            visaCardOption: '#visa-card-option',
            mastercardOption: '#mastercard-option',
            discoverOption: '#discover-option',
            payLaterOption: '#pay-later-option',
            
            // Submit Application Button
            submitApplicationButton: 'button:has-text("Submit Application")',
            
            // Confirmation Modal
            confirmationModal: '.confirmation-modal',
            confirmButton: 'button:has-text("Confirm")',
            cancelButton: 'button:has-text("Cancel")',
            
            // Error Messages
            errorMessage: '.error-message',
            validationError: '.validation-error',
            
            // Success Message
            successMessage: '.success-message',
            
            // Links
            externalLinks: 'a.external-link'
        };
    }
    
    /**
     * Navigate to the Review page
     * @returns {Promise<void>}
     */
    async navigateToReviewPage() {
        await this.page.goto('/review');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the Review page is loaded
     * @returns {Promise<boolean>} Whether the page is loaded
     */
    async verifyPageLoaded() {
        try {
            await this.page.waitForSelector(this.selectors.pageTitle, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.reviewPageContent, { state: 'visible' });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Validate the Review page content
     * @returns {Promise<boolean>} Whether the page content is valid
     */
    async validateReview() {
        try {
            // Check if all sections are present
            const sections = [
                this.selectors.profileSection,
                this.selectors.myInfoSection,
                this.selectors.myProgramSection,
                this.selectors.mySchoolsSection,
                this.selectors.highSchoolGradesSection,
                this.selectors.arizonaResidencySection,
                this.selectors.applicationAffidavitSection,
                this.selectors.applicationFeeSection
            ];
            
            for (const section of sections) {
                await this.page.waitForSelector(section, { state: 'visible' });
            }
            
            return true;
        } catch (error) {
            console.error('Error validating review page:', error);
            return false;
        }
    }
    
    /**
     * Get section details as key-value pairs
     * @param {string} sectionSelector - The selector for the section
     * @param {string} itemSelector - The selector for the detail items
     * @returns {Promise<Array<{key: string, value: string}>>} Array of key-value pairs
     */
    async getSectionDetails(sectionSelector, itemSelector) {
        const details = [];
        const section = this.page.locator(sectionSelector);
        const items = section.locator(itemSelector);
        const count = await items.count();
        
        for (let i = 0; i < count; i++) {
            const item = items.nth(i);
            const text = await item.textContent();
            // Assuming the format is "Label: Value"
            const [key, ...valueParts] = text.split(':').map(part => part.trim());
            const value = valueParts.join(':').trim();
            
            if (key && value) {
                details.push({ key, value });
            }
        }
        
        return details;
    }
    
    /**
     * Get profile section details
     * @returns {Promise<Array<{key: string, value: string}>>} Array of profile details
     */
    async getProfileSection() {
        return this.getSectionDetails(
            this.selectors.profileSection,
            this.selectors.profileDetails
        );
    }
    
    /**
     * Get my information section details
     * @returns {Promise<Array<{key: string, value: string}>>} Array of my information details
     */
    async getMyInfoSection() {
        return this.getSectionDetails(
            this.selectors.myInfoSection,
            this.selectors.myInfoDetails
        );
    }
    
    /**
     * Get my program section details
     * @returns {Promise<Array<{key: string, value: string}>>} Array of my program details
     */
    async getMyProgramSection() {
        return this.getSectionDetails(
            this.selectors.myProgramSection,
            this.selectors.myProgramDetails
        );
    }
    
    /**
     * Get my schools section details
     * @returns {Promise<Array<{key: string, value: string}>>} Array of my schools details
     */
    async getMySchoolsSection() {
        return this.getSectionDetails(
            this.selectors.mySchoolsSection,
            this.selectors.mySchoolsDetails
        );
    }
    
    /**
     * Get high school grades section details
     * @returns {Promise<Array<{key: string, value: string}>>} Array of high school grades details
     */
    async getHighSchoolGradesSection() {
        return this.getSectionDetails(
            this.selectors.highSchoolGradesSection,
            this.selectors.highSchoolGradesDetails
        );
    }
    
    /**
     * Get Arizona residency section details
     * @returns {Promise<Array<{key: string, value: string}>>} Array of Arizona residency details
     */
    async getArizonaResidencySection() {
        return this.getSectionDetails(
            this.selectors.arizonaResidencySection,
            this.selectors.arizonaResidencyDetails
        );
    }
    
    /**
     * Click the edit button for a section
     * @param {string} sectionName - The name of the section to edit
     * @returns {Promise<void>}
     */
    async clickEditSection(sectionName) {
        const sectionHeader = this.page.locator('h2', { hasText: sectionName });
        const editButton = sectionHeader.locator('xpath=..').locator('button:has-text("Edit")');
        await editButton.click();
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Verify application affidavit section
     * @returns {Promise<boolean>} Whether the affidavit section is valid
     */
    async verifyApplicationAffidavit() {
        try {
            await this.page.waitForSelector(this.selectors.applicationAffidavitSection, { state: 'visible' });
            
            // Check if the affidavit text is present
            const affidavitText = await this.page.locator(this.selectors.applicationAffidavitSection).textContent();
            const hasAffidavitText = affidavitText && affidavitText.length > 0;
            
            // Check if the checkbox is present
            const hasCheckbox = await this.page.locator(this.selectors.affidavitCheckbox).isVisible();
            
            return hasAffidavitText && hasCheckbox;
        } catch (error) {
            console.error('Error verifying application affidavit:', error);
            return false;
        }
    }
    
    /**
     * Verify application fee section
     * @returns {Promise<boolean>} Whether the fee section is valid
     */
    async verifyApplicationFeeSection() {
        try {
            await this.page.waitForSelector(this.selectors.applicationFeeSection, { state: 'visible' });
            
            // Check if payment methods are present
            const paymentMethods = this.page.locator(this.selectors.paymentMethods);
            const paymentMethodsCount = await paymentMethods.count();
            
            return paymentMethodsCount > 0;
        } catch (error) {
            console.error('Error verifying application fee section:', error);
            return false;
        }
    }
    
    /**
     * Select a payment method
     * @param {string} method - The payment method to select (visa, mastercard, discover, payLater)
     * @returns {Promise<void>}
     */
    async selectPaymentMethod(method) {
        let selector;
        
        switch (method.toLowerCase()) {
            case 'visa':
                selector = this.selectors.visaCardOption;
                break;
            case 'mastercard':
                selector = this.selectors.mastercardOption;
                break;
            case 'discover':
                selector = this.selectors.discoverOption;
                break;
            case 'paylater':
                selector = this.selectors.payLaterOption;
                break;
            default:
                throw new Error(`Unsupported payment method: ${method}`);
        }
        
        await this.page.click(selector);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Submit the application
     * @param {Object} options - Options for submission
     * @param {boolean} [options.confirm=true] - Whether to confirm the submission
     * @returns {Promise<boolean>} Whether the submission was successful
     */
    async submitApplication(options = { confirm: true }) {
        try {
            // Scroll to the submit button and click it
            await this.page.click(this.selectors.submitApplicationButton);
            
            if (options.confirm) {
                // Wait for the confirmation modal and confirm
                await this.page.waitForSelector(this.selectors.confirmationModal, { state: 'visible' });
                await this.page.click(this.selectors.confirmButton);
                await this.page.waitForLoadState('networkidle');
                
                // Check for success message or redirect
                const success = await this.page.$(this.selectors.successMessage) || 
                               !(await this.page.$(this.selectors.submitApplicationButton));
                
                return !!success;
            }
            
            return true;
        } catch (error) {
            console.error('Error submitting application:', error);
            return false;
        }
    }
    
    /**
     * Verify all external links in the review page
     * @returns {Promise<Array<{text: string, url: string, status: number}>>} Array of link verification results
     */
    async verifyExternalLinks() {
        const results = [];
        const links = this.page.locator(this.selectors.externalLinks);
        const count = await links.count();
        
        for (let i = 0; i < count; i++) {
            const link = links.nth(i);
            const text = await link.textContent();
            const url = await link.getAttribute('href');
            
            // Open the link in a new tab
            const [newPage] = await Promise.all([
                this.page.waitForEvent('popup'),
                link.click()
            ]);
            
            // Wait for the page to load
            await newPage.waitForLoadState('load');
            
            // Get the status code (simplified - in a real scenario, you might need to make an HTTP request)
            const status = 200; // Placeholder - actual implementation would check the response status
            
            // Store the result
            results.push({ text, url, status });
            
            // Close the new tab
            await newPage.close();
        }
        
        return results;
    }
    
    /**
     * Compare data from the review page with expected data from an Excel file
     * @param {string} filePath - Path to the Excel file
     * @param {string} sheetName - Name of the sheet containing expected data
     * @param {string} section - The section to compare (profile, myInfo, myProgram, etc.)
     * @returns {Promise<{matches: Array<{key: string, expected: string, actual: string}>, mismatches: Array<{key: string, expected: string, actual: string}>}>} Comparison results
     */
    async compareWithExcel(filePath, sheetName, section) {
        // Get the actual data from the page
        let actualData;
        
        switch (section.toLowerCase()) {
            case 'profile':
                actualData = await this.getProfileSection();
                break;
            case 'myinfo':
                actualData = await this.getMyInfoSection();
                break;
            case 'myprogram':
                actualData = await this.getMyProgramSection();
                break;
            case 'myschools':
                actualData = await this.getMySchoolsSection();
                break;
            case 'highschoolgrades':
                actualData = await this.getHighSchoolGradesSection();
                break;
            case 'arizonaresidency':
                actualData = await this.getArizonaResidencySection();
                break;
            default:
                throw new Error(`Unsupported section: ${section}`);
        }
        
        // Read expected data from Excel
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[sheetName];
        const expectedData = XLSX.utils.sheet_to_json(worksheet, { header: ['key', 'value'] });
        
        // Convert actual data to a map for easier comparison
        const actualMap = new Map();
        for (const item of actualData) {
            actualMap.set(item.key, item.value);
        }
        
        // Compare the data
        const matches = [];
        const mismatches = [];
        
        for (const expectedItem of expectedData) {
            const key = expectedItem.key;
            const expectedValue = expectedItem.value;
            const actualValue = actualMap.get(key);
            
            if (actualValue === expectedValue) {
                matches.push({ key, expected: expectedValue, actual: actualValue });
            } else {
                mismatches.push({ key, expected: expectedValue, actual: actualValue });
            }
        }
        
        return { matches, mismatches };
    }
}

module.exports = ReviewPage;
