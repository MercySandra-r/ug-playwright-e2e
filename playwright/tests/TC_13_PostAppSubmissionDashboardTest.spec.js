// @ts-check
const { test, expect } = require('@playwright/test');
const { signInWithSubmittedApplication } = require('../utils/applicationJourney');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Post-submission dashboard, "Next steps" (/ug-app/<id>/dashboard), against the live page.
 *
 * Needs an account whose application is ALREADY SUBMITTED: SUBMITTED_TEST_EMAIL /
 * SUBMITTED_TEST_PASSWORD when set. Without them, beforeAll creates a fresh applicant and
 * SUBMITS its application (irreversible: one more submitted application in QA per run).
 * The page is informational, so the tests are read-only; external links are checked, not
 * visited.
 *
 * POM: every element comes from PostAppSubmissionDashboardPage (its selectors, locator
 * methods and read-back methods); this spec has no locators of its own.
 */
test.describe('Post-Application Submission Dashboard Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {PostAppSubmissionDashboardPage} */
    let dashboard;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // A submitted application has no dashboard "Continue", so the ID is read from the
        // "Your applications" card instead of resumeApplication().
        const account = await signInWithSubmittedApplication(page);
        testInfo.annotations.push({ type: 'account', description: `${account.email}${account.created ? ' (created and submitted by this run)' : ''}` });
        dashboard = new PostAppSubmissionDashboardPage(page);
        await dashboard.getSubmittedApplicationId();
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => dashboard.navigateToDashboard();

    test('Verify Post-Application Dashboard loads successfully', async () => {
        await freshPage();
        await expect(page.locator(dashboard.selectors.congratulations)).toBeVisible();
    });

    test('Validate Post-Application Dashboard content', async () => {
        await freshPage();
        await dashboard.validatePostDashboard();
    });

    test('Verify application summary', async () => {
        await freshPage();
        const summary = await dashboard.getApplicationSummary();
        expect(summary.applicationId).toBe(dashboard.applicationId);
        expect(summary.program).toMatch(/, [A-Z]{2,4}$/);
        expect(summary.location).toBeTruthy();
        expect(summary.term).toMatch(/^(Spring|Summer|Fall) \d{4}/);
    });

    test('Verify contact information is displayed correctly', async () => {
        await freshPage();
        await dashboard.verifyPhoneNumber('866-277-6589');
        await dashboard.verifyEmailAddress('enrollmentonline@asu.edu');
        await dashboard.verifyPhoneNumber('855-278-5080'); // after-hours support
    });

    test('Check QTR alert presence for AZ Online students', async () => {
        // Closing the alert is remembered for the rest of the browser session, so this
        // test checks the alert and its link first, then closes it.
        await freshPage();
        expect(await dashboard.checkQtrAlertPresenceForAZOnline()).toBeTruthy();
        const qtr = await dashboard.clickQTRLink();
        expect(qtr.href).toBe('https://cfo.asu.edu/reduced-tuition');
        expect(qtr.target).toBe('_blank');
        await dashboard.closeQtrAlert();
    });

    test('Verify next-step links (My ASU, transcripts, FAFSA)', async () => {
        await freshPage();
        const links = await dashboard.verifyAllExternalLinks();
        const byName = Object.fromEntries(links.map((l) => [l.name, l]));
        expect(byName['My ASU'].href).toBe('https://my.asu.edu');
        expect(byName['Transcripts'].href).toBe('https://admission.asu.edu/apply/transcripts');
        expect(byName['FAFSA'].href).toBe('https://studentaid.gov/h/apply-for-aid/fafsa');
        expect(byName['ASU FAFSA page'].href).toBe('https://tuition.asu.edu/financial-aid/fafsa');
        for (const link of links) expect(link.target).toBe('_blank');
    });

    test('Pay application fee step shows for Pay later', async () => {
        await freshPage();
        expect(await dashboard.getFeeStatus()).toBe('unpaid');
    });

    test('Verify application status is displayed', async () => {
        await freshPage();
        expect(await dashboard.getApplicationStatus()).toMatch(/^Submitted on [A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    test('Verify Preview Application link functionality', async () => {
        await freshPage();
        await dashboard.clickPreviewLink();
    });

    test('Submitted application can no longer be edited', async () => {
        await dashboard.gotoApplicationStep('my-information');
        await dashboard.verifyPageLoaded(); // redirected back to Next steps
    });

    test('Verify responsive design on a phone viewport', async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        try {
            await freshPage();
            await dashboard.verifySummaryAndHelpVisible();
        } finally {
            await page.setViewportSize({ width: 1280, height: 720 });
        }
    });

    test('Verify basic accessibility of the dashboard page', async () => {
        await freshPage();
        expect(await dashboard.getAccessibilitySummary()).toEqual({ h1Count: 1, unnamedControls: 0 });
    });
});
