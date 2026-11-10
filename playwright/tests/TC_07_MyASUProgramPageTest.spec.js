// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');

/**
 * Test suite for My ASU Program page functionality
 */
test.describe('My ASU Program Page Tests', () => {
    let loginPage;
    let myASUProgramPage;
    let testUser;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        myASUProgramPage = new MyASUProgramPage(page);
        
        // Test user data
        testUser = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            password: process.env.TEST_PASSWORD || 'TestPassword123!',
            program: {
                searchTerm: 'Computer Science',
                degreeType: 'Bachelor of Science',
                location: 'Tempe',
                startingTerm: 'Fall 2023'
            }
        };

        // Login and navigate to My ASU Program page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await myASUProgramPage.navigateToMyASUProgram();
    });

    test('Verify My ASU Program page loads successfully', async () => {
        // Verify page title and URL
        await expect(myASUProgramPage.page).toHaveURL(/.*my-program/);
        await expect(myASUProgramPage.page.locator(myASUProgramPage.selectors.pageTitle))
            .toContainText('My ASU Program');
    });

    test('Get and verify program list', async () => {
        // Get the list of programs
        const programs = await myASUProgramPage.getProgramList();
        
        // Verify programs were found
        expect(programs.length).toBeGreaterThan(0);
        
        // Verify program properties
        programs.forEach(program => {
            expect(program.name).toBeTruthy();
            expect(program.degreeType).toBeTruthy();
            expect(program.location).toBeTruthy();
            expect(program.startingTerm).toBeTruthy();
        });
    });

    test('Search for a program', async () => {
        // Search for a program
        await myASUProgramPage.searchProgram(testUser.program.searchTerm);
        
        // Get the filtered program list
        const programs = await myASUProgramPage.getProgramList();
        
        // Verify search results
        expect(programs.length).toBeGreaterThan(0);
        
        // Verify search term is in program name or description
        programs.forEach(program => {
            expect(program.name.toLowerCase()).toContain(testUser.program.searchTerm.toLowerCase());
        });
        
        // Clear search
        await myASUProgramPage.clearSearch();
        
        // Verify all programs are shown again
        const allPrograms = await myASUProgramPage.getProgramList();
        expect(allPrograms.length).toBeGreaterThanOrEqual(programs.length);
    });

    test('Filter programs by degree type', async () => {
        // Apply filters
        await myASUProgramPage.applyFilters({
            degreeTypes: [testUser.program.degreeType]
        });
        
        // Get the filtered program list
        const programs = await myASUProgramPage.getProgramList();
        
        // Verify filtered results
        if (programs.length > 0) {
            programs.forEach(program => {
                expect(program.degreeType).toContain(testUser.program.degreeType);
            });
        }
        
        // Clear filters
        await myASUProgramPage.clearAllFilters();
    });

    test('Select a program as first choice', async () => {
        // Get the first program
        const programs = await myASUProgramPage.getProgramList();
        expect(programs.length).toBeGreaterThan(0);
        
        // Select the first program as first choice
        const selectedProgram = await myASUProgramPage.selectProgram(1, 'first');
        
        // Verify selection was successful
        const isSaveSuccessful = await myASUProgramPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Verify the selected program data
        expect(selectedProgram).toEqual(programs[0]);
    });

    test('Verify academic calendar link', async () => {
        // Open the academic calendar in a new tab
        const calendarPage = await myASUProgramPage.openAcademicCalendar();
        
        // Verify the calendar page is valid
        const isCalendarValid = await myASUProgramPage.verifyAcademicCalendar(calendarPage);
        expect(isCalendarValid).toBeTruthy();
        
        // Close the calendar page
        await calendarPage.close();
    });

    test('Save and continue to next section', async () => {
        // Select a program first
        await myASUProgramPage.selectProgram(1, 'first');
        
        // Save and continue
        await myASUProgramPage.saveAndContinue();
        
        // Verify navigation to next section
        await expect(myASUProgramPage.page).toHaveURL(/.*next-section/);
    });

    test('Verify error messages for required fields', async () => {
        // Try to continue without selecting a program
        await myASUProgramPage.saveAndContinue();
        
        // Verify error message
        const hasError = await myASUProgramPage.verifyErrorMessage('Please select at least one program');
        expect(hasError).toBeTruthy();
    });

    test('Verify program selection as second choice', async () => {
        // Select a program as second choice
        const programs = await myASUProgramPage.getProgramList();
        expect(programs.length).toBeGreaterThan(1);
        
        // Select the second program as second choice
        const selectedProgram = await myASUProgramPage.selectProgram(2, 'second');
        
        // Verify selection was successful
        const isSaveSuccessful = await myASUProgramPage.isSaveSuccessful();
        expect(isSaveSuccessful).toBeTruthy();
        
        // Verify the selected program data
        expect(selectedProgram).toEqual(programs[1]);
    });

    test('Verify program details display', async () => {
        // Get the first program
        const programs = await myASUProgramPage.getProgramList();
        expect(programs.length).toBeGreaterThan(0);
        
        const firstProgram = programs[0];
        
        // Verify program details are displayed correctly
        const programCard = myASUProgramPage.page.locator(myASUProgramPage.selectors.programCardByIndex(1));
        
        const displayedName = await programCard.locator(myASUProgramPage.selectors.programName).textContent();
        const displayedDegreeType = await programCard.locator(myASUProgramPage.selectors.programDegreeType).textContent();
        const displayedLocation = await programCard.locator(myASUProgramPage.selectors.programLocation).textContent();
        const displayedTerm = await programCard.locator(myASUProgramPage.selectors.programStartingTerm).textContent();
        
        expect(displayedName).toBe(firstProgram.name);
        expect(displayedDegreeType).toBe(firstProgram.degreeType);
        expect(displayedLocation).toBe(firstProgram.location);
        expect(displayedTerm).toBe(firstProgram.startingTerm);
    });
});
