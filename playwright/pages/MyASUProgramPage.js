// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for My ASU Program related actions
 */
class MyASUProgramPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'MyASUProgramPage');
        
        // Define page selectors
        this.selectors = {
            // Page header and navigation
            pageTitle: 'h1',
            
            // Program List Section
            programList: '.program-list',
            programCard: '.program-card',
            programCardByIndex: (index) => `.program-card:nth-child(${index})`,
            programName: '.program-name',
            programDegreeType: '.program-degree-type',
            programLocation: '.program-location',
            programStartingTerm: '.program-starting-term',
            
            // Program Search
            searchInput: 'input[placeholder="Search programs..."]',
            searchButton: 'button[aria-label="Search"]',
            clearSearchButton: 'button[aria-label="Clear search"]',
            
            // Program Filters
            filterPanel: '.filter-panel',
            filterOption: (filterName) => `[data-testid="${filterName}-filter"]`,
            applyFiltersButton: 'button:has-text("Apply Filters")',
            clearFiltersButton: 'button:has-text("Clear All")',
            
            // Program Selection
            selectProgramButton: 'button:has-text("Select Program")',
            firstChoiceRadio: 'input[name="programChoice"][value="first"]',
            secondChoiceRadio: 'input[name="programChoice"][value="second"]',
            
            // Academic Calendar
            academicCalendarLink: 'a:has-text("View Academic Calendar")',
            
            // Error Messages
            errorMessage: '.error-message',
            noResultsMessage: '.no-results-message',
            
            // Form Actions
            saveButton: 'button:has-text("Save")',
            saveAndContinueButton: 'button:has-text("Save & Continue")',
            cancelButton: 'button:has-text("Cancel")',
            
            // Confirmation Modal
            confirmationModal: '.confirmation-modal',
            confirmButton: 'button:has-text("Confirm")',
            cancelModalButton: 'button:has-text("Cancel")'
        };
        
        // Store program data for assertions
        this.programData = [];
    }
    
    /**
     * Navigate to the My ASU Program page
     * @returns {Promise<void>}
     */
    async navigateToMyASUProgram() {
        await this.page.goto('/my-asu-program');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the My ASU Program page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*my-asu-program/);
        await expect(this.page.locator(this.selectors.pageTitle))
            .toContainText('My ASU Program');
    }
    
    /**
     * Get the list of available programs
     * @returns {Promise<Array<Object>>} List of program objects with name, degree type, location, and starting term
     */
    async getProgramList() {
        await this.page.waitForSelector(this.selectors.programCard, { state: 'visible' });
        
        const programCount = await this.page.locator(this.selectors.programCard).count();
        this.programData = [];
        
        for (let i = 0; i < programCount; i++) {
            const programCard = this.page.locator(this.selectors.programCardByIndex(i + 1));
            
            const program = {
                name: await programCard.locator(this.selectors.programName).textContent(),
                degreeType: await programCard.locator(this.selectors.programDegreeType).textContent(),
                location: await programCard.locator(this.selectors.programLocation).textContent(),
                startingTerm: await programCard.locator(this.selectors.programStartingTerm).textContent()
            };
            
            this.programData.push(program);
        }
        
        return this.programData;
    }
    
    /**
     * Search for a program by name or keyword
     * @param {string} searchTerm - The search term or program name
     * @returns {Promise<void>}
     */
    async searchProgram(searchTerm) {
        await this.page.fill(this.selectors.searchInput, searchTerm);
        await this.page.click(this.selectors.searchButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Clear the program search
     * @returns {Promise<void>}
     */
    async clearSearch() {
        await this.page.click(this.selectors.clearSearchButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Apply program filters
     * @param {Object} filters - Object containing filter options
     * @param {string[]} [filters.degreeTypes] - Array of degree types to filter by
     * @param {string[]} [filters.locations] - Array of locations to filter by
     * @param {string[]} [filters.startingTerms] - Array of starting terms to filter by
     * @returns {Promise<void>}
     */
    async applyFilters(filters = {}) {
        const { degreeTypes = [], locations = [], startingTerms = [] } = filters;
        
        // Apply degree type filters
        for (const degreeType of degreeTypes) {
            await this.page.check(this.selectors.filterOption(`degree-type-${degreeType.toLowerCase()}`));
        }
        
        // Apply location filters
        for (const location of locations) {
            await this.page.check(this.selectors.filterOption(`location-${location.toLowerCase().replace(/\s+/g, '-')}`));
        }
        
        // Apply starting term filters
        for (const term of startingTerms) {
            await this.page.check(this.selectors.filterOption(`term-${term.toLowerCase().replace(/\s+/g, '-')}`));
        }
        
        // Click apply filters button
        await this.page.click(this.selectors.applyFiltersButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Clear all applied filters
     * @returns {Promise<void>}
     */
    async clearAllFilters() {
        await this.page.click(this.selectors.clearFiltersButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Select a program by index
     * @param {number} index - The index of the program to select (1-based)
     * @param {'first'|'second'} [choice] - Whether to select as first or second choice
     * @returns {Promise<Object>} The selected program data
     */
    async selectProgram(index, choice = 'first') {
        const programCard = this.page.locator(this.selectors.programCardByIndex(index));
        
        // Get program data before selecting
        const programData = {
            name: await programCard.locator(this.selectors.programName).textContent(),
            degreeType: await programCard.locator(this.selectors.programDegreeType).textContent(),
            location: await programCard.locator(this.selectors.programLocation).textContent(),
            startingTerm: await programCard.locator(this.selectors.programStartingTerm).textContent()
        };
        
        // Click the select program button
        await programCard.locator(this.selectors.selectProgramButton).click();
        
        // Select first or second choice
        if (choice === 'first') {
            await this.page.check(this.selectors.firstChoiceRadio);
        } else {
            await this.page.check(this.selectors.secondChoiceRadio);
        }
        
        // Save the selection
        await this.page.click(this.selectors.saveButton);
        await this.page.waitForLoadState('networkidle');
        
        return programData;
    }
    
    /**
     * Open the academic calendar
     * @returns {Promise<void>}
     */
    async openAcademicCalendar() {
        const [newPage] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.page.click(this.selectors.academicCalendarLink)
        ]);
        
        return newPage;
    }
    
    /**
     * Verify the academic calendar page is opened
     * @param {import('@playwright/test').Page} calendarPage - The page object for the academic calendar
     * @returns {Promise<boolean>} Whether the calendar page is valid
     */
    async verifyAcademicCalendar(calendarPage) {
        try {
            await calendarPage.waitForLoadState('domcontentloaded');
            const title = await calendarPage.title();
            return title.toLowerCase().includes('academic calendar');
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Verify error message is displayed
     * @param {string} expectedMessage - The expected error message
     * @returns {Promise<boolean>} Whether the error message is displayed and matches
     */
    async verifyErrorMessage(expectedMessage) {
        const errorLocator = this.page.locator(this.selectors.errorMessage);
        const isVisible = await errorLocator.isVisible();
        
        if (!isVisible) return false;
        
        const actualMessage = await errorLocator.textContent();
        return actualMessage.includes(expectedMessage);
    }
    
    /**
     * Save the program selection and continue
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.page.click(this.selectors.saveAndContinueButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Verify program selection was saved successfully
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async isSaveSuccessful() {
        try {
            await this.page.waitForSelector(this.selectors.confirmationModal, { state: 'visible', timeout: 5000 });
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = MyASUProgramPage;
