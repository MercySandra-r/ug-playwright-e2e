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

// Test data for F8 flow: NDG_Online_FGD_Resident
const testData = {
  // User credentials (would be generated/retrieved in real test)
  user: {
    email: `test${Date.now() + 7}@example.com`, // Unique email
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'OnlineNDG',
    birthDate: '01/01/1990',
  },
  // Personal information
  personalInfo: {
    legalSex: 'Male',
    primaryLanguage: 'English',
    address: {
      street: '456 Online Way',
      city: 'Phoenix',
      state: 'Arizona',
      zip: '85001',
      country: 'United States',
      yearsAtAddress: '2',
    },
    phone: '6025551234',
    usCitizenship: 'Yes',
    hispanicLatino: 'No',
    // No military status for this flow
    militaryStatus: 'None',
    // No partner benefits for this flow
    partnerBenefits: {
      hasPartnerBenefits: false,
    },
    // ASU affiliate information
    asuAffiliate: {
      isAffiliate: true,
      // Add ASU affiliate details if needed
    },
  },
  // Program information
  programInfo: {
    degreeType: 'Non-Degree',
    program: 'Online Non-Degree', // Specific to this flow
    startTerm: 'Fall 2025',
    // Add other program info fields
  },
  // School information
  schoolInfo: {
    highSchoolName: 'Test High School',
    highSchoolCity: 'Phoenix',
    highSchoolState: 'Arizona',
    highSchoolCountry: 'United States',
    graduationDate: '06/2024', // Future graduation date
    hasAttendedCollege: false, // No college attendance
    // Add other school info fields
  },
  // Residency information
  residencyInfo: {
    isArizonaResident: true, // Resident
    // Add other residency info fields
  }
};

/**
 * Test suite for F8 Flow: NDG_Online_FGD_Resident
 * This test follows the flow defined in F8_NDG_Online_FGD_Resident.xml
 */
test.describe('F8 Flow: NDG_Online_FGD_Resident', () => {
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

  test('Complete F8 flow: NDG_Online_FGD_Resident', async ({ page }) => {
    // Step 1: Navigate to landing page and start application
    await landingPage.navigateToLandingPage();
    await landingPage.verifyPageLoaded();
    
    // Choose online mode of learning and non-degree type
    await landingPage.chooseOnlineMOL();
    await landingPage.selectDegreeType('Non-Degree');
    
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
    
    // Fill personal information for online non-degree
    await myInformationPage.fillPersonalInformation({
      legalSex: testData.personalInfo.legalSex,
      primaryLanguage: testData.personalInfo.primaryLanguage,
      address: testData.personalInfo.address,
      phone: testData.personalInfo.phone,
      usCitizenship: testData.personalInfo.usCitizenship,
      hispanicLatino: testData.personalInfo.hispanicLatino,
      militaryStatus: testData.personalInfo.militaryStatus, // None
      // Add other fields as needed
    });
    
    // Add ASU affiliate information if applicable
    if (testData.personalInfo.asuAffiliate?.isAffiliate) {
      await myInformationPage.addAsuAffiliateInfo({
        // Add ASU affiliate details
      });
    }
    
    // No partner benefits for this flow
    if (testData.personalInfo.partnerBenefits?.hasPartnerBenefits) {
      await myInformationPage.applyRandomPartnerBenefits();
    }
    
    // Save and continue
    await myInformationPage.saveAndContinue();
    
    // ===== My Program Page =====
    await myASUProgramPage.verifyPageLoaded();
    
    // Select Online Non-Degree program (specific to this flow)
    await myASUProgramPage.selectProgram({
      degreeType: testData.programInfo.degreeType,
      program: testData.programInfo.program, // Online Non-Degree
      startTerm: testData.programInfo.startTerm,
      // Add other fields as needed
    });
    
    // Save and continue
    await myASUProgramPage.saveAndContinue();
    
    // ===== My Schools Page =====
    await mySchoolsPage.verifyPageLoaded();
    
    // Add high school information with future graduation date
    await mySchoolsPage.addHighSchool({
      name: testData.schoolInfo.highSchoolName,
      city: testData.schoolInfo.highSchoolCity,
      state: testData.schoolInfo.highSchoolState,
      country: testData.schoolInfo.highSchoolCountry,
      graduationDate: testData.schoolInfo.graduationDate, // Future graduation date
    });
    
    // No college/universities attended (as per test case)
    if (testData.schoolInfo.hasAttendedCollege) {
      await mySchoolsPage.addCollegeOrUniversity({
        // Add college/university details if needed
      });
    } else {
      await mySchoolsPage.markNoCollegeAttended();
    }
    
    // Acknowledge NDG/VUS specific checkboxes
    await mySchoolsPage.acknowledgeNDGVUSCheckboxes();
    
    // Save and continue
    await mySchoolsPage.saveAndContinue();
    
    // ===== My High School Grades Page =====
    await myHighSchoolGradesPage.verifyPageLoaded();
    
    // Use NDG/VUS flow for grades (as per test case)
    await myHighSchoolGradesPage.useNDGVUSFlow();
    
    // Save and continue
    await myHighSchoolGradesPage.saveAndContinue();
    
    // ===== Arizona Residency Page =====
    await azResidencyPage.verifyPageLoaded();
    
    // Fill out-of-state residency information (even though resident, this is part of the flow)
    await azResidencyPage.fillOutOfStateResidency({
      isArizonaResident: testData.residencyInfo.isArizonaResident,
      // Add parent/guardian details as needed
      parentInfo: {
        // Add parent/guardian information
      }
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
    
    // Handle QTR check and college readiness certification
    await reviewPage.completeQTRCheck();
    await reviewPage.completeCollegeReadinessCertification();
    
    // Handle payment - pay later (as per test case)
    await reviewPage.handlePaymentOrWaiver('payLater');
    
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
    
    // Check for QTR alert (specific to this flow)
    const hasQTRAlert = await postAppDashboardPage.checkForQTROnlineAlert();
    expect(hasQTRAlert).toBeTruthy();
    
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
