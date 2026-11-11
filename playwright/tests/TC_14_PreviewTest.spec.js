// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const PreviewPage = require('../pages/PreviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * "Preview Submitted Application" (/ug-app/<id>/preview), against the live page.
 *
 * The preview only exists after submission, so this needs SUBMITTED_TEST_EMAIL /
 * SUBMITTED_TEST_PASSWORD (an account with a submitted application, created through the
 * journey defaults). Read-only: the PDF is not downloaded, nothing is submitted.
 * The old Excel comparison tests are replaced by a live comparison with Next steps.
 *
 * POM: every element comes from PreviewPage / PostAppSubmissionDashboardPage (their
 * selectors, locator methods and read-back methods); this spec has no locators of its own.
 */
test.describe('Preview Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });
    test.skip(!process.env.SUBMITTED_TEST_EMAIL || !process.env.SUBMITTED_TEST_PASSWORD,
        'Set SUBMITTED_TEST_EMAIL and SUBMITTED_TEST_PASSWORD to an account with a submitted application');

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {PreviewPage} */
    let previewPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        await new LoginPage(page).login(/** @type {string} */ (process.env.SUBMITTED_TEST_EMAIL), /** @type {string} */ (process.env.SUBMITTED_TEST_PASSWORD));
        previewPage = new PreviewPage(page);
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => previewPage.navigateToPreviewPage();

    test('Verify Preview page loads successfully', async () => {
        await freshPage();
        await expect(page.locator(previewPage.selectors.heading)).toBeVisible();
    });

    test('Validate Preview page content', async () => {
        await freshPage();
        await previewPage.validatePreview();
    });

    test('Verify application ID and submission date', async () => {
        await freshPage();
        const { applicationId, submittedOn } = await previewPage.getApplicationHeader();
        expect(applicationId).toBe(previewPage.applicationId);
        expect(submittedOn).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    test('Verify Download PDF button is enabled', async () => {
        await freshPage();
        await previewPage.verifyDownloadPdfButton();
    });

    test('Verify Back button functionality', async () => {
        await freshPage();
        await previewPage.clickBackButton();
        await new PostAppSubmissionDashboardPage(page).verifyPageLoaded();
    });

    test('Verify Profile section details', async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('Profile', 'Legal name')).toBe('Qa Automation');
        expect(await previewPage.getSectionValue('Profile', 'Date of birth')).toBe('2000-06-15');
        expect(await previewPage.getSectionValue('Profile', 'Email')).toBe(process.env.SUBMITTED_TEST_EMAIL);
    });

    test('Verify My Information section details', async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('My information', 'Legal sex')).toBe('Female');
        expect(await previewPage.getSectionValue('My information', 'Primary language spoken at home')).toBe('English');
        expect(await previewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am not a U.S. citizen');
    });

    test('Verify My Program section details', async () => {
        await freshPage();
        expect(await previewPage.getProgram()).toMatch(/, [A-Z]{2,4}$/);
        expect(await previewPage.getSectionValue('My program', 'Location')).toBe('ASU Online');
        expect(await previewPage.getSectionValue('My program', 'Starting term')).toMatch(/^(Spring|Summer|Fall) \d{4}/);
    });

    test('Verify My Schools section details', async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('My schools', 'High school name')).toBe('Tempe High School');
    });

    test('Verify High School Grades section details', async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('My high school grades', 'Self-reported')).toMatch(/^(Yes|No)$/);
    });

    test('Verify Arizona Residency section details', async () => {
        await freshPage();
        const state = await previewPage.getSectionValue('Arizona residency', 'Begin by selecting the state you consider to be your permanent home.');
        expect(['California', 'Arizona']).toContain(state);
    });

    test('Preview matches the Next steps application summary', async () => {
        await freshPage();
        const program = await previewPage.getProgram();
        const location = await previewPage.getSectionValue('My program', 'Location');
        const term = await previewPage.getSectionValue('My program', 'Starting term');

        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = previewPage.applicationId;
        await dashboard.navigateToDashboard();
        const summary = await dashboard.getApplicationSummary();
        expect(summary.program).toBe(program);
        expect(summary.location).toBe(location);
        expect(summary.term).toBe(term);
    });

    test('Verify Application Affidavit section', async () => {
        await freshPage();
        await previewPage.verifyApplicationAffidavit();
        await previewPage.clickReadAffidavitLink();
    });

    test('Verify Return to Previous Page functionality', async () => {
        await freshPage();
        await previewPage.clickReturnToPreviousPage();
        await new PostAppSubmissionDashboardPage(page).verifyPageLoaded();
    });

    test('Verify responsive design on a phone viewport', async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        try {
            await freshPage();
            await previewPage.verifyKeyContentVisible();
        } finally {
            await page.setViewportSize({ width: 1280, height: 720 });
        }
    });

    test('Verify basic accessibility of the preview page', async () => {
        await freshPage();
        expect(await previewPage.getAccessibilitySummary()).toEqual({ h1Count: 1, unnamedControls: 0 });
    });
});
