// @ts-check
const { test, expect } = require('@playwright/test');
const { signUpVerifiedAccount } = require('../utils/authHelper');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');

/**
 * My ASU program (step 2 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll): sign up, start an application, complete
 * step 1, land on step 2. The suite is serial: validation first, read-only checks next,
 * then choices are saved, and "Save and continue" runs last.
 * Account creation is rate-limited per hour by the IdP; this suite creates one.
 *
 * Debugging without creating accounts: set MYPROGRAM_TEST_EMAIL and
 * MYPROGRAM_TEST_PASSWORD to an account whose application is on step 2 with no
 * program chosen yet; beforeAll then signs in and resumes it.
 *
 * POM: every element comes from MyASUProgramPage (its selectors, locator methods and
 * read-back methods); this spec has no locators of its own.
 */
test.describe('My ASU Program Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    // Computer Science, BS has higher admission requirements, so it needs a backup.
    const FIRST_CHOICE = 'Computer Science, BS';
    const BACKUP = 'Anthropology, BA';
    const BACKUP_CHANGED = 'Anthropology, BS';
    const START_TERM = 'Fall 2027';

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyASUProgramPage} */
    let programPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(300000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        programPage = new MyASUProgramPage(page);
        if (process.env.MYPROGRAM_TEST_EMAIL && process.env.MYPROGRAM_TEST_PASSWORD) {
            await new LoginPage(page).login(process.env.MYPROGRAM_TEST_EMAIL, process.env.MYPROGRAM_TEST_PASSWORD);
            programPage.applicationId = await programPage.getApplicationId();
        } else {
            await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
            programPage.applicationId = await new PreAppDashboardPage(page).startApplication();
            const myInfo = new MyInformationPage(page);
            myInfo.applicationId = programPage.applicationId;
            await myInfo.navigateToMyInformation();
            await myInfo.completeRequiredFields();
            await myInfo.saveAndContinue();
        }
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Choices on this step are only saved by Continue: a reload drops them. Tests 1-9
    // start from a fresh load; tests 10-13 continue the unsaved session test 9 started.
    const freshPage = () => programPage.navigateToMyASUProgram();

    test('Verify error messages for required fields', async () => {
        await freshPage();
        await programPage.clickContinue();
        await programPage.verifyErrorMessage('Please select a first choice program.');
    });

    test('Verify My ASU Program page loads successfully', async () => {
        await freshPage();
        await programPage.verifySelectedDegreeType('Bachelor');
        await programPage.verifyDegreeSearchVisible();
    });

    test('Get and verify program list', async () => {
        await freshPage();
        const programs = await programPage.getProgramList();
        expect(programs.length).toBeGreaterThan(0);
        // Card titles are "<Name>, <degree abbreviation>", e.g. "Accountancy, BS".
        for (const name of programs) expect(name).toMatch(/, [A-Z]{2,4}$/);
    });

    test('Search for a program', async () => {
        await freshPage();
        await programPage.searchProgram('Computer Science');
        const results = await programPage.getProgramList();
        expect(results).toContain(FIRST_CHOICE);

        await programPage.clearSearch();
        expect((await programPage.getProgramList()).length).toBeGreaterThanOrEqual(results.length);
    });

    test('Filter programs by interest area and college', async () => {
        await freshPage();
        await programPage.applyFilters({ interestArea: 'Computing and Mathematics' });
        const byInterest = await programPage.getProgramList();
        expect(byInterest.length).toBeGreaterThan(0);

        await programPage.applyFilters({ college: 'Engineering, Ira A. Fulton Schools of' });
        const byBoth = await programPage.getProgramList();
        expect(byBoth.length).toBeGreaterThan(0);
        expect(byBoth.length).toBeLessThanOrEqual(byInterest.length);

        await programPage.clearAllFilters();
        expect((await programPage.getProgramList()).length).toBeGreaterThanOrEqual(byInterest.length);
    });

    test('Verify program details display', async () => {
        await freshPage();
        await programPage.searchProgram('Computer Science');
        const details = await programPage.openProgramDetails(FIRST_CHOICE);
        expect(details).toContain(FIRST_CHOICE);
        expect(details).toContain('Ira A. Fulton Schools of Engineering');
        expect(details).toMatch(/Location .*ASU Online/);
        await programPage.closeDialog();
    });

    test('Verify academic calendar link', async () => {
        await freshPage();
        const calendar = await programPage.openAcademicCalendar();
        expect(programPage.verifyAcademicCalendar(calendar)).toBeTruthy();
        await programPage.closeDialog();
    });

    test('Switch between degree and nondegree', async () => {
        await freshPage();
        await programPage.selectDegreeIntent('Non-Degree');
        await programPage.verifyNondegreeFormVisible();

        await programPage.selectDegreeIntent('Bachelor');
        await programPage.verifySelectedDegreeType('Bachelor');
        await programPage.waitForResults();
    });

    test('Select a program as first choice', async () => {
        await freshPage();
        const { first } = await programPage.selectProgram({
            program: FIRST_CHOICE, degreeType: 'Bachelor', startTerm: START_TERM, autoBackup: false,
        });
        expect(first.program).toBe(FIRST_CHOICE);
        expect(first.startTerm).toMatch(/^2027 fall/);
        expect(first.backupRequired).toBeTruthy();

        const selected = await programPage.getSelectedPrograms();
        expect(selected.first?.program).toBe(FIRST_CHOICE);
        expect(await programPage.isBackupRequested()).toBe(true);
    });

    test('Verify program selection as second choice', async () => {
        const backup = await programPage.chooseBackupProgram({ program: BACKUP, startTerm: START_TERM });
        expect(backup.program).toBe(BACKUP);

        const selected = await programPage.getSelectedPrograms();
        expect(selected.first?.program).toBe(FIRST_CHOICE);
        expect(selected.backup?.program).toBe(BACKUP);
    });

    test('Change the backup program', async () => {
        await programPage.changeProgram('backup');
        await programPage.chooseBackupProgram({ program: BACKUP_CHANGED, startTerm: START_TERM });

        const selected = await programPage.getSelectedPrograms();
        expect(selected.backup?.program).toBe(BACKUP_CHANGED);
    });

    test('Select optional interests', async () => {
        await programPage.selectInterests(['Pre-law interest']);
        expect(await programPage.isInterestSelected('Pre-law interest')).toBe(true);
    });

    test('Save and continue to next section', async () => {
        await programPage.saveAndContinue();
        await new MySchoolsPage(page).verifyPageLoaded();
    });
});
