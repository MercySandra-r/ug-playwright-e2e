// @ts-check
const { test, expect } = require('@playwright/test');
const LandingPage = require('../pages/LandingPage');
const VerifyEmailPage = require('../pages/VerifyEmailPage');
const testDataLoader = require('../utils/testDataLoader');

/**
 * Test suite for Email Verification functionality
 */
test.describe('Email Verification Tests', () => {
    let landingPage;
    let verifyEmailPage;
    let testEmail;
    let testPassword;

    test.beforeEach(async ({ page }) => {
        landingPage = new LandingPage(page);
        verifyEmailPage = new VerifyEmailPage(page);
        
        // Generate unique test data for each test
        const timestamp = new Date().getTime();
        testEmail = `test.user${timestamp}@test.asu.edu`;
        testPassword = 'ValidPassword123';
        
        // Navigate through the complete account creation flow to reach email verification
        await landingPage.navigateToLandingPage();
        
        // Wait a moment for page to load completely
        await page.waitForTimeout(2000);
        
        // Try to make selections if radio buttons are available
        try {
            const inPersonRadio = page.getByRole('radio', { name: /In-person.*I want to/ });
            if (await inPersonRadio.isVisible()) {
                await inPersonRadio.click();
                console.log('Selected In-Person MOL');
            }
        } catch (error) {
            console.log('In-Person radio not available or already selected');
        }
        
        try {
            const degreeRadio = page.getByRole('radio', { name: /Yes, I want to pursue an/ });
            if (await degreeRadio.isVisible()) {
                await degreeRadio.click();
                console.log('Selected degree pursuit option');
            }
        } catch (error) {
            console.log('Degree radio not available or already selected');
        }
        
        // Wait for the account creation form to be visible (regardless of how we got here)
        await page.waitForSelector('input[placeholder="Enter your email address"]', { state: 'visible', timeout: 20000 });
        
        // Fill in the account creation form
        await page.getByRole('textbox', { name: 'Enter your email' }).fill(testEmail);
        await page.getByRole('textbox', { name: 'Confirm your email' }).fill(testEmail);
        await page.getByRole('textbox', { name: 'Create a password' }).fill(testPassword);
        await page.getByRole('textbox', { name: 'Confirm your password' }).fill(testPassword);
        
        // Submit the form
        await page.getByRole('button', { name: 'Create account' }).click();
        
        // Wait for navigation to verify email page
        await page.waitForURL('**/user/verify-email', { timeout: 30000 });
    });

    test('Verify email page elements', async ({ page }) => {
        // Verify the email verification page is displayed
        await expect(page).toHaveURL(/.*verify-email/);
        await expect(page.getByRole('heading', { name: 'Step 1: Check your email' })).toBeVisible();
        
        // Verify email is displayed
        await expect(page.getByText(testEmail)).toBeVisible();
        
        // Verify login button is visible
        await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    });

    test('Verify resend email functionality', async ({ page }) => {
        // Click resend email button
        await page.getByRole('button', { name: 'Resend email verification' }).click();
        
        // Note: In a real environment, you might want to verify a success message
        // For now, we'll just verify the button is still visible after clicking
        await expect(page.getByRole('button', { name: 'Resend email verification' })).toBeVisible();
    });

    test('Verify login navigation', async ({ page }) => {
        // Click login button
        await page.getByRole('button', { name: 'Log in' }).click();
        
        // Verify navigation to login page
        await expect(page).toHaveURL(/.*login/);
    });

    test('Verify back button navigation', async ({ page }) => {
        // Go back to previous page
        await page.goBack();
        
        // Verify we're not on the verify email page anymore
        await expect(page).not.toHaveURL(/.*verify-email/);
    });

    test('Verify app details section', async ({ page }) => {
        // Verify app details section is visible
        await expect(page.getByRole('region', { name: 'Application details' })).toBeVisible();
    });

    test('Create account with valid credentials and verify email', async ({ page }) => {
        // This test uses a fresh account creation flow without beforeEach setup
        const timestamp = new Date().getTime();
        const uniqueTestEmail = `test.user${timestamp}@test.asu.edu`;
        const uniqueTestPassword = 'ValidPassword123';
        
        try {
            // Step 1: Navigate to the landing page
            await landingPage.navigateToLandingPage();
            
            // Step 2: Wait a moment for page to load completely
            await page.waitForTimeout(3000);
            
            // Step 3: Try to make selections if radio buttons are available
            try {
                const inPersonRadio = page.getByRole('radio', { name: /In-person.*I want to/ });
                if (await inPersonRadio.isVisible()) {
                    await inPersonRadio.click();
                    console.log('Selected In-Person MOL');
                    await page.waitForTimeout(1000); // Wait for UI to update
                }
            } catch (error) {
                console.log('In-Person radio not available or already selected');
            }
            
            try {
                const degreeRadio = page.getByRole('radio', { name: /Yes, I want to pursue an/ });
                if (await degreeRadio.isVisible()) {
                    await degreeRadio.click();
                    console.log('Selected degree pursuit option');
                    await page.waitForTimeout(1000); // Wait for UI to update
                }
            } catch (error) {
                console.log('Degree radio not available or already selected');
            }
            
            // Step 4: Wait for the account creation form to be visible
            await page.waitForSelector('input[placeholder="Enter your email address"]', { state: 'visible', timeout: 30000 });
            
            // Step 5: Fill in the account creation form
            await page.getByRole('textbox', { name: 'Enter your email' }).fill(uniqueTestEmail);
            await page.getByRole('textbox', { name: 'Confirm your email' }).fill(uniqueTestEmail);
            await page.getByRole('textbox', { name: 'Create a password' }).fill(uniqueTestPassword);
            await page.getByRole('textbox', { name: 'Confirm your password' }).fill(uniqueTestPassword);
            
            // Step 6: Submit the form
            await page.getByRole('button', { name: 'Create account' }).click();
            
            // Step 7: Wait for navigation to verify email page
            await page.waitForURL('**/user/verify-email', { timeout: 45000 });
            
            // Step 8: Verify the email verification page is displayed
            await expect(page).toHaveURL(/.*verify-email/);
            await expect(page.getByRole('heading', { name: 'Step 1: Check your email' })).toBeVisible();
            
            // Step 9: Verify the correct email is displayed on the verification page
            await expect(page.getByText(uniqueTestEmail)).toBeVisible();
            
            // Step 10: Verify resend email button is visible
            await expect(page.getByRole('button', { name: 'Resend email verification' })).toBeVisible();
            
            // Step 11: Verify login button is visible
            await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
            
            // Step 12: Verify Step 2 heading is present
            await expect(page.getByRole('heading', { name: 'Step 2: Return to the login page' })).toBeVisible();
            
            // Step 13: Verify application details section is visible
            await expect(page.getByRole('region', { name: 'Application details' })).toBeVisible();
            
            // Step 14: Test resend email functionality
            await page.getByRole('button', { name: 'Resend email verification' }).click();
            // Note: In a real test, you might want to verify a success message appears
            
        } catch (error) {
            console.error('Test failed:', error);
            // Take a screenshot on failure
            await page.screenshot({ path: `test-results/create-account-verify-email-error-${timestamp}.png` });
            throw error;
        }
    });
});
