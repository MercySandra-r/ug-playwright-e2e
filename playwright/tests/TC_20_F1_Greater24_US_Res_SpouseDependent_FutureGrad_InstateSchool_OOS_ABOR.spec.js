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
const ArizonaResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PreviewPage = require('../pages/PreviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

// Test data for F1 flow: Greater24_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR
const testData = {
  // User credentials (would be generated/retrieved in real test)
  user: {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    birthDate: '01/01/1990', // Age > 24
  },
  // Personal information
  personalInfo: {
    legalSex: 'Female',
    primaryLanguage: 'English',
    address: {
      street: '123 Test St',
      city: 'Tempe',
      state: 'Arizona',
      zip: '85281',
      country: 'United States',
      yearsAtAddress: '5',
    },
    phone: '4805551234',
    alternatePhone: '4805555678',
    hispanicLatino: 'No',
    usArmedForces: 'No',
    maritalStatus: 'Married',
    spouseInfo: {
      firstName: 'Spouse',
      lastName: 'User',
      email: 'spouse@example.com',
    },
    // ... other personal info fields
  },
  // Program information
  programInfo: {
    degreeType: 'Bachelor',
    program: 'Computer Science',
    startTerm: 'Fall 2025',
    // ... other program info fields
  },
  // School information
  schoolInfo: {
    highSchoolName: 'Test High School',
    highSchoolCity: 'Tempe',
    highSchoolState: 'Arizona',
    highSchoolCountry: 'United States',
    graduationDate: '05/2025',
    // ... other school info fields
  },
  // Residency information
  residencyInfo: {
    isArizonaResident: 'Yes',
    // ... other residency info fields
  }
};

/**
 * Test suite for F1 Flow: Greater24_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR
 * This test follows the flow defined in F1_Greater24_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR.xml
 */
test.describe('F1 Flow: Greater24_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR', () => {
  let landingPage;
  let verifyEmailPage;
  let loginPage;
  let preAppDashboardPage;
  let myInformationPage;
  let myASUProgramPage;
  let mySchoolsPage;
  let myHighSchoolGradesPage;
  let arizonaResidencyPage;
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
    arizonaResidencyPage = new ArizonaResidencyPage(page);
    reviewPage = new ReviewPage(page);
    previewPage = new PreviewPage(page);
    postAppDashboardPage = new PostAppSubmissionDashboardPage(page);
  });

  test('Complete F1 flow: Greater24_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR', async ({ page }) => {
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
    // For now, we'll assume verification is successful
    
    // Login with the new account
    await loginPage.navigateToLoginPage();
    await loginPage.login(testData.user.email, testData.user.password);
    
    // Verify pre-application dashboard
    await preAppDashboardPage.verifyPageLoaded();
    
    // Start new application
    await preAppDashboardPage.startNewApplication();
    
    // ===== My Information Page =====
    await myInformationPage.verifyPageLoaded();
    
    // Fill personal information
    await myInformationPage.fillPersonalInformation({
      legalSex: testData.personalInfo.legalSex,
      primaryLanguage: testData.personalInfo.primaryLanguage,
      address: testData.personalInfo.address,
      phone: testData.personalInfo.phone,
      alternatePhone: testData.personalInfo.alternatePhone,
      hispanicLatino: testData.personalInfo.hispanicLatino,
      usArmedForces: testData.personalInfo.usArmedForces,
      maritalStatus: testData.personalInfo.maritalStatus,
      spouseInfo: testData.personalInfo.spouseInfo,
      // Add other fields as needed
    });
    
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
    
    // Fill school information
    await mySchoolsPage.addHighSchool({
      name: testData.schoolInfo.highSchoolName,
      city: testData.schoolInfo.highSchoolCity,
      state: testData.schoolInfo.highSchoolState,
      country: testData.schoolInfo.highSchoolCountry,
      graduationDate: testData.schoolInfo.graduationDate,
      // Add other fields as needed
    });
    
    // Save and continue
    await mySchoolsPage.saveAndContinue();
    
    // ===== My High School Grades Page =====
    await myHighSchoolGradesPage.verifyPageLoaded();
    
    // Fill high school grades information
    // Note: Add specific grade information as needed
    await myHighSchoolGradesPage.fillGradeInformation({
      // Add grade information
    });
    
    // Save and continue
    await myHighSchoolGradesPage.saveAndContinue();
    
    // ===== Arizona Residency Page =====
    await arizonaResidencyPage.verifyPageLoaded();
    
    // Fill residency information
    await arizonaResidencyPage.fillResidencyInformation({
      isArizonaResident: testData.residencyInfo.isArizonaResident,
      // Add other residency fields as needed
    });
    
    // Save and continue
    await arizonaResidencyPage.saveAndContinue();
    
    // ===== Review Page =====
    await reviewPage.verifyPageLoaded();
    
    // Verify all information is correct
    await reviewPage.verifyPersonalInformation(testData.personalInfo);
    await reviewPage.verifyProgramInformation(testData.programInfo);
    await reviewPage.verifySchoolInformation(testData.schoolInfo);
    await reviewPage.verifyResidencyInformation(testData.residencyInfo);
    
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
    
    // Additional verifications can be added here
  });
  
  // Add more test cases for specific validations if needed
  
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
