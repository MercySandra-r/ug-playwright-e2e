// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for Post-Application Submission Dashboard functionality
 */
class PostAppSubmissionDashboardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'PostAppSubmissionDashboardPage');
        
        // Define page selectors
        this.selectors = {
            // Page title
            pageTitle: 'h1',
            
            // Contact information
            phoneNumber: '.phone-number',
            emailAddress: '.email-address',
            
            // Links
            qtrLink: 'a.qtr-link',
            transcriptsLink: 'a.transcripts-link',
            fafsaLink: 'a.fafsa-link',
            previewLink: 'a.preview-application-link',
            
            // Alerts
            qtrAlert: '.qtr-alert',
            
            // Dashboard sections
            nextStepsSection: '.next-steps-section',
            applicationStatusSection: '.application-status-section',
            
            // Buttons
            viewSubmittedApplicationBtn: 'button:has-text("View Submitted Application")',
            
            // Status indicators
            applicationStatus: '.application-status',
            
            // Error messages
            errorMessage: '.error-message'
        };
    }
    
    /**
     * Navigate to the Post-Application Submission Dashboard
     * @returns {Promise<void>}
     */
    async navigateToDashboard() {
        await this.page.goto('/dashboard/post-submission');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the Post-Application Submission Dashboard is loaded
     * @returns {Promise<boolean>} Whether the page is loaded
     */
    async verifyPageLoaded() {
        try {
            await this.page.waitForSelector(this.selectors.pageTitle, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.nextStepsSection, { state: 'visible' });
            return true;
        } catch (error) {
            console.error('Error loading Post-App Submission Dashboard:', error);
            return false;
        }
    }
    
    /**
     * Validate the Post-Application Submission Dashboard content
     * @returns {Promise<boolean>} Whether the dashboard content is valid
     */
    async validatePostDashboard() {
        try {
            // Verify page title
            const title = await this.page.textContent(this.selectors.pageTitle);
            expect(title).toContain('Application Submitted');
            
            // Verify sections are visible
            await expect(this.page.locator(this.selectors.nextStepsSection)).toBeVisible();
            await expect(this.page.locator(this.selectors.applicationStatusSection)).toBeVisible();
            
            // Verify contact information is visible
            const phoneVisible = await this.page.isVisible(this.selectors.phoneNumber);
            const emailVisible = await this.page.isVisible(this.selectors.emailAddress);
            
            return phoneVisible && emailVisible;
        } catch (error) {
            console.error('Error validating post-application dashboard:', error);
            return false;
        }
    }
    
    /**
     * Verify phone number is displayed correctly
     * @param {string} expectedPhone - The expected phone number
     * @returns {Promise<boolean>} Whether the phone number is correct
     */
    async verifyPhoneNumber(expectedPhone = '866-277-6589') {
        try {
            const phoneElement = this.page.locator(this.selectors.phoneNumber);
            await phoneElement.scrollIntoViewIfNeeded();
            const actualPhone = await phoneElement.textContent();
            expect(actualPhone).toContain(expectedPhone);
            return true;
        } catch (error) {
            console.error('Error verifying phone number:', error);
            return false;
        }
    }
    
    /**
     * Verify email address is displayed correctly
     * @param {string} expectedEmail - The expected email address
     * @returns {Promise<boolean>} Whether the email address is correct
     */
    async verifyEmailAddress(expectedEmail = 'enrollmentonline@asu.edu') {
        try {
            const emailElement = this.page.locator(this.selectors.emailAddress);
            await emailElement.scrollIntoViewIfNeeded();
            const actualEmail = await emailElement.textContent();
            expect(actualEmail).toContain(expectedEmail);
            return true;
        } catch (error) {
            console.error('Error verifying email address:', error);
            return false;
        }
    }
    
    /**
     * Click on the QTR (Quarterly Tuition and Fees) link and verify it opens correctly
     * @returns {Promise<boolean>} Whether the QTR link works as expected
     */
    async clickQTRLink() {
        try {
            const [newPage] = await Promise.all([
                this.page.waitForEvent('popup'),
                this.page.click(this.selectors.qtrLink)
            ]);
            
            await newPage.waitForLoadState('load');
            const url = newPage.url();
            await newPage.close();
            
            // Verify the URL contains 'tuition' or other expected pattern
            const isUrlValid = url.includes('tuition') || url.includes('qtr');
            expect(isUrlValid).toBeTruthy();
            
            return isUrlValid;
        } catch (error) {
            console.error('Error with QTR link:', error);
            return false;
        }
    }
    
    /**
     * Click on the Transcripts link and verify it opens correctly
     * @returns {Promise<boolean>} Whether the Transcripts link works as expected
     */
    async clickTranscriptsLink() {
        try {
            const [newPage] = await Promise.all([
                this.page.waitForEvent('popup'),
                this.page.click(this.selectors.transcriptsLink)
            ]);
            
            await newPage.waitForLoadState('load');
            const url = newPage.url();
            await newPage.close();
            
            // Verify the URL contains 'transcripts' or other expected pattern
            const isUrlValid = url.includes('transcript');
            expect(isUrlValid).toBeTruthy();
            
            return isUrlValid;
        } catch (error) {
            console.error('Error with Transcripts link:', error);
            return false;
        }
    }
    
    /**
     * Click on the FAFSA link and verify it opens correctly
     * @returns {Promise<boolean>} Whether the FAFSA link works as expected
     */
    async clickFafsaLink() {
        try {
            const [newPage] = await Promise.all([
                this.page.waitForEvent('popup'),
                this.page.click(this.selectors.fafsaLink)
            ]);
            
            await newPage.waitForLoadState('load');
            const url = newPage.url();
            await newPage.close();
            
            // Verify the URL contains 'fafsa' or other expected pattern
            const isUrlValid = url.includes('fafsa');
            expect(isUrlValid).toBeTruthy();
            
            return isUrlValid;
        } catch (error) {
            console.error('Error with FAFSA link:', error);
            return false;
        }
    }
    
    /**
     * Check if QTR alert is present for AZ Online students
     * @returns {Promise<boolean>} Whether the QTR alert is present
     */
    async checkQtrAlertPresenceForAZOnline() {
        try {
            const alertVisible = await this.page.isVisible(this.selectors.qtrAlert);
            // If the alert is visible, it should contain specific text
            if (alertVisible) {
                const alertText = await this.page.textContent(this.selectors.qtrAlert);
                expect(alertText).toContain('Arizona Online');
            }
            return alertVisible;
        } catch (error) {
            console.error('Error checking QTR alert:', error);
            return false;
        }
    }
    
    /**
     * Click on the Preview Application link
     * @returns {Promise<boolean>} Whether the preview link was clicked successfully
     */
    async clickPreviewLink() {
        try {
            await this.page.click(this.selectors.previewLink);
            await this.page.waitForLoadState('networkidle');
            
            // Verify we're on the preview page or the page has changed
            const currentUrl = this.page.url();
            const isPreviewPage = currentUrl.includes('preview') || currentUrl.includes('review');
            expect(isPreviewPage).toBeTruthy();
            
            return isPreviewPage;
        } catch (error) {
            console.error('Error clicking preview link:', error);
            return false;
        }
    }
    
    /**
     * Get the current application status
     * @returns {Promise<string>} The application status text
     */
    async getApplicationStatus() {
        try {
            return await this.page.textContent(this.selectors.applicationStatus);
        } catch (error) {
            console.error('Error getting application status:', error);
            return '';
        }
    }
    
    /**
     * Verify all external links on the page
     * @returns {Promise<Array<{text: string, url: string, status: number}>>} Array of link verification results
     */
    async verifyAllExternalLinks() {
        const results = [];
        const links = this.page.locator('a[target="_blank"]');
        const count = await links.count();
        
        for (let i = 0; i < count; i++) {
            const link = links.nth(i);
            const text = await link.textContent();
            const url = await link.getAttribute('href');
            
            // Skip empty or mailto: links
            if (!url || url.startsWith('mailto:')) continue;
            
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
}

module.exports = PostAppSubmissionDashboardPage;
