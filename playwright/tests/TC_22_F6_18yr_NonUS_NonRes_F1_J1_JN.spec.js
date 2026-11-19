// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F6: 18yr_NonUS_NonRes_F1_J1_JN
 * (row F6 of the "E2E Flows" sheet, "NAA App - Automation Test flows" workbook)
 *
 *   MOL                 online (the sheet allows any)
 *   18yr                applicant aged 18 (born January 15, 18 years ago)
 *   NonUS_NonRes        not a U.S. citizen, not a resident: visa type "International attending
 *                       ASU Online programs only (JN)". The sheet allows F-1, J-1 or JN; the
 *                       app does not offer F-1 for online study, so JN goes with online
 *   Previous ASU        never affiliated (the sheet allows any)
 *   Military status     "None of these options apply to me"
 *   Program             Anthropology, BA (the sheet allows any)
 *   Partner benefits    No (the sheet allows any)
 *   My schools          Tempe High School, graduation date in the past (the last May gone by)
 *   Grades              not applicable: the step says it is not necessary for a non-resident
 *   Residency           not applicable: same notice
 *   Payment             whatever Review offers (the sheet: waived or payment, at random)
 *
 * One fresh account per run (beforeAll), taken through steps 1-3 by the journey; the tests
 * then cover the two "not necessary" steps, Review and submission.
 *
 * THIS FLOW ALWAYS SUBMITS the application (it cannot be undone), so every run leaves one
 * submitted application in QA. The last name is different on every run.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

/** Letters only, new on every run. */
const uniqueLastName = `Flow${Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')}`;
const now = new Date();
/** The last May that has gone by: a past graduation date at about 18. */
const graduationYear = now.getMonth() > 4 ? now.getFullYear() : now.getFullYear() - 1;

const testData = {
    mode: /** @type {'online'} */ ('online'),
    applicant: {
        firstName: 'Qa',
        lastName: uniqueLastName,
        birth: { month: 'January', day: '15', year: String(now.getFullYear() - 18) },
        visaType: 'International attending ASU Online programs only (JN)',
    },
    graduationDate: `May ${graduationYear}`, // PastGrad
    highSchool: 'Tempe High School', // the journey's default
    program: 'Anthropology, BA',
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;

test.describe('F6 18yr NonUS NonRes F1 J1 JN', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyHighSchoolGradesPage} */
    let gradesPage;
    /** @type {AZResidencyPage} */
    let residencyPage;
    /** @type {ReviewPage} */
    let reviewPage;
    let applicationId = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Steps 1-3: pre-app, My information (JN visa, no uniformed services), My program,
        // My schools (Tempe High School, past graduation).
        applicationId = await startApplicationAt(page, 'my-high-school-grades', {
            captureValidations: false,
            mode: testData.mode,
            applicant: testData.applicant,
            graduationDate: testData.graduationDate,
        });
        gradesPage = new MyHighSchoolGradesPage(page);
        residencyPage = new AZResidencyPage(page);
        reviewPage = new ReviewPage(page);
        for (const p of [gradesPage, residencyPage, reviewPage]) p.applicationId = applicationId;
        testInfo.annotations.push({ type: 'application', description: `${applicationId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it. These helpers do a missing step once, so any test
    // can also be run on its own (for example from the UI panel).
    const done = { grades: false, residency: false, submitted: false };

    async function ensureGrades() {
        if (done.grades) return;
        await gradesPage.navigateToMyHighSchoolGrades();
        await gradesPage.saveAndContinue();
        done.grades = true;
    }
    async function ensureResidency() {
        if (done.residency) return;
        await ensureGrades();
        await residencyPage.navigateToAZResidency();
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        done.residency = true;
    }
    /** IRREVERSIBLE: certifies and submits the application (once), with what Review offers for the fee. */
    async function ensureSubmitted() {
        if (done.submitted) return;
        await ensureResidency();
        await reviewPage.navigateToReviewPage();
        const fee = {
            waived: await reviewPage.isFeeWaived(),
            waiverListOffered: await reviewPage.isFeeWaiverOffered(),
            paymentOffered: await reviewPage.isPaymentOffered(),
        };
        test.info().annotations.push({ type: 'fee section', description: JSON.stringify(fee) });
        console.log(`[F6] fee section on Review: ${JSON.stringify(fee)}`);
        if (!fee.waived && fee.waiverListOffered) {
            await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
            await reviewPage.requestFeeWaiver({ reasons: [testData.feeWaiverReason], signature: fullName });
        }
        await reviewPage.submitApplication({ certify: true, paymentOption: !fee.waived && fee.paymentOffered ? 'later' : null });
        await reviewPage.waitForSubmitted();
        done.submitted = true;
    }

    test('My high school grades is not necessary for a non-resident', async () => {
        await gradesPage.navigateToMyHighSchoolGrades();
        expect(await gradesPage.isStepNotNecessary()).toBe(true);
        const next = await gradesPage.saveAndContinue();
        test.info().annotations.push({ type: 'after grades', description: next });
        done.grades = true;
    });

    test('Arizona residency is not necessary for a non-resident', async () => {
        await ensureGrades();
        await residencyPage.navigateToAZResidency();
        expect(await residencyPage.isStepNotNecessary()).toBe(true);
        expect(await residencyPage.getShownFields()).toEqual([]);
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        done.residency = true;
    });

    test('Review shows the JN applicant, no military status, ASU Online and the high school', async () => {
        await ensureResidency();
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe(fullName);
        expect(await reviewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am not a U.S. citizen');
        expect(await reviewPage.getSectionValue('My information', 'Which type of visa will you be holding?')).toBe(testData.applicant.visaType);
        expect(await reviewPage.getSectionValue('My information', 'Previous ASU affiliation'))
            .toBe('I have never been affiliated with Arizona State University');
        expect(await reviewPage.getSectionValue('My information', 'Military status')).toBe('None of these options apply to me');

        const { first } = await reviewPage.getChosenPrograms();
        expect(first).toBe(testData.program);
        expect(await reviewPage.getSectionValue('My program', 'Location')).toBe('ASU Online');

        expect(await reviewPage.getSectionValue('My schools', 'High school name')).toBe(testData.highSchool);
        expect(await reviewPage.getSectionValue('My schools', 'Graduation date')).toBe(`May, ${graduationYear}`);
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
