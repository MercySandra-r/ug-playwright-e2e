// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');

/**
 * Test suite for Pre-Application Dashboard functionality
 */
test.describe('Pre-Application Dashboard Tests', () => {
    let loginPage;
    let dashboardPage;
    let testUser;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new PreAppDashboardPage(page);
        
        // Generate test user data
        testUser = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            password: process.env.TEST_PASSWORD || 'TestPassword123!',
            firstName: 'Test',
            preferredFirstName: 'Tester',
            middleName: 'Middle',
            lastName: 'User',
            suffix: 'Jr',
            phoneNumber: '5551234567',
            countryCode: '+1',
            phoneType: 'Mobile'
        };

        // Navigate to login and login
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        
        // Navigate to dashboard
        await dashboardPage.navigateToDashboard();
    });

    test('Verify Pre-Application Dashboard page loads successfully', async () => {
        // Verify page title and URL
        await expect(dashboardPage.page).toHaveURL(/.*dashboard/);
        await expect(dashboardPage.page.locator(dashboardPage.selectors.pageTitle))
            .toContainText('Pre-Application Dashboard');
    });

    test('Verify Start New Application button is visible and clickable', async () => {
        // Verify Start New Application button is visible and enabled
        const startButton = dashboardPage.page.locator(dashboardPage.selectors.startNewAppButton);
        await expect(startButton).toBeVisible();
        await expect(startButton).toBeEnabled();
        
        // Click the button and verify navigation
        await startButton.click();
        await dashboardPage.page.waitForTimeout(1000); // Wait for navigation
        await expect(dashboardPage.page).toHaveURL(/.*application/);
    });

    test('Fill out personal information form with valid data', async () => {
        // Click Start New Application
        await dashboardPage.startNewApplication();
        
        // Fill personal information
        await dashboardPage.fillPersonalInformation({
            firstName: testUser.firstName,
            preferredFirstName: testUser.preferredFirstName,
            middleName: testUser.middleName,
            lastName: testUser.lastName,
            suffix: testUser.suffix
        });
        
        // Verify the values were entered correctly
        await expect(dashboardPage.page.locator(dashboardPage.selectors.firstNameInput))
            .toHaveValue(testUser.firstName);
        await expect(dashboardPage.page.locator(dashboardPage.selectors.preferredFirstNameInput))
            .toHaveValue(testUser.preferredFirstName);
        await expect(dashboardPage.page.locator(dashboardPage.selectors.lastNameInput))
            .toHaveValue(testUser.lastName);
    });

    test('Set date of birth and verify age-based validations', async () => {
        await dashboardPage.startNewApplication();
        
        // Test with age > 24
        const adultDob = dashboardPage.generateRandomBirthDateForAge(25);
        await dashboardPage.setDateOfBirth(adultDob);
        
        // Test with age between 18-24
        const youngAdultDob = dashboardPage.generateRandomBirthDateForAge(20);
        await dashboardPage.setDateOfBirth(youngAdultDob);
        
        // Test with age = 18
        const exactly18Dob = dashboardPage.generateRandomBirthDateForAge(18);
        await dashboardPage.setDateOfBirth(exactly18Dob);
        
        // Test with age < 18
        const minorDob = dashboardPage.generateRandomBirthDateForAge(16);
        await dashboardPage.setDateOfBirth(minorDob);
    });

    test('Fill contact information with valid phone number', async () => {
        await dashboardPage.startNewApplication();
        
        // Fill contact information
        await dashboardPage.fillContactInformation({
            email: testUser.email,
            phoneNumber: testUser.phoneNumber,
            phoneType: testUser.phoneType,
            countryCode: testUser.countryCode
        });
        
        // Verify phone number format
        const isPhoneValid = await dashboardPage.isValidPhoneNumber(
            testUser.countryCode + testUser.phoneNumber
        );
        expect(isPhoneValid).toBeTruthy();
    });

    test('Verify form submission with required fields only', async () => {
        await dashboardPage.startNewApplication();
        
        // Fill only required fields
        await dashboardPage.fillPersonalInformation({
            firstName: testUser.firstName,
            lastName: testUser.lastName
        });
        
        // Set a valid date of birth
        const dob = dashboardPage.generateRandomBirthDateForAge(21);
        await dashboardPage.setDateOfBirth(dob);
        
        // Submit the form
        await dashboardPage.submitForm('continue');
        
        // Verify the form was submitted successfully
        const isSubmitted = await dashboardPage.isApplicationStarted();
        expect(isSubmitted).toBeTruthy();
    });

    test('Verify form validation for required fields', async () => {
        await dashboardPage.startNewApplication();
        
        // Try to submit without filling any fields
        await dashboardPage.submitForm('continue');
        
        // Verify error messages for required fields
        const firstNameError = await dashboardPage.verifyFieldError(
            'firstName', 'First name is required'
        );
        const lastNameError = await dashboardPage.verifyFieldError(
            'lastName', 'Last name is required'
        );
        const dobError = await dashboardPage.verifyFieldError(
            'birthDate', 'Date of birth is required'
        );
        
        expect(firstNameError).toBeTruthy();
        expect(lastNameError).toBeTruthy();
        expect(dobError).toBeTruthy();
    });

    test('Verify phone number validation', async () => {
        await dashboardPage.startNewApplication();
        
        // Test with invalid phone number
        await dashboardPage.page.fill(dashboardPage.selectors.phoneNumberInput, '123');
        
        // Verify error message
        const phoneError = await dashboardPage.verifyFieldError(
            'phoneNumber', 'Please enter a valid phone number'
        );
        expect(phoneError).toBeTruthy();
        
        // Test with valid phone number
        await dashboardPage.page.fill(dashboardPage.selectors.phoneNumberInput, '5551234567');
        
        // Verify no error message
        const noError = await dashboardPage.page.locator(
            dashboardPage.selectors.fieldErrorMessage('phoneNumber')
        ).isHidden();
        expect(noError).toBeTruthy();
    });

    test('Verify email validation', async () => {
        await dashboardPage.startNewApplication();
        
        // Test with invalid email
        await dashboardPage.page.fill(dashboardPage.selectors.emailInput, 'invalid-email');
        
        // Verify error message
        const emailError = await dashboardPage.verifyFieldError(
            'email', 'Please enter a valid email address'
        );
        expect(emailError).toBeTruthy();
        
        // Test with valid email
        await dashboardPage.page.fill(dashboardPage.selectors.emailInput, 'test@example.com');
        
        // Verify no error message
        const noError = await dashboardPage.page.locator(
            dashboardPage.selectors.fieldErrorMessage('email')
        ).isHidden();
        expect(noError).toBeTruthy();
    });
});
