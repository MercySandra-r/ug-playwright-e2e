// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const { syntheticSsn } = require('../utils/syntheticSsn');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F7: DuplicateApp_Submission_Check_PSwaiver
 * (row F7 of the "E2E Flows" sheet, "NAA App - Automation Test flows" workbook)
 * Replaces TC_15, the earlier duplicate check on My program.
 *
 * The same person as an application already submitted in QA (same name and date of birth),
 * for the same program and term, applying from a new account:
 *
 *   1. U.S. citizen with a new (made-up) SSN, taken through to Review: no duplicate error.
 *   2. From Review, Edit My information and type the SSN of the submitted application
 *      (TEST_SSN). Continue returns to Review, which now lists under "Please correct the
 *      following items": "Application already submitted for the selected term. To resolve
 *      this issue, call Admission Services at 480-965-7788."
 *   3. My program, Continue without a change: "You have already submitted an application
 *      for your chosen start date..." with Update term / Change program.
 *   4. Back on My information, a new SSN again: the error is gone from Review and My
 *      program continues.
 *   5. Submit with what Review offers for the fee, and the Next steps page.
 *
 * FEE: with the duplicate error, Review still shows the payment option ($75.00, Pay now /
 * Pay later). That is expected (confirmed by the tester 2026-11-19), and checked.
 *
 * Needs TEST_SSN in playwright/.env (the SSN of the submitted application; 9 digits). It is
 * typed only, never logged or stored. Identity defaults: first name "Mercy", last name
 * "Sandra R", birthday April 17 1999, "Anthropology, BA", "2027 spring - (Session A)";
 * overrides: DUP_CHECK_FIRST_NAME, DUP_CHECK_LAST_NAME, DUP_CHECK_DOB ("Month D YYYY"),
 * DUP_CHECK_PROGRAM, DUP_CHECK_TERM.
 *
 * THIS FLOW ALWAYS SUBMITS (with the new SSN), so every run leaves one submitted
 * application in QA under that name and birthday.
 *
 * Run: npm run test:dup-identity
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

const [dobMonth, dobDay, dobYear] = (process.env.DUP_CHECK_DOB || 'April 17 1999').split(/\s+/);
const testData = {
    mode: /** @type {'online'} */ ('online'),
    applicant: {
        firstName: process.env.DUP_CHECK_FIRST_NAME || 'Mercy',
        lastName: process.env.DUP_CHECK_LAST_NAME || 'Sandra R',
        birth: { month: dobMonth, day: dobDay, year: dobYear },
        usCitizen: true, // a made-up SSN is typed by the journey
    },
    program: process.env.DUP_CHECK_PROGRAM || 'Anthropology, BA',
    term: process.env.DUP_CHECK_TERM || '2027 spring - (Session A)',
    highSchool: { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${Number(dobYear) + 18}` },
    residency: { permanentState: 'Outside the U.S. or Not Listed' },
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;
const DUPLICATE_ON_REVIEW = 'Application already submitted for the selected term.';
const DUPLICATE_ON_REVIEW_HELP = 'To resolve this issue, call Admission Services at 480-965-7788.';

test.describe('F7 Duplicate application: SSN of a submitted application, edited from Review', () => {
    test.describe.configure({ mode: 'serial', timeout: 240000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyInformationPage} */
    let infoPage;
    /** @type {MyASUProgramPage} */
    let programPage;
    /** @type {ReviewPage} */
    let reviewPage;
    let applicationId = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        // Only the tester can supply the submitted application's SSN: without it, fail with this message.
        expect(process.env.TEST_SSN, 'Set TEST_SSN (9 digits) in playwright/.env: the SSN of the submitted application').toMatch(/^\d{9}$/);
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Pre-app and My information: the same name and birthday, U.S. citizen, a new SSN.
        applicationId = await startApplicationAt(page, 'my-program', {
            captureValidations: false, mode: testData.mode, applicant: testData.applicant,
        });
        infoPage = new MyInformationPage(page);
        programPage = new MyASUProgramPage(page);
        reviewPage = new ReviewPage(page);
        const schoolsPage = new MySchoolsPage(page);
        const gradesPage = new MyHighSchoolGradesPage(page);
        const residencyPage = new AZResidencyPage(page);
        for (const p of [infoPage, programPage, reviewPage, schoolsPage, gradesPage, residencyPage]) p.applicationId = applicationId;

        // My program: the same program and term as the submitted application (no duplicate yet).
        await programPage.selectProgram({ program: testData.program, degreeType: 'Bachelor', startTerm: testData.term });
        await programPage.saveAndContinue();
        // My schools, grades and Arizona residency, then Review.
        await schoolsPage.addHighSchool(testData.highSchool);
        await schoolsPage.markNoCollegeAttended();
        await schoolsPage.acknowledgeTranscripts();
        await schoolsPage.saveAndContinue();
        if (!(await gradesPage.isStepNotNecessary())) {
            await gradesPage.chooseSelfReporting();
            await gradesPage.useDefaultSelfReportedGrades();
        }
        if ((await gradesPage.saveAndContinue()) !== 'review') {
            if (!(await residencyPage.isStepNotNecessary())) {
                await residencyPage.fillResidencyInformation({ isArizonaResident: false, permanentState: testData.residency.permanentState });
            }
            await residencyPage.saveAndContinue();
        }
        await reviewPage.verifyPageLoaded();
        testInfo.annotations.push({ type: 'application', description: `${applicationId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    /** Edit My information from Review, type an SSN, Continue back to Review. */
    async function changeSsnFromReview(/** @type {string} */ ssn) {
        await reviewPage.navigateToReviewPage();
        await reviewPage.clickEditSection('My information');
        await infoPage.fillSocialSecurityNumber(ssn);
        await infoPage.saveAndReturnToReview();
        await reviewPage.verifyPageLoaded();
    }
    const reviewErrors = async () => (await reviewPage.getSubmitErrors()).join('\n');

    // Each test needs the steps before it. These helpers do a missing step once, so any test
    // can also be run on its own (for example from the UI panel).
    const done = { duplicateSsn: false, ssnFixed: false, submitted: false };
    async function ensureDuplicateSsn() {
        if (done.duplicateSsn) return;
        await changeSsnFromReview(String(process.env.TEST_SSN));
        done.duplicateSsn = true;
    }
    async function ensureSsnFixed() {
        if (done.ssnFixed) return;
        await ensureDuplicateSsn();
        await changeSsnFromReview(syntheticSsn());
        done.ssnFixed = true;
    }
    /** IRREVERSIBLE: certifies and submits the application (once), with what Review offers for the fee. */
    async function ensureSubmitted() {
        if (done.submitted) return;
        await ensureSsnFixed();
        await reviewPage.navigateToReviewPage();
        const fee = {
            waived: await reviewPage.isFeeWaived(),
            waiverListOffered: await reviewPage.isFeeWaiverOffered(),
            paymentOffered: await reviewPage.isPaymentOffered(),
        };
        test.info().annotations.push({ type: 'fee section at submit', description: JSON.stringify(fee) });
        if (!fee.waived && fee.waiverListOffered) {
            await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
            await reviewPage.requestFeeWaiver({ reasons: [testData.feeWaiverReason], signature: fullName });
        }
        await reviewPage.submitApplication({ certify: true, paymentOption: !fee.waived && fee.paymentOffered ? 'later' : null });
        await reviewPage.waitForSubmitted();
        done.submitted = true;
    }

    test('Review with a new SSN: no duplicate application error', async () => {
        await reviewPage.navigateToReviewPage();
        expect(await reviewErrors()).not.toContain(DUPLICATE_ON_REVIEW);
    });

    test('Edit My information from Review with the SSN of a submitted application: Review shows the duplicate error', async () => {
        await changeSsnFromReview(String(process.env.TEST_SSN));
        done.duplicateSsn = true;
        await expect.poll(reviewErrors, { timeout: 30000 }).toContain(DUPLICATE_ON_REVIEW);
        expect(await reviewErrors()).toContain(DUPLICATE_ON_REVIEW_HELP);

        // Expected: the payment option still shows alongside the error.
        expect(await reviewPage.isPaymentOffered(), 'Review should still show the payment option with the duplicate error').toBe(true);
    });

    test('My program: Continue without a change shows the duplicate start date error', async () => {
        await ensureDuplicateSsn();
        await programPage.navigateToMyASUProgram();
        await programPage.clickContinue();
        await programPage.verifyDuplicateStartDateBlocked();
    });

    test('My information: a new SSN again clears the duplicate error on Review and My program', async () => {
        await ensureDuplicateSsn();
        await changeSsnFromReview(syntheticSsn());
        done.ssnFixed = true;
        await expect.poll(reviewErrors, { timeout: 30000 }).not.toContain(DUPLICATE_ON_REVIEW);

        // My program continues again with the same program and term.
        await programPage.navigateToMyASUProgram();
        await programPage.saveAndContinue();
        expect(await programPage.isDuplicateStartDateErrorShown()).toBe(false);
    });

    test('Submit the application with what Review offers for the fee', async () => {
        await ensureSubmitted();
    });

    test('Next steps dashboard shows the submitted application', async () => {
        await ensureSubmitted();
        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = applicationId;
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(applicationId);
    });
});
