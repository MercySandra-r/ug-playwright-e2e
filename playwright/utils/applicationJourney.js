// @ts-check
const { signUpVerifiedAccount } = require('./authHelper');
const LoginPage = require('../pages/LoginPage');
const BasePage = require('../pages/BasePage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');

/** Wizard steps in order, by URL slug. */
const STEPS = ['my-information', 'my-program', 'my-schools', 'my-high-school-grades', 'arizona-residency', 'review'];

/**
 * Create a fresh account and application, then complete every step before `step`
 * with simple valid answers, leaving the page on `step`.
 *
 * Creates ONE account (the IdP limits sign-ups per hour).
 *
 * Before filling each step it clicks the footer button on the empty form and captures the
 * field-level validation messages (attached to the test report); turn this off with
 * `captureValidations: false`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'my-information'|'my-program'|'my-schools'|'my-high-school-grades'|'arizona-residency'|'review'} step
 * @param {{ captureValidations?: boolean }} [options]
 * @returns {Promise<string>} the application ID
 */
async function startApplicationAt(page, step, { captureValidations = true } = {}) {
    const target = STEPS.indexOf(step);
    if (target < 0) throw new Error(`startApplicationAt: unknown or unsupported step "${step}"`);

    await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
    const applicationId = await new PreAppDashboardPage(page).startApplication({ captureValidations });

    if (target > 0) {
        const info = new MyInformationPage(page);
        info.applicationId = applicationId;
        await info.navigateToMyInformation();
        if (captureValidations) await info.captureFieldValidations({ stepName: 'My information' });
        await info.completeRequiredFields();
        await info.saveAndContinue();
    }
    if (target > 1) {
        const program = new MyASUProgramPage(page);
        program.applicationId = applicationId;
        if (captureValidations) await program.captureFieldValidations({ stepName: 'My program' });
        // Anthropology, BA has no higher admission requirements, so no backup is needed.
        await program.selectProgram({ program: 'Anthropology, BA', degreeType: 'Bachelor' });
        await program.saveAndContinue();
    }
    if (target > 2) {
        const schools = new MySchoolsPage(page);
        schools.applicationId = applicationId;
        if (captureValidations) await schools.captureFieldValidations({ stepName: 'My schools' });
        await schools.addHighSchool({ country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: 'May 2026' });
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
    }
    if (target > 3) {
        const grades = new MyHighSchoolGradesPage(page);
        grades.applicationId = applicationId;
        if (captureValidations) await grades.captureFieldValidations({ stepName: 'My high school grades' });
        // Self-report: Yes, then capture what that path makes mandatory before filling it
        // (GPA 3.50 on a 4 scale, A-F grading, one English course).
        await grades.answerSelfReport(true);
        if (captureValidations) await grades.captureFieldValidations({ stepName: 'My high school grades (self-report Yes)' });
        await grades.useDefaultSelfReportedGrades();
        await grades.saveAndContinue();
    }
    if (target > 4) {
        const residency = new AZResidencyPage(page);
        residency.applicationId = applicationId;
        if (captureValidations) await residency.captureFieldValidations({ stepName: 'Arizona residency' });
        // Out-of-state defaults: California, parents in California, every question No.
        await residency.fillResidencyInformation({ isArizonaResident: false });
        await residency.saveAndContinue();
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
