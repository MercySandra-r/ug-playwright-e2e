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
const { STARBUCKS } = require('../utils/partnerTestData');
const LandingPage = require('../pages/LandingPage');

/**
 * Flow F14: Starbucks partner flow (the "To cover" list of the E2E Flows workbook; the Starbucks warning
 * on My schools is case TS_12 of "Kaplan_Regression .xlsx"). Two applications on one account,
 * both submitted, as the tester described (2026-11-19):
 *
 *   Starbucks link      /?partner=SCAP preselects "Online" and "pursue a degree" on the landing
 *                       page (only Continue is left) and, after sign-up, the SCAP partner benefit
 *                       on My information (Education benefits Yes, provider Starbucks)
 *
 *   First application (Starbucks, started from the Starbucks link)
 *     My information   Education benefits Yes, provider Starbucks: "Have you earned a bachelor's
 *                      degree or higher?" No; "Starbucks partner"; the partner number (verified
 *                      by the app: "Partner number verified"); SCAP terms and FERPA consent
 *                      ("I accept"); manager disclosure Accept
 *     My program       locked to "pursue a degree" and ASU Online; Anthropology, BA
 *     My schools       Tempe High School, no colleges
 *     Review           whatever it offers for the fee (recorded), then submitted
 *
 *   Second application (same account, made non-Starbucks)
 *     My information   continued as it is, nothing changed
 *     My program       the same program; a different start term (the app refuses a second
 *                      application for a term already applied for)
 *     My schools       a college with "Bachelor of Arts": the warning "You cannot use the
 *                      Starbucks College Achievement Plan education benefit as a partner who has
 *                      already earned a bachelor's degree or higher...", then "Continue with no
 *                      partner benefit"
 *     Review           the normal fee: Pay now / Pay later; submitted with Pay later
 *
 * Partner test data (a partner number QA verifies and the name it belongs to) comes from
 * utils/partnerTestData.js; STARBUCKS_* in .env override it.
 *
 * THIS FLOW SUBMITS TWO APPLICATIONS (it cannot be undone).
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

const STARBUCKS_WARNING = 'You cannot use the Starbucks College Achievement Plan education benefit as a partner who has already earned a bachelor’s degree or higher.';

const testData = {
    mode: /** @type {'online'} */ ('online'),
    applicant: {
        firstName: STARBUCKS.firstName,
        lastName: STARBUCKS.lastName,
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 25) },
    },
    provider: 'Starbucks',
    /** The Starbucks (SCAP) landing link: preselects Online, pursue a degree and the SCAP benefit. */
    landing: '/?partner=SCAP',
    program: 'Anthropology, BA',
    location: 'ASU Online',
    highSchool: { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${new Date().getFullYear() - 7}` },
    college: { state: 'Arizona', city: 'Mesa', institution: 'Mesa Community College (Mesa)', degreeAwarded: 'Bachelor of Arts', degreeConcentration: 'Anthropology',
        firstAttended: { month: 'August', year: String(new Date().getFullYear() - 6) }, lastAttended: { month: 'May', year: String(new Date().getFullYear() - 2) } },
    residency: { permanentState: 'Arizona' },
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;

test.describe('Starbucks link (no account)', () => {
    test('/?partner=SCAP preselects "Online" and "pursue a degree"; only Continue is left', async ({ page }) => {
        const landing = new LandingPage(page);
        await landing.openLandingLink(testData.landing);
        expect(await landing.arePreselected()).toBe(true);
        expect(await landing.readPreselectedChoices()).toEqual({ mode: 'Online', degree: "Yes, I want to pursue an associate or bachelor's degree." });
    });
});

test.describe('Starbucks partner: a Starbucks application, then a non-Starbucks second application', () => {
    test.describe.configure({ mode: 'serial', timeout: 240000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    let firstId = '';
    let secondId = '';
    let firstTerm = '';

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
        // The Starbucks link (Online and pursue a degree preselected), sign-up and pre-app with the
        // partner's name; My information is filled by the tests.
        firstId = await startApplicationAt(page, 'my-information', { captureValidations: false, mode: testData.mode, landing: testData.landing, applicant: testData.applicant });
        testInfo.annotations.push({ type: 'first application', description: `${firstId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it. These helpers do a missing step once, so any test
    // can also be run on its own (for example from the UI panel).
    const done = { info: false, program: false, toReview: false, first: false, second: false };

    async function ensureInfo() {
        if (done.info) return;
        const { info } = pagesFor(firstId);
        await info.navigateToMyInformation();
        await info.completeRequiredFields({ usCitizenship: 'Yes', countryOfBirth: 'United States',
            partnerBenefits: { hasPartnerBenefits: true, provider: testData.provider, starbucksPartnerNumber: STARBUCKS.partnerNumber } });
        await info.saveAndContinue();
        done.info = true;
    }
    async function ensureProgram() {
        if (done.program) return;
        await ensureInfo();
        const { program } = pagesFor(firstId);
        await program.navigateToMyASUProgram();
        ({ startTerm: firstTerm } = (await program.selectProgram({ program: testData.program, degreeType: 'Bachelor' })).first);
        await program.saveAndContinue();
        done.program = true;
    }
    /** My schools (no colleges), grades and residency of an application, up to Review. */
    async function stepsToReview(/** @type {string} */ applicationId, /** @type {boolean} */ withBachelorCollege) {
        const { schools, grades, residency, review } = pagesFor(applicationId);
        await schools.navigateToMySchools();
        if (!(await schools.getSavedHighSchools()).includes(testData.highSchool.name)) await schools.addHighSchool(testData.highSchool);
        /** @type {string|undefined} */
        let warning;
        if (withBachelorCollege) {
            ({ partnerBenefitWarning: warning } = await schools.addCollegeOrUniversity({ ...testData.college, continueWithoutPartnerBenefit: true }));
        } else {
            await schools.markNoCollegeAttended();
        }
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
        if (!(await grades.isStepNotNecessary())) {
            await grades.chooseSelfReporting();
            await grades.useDefaultSelfReportedGrades();
        }
        if ((await grades.saveAndContinue()) !== 'review') {
            if (!(await residency.isStepNotNecessary())) {
                await residency.fillResidencyInformation({ isArizonaResident: true, permanentState: testData.residency.permanentState });
            }
            await residency.saveAndContinue();
        }
        await review.verifyPageLoaded();
        return warning;
    }
    async function ensureFirstAtReview() {
        if (done.toReview) return;
        await ensureProgram();
        await stepsToReview(firstId, false);
        done.toReview = true;
    }
    /** IRREVERSIBLE: certifies and submits an application with what Review offers for the fee. */
    async function submit(/** @type {string} */ applicationId, /** @type {string} */ label) {
        const { review } = pagesFor(applicationId);
        await review.navigateToReviewPage();
        const fee = { waived: await review.isFeeWaived(), waiverListOffered: await review.isFeeWaiverOffered(), payment: await review.getPaymentOptions() };
        test.info().annotations.push({ type: `${label}: fee section`, description: JSON.stringify(fee) });
        if (!fee.waived && fee.waiverListOffered) {
            await review.setFeeWaivers(await review.getSelectedFeeWaivers(), false);
            await review.requestFeeWaiver({ reasons: [testData.feeWaiverReason], signature: fullName });
        }
        await review.submitApplication({ certify: true, paymentOption: !fee.waived && fee.payment.includes('Pay later') ? 'later' : null });
        await review.waitForSubmitted();
        return fee;
    }
    async function ensureFirstSubmitted() {
        if (done.first) return;
        await ensureFirstAtReview();
        await submit(firstId, 'first application');
        done.first = true;
    }

    test('My information: the Starbucks link preselected the SCAP benefit; the partner number is verified', async () => {
        const { info } = pagesFor(firstId);
        await info.navigateToMyInformation();
        // Started from /?partner=SCAP: Education benefits Yes with Starbucks, before anything is filled.
        await expect.poll(async () => { const v = await info.readFormValues(); return { benefits: v.educationBenefits, provider: v.benefitProvider }; }, { timeout: 20000 })
            .toEqual({ benefits: 'Yes', provider: testData.provider });
        await info.completeRequiredFields({ usCitizenship: 'Yes', countryOfBirth: 'United States',
            partnerBenefits: { hasPartnerBenefits: true, provider: testData.provider, starbucksPartnerNumber: STARBUCKS.partnerNumber } });
        expect(await info.isStarbucksPartnerVerified()).toBe(true);
        expect((await info.readFormValues()).benefitProvider).toBe(testData.provider);
        await info.saveAndContinue();
        done.info = true;
    });

    test('My program: locked to "pursue a degree" at ASU Online; choose the program', async () => {
        await ensureInfo();
        const { program } = pagesFor(firstId);
        await program.navigateToMyASUProgram();
        expect(await program.getDegreeIntentLock()).toEqual({ intent: 'pursue a degree', locked: true });
        const { first } = await program.selectProgram({ program: testData.program, degreeType: 'Bachelor' });
        firstTerm = first.startTerm;
        expect(first.program).toBe(testData.program);
        expect(first.location).toBe(testData.location);
        await program.saveAndContinue();
        done.program = true;
    });

    test('First application: My schools, grades and residency, then Review', async () => {
        await ensureProgram();
        await stepsToReview(firstId, false);
        done.toReview = true;
        const { review } = pagesFor(firstId);
        expect(await review.getSectionValue('My program', 'Location')).toBe(testData.location);
        test.info().annotations.push({ type: 'Education benefits on Review', description: JSON.stringify(await review.getSectionLines('My information')) });
    });

    test('Submit the Starbucks application; Next steps shows it', async () => {
        await ensureFirstAtReview();
        await submit(firstId, 'first application');
        done.first = true;
        const { dashboard } = pagesFor(firstId);
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(firstId);
    });

    test('Second application: My information unchanged; a bachelor\'s degree on My schools ends the Starbucks benefit; submitted', async () => {
        test.setTimeout(480000);
        await ensureFirstSubmitted();
        const { dashboard } = pagesFor(firstId);
        await dashboard.verifyPageLoaded();
        ({ applicationId: secondId } = await dashboard.startOrResumeNewApplication({ mode: 'Online' }));
        expect(secondId).not.toBe(firstId);
        test.info().annotations.push({ type: 'second application', description: secondId });
        const second = pagesFor(secondId);

        // My information: nothing changed. It comes prefilled from the first application,
        // including Starbucks and the partner number, which Continue verifies again. Continue
        // can need a second click once it is verified; if it still does not move on (an
        // already-saved step), My program is opened directly.
        await second.info.navigateToMyInformation();
        let movedOn = await second.info.saveAndContinue().then(() => true).catch(() => false);
        if (!movedOn) {
            await expect.poll(() => second.info.isStarbucksPartnerVerified(), { timeout: 30000 }).toBe(true);
            movedOn = await second.info.saveAndContinue().then(() => true).catch(() => false);
        }
        if (!movedOn) test.info().annotations.push({ type: 'note', description: 'Continue on the prefilled My information did not move on; opened My program directly' });

        // My program: the same program, another start term than the first application's.
        await second.program.navigateToMyASUProgram();
        const { first } = await second.program.selectProgram({ program: testData.program, degreeType: 'Bachelor', avoidTerms: [firstTerm] });
        expect(first.startTerm).not.toBe(firstTerm);
        await second.program.saveAndContinue();

        // My schools: a college with a bachelor's degree brings up the Starbucks warning.
        const warning = await stepsToReview(secondId, true);
        expect(warning).toContain(STARBUCKS_WARNING);

        // Review: no Starbucks benefit any more, so the normal fee.
        await second.review.navigateToReviewPage();
        expect(await second.review.getPaymentOptions()).toEqual(['Pay now', 'Pay later']);
        const fee = await submit(secondId, 'second application');
        expect(fee.waived).toBe(false);
        done.second = true;

        await second.dashboard.verifyPageLoaded();
        expect(await second.dashboard.getSubmittedApplicationId()).toBe(secondId);
    });
});
