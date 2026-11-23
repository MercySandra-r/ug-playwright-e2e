// @ts-check
const { test, expect } = require('@playwright/test');
const { signInWithSubmittedApplication } = require('../utils/applicationJourney');
const PreviewPage = require('../pages/PreviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * "Preview Submitted Application" (/ug-app/<id>/preview), against the live page.
 *
 * The preview only exists after submission: SUBMITTED_TEST_EMAIL / SUBMITTED_TEST_PASSWORD
 * (an account with a submitted application, created through the journey defaults) when
 * set. Without them, beforeAll creates a fresh applicant and SUBMITS its application
 * (irreversible: one more submitted application in QA per run). The tests themselves are
 * read-only: the PDF is not downloaded.
 * The old Excel comparison tests are replaced by a live comparison with Next steps.
 *
 * POM: every element comes from PreviewPage / PostAppSubmissionDashboardPage (their
 * selectors, locator methods and read-back methods); this spec has no locators of its own.
 */
test.describe('Preview Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {PreviewPage} */
    let previewPage;
    /** The signed-in account's email (SUBMITTED_TEST_EMAIL, or the account created here). */
    let accountEmail = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        const account = await signInWithSubmittedApplication(page);
        accountEmail = account.email;
        testInfo.annotations.push({ type: 'account', description: `${account.email}${account.created ? ' (created and submitted by this run)' : ''}` });
        previewPage = new PreviewPage(page);
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => previewPage.navigateToPreviewPage();

    test('Verify Preview page loads successfully', { tag: ['@smoke', '@regression'] }, async () => {
        await freshPage();
        await expect(page.locator(previewPage.selectors.heading)).toBeVisible();
    });

    test('Validate Preview page content', { tag: '@regression' }, async () => {
        await freshPage();
        await previewPage.validatePreview();
    });

    test('Verify application ID and submission date', { tag: '@regression' }, async () => {
        await freshPage();
        const { applicationId, submittedOn } = await previewPage.getApplicationHeader();
        expect(applicationId).toBe(previewPage.applicationId);
        expect(submittedOn).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    test('Verify Download PDF button is enabled', { tag: '@regression' }, async () => {
        await freshPage();
        await previewPage.verifyDownloadPdfButton();
    });

    test('Verify Back button functionality', { tag: '@regression' }, async () => {
        await freshPage();
        await previewPage.clickBackButton();
        await new PostAppSubmissionDashboardPage(page).verifyPageLoaded();
    });

    test('Verify Profile section details', { tag: '@regression' }, async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('Profile', 'Legal name')).toBe('Qa Automation');
        expect(await previewPage.getSectionValue('Profile', 'Date of birth')).toBe('2000-06-15');
        expect(await previewPage.getSectionValue('Profile', 'Email')).toBe(accountEmail);
    });

    test('Verify My Information section details', { tag: '@regression' }, async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('My information', 'Legal sex')).toBe('Female');
        expect(await previewPage.getSectionValue('My information', 'Primary language spoken at home')).toBe('English');
        expect(await previewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am not a U.S. citizen');
    });

    test('Verify My Program section details', { tag: '@regression' }, async () => {
        await freshPage();
        expect(await previewPage.getProgram()).toMatch(/, [A-Z]{2,4}$/);
        expect(await previewPage.getSectionValue('My program', 'Location')).toBe('ASU Online');
        expect(await previewPage.getSectionValue('My program', 'Starting term')).toMatch(/^(Spring|Summer|Fall) \d{4}/);
    });

    test('Verify My Schools section details', { tag: '@regression' }, async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('My schools', 'High school name')).toBe('Tempe High School');
    });

    test('Verify High School Grades section details', { tag: '@regression' }, async () => {
        await freshPage();
        expect(await previewPage.getSectionValue('My high school grades', 'Self-reported')).toMatch(/^(Yes|No)$/);
    });

    test('Verify Arizona Residency section details', { tag: '@regression' }, async () => {
        await freshPage();
        const state = await previewPage.getSectionValue('Arizona residency', 'Begin by selecting the state you consider to be your permanent home.');
        expect(['California', 'Arizona']).toContain(state);
    });

    test('Preview matches the Next steps application summary', { tag: '@regression' }, async () => {
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

    test('Verify Application Affidavit section', { tag: '@regression' }, async () => {
        await freshPage();
        await previewPage.verifyApplicationAffidavit();
        await previewPage.clickReadAffidavitLink();
    });

    test('Verify Return to Previous Page functionality', { tag: '@regression' }, async () => {
        await freshPage();
        await previewPage.clickReturnToPreviousPage();
        await new PostAppSubmissionDashboardPage(page).verifyPageLoaded();
    });

    test('Verify responsive design on a phone viewport', { tag: '@regression' }, async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        try {
            await freshPage();
            await previewPage.verifyKeyContentVisible();
        } finally {
            await page.setViewportSize({ width: 1280, height: 720 });
        }
    });

    test('Verify basic accessibility of the preview page', { tag: '@regression' }, async () => {
        await freshPage();
        expect(await previewPage.getAccessibilitySummary()).toEqual({ h1Count: 1, unnamedControls: 0 });
    });
});
