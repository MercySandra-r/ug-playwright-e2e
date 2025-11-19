// @ts-check
const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const LoginPage = require('../pages/LoginPage');
const ResetPasswordPage = require('../pages/ResetPasswordPage');
const LandingPage = require('../pages/LandingPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');

/**
 * Test suite for Login functionality
 */
test.describe('Login Tests', () => {
    let loginPage;
    let resetPasswordPage;
    const testEmail = process.env.TEST_EMAIL || 'myah.koepp@test.asu.edu';
    const testPassword = process.env.TEST_PASSWORD || 'Testing10!';
    const invalidEmail = 'invalid-email';
    const nonExistentEmail = 'nonexistent@example.com';
    const invalidPassword = 'short';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        resetPasswordPage = new ResetPasswordPage(page);
        
        // Navigate to the login page before each test
        await loginPage.navigateToLoginPage();
    });

    test('Verify login page elements', async () => {
        // Verify page title
        await expect(loginPage.page.locator(loginPage.selectors.pageTitle))
            .toHaveText('Log in to continue');
            
        // Verify all required elements are visible
        await expect(loginPage.page.getByRole('textbox', { name: 'Email' })).toBeVisible();
        await expect(loginPage.page.getByRole('textbox', { name: 'Password' })).toBeVisible();
        await expect(loginPage.page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.loginWithAsuriteButton)).toBeVisible();
        await expect(loginPage.page.getByRole('link', { name: 'Create an account' })).toBeVisible();
        await expect(loginPage.page.locator(loginPage.selectors.resetPasswordLink)).toBeVisible();
    });

    test('Verify login with invalid email format', async () => {
        // Enter invalid email and any password
        await loginPage.enterCredentials(invalidEmail, 'anypassword');
        
        // Verify invalid email validation message is displayed
        const isErrorVisible = await loginPage.isInvalidEmailFormatErrorVisible();
        expect(isErrorVisible).toBeTruthy();
        
        // Note: Login button remains enabled - validation happens on submit
        // This is the expected behavior for this application
    });

    test('Verify login with non-existent email', async () => {
        // Enter non-existent email and any password
        await loginPage.enterCredentials(nonExistentEmail, 'anypassword');
        await loginPage.clickLogin();
        
        // Wait for error message to appear after login attempt
        await loginPage.page.waitForSelector('text=Incorrect email or password.', { timeout: 70000 });
        
        // Verify "Incorrect email or password." error message is displayed
        const isErrorVisible = await loginPage.page.getByText('Incorrect email or password.').isVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify login with incorrect password', async () => {
        // Enter valid email but incorrect password
        await loginPage.enterCredentials(testEmail, 'IncorrectPassword123!');
        await loginPage.clickLogin();
        
        // Wait for error message to appear after login attempt
        await loginPage.page.waitForSelector('text=Incorrect email or password.', { timeout: 10000 });
        
        // Verify "Incorrect email or password." error message is displayed
        const isErrorVisible = await loginPage.page.getByText('Incorrect email or password.').isVisible();
        expect(isErrorVisible).toBeTruthy();
    });

    test('Verify login with ASURITE', async () => {
        // Click the Log In with ASURITE button
        await loginPage.clickLoginWithAsurite();
        
        // Verify ASURITE login page is displayed
        const isAsuLoginPage = await loginPage.isAsuLoginPageDisplayed();
        expect(isAsuLoginPage).toBeTruthy();
    });

    test('Verify create account link', async () => {
        // Click the create account link
        await loginPage.clickCreateAccountLink();
        
        // Verify navigation to create account page
        await expect(loginPage.page).toHaveURL("https://apply-qa.apps.asu.edu/user/create");
    });

    test('Verify reset password link', async () => {
        // Click the reset password link
        await loginPage.clickResetPasswordLink();
        
        // Verify navigation to reset password page
        await expect(loginPage.page).toHaveURL(/.*\/user\/reset-password/);
    });

    test('Verify successful login with valid credentials', async ({ page }) => {
        // Generate unique test credentials for account creation
        const timestamp = Date.now();
        const testAccountEmail = `testuser${timestamp}@test.asu.edu`;
        const testAccountPassword = 'TestPassword123!';
        
        // Step 1: Navigate to landing page and create a new account
        await page.goto('https://apply-qa.apps.asu.edu/');
        await page.waitForLoadState('networkidle');
        
        // Select Mode of Learning (Online)
        await page.getByRole('radio', { name: 'Online' }).click();
        
        // Select Admit Type (Degree seeking)
        await page.getByRole('radio', { name: 'Yes, I want to pursue an associate or bachelor\'s degree' }).click();
        
        // Wait for account creation form to appear
        await page.waitForSelector('input[placeholder="Enter your email address"]', { timeout: 10000 });
        
        // Fill account creation form
        await page.getByPlaceholder('Enter your email address').fill(testAccountEmail);
        await page.getByPlaceholder('Retype your email address').fill(testAccountEmail);
        await page.getByPlaceholder('Enter a password').fill(testAccountPassword);
        await page.getByPlaceholder('Retype your password').fill(testAccountPassword);
        
        // Create the account
        await page.getByRole('button', { name: 'Create account' }).click();
        await page.waitForLoadState('networkidle');
        
        // Verify we reach the email verification page
        await expect(page.getByRole('heading', { name: 'Step 1: Check your email' })).toBeVisible();
        
        // Step 2: Navigate to login page and login with the created credentials
        await loginPage.navigateToLoginPage();
        
        // Perform login with the newly created credentials
        const isLoggedIn = await loginPage.login(testAccountEmail, testAccountPassword);
        
        // Verify login was successful
        expect(isLoggedIn).toBeTruthy();
        
        // Additional verification of dashboard elements
        const isDashboardVisible = await loginPage.isDashboardDisplayed();
        expect(isDashboardVisible).toBeTruthy();
    });

    test('Verify login form validation', async () => {
        // Test empty email and password
        await loginPage.clickLogin();
        
        // Verify validation messages are displayed for required fields
        const isEmailValidationVisible = await loginPage.page.getByText('Email is required.').isVisible();
        const isPasswordValidationVisible = await loginPage.page.getByRole('alert').filter({ hasText: 'Password is required.' }).isVisible();
        
        // Check if the required validation messages are shown
        expect(isEmailValidationVisible).toBeTruthy();
        expect(isPasswordValidationVisible).toBeTruthy();
    });

    test('Verify pre-application dashboard page loads successfully after account creation and login', async ({ page }) => {
        let landingPage;
        let preAppDashboardPage;
        let testLoginPage;
        
        try {
            // Initialize page objects
            landingPage = new LandingPage(page);
            preAppDashboardPage = new PreAppDashboardPage(page);
            testLoginPage = new LoginPage(page);
            
            // Generate unique test credentials using Faker with @test.asu.edu format
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const uniqueId = faker.string.alphanumeric(8).toLowerCase();
            const testAccountEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${uniqueId}@test.asu.edu`;
            const testAccountPassword = 'Testing10!'; // Static password as requested
            
            // Validate email format using LoginPage validation method
            const isValidEmail = testLoginPage.isValidEmail(testAccountEmail);
            expect(isValidEmail).toBeTruthy();
            console.log(`Generated email validation passed: ${testAccountEmail}`);
            
            // Validate password meets requirements using LoginPage validation method
            const isValidPassword = testLoginPage.isValidPassword(testAccountPassword);
            expect(isValidPassword).toBeTruthy();
            console.log(`Password validation passed: ${testAccountPassword}`);
            
            console.log(`Creating account with validated email: ${testAccountEmail}`);
            
            // Step 1: Navigate to landing page and create a new account
            await landingPage.navigateToLandingPage();
            await landingPage.waitForPageLoad();
            
            // Select Mode of Learning (Online)
            await page.getByRole('radio', { name: 'Online' }).click();
            await page.waitForTimeout(1000); // Wait for UI to update
            
            // Select Admit Type (Degree seeking)
            await page.getByRole('radio', { name: 'Yes, I want to pursue an associate or bachelor\'s degree' }).click();
            await page.waitForTimeout(1000); // Wait for form to appear
            
            // Wait for account creation form to appear
            await page.waitForSelector('input[placeholder="Enter your email address"]', { timeout: 10000 });
            
            // Fill account creation form
            await page.getByPlaceholder('Enter your email address').fill(testAccountEmail);
            await page.getByPlaceholder('Retype your email address').fill(testAccountEmail);
            await page.getByPlaceholder('Enter a password').fill(testAccountPassword);
            await page.getByPlaceholder('Retype your password').fill(testAccountPassword);
            
            // Create the account
            await page.getByRole('button', { name: 'Create account' }).click();
            await page.waitForLoadState('networkidle');
            
            // Verify we reach the email verification page
            await expect(page.getByRole('heading', { name: 'Step 1: Check your email' })).toBeVisible({ timeout: 15000 });
            console.log('Account created successfully, reached email verification page');
            
            // Step 2: Navigate to login page and login with the created credentials
            await testLoginPage.navigateToLoginPage();
            
            // Perform login with the newly created credentials
            console.log(`Logging in with email: ${testAccountEmail}`);
            const isLoggedIn = await testLoginPage.login(testAccountEmail, testAccountPassword);
            
            // Verify login was successful
            expect(isLoggedIn).toBeTruthy();
            console.log('Login successful');
            
            // Step 3: Verify pre-application dashboard page loads successfully
            // Check if we're redirected to the dashboard or if we need to navigate
            const currentUrl = page.url();
            console.log(`Current URL after login: ${currentUrl}`);
            
            // If not already on dashboard, navigate to it
            if (!currentUrl.includes('dashboard')) {
                await preAppDashboardPage.navigateToDashboard();
            }
            
            // Verify the pre-application dashboard page is loaded
            await preAppDashboardPage.verifyPageLoaded();
            console.log('Pre-application dashboard page loaded successfully');
            
            // Additional verification - check for key dashboard elements
            const isDashboardVisible = await testLoginPage.isDashboardDisplayed();
            expect(isDashboardVisible).toBeTruthy();
            
            // Verify page title contains expected text
            await expect(page).toHaveTitle(/Arizona State University/);
            
            console.log('All verifications passed - pre-application dashboard page loads successfully');
            
        } catch (error) {
            console.error('Test failed with error:', error);
            
            // Take a screenshot for debugging
            await page.screenshot({ 
                path: `test-failure-${Date.now()}.png`, 
                fullPage: true 
            });
            
            throw error;
        }
    });
});
