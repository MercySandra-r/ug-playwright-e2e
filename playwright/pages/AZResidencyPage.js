// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for AZ Residency related actions
 */
class AZResidencyPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'AZResidencyPage');
        
        // Define page selectors
        this.selectors = {
            // Page header and navigation
            pageTitle: 'h1',
            
            // Residency Questions Section
            residencyQuestionsSection: '.residency-questions',
            
            // Permanent Home Questions
            permanentHomeQuestion: 'h3:has-text("Is your permanent home in Arizona?")',
            permanentHomeYesRadio: 'input[name="permanentHome"][value="yes"]',
            permanentHomeNoRadio: 'input[name="permanentHome"][value="no"]',
            
            // Living in AZ Questions (conditional)
            livingInAZQuestion: 'h3:has-text("Have you lived in Arizona for the last 12 months?")',
            livingInAZYesRadio: 'input[name="livingInAZ"][value="yes"]',
            livingInAZNoRadio: 'input[name="livingInAZ"][value="no"]',
            
            // Parent/Guardian Questions
            parentGuardianQuestion: 'h3:has-text("Do you have a parent or legal guardian who is a resident of Arizona?")',
            parentGuardianYesRadio: 'input[name="parentGuardian"][value="yes"]',
            parentGuardianNoRadio: 'input[name="parentGuardian"][value="no"]',
            
            // Military Questions
            militaryQuestion: 'h3:has-text("Are you an active duty member of the U.S. military stationed in Arizona?")',
            militaryYesRadio: 'input[name="military"][value="yes"]',
            militaryNoRadio: 'input[name="military"][value="no"]',
            
            // Additional Information Section
            additionalInfoSection: '.additional-info',
            additionalInfoTextarea: 'textarea[name="additionalInfo"]',
            
            // Documents Section
            documentsSection: '.documents-section',
            uploadDocumentInput: 'input[type="file"]',
            documentTypeDropdown: 'select[name="documentType"]',
            documentDescriptionInput: 'input[name="documentDescription"]',
            addDocumentButton: 'button:has-text("Add Document")',
            
            // Document List
            documentList: '.document-list',
            documentItem: '.document-item',
            documentName: '.document-name',
            documentType: '.document-type',
            documentDescription: '.document-description',
            removeDocumentButton: 'button:has-text("Remove")',
            
            // Form Actions
            saveButton: 'button:has-text("Save")',
            saveAndContinueButton: 'button:has-text("Save & Continue")',
            
            // Confirmation Modal
            confirmationModal: '.confirmation-modal',
            confirmButton: 'button:has-text("Confirm")',
            cancelButton: 'button:has-text("Cancel")',
            
            // Error Messages
            errorMessage: '.error-message',
            validationError: '.validation-error'
        };
    }
    
    /**
     * Navigate to the AZ Residency page
     * @returns {Promise<void>}
     */
    async navigateToAZResidency() {
        await this.page.goto('/az-residency');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the AZ Residency page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*az-residency/);
        await expect(this.page.locator(this.selectors.pageTitle))
            .toContainText('Arizona Residency');
    }
    
    /**
     * Validate the AZ Residency page content
     * @returns {Promise<boolean>} Whether the page content is valid
     */
    async validateAZresidencyPage() {
        try {
            await this.page.waitForSelector(this.selectors.residencyQuestionsSection, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.permanentHomeQuestion, { state: 'visible' });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Answer the permanent home question
     * @param {boolean} isAZResident - Whether the user is an AZ resident
     * @returns {Promise<void>}
     */
    async answerPermanentHomeQuestion(isAZResident) {
        if (isAZResident) {
            await this.page.check(this.selectors.permanentHomeYesRadio);
        } else {
            await this.page.check(this.selectors.permanentHomeNoRadio);
        }
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Answer the living in AZ question
     * @param {boolean} hasLivedInAZ - Whether the user has lived in AZ for the last 12 months
     * @returns {Promise<void>}
     */
    async answerLivingInAZQuestion(hasLivedInAZ) {
        await this.page.waitForSelector(this.selectors.livingInAZQuestion, { state: 'visible' });
        
        if (hasLivedInAZ) {
            await this.page.check(this.selectors.livingInAZYesRadio);
        } else {
            await this.page.check(this.selectors.livingInAZNoRadio);
        }
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Answer the parent/guardian question
     * @param {boolean} hasAZParent - Whether the user has a parent/guardian who is an AZ resident
     * @returns {Promise<void>}
     */
    async answerParentGuardianQuestion(hasAZParent) {
        await this.page.waitForSelector(this.selectors.parentGuardianQuestion, { state: 'visible' });
        
        if (hasAZParent) {
            await this.page.check(this.selectors.parentGuardianYesRadio);
        } else {
            await this.page.check(this.selectors.parentGuardianNoRadio);
        }
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Answer the military question
     * @param {boolean} isMilitary - Whether the user is an active duty military member stationed in AZ
     * @returns {Promise<void>}
     */
    async answerMilitaryQuestion(isMilitary) {
        await this.page.waitForSelector(this.selectors.militaryQuestion, { state: 'visible' });
        
        if (isMilitary) {
            await this.page.check(this.selectors.militaryYesRadio);
        } else {
            await this.page.check(this.selectors.militaryNoRadio);
        }
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Add additional information
     * @param {string} info - Additional information to add
     * @returns {Promise<void>}
     */
    async addAdditionalInfo(info) {
        await this.page.fill(this.selectors.additionalInfoTextarea, info);
    }
    
    /**
     * Upload a document
     * @param {string} filePath - Path to the file to upload
     * @param {string} documentType - Type of document
     * @param {string} [description] - Optional description for the document
     * @returns {Promise<void>}
     */
    async uploadDocument(filePath, documentType, description = '') {
        // Upload the file
        const [fileChooser] = await Promise.all([
            this.page.waitForEvent('filechooser'),
            this.page.click(this.selectors.uploadDocumentInput),
        ]);
        await fileChooser.setFiles(filePath);
        
        // Select document type
        await this.page.selectOption(this.selectors.documentTypeDropdown, documentType);
        
        // Add description if provided
        if (description) {
            await this.page.fill(this.selectors.documentDescriptionInput, description);
        }
        
        // Click add document button
        await this.page.click(this.selectors.addDocumentButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Remove a document
     * @param {string} documentName - Name of the document to remove
     * @returns {Promise<boolean>} Whether the document was successfully removed
     */
    async removeDocument(documentName) {
        try {
            const documentItems = await this.page.$$(this.selectors.documentItem);
            
            for (const item of documentItems) {
                const nameElement = await item.$(this.selectors.documentName);
                
                if (nameElement) {
                    const nameText = await nameElement.textContent();
                    
                    if (nameText.includes(documentName)) {
                        const removeButton = await item.$(this.selectors.removeDocumentButton);
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
            console.error('Error removing document:', error);
            return false;
        }
    }
    
    /**
     * Save the form
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async save() {
        try {
            await this.page.click(this.selectors.saveButton);
            await this.page.waitForSelector(this.selectors.confirmationModal, { state: 'visible', timeout: 5000 });
            return true;
        } catch (error) {
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

module.exports = AZResidencyPage;
