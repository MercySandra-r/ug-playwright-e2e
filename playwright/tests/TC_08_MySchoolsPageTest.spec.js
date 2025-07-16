// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const MySchoolsPage = require('../pages/MySchoolsPage');

/**
 * Test data for schools
 */
const testSchools = [
    {
        state: 'Arizona',
        city: 'Phoenix',
        name: 'Arizona School for the Arts',
        saisNumber: '12345678'
    },
    {
        state: 'California',
        city: 'San Diego',
        name: 'San Diego High School',
        saisNumber: '87654321'
    },
    {
        state: 'New York',
        city: 'New York',
        name: 'Stuyvesant High School',
        saisNumber: '56781234'
    }
];

/**
 * Test suite for My Schools page functionality
 */
test.describe('My Schools Page Tests', () => {
    let loginPage;
    let mySchoolsPage;
    let testUser;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        mySchoolsPage = new MySchoolsPage(page);
        
        // Test user data
        testUser = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            password: process.env.TEST_PASSWORD || 'TestPassword123!',
            school: testSchools[0] // Use the first school as default for tests
        };

        // Login and navigate to My Schools page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await mySchoolsPage.navigateToMySchools();
    });

    test('Verify My Schools page loads successfully', async () => {
        // Verify page title and URL
        await expect(mySchoolsPage.page).toHaveURL(/.*my-schools/);
        await expect(mySchoolsPage.page.locator(mySchoolsPage.selectors.pageTitle))
            .toContainText('My Schools');
    });

    test('Validate My Schools page content', async () => {
        // Verify the page content is valid
        const isPageValid = await mySchoolsPage.validateMySchools();
        expect(isPageValid).toBeTruthy();
    });

    test('Select random high school country', async () => {
        // Select a random country
        const selectedCountry = await mySchoolsPage.selectRandomHighSchoolCountry();
        
        // Verify a country was selected
        expect(selectedCountry).toBeTruthy();
        expect(selectedCountry.length).toBeGreaterThan(0);
        
        // Log the selected country for debugging
        console.log(`Selected country: ${selectedCountry}`);
    });

    test('Add and validate a graduating school', async () => {
        // Add a graduating school
        await mySchoolsPage.addGraduatingSchool(testUser.school);
        
        // Verify the school was added
        const isSchoolValid = await mySchoolsPage.validateGraduatingSchool(testUser.school);
        expect(isSchoolValid).toBeTruthy();
    });

    test('Edit a school', async () => {
        // First add a school to edit
        await mySchoolsPage.addGraduatingSchool(testUser.school);
        
        // Define updates
        const updates = {
            name: testSchools[1].name,
            saisNumber: '99999999'
        };
        
        // Edit the school
        const editSuccessful = await mySchoolsPage.editSchool(
            testUser.school.name,
            updates
        );
        
        expect(editSuccessful).toBeTruthy();
        
        // Verify the school was updated
        const isSchoolValid = await mySchoolsPage.validateGraduatingSchool({
            ...testUser.school,
            name: updates.name,
            saisNumber: updates.saisNumber
        });
        
        expect(isSchoolValid).toBeTruthy();
    });

    test('Remove a school', async () => {
        // First add a school to remove
        await mySchoolsPage.addGraduatingSchool(testUser.school);
        
        // Remove the school
        const removeSuccessful = await mySchoolsPage.removeSchool(testUser.school.name);
        expect(removeSuccessful).toBeTruthy();
        
        // Verify the school was removed
        const isSchoolStillPresent = await mySchoolsPage.validateGraduatingSchool(testUser.school);
        expect(isSchoolStillPresent).toBeFalsy();
    });

    test('Verify error message for required fields', async () => {
        // Click add school button
        await mySchoolsPage.page.click(mySchoolsPage.selectors.addSchoolButton);
        
        // Try to save without filling required fields
        await mySchoolsPage.page.click(mySchoolsPage.selectors.saveButton);
        
        // Verify error message
        const hasError = await mySchoolsPage.verifyErrorMessage('Please fill in all required fields');
        expect(hasError).toBeTruthy();
    });

    test('Add multiple schools', async () => {
        // Add multiple schools
        for (const school of testSchools) {
            await mySchoolsPage.addGraduatingSchool(school);
            
            // Verify each school was added
            const isSchoolValid = await mySchoolsPage.validateGraduatingSchool(school);
            expect(isSchoolValid).toBeTruthy();
        }
    });

    test('Save and continue to next section', async () => {
        // Add a school first
        await mySchoolsPage.addGraduatingSchool(testUser.school);
        
        // Save and continue
        await mySchoolsPage.saveAndContinue();
        
        // Verify navigation to next section
        await expect(mySchoolsPage.page).toHaveURL(/.*next-section/);
    });

    test('Verify school search functionality', async () => {
        // Click add school button
        await mySchoolsPage.page.click(mySchoolsPage.selectors.addSchoolButton);
        
        // Fill in state and city
        await mySchoolsPage.page.selectOption(mySchoolsPage.selectors.stateDropdown, testUser.school.state);
        await mySchoolsPage.page.waitForLoadState('networkidle');
        
        await mySchoolsPage.page.selectOption(mySchoolsPage.selectors.cityDropdown, testUser.school.city);
        await mySchoolsPage.page.waitForLoadState('networkidle');
        
        // Search for a school
        await mySchoolsPage.page.fill(mySchoolsPage.selectors.schoolSearchInput, testUser.school.name);
        
        // Verify search results are displayed
        const searchResults = await mySchoolsPage.page.$(mySchoolsPage.selectors.schoolSearchResults);
        expect(searchResults).not.toBeNull();
        
        // Verify the searched school is in the results
        const schoolResults = await mySchoolsPage.page.$$(mySchoolsPage.selectors.schoolSearchResultItem);
        expect(schoolResults.length).toBeGreaterThan(0);
        
        // Verify at least one result contains the school name
        let schoolFound = false;
        for (const result of schoolResults) {
            const text = await result.textContent();
            if (text.includes(testUser.school.name)) {
                schoolFound = true;
                break;
            }
        }
        
        expect(schoolFound).toBeTruthy();
    });
});
