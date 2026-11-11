// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/** Password rules listed under "New Password", in the IdP's wording and order. */
const PASSWORD_RULES = [
    'Must be at least 10 characters',
    'Must contain one lowercase character',
    'Must contain one uppercase character',
    'Must contain one number',
];

/**
 * Page Object for the IdP "Reset your password" page (login.asu.edu/forgot-password),
 * opened from "Forgot password?" on the email sign-in form (LoginPage.openForgotPassword).
 *
 * Two steps on one URL (verified live 2026-11-11):
 *  1. Email -> "Send verification code". The address is not checked: any value, even an
 *     unregistered or malformed one, moves on to step 2 ("You'll only receive an email if
 *     this address is registered"). So step 2 can be tested without sending any email.
 *  2. Verification Code, New Password (with live rule indicators), Confirm new password
 *     -> "Reset password".
 *
 * POM rule for this page: every element is declared in `this.selectors`; specs use the
 * methods below, never their own locators.
 */
class ForgotPasswordPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.selectors = {
            heading: 'text="Reset your password"',
            instructions: "text=Enter your email and we'll send you a code to reset your password.",
            returnToSignInLink: 'role=link[name="Return to sign in"]',

            // Step 1
            emailInput: 'role=textbox[name="Email"s]',
            sendCodeButton: 'role=button[name="Send verification code"]',

            // Step 2
            codeInput: 'role=textbox[name="Verification Code"s]',
            newPasswordInput: 'role=textbox[name="New Password"s]',
            confirmPasswordInput: 'role=textbox[name="Confirm new password"s]',
            resetButton: 'role=button[name="Reset password"]',
            // One row per rule: two icons (alt "Met" / "Not met", only one displayed) and the text.
            passwordRuleRows: 'div.flex:has(> div > img[alt="Not met"])',

            // Messages (IdP wording)
            emailRequiredError: 'text="Email field cannot be empty"',
            codeRequiredError: 'text="Verification code field cannot be empty"',
            passwordRequirementsError: 'text="Your password does not meet one or more requirements."',
            passwordMismatchError: 'text="Passwords do not match"',
            invalidCodeError: 'text="Invalid confirmation code"',

            // After a successful reset (same URL): "Password reset" + a Sign in button
            resetSuccessMessage: 'text="Your password has been successfully reset."',
            signInAfterResetButton: 'role=link[name="Sign in"s]',
        };
    }

    /** @returns {Promise<void>} the step-1 form is shown */
    async waitForEmailStep() {
        await expect(this.page).toHaveURL(/login\.asu\.edu\/forgot-password/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.emailInput)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * What step 1 shows, for asserting the page opened correctly.
     * @returns {Promise<{ heading: boolean, instructions: boolean, email: boolean, sendCode: boolean, returnToSignIn: boolean }>}
     */
    async readEmailStep() {
        const shown = (/** @type {string} */ s) => this.page.locator(s).first().isVisible();
        const s = this.selectors;
        return {
            heading: await shown(s.heading),
            instructions: await shown(s.instructions),
            email: await shown(s.emailInput),
            sendCode: await shown(s.sendCodeButton),
            returnToSignIn: await shown(s.returnToSignInLink),
        };
    }

    /**
     * Step 1: enter an address (may be empty) and click "Send verification code".
     * A registered address gets an email with a 6-digit code.
     * @param {string} email
     * @returns {Promise<void>}
     */
    async requestCode(email) {
        await this.page.locator(this.selectors.emailInput).fill(email);
        await this.page.locator(this.selectors.sendCodeButton).click();
    }

    /** @returns {Promise<void>} step 2 (code + new password) is shown */
    async waitForResetStep() {
        await expect(this.page.locator(this.selectors.resetButton)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * What step 2 shows.
     * @returns {Promise<{ code: boolean, newPassword: boolean, confirmPassword: boolean, reset: boolean }>}
     */
    async readResetStep() {
        const shown = (/** @type {string} */ s) => this.page.locator(s).first().isVisible();
        const s = this.selectors;
        return {
            code: await shown(s.codeInput),
            newPassword: await shown(s.newPasswordInput),
            confirmPassword: await shown(s.confirmPasswordInput),
            reset: await shown(s.resetButton),
        };
    }

    /**
     * Fill step 2 (any field may be empty) without submitting.
     * @param {{ code?: string, password?: string, confirm?: string }} values
     * @returns {Promise<void>}
     */
    async fillReset({ code = '', password = '', confirm = '' }) {
        await this.page.locator(this.selectors.codeInput).fill(code);
        await this.page.locator(this.selectors.newPasswordInput).fill(password);
        await this.page.locator(this.selectors.confirmPasswordInput).fill(confirm);
    }

    /** @returns {Promise<void>} click "Reset password" */
    async submitReset() {
        await this.page.locator(this.selectors.resetButton).click();
    }

    /**
     * Type a new password and read each rule's indicator.
     * @param {string} password
     * @returns {Promise<Record<string, boolean>>} rule text -> met
     */
    async checkPasswordRules(password) {
        await this.page.locator(this.selectors.newPasswordInput).fill(password);
        return this.getPasswordRules();
    }

    /**
     * Each rule under "New Password" and whether its indicator shows "Met".
     * @returns {Promise<Record<string, boolean>>}
     */
    async getPasswordRules() {
        const rows = await this.page.locator(this.selectors.passwordRuleRows).evaluateAll((els) => els.map((row) => {
            const shown = [...row.querySelectorAll('img')].find((i) => getComputedStyle(i).display !== 'none');
            return [(row.textContent || '').trim(), shown?.getAttribute('alt') === 'Met'];
        }));
        return Object.fromEntries(rows);
    }

    /**
     * Is this IdP message shown? Waits for it (some come after a server round-trip).
     * @param {'emailRequired'|'codeRequired'|'passwordRequirements'|'passwordMismatch'|'invalidCode'} name
     * @param {number} [timeoutMs]
     * @returns {Promise<boolean>}
     */
    async isErrorShown(name, timeoutMs = 10000) {
        const selector = this.selectors[`${name}Error`];
        return this.page.locator(selector).first()
            .waitFor({ state: 'visible', timeout: timeoutMs })
            .then(() => true).catch(() => false);
    }

    /** @returns {Promise<void>} back to the IdP sign-in options */
    async returnToSignIn() {
        await this.page.locator(this.selectors.returnToSignInLink).click();
        await this.page.waitForURL(/login\.asu\.edu\/login/, { timeout: this.navigationTimeout });
    }

    /**
     * Full reset for a registered address: request the code, read it from Gmail, set the
     * new password. Starts on step 1. Sends one email to `email`.
     * @param {string} email - must be in the Gmail inbox the suite reads (plus-tags of it)
     * @param {string} newPassword - >= 10 chars with lower, upper and a number
     * @returns {Promise<void>}
     */
    async resetPasswordViaEmail(email, newPassword) {
        const { inboxForEmail, gmailFor } = require('../utils/inboxes');
        const inbox = inboxForEmail(email);
        if (!inbox) throw new Error(`${email} is not on an inbox configured in .env (GMAIL_TEST_ADDRESS, _2, ...)`);
        const gmail = await gmailFor(inbox);
        // Emails already there (an earlier reset) must not be mistaken for the new one.
        const excludeIds = await gmail.messageIdsTo(email);
        const since = new Date();
        this.logger.info(`Requesting a password reset code for ${email}`);
        await this.requestCode(email);
        await this.waitForResetStep();
        const { code } = await gmail.waitForVerificationEmail({ toAddress: email, since, fromContains: 'noreply@asu.edu', timeoutMs: 90000, excludeIds });
        if (!code) throw new Error(`Password reset email for ${email} had no 6-digit code`);
        await this.fillReset({ code, password: newPassword, confirm: newPassword });
        await this.submitReset();
    }

    /**
     * Did the reset succeed? The page stays on /forgot-password and shows "Password reset /
     * Your password has been successfully reset." with a Sign in button.
     * @param {number} [timeoutMs]
     * @returns {Promise<boolean>}
     */
    async isResetSuccessful(timeoutMs = 20000) {
        return this.page.locator(this.selectors.resetSuccessMessage).first()
            .waitFor({ state: 'visible', timeout: timeoutMs })
            .then(() => true).catch(() => false);
    }

    /** @returns {Promise<void>} click Sign in on the success screen (back to the IdP sign-in) */
    async signInAfterReset() {
        await this.page.locator(this.selectors.signInAfterResetButton).first().click();
        await this.page.waitForURL((url) => !/forgot-password/.test(url.pathname), { timeout: this.navigationTimeout });
        await this.settle();
    }
}

ForgotPasswordPage.PASSWORD_RULES = PASSWORD_RULES;
module.exports = ForgotPasswordPage;
