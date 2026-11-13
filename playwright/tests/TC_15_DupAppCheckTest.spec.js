// @ts-check
const { test, expect } = require('@playwright/test');
const { signUpVerifiedAccount } = require('../utils/authHelper');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');

/**
 * Duplicate application check: a brand-new account for the same person (same name,
 * birthday and Social Security Number) applying to the same program and term must be
 * BLOCKED when saving on My program. No application is submitted.
 *
 * Needs TEST_SSN (in playwright/.env) and fails with a clear message without it; the SSN is
 * typed by MyInformationPage from that variable. Creates one new account per run.
 * Another application with the same SSN, program and term must already exist in QA.
 *
 * Identity defaults: first name "Mercy", last name "Sandra R", birthday April 17 1999
 * (the existing duplicate record). Optional overrides: DUP_CHECK_FIRST_NAME,
 * DUP_CHECK_LAST_NAME, DUP_CHECK_DOB ("Month D YYYY"; must match the existing record),
 * DUP_CHECK_PROGRAM (default "Anthropology, BA"), DUP_CHECK_TERM (default
 * "2027 spring - (Session A)").
 *
 * Run: npm run test:dup-identity
 */
test.describe('Duplicate Application Check (new account, same SSN)', () => {
    test.describe.configure({ mode: 'serial', timeout: 420000 });

    test('Saving the same program and term on My program is blocked', async ({ page }) => {
        // The check needs the SSN of the application that already exists in QA; only the tester
        // can supply it, so without it the test fails with this message rather than being skipped.
        expect(process.env.TEST_SSN, 'Set TEST_SSN (9 digits) in playwright/.env: the SSN of the existing application').toMatch(/^\d{9}$/);
        const program = process.env.DUP_CHECK_PROGRAM || 'Anthropology, BA';
        const term = process.env.DUP_CHECK_TERM || '2027 spring - (Session A)';
        const [month, day, year] = (process.env.DUP_CHECK_DOB || 'April 17 1999').split(/\s+/);

        await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
        const applicationId = await new PreAppDashboardPage(page).startApplication({
            firstName: process.env.DUP_CHECK_FIRST_NAME || 'Mercy',
            lastName: process.env.DUP_CHECK_LAST_NAME || 'Sandra R',
            birth: { month, day, year },
            captureValidations: true,
        });

        const info = new MyInformationPage(page);
        info.applicationId = applicationId;
        await info.verifyPageLoaded();
        await info.captureFieldValidations({ stepName: 'My information' });
        // The same SSN as the existing application, from TEST_SSN: that is what makes it a duplicate.
        await info.completeRequiredFields({ usCitizenship: 'Yes', countryOfBirth: 'United States', ssn: process.env.TEST_SSN });
        await info.saveAndContinue();

        const programPage = new MyASUProgramPage(page);
        programPage.applicationId = applicationId;
        await programPage.verifyPageLoaded();
        await programPage.captureFieldValidations({ stepName: 'My program' });
        await programPage.selectProgram({ program, degreeType: 'Bachelor', startTerm: term });
        await programPage.clickContinue();
        await page.waitForTimeout(5000);

        // Expected (verified manually 2026-11-10): blocked on My program, with this message
        // under the selection plus "Update term" / "Change program" buttons.
        await programPage.verifyDuplicateStartDateBlocked();
    });
});
