// @ts-check
const { test, expect } = require('@playwright/test');
const { signUpVerifiedAccount } = require('../utils/authHelper');

/**
 * Reference test for the Gmail-API email-verification path.
 *
 * Creates a brand-new ASU IdP account, reads the verification email through the
 * Gmail API, completes verification, and lands back on the app authenticated.
 *
 * Needs GMAIL_TEST_ADDRESS and its authorised token (see
 * docs/EMAIL_VERIFICATION_SETUP.md); without them it fails with that message.
 */
test.describe('Email-verified sign-up (Gmail API)', () => {
    test.describe.configure({ timeout: 180000 });

    test('signs up, verifies via emailed code/link, returns authenticated', { tag: ['@smoke', '@regression'] }, async ({ page }) => {
        const { email } = await signUpVerifiedAccount(page);
        expect(email).toContain('@');
        await expect(page).toHaveURL(/apply-qa\.apps\.asu\.edu/);
    });
});
