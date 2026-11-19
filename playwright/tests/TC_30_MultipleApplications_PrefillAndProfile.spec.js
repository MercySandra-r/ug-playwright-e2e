// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');
const ProfilePage = require('../pages/ProfilePage');

/**
 * Several applications on one account: what a later application is prefilled with, and what
 * the profile lets the applicant edit as the number of applications in progress changes.
 *
 *   1. First application taken to Review: one in progress, every profile field editable.
 *   2. It is submitted: none in progress, no profile field editable.
 *   3. A second application: My information comes prefilled with the first one's answers.
 *   4. Two applications on the account (the first submitted, the second in progress): legal
 *      name and birthday are read-only, the rest editable. The dashboard offers only the
 *      second one's "Continue", no new application: one in progress at a time (2026-11-19).
 *   5. The second application goes on: My schools is not prefilled (empty), Arizona residency
 *      is (the same answers). The tester confirmed (2026-11-19) that only My information and
 *      Arizona residency are prefilled; prefill is checked on these two applications only.
 *   Contact email is never editable.
 *
 * Profile rules: ProfilePage.expectedEditableFields(inProgressCount).
 *
 * THIS SPEC SUBMITS ONE APPLICATION (the first); the second stays in progress.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */
const HIGH_SCHOOL = { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${new Date().getFullYear() - 2}` };

test.describe('Multiple applications: prefill and profile editing', () => {
    test.describe.configure({ mode: 'serial', timeout: 240000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    let firstId = '';
    let secondId = '';
    /** @type {Record<string, any>} */
    let firstInfo = {};
    /** @type {Record<string, string|number|undefined>} */
    let firstResidency = {};
    const done = { firstRead: false, submitted: false, second: false };

    /** Page objects for one application. */
    function pagesFor(/** @type {string} */ applicationId) {
        const pages = {
            info: new MyInformationPage(page), program: new MyASUProgramPage(page), schools: new MySchoolsPage(page),
            grades: new MyHighSchoolGradesPage(page), residency: new AZResidencyPage(page), review: new ReviewPage(page),
            dashboard: new PostAppSubmissionDashboardPage(page), profile: new ProfilePage(page),
        };
        for (const p of Object.values(pages)) p.applicationId = applicationId;
        return pages;
    }

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // The first application through to Review (the journey's answers, a U.S. citizen).
        firstId = await startApplicationAt(page, 'review', { captureValidations: false, mode: 'online', applicant: { usCitizen: true } });
        testInfo.annotations.push({ type: 'first application', description: firstId });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    async function ensureFirstRead() {
        if (done.firstRead) return;
        const { info, residency } = pagesFor(firstId);
        await info.navigateToMyInformation();
        firstInfo = await info.readFormValues();
        await residency.navigateToAZResidency();
        firstResidency = await residency.readAnswers();
        done.firstRead = true;
    }
    /** IRREVERSIBLE: certifies and submits the first application (once). */
    async function ensureSubmitted() {
        if (done.submitted) return;
        await ensureFirstRead();
        const { review } = pagesFor(firstId);
        await review.navigateToReviewPage();
        const payment = await review.getPaymentOptions();
        await review.submitApplication({ certify: true, paymentOption: payment.includes('Pay later') ? 'later' : null });
        await review.waitForSubmitted();
        done.submitted = true;
    }
    async function ensureSecond() {
        if (done.second) return;
        await ensureSubmitted();
        const { dashboard } = pagesFor(firstId);
        await dashboard.openMainDashboard();
        ({ applicationId: secondId } = await dashboard.startOrResumeNewApplication({ mode: 'Online', resumeDraft: false }));
        test.info().annotations.push({ type: 'second application', description: secondId });
        done.second = true;
    }

    test('One application in progress: every profile field is editable', async () => {
        await ensureFirstRead();
        test.info().annotations.push({ type: 'first application: My information', description: JSON.stringify(firstInfo) });
        test.info().annotations.push({ type: 'first application: Arizona residency', description: JSON.stringify(firstResidency) });
        const { profile } = pagesFor(firstId);
        await profile.navigateToProfile();
        expect(await profile.getEditableFields()).toEqual(ProfilePage.expectedEditableFields(1));
        expect(await profile.isContactEmailEditable()).toBe(false);
    });

    test('Submitted, none in progress: no profile field is editable', async () => {
        await ensureSubmitted();
        const { profile } = pagesFor(firstId);
        await profile.navigateToProfile();
        expect(await profile.getEditableFields()).toEqual(ProfilePage.expectedEditableFields(0));
        expect(await profile.isContactEmailEditable()).toBe(false);
    });

    test('A second application: My information is prefilled with the first one\'s answers', async () => {
        await ensureSecond();
        const { info } = pagesFor(secondId);
        await info.navigateToMyInformation();
        await expect.poll(async () => (await info.readFormValues()).legalSex, { timeout: 30000 }).toBe(firstInfo.legalSex);
        const second = await info.readFormValues();
        test.info().annotations.push({ type: 'second application: My information', description: JSON.stringify(second) });
        expect(second).toEqual(firstInfo);
    });

    test('Two applications (one submitted, one in progress): legal name and birthday are read-only; no new application while one is in progress', async () => {
        await ensureSecond();
        const { dashboard, profile } = pagesFor(secondId);
        // Only one application can be in progress at a time: the dashboard offers its
        // "Continue", not "Start a new application", until it is submitted.
        expect(await dashboard.getMainDashboardOptions()).toEqual({ startNewOffered: false, continueOffered: true });
        // Several applications on the account: legal name and birthday locked, the rest editable.
        await profile.navigateToProfile();
        expect(await profile.getEditableFields()).toEqual(ProfilePage.expectedEditableFields(2));
        expect(await profile.isContactEmailEditable()).toBe(false);
    });

    test('The second application: My schools is not prefilled; Arizona residency is', async () => {
        test.setTimeout(420000);
        await ensureSecond();
        const { info, program, schools, grades, residency } = pagesFor(secondId);
        // My information as it is (prefilled); My program with the next open start term.
        await info.navigateToMyInformation();
        await info.saveAndContinue().catch(() => {});
        await program.navigateToMyASUProgram();
        await program.selectProgram({ program: 'Anthropology, BA', degreeType: 'Bachelor' });
        await program.saveAndContinue();

        // My schools: nothing carried over.
        await schools.navigateToMySchools();
        expect(await schools.getSavedHighSchools()).toEqual([]);
        expect(await schools.getSavedInstitutions()).toEqual([]);
        await schools.addHighSchool(HIGH_SCHOOL);
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
        if (!(await grades.isStepNotNecessary())) {
            await grades.chooseSelfReporting();
            await grades.useDefaultSelfReportedGrades();
        }
        await grades.saveAndContinue();

        // Arizona residency: the first application's answers.
        await residency.navigateToAZResidency();
        const second = await residency.readAnswers();
        test.info().annotations.push({ type: 'second application: Arizona residency', description: JSON.stringify(second) });
        expect(second).toEqual(firstResidency);
    });

});
