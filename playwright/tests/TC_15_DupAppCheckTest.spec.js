// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');

/**
 * Duplicate-application check and sign-out / sign-in persistence, against the live site.
 *
 * Needs SUBMITTED_TEST_EMAIL / SUBMITTED_TEST_PASSWORD (an account with a submitted
 * application). Nothing is ever submitted. The duplicate check opens a second
 * application (resuming the in-progress draft if one exists, so reruns don't create more)
 * and confirms the start term already applied for is blocked for the same program.
 *
 * Step 1 of the second application uses the non-citizen path, where SSN is optional.
 * The U.S.-citizen path requires a Social Security Number, which automation does not
 * type; that path is out of scope here.
 */
test.describe('Duplicate Application Check Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });
    test.skip(!process.env.SUBMITTED_TEST_EMAIL || !process.env.SUBMITTED_TEST_PASSWORD,
        'Set SUBMITTED_TEST_EMAIL and SUBMITTED_TEST_PASSWORD to an account with a submitted application');

    const email = /** @type {string} */ (process.env.SUBMITTED_TEST_EMAIL);
    const password = /** @type {string} */ (process.env.SUBMITTED_TEST_PASSWORD);

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {PostAppSubmissionDashboardPage} */
    let dashboard;
    /** @type {{ applicationId: string, program: string, location: string, term: string }} */
    let submitted;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        await new LoginPage(page).login(email, password);
        dashboard = new PostAppSubmissionDashboardPage(page);
        await dashboard.navigateToDashboard();
        submitted = await dashboard.getApplicationSummary();
    });

    test.afterAll(async () => {
        await context?.close();
    });

    test('Profile menu offers Dashboard, Edit profile and Sign out', async () => {
        await page.goto('/dashboard');
        expect(await dashboard.getProfileMenuItems()).toEqual(expect.arrayContaining(['Dashboard', 'Edit profile', 'Sign out']));
    });

    test('Dashboard lists the submitted application', async () => {
        await page.goto('/dashboard');
        const card = await dashboard.submittedCard(submitted.applicationId);
        await expect(card).toContainText(`Application ID: ${submitted.applicationId}`);
        await expect(card.locator('p:visible', { hasText: /^\s*Submitted on / }).first()).toBeVisible();
    });

    test('Verify duplicate application prevention (term already applied for is blocked)', async () => {
        const { applicationId: secondId } = await dashboard.startOrResumeNewApplication({ mode: 'Online' });
        expect(secondId).not.toBe(submitted.applicationId);

        // Reach step 2 of the second application (step 1 comes pre-filled from the first).
        if (/\/my-information/.test(page.url())) {
            const info = new MyInformationPage(page);
            info.applicationId = secondId;
            await info.completeRequiredFields();
            await info.saveAndContinue();
        }
        const program = new MyASUProgramPage(page);
        program.applicationId = secondId;
        await program.navigateToMyASUProgram();

        const terms = await program.getStartTermOptions(submitted.program);
        // "Spring 2027 - (Session A)" on Next steps is "2027 spring - (Session A)" in the dialog.
        const [, season, year, session] = /** @type {RegExpMatchArray} */ (submitted.term.match(/^(\w+) (\d{4}) - \((.+)\)$/));
        const appliedLabel = `${year} ${season.toLowerCase()} - (${session})`;
        const applied = terms.find((t) => t.label === appliedLabel);
        expect(applied, `term "${appliedLabel}" should be listed`).toBeTruthy();
        expect(applied?.disabled).toBe(true);
        expect(terms.some((t) => !t.disabled), 'other terms stay available').toBeTruthy();
    });

    test('Verify sign out', async () => {
        await page.goto('/dashboard');
        await dashboard.signOut();
        await expect(page.getByRole('heading', { name: /^Welcome back/ })).toHaveCount(0);
    });

    test('Protected pages require signing in again after sign out', async () => {
        await page.goto('/dashboard');
        await page.waitForTimeout(3000);
        await expect(page.getByRole('heading', { name: /^Welcome back/ })).toHaveCount(0);
        expect(page.url()).not.toMatch(/\/ug-app\//);
    });

    test('Application status and data persist after signing back in', async () => {
        await new LoginPage(page).login(email, password);
        const fresh = new PostAppSubmissionDashboardPage(page);
        fresh.applicationId = submitted.applicationId;
        expect(await fresh.getApplicationStatus()).toMatch(/^Submitted on /);
        await fresh.navigateToDashboard();
        expect(await fresh.getApplicationSummary()).toEqual(submitted);
    });
});

/**
 * Duplicate IDENTITY check: a brand-new account for the same person (same name, birthday
 * and Social Security Number) applying to the same program and term must be BLOCKED when
 * saving on My program.
 *
 * Runs only when TEST_SSN is set by the tester (e.g. TEST_SSN=111111111); the SSN is
 * typed by MyInformationPage from that variable. Creates one new account per run.
 * Another application with the same SSN, program and term must already exist in QA.
 * Identity defaults: first name "Mercy", last name "Sandra R", birthday April 17 1999
 * (the existing duplicate record). Optional overrides: DUP_CHECK_FIRST_NAME,
 * DUP_CHECK_LAST_NAME, DUP_CHECK_DOB ("Month D YYYY"; must match the existing record),
 * DUP_CHECK_PROGRAM (default "Anthropology, BA"), DUP_CHECK_TERM (default
 * "2027 spring - (Session A)").
 */
test.describe('Duplicate identity check (new account, same SSN)', () => {
    test.describe.configure({ mode: 'serial', timeout: 420000 });
    test.skip(!process.env.TEST_SSN, 'Set TEST_SSN (9 digits) yourself to run the duplicate-identity check');

    test('Saving the same program and term on My program is blocked', async ({ page }) => {
        const { signUpVerifiedAccount } = require('../utils/authHelper');
        const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
        const program = process.env.DUP_CHECK_PROGRAM || 'Anthropology, BA';
        const term = process.env.DUP_CHECK_TERM || '2027 spring - (Session A)';

        const [month, day, year] = (process.env.DUP_CHECK_DOB || 'April 17 1999').split(/\s+/);

        await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
        const applicationId = await new PreAppDashboardPage(page).startApplication({
            firstName: process.env.DUP_CHECK_FIRST_NAME || 'Mercy',
            lastName: process.env.DUP_CHECK_LAST_NAME || 'Sandra R',
            birth: { month, day, year },
        });

        const info = new MyInformationPage(page);
        info.applicationId = applicationId;
        await info.verifyPageLoaded();
        await info.completeRequiredFields({ usCitizenship: 'Yes', countryOfBirth: 'United States' }); // SSN from TEST_SSN
        await info.saveAndContinue();

        const programPage = new MyASUProgramPage(page);
        programPage.applicationId = applicationId;
        await programPage.verifyPageLoaded();
        await programPage.selectProgram({ program, degreeType: 'Bachelor', startTerm: term });
        await programPage.clickContinue();
        await page.waitForTimeout(5000);

        // Expected (verified manually 2026-11-10): blocked on My program, with this message
        // under the selection plus "Update term" / "Change program" buttons.
        await expect(page).toHaveURL(/\/my-program/);
        const error = page.locator(programPage.selectors.duplicateStartDateError);
        await expect(error).toBeVisible();
        await expect(error).toHaveText(
            "You have already submitted an application for your chosen start date. Multiple applications can't be "
            + "submitted for the same start date. You'll need to select a new start date to continue this application.");
        await expect(page.locator(programPage.selectors.updateTermButton)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Change program' })).toBeVisible();
    });
});
