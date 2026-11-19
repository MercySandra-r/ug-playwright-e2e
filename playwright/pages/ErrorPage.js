// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * The application's error pages (verified 2026-11-19, signed in):
 *   /error            "Something went wrong and the server could not complete your request."
 *                     "Error code: 500", Return to dashboard
 *   an unknown page   "The page you're looking for doesn't exist." "Error code: 404",
 *                     Return to dashboard, and "Need help? Contact us." inline
 * Opening another applicant's application (/ug-app/<their id>/...) signs the user out.
 *
 * POM rule: every element is declared here; specs use the read-back methods.
 */
class ErrorPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.selectors = {
            message: 'main >> role=heading[level=2]',
            errorCode: 'role=paragraph >> text=/Error code:\\s*\\d+/',
            returnToDashboard: 'role=link[name="Return to dashboard"]',
            signedOutMessage: 'text=You have been signed out.',
        };
    }

    /**
     * Open a path of the site (e.g. "/error").
     * @param {string} path
     * @returns {Promise<void>}
     */
    async open(path) {
        await this.page.goto(path, { timeout: this.navigationTimeout });
    }

    /**
     * What the error page says: its message and its code.
     * @returns {Promise<{ message: string, code: string }>}
     */
    async read() {
        const code = this.page.locator(this.selectors.errorCode).first();
        await code.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        return {
            message: (await this.page.locator(this.selectors.message).first().innerText()).trim(),
            code: ((await code.innerText()).match(/\d+/) || [''])[0],
        };
    }

    /**
     * Follow "Return to dashboard" and wait for the dashboard.
     * @returns {Promise<void>}
     */
    async returnToDashboard() {
        await this.page.locator(this.selectors.returnToDashboard).click();
        await expect(this.page).toHaveURL(/\/dashboard/, { timeout: this.navigationTimeout });
    }

    /**
     * Whether the browser ended on the sign-in service's "You have been signed out." page.
     * @returns {Promise<boolean>}
     */
    async isSignedOut() {
        await this.page.waitForURL(/login\.asu\.edu\/logout/, { timeout: this.navigationTimeout }).catch(() => {});
        return this.page.locator(this.selectors.signedOutMessage).first()
            .waitFor({ state: 'visible', timeout: this.assertionTimeout }).then(() => true).catch(() => false);
    }
}

module.exports = ErrorPage;
