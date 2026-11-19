// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * The Kaplan partner entry: its landing link and its own log-in page (verified 2026-11-19).
 *
 *   Landing   /?org=kaplaninc: the ASU landing page with the Kaplan logo. After the learning
 *             mode and degree type, "Ok, let's get your account created" asks for the email
 *             twice; "Create account" opens the pre-application dashboard straight away.
 *             Kaplan applicants have no password and there is no email code (no OTP).
 *   Log in    /kaplan/login: "Log in to continue", Email and "Log in" (no password).
 *
 * After that the wizard is the regular one. For Kaplan applicants: Education benefits is
 * always answered No, My high school grades always says the page is not necessary, and
 * Review always shows the application fee as waived.
 *
 * POM rule: every element is declared here; specs use the methods.
 */
class KaplanPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.selectors = {
            kaplanLogo: 'role=img[name=/kaplan/i]',
            createAccountHeading: "role=heading[name=\"Ok, let's get your account created\"]",
            email: 'input[placeholder="Enter your email address"]',
            confirmEmail: 'input[placeholder="Retype your email address"]',
            createAccountButton: 'role=button[name="Create account"]',
            continueButton: 'role=button[name="Continue"s]',
            landingLogInLink: 'role=link[name="Log in"]',
            loginHeading: 'role=heading[name="Log in to continue"]',
            loginEmail: '#email',
            loginButton: 'main >> role=button[name="Log in"s]',
            formError: '.invalid-feedback, [role="alert"], .text-danger',
            passwordField: 'input[type="password"]',
        };
    }

    /** The Kaplan landing link. */
    static LANDING = '/?org=kaplaninc';
    /** The Kaplan log-in page. */
    static LOGIN = '/kaplan/login';

    /**
     * Open the Kaplan landing page with nothing remembered from an earlier visit.
     * @returns {Promise<void>}
     */
    async openLanding() {
        await this.page.goto(KaplanPage.LANDING, { timeout: this.navigationTimeout });
        await this.page.context().clearCookies();
        await this.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await this.page.goto(KaplanPage.LANDING, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.kaplanLogo).first()).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * On the landing page: choose how to attend and the degree type, then create the account
     * with `email` (typed twice). Ends on the pre-application dashboard.
     * @param {string} email
     * @param {{ mode?: 'online'|'in-person', degreeType?: 'pursue'|'individual' }} [options]
     * @returns {Promise<void>}
     */
    async createAccount(email, { mode = 'online', degreeType = 'pursue' } = {}) {
        // Lazy require: LandingPage -> authHelper -> ... would otherwise be circular.
        const LandingPage = require('./LandingPage');
        const landing = new LandingPage(this.page);
        if (mode === 'in-person') await landing.chooseInPersonMOL({ degreeType });
        else await landing.chooseOnlineMOL({ degreeType });
        const emailBox = this.page.locator(this.selectors.email);
        // Nondegree: the "Important notes" come first, with a Continue to the account form.
        for (let attempt = 0; attempt < 3 && !(await emailBox.isVisible().catch(() => false)); attempt++) {
            const next = this.page.locator(this.selectors.continueButton);
            if (await next.isVisible().catch(() => false)) await next.click();
            await emailBox.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        }
        await emailBox.fill(email);
        await this.page.locator(this.selectors.confirmEmail).fill(email);
        await this.page.locator(this.selectors.createAccountButton).click();
        await this.page.waitForURL(/\/dashboard/, { timeout: this.navigationTimeout });
    }

    /**
     * Error shown on the account form after "Create account", if any (e.g. the address is
     * already registered).
     * @param {number} [timeoutMs]
     * @returns {Promise<string>}
     */
    async getFormError(timeoutMs = 3000) {
        const error = this.page.locator(this.selectors.formError).filter({ hasText: /\S/ }).first();
        if (!(await error.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false))) return '';
        return (await error.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * Log in on the Kaplan log-in page with the email only. Ends on the dashboard.
     * @param {string} email
     * @returns {Promise<void>}
     */
    async login(email) {
        await this.page.goto(KaplanPage.LOGIN, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.loginHeading)).toBeVisible({ timeout: this.navigationTimeout });
        await this.page.locator(this.selectors.loginEmail).fill(email);
        await this.page.locator(this.selectors.loginButton).click();
        await this.page.waitForURL(/\/dashboard/, { timeout: this.navigationTimeout });
    }

    /**
     * What the open page asks for: whether the Kaplan logo shows, and whether any password
     * field is shown (Kaplan never asks for one).
     * @returns {Promise<{ kaplanLogo: boolean, passwordAsked: boolean }>}
     */
    async readEntryPage() {
        return {
            kaplanLogo: await this.page.locator(this.selectors.kaplanLogo).first().isVisible().catch(() => false),
            passwordAsked: (await this.page.locator(this.selectors.passwordField).filter({ visible: true }).count()) > 0,
        };
    }

    /**
     * On the landing page, choose how to attend and the degree type and read what the
     * account form asks for (nothing is submitted).
     * @param {{ mode?: 'online'|'in-person', degreeType?: 'pursue'|'individual' }} [options]
     * @returns {Promise<{ heading: boolean, emailFields: number, passwordAsked: boolean }>}
     */
    async readAccountForm({ mode = 'online', degreeType = 'pursue' } = {}) {
        const LandingPage = require('./LandingPage');
        const landing = new LandingPage(this.page);
        if (mode === 'in-person') await landing.chooseInPersonMOL({ degreeType });
        else await landing.chooseOnlineMOL({ degreeType });
        await this.page.locator(this.selectors.email).waitFor({ state: 'visible', timeout: this.navigationTimeout });
        return {
            heading: await this.page.locator(this.selectors.createAccountHeading).isVisible().catch(() => false),
            emailFields: (await this.page.locator(this.selectors.email).count()) + (await this.page.locator(this.selectors.confirmEmail).count()),
            passwordAsked: (await this.page.locator(this.selectors.passwordField).filter({ visible: true }).count()) > 0,
        };
    }

    /**
     * From the landing page, "Log in" opens the Kaplan log-in page.
     * @returns {Promise<void>}
     */
    async openLoginFromLanding() {
        await this.page.locator(this.selectors.landingLogInLink).first().click();
        await expect(this.page).toHaveURL(/\/kaplan\/login/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.loginHeading)).toBeVisible({ timeout: this.navigationTimeout });
    }
}

module.exports = KaplanPage;
