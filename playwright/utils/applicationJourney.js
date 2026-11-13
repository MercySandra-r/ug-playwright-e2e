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
 * @param {{ captureValidations?: boolean, veteran?: boolean, spouseOfServiceMember?: boolean,
 *           graduationDate?: string, applicant?: Applicant, mode?: 'online'|'in-person' }} [options]
 *   mode: how the applicant attends, chosen on the landing page (default 'online')
 *   applicant: who the applicant is (birthday, visa, race, uniformed services, high school);
 *   see the Applicant typedef. Defaults: born June 15 2000, permanent resident, no race,
 *   no uniformed services, Tempe High School (Arizona).
 *   graduationDate: high-school graduation date on My schools, "Month YYYY" (default
 *   "May 2026"). A future date changes the grades step (see MyHighSchoolGradesPage).
 *   veteran: on My information answer uniformed services as "I am a U.S. service member or
 *   veteran" with status Veteran (Arizona residency then asks the veteran questions)
 *   spouseOfServiceMember: answer "I am the spouse/dependent of a U.S. service member or
 *   veteran" (Arizona residency then asks which describes the service member)
 * @returns {Promise<string>} the application ID
 */
async function startApplicationAt(page, step, { captureValidations = true, veteran = false, spouseOfServiceMember = false, graduationDate = 'May 2026', applicant = {}, mode = 'online' } = {}) {
    const target = STEPS.indexOf(step);
    if (target < 0) throw new Error(`startApplicationAt: unknown or unsupported step "${step}"`);

    await signUpVerifiedAccount(page, { mode, degreeType: 'pursue' });
    const applicationId = await new PreAppDashboardPage(page).startApplication({
        captureValidations, birth: applicant.birth, mode,
        ...(applicant.firstName ? { firstName: applicant.firstName } : {}),
        ...(applicant.lastName ? { lastName: applicant.lastName } : {}),
    });

    if (target > 0) {
        const info = new MyInformationPage(page);
        info.applicationId = applicationId;
        await info.navigateToMyInformation();
        if (captureValidations) await info.captureFieldValidations({ stepName: 'My information' });
        await info.completeRequiredFields({
            ...(applicant.visaType ? { visaType: applicant.visaType } : {}),
            // U.S. citizen: asks for the country of birth and an SSN (a made-up one is typed).
            ...(applicant.usCitizen ? { usCitizenship: 'Yes', countryOfBirth: 'United States' } : {}),
            // Education benefits from a partner employer: Yes, with this provider.
            ...(applicant.partnerBenefitsProvider
                ? { partnerBenefits: { hasPartnerBenefits: true, provider: applicant.partnerBenefitsProvider } } : {}),
        });
        if (applicant.races) await info.selectEthnicityAndRace({ races: applicant.races, raceOrigins: applicant.raceOrigins || {} });
        if (applicant.uniformed) await info.fillUniformedServices(applicant.uniformed);
        if (veteran) await info.fillUniformedServices({ affiliation: 'I am a U.S. service member or veteran', status: 'Veteran' });
        if (spouseOfServiceMember) await info.fillUniformedServices({ affiliation: 'I am the spouse/dependent of a U.S. service member or veteran' });
        await info.saveAndContinue();
    }
    if (target > 1) {
        const program = new MyASUProgramPage(page);
        program.applicationId = applicationId;
        if (captureValidations) await program.captureFieldValidations({ stepName: 'My program' });
        // Anthropology, BA has no higher admission requirements, so no backup is needed.
        await program.selectProgram({
            program: 'Anthropology, BA', degreeType: 'Bachelor',
            // In person: the campus to attend (default: the first one offered).
            ...(applicant.campus ? { location: applicant.campus } : {}),
        });
        await program.saveAndContinue();
    }
    if (target > 2) {
        const schools = new MySchoolsPage(page);
        schools.applicationId = applicationId;
        if (captureValidations) await schools.captureFieldValidations({ stepName: 'My schools' });
        // A given high school replaces the default entirely (no name: the first one listed for the city).
        await schools.addHighSchool(applicant.highSchool
            ? { country: 'United States', graduationDate, ...applicant.highSchool }
            : { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate });
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
    }
    if (target > 3) {
        const grades = new MyHighSchoolGradesPage(page);
        grades.applicationId = applicationId;
        // Non-residents (e.g. JN visa) are told the step isn't necessary: nothing to fill.
        if (!(await grades.isStepNotNecessary())) {
            if (captureValidations) await grades.captureFieldValidations({ stepName: 'My high school grades' });
            // Self-report: Yes, then capture what that path makes mandatory before filling it
            // (GPA 3.50 on a 4 scale, A-F grading, one English course).
            await grades.chooseSelfReporting(); // Yes, or the senior-year card for future graduates
            if (captureValidations) await grades.captureFieldValidations({ stepName: 'My high school grades (self-report Yes)' });
            await grades.useDefaultSelfReportedGrades();
        }
        const next = await grades.saveAndContinue();
        if (next === 'review') return applicationId;
    }
    if (target > 4) {
        const residency = new AZResidencyPage(page);
        residency.applicationId = applicationId;
        // Non-residents are told the step isn't necessary: nothing to fill.
        if (!(await residency.isStepNotNecessary())) {
            if (captureValidations) await residency.captureFieldValidations({ stepName: 'Arizona residency' });
            // Arizona resident: Arizona for every state, every question Yes.
            await residency.fillArizonaResidentAllYes();
        }
        await residency.saveAndContinue();
    }
    return applicationId;
}

/**
 * Who the applicant is, for scenarios that depend on earlier answers.
 * @typedef {Object} Applicant
 * @property {{ month: string, day: string, year: string }} [birth] - pre-app birthday
 * @property {string} [firstName] - pre-app legal first name (default "Qa")
 * @property {string} [lastName] - pre-app legal last name (default "Automation")
 * @property {boolean} [usCitizen] - My information: U.S. citizen (a made-up SSN is typed)
 * @property {string} [campus] - My program, in-person applicants: the campus location, e.g.
 *   "Tempe" (default: the first one offered)
 * @property {string} [partnerBenefitsProvider] - My information: Education benefits = Yes with
 *   this provider, e.g. "Amazon DSP" (default: No)
 * @property {string} [visaType] - My information visa (non-citizen path), e.g. "Student (F-1)"
 * @property {string[]} [races] - e.g. ["American Indian/Alaska Native"]
 * @property {Record<string, string>} [raceOrigins] - e.g. { "American Indian/Alaska Native": "Ak-Chin" }
 * @property {{ affiliation?: string, status?: string }} [uniformed] - uniformed services answer
 * @property {{ country?: string, state?: string, city?: string, name?: string }} [highSchool]
 *   - high school on My schools (name: first listed when omitted)
 */

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

/**
 * Sign in to an account that has a SUBMITTED application, for the post-submission suites.
 *
 * With SUBMITTED_TEST_EMAIL / SUBMITTED_TEST_PASSWORD set, that account is used. Otherwise a
 * fresh applicant is created with the journey's defaults, taken to Review and submitted
 * (certify, Pay later). IRREVERSIBLE: that leaves one more submitted application in QA.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ email: string, applicationId: string, created: boolean }>}
 */
async function signInWithSubmittedApplication(page) {
    const email = process.env.SUBMITTED_TEST_EMAIL;
    const password = process.env.SUBMITTED_TEST_PASSWORD;
    if (email && password) {
        await new LoginPage(page).login(email, password);
        return { email, applicationId: '', created: false };
    }
    const ReviewPage = require('../pages/ReviewPage');
    const { signedInEmail } = require('./accountLog');
    const applicationId = await startApplicationAt(page, 'review', { captureValidations: false });
    const review = new ReviewPage(page);
    review.applicationId = applicationId;
    await review.navigateToReviewPage();
    await review.submitApplication({ certify: true, paymentOption: (await review.isPaymentOffered()) ? 'later' : null });
    await review.waitForSubmitted();
    return { email: signedInEmail(page) || '', applicationId, created: true };
}

module.exports = { startApplicationAt, resumeApplication, signInWithSubmittedApplication, STEPS };
