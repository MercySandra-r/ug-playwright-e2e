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

// Test data for F3 flow: 18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location
const testData = {
  // User credentials (would be generated/retrieved in real test)
  user: {
    email: `test${Date.now() + 2}@example.com`, // Different email from previous tests
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Veteran',
    birthDate: '01/01/2000', // Age between 18-24
  },
  // Personal information
  personalInfo: {
    legalSex: 'Male',
    primaryLanguage: 'English',
    address: {
      street: '789 Veteran Way',
      city: 'New York',
      state: 'New York',
      zip: '10001',
      country: 'United States',
      yearsAtAddress: '3',
    },
    phone: '2125551234',
    usCitizenship: 'No', // Non-US resident
    visaType: 'Permanent Resident', // Or other appropriate visa type
    hispanicLatino: 'No',
    usArmedForces: 'Yes', // Veteran status
    militaryStatus: 'Veteran',
    // Global app fee waiver
    hasFeeWaiver: true,
    // No partner benefits for this flow
    partnerBenefits: {
      hasPartnerBenefits: false
    },
  },
  // Program information
  programInfo: {
    degreeType: 'Bachelor',
    program: 'Computer Science',
    startTerm: 'Fall 2025',
    programLocation: 'Tempe', // In-person program
    // Add other program info fields
  },
  // School information
  schoolInfo: {
    highSchoolName: 'Test High School',
    highSchoolCity: 'New York',
    highSchoolState: 'New York',
    highSchoolCountry: 'United States',
    graduationDate: '06/2020', // Past graduation
    // Add other school info fields
  },
  // Residency information
  residencyInfo: {
    isArizonaResident: false, // Out of state
    // Add other residency info fields
  }
};

/**
 * Test suite for F3 Flow: 18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location
 * This test follows the flow defined in F3_18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location.xml
 */
test.describe('F3 Flow: 18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location', () => {
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

  test('Complete F3 flow: 18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location', async ({ page }) => {
    // Step 1: Navigate to landing page and start application
    await landingPage.navigateToLandingPage();
    await landingPage.verifyPageLoaded();
    
    // Choose in-person mode of learning and degree type
    await landingPage.chooseInPersonMOL();
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
    
    // Verify age is between 18-24
    await preAppDashboardPage.verifyAgeBetween18And24();
    
    // Start new application
    await preAppDashboardPage.startNewApplication();
    
    // ===== My Information Page =====
    await myInformationPage.verifyPageLoaded();
    
    // Fill personal information with veteran status and non-US residency
    await myInformationPage.fillPersonalInformation({
      legalSex: testData.personalInfo.legalSex,
      primaryLanguage: testData.personalInfo.primaryLanguage,
      address: testData.personalInfo.address,
      phone: testData.personalInfo.phone,
      usCitizenship: testData.personalInfo.usCitizenship,
      visaType: testData.personalInfo.visaType,
      hispanicLatino: testData.personalInfo.hispanicLatino,
      usArmedForces: testData.personalInfo.usArmedForces,
      militaryStatus: testData.personalInfo.militaryStatus,
      // Add other fields as needed
    });
    
    // Apply for global app fee waiver
    if (testData.personalInfo.hasFeeWaiver) {
      await myInformationPage.applyForFeeWaiver();
    }
    
    // No partner benefits for this flow
    if (testData.personalInfo.partnerBenefits?.hasPartnerBenefits) {
      await myInformationPage.applyPartnerBenefits({
        partnerName: testData.personalInfo.partnerBenefits.partnerName,
        // Add other partner benefit details
      });
    }
    
    // Save and continue
    await myInformationPage.saveAndContinue();
    
    // ===== My Program Page =====
    await myASUProgramPage.verifyPageLoaded();
    
    // Fill program information for in-person program
    await myASUProgramPage.selectProgram({
      degreeType: testData.programInfo.degreeType,
      program: testData.programInfo.program,
      startTerm: testData.programInfo.startTerm,
      location: testData.programInfo.programLocation,
      // Add other fields as needed
    });
    
    // Save and continue
    await myASUProgramPage.saveAndContinue();
    
    // ===== My Schools Page =====
    await mySchoolsPage.verifyPageLoaded();
    
    // Add high school with past graduation date
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
    
    // Fill grade information (self-reported or transcript)
    await myHighSchoolGradesPage.fillGradeInformation({
      // Add grade information
      // For past graduates, this might be self-reported or from transcript
      isSelfReported: true,
      // Add other grade details as needed
    });
    
    // Save and continue
    await myHighSchoolGradesPage.saveAndContinue();
    
    // ===== Arizona Residency Page =====
    await azResidencyPage.verifyPageLoaded();
    
    // Fill residency information for out-of-state applicant
    await azResidencyPage.fillResidencyInformation({
      isArizonaResident: testData.residencyInfo.isArizonaResident,
      // Add veteran-specific residency information
      isVeteran: true,
      // Add other residency fields as needed
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
    
    // Verify fee waiver is applied if applicable
    if (testData.personalInfo.hasFeeWaiver) {
      await reviewPage.verifyFeeWaiverApplied();
    }
    
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
    
    // Verify fee waiver status if applicable
    if (testData.personalInfo.hasFeeWaiver) {
      const feeStatus = await postAppDashboardPage.getFeeStatus();
      expect(feeStatus).toMatch(/waived|paid/i);
    }
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
