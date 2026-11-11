// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');

/**
 * Flow F12: Nursing - RN/BSN, BSN with a backup program.
 *
 * Nursing - RN/BSN needs a backup program, and adds a required question under the
 * selection, "Are you currently pursuing or have you completed a registered nurse
 * associate degree program?", whose answer decides the follow-up fields:
 *  - enrolled in an associate nursing program: institution (required), employer (optional)
 *  - completed one: institution (required); RN license state, license number (digits
 *    only) and employer are optional
 *  - none of these: the program is not available; Continue is blocked
 * Every answer is checked, then the applicant (a licensed RN in Arizona) continues through
 * schools, grades and residency to Review. Nothing is submitted.
 *
 * One fresh account per run (sign-up, pre-app dashboard and My information via the
 * journey helper). To reuse an account instead, set NURSING_TEST_EMAIL /
 * NURSING_TEST_PASSWORD to one whose application is on My program with nothing chosen.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */
const testData = {
    program: 'Nursing - RN/BSN, BSN',
    backupProgram: 'Anthropology, BA',
    rn: {
        pathway: /** @type {'completed'} */ ('completed'),
        licenseState: 'Arizona',
        institution: 'Mesa Community College',
        licenseNumber: '123456', // digits only: "The value can only contain numbers."
        employer: 'QA Test Hospital',
    },
    highSchool: { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: 'May 2026' },
};

test.describe('F12 Nursing - RN/BSN with backup program', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyASUProgramPage} */
    let programPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(420000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        programPage = new MyASUProgramPage(page);
        programPage.applicationId = process.env.NURSING_TEST_EMAIL && process.env.NURSING_TEST_PASSWORD
            ? await resumeApplication(page, process.env.NURSING_TEST_EMAIL, process.env.NURSING_TEST_PASSWORD)
            : await startApplicationAt(page, 'my-program');
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Program choices live in the page until Continue, so tests 1-6 share one page session.

    test('Nursing - RN/BSN requires a backup program', async () => {
        await programPage.navigateToMyASUProgram();
        expect(await programPage.isRnPathwayQuestionShown()).toBe(false);
        const { first } = await programPage.selectProgram({ program: testData.program, degreeType: 'Bachelor', autoBackup: false });
        expect(first.program).toBe(testData.program);
        expect(first.backupRequired).toBe(true);
        expect(await programPage.isBackupRequested()).toBe(true);

        const backup = await programPage.chooseBackupProgram({ program: testData.backupProgram, startTerm: first.startTerm });
        expect(backup.program).toBe(testData.backupProgram);
        const selected = await programPage.getSelectedPrograms();
        expect(selected.first?.program).toBe(testData.program);
        expect(selected.backup?.program).toBe(testData.backupProgram);
    });

    test('Nursing question: three answers, and it is required', async () => {
        expect(await programPage.isRnPathwayQuestionShown()).toBe(true);
        expect(await programPage.getDropdownOptions(programPage.selectors.rnPathway))
            .toEqual(Object.values(programPage.RN_PATHWAYS));
        expect(await programPage.getRnFollowUps()).toEqual([]);
        const errors = await programPage.continueExpectingValidation('Nursing question unanswered');
        expect(errors.map((e) => e.message)).toContain('This is a required field.');
    });

    test('Enrolled in an associate nursing program: institution required, employer optional', async () => {
        await programPage.answerRnPathway('enrolled');
        expect(await programPage.getRnFollowUps()).toEqual(['institutionName', 'employer']);
        expect(await programPage.getRnOptionalFields()).toEqual(['employer']);
        expect(await programPage.getRnInstitutionLabel()).toMatch(/^Institution name where you.re pursuing nursing associate degree/);

        // Employer alone is not enough: the institution is required.
        await programPage.fillRnDetails({ pathway: 'enrolled', employer: testData.rn.employer });
        const errors = await programPage.continueExpectingValidation('Nursing enrolled, no institution');
        expect(errors.map((e) => e.message)).toContain('This is a required field.');

        const entered = await programPage.fillRnDetails({ pathway: 'enrolled', institution: testData.rn.institution, employer: testData.rn.employer });
        expect(await programPage.readRnDetails()).toEqual(entered);
    });

    test('Completed an associate nursing program: only institution required, license number digits only', async () => {
        await programPage.answerRnPathway('completed');
        expect(await programPage.getRnFollowUps()).toEqual(['licenseState', 'institutionName', 'licenseNumber', 'employer']);
        // Only the institution is required.
        expect(await programPage.getRnOptionalFields()).toEqual(['licenseState', 'licenseNumber', 'employer']);
        expect(await programPage.getRnInstitutionLabel()).toMatch(/^Institution name where you earned nursing associate degree/);

        const states = await programPage.getDropdownOptions(programPage.selectors.rnLicenseState);
        test.info().annotations.push({ type: 'RN license states', description: `${states.length}: ${states.join(', ')}` });
        expect(states).toEqual(expect.arrayContaining(['Arizona', 'California', 'New York', 'Texas', 'District of Columbia', 'Puerto Rico Federal']));
        expect(states.length).toBeGreaterThanOrEqual(50);

        // No institution, and a license number with letters: both are flagged.
        await programPage.fillRnDetails({ pathway: 'completed', institution: '', licenseNumber: 'RN123456', employer: testData.rn.employer });
        const errors = await programPage.continueExpectingValidation('Nursing completed, institution empty, license number with letters');
        expect(errors).toEqual(expect.arrayContaining([
            { field: 'Institution name where you earned nursing associate degree', message: 'This is a required field.' },
            { field: 'RN license number', message: 'The value can only contain numbers.' },
        ]));
    });

    test('None of these apply: the program is not available and Continue is blocked', async () => {
        await programPage.answerRnPathway('none');
        expect(await programPage.getRnFollowUps()).toEqual(['notEligibleNotice']);
        await programPage.verifyContinueBlocked();
    });

    test('Licensed RN in Arizona: answers are kept and the step continues', async () => {
        const entered = await programPage.fillRnDetails(testData.rn);
        expect(await programPage.readRnDetails()).toEqual(entered);
        await programPage.saveAndContinue();
        await new MySchoolsPage(page).verifyPageLoaded();
    });

    test('Rest of the application: schools, grades and residency', async () => {
        test.setTimeout(300000);
        const schools = new MySchoolsPage(page);
        schools.applicationId = programPage.applicationId;
        await schools.addHighSchool(testData.highSchool);
        await schools.markNoCollegeAttended();
        await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();

        const grades = new MyHighSchoolGradesPage(page);
        grades.applicationId = programPage.applicationId;
        await grades.useDefaultSelfReportedGrades();
        await grades.saveAndContinue();

        const residency = new AZResidencyPage(page);
        residency.applicationId = programPage.applicationId;
        await residency.fillArizonaResidentAllYes();
        await residency.saveAndContinue();
        await new ReviewPage(page).verifyPageLoaded();
    });

    test('Review shows Nursing as first choice with the backup program', async () => {
        const review = new ReviewPage(page);
        review.applicationId = programPage.applicationId;
        await review.navigateToReviewPage();
        test.info().annotations.push({ type: 'Review: My program', description: JSON.stringify(await review.getSectionLines('My program')) });
        expect(await review.getChosenPrograms()).toEqual({ first: testData.program, second: testData.backupProgram });
    });
});
