// @ts-check
const { test, expect } = require('@playwright/test');
const { signUpVerifiedAccount } = require('../utils/authHelper');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');

/**
 * Pre-application dashboard ("Welcome! You're a few steps away from becoming a Sun
 * Devil."), against the live page.
 *
 * One fresh account per run (beforeAll); the suite is serial. Tests reload the
 * dashboard (unsaved entries are dropped); the last test starts the application, which
 * uses the account up (its dashboard no longer shows this form).
 * Account creation is rate-limited per hour by the IdP; this suite creates one.
 *
 * Debugging without creating accounts: set PREAPP_TEST_EMAIL and PREAPP_TEST_PASSWORD to
 * an account that has NOT started an application yet; beforeAll signs in instead.
 *
 * POM: every element comes from PreAppDashboardPage (its selectors, locator methods and
 * read-back methods); this spec has no locators of its own.
 */
test.describe('Pre-Application Dashboard Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    const APPLICANT = {
        firstName: 'Qa',
        preferredFirstName: 'Q',
        middleName: 'Test',
        lastName: 'Automation',
        birth: { month: 'June', day: '15', year: '2000' },
        phone: '2025551234',
    };

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {PreAppDashboardPage} */
    let dashboard;
    /** @type {string} */
    let accountEmail;

    // Reusing an account (set in .env)? Then tests that save the step are skipped, so the
    // account stays on this step for the next run.
    const reused = !!(process.env.PREAPP_TEST_EMAIL && process.env.PREAPP_TEST_PASSWORD);

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(300000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        dashboard = new PreAppDashboardPage(page);
        if (process.env.PREAPP_TEST_EMAIL && process.env.PREAPP_TEST_PASSWORD) {
            accountEmail = process.env.PREAPP_TEST_EMAIL;
            await new LoginPage(page).login(accountEmail, process.env.PREAPP_TEST_PASSWORD);
        } else {
            ({ email: accountEmail } = await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' }));
        }
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => dashboard.navigateToDashboard();

    test('Verify Pre-Application Dashboard page loads successfully', async () => {
        await freshPage();
        await dashboard.verifyFormVisible();
    });

    test('Contact email is the account email and is read-only', async () => {
        await freshPage();
        await dashboard.verifyContactEmail(accountEmail);
    });

    test('Verify form validation for required fields', async () => {
        await freshPage();
        await dashboard.verifyRequiredFieldErrors();
    });

    test('Verify phone number validation', async () => {
        await freshPage();
        await dashboard.verifyInvalidPhoneError('123');
    });

    test('Birth years run from 5 years ago back 100 years', async () => {
        await freshPage();
        const years = await dashboard.getBirthYearOptions();
        expect(years[0]).toBe(String(dashboard.currentYear - 5));
        expect(years).toHaveLength(100);
    });

    test('Suffix is optional and offers choices', async () => {
        await freshPage();
        expect((await dashboard.getSuffixOptions()).length).toBeGreaterThan(0);
    });

    test('Fill every field, optional ones included', async () => {
        await freshPage();
        const [suffix] = await dashboard.getSuffixOptions();
        await dashboard.fillPersonalInformation({ ...APPLICANT, suffix });
        await dashboard.setDateOfBirth(APPLICANT.birth);
        await dashboard.fillContactInformation({ phoneNumber: APPLICANT.phone, phoneType: 'Mobile' });
        expect(await dashboard.readFormValues()).toEqual({
            firstName: APPLICANT.firstName,
            preferredFirstName: APPLICANT.preferredFirstName,
            middleName: APPLICANT.middleName,
            lastName: APPLICANT.lastName,
            suffix,
            birth: APPLICANT.birth,
            countryCode: '+1',
            phone: APPLICANT.phone,
        });
    });

    test('Application FAQ answers expand', async () => {
        await freshPage();
        expect(await dashboard.expandFaq('Is there an application fee?')).not.toBe('');
    });

    test('Start new application opens My information', async () => {
        test.skip(reused, 'Starts the application, which would use up the reused account (PREAPP_TEST_EMAIL); runs on a fresh account');
        await freshPage();
        const applicationId = await dashboard.startApplication({ ...APPLICANT });
        expect(applicationId).toMatch(/^\d+$/);
        const info = new MyInformationPage(page);
        info.applicationId = applicationId;
        await info.verifyPageLoaded();
    });
});
