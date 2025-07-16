// @ts-check
const { test, expect } = require('@playwright/test');
const LandingPage = require('../pages/LandingPage');
const VerifyEmailPage = require('../pages/VerifyEmailPage');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PreviewPage = require('../pages/PreviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

// Test data for F6 flow: 18yr_NonUS_NonRes_F1_J1_JN
const testData = {
  // User credentials (would be generated/retrieved in real test)
  user: {
    email: `test${Date.now() + 5}@example.com`, // Unique email
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Intl',
    birthDate: '01/01/2005', // 18 years old
  },
  // Personal information
  personalInfo: {
    legalSex: 'Male',
    primaryLanguage: 'English',
    address: {
      street: '789 International Blvd',
      city: 'New York',
      state: 'New York',
      zip: '10001',
      country: 'United States',
      yearsAtAddress: '2',
    },
    phone: '2125551234',
    usCitizenship: 'No', // Non-US citizen
    visaType: 'F1', // F1, J1, or JN visa
    hispanicLatino: 'No',
    // No military status for this flow
    militaryStatus: 'None',
    // Random partner benefits (as per test case)
    partnerBenefits: {
      hasPartnerBenefits: true,
      partnerName: 'Random Partner', // Will be selected randomly
    },
  },
  // Program information
  programInfo: {
    degreeType: 'Bachelor',
    program: 'Computer Science', // Will be randomly selected
    startTerm: 'Fall 2025',
    // Add other program info fields
  },
  // School information
  schoolInfo: {
    highSchoolName: 'International High School',
    highSchoolCity: 'New York',
    highSchoolState: 'New York',
    highSchoolCountry: 'United States',
    graduationDate: '06/2023', // Past graduation
    // Add other school info fields
  },
  // Residency information
  residencyInfo: {
    isArizonaResident: false, // Non-resident
    // Add other residency info fields
  }
};

/**
 * Test suite for F6 Flow: 18yr_NonUS_NonRes_F1_J1_JN
 * This test follows the flow defined in F6_18yr_NonUS_NonRes_F1_J1_JN.xml
 */
test.describe('F6 Flow: 18yr_NonUS_NonRes_F1_J1_JN', () => {
  let landingPage;
  let verifyEmailPage;
  let loginPage;
  let preAppDashboardPage;
  let myInformationPage;
  let myASUProgramPage;
  let mySchoolsPage;
  let myHighSchoolGradesPage;
  let azResidencyPage;
  let reviewPage;
  let previewPage;
  let postAppDashboardPage;

  test.beforeEach(async ({ page }) => {
    // Initialize all page objects
    landingPage = new LandingPage(page);
    verifyEmailPage = new VerifyEmailPage(page);
    loginPage = new LoginPage(page);
    preAppDashboardPage = new PreAppDashboardPage(page);
    myInformationPage = new MyInformationPage(page);
    myASUProgramPage = new MyASUProgramPage(page);
    mySchoolsPage = new MySchoolsPage(page);
    myHighSchoolGradesPage = new MyHighSchoolGradesPage(page);
    azResidencyPage = new AZResidencyPage(page);
    reviewPage = new ReviewPage(page);
    previewPage = new PreviewPage(page);
    postAppDashboardPage = new PostAppSubmissionDashboardPage(page);
  });

  test('Complete F6 flow: 18yr_NonUS_NonRes_F1_J1_JN', async ({ page }) => {
    // Step 1: Navigate to landing page and start application
    await landingPage.navigateToLandingPage();
    await landingPage.verifyPageLoaded();
    
    // Choose random mode of learning and degree type
    await landingPage.chooseRandomMOL();
    await landingPage.selectDegreeType('Bachelor');
    
    // Create account
    await landingPage.createAccount(
      testData.user.firstName,
      testData.user.lastName,
      testData.user.email,
      testData.user.password
    );
    
    // Verify email (in a real test, this would involve checking the email)
    await verifyEmailPage.verifyPageLoaded();
    // Note: In a real test, you would extract the verification code from an email service
    
    // Login with the new account
    await loginPage.navigateToLoginPage();
    await loginPage.login(testData.user.email, testData.user.password);
    
    // Verify pre-application dashboard
    await preAppDashboardPage.verifyPageLoaded();
    
    // Verify age is 18
    await preAppDashboardPage.verifyAgeIs18();
    
    // Start new application
    await preAppDashboardPage.startNewApplication();
    
    // ===== My Information Page =====
    await myInformationPage.verifyPageLoaded();
    
    // Fill personal information with F1/J1/JN visa status
    await myInformationPage.fillPersonalInformation({
      legalSex: testData.personalInfo.legalSex,
      primaryLanguage: testData.personalInfo.primaryLanguage,
      address: testData.personalInfo.address,
      phone: testData.personalInfo.phone,
      usCitizenship: testData.personalInfo.usCitizenship,
      visaType: testData.personalInfo.visaType, // F1, J1, or JN
      hispanicLatino: testData.personalInfo.hispanicLatino,
      militaryStatus: testData.personalInfo.militaryStatus, // None
      // Add other fields as needed
    });
    
    // Apply random partner benefits
    if (testData.personalInfo.partnerBenefits?.hasPartnerBenefits) {
      await myInformationPage.applyRandomPartnerBenefits();
    }
    
    // Save and continue
    await myInformationPage.saveAndContinue();
    
    // ===== My Program Page =====
    await myASUProgramPage.verifyPageLoaded();
    
    // Select random program
    await myASUProgramPage.selectRandomProgram({
      degreeType: testData.programInfo.degreeType,
      startTerm: testData.programInfo.startTerm,
      // Add other fields as needed
    });
    
    // Save and continue
    await myASUProgramPage.saveAndContinue();
    
    // ===== My Schools Page =====
    await mySchoolsPage.verifyPageLoaded();
    
    // Add high school information
    await mySchoolsPage.addHighSchool({
      name: testData.schoolInfo.highSchoolName,
      city: testData.schoolInfo.highSchoolCity,
      state: testData.schoolInfo.highSchoolState,
      country: testData.schoolInfo.highSchoolCountry,
      graduationDate: testData.schoolInfo.graduationDate,
    });
    
    // Add any college/universities if applicable
    await mySchoolsPage.addCollegeOrUniversity({
      // Add college/university details if needed
    });
    
    // Save and continue
    await mySchoolsPage.saveAndContinue();
    
    // ===== My High School Grades Page =====
    await myHighSchoolGradesPage.verifyPageLoaded();
    
    // Use non-resident flow for grades (as per test case)
    await myHighSchoolGradesPage.useNonResidentFlow();
    
    // Save and continue
    await myHighSchoolGradesPage.saveAndContinue();
    
    // ===== Arizona Residency Page =====
    await azResidencyPage.verifyPageLoaded();
    
    // Fill non-resident specific residency information
    await azResidencyPage.fillNonResidentFlow({
      isArizonaResident: testData.residencyInfo.isArizonaResident,
      // Add other non-resident specific fields
    });
    
    // Save and continue
    await azResidencyPage.saveAndContinue();
    
    // ===== Review Page =====
    await reviewPage.verifyPageLoaded();
    
    // Verify all information is correct
    await reviewPage.verifyPersonalInformation(testData.personalInfo);
    await reviewPage.verifyProgramInformation(testData.programInfo);
    await reviewPage.verifySchoolInformation(testData.schoolInfo);
    await reviewPage.verifyResidencyInformation(testData.residencyInfo);
    
    // Acknowledge and proceed
    await reviewPage.acknowledgeAndContinue();
    
    // Handle payment/waiver (random selection as per test case)
    await reviewPage.handlePaymentOrWaiver('random');
    
    // Proceed to preview
    await reviewPage.proceedToPreview();
    
    // ===== Preview Page =====
    await previewPage.verifyPageLoaded();
    
    // Verify all sections in preview
    await previewPage.validatePreview();
    
    // Submit application
    await previewPage.submitApplication();
    
    // ===== Post-Submission Dashboard =====
    await postAppDashboardPage.verifyPageLoaded();
    
    // Verify application status is submitted
    const { status, date } = await postAppDashboardPage.getApplicationStatus();
    expect(status).toMatch(/submitted|completed|in review/i);
    
    // Log the submission date for reference
    console.log(`Application submitted on: ${date}`);
  });
  
  test.afterEach(async ({ page }) => {
    // Clean up: Sign out after each test
    try {
      // Navigate to a page that has the profile menu (like the dashboard)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Click profile icon and sign out
      await page.click('[data-cy="profile-icon"]');
      await page.click('button:has-text("Sign Out")');
      await page.waitForLoadState('networkidle');
    } catch (error) {
      console.log('Cleanup - User was not signed in or sign out failed:', error.message);
    }
  });
});
