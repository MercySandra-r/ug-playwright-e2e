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
 *
 * POM rule for this page: every element is declared in `this.selectors`; callers use
 * the methods below, never their own locators.
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

        this.selectors = {
            // App landing page
            appSignInLink: 'role=link[name=/^sign in$/i]',
            appSignInButton: 'role=button[name=/^sign in$/i]',
            appContinueButton: 'role=button[name="Continue"s]',

            // IdP landing page
            signUpWithEmailLink: 'role=link[name="Sign up with email"]',
            signInWithEmailLink: 'role=link[name="Sign In with Email"]',

            // IdP forms
            emailInput: 'role=textbox[name="Email"s]',
            passwordInput: 'role=textbox[name="Password"s]',
            confirmPasswordInput: 'role=textbox[name="Confirm password"]',
            signUpButton: 'role=button[name="Sign up"]',
            signInButton: 'role=button[name="Sign in"]',
            formError: 'text=/session invalid|already (exists|registered|in use)|account exists|try again|invalid|too many|limit|exceeded/i',

            // Email verification (code screen)
            otpDigitBoxes: 'input[inputmode="numeric"], input[autocomplete="one-time-code"]',
            otpCodeTextbox: 'role=textbox[name=/code|verification/i]',
            otpCodeInput: 'input[autocomplete="one-time-code"], input[name*="code" i]',
            otpSubmitButton: 'role=button[name=/verify|confirm|continue|submit/i]',
        };
    }

    /**
     * Reach the IdP the way a real user does: app landing page -> "Sign in"
     * (app starts the OAuth request) -> login.asu.edu. Opening /signup directly
     * skips that hand-off and the IdP rejects the submit with
     * "Session invalid, please try again."
     */
    /**
     * @param {Object} [opts]
     * @param {'in-person'|'online'|'asu-local'|'random'} [opts.mode] - When set, take the new-applicant
     *   path: landing -> learning mode -> degree type -> Continue. Otherwise click "Sign in".
     * @param {'pursue'|'individual'} [opts.degreeType]
     * @param {string} [opts.landing] - landing link to start from instead of '/', e.g. '/?partner=SCAP'
     */
    async startFromApp(opts = {}) {
        await this.page.goto('/', { timeout: this.navigationTimeout });
        if (opts.mode) {
            // A return visit remembers the learning mode and hides the choice; start clean.
            await this.page.context().clearCookies();
            await this.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
            // ASU Local has its own landing link (?asulocal=), which preselects it.
            await this.page.goto(opts.landing || (opts.mode === 'asu-local' ? '/?asulocal=' : '/'), { timeout: this.navigationTimeout });
            // Lazy require: LandingPage -> authHelper -> AsuIdpPage would otherwise be circular.
            const LandingPage = require('./LandingPage');
            const landing = new LandingPage(this.page);
            const degreeType = opts.degreeType || 'pursue';
            // A partner landing link (e.g. /?partner=SCAP) can preselect the learning mode and degree
            // type: then only Continue is shown and there is nothing to choose.
            if (opts.landing && await landing.arePreselected()) { /* nothing to choose */ }
            else if (opts.mode === 'asu-local') await landing.verifyAsuLocalMOL();
            else if (opts.mode === 'in-person') await landing.chooseInPersonMOL({ degreeType });
            else if (opts.mode === 'online') await landing.chooseOnlineMOL({ degreeType });
            else await landing.chooseRandomMOL({ degreeType });
            // A click while the section below the answers is still opening can be lost (seen
            // on the nondegree path): click again until the sign-in page starts loading.
            const continueButton = this.page.locator(this.selectors.appContinueButton);
            for (let attempt = 0; attempt < 3; attempt++) {
                await continueButton.click();
                const left = await this.page.waitForURL(/login\.asu\.edu/, { timeout: 8000 }).then(() => true).catch(() => false);
                if (left || !(await continueButton.isVisible().catch(() => false))) break;
            }
        } else {
            const signIn = this.page.locator(this.selectors.appSignInLink)
                .or(this.page.locator(this.selectors.appSignInButton))
                .first();
            await signIn.click();
        }
        await this.page.waitForURL(/login\.asu\.edu/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.signUpWithEmailLink)).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /** From the IdP landing page, open "Sign up with email". */
    async openSignupFromIdp() {
        await this.page.locator(this.selectors.signUpWithEmailLink).click();
        await expect(this.page.locator(this.selectors.confirmPasswordInput)).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /**
     * Is the "Sign up with email" form on screen (e.g. still there after a rejected sign-up)?
     * @returns {Promise<boolean>}
     */
    async isSignupFormShown() {
        return /login\.asu\.edu\/signup/.test(this.page.url())
            && this.page.locator(this.selectors.confirmPasswordInput).isVisible();
    }

    /** From the IdP landing page, open "Sign In with Email". */
    async openLoginFromIdp() {
        await this.page.locator(this.selectors.signInWithEmailLink).click();
        await expect(this.page.locator(this.selectors.emailInput)).toBeVisible({
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
        const error = this.page.locator(this.selectors.formError).first();
        const shown = await error
            .waitFor({ state: 'visible', timeout: timeoutMs })
            .then(() => true)
            .catch(() => false);
        return shown ? (await error.innerText()).trim() : null;
    }

    /** Go straight to the IdP sign-up page. Prefer startFromApp(); see its note. */
    async gotoSignup() {
        await this.page.goto(`${this.idpOrigin}/signup?${this.oauthParams}`);
        await expect(this.page.locator(this.selectors.emailInput)).toBeVisible({
            timeout: this.navigationTimeout,
        });
    }

    /** Go straight to the IdP email sign-in page. */
    async gotoLogin() {
        await this.page.goto(`${this.idpOrigin}/email-password-login?${this.oauthParams}`);
        await expect(this.page.locator(this.selectors.emailInput)).toBeVisible({
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
        await this.page.locator(this.selectors.emailInput).fill(email);
        await this.page.locator(this.selectors.passwordInput).fill(password);
        await this.page.locator(this.selectors.confirmPasswordInput).fill(password);
        await this.page.locator(this.selectors.signUpButton).click();
    }

    /**
     * Fill and submit the email sign-in form.
     * @param {string} email
     * @param {string} password
     */
    async signIn(email, password) {
        this.logger.info(`IdP sign-in for ${email}`);
        await this.page.locator(this.selectors.emailInput).fill(email);
        await this.page.locator(this.selectors.passwordInput).fill(password);
        await this.page.locator(this.selectors.signInButton).click();
    }

    /**
     * Enter a numeric verification code into the OTP screen and submit.
     * Handles both a single input and split one-box-per-digit layouts.
     * @param {string} code
     */
    async submitVerificationCode(code) {
        this.logger.info('Submitting email verification code');
        // Split one-box-per-digit layout (common for OTP).
        const digitBoxes = this.page.locator(this.selectors.otpDigitBoxes);
        const count = await digitBoxes.count();
        if (count > 1) {
            for (let i = 0; i < code.length && i < count; i++) {
                await digitBoxes.nth(i).fill(code[i]);
            }
        } else {
            const single = this.page.locator(this.selectors.otpCodeTextbox)
                .or(this.page.locator(this.selectors.otpCodeInput))
                .first();
            await single.fill(code);
        }
        const submit = this.page.locator(this.selectors.otpSubmitButton).first();
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
        await this.settle();
    }
}

module.exports = AsuIdpPage;
