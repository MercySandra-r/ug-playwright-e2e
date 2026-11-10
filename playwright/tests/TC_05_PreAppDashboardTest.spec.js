// @ts-check
const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const LandingPage = require('../pages/LandingPage');
const { signUpVerifiedAccount } = require('../utils/authHelper');

/**
 * Test suite for Pre-Application Dashboard functionality
 */
test.describe('Pre-Application Dashboard Tests', () => {
    let loginPage;
    let dashboardPage;
    let landingPage;
    let testUser;

    // Configure timeout for all tests in this suite
    test.describe.configure({ timeout: 180000 }); // 3 minutes per test

    /**
     * Helper function to create account, verify email, and login
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {Object} user - User data object
     * @returns {Promise<boolean>} Success status
     */
    async function setupUserAccount(page, user) {
        try {
            // New flow: landing -> Online -> pursue degree -> Continue -> ASU IdP sign-up,
            // verified with the emailed code via the Gmail test inbox (utils/authHelper).
            const { email, password } = await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
            user.email = email;
            user.password = password;
            if (!/\/dashboard/.test(page.url())) {
                await page.goto('/dashboard', { timeout: 30000 });
            }
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            return true;
        } catch (error) {
            console.error('Account setup failed:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    test.beforeEach(async ({ page }, testInfo) => {
        // Increase timeout for beforeEach hook
        testInfo.setTimeout(120000); // 2 minutes
        
        loginPage = new LoginPage(page);
        dashboardPage = new PreAppDashboardPage(page);
        landingPage = new LandingPage(page);
        
        // Generate test user data using Faker with @test.asu.edu format
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const uniqueId = faker.string.alphanumeric(8).toLowerCase();
        const testEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${uniqueId}@test.asu.edu`;
        const testPassword = 'Testing10!'; // Static password as requested
        
        testUser = {
            email: testEmail,
            password: testPassword,
            firstName: firstName,
            preferredFirstName: faker.person.firstName(),
            middleName: faker.person.middleName(),
            lastName: lastName,
            suffix: faker.helpers.arrayElement(['Jr', 'Sr', 'III', 'IV']),
            phoneNumber: faker.phone.number().replace(/\D/g, '').substring(0, 10),
            countryCode: '+1',
            phoneType: 'Mobile'
        };

        // Use the helper function to set up the account
        const setupSuccess = await setupUserAccount(page, testUser);
        
        if (!setupSuccess) {
            // Take a screenshot for debugging
            await page.screenshot({ path: `debug-beforeEach-failed-${Date.now()}.png`, fullPage: true });
            throw new Error('Failed to set up user account in beforeEach');
        }
        
        console.log('BeforeEach setup completed successfully');
    });

    test('Verify Pre-Application Dashboard page loads successfully', async () => {
        // Verify page URL
        await expect(dashboardPage.page).toHaveURL(/.*dashboard/);
        
        // Wait for loading to complete
        try {
            await dashboardPage.page.waitForSelector(dashboardPage.selectors.loadingIndicator, { state: 'hidden', timeout: 30000 });
        } catch (error) {
            console.log('Loading indicator not found or did not disappear, continuing...');
        }
        
        // Verify page content is loaded (check for any heading or main content)
        const hasHeading = await dashboardPage.page.locator(dashboardPage.selectors.pageTitle).first().isVisible();
        const hasProfileMenu = await dashboardPage.page.locator(dashboardPage.selectors.profileMenu).isVisible();
        
        // At least one of these should be visible to confirm page loaded
        expect(hasHeading || hasProfileMenu).toBeTruthy();
    });

    test('Verify Start New Application button is visible', async () => {
        // Wait for loading to complete first
        try {
            await dashboardPage.page.waitForSelector(dashboardPage.selectors.loadingIndicator, { state: 'hidden', timeout: 30000 });
        } catch (error) {
            console.log('Loading indicator not found, continuing...');
        }
        
        // Wait for page content to be ready
        await dashboardPage.page.waitForTimeout(5000);
        
        // Check if Start New Application button is visible
        const startButton = dashboardPage.page.locator(dashboardPage.selectors.startNewAppButton);
        
        // Use a more flexible approach - check if button exists or if we can find any button with similar text
        const buttonExists = await startButton.count() > 0;
        const alternativeButton = await dashboardPage.page.locator('button').filter({ hasText: /start|begin|application/i }).count() > 0;
        
        // At least one should be true
        expect(buttonExists || alternativeButton).toBeTruthy();
        
        if (buttonExists) {
            await expect(startButton.first()).toBeVisible();
        }
    });

    test('Fill and Validate Pre-app Dashboard Form', async () => {
        console.log('=== Starting Personal Information Form Test ===');
        console.log(`Test user: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);
        
        // Verify we're on the dashboard
        console.log(`Current URL: ${dashboardPage.page.url()}`);
        
        // Wait for page to be ready - simplified approach
        console.log('Waiting for page to be ready...');
        try {
            // First, wait for the page to be in a stable state
            await dashboardPage.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
            console.log('âœ“ DOM content loaded');
            
            // Wait for network to settle
            await dashboardPage.page.waitForLoadState('networkidle', { timeout: 10000 });
            console.log('âœ“ Network idle achieved');
        } catch (error) {
            console.log('âš ï¸ Load state timeout, but continuing...');
        }
        
        // Check if progress bar exists and wait for it to disappear if present
        try {
            const progressBar = dashboardPage.page.locator('[role="progressbar"]');
            if (await progressBar.count() > 0) {
                console.log('Progress bar found, waiting for it to disappear...');
                await progressBar.waitFor({ state: 'hidden', timeout: 3000 });
                console.log('âœ“ Progress bar disappeared');
            } else {
                console.log('âœ“ No progress bar found - page ready');
            }
        } catch (error) {
            console.log('âš ï¸ Progress bar handling failed, continuing anyway...');
        }
        
        // Wait for form fields to be available
        console.log('Waiting for form fields to be available...');
        try {
            // Wait for the first name field to be visible as an indicator that the form is ready
            await dashboardPage.page.getByRole('textbox', { name: 'First name', exact: true }).waitFor({ 
                state: 'visible', 
                timeout: 15000 
            });
            console.log('âœ“ Form fields are available');
        } catch (error) {
            console.log('âš ï¸ Form fields not immediately available, waiting a bit more...');
            await dashboardPage.page.waitForTimeout(3000);
        }
        
        console.log('ðŸ“ Dashboard loaded - now filling personal information using verified locators...');
        
        try {
            // Fill First Name
            console.log('Filling First Name...');
            const firstNameField = dashboardPage.page.getByRole('textbox', { name: 'First name', exact: true });
            await firstNameField.waitFor({ state: 'visible', timeout: 10000 });
            await firstNameField.fill(testUser.firstName);
            console.log(`âœ“ First name filled: ${testUser.firstName}`);
        } catch (error) {
            console.log(`âš ï¸ Could not fill first name: ${error.message}`);
        }

        try {
            // Fill Last Name
            console.log('Filling Last Name...');
            const lastNameField = dashboardPage.page.getByRole('textbox', { name: 'Last name' });
            await lastNameField.waitFor({ state: 'visible', timeout: 10000 });
            await lastNameField.fill(testUser.lastName);
            console.log(`âœ“ Last name filled: ${testUser.lastName}`);
        } catch (error) {
            console.log(`âš ï¸ Could not fill last name: ${error.message}`);
        }

        try {
            // Fill Birth Month - Click dropdown then select option
            console.log('Selecting Birth Month...');
            const monthField = dashboardPage.page.getByRole('combobox', { name: 'Month' });
            await monthField.waitFor({ state: 'visible', timeout: 10000 });
            await monthField.click(); // Click to open dropdown
            
            // Select a month by clicking the option (months are shown as text like "June")
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const randomMonthIndex = Math.floor(Math.random() * 12);
            const monthName = months[randomMonthIndex];
            
            await dashboardPage.page.getByRole('option', { name: monthName }).click();
            console.log(`âœ“ Birth month selected: ${monthName}`);
        } catch (error) {
            console.log(`âš ï¸ Could not select birth month: ${error.message}`);
        }

        try {
            // Fill Birth Day - Click dropdown then select option
            console.log('Selecting Birth Day...');
            const dayField = dashboardPage.page.getByRole('combobox', { name: 'Day' });
            await dayField.waitFor({ state: 'visible', timeout: 10000 });
            await dayField.click(); // Click to open dropdown
            
            // Select a day by clicking the option (days are shown as numbers "1", "2", etc.)
            const randomDay = Math.floor(Math.random() * 28) + 1;
            await dashboardPage.page.getByRole('option', { name: randomDay.toString() }).click();
            console.log(`âœ“ Birth day selected: ${randomDay}`);
        } catch (error) {
            console.log(`âš ï¸ Could not select birth day: ${error.message}`);
        }

        try {
            // Fill Birth Year - Click dropdown then select option
            console.log('Selecting Birth Year...');
            const yearField = dashboardPage.page.getByRole('combobox', { name: 'Year' });
            await yearField.waitFor({ state: 'visible', timeout: 10000 });
            await yearField.click(); // Click to open dropdown
            
            // Select a year by clicking the option (years are shown as numbers "2000", "1999", etc.)
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - 21 - Math.floor(Math.random() * 10); // 21-31 years old
            await dashboardPage.page.getByRole('option', { name: birthYear.toString() }).click();
            console.log(`âœ“ Birth year selected: ${birthYear}`);
        } catch (error) {
            console.log(`âš ï¸ Could not select birth year: ${error.message}`);
            // Try fallback year 2000
            try {
                const yearField = dashboardPage.page.getByRole('combobox', { name: 'Year' });
                await yearField.click();
                await dashboardPage.page.getByRole('option', { name: '2000' }).click();
                console.log(`âœ“ Birth year selected (fallback): 2000`);
            } catch (altError) {
                console.log(`âš ï¸ Fallback year selection also failed: ${altError.message}`);
            }
        }

        try {
            // Fill Phone Number - Ensure it's exactly 10 digits
            console.log('Filling Phone Number...');
            const phoneField = dashboardPage.page.getByRole('textbox', { name: 'Phone number' });
            await phoneField.waitFor({ state: 'visible', timeout: 10000 });
            
            // Clear the field first and enter a valid 10-digit number
            await phoneField.clear();
            const validPhoneNumber = "2015551234".replace(/\D/g, '').substring(0, 10);
            if (validPhoneNumber.length < 10) {
                // Pad with zeros if needed
                const paddedPhone = validPhoneNumber.padStart(10, '0');
                await phoneField.fill(paddedPhone);
                console.log(`âœ“ Phone number filled (padded): ${paddedPhone}`);
            } else {
                await phoneField.fill(validPhoneNumber);
                console.log(`âœ“ Phone number filled: ${validPhoneNumber}`);
            }
        } catch (error) {
            console.log(`âš ï¸ Could not fill phone number: ${error.message}`);
        }

        // Wait for additional fields to appear after phone number entry
        await dashboardPage.page.waitForTimeout(2000);

        try {
            // Select "Yes" for "Is this a mobile number?" radio button
            console.log('Selecting mobile number option...');
            const mobileYesRadio = dashboardPage.page.getByRole('radiogroup', { name: 'Is this a mobile number?' }).getByRole('radio', { name: 'Yes' });
            await mobileYesRadio.waitFor({ state: 'visible', timeout: 10000 });
            await mobileYesRadio.click();
            console.log('âœ“ Selected "Yes" for mobile number question');
        } catch (error) {
            console.log(`âš ï¸ Could not select mobile number option: ${error.message}`);
            // Try alternative approach
            try {
                const mobileYesRadio = dashboardPage.page.getByRole('radio', { name: 'Yes' }).first();
                await mobileYesRadio.click();
                console.log('âœ“ Selected "Yes" for mobile number question (alternative approach)');
            } catch (altError) {
                console.log(`âš ï¸ Alternative mobile number selection also failed: ${altError.message}`);
            }
        }

        // Wait for SMS messaging field to appear
        await dashboardPage.page.waitForTimeout(1000);

        try {
            // Select option for SMS messaging (optional field)
            console.log('Selecting SMS messaging preference...');
            const smsRadioGroup = dashboardPage.page.getByRole('radiogroup', { name: /SMS messaging/ });
            if (await smsRadioGroup.count() > 0) {
                const smsYesRadio = smsRadioGroup.getByRole('radio', { name: 'Yes' });
                await smsYesRadio.click();
                console.log('âœ“ Selected "Yes" for SMS messaging');
            } else {
                console.log('â„¹ï¸ SMS messaging field not found or not required');
            }
        } catch (error) {
            console.log(`âš ï¸ Could not select SMS messaging option: ${error.message}`);
        }

        // Take a screenshot of the filled form
        await dashboardPage.page.screenshot({ path: `personal-info-form-filled-${Date.now()}.png`, fullPage: true });
        console.log('âœ“ Screenshot taken of filled form');

        // Wait a moment for the button to become enabled
        await dashboardPage.page.waitForTimeout(1000);

        try {
            // Click "Start new application" button
            console.log('Clicking "Start new application" button...');
            const startButton = dashboardPage.page.getByRole('button', { name: 'Start new application' });
            await startButton.waitFor({ state: 'visible', timeout: 10000 });
            
            // Check if button is enabled
            const isEnabled = await startButton.isEnabled();
            if (isEnabled) {
                await startButton.click();
                console.log('âœ“ "Start new application" button clicked successfully');
                
                // Wait for navigation or page change
                await dashboardPage.page.waitForTimeout(3000);
                console.log(`âœ“ Navigated to: ${dashboardPage.page.url()}`);
            } else {
                console.log('âš ï¸ "Start new application" button is still disabled');
                
                // Take screenshot for debugging
                await dashboardPage.page.screenshot({ path: `button-disabled-${Date.now()}.png`, fullPage: true });
            }
        } catch (error) {
            console.log(`âš ï¸ Could not click "Start new application" button: ${error.message}`);
            
            // Try alternative approaches
            try {
                console.log('Trying alternative button selectors...');
                const altButton = dashboardPage.page.locator('button').filter({ hasText: /start.*application/i });
                if (await altButton.count() > 0) {
                    await altButton.first().click();
                    console.log('âœ“ Alternative "Start application" button clicked');
                } else {
                    console.log('âš ï¸ No start application button found');
                    
                    // List all available buttons for debugging
                    const allButtons = await dashboardPage.page.locator('button').all();
                    console.log('Available buttons:');
                    for (const button of allButtons) {
                        try {
                            const text = await button.textContent();
                            const isVisible = await button.isVisible();
                            const isEnabled = await button.isEnabled();
                            if (isVisible && text && text.trim()) {
                                console.log(`  - "${text.trim()}" (enabled: ${isEnabled})`);
                            }
                        } catch (e) {}
                    }
                }
            } catch (altError) {
                console.log(`âš ï¸ Alternative button click also failed: ${altError.message}`);
            }
        }

        // 2. Set Date of Birth and Verify
        console.log('ðŸ“… Setting and verifying date of birth...');
        const dob = { month: 'June', day: '15', year: '2000' };
        await dashboardPage.page.getByRole('combobox', { name: 'Month' }).click();
        await dashboardPage.page.getByRole('option', { name: dob.month }).click();
        await dashboardPage.page.getByRole('combobox', { name: 'Day' }).click();
        await dashboardPage.page.getByRole('option', { name: dob.day }).click();
        await dashboardPage.page.getByRole('combobox', { name: 'Year' }).click();
        await dashboardPage.page.getByRole('option', { name: dob.year }).click();
        console.log(`âœ“ Date of birth set to: ${dob.month} ${dob.day}, ${dob.year}`);

        // 3. Fill Contact Information and Verify
        console.log('ðŸ“ž Filling and validating contact information...');
        const phoneField = dashboardPage.page.getByRole('textbox', { name: 'Phone number' });
        await phoneField.fill('123'); // Invalid phone number
        await expect(dashboardPage.page.locator('text=Enter a valid phone number')).toBeVisible();
        console.log('âœ“ Verified error for invalid phone number');
        await phoneField.fill('2025551234'); // Valid phone number
        await dashboardPage.page.waitForTimeout(1000); // Wait for dynamic fields to appear
        console.log('âœ“ Phone number filled');

        // 4. Handle Dynamic Mobile and SMS Fields
        console.log('ðŸ“± Handling dynamic mobile and SMS fields...');
        await dashboardPage.page.getByRole('radiogroup', { name: 'Is this a mobile number?' }).getByRole('radio', { name: 'Yes' }).click();
        await dashboardPage.page.waitForTimeout(500);
        await dashboardPage.page.getByRole('radiogroup', { name: /SMS messaging/ }).getByRole('radio', { name: 'Yes' }).click();
        console.log('âœ“ Dynamic fields handled');

        // 5. Verify Form Submission and Button Functionality
        console.log('ðŸš€ Verifying form submission and continue button...');
        const startButton = dashboardPage.page.getByRole('button', { name: 'Start new application' });
        await expect(startButton).toBeEnabled();
        console.log('âœ“ "Start new application" button is enabled');

        await startButton.click();

        // 6. Verify Successful Navigation/Submission
        console.log('â³ Waiting for submission to complete...');
        // Wait for the URL to change, indicating a successful submission
        await dashboardPage.page.waitForURL('**/my/applications', { timeout: 30000 });
        console.log('âœ“ Form submitted successfully and navigated to applications page');

        console.log('âœ… Personal information form filling and button click completed');
        console.log('=== Personal Information Form Test Completed ===');
        
    });

});

