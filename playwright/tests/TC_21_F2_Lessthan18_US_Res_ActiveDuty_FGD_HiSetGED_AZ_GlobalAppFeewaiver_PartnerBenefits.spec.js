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

// Test data for F2 flow: Lessthan18_US_Res_ActiveDuty_FGD_HiSetGED_AZ_GlobalAppFeewaiver_PartnerBenefits
const testData = {
  // User credentials (would be generated/retrieved in real test)
  user: {
    email: `test${Date.now() + 1}@example.com`, // Different email from F1
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    birthDate: '01/01/2010', // Age < 18
  },
  // Personal information
  personalInfo: {
    legalSex: 'Male',
    primaryLanguage: 'English',
    address: {
      street: '456 Test Ave',
      city: 'Phoenix',
      state: 'Arizona',
      zip: '85001',
      country: 'United States',
      yearsAtAddress: '2',
    },
    phone: '6025551234',
    usCitizenship: 'Yes',
    hispanicLatino: 'No',
    usArmedForces: 'Yes', // Active duty
    militaryStatus: 'Active Duty',
    // Partner benefits info
    partnerBenefits: {
      hasPartnerBenefits: true,
      partnerName: 'Amazon DSP',
      // Add other partner benefit details as needed
    },
    // Global app fee waiver
    hasFeeWaiver: true,
    // Add other personal info fields as needed
  },
  // Program information
  programInfo: {
    degreeType: 'Bachelor',
    program: 'Engineering',
    startTerm: 'Spring 2025',
    // Add other program info fields
  },
  // School information
  schoolInfo: {
    highSchoolName: 'Test High School',
    highSchoolCity: 'Phoenix',
    highSchoolState: 'Arizona',
    highSchoolCountry: 'United States',
    graduationDate: '05/2025', // Future graduation date
    hasHiSetGED: true, // HiSet/GED instead of traditional diploma
    // Add other school info fields
  },
  // Residency information
  residencyInfo: {
    isArizonaResident: true,
    // Add other residency info fields
  }
};

/**
 * Test suite for F2 Flow: Lessthan18_US_Res_ActiveDuty_FGD_HiSetGED_AZ_GlobalAppFeewaiver_PartnerBenefits
 * This test follows the flow defined in F2_Lessthan18_US_Res_ActiveDuty_FGD_HiSetGED_AZ_GlobalAppFeewaiver_PartnerBenefits.xml
 */
test.describe('F2 Flow: Lessthan18_US_Res_ActiveDuty_FGD_HiSetGED_AZ_GlobalAppFeewaiver_PartnerBenefits', () => {
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

  test('Complete F2 flow: Lessthan18_US_Res_ActiveDuty_FGD_HiSetGED_AZ_GlobalAppFeewaiver_PartnerBenefits', async ({ page }) => {
    // Step 1: Navigate to landing page and start application
    await landingPage.navigateToLandingPage();
    await landingPage.verifyPageLoaded();
    
    // Choose online mode of learning and degree type
    await landingPage.chooseOnlineMOL();
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
    
    // Verify age is less than 18
    await preAppDashboardPage.verifyAgeLessThan18();
    
    // Start new application
    await preAppDashboardPage.startNewApplication();
    
    // ===== My Information Page =====
    await myInformationPage.verifyPageLoaded();
    
    // Fill personal information with active duty and partner benefits
    await myInformationPage.fillPersonalInformation({
      legalSex: testData.personalInfo.legalSex,
      primaryLanguage: testData.personalInfo.primaryLanguage,
      address: testData.personalInfo.address,
      phone: testData.personalInfo.phone,
      usCitizenship: testData.personalInfo.usCitizenship,
      hispanicLatino: testData.personalInfo.hispanicLatino,
      usArmedForces: testData.personalInfo.usArmedForces,
      militaryStatus: testData.personalInfo.militaryStatus,
      // Add other fields as needed
    });
    
    // Apply for global app fee waiver
    if (testData.personalInfo.hasFeeWaiver) {
      await myInformationPage.applyForFeeWaiver();
    }
    
    // Apply partner benefits
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
    
    // Fill program information
    await myASUProgramPage.selectProgram({
      degreeType: testData.programInfo.degreeType,
      program: testData.programInfo.program,
      startTerm: testData.programInfo.startTerm,
      // Add other fields as needed
    });
    
    // Save and continue
    await myASUProgramPage.saveAndContinue();
    
    // ===== My Schools Page =====
    await mySchoolsPage.verifyPageLoaded();
    
    // Add HiSet/GED information instead of traditional high school
    if (testData.schoolInfo.hasHiSetGED) {
      await mySchoolsPage.addHiSetGED({
        // Add HiSet/GED specific details
        testDate: '06/2024',
        // Add other HiSet/GED fields
      });
    } else {
      // Traditional high school path (not used in this flow)
      await mySchoolsPage.addHighSchool({
        name: testData.schoolInfo.highSchoolName,
        city: testData.schoolInfo.highSchoolCity,
        state: testData.schoolInfo.highSchoolState,
        country: testData.schoolInfo.highSchoolCountry,
        graduationDate: testData.schoolInfo.graduationDate,
      });
    }
    
    // Add any college/universities if applicable
    await mySchoolsPage.addCollegeOrUniversity({
      // Add college/university details if needed
    });
    
    // Save and continue
    await mySchoolsPage.saveAndContinue();
    
    // ===== My High School Grades Page =====
    await myHighSchoolGradesPage.verifyPageLoaded();
    
    // For HiSet/GED, different grade entry might be needed
    if (testData.schoolInfo.hasHiSetGED) {
      await myHighSchoolGradesPage.enterHiSetGEDGrades({
        // Add HiSet/GED grade details
      });
    } else {
      // Traditional high school grades path (not used in this flow)
      await myHighSchoolGradesPage.fillGradeInformation({
        // Add grade information
      });
    }
    
    // Save and continue
    await myHighSchoolGradesPage.saveAndContinue();
    
    // ===== Arizona Residency Page =====
    await azResidencyPage.verifyPageLoaded();
    
    // Fill residency information for Arizona resident
    await azResidencyPage.fillResidencyInformation({
      isArizonaResident: testData.residencyInfo.isArizonaResident,
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
