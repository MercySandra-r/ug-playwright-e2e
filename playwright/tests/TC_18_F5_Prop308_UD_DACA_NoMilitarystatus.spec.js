// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F5: Prop308_UD_DACA_NoMilitarystatus
 * (row F5 of the "E2E Flows" sheet, "NAA App - Automation Test flows" workbook)
 *
 *   MOL                 in person (the sheet allows any)
 *   Age                 20 (the sheet allows any)
 *   UD_DACA             not a U.S. citizen, not a resident: visa type "Deferred Action for
 *                       Childhood Arrivals (DACA)"
 *   Previous ASU        never affiliated (the sheet allows any)
 *   NoMilitarystatus    uniformed services "None of these options apply to me"
 *   Program             Anthropology, BA (the sheet allows any)
 *   Partner benefits    No (the sheet allows any)
 *   My schools          an Arizona high school (Tempe High School), graduation date in the future
 *   Grades              defaults to self-report: the step opens straight on "Self-report
 *                       grades" with no question or cards (filled with the journey's defaults)
 *   Prop308             Arizona residency asks only the permanent home and "Did you (or will
 *                       you) graduate from an Arizona ... high school"; Yes then asks whether
 *                       the applicant attended one for at least two years. Answered Arizona,
 *                       Yes, Yes
 *   Payment             whatever Review offers (the sheet: waived or payment, at random)
 *
 * One fresh account per run (beforeAll), taken through steps 1-4 with the answers above;
 * the tests then cover Arizona residency (Prop 308), Review and submission.
 *
 * THIS FLOW ALWAYS SUBMITS the application (it cannot be undone), so every run leaves one
 * submitted application in QA. The last name is different on every run.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

/** Letters only, new on every run. */
const uniqueLastName = `Flow${Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')}`;
const nextYear = new Date().getFullYear() + 1;

const testData = {
    mode: /** @type {'in-person'} */ ('in-person'),
    applicant: {
        firstName: 'Qa',
        lastName: uniqueLastName,
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 20) },
        visaType: 'Deferred Action for Childhood Arrivals (DACA)',
    },
    graduationDate: `May ${nextYear}`, // future graduation
    highSchool: 'Tempe High School', // in-state school (the journey's default)
    program: 'Anthropology, BA',
    residency: { permanentState: 'Arizona', graduatedArizonaHighSchool: true },
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;
/** The only fields Prop 308 asks (as verified for the TC_09 Prop 308 scenario). */
const PROP308_FIELDS = AZResidencyPage.RESIDENCY_SCENARIOS.prop308.asShown;

test.describe('F5 Prop308 UD DACA NoMilitarystatus', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {AZResidencyPage} */
    let residencyPage;
    /** @type {ReviewPage} */
    let reviewPage;
    let applicationId = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Steps 1-4: pre-app, My information (DACA, no uniformed services), My program,
        // My schools (Arizona high school, future graduation), grades.
        applicationId = await startApplicationAt(page, 'arizona-residency', {
            captureValidations: false,
            mode: testData.mode,
            applicant: testData.applicant,
            graduationDate: testData.graduationDate,
        });
        residencyPage = new AZResidencyPage(page);
        residencyPage.applicationId = applicationId;
        reviewPage = new ReviewPage(page);
        reviewPage.applicationId = applicationId;
        testInfo.annotations.push({ type: 'application', description: `${applicationId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it. These helpers do a missing step once, so any test
    // can also be run on its own (for example from the UI panel).
    let residencySaved = false;
    async function ensureResidencySaved() {
        if (residencySaved) return;
        await residencyPage.navigateToAZResidency();
        await residencyPage.fillProp308Residency(testData.residency);
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        residencySaved = true;
    }
    let submitted = false;
    /** IRREVERSIBLE: certifies and submits the application (once), with what Review offers for the fee. */
    async function ensureSubmitted() {
        if (submitted) return;
        await ensureResidencySaved();
        await reviewPage.navigateToReviewPage();
        const fee = {
            waived: await reviewPage.isFeeWaived(),
            waiverListOffered: await reviewPage.isFeeWaiverOffered(),
            paymentOffered: await reviewPage.isPaymentOffered(),
        };
        test.info().annotations.push({ type: 'fee section', description: JSON.stringify(fee) });
        if (!fee.waived && fee.waiverListOffered) {
            await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
            await reviewPage.requestFeeWaiver({ reasons: [testData.feeWaiverReason], signature: fullName });
        }
        await reviewPage.submitApplication({ certify: true, paymentOption: !fee.waived && fee.paymentOffered ? 'later' : null });
        await reviewPage.waitForSubmitted();
        submitted = true;
    }

    test('Arizona residency asks a DACA applicant only the Prop 308 questions', async () => {
        await residencyPage.navigateToAZResidency();
        expect(await residencyPage.isStepNotNecessary()).toBe(false);
        // No financial support, parent or license questions: the permanent home and the
        // Arizona high school graduation question only, whatever the home state.
        await expect.poll(() => residencyPage.getShownFields()).toEqual([...PROP308_FIELDS].sort());
        await residencyPage.selectPermanentState(testData.residency.permanentState);
        await expect.poll(() => residencyPage.getShownFields()).toEqual([...PROP308_FIELDS].sort());
    });

    test('Prop 308: Arizona, graduated from an Arizona high school; save and continue to Review', async () => {
        await residencyPage.navigateToAZResidency();
        await residencyPage.fillProp308Residency(testData.residency);
        expect(await residencyPage.getPermanentState()).toBe(testData.residency.permanentState);
        expect(await residencyPage.getAnswer('graduatedArizonaHighSchool')).toBe('Yes');
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        residencySaved = true;
    });

    test('Review shows the DACA applicant, no military status, the program and the high school', async () => {
        await ensureResidencySaved();
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe(fullName);
        expect(await reviewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am not a U.S. citizen');
        expect(await reviewPage.getSectionValue('My information', 'Which type of visa will you be holding?')).toBe(testData.applicant.visaType);
        expect(await reviewPage.getSectionValue('My information', 'Previous ASU affiliation'))
            .toBe('I have never been affiliated with Arizona State University');
        expect(await reviewPage.getSectionValue('My information', 'Military status')).toBe('None of these options apply to me');

        const { first } = await reviewPage.getChosenPrograms();
        expect(first).toBe(testData.program);
        expect(await reviewPage.getSectionValue('My program', 'Location')).not.toBe('ASU Online');

        expect(await reviewPage.getSectionValue('My schools', 'High school name')).toBe(testData.highSchool);
        expect(await reviewPage.getSectionValue('My schools', 'Graduation date')).toBe(`May, ${nextYear}`);
        // Prop 308 wording on Review (not the usual "Begin by selecting the state ...").
        expect(await reviewPage.getSectionValue('Arizona residency',
            'Which state do you consider to be your permanent domicile (i.e., your true, fixed and permanent home)?'))
            .toBe(testData.residency.permanentState);
        expect(await reviewPage.getSectionValue('Arizona residency',
            'Did you (or will you) graduate from an Arizona public or private high school, or homeschool equivalent, or obtain an Arizona high school equivalency diploma, e.g, GED?'))
            .toBe('Yes');
        expect(await reviewPage.getSectionValue('Arizona residency',
            'Did you (or will you) attend an Arizona public or private high school, or homeschool while physically present in Arizona for a minimum of two years?'))
            .toBe('Yes');
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
