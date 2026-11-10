// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for ASU's central identity provider at https://login.asu.edu.
 *
 * As of Nov 2026 the application (apply-qa.apps.asu.edu) delegates sign-in/sign-up
 * to this IdP via OAuth. Clicking "Sign in" in the app redirects to:
 *   login.asu.edu/login?client_id=adms-nonprod&response_type=code
 *     &redirect_uri=https://apply-qa.apps.asu.edu/easso/callback/&scope=openid+email+fbi_user_id
 *
 * Flow this object supports:
 *   app -> (redirect) -> login.asu.edu -> "Sign up with email" -> signUp()
 *       -> email verification (submitVerificationCode / openVerificationLink)
 *       -> OAuth callback -> back on the app, authenticated.
 *
 * NOTE: the verification-screen selectors below are best-effort. The sign-up and
 * sign-in forms were confirmed live; the post-sign-up verification UI (code field
 * vs. emailed link) must be confirmed against the first real run and adjusted here.
 */
class AsuIdpPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.idpOrigin = 'https://login.asu.edu';
        this.oauthParams =
            'client_id=adms-nonprod&response_type=code' +
            '&redirect_uri=https%3A%2F%2Fapply-qa.apps.asu.edu%2Feasso%2Fcallback%2F' +
            '&scope=openid+email+fbi_user_id';
    }

    /**
     * Reach the IdP the way a real user does: app landing page -> "Sign in"
     * (app starts the OAuth request) -> login.asu.edu. Opening /signup directly
     * skips that hand-off and the IdP rejects the submit with
     * "Session invalid, please try again."
     */
    async startFromApp() {
        await this.page.goto('/', { timeout: this.navigationTimeout });
        const signIn = this.page
            .getByRole('link', { name: /^sign in$/i })
            .or(this.page.getByRole('button', { name: /^sign in$/i }))
            .first();
        await signIn.click();
        await this.page.waitForURL(/login\.asu\.edu/, { timeout: this.navigationTimeout });
        await expect(this.page.getByRole('link', { name: 'Sign up with email' })).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /** From the IdP landing page, open "Sign up with email". */
    async openSignupFromIdp() {
        await this.page.getByRole('link', { name: 'Sign up with email' }).click();
        await expect(this.page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /** From the IdP landing page, open "Sign In with Email". */
    async openLoginFromIdp() {
        await this.page.getByRole('link', { name: 'Sign In with Email' }).click();
        await expect(this.page.getByRole('textbox', { name: 'Email' })).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /**
     * If the IdP form shows an inline error after submit, return its text.
     * Returns null when no error appears within `timeoutMs`.
     * @param {number} [timeoutMs]
     * @returns {Promise<string|null>}
     */
    async getFormError(timeoutMs = 8000) {
        const error = this.page
            .getByText(/session invalid|already (exists|registered|in use)|account exists|try again|invalid/i)
            .first();
        const shown = await error
            .waitFor({ state: 'visible', timeout: timeoutMs })
            .then(() => true)
            .catch(() => false);
        return shown ? (await error.innerText()).trim() : null;
    }

    /** Go straight to the IdP sign-up page. Prefer startFromApp(); see its note. */
    async gotoSignup() {
        await this.page.goto(`${this.idpOrigin}/signup?${this.oauthParams}`);
        await expect(this.page.getByRole('textbox', { name: 'Email' })).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /** Go straight to the IdP email sign-in page. */
    async gotoLogin() {
        await this.page.goto(`${this.idpOrigin}/email-password-login?${this.oauthParams}`);
        await expect(this.page.getByRole('textbox', { name: 'Email' })).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /**
     * Fill and submit the "Sign up with email" form.
     * @param {string} email
     * @param {string} password - Must be >=10 chars with upper, lower and a number.
     */
    async signUp(email, password) {
        this.logger.info(`IdP sign-up for ${email}`);
        await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
        await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
        await this.page.getByRole('textbox', { name: 'Confirm password' }).fill(password);
        await this.page.getByRole('button', { name: 'Sign up' }).click();
    }

    /**
     * Fill and submit the email sign-in form.
     * @param {string} email
     * @param {string} password
     */
    async signIn(email, password) {
        this.logger.info(`IdP sign-in for ${email}`);
        await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
        await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
        await this.page.getByRole('button', { name: 'Sign in' }).click();
    }

    /**
     * Enter a numeric verification code into the OTP screen and submit.
     * Handles both a single input and split one-box-per-digit layouts.
     * @param {string} code
     */
    async submitVerificationCode(code) {
        this.logger.info('Submitting email verification code');
        // Split one-box-per-digit layout (common for OTP).
        const digitBoxes = this.page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]');
        const count = await digitBoxes.count();
        if (count > 1) {
            for (let i = 0; i < code.length && i < count; i++) {
                await digitBoxes.nth(i).fill(code[i]);
            }
        } else {
            const single = this.page
                .getByRole('textbox', { name: /code|verification/i })
                .or(this.page.locator('input[autocomplete="one-time-code"], input[name*="code" i]'))
                .first();
            await single.fill(code);
        }
        const submit = this.page
            .getByRole('button', { name: /verify|confirm|continue|submit/i })
            .first();
        if (await submit.isVisible().catch(() => false)) {
            await submit.click();
        }
    }

    /**
     * Follow an emailed verification link in the same tab.
     * @param {string} link
     */
    async openVerificationLink(link) {
        this.logger.info('Opening email verification link');
        await this.page.goto(link, { timeout: this.navigationTimeout });
    }

    /**
     * Wait for the OAuth callback to return to the application, authenticated.
     * @param {number} [timeoutMs]
     */
    async waitForAppRedirect(timeoutMs = 45000) {
        await this.page.waitForURL(/apply-qa\.apps\.asu\.edu\/(dashboard|easso\/callback)/, {
            timeout: timeoutMs,
        });
        await this.page.waitForLoadState('networkidle');
    }
}

module.exports = AsuIdpPage;
