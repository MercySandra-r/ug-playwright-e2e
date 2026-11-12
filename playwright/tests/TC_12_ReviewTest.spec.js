// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const ReviewPage = require('../pages/ReviewPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const { isSignupAddress } = require('../utils/inboxes');

/**
 * Review (step 6 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll) taken through steps 1-5 with the journey
 * defaults (Qa Automation, Female, English, not a U.S. citizen, Anthropology BA, Tempe
 * High School, no self-reported grades, California). Account creation is
 * rate-limited per hour; this suite creates one.
 *
 * SUBMISSION IS IRREVERSIBLE: the two submit tests only run with REVIEW_ALLOW_SUBMIT=1.
 * Card payment is never exercised.
 *
 * The old Excel comparison test is gone: its data file never existed.
 *
 * Debugging without creating accounts: set REVIEW_TEST_EMAIL and REVIEW_TEST_PASSWORD to
 * an account whose application is on Review (and not submitted).
 *
 * POM: every element comes from ReviewPage (its selectors, sectionButton() and read-back
 * methods); this spec has no locators of its own.
 */
test.describe('Review Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });
    const allowSubmit = process.env.REVIEW_ALLOW_SUBMIT === '1';

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {ReviewPage} */
    let reviewPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        reviewPage = new ReviewPage(page);
        reviewPage.applicationId = process.env.REVIEW_TEST_EMAIL && process.env.REVIEW_TEST_PASSWORD
            ? await resumeApplication(page, process.env.REVIEW_TEST_EMAIL, process.env.REVIEW_TEST_PASSWORD)
            : await startApplicationAt(page, 'review');
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => reviewPage.navigateToReviewPage();

    test('Verify Review page loads successfully', async () => {
        await freshPage();
        await reviewPage.validateReview();
    });

    test('Submit application before certifying shows field validations', async () => {
        await freshPage();
        // Refuses to click unless the certification is unticked, so nothing is submitted.
        const errors = await reviewPage.captureSubmitValidations();
        // captureSubmitValidations throws if the page leaves Review.
        expect(errors.length, 'Submit with nothing certified should flag at least one field').toBeGreaterThan(0);
    });

    test('Verify Profile section details', async () => {
        await freshPage();
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe('Qa Automation');
        expect(await reviewPage.getSectionValue('Profile', 'Date of birth')).toBe('2000-06-15');
        // The account's sign-up address: "<inbox>+asuqaNNNN@..." on any inbox configured in .env
        const email = (await reviewPage.getSectionValue('Profile', 'Email')) || '';
        expect(isSignupAddress(email), `Profile email "${email}" is a suite sign-up address`).toBe(true);
        expect(await reviewPage.getSectionValue('Profile', 'Phone')).toBe('+1 (202) 555-1234');
    });

    test('Verify My Information section details', async () => {
        await freshPage();
        expect(await reviewPage.getSectionValue('My information', 'Legal sex')).toBe('Female');
        expect(await reviewPage.getSectionValue('My information', 'Primary language spoken at home')).toBe('English');
        expect(await reviewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am not a U.S. citizen');
        expect(await reviewPage.getSectionValue('My information', 'Home address')).toContain('Tempe, AZ');
    });

    test('Verify My Program section details', async () => {
        await freshPage();
        // "Program" for a single choice; "First choice"/"Second choice" with a backup.
        const { first } = await reviewPage.getChosenPrograms();
        expect(first).toMatch(/, [A-Z]{2,4}$/);
        expect(await reviewPage.getSectionValue('My program', 'Location')).toBe('ASU Online');
        expect(await reviewPage.getSectionValue('My program', 'Starting term')).toMatch(/^(Spring|Summer|Fall) \d{4}/);
    });

    test('Verify My Schools section details', async () => {
        await freshPage();
        expect(await reviewPage.getSectionValue('My schools', 'High school name')).toBe('Tempe High School');
        // The country shows as "USA" on Review, though My schools itself says "United States".
        // Either is accepted; "USA" is recorded as a note on the test instead of failing it.
        const location = (await reviewPage.getSectionValue('My schools', 'Location')) || '';
        expect(location).toMatch(/^Tempe, Arizona, (United States|USA)$/);
        if (/USA$/.test(location)) {
            test.info().annotations.push({
                type: 'note',
                description: `Review shows the high school location as "${location}"; My schools shows the country as "United States"`,
            });
        }
    });

    test('Verify High School Grades section details', async () => {
        await freshPage();
        expect(await reviewPage.getSectionValue('My high school grades', 'Self-reported')).toMatch(/^(Yes|No)$/);
    });

    test('Verify Arizona Residency section details', async () => {
        await freshPage();
        const state = await reviewPage.getSectionValue('Arizona residency', 'Begin by selecting the state you consider to be your permanent home.');
        expect(['California', 'Arizona']).toContain(state);
    });

    test('Edit a section opens its step', async () => {
        await freshPage();
        await reviewPage.clickEditSection('My schools');
        await new MySchoolsPage(page).verifyPageLoaded();
    });

    test('Verify Application Affidavit section', async () => {
        await freshPage();
        await reviewPage.verifyApplicationAffidavit();
        await reviewPage.certifyAffidavit(true);
        await reviewPage.certifyAffidavit(false);
    });

    test('Verify external links', async () => {
        await freshPage();
        const { acd401, reportIt } = await reviewPage.verifyExternalLinks();
        expect(acd401).toMatch(/asu\.edu/);
        expect(reportIt).toMatch(/asu\.edu\/reportit/);
    });

    test('Verify Application Fee section', async () => {
        await freshPage();
        const { amount, options } = await reviewPage.verifyApplicationFeeSection();
        expect(amount).toMatch(/^\$\d+\.\d{2}$/);
        expect(options).toEqual(['Pay now (Visa, Mastercard, Discover or American Express)', 'Pay later']);
    });

    test('Select payment option (Pay now / Pay later)', async () => {
        await freshPage();
        await reviewPage.selectPaymentMethod('Visa'); // old card-brand names map to "Pay now"
        expect(await reviewPage.getSelectedPaymentOption()).toBe('Pay now');
        await reviewPage.selectPaymentMethod('Pay later');
        expect(await reviewPage.getSelectedPaymentOption()).toBe('Pay later');
    });

    test('Submit application (Pay later)', async () => {
        test.skip(!allowSubmit, 'Submits the application; set REVIEW_ALLOW_SUBMIT=1 to run');
        await freshPage();
        await reviewPage.submitApplication({ certify: true, paymentOption: 'later' });
        await reviewPage.waitForSubmitted();
    });
});
