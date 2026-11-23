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

/**
 * Flow F13: ASU Local flow (from "ASU Local_Automation_Testcases.xlsx"; the "To cover" list of the E2E
 * Flows workbook). An ASU Local applicant without partner benefits, so the fee is not waived.
 * The TC-0nn numbers below are the case IDs in that ASU Local sheet, not spec files.
 *
 *   Landing             the ASU Local landing link /?asulocal= preselects ASU Local
 *   My information      U.S. citizen with an Arizona home address. The ASU Local question the
 *                       sheet's TC-002/TC-003 describe was removed from My information on purpose
 *                       (tester, 2026-11-19): ASU Local is chosen on the landing link instead
 *   My program          (TC-010) the program list starts filtered to the six ASU Local sites
 *                       ("Location (6)" with an "ASU Local" chip): that filter is how ASU Local is
 *                       applied (tester, 2026-11-19); the program's own location list may also
 *                       offer other locations. (TC-011) Anthropology, BA at ASU Local at Los
 *                       Angeles is chosen and saved. No "You're an ASU Local student..."
 *                       guideline (TC-009) was seen; not checked
 *   My schools          Tempe High School, past graduation, no colleges
 *   Grades / residency  self-report; Arizona resident
 *   Review              (TC-014) the only payment option is "Pay later"; submitted with it
 *   Second application  (TC-016) "Start a new application" from Next steps with ASU Local:
 *                       My program again starts filtered to the ASU Local sites. The second
 *                       application is left as a draft (not submitted)
 *
 * THIS FLOW SUBMITS ONE APPLICATION (it cannot be undone). The last name is different on
 * every run.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

/** Letters only, new on every run. */
const uniqueLastName = `Local${Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')}`;
const pastYear = new Date().getFullYear() - 1;

const testData = {
    mode: /** @type {'asu-local'} */ ('asu-local'),
    applicant: {
        firstName: 'Qa',
        lastName: uniqueLastName,
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 20) },
        usCitizen: true, // Arizona home address: the journey's default
    },
    program: 'Anthropology, BA',
    location: 'ASU Local at Los Angeles',
    asuLocalSites: ['ASU Local at Chula Vista', 'ASU Local at Hawai‘i', 'ASU Local at Long Beach', 'ASU Local at Los Angeles',
        'ASU Local at Washington, D.C.', 'ASU Local at Yuma'],
    highSchool: { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${pastYear}` },
    residency: { permanentState: 'Arizona' },
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;

test.describe('ASU Local: filtered programs, Pay later only, second application', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyASUProgramPage} */
    let programPage;
    /** @type {MySchoolsPage} */
    let schoolsPage;
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
        // ASU Local landing link, sign-up and My information.
        applicationId = await startApplicationAt(page, 'my-program', {
            captureValidations: false, mode: testData.mode, applicant: testData.applicant,
        });
        programPage = new MyASUProgramPage(page);
        schoolsPage = new MySchoolsPage(page);
        gradesPage = new MyHighSchoolGradesPage(page);
        residencyPage = new AZResidencyPage(page);
        reviewPage = new ReviewPage(page);
        for (const p of [programPage, schoolsPage, gradesPage, residencyPage, reviewPage]) p.applicationId = applicationId;
        testInfo.annotations.push({ type: 'application', description: `${applicationId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it. These helpers do a missing step once, so any test
    // can also be run on its own (for example from the UI panel).
    const done = { program: false, toReview: false, submitted: false };

    async function ensureProgram() {
        if (done.program) return;
        await programPage.navigateToMyASUProgram();
        await programPage.selectProgram({ program: testData.program, degreeType: 'Bachelor', location: testData.location });
        await programPage.saveAndContinue();
        done.program = true;
    }
    async function ensureReview() {
        if (done.toReview) return;
        await ensureProgram();
        await schoolsPage.navigateToMySchools();
        await schoolsPage.addHighSchool(testData.highSchool);
        await schoolsPage.markNoCollegeAttended();
        await schoolsPage.acknowledgeTranscripts();
        await schoolsPage.saveAndContinue();
        if (!(await gradesPage.isStepNotNecessary())) {
            await gradesPage.chooseSelfReporting();
            await gradesPage.useDefaultSelfReportedGrades();
        }
        await gradesPage.saveAndContinue();
        await residencyPage.fillResidencyInformation({ isArizonaResident: true, permanentState: testData.residency.permanentState });
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        done.toReview = true;
    }
    /** IRREVERSIBLE: certifies and submits the application (once) with Pay later. */
    async function ensureSubmitted() {
        if (done.submitted) return;
        await ensureReview();
        await reviewPage.navigateToReviewPage();
        await reviewPage.submitApplication({ certify: true, paymentOption: 'later' });
        await reviewPage.waitForSubmitted();
        done.submitted = true;
    }

    test('My program: the program list starts filtered to the ASU Local sites', async () => {
        await programPage.navigateToMyASUProgram();
        expect(await programPage.getAsuLocalFilterState()).toEqual({ locationButton: `Location (${testData.asuLocalSites.length})`, asuLocalChip: true });

        // The program can be taken at an ASU Local site (its list may offer other locations too).
        const offered = await programPage.getProgramLocations(testData.program);
        test.info().annotations.push({ type: `${testData.program} locations offered`, description: JSON.stringify(offered) });
        expect(offered).toEqual(expect.arrayContaining([testData.location]));
    });

    test('My program: choose a program at an ASU Local site and continue', async () => {
        await programPage.navigateToMyASUProgram();
        const { first } = await programPage.selectProgram({ program: testData.program, degreeType: 'Bachelor', location: testData.location });
        expect(first.program).toBe(testData.program);
        expect(first.location).toBe(testData.location);
        await programPage.saveAndContinue();
        await schoolsPage.verifyPageLoaded();
        done.program = true;
    });

    test('Review: the only payment option is "Pay later"', async () => {
        await ensureReview();
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getSectionValue('My program', 'Location')).toBe(testData.location);
        expect(await reviewPage.isFeeWaived()).toBe(false);
        await expect.poll(() => reviewPage.getPaymentOptions()).toEqual(['Pay later']);
    });

    test('Submit with Pay later; Next steps shows the application', async () => {
        await ensureSubmitted();
        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = applicationId;
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(applicationId);
    });

    test('Second application with ASU Local: My program again starts filtered to the ASU Local sites', async () => {
        await ensureSubmitted();
        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = applicationId;
        await dashboard.verifyPageLoaded();
        const second = await dashboard.startOrResumeNewApplication({ mode: 'ASU Local' });
        test.info().annotations.push({ type: 'second application', description: JSON.stringify(second) });
        expect(second.applicationId).not.toBe(applicationId);

        // My information comes prefilled from the first application; continue to My program.
        const info = new MyInformationPage(page);
        info.applicationId = second.applicationId;
        await info.navigateToMyInformation();
        await info.saveAndContinue();
        const program2 = new MyASUProgramPage(page);
        program2.applicationId = second.applicationId;
        expect(await program2.getAsuLocalFilterState()).toEqual({ locationButton: `Location (${testData.asuLocalSites.length})`, asuLocalChip: true });
    });
});
