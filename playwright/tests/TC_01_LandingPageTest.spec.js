// @ts-check
const { test, expect } = require('@playwright/test');
const LandingPage = require('../pages/LandingPage');
const FooterLinksPage = require('../pages/FooterLinksPage');

test.describe('Landing Page Tests', () => {
  let landingPage;
  let footerLinksPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    footerLinksPage = new FooterLinksPage(page);
    
    // Navigate to the landing page before each test
    await landingPage.navigateToLandingPage();
  });

  test('Verify footer links', async () => {
    // This test corresponds to verifyFooter() in the original test
    await footerLinksPage.validateFooterLinks();
  });

  test('Verify landing page elements and navigation', async ({ page }) => {
    // This test corresponds to verifyLandingPage() in the original test
    await test.step('should validate view application details', async () => {
      await landingPage.validateViewAppDetails();
    });
    
    await test.step('should validate create account functionality', async () => {
      await landingPage.validateCreateAccount();
    });
    
    await test.step('should validate login functionality', async () => {
      await landingPage.validateLoginFunctionality();
    });
    
    // Choose a random MOL option
    await test.step('should allow selecting a random MOL option', async () => {
      const selectedMOL = await landingPage.chooseRandomMOL();
      expect(selectedMOL).toBeTruthy();
      expect(selectedMOL).toMatch(/In-person|Online/i);
    });
  });

  test('Choose In-person MOL option', async ({ page }) => {
    // This test corresponds to ChooseInperson_MOL() in the original test
    await test.step('should select in-person MOL option', async () => {
      const selectedMOL = await landingPage.chooseInPersonMOL();
      expect(selectedMOL).toBeTruthy();
      // Use case-insensitive check
      expect(selectedMOL.toLowerCase()).toContain('in-person');
    });
  });

  test('Choose Online MOL option', async ({ page }) => {
    // This test corresponds to ChooseOnline_MOL() in the original test
    await test.step('should select online MOL option', async () => {
      const selectedMOL = await landingPage.chooseOnlineMOL();
      expect(selectedMOL).toBeTruthy();
      expect(selectedMOL.toLowerCase()).toContain('online');
    });
  });

  test('Choose random MOL option', async ({ page }) => {
    // This test corresponds to ChooseRandom_MOL() in the original test
    await test.step('should select a random MOL option', async () => {
      const selectedMOL = await landingPage.chooseRandomMOL();
      expect(selectedMOL).toBeTruthy();
      expect(selectedMOL).toMatch(/In-person|Online/i);
    });
  });
  

  test('Enter valid account details', async ({ page }) => {
    // This test corresponds to writeValidDetails() in the original test
    const email = 'test.user@example.com';
    const password = 'Test1234Password';
    
    // First select a MOL to make email fields visible
    await landingPage.chooseRandomMOL();
    
    await landingPage.enterAccountInfo(email, email, password, password);
    const isValid = await landingPage.validateAccountInputs(email, email, password, password);
    expect(isValid).toBeTruthy();
  });

  test('Create random account with valid details', async ({ page }) => {
    // This test corresponds to CreateRandomAccTest() in the original test
    const credentials = await landingPage.createRandomAccount();
    expect(credentials.email).toBeTruthy();
    expect(credentials.password).toBeTruthy();
    
    const isValid = await landingPage.validateAccountInputs(
      credentials.email, 
      credentials.email, 
      credentials.password, 
      credentials.password
    );
    expect(isValid).toBeTruthy();
  });

  test.describe('Create Account Test Scenarios', () => {
    // This test group corresponds to createAccountTest() in the original test
    const testCases = [
      {
        name: 'Valid credentials',
        data: {
          email: 'valid.user@example.com',
          reemail: 'valid.user@example.com',
          password: 'ValidPassword123',
          repassword: 'ValidPassword123',
          expectValid: true
        }
      },
      {
        name: 'Invalid email format',
        data: {
          email: 'invalid-email',
          reemail: 'invalid-email',
          password: 'ValidPassword123',
          repassword: 'ValidPassword123',
          expectValid: false
        }
      },
      {
        name: 'Email mismatch',
        data: {
          email: 'user1@example.com',
          reemail: 'user2@example.com',
          password: 'ValidPassword123',
          repassword: 'ValidPassword123',
          expectValid: false
        }
      },
      {
        name: 'Password too short',
        data: {
          email: 'valid.user@example.com',
          reemail: 'valid.user@example.com',
          password: 'Short1',
          repassword: 'Short1',
          expectValid: false
        }
      },
      {
        name: 'Password without number',
        data: {
          email: 'valid.user@example.com',
          reemail: 'valid.user@example.com',
          password: 'NoNumbersPassword',
          repassword: 'NoNumbersPassword',
          expectValid: false
        }
      },
      {
        name: 'Password without uppercase',
        data: {
          email: 'valid.user@example.com',
          reemail: 'valid.user@example.com',
          password: 'nouppercase123',
          repassword: 'nouppercase123',
          expectValid: false
        }
      },
      {
        name: 'Password without lowercase',
        data: {
          email: 'valid.user@example.com',
          reemail: 'valid.user@example.com',
          password: 'NOLOWERCASE123',
          repassword: 'NOLOWERCASE123',
          expectValid: false
        }
      }
    ];

    for (const { name, data } of testCases) {
      test(`Create account with ${name}`, async ({ page }) => {
        // First select a MOL to make email fields visible
        await landingPage.chooseRandomMOL();
        
        await landingPage.enterAccountInfo(
          data.email, 
          data.reemail, 
          data.password, 
          data.repassword
        );
        
        await page.waitForTimeout(3000); // Wait for validation to complete
        
        const isValid = await landingPage.validateAccountInputs(
          data.email, 
          data.reemail, 
          data.password, 
          data.repassword
        );
        
        expect(isValid).toBe(data.expectValid);
        
        // Click create account button for valid credentials
        if (data.expectValid === true) {
          await landingPage.submitAccountForm();
        }
      });
    }
  });

  // test('Verify recaptcha presence', async ({ page }) => {
  //   // This test corresponds to recaptchaTest() in the original test
  //   const isRecaptchaPresent = await landingPage.verifyRecaptchaPresent();
  //   expect(isRecaptchaPresent).toBeTruthy();
  // });
});
