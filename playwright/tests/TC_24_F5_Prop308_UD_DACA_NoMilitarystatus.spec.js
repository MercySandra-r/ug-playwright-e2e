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

// Test data for F5 flow: Prop308_UD_DACA_NoMilitarystatus
const testData = {
  // User credentials (would be generated/retrieved in real test)
  user: {
    email: `test${Date.now() + 4}@example.com`, // Unique email
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'DACA',
    birthDate: '01/01/2000', // Random age
  },
  // Personal information
  personalInfo: {
    legalSex: 'Non-Binary',
    primaryLanguage: 'English',
    address: {
      street: '123 DACA Blvd',
      city: 'Phoenix',
      state: 'Arizona',
      zip: '85001',
      country: 'United States',
      yearsAtAddress: '5',
    },
    phone: '6025551234',
    usCitizenship: 'No', // Non-US citizen
    visaType: 'DACA', // DACA status
    hispanicLatino: 'Yes', // Common for DACA recipients
    // No military status for this flow
    militaryStatus: 'None',
    // Random partner benefits (as per test case)
    partnerBenefits: {
      hasPartnerBenefits: true,
      partnerName: 'Random Partner', // Will be selected randomly
    },
    // ASU affiliate information
    asuAffiliate: {
      isAffiliate: true,
      asuId: `ASU${Math.floor(10000000 + Math.random() * 90000000)}`,
    },
  },
  // Program information
  programInfo: {
    degreeType: 'Bachelor',
    program: 'Computer Science', // Will be randomly selected
    startTerm: 'Spring 2026',
    // Add other program info fields
  },
  // School information
  schoolInfo: {
    highSchoolName: 'Test High School',
    highSchoolCity: 'Phoenix',
    highSchoolState: 'Arizona',
    highSchoolCountry: 'United States',
    // Add other school info fields
  },
  // Residency information
  residencyInfo: {
    isArizonaResident: true, // For Prop 308 eligibility
    // Add other residency info fields
  }
};

/**
 * Test suite for F5 Flow: Prop308_UD_DACA_NoMilitarystatus
 * This test follows the flow defined in F5_Prop308_UD_DACA_NoMilitarystatus.xml
 */
test.describe('F5 Flow: Prop308_UD_DACA_NoMilitarystatus', () => {
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

  test('Complete F5 flow: Prop308_UD_DACA_NoMilitarystatus', async ({ page }) => {
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
    
    // Start new application
    await preAppDashboardPage.startNewApplication();
    
    // ===== My Information Page =====
    await myInformationPage.verifyPageLoaded();
    
    // Fill personal information with DACA status
    await myInformationPage.fillPersonalInformation({
      legalSex: testData.personalInfo.legalSex,
      primaryLanguage: testData.personalInfo.primaryLanguage,
      address: testData.personalInfo.address,
      phone: testData.personalInfo.phone,
      usCitizenship: testData.personalInfo.usCitizenship,
      visaType: testData.personalInfo.visaType, // DACA
      hispanicLatino: testData.personalInfo.hispanicLatino,
      militaryStatus: testData.personalInfo.militaryStatus, // None
      // Add other fields as needed
    });
    
    // Add ASU affiliate information
    if (testData.personalInfo.asuAffiliate?.isAffiliate) {
      await myInformationPage.addAsuAffiliateInfo({
        asuId: testData.personalInfo.asuAffiliate.asuId,
        // Add other ASU affiliate details if needed
      });
    }
    
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
    
    // Add Arizona high school (for Prop 308 eligibility)
    await mySchoolsPage.addHighSchool({
      name: testData.schoolInfo.highSchoolName,
      city: testData.schoolInfo.highSchoolCity,
      state: testData.schoolInfo.highSchoolState,
      country: testData.schoolInfo.highSchoolCountry,
      // Add graduation date if needed
    });
    
    // Add any college/universities if applicable
    await mySchoolsPage.addCollegeOrUniversity({
      // Add college/university details if needed
    });
    
    // Save and continue
    await mySchoolsPage.saveAndContinue();
    
    // ===== My High School Grades Page =====
    await myHighSchoolGradesPage.verifyPageLoaded();
    
    // Use default self-reported grades (as per test case)
    await myHighSchoolGradesPage.useDefaultSelfReportedGrades();
    
    // Save and continue
    await myHighSchoolGradesPage.saveAndContinue();
    
    // ===== Arizona Residency Page =====
    await azResidencyPage.verifyPageLoaded();
    
    // Fill Prop 308 specific residency information
    await azResidencyPage.fillProp308Residency({
      isArizonaResident: testData.residencyInfo.isArizonaResident,
      // Add other Prop 308 specific fields
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
