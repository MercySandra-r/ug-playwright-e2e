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
 * Runs only when TEST_SSN is set (in playwright/.env, e.g. TEST_SSN=111111111); the SSN is
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
    test.skip(!process.env.TEST_SSN, 'Set TEST_SSN (9 digits) in playwright/.env to run the duplicate application check');

    test('Saving the same program and term on My program is blocked', async ({ page }) => {
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
