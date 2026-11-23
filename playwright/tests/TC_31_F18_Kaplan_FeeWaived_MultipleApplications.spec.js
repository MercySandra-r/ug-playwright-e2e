// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const { signedInEmail } = require('../utils/accountLog');
const KaplanPage = require('../pages/KaplanPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F18: Kaplan partner flow (cases from "Kaplan_Regression .xlsx"; the last flow of the "To cover"
 * list of the E2E Flows workbook). Verified live 2026-11-19.
 *
 *   Landing            /?org=kaplaninc: the landing page with the Kaplan logo. The account is
 *                      created right there: the email typed twice and "Create account". No
 *                      password and no email code (no OTP); it opens the pre-app dashboard.
 *   Log in             /kaplan/login ("Log in" on the landing page): the email only
 *   My information     Education benefits: always No for Kaplan applicants (tester, 2026-11-19)
 *   My program         Anthropology, BA, ASU Online
 *   My schools         Tempe High School, no colleges
 *   My high school     always "Based on the information you provided, it appears that you
 *   grades             are not a resident of the United States. Therefore, this page is not
 *                      necessary. Please continue to the next step." (expected for Kaplan)
 *   Arizona residency  asked as usual (Arizona resident)
 *   Review             the fee is always waived for Kaplan: "Your application fee has been
 *                      waived." and no payment option (expected)
 *   Second application from the dashboard: My information prefilled (Education benefits
 *                      still No), another start term, the same grades message and fee
 *                      waiver; submitted. Then the dashboard says why no other application can
 *                      be started.
 *
 * THIS FLOW SUBMITS TWO APPLICATIONS (it cannot be undone). One Kaplan account per run.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */
const GRADES_NOT_NECESSARY = 'Based on the information you provided, it appears that you are not a resident of the United States. Therefore, this page is not necessary. Please continue to the next step.';
const PROGRAM = 'Anthropology, BA';
const HIGH_SCHOOL = { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${new Date().getFullYear() - 1}` };

test.describe('Kaplan landing and log-in pages (no account)', () => {
    test('The landing page creates the account with the email only; "Log in" opens the Kaplan log-in page (email only)', async ({ page }) => {
        const kaplan = new KaplanPage(page);
        await kaplan.openLanding();
        expect(await kaplan.readEntryPage()).toEqual({ kaplanLogo: true, passwordAsked: false });
        // The account form: the email twice, no password (nothing is submitted here).
        expect(await kaplan.readAccountForm({ mode: 'online', degreeType: 'pursue' })).toEqual({ heading: true, emailFields: 2, passwordAsked: false });

        await kaplan.openLanding();
        await kaplan.openLoginFromLanding();
        expect(await kaplan.readEntryPage()).toEqual({ kaplanLogo: true, passwordAsked: false });
    });
});

test.describe('Kaplan: fee waived, two applications on one account', () => {
    test.describe.configure({ mode: 'serial', timeout: 240000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    let email = '';
    let firstId = '';
    let secondId = '';
    let firstTerm = '';
    /** @type {Record<string, string|number|undefined>} */
    let firstResidency = {};
    const done = { info: false, program: false, schools: false, grades: false, review: false, firstSubmitted: false, second: false };

    /** Page objects for one application. */
    function pagesFor(/** @type {string} */ applicationId) {
        const pages = {
            info: new MyInformationPage(page), program: new MyASUProgramPage(page), schools: new MySchoolsPage(page),
            grades: new MyHighSchoolGradesPage(page), residency: new AZResidencyPage(page), review: new ReviewPage(page),
            dashboard: new PostAppSubmissionDashboardPage(page),
        };
        for (const p of Object.values(pages)) p.applicationId = applicationId;
        return pages;
    }

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Kaplan landing link: the account is created there; then the pre-app dashboard.
        firstId = await startApplicationAt(page, 'my-information', { captureValidations: false, org: 'kaplan', mode: 'online' });
        email = signedInEmail(page) || '';
        testInfo.annotations.push({ type: 'Kaplan account', description: `${email}, first application ${firstId}` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it; these do a missing step once, so any test can
    // also run on its own.
    async function ensureInfo() {
        if (done.info) return;
        const { info } = pagesFor(firstId);
        await info.navigateToMyInformation();
        await info.completeRequiredFields(); // Education benefits: No
        await info.saveAndContinue();
        done.info = true;
    }
    async function ensureProgram() {
        if (done.program) return;
        await ensureInfo();
        const { program } = pagesFor(firstId);
        await program.navigateToMyASUProgram();
        ({ startTerm: firstTerm } = (await program.selectProgram({ program: PROGRAM, degreeType: 'Bachelor' })).first);
        await program.saveAndContinue();
        done.program = true;
    }
    async function ensureSchools() {
        if (done.schools) return;
        await ensureProgram();
        const { schools } = pagesFor(firstId);
        await schools.navigateToMySchools();
        await schools.addHighSchool(HIGH_SCHOOL);
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
        done.schools = true;
    }
    async function ensureGrades() {
        if (done.grades) return;
        await ensureSchools();
        const { grades } = pagesFor(firstId);
        await grades.navigateToMyHighSchoolGrades();
        await grades.saveAndContinue();
        done.grades = true;
    }
    async function ensureReview() {
        if (done.review) return;
        await ensureGrades();
        const { residency, review } = pagesFor(firstId);
        await residency.navigateToAZResidency();
        await residency.fillArizonaResidentAllYes();
        firstResidency = await residency.readAnswers();
        await residency.saveAndContinue();
        await review.verifyPageLoaded();
        done.review = true;
    }
    /** IRREVERSIBLE: certifies and submits an application; no payment (the fee is waived). */
    async function submit(/** @type {string} */ applicationId) {
        const { review } = pagesFor(applicationId);
        await review.navigateToReviewPage();
        await review.submitApplication({ certify: true, paymentOption: null });
        await review.waitForSubmitted();
    }
    async function ensureFirstSubmitted() {
        if (done.firstSubmitted) return;
        await ensureReview();
        await submit(firstId);
        done.firstSubmitted = true;
    }

    test('Account created on the Kaplan landing page; the first application starts on My information', async () => {
        expect(email).toMatch(/@/);
        expect(firstId).toMatch(/^\d+$/);
        await expect(page).toHaveURL(new RegExp(`/ug-app/${firstId}/my-information`));
    });

    test('My information: Education benefits answered No', async () => {
        const { info } = pagesFor(firstId);
        await info.navigateToMyInformation();
        await info.completeRequiredFields();
        expect((await info.readFormValues()).educationBenefits).toBe('No');
        await info.saveAndContinue();
        done.info = true;
    });

    test('My program and My schools: Anthropology, BA online; Tempe High School', async () => {
        await ensureInfo();
        const { program, schools } = pagesFor(firstId);
        await program.navigateToMyASUProgram();
        const { first } = await program.selectProgram({ program: PROGRAM, degreeType: 'Bachelor' });
        expect(first.program).toBe(PROGRAM);
        expect(first.location).toBe('ASU Online');
        firstTerm = first.startTerm;
        await program.saveAndContinue();
        done.program = true;

        await schools.verifyPageLoaded();
        await schools.addHighSchool(HIGH_SCHOOL);
        expect(await schools.getSavedHighSchools()).toEqual([HIGH_SCHOOL.name]);
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
        done.schools = true;
    });

    test('My high school grades: "not a resident of the United States ... this page is not necessary"', async () => {
        await ensureSchools();
        const { grades } = pagesFor(firstId);
        await grades.navigateToMyHighSchoolGrades();
        expect(await grades.getNotNecessaryMessage()).toBe(GRADES_NOT_NECESSARY);
        expect(await grades.saveAndContinue()).toBe('arizona-residency');
        done.grades = true;
    });

    test('Review: the application fee is waived and no payment option is offered', async () => {
        await ensureReview();
        const { review } = pagesFor(firstId);
        await review.navigateToReviewPage();
        expect(await review.isFeeWaived()).toBe(true);
        expect(await review.getPaymentOptions()).toEqual([]);
        expect(await review.getSectionValue('My information', 'Education benefits')).toBe('No');
        expect(await review.getSectionValue('My program', 'Location')).toBe('ASU Online');
    });

    test('Submit with the fee waived; Next steps shows the application', async () => {
        await ensureFirstSubmitted();
        const { dashboard } = pagesFor(firstId);
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(firstId);
    });

    test('Sign out, then log in again on the Kaplan log-in page with the email only', async () => {
        await ensureFirstSubmitted();
        const { dashboard } = pagesFor(firstId);
        await dashboard.openMainDashboard();
        await dashboard.signOut();
        const kaplanLogin = new KaplanPage(page);
        await kaplanLogin.login(email);
        await dashboard.openMainDashboard();
        expect(await dashboard.getSubmittedApplicationId()).toBe(firstId);
    });

    test('Second application: My information prefilled (Education benefits No), another start term, grades not necessary, fee waived; submitted', async () => {
        test.setTimeout(480000);
        await ensureFirstSubmitted();
        const { dashboard } = pagesFor(firstId);
        await dashboard.openMainDashboard();
        ({ applicationId: secondId } = await dashboard.startOrResumeNewApplication({ mode: 'Online' }));
        expect(secondId).not.toBe(firstId);
        test.info().annotations.push({ type: 'second application', description: secondId });
        const second = pagesFor(secondId);

        // My information: prefilled from the first application, Education benefits still No.
        await second.info.navigateToMyInformation();
        await expect.poll(async () => (await second.info.readFormValues()).educationBenefits, { timeout: 30000 }).toBe('No');
        const movedOn = await second.info.saveAndContinue().then(() => true).catch(() => false);
        if (!movedOn) test.info().annotations.push({ type: 'note', description: 'Continue on the prefilled My information did not move on; opened My program directly' });

        // My program: the same program, another start term than the first application's.
        await second.program.navigateToMyASUProgram();
        const { first } = await second.program.selectProgram({ program: PROGRAM, degreeType: 'Bachelor', avoidTerms: [firstTerm] });
        expect(first.startTerm).not.toBe(firstTerm);
        await second.program.saveAndContinue();

        // My schools: not prefilled.
        await second.schools.verifyPageLoaded();
        expect(await second.schools.getSavedHighSchools()).toEqual([]);
        await second.schools.addHighSchool(HIGH_SCHOOL);
        await second.schools.markNoCollegeAttended();
        await second.schools.acknowledgeTranscripts();
        await second.schools.saveAndContinue();

        // My high school grades: the same notice.
        expect(await second.grades.getNotNecessaryMessage()).toBe(GRADES_NOT_NECESSARY);
        await second.grades.saveAndContinue();

        // Arizona residency: prefilled with the first application's answers.
        await second.residency.navigateToAZResidency();
        if (Object.keys(firstResidency).length) expect(await second.residency.readAnswers()).toEqual(firstResidency);
        await second.residency.saveAndContinue();

        // Review: the fee is waived again.
        await second.review.navigateToReviewPage();
        expect(await second.review.isFeeWaived()).toBe(true);
        expect(await second.review.getPaymentOptions()).toEqual([]);
        await submit(secondId);
        done.second = true;

        await second.dashboard.verifyPageLoaded();
        expect(await second.dashboard.getSubmittedApplicationId()).toBe(secondId);
    });

    test('After two applications the dashboard says why no other application can be started', async () => {
        test.skip(!done.second, 'needs the second application submitted');
        const { dashboard } = pagesFor(secondId);
        await dashboard.openMainDashboard();
        const reason = await dashboard.getNewApplicationBlockedReason();
        test.info().annotations.push({ type: 'dashboard', description: reason || '(a new application can still be started)' });
        expect(reason).toMatch(/Only one application can be sent for each start date|recently submitted an application/);
    });
});
