// @ts-check
const { test, expect } = require('@playwright/test');
const { signUpVerifiedAccount } = require('../utils/authHelper');

/**
 * Reference test for the Gmail-API email-verification path.
 *
 * Creates a brand-new ASU IdP account, reads the verification email through the
 * Gmail API, completes verification, and lands back on the app authenticated.
 *
 * Skipped unless GMAIL_TEST_ADDRESS is set, so it never breaks CI or runs for
 * anyone who hasn't configured the test mailbox (see
 * docs/EMAIL_VERIFICATION_SETUP.md).
 */
test.describe('Email-verified sign-up (Gmail API)', () => {
    test.skip(!process.env.GMAIL_TEST_ADDRESS, 'GMAIL_TEST_ADDRESS not configured');
    test.describe.configure({ timeout: 180000 });

    test('signs up, verifies via emailed code/link, returns authenticated', async ({ page }) => {
        const { email } = await signUpVerifiedAccount(page);
        expect(email).toContain('@');
        await expect(page).toHaveURL(/apply-qa\.apps\.asu\.edu/);
    });
});
