// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');
// @ts-ignore - xlsx is a dynamic module that doesn't have type definitions
const XLSX = require('xlsx');
const path = require('path');

/**
 * Page Object for Preview functionality
 */
class PreviewPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'PreviewPage');
        
        // Define page selectors
        this.selectors = {
            // Page title and navigation
            pageTitle: 'h1',
            previewContent: '.preview-content',
            
            // Download PDF button
            downloadPdfButton: 'button:has-text("Download PDF")',
            
            // Back button
            backButton: 'button:has-text("Back")',
            
            // Section headers
            sectionHeaders: 'h2.section-header',
            
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
            readAffidavitLink: 'a:has-text("Read the affidavit")',
            affidavitCheckbox: '#affidavit-checkbox',
            
            // Prohibition and Report Links
            prohibitionLink: 'a:has-text("Prohibition Against Discrimination, Harassment and Retaliation")',
            reportLink: 'a:has-text("reportit")',
            
            // Return to Previous Page
            returnToPreviousButton: 'button:has-text("Return to Previous Page")',
            
            // User menu
            profileIcon: '.profile-icon',
            signOutButton: 'button:has-text("Sign Out")',
            
            // Login form
            emailInput: 'input[type="email"]',
            passwordInput: 'input[type="password"]',
            loginButton: 'button:has-text("Log In")',
            
            // Submitted application status
            submittedStatus: '.submitted-status',
            submissionDate: '.submission-date',
            
            // Error messages
            errorMessage: '.error-message',
            validationError: '.validation-error'
        };
    }
    
    /**
     * Navigate to the Preview page
     * @returns {Promise<void>}
     */
    async navigateToPreviewPage() {
        await this.gotoApplicationStep('preview');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the Preview page is loaded
     * @returns {Promise<boolean>} Whether the page is loaded
     */
    async verifyPageLoaded() {
        try {
            await this.page.waitForSelector(this.selectors.pageTitle, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.previewContent, { state: 'visible' });
            return true;
        } catch (error) {
            console.error('Error loading Preview page:', error);
            return false;
        }
    }
    
    /**
     * Validate the Preview page content
     * @returns {Promise<boolean>} Whether the page content is valid
     */
    async validatePreview() {
        try {
            // Check if all sections are present
            const sections = [
                this.selectors.profileSection,
                this.selectors.myInfoSection,
                this.selectors.myProgramSection,
                this.selectors.mySchoolsSection,
                this.selectors.highSchoolGradesSection,
                this.selectors.arizonaResidencySection,
                this.selectors.applicationAffidavitSection
            ];
            
            for (const section of sections) {
                await this.page.waitForSelector(section, { state: 'visible' });
            }
            
            return true;
        } catch (error) {
            console.error('Error validating preview page:', error);
            return false;
        }
    }
    
    /**
     * Verify the Download PDF button is enabled
     * @returns {Promise<boolean>} Whether the Download PDF button is enabled
     */
    async verifyDownloadPdfButton() {
        try {
            const isEnabled = await this.page.locator(this.selectors.downloadPdfButton).isEnabled();
            console.log(`Download PDF button is ${isEnabled ? 'enabled' : 'disabled'}`);
            return isEnabled;
        } catch (error) {
            console.error('Error verifying Download PDF button:', error);
            return false;
        }
    }
    
    /**
     * Click the Back button
     * @returns {Promise<boolean>} Whether the back navigation was successful
     */
    async clickBackButton() {
        try {
            await this.page.click(this.selectors.backButton);
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're not on the preview page anymore
            const currentUrl = this.page.url();
            return !currentUrl.includes('preview');
        } catch (error) {
            console.error('Error clicking back button:', error);
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
            
            // Skip if text is null or empty
            if (!text) continue;
            
            // Safely split and process the text
            const parts = text.split(':');
            if (parts.length < 2) continue; // Skip if no colon found
            
            const key = parts[0]?.trim() || '';
            const value = parts.slice(1).join(':').trim();
            
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
     * Verify application affidavit section
     * @returns {Promise<boolean>} Whether the affidavit section is valid
     */
    async verifyApplicationAffidavit() {
        try {
            await this.page.waitForSelector(this.selectors.applicationAffidavitSection, { state: 'visible' });
            
            // Check if the read affidavit link is present
            const hasReadAffidavitLink = await this.page.locator(this.selectors.readAffidavitLink).isVisible();
            
            // Check if the checkbox is present
            const hasCheckbox = await this.page.locator(this.selectors.affidavitCheckbox).isVisible();
            
            return hasReadAffidavitLink && hasCheckbox;
        } catch (error) {
            console.error('Error verifying application affidavit:', error);
            return false;
        }
    }
    
    /**
     * Click on the Read Affidavit link and verify it works
     * @returns {Promise<boolean>} Whether the link works as expected
     */
    async clickReadAffidavitLink() {
        try {
            const [newPage] = await Promise.all([
                this.page.waitForEvent('popup'),
                this.page.click(this.selectors.readAffidavitLink)
            ]);
            
            await newPage.waitForLoadState('load');
            const url = newPage.url();
            await newPage.close();
            
            // Verify the URL contains expected text
            const isUrlValid = url.includes('affidavit') || url.includes('terms');
            expect(isUrlValid).toBeTruthy();
            
            return isUrlValid;
        } catch (error) {
            console.error('Error with Read Affidavit link:', error);
            return false;
        }
    }
    
    /**
     * Verify the affidavit checkbox is disabled
     * @returns {Promise<boolean>} Whether the checkbox is disabled
     */
    async verifyAffidavitCheckboxDisabled() {
        try {
            const isDisabled = !(await this.page.locator(this.selectors.affidavitCheckbox).isEnabled());
            console.log(`Affidavit checkbox is ${isDisabled ? 'disabled' : 'enabled'}`);
            return isDisabled;
        } catch (error) {
            console.error('Error verifying affidavit checkbox:', error);
            return false;
        }
    }
    
    /**
     * Click on the Return to Previous Page button
     * @returns {Promise<boolean>} Whether the navigation was successful
     */
    async clickReturnToPreviousPage() {
        try {
            await this.page.click(this.selectors.returnToPreviousButton);
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're not on the preview page anymore
            const currentUrl = this.page.url();
            return !currentUrl.includes('preview');
        } catch (error) {
            console.error('Error clicking Return to Previous Page button:', error);
            return false;
        }
    }
    
    /**
     * Sign out from the application
     * @returns {Promise<boolean>} Whether the sign out was successful
     */
    async signOut() {
        try {
            await this.page.click(this.selectors.profileIcon);
            await this.page.click(this.selectors.signOutButton);
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're on the login page or home page
            const currentUrl = this.page.url();
            return currentUrl.includes('login') || currentUrl.endsWith('/');
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    }
    
    /**
     * Log in to the application
     * @param {string} email - The email to log in with
     * @param {string} password - The password to log in with
     * @returns {Promise<boolean>} Whether the login was successful
     */
    /**
     * Log in to the application
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<boolean>} True if login is successful, false otherwise
     */
    async login(email, password) {
        try {
            await this.page.fill(this.selectors.emailInput, email);
            await this.page.fill(this.selectors.passwordInput, password);
            await this.page.click(this.selectors.loginButton);
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're logged in by checking for the profile icon
            const isLoggedIn = await this.page.locator(this.selectors.profileIcon).isVisible();
            return isLoggedIn;
        } catch (error) {
            console.error('Error logging in:', error);
            return false;
        }
    }
    
    /**
     * Compare data from the preview page with expected data from an Excel file
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
    
    /**
     * Compare data between review and preview pages using Excel files
     * @param {string} reviewFilePath - Path to the Excel file with review data
     * @param {string} previewFilePath - Path to the Excel file with preview data
     * @param {string} reviewSheet - Name of the sheet with review data
     * @param {string} previewSheet - Name of the sheet with preview data
     * @returns {Promise<{matches: Array<{key: string, review: string, preview: string}>, mismatches: Array<{key: string, review: string, preview: string}>}>} Comparison results
     */
    async compareReviewAndPreview(reviewFilePath, previewFilePath, reviewSheet = 'ReviewPageData', previewSheet = 'PreviewPageData') {
        try {
            // Read review data
            const reviewWorkbook = XLSX.readFile(reviewFilePath);
            const reviewWorksheet = reviewWorkbook.Sheets[reviewSheet];
            const reviewData = XLSX.utils.sheet_to_json(reviewWorksheet, { header: ['key', 'value'] });
            
            // Read preview data
            const previewWorkbook = XLSX.readFile(previewFilePath);
            const previewWorksheet = previewWorkbook.Sheets[previewSheet];
            const previewData = XLSX.utils.sheet_to_json(previewWorksheet, { header: ['key', 'value'] });
            
            // Convert to maps for easier comparison
            const reviewMap = new Map();
            const previewMap = new Map();
            
            for (const item of reviewData) {
                if (item.key) {
                    reviewMap.set(item.key, item.value || '');
                }
            }
            
            for (const item of previewData) {
                if (item.key) {
                    previewMap.set(item.key, item.value || '');
                }
            }
            
            // Compare the data
            const allKeys = new Set([...reviewMap.keys(), ...previewMap.keys()]);
            const matches = [];
            const mismatches = [];
            
            for (const key of allKeys) {
                const reviewValue = reviewMap.get(key) || '';
                const previewValue = previewMap.get(key) || '';
                
                if (reviewValue === previewValue) {
                    matches.push({ key, review: reviewValue, preview: previewValue });
                } else {
                    mismatches.push({ key, review: reviewValue, preview: previewValue });
                }
            }
            
            return { matches, mismatches };
        } catch (error) {
            console.error('Error comparing review and preview data:', error);
            throw error;
        }
    }
}

module.exports = PreviewPage;
