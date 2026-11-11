// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/** The four "Next steps" items, in page order. */
const NEXT_STEPS = [
    'Track your application and next steps on My ASU',
    'Submit your transcripts',
    'Pay application fee',
    'Fill out the FAFSA',
];

/**
 * Page Object for the post-submission dashboard, "Next steps"
 * (/ug-app/<applicationId>/dashboard). The old /dashboard/post-submission URL is gone.
 *
 * Rebuilt against the live page on 2026-11-10 (submitted application 5020364). The page
 * is informational only: no payment or withdrawal actions.
 *  - "Congratulations on applying to ASU" and h1 "Next steps" (note: no <main> element)
 *  - Qualified Tuition Reduction (QTR) reminder alert, closable
 *  - Steps: My ASU tracking, transcripts, "Pay application fee" (shown after Pay later),
 *    FAFSA. External links open in a new tab.
 *  - Application summary: ID, Program, Location, Term, "Review what you submitted"
 *    (opens /ug-app/<id>/preview)
 *  - Need help: 866-277-6589, enrollmentonline@asu.edu, after hours 855-278-5080
 * Submitted applications redirect their wizard steps and Review here.
 */
class PostAppSubmissionDashboardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="Next steps"][level=1]',
            congratulations: 'role=heading[name="Congratulations on applying to ASU"]',
            qtrAlert: 'role=alert',
            qtrLink: 'role=link[name="Qualified Tuition Reduction (QTR) Program"]',
            closeAlert: 'role=link[name="close alert"]',
            myAsuLink: 'role=link[name="My ASU."]',
            transcriptsLink: 'role=link[name="Learn more about transcripts"]',
            fafsaLink: 'role=link[name="Free Application for Federal Student Aid"]',
            fafsaPageLink: 'role=link[name="ASU’s FAFSA page"]',
            summaryHeading: 'role=heading[name="Application summary"]',
            previewLink: 'role=link[name="Review what you submitted"]',
            helpRegion: 'role=region[name="Need help?"]',
        };
        this.NEXT_STEPS = NEXT_STEPS;
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Application ID for a submitted application: this.applicationId, else the
     * "Application ID: N" on the main dashboard's "Your applications" card.
     * (Submitted applications have no dashboard "Continue" button to resolve it.)
     * @returns {Promise<string>}
     */
    async getSubmittedApplicationId() {
        if (this.applicationId) return this.applicationId;
        const fromUrl = this.page.url().match(/\/ug-app\/(\d+)\//);
        if (fromUrl) return fromUrl[1];
        await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        const card = await this.submittedCard();
        const m = (await card.innerText()).match(/Application ID:\s*(\d+)/);
        if (!m) throw new Error('No submitted application found on the dashboard');
        this.applicationId = m[1];
        return m[1];
    }

    // ------------------------------------------------------------------ main dashboard (/dashboard)

    /**
     * With a draft in progress the main dashboard shows "In-progress applications" and
     * hides submitted ones behind "View previously submitted applications"; expand it.
     * @returns {Promise<void>}
     */
    async revealSubmittedApplications() {
        await this.page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await this.settle();
        const reveal = this.page.getByRole('button', { name: 'View previously submitted applications' });
        if (await reveal.isVisible().catch(() => false)) await reveal.click();
    }

    /**
     * The main dashboard card of a submitted application (the one saying "Submitted on").
     * Cards are rendered more than once (hidden copies), so only visible matches count.
     * @param {string} [id] - a specific application ID; defaults to the first submitted one
     * @returns {Promise<import('@playwright/test').Locator>}
     */
    async submittedCard(id) {
        await this.revealSubmittedApplications();
        const submitted = this.page.locator('p:visible', { hasText: /^\s*Submitted on / });
        await submitted.first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        // The card is the nearest ancestor holding both its button and the Application ID.
        const cards = submitted.locator('xpath=ancestor::*[.//button[normalize-space()="View application"] and contains(normalize-space(.), "Application ID")][1]');
        // Card text runs together ("...5020364Submitted on..."), so use (?!\d), not \b.
        return id ? cards.filter({ hasText: new RegExp(`Application ID:\\s*${id}(?!\\d)`) }).first() : cards.first();
    }

    /**
     * ID of an in-progress (draft) application, if the dashboard shows one.
     * @returns {Promise<string|undefined>}
     */
    async getDraftApplicationId() {
        await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        await this.page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await this.settle();
        const heading = this.page.getByRole('heading', { name: 'In-progress applications' });
        if (!(await heading.isVisible().catch(() => false))) return undefined;
        const card = this.page.locator('p:visible', { hasText: /^\s*Continue your application/ }).first()
            .locator('xpath=ancestor::*[.//button[normalize-space()="Continue"] and contains(normalize-space(.), "Application ID")][1]');
        return ((await card.innerText()).match(/Application ID:\s*(\d+)/) || [])[1];
    }

    /**
     * Open a second application: resume the in-progress draft if there is one (so reruns
     * don't pile up drafts), otherwise "Start a new application" -> "Continue with new
     * application" and answer the learning-mode / degree modal. Never submits anything.
     * @param {{ mode?: 'In-person'|'Online'|'ASU Local' }} [opts]
     * @returns {Promise<{ applicationId: string, resumed: boolean }>}
     */
    async startOrResumeNewApplication({ mode = 'Online' } = {}) {
        const draftId = await this.getDraftApplicationId();
        if (draftId) {
            const card = this.page.locator('p:visible', { hasText: new RegExp(`Application ID:\\s*${draftId}(?!\\d)`) }).first()
                .locator('xpath=ancestor::*[.//button[normalize-space()="Continue"] and contains(normalize-space(.), "Application ID")][1]');
            await card.getByRole('button', { name: 'Continue', exact: true }).click();
            await this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: this.navigationTimeout });
            return { applicationId: draftId, resumed: true };
        }
        await this.page.getByRole('button', { name: 'Start a new application' }).click();
        await this.page.getByRole('button', { name: 'Continue with new application' }).click();
        const modal = this.page.getByRole('alertdialog');
        await modal.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await modal.getByRole('radio', { name: mode, exact: true }).click();
        await modal.getByRole('radio', { name: "Yes, I want to pursue an associate or bachelor's degree." }).click();
        await modal.getByRole('button', { name: 'Continue', exact: true }).click();
        await this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: this.navigationTimeout });
        const m = this.page.url().match(/\/ug-app\/(\d+)\//);
        return { applicationId: m ? m[1] : '', resumed: false };
    }

    /**
     * Profile menu items, e.g. ['Dashboard', 'Edit profile', 'Sign out'].
     * @returns {Promise<string[]>}
     */
    async getProfileMenuItems() {
        await this.page.getByRole('button', { name: 'Profile menu' }).click();
        const menu = this.page.getByRole('menu');
        await menu.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const items = (await menu.locator('a, button, [role="menuitem"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
        await this.page.keyboard.press('Escape');
        return [...new Set(items)];
    }

    /**
     * Sign out through the Profile menu.
     * @returns {Promise<void>}
     */
    async signOut() {
        await this.page.getByRole('button', { name: 'Profile menu' }).click();
        await this.page.getByRole('menu').getByText('Sign out', { exact: true }).click();
        await this.page.waitForURL((u) => !/\/dashboard|\/ug-app\//.test(u.pathname), { timeout: this.navigationTimeout });
        await this.settle();
    }

    /**
     * Open "Next steps" for the submitted application.
     * @returns {Promise<void>}
     */
    async navigateToDashboard() {
        const id = await this.getSubmittedApplicationId();
        const onNextSteps = () => /\/ug-app\/\d+\/dashboard/.test(this.page.url());
        // Observed 2026-11-10: a direct visit to /ug-app/<id>/dashboard intermittently lands
        // on the main /dashboard instead. Retry once, then go through "View application".
        for (let attempt = 0; attempt < 2 && !onNextSteps(); attempt++) {
            await this.page.goto(`/ug-app/${id}/dashboard`, { timeout: this.navigationTimeout });
            await this.settle();
            await this.page.waitForTimeout(1000);
        }
        if (!onNextSteps()) {
            this.logger.warn(`Direct link to Next steps landed on ${this.page.url()}; using "View application"`);
            const card = await this.submittedCard(id);
            await card.getByRole('button', { name: 'View application' }).click();
            await this.page.waitForURL(/\/ug-app\/\d+\/dashboard/, { timeout: this.navigationTimeout });
        }
        await this.verifyPageLoaded();
        // The heading renders before the content; wait for the summary to be filled in.
        await expect(this.page.locator('p:visible', { hasText: /^\s*Program:\s*\S/ }).first())
            .toBeVisible({ timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.previewLink)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/dashboard/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * Congratulations, the four next steps, the summary and help are shown.
     * @returns {Promise<void>}
     */
    async validatePostDashboard() {
        await expect(this.page.locator(this.selectors.congratulations)).toBeVisible();
        for (const step of NEXT_STEPS) {
            await expect(this.page.getByRole('heading', { name: step, level: 3 })).toBeVisible();
        }
        await expect(this.page.locator(this.selectors.summaryHeading)).toBeVisible();
        await expect(this.page.locator(this.selectors.helpRegion)).toBeVisible();
    }

    // ------------------------------------------------------------------ summary and status

    /**
     * @returns {Promise<{ applicationId: string, program: string, location: string, term: string }>}
     */
    async getApplicationSummary() {
        const read = async (/** @type {string} */ label) => {
            const text = await this.page.locator('p:visible', { hasText: new RegExp(`^\\s*${label}:`) }).first().innerText();
            return text.replace(new RegExp(`^\\s*${label}:\\s*`), '').trim();
        };
        return {
            applicationId: await read('Application ID'),
            program: await read('Program'),
            location: await read('Location'),
            term: await read('Term'),
        };
    }

    /**
     * Status of the application. This page is only reachable once submitted; the main
     * dashboard card says "Submitted on <date>".
     * @returns {Promise<string>} e.g. "Submitted on November 10, 2026"
     */
    async getApplicationStatus() {
        const id = await this.getSubmittedApplicationId();
        const back = this.page.url();
        await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        const card = await this.submittedCard(id);
        const status = (((await card.innerText()).match(/Submitted on [^\n]+/) || [''])[0]).trim();
        if (/\/ug-app\//.test(back)) await this.page.goto(back, { timeout: this.navigationTimeout });
        return status;
    }

    /**
     * Fee status from the "Pay application fee" step (shown when Pay later was chosen).
     * @returns {Promise<'unpaid'|'paid or waived'>}
     */
    async getFeeStatus() {
        const step = this.page.getByRole('heading', { name: 'Pay application fee', level: 3 });
        return (await step.isVisible().catch(() => false)) ? 'unpaid' : 'paid or waived';
    }

    // ------------------------------------------------------------------ contact

    /**
     * @param {string} [expectedPhone]
     * @returns {Promise<void>}
     */
    async verifyPhoneNumber(expectedPhone = '866-277-6589') {
        const link = this.page.locator(this.selectors.helpRegion).getByRole('link', { name: `Link to ${expectedPhone}` });
        await expect(link).toHaveAttribute('href', `tel:${expectedPhone}`);
    }

    /**
     * @param {string} [expectedEmail]
     * @returns {Promise<void>}
     */
    async verifyEmailAddress(expectedEmail = 'enrollmentonline@asu.edu') {
        const link = this.page.locator(this.selectors.helpRegion).getByRole('link', { name: `Link to ${expectedEmail}` });
        await expect(link).toHaveAttribute('href', `mailto:${expectedEmail}`);
    }

    // ------------------------------------------------------------------ QTR alert

    /**
     * Is the QTR reminder shown? (Seen for ASU Online applicants.)
     * @returns {Promise<boolean>}
     */
    async checkQtrAlertPresenceForAZOnline() {
        const alert = this.page.locator(this.selectors.qtrAlert).filter({ hasText: 'Qualified Tuition Reduction (QTR) Reminder' });
        return alert.isVisible().catch(() => false);
    }

    /**
     * Flow-spec name.
     * @returns {Promise<boolean>}
     */
    async checkForQTROnlineAlert() {
        return this.checkQtrAlertPresenceForAZOnline();
    }

    /**
     * @returns {Promise<void>}
     */
    async closeQtrAlert() {
        await this.page.locator(this.selectors.closeAlert).click();
        await expect(this.page.locator(this.selectors.qtrAlert).filter({ hasText: 'QTR' })).toBeHidden({ timeout: this.assertionTimeout });
    }

    // ------------------------------------------------------------------ links

    /**
     * href and target of a link on the page (external links are checked, not visited).
     * @param {string} selector
     * @returns {Promise<{ href: string|null, target: string|null }>}
     */
    async getLink(selector) {
        const link = this.page.locator(selector).first();
        return { href: await link.getAttribute('href'), target: await link.getAttribute('target') };
    }

    /** @returns {Promise<{ href: string|null, target: string|null }>} */
    async clickQTRLink() { return this.getLink(this.selectors.qtrLink); }

    /** @returns {Promise<{ href: string|null, target: string|null }>} */
    async clickTranscriptsLink() { return this.getLink(this.selectors.transcriptsLink); }

    /** @returns {Promise<{ href: string|null, target: string|null }>} */
    async clickFafsaLink() { return this.getLink(this.selectors.fafsaLink); }

    /**
     * External links in the next-steps list. The QTR link lives in the closable alert
     * (dismissal is remembered for the session), so check it with clickQTRLink() instead.
     * @returns {Promise<Array<{ name: string, href: string|null, target: string|null }>>}
     */
    async verifyAllExternalLinks() {
        /** @type {Array<{ name: string, href: string|null, target: string|null }>} */
        const out = [];
        for (const [name, selector] of /** @type {Array<[string, string]>} */ ([
            ['My ASU', this.selectors.myAsuLink],
            ['Transcripts', this.selectors.transcriptsLink], ['FAFSA', this.selectors.fafsaLink],
            ['ASU FAFSA page', this.selectors.fafsaPageLink],
        ])) {
            out.push({ name, ...(await this.getLink(selector)) });
        }
        return out;
    }

    /**
     * "Review what you submitted" opens the submitted-application preview.
     * @returns {Promise<void>}
     */
    async clickPreviewLink() {
        await this.page.locator(this.selectors.previewLink).click();
        await this.page.waitForURL(/\/ug-app\/\d+\/preview/, { timeout: this.navigationTimeout });
        await expect(this.page.getByRole('heading', { name: 'Preview Submitted Application' })).toBeVisible({ timeout: this.navigationTimeout });
    }
}

module.exports = PostAppSubmissionDashboardPage;
