// @ts-check
const { signUpVerifiedAccount } = require('./authHelper');
const LoginPage = require('../pages/LoginPage');
const BasePage = require('../pages/BasePage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');

/** Wizard steps in order, by URL slug. */
const STEPS = ['my-information', 'my-program', 'my-schools', 'my-high-school-grades', 'arizona-residency'];

/**
 * Create a fresh account and application, then complete every step before `step`
 * with simple valid answers, leaving the page on `step`.
 *
 * Creates ONE account (the IdP limits sign-ups per hour).
 *
 * @param {import('@playwright/test').Page} page
 * @param {'my-information'|'my-program'|'my-schools'|'my-high-school-grades'|'arizona-residency'} step
 * @returns {Promise<string>} the application ID
 */
async function startApplicationAt(page, step) {
    const target = STEPS.indexOf(step);
    if (target < 0) throw new Error(`startApplicationAt: unknown or unsupported step "${step}"`);

    await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
    const applicationId = await new PreAppDashboardPage(page).startApplication();

    if (target > 0) {
        const info = new MyInformationPage(page);
        info.applicationId = applicationId;
        await info.navigateToMyInformation();
        await info.completeRequiredFields();
        await info.saveAndContinue();
    }
    if (target > 1) {
        const program = new MyASUProgramPage(page);
        program.applicationId = applicationId;
        // Anthropology, BA has no higher admission requirements, so no backup is needed.
        await program.selectProgram({ program: 'Anthropology, BA', degreeType: 'Bachelor' });
        await program.saveAndContinue();
    }
    if (target > 2) {
        const schools = new MySchoolsPage(page);
        schools.applicationId = applicationId;
        await schools.addHighSchool({ country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: 'May 2026' });
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
    }
    if (target > 3) {
        const grades = new MyHighSchoolGradesPage(page);
        grades.applicationId = applicationId;
        await grades.answerSelfReport(false);
        await grades.saveAndContinue();
    }
    return applicationId;
}

/**
 * Sign in to an existing account and return its application ID (for reuse/debug runs).
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>}
 */
async function resumeApplication(page, email, password) {
    await new LoginPage(page).login(email, password);
    return new BasePage(page).getApplicationId();
}

module.exports = { startApplicationAt, resumeApplication, STEPS };
