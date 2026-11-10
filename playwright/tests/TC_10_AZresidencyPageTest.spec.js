// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const AZResidencyPage = require('../pages/AZResidencyPage');

/**
 * Arizona residency (step 5 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll) taken through steps 1-4 to step 5. Serial:
 * tests 1-8 start from a fresh load; the last test continues test 8's filled form
 * to Review. Account creation is rate-limited per hour; this suite creates one.
 *
 * The old document upload / additional-information / military tests are gone: the
 * live step has no uploads or free-text box, and military status is asked on
 * My information.
 *
 * Debugging without creating accounts: set RESIDENCY_TEST_EMAIL and
 * RESIDENCY_TEST_PASSWORD to an account whose application is on step 5.
 */
test.describe('AZ Residency Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {AZResidencyPage} */
    let residencyPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        residencyPage = new AZResidencyPage(page);
        residencyPage.applicationId = process.env.RESIDENCY_TEST_EMAIL && process.env.RESIDENCY_TEST_PASSWORD
            ? await resumeApplication(page, process.env.RESIDENCY_TEST_EMAIL, process.env.RESIDENCY_TEST_PASSWORD)
            : await startApplicationAt(page, 'arizona-residency');
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => residencyPage.navigateToAZResidency();

    test('Verify error message for required fields', async () => {
        await freshPage();
        await residencyPage.clickContinue();
        await residencyPage.verifyErrorMessage('This is a required field.');
        // State, six Yes/No questions and the support total are all required.
        expect(await page.locator(residencyPage.selectors.requiredFieldError).count()).toBeGreaterThanOrEqual(6);
        await expect(page).toHaveURL(/\/arizona-residency/);
    });

    test('Verify AZ Residency page loads successfully', async () => {
        await freshPage();
        await residencyPage.validateAZresidencyPage();
    });

    test('Answer permanent home question (non-AZ resident)', async () => {
        await freshPage();
        await residencyPage.answerPermanentHomeQuestion(false);
        await expect(page.locator(residencyPage.selectors.permanentState)).toHaveValue('California');
        expect(await residencyPage.isQuestionVisible('livedInAz12Months')).toBeFalsy();
        expect(await residencyPage.isQuestionVisible('married')).toBeFalsy();
    });

    test('Answer permanent home question (AZ resident)', async () => {
        await freshPage();
        await residencyPage.answerPermanentHomeQuestion(true);
        await expect(page.locator(residencyPage.selectors.permanentState)).toHaveValue('Arizona');
        expect(await residencyPage.isQuestionVisible('livedInAz12Months')).toBeTruthy();
        expect(await residencyPage.isQuestionVisible('married')).toBeTruthy();
        await expect(page.locator('#' + residencyPage.QUESTIONS.livedInAz12Months.id)
            .getByRole('radio', { name: 'Yes', exact: true })).toHaveAttribute('aria-checked', 'true');
    });

    test('Financial support must total 100%', async () => {
        await freshPage();
        await residencyPage.setFinancialSupport({ parent: 60, employment: 20 });
        expect(await residencyPage.getSupportTotal()).toBe(80);
        await residencyPage.clickContinue();
        await expect(page.locator(residencyPage.selectors.supportTotalError)).toBeVisible();

        await residencyPage.setFinancialSupport({ parent: 60, employment: 40 });
        expect(await residencyPage.getSupportTotal()).toBe(100);
        await expect(page.locator(residencyPage.selectors.supportTotalError)).toHaveCount(0);
    });

    test('Answer parent/guardian question', async () => {
        await freshPage();
        await residencyPage.answerParentGuardianQuestion(true);
        // Parents living in Arizona reveals the parent block.
        await expect(page.locator(residencyPage.selectors.parentRelationship)).toBeVisible();
        await expect(page.locator(residencyPage.selectors.parentAzSinceMonth)).toBeVisible();
        expect(await residencyPage.isQuestionVisible('parentFiledTaxes')).toBeTruthy();
        expect(await residencyPage.isQuestionVisible('parentHasAzLicense')).toBeTruthy();
        expect(await residencyPage.isQuestionVisible('parentEmployedInAz')).toBeTruthy();

        await residencyPage.fillArizonaParentDetails({ relationship: 'Mother', filedTaxes: true });
        await expect(page.locator(residencyPage.selectors.parentRelationship)).toHaveValue('Mother');
    });

    test('Employment follow-up question', async () => {
        await freshPage();
        expect(await residencyPage.isQuestionVisible('employedLast12Months')).toBeFalsy();
        await residencyPage.answer('employed', false);
        expect(await residencyPage.isQuestionVisible('employedLast12Months')).toBeTruthy();
        await residencyPage.answer('employed', true);
        await expect(page.locator('#' + residencyPage.QUESTIONS.employedLast12Months.id)).toBeHidden();
    });

    test('Complete AZ residency form for AZ resident with AZ parent', async () => {
        await freshPage();
        await residencyPage.fillResidencyInformation({
            isArizonaResident: true,
            answers: { hasLicense: true, filedStateTaxes: true, employed: false },
        });
        expect(await residencyPage.getSupportTotal()).toBe(100);
        // Every question is now answered: a second pass finds nothing left.
        expect(await residencyPage.answerRemainingQuestions()).toEqual([]);
    });

    test('Save and continue to next section', async () => {
        await residencyPage.saveAndContinue();
        await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
    });
});
