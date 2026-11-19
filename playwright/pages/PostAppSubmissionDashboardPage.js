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
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (a next-step heading, a summary line,
 * a help link, an application card) come from the locator methods below. Specs use
 * these names and the read-back methods, never their own locators.
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
            payFeeStepHeading: 'role=heading[name="Pay application fee"][level=3]',
            link: 'role=link',

            // Main dashboard (/dashboard)
            anyH1: 'role=heading[level=1]',
            inProgressHeading: 'role=heading[name="In-progress applications"]',
            showSubmittedButton: 'role=button[name="View previously submitted applications"]',
            visibleLine: 'p:visible',
            // From a line inside an application card to the card itself.
            submittedCardFromLine: 'xpath=ancestor::*[.//button[normalize-space()="View application"] and contains(normalize-space(.), "Application ID")][1]',
            draftCardFromLine: 'xpath=ancestor::*[.//button[normalize-space()="Continue"] and contains(normalize-space(.), "Application ID")][1]',
            viewApplicationButton: 'role=button[name="View application"]',
            continueButton: 'role=button[name="Continue"s]',
            startNewApplicationButton: 'role=button[name="Start a new application"]',
            // Shown instead of "Continue with new application" once every open start date has an
            // application (verified 2026-11-19).
            newApplicationBlockedHeading: 'text=/Why can.t I start a new application\?/',
            newApplicationBlockedText: 'text=/Only one application can be sent for each start date/',
            continueWithNewButton: 'role=button[name="Continue with new application"]',
            newApplicationModal: 'role=alertdialog',
            degreeYesRadio: 'role=radio[name="Yes, I want to pursue an associate or bachelor\'s degree."]',
            degreeNoRadio: 'role=radio[name="No, I want to take individual classes as a nondegree or visiting university student."]',
            // Nondegree follow-ups (as on the landing page): in the modal the Yes/No groups have no
            // name, so each "No" is found after its question's text.
            earnedBachelorNo: 'xpath=.//*[contains(normalize-space(.),"already earned a bachelor")][not(*)]/following::*[@role="radio"][normalize-space(.)="No"][1]',
            startedAsuDegreeNo: 'xpath=.//*[contains(normalize-space(.),"previously started courses to pursue")][not(*)]/following::*[@role="radio"][normalize-space(.)="No"][1]',

            // Profile menu
            profileMenuButton: 'role=button[name="Profile menu"]',
            profileMenu: 'role=menu',
            profileMenuEntries: 'a, button, [role="menuitem"]',
            signOutItem: 'text="Sign out"',
        };
        this.NEXT_STEPS = NEXT_STEPS;
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * A visible paragraph whose text matches, e.g. /^\s*Program:/.
     * @param {RegExp} text
     * @returns {import('@playwright/test').Locator}
     */
    line(text) {
        return this.page.locator(this.selectors.visibleLine, { hasText: text });
    }

    /**
     * One of the four "Next steps" headings.
     * @param {string} step - one of NEXT_STEPS
     * @returns {import('@playwright/test').Locator}
     */
    nextStepHeading(step) {
        return this.page.getByRole('heading', { name: step, level: 3 });
    }

    /**
     * A phone or email link in "Need help?" (accessible name "Link to <value>").
     * @param {string} value - e.g. "866-277-6589"
     * @returns {import('@playwright/test').Locator}
     */
    helpLink(value) {
        return this.page.locator(this.selectors.helpRegion).getByRole('link', { name: `Link to ${value}` });
    }

    /**
     * The QTR reminder alert.
     * @param {string} [text]
     * @returns {import('@playwright/test').Locator}
     */
    qtrAlert(text = 'Qualified Tuition Reduction (QTR) Reminder') {
        return this.page.locator(this.selectors.qtrAlert).filter({ hasText: text });
    }

    /**
     * A radio in the new-application modal (learning mode).
     * @param {string} label - e.g. "Online"
     * @returns {import('@playwright/test').Locator}
     */
    modalRadio(label) {
        return this.page.locator(this.selectors.newApplicationModal).getByRole('radio', { name: label, exact: true });
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
        await this.page.locator(this.selectors.anyH1).first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await this.settle();
        const reveal = this.page.locator(this.selectors.showSubmittedButton);
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
        const submitted = this.line(/^\s*Submitted on /);
        await submitted.first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        // The card is the nearest ancestor holding both its button and the Application ID.
        const cards = submitted.locator(this.selectors.submittedCardFromLine);
        // Card text runs together ("...5020364Submitted on..."), so use (?!\d), not \b.
        return id ? cards.filter({ hasText: new RegExp(`Application ID:\\s*${id}(?!\\d)`) }).first() : cards.first();
    }

    /**
     * ID of an in-progress (draft) application, if the dashboard shows one.
     * @returns {Promise<string|undefined>}
     */
    async getDraftApplicationId() {
        await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        await this.page.locator(this.selectors.anyH1).first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await this.settle();
        const heading = this.page.locator(this.selectors.inProgressHeading);
        if (!(await heading.isVisible().catch(() => false))) return undefined;
        const card = this.line(/^\s*Continue your application/).first().locator(this.selectors.draftCardFromLine);
        return ((await card.innerText()).match(/Application ID:\s*(\d+)/) || [])[1];
    }

    /**
     * Why a new application cannot be started, when the dashboard says so ("Why can't I start a
     * new application?" "Only one application can be sent for each start date. ..."); empty when
     * a new one can be started. Opens the "Start a new application" accordion if needed.
     * @returns {Promise<string>}
     */
    async getNewApplicationBlockedReason() {
        const text = this.page.locator(this.selectors.newApplicationBlockedText).first();
        const continueNew = this.page.locator(this.selectors.continueWithNewButton);
        if (!(await text.isVisible().catch(() => false)) && !(await continueNew.isVisible().catch(() => false))) {
            await this.page.locator(this.selectors.startNewApplicationButton).click();
            await text.or(continueNew).first().waitFor({ state: 'visible', timeout: this.assertionTimeout }).catch(() => {});
        }
        if (!(await text.isVisible().catch(() => false))) return '';
        return (await text.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * Open a second application: resume the in-progress draft if there is one (so reruns
     * don't pile up drafts), otherwise "Start a new application" -> "Continue with new
     * application" and answer the learning-mode / degree modal. Never submits anything.
     * @param {{ mode?: 'In-person'|'Online'|'ASU Local', degreeType?: 'pursue'|'individual' }} [opts]
     *   degreeType 'individual': a nondegree / visiting application ("No, I want to take
     *   individual classes ...", then No to the two follow-up questions when asked)
     * @returns {Promise<{ applicationId: string, resumed: boolean }>}
     */
    async startOrResumeNewApplication({ mode = 'Online', degreeType = 'pursue' } = {}) {
        const draftId = await this.getDraftApplicationId();
        if (draftId) {
            const card = this.line(new RegExp(`Application ID:\\s*${draftId}(?!\\d)`)).first().locator(this.selectors.draftCardFromLine);
            await card.locator(this.selectors.continueButton).click();
            await this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: this.navigationTimeout });
            return { applicationId: draftId, resumed: true };
        }
        // "Start a new application" is an accordion: clicking it while open closes it again, so
        // only open it when "Continue with new application" is not showing yet. A click on
        // Continue can be lost while the accordion is opening: retry until the modal shows.
        const continueNew = this.page.locator(this.selectors.continueWithNewButton);
        const modal = this.page.locator(this.selectors.newApplicationModal);
        for (let attempt = 0; attempt < 3 && !(await modal.isVisible().catch(() => false)); attempt++) {
            if (!(await continueNew.isVisible().catch(() => false))) {
                await this.page.locator(this.selectors.startNewApplicationButton).click();
                await continueNew.waitFor({ state: 'visible', timeout: this.assertionTimeout }).catch(() => {});
            }
            await continueNew.click();
            await modal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        }
        await modal.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await this.modalRadio(mode).click();
        // ASU Local shows "About ASU Local" and Continue, with no degree question (2026-11-19).
        if (mode !== 'ASU Local') {
            if (degreeType === 'individual') {
                await modal.locator(this.selectors.degreeNoRadio).click();
                for (const no of [this.selectors.earnedBachelorNo, this.selectors.startedAsuDegreeNo]) {
                    const radio = modal.locator(no).first();
                    if (await radio.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
                        await radio.click();
                        await expect(radio).toHaveAttribute('aria-checked', 'true', { timeout: this.assertionTimeout });
                    }
                }
            } else {
                await modal.locator(this.selectors.degreeYesRadio).click();
            }
        }
        await modal.locator(this.selectors.continueButton).click();
        await this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: this.navigationTimeout });
        const m = this.page.url().match(/\/ug-app\/(\d+)\//);
        return { applicationId: m ? m[1] : '', resumed: false };
    }

    /**
     * Profile menu items, e.g. ['Dashboard', 'Edit profile', 'Sign out'].
     * @returns {Promise<string[]>}
     */
    async getProfileMenuItems() {
        await this.page.locator(this.selectors.profileMenuButton).click();
        const menu = this.page.locator(this.selectors.profileMenu);
        await menu.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const items = (await menu.locator(this.selectors.profileMenuEntries).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
        await this.page.keyboard.press('Escape');
        return [...new Set(items)];
    }

    /**
     * Sign out through the Profile menu.
     * @returns {Promise<void>}
     */
    async signOut() {
        await this.page.locator(this.selectors.profileMenuButton).click();
        await this.page.locator(this.selectors.profileMenu).locator(this.selectors.signOutItem).click();
        await this.page.waitForURL((u) => !/\/dashboard|\/ug-app\//.test(u.pathname), { timeout: this.navigationTimeout });
        await this.settle();
    }

    /**
     * Open the main dashboard (/dashboard, "Welcome back, ..."), where "Start a new application"
     * is. Right after a submission an "Application submitted!" popup covers Next steps; its
     * "Go to dashboard" is used when it is there.
     * @returns {Promise<void>}
     */
    async openMainDashboard() {
        const goToDashboard = this.page.getByRole('button', { name: /Go to dashboard/ }).or(this.page.getByRole('link', { name: /Go to dashboard/ })).first();
        if (await goToDashboard.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
            await goToDashboard.click();
            await this.page.waitForURL(/\/dashboard/, { timeout: this.navigationTimeout }).catch(() => {});
        }
        if (!/\/dashboard\/?(\?|$)/.test(new URL(this.page.url()).pathname + new URL(this.page.url()).search) || /\/ug-app\//.test(this.page.url())) {
            await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        }
        await this.page.locator(this.selectors.startNewApplicationButton).first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
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
            await card.locator(this.selectors.viewApplicationButton).click();
            await this.page.waitForURL(/\/ug-app\/\d+\/dashboard/, { timeout: this.navigationTimeout });
        }
        await this.verifyPageLoaded();
        // The heading renders before the content; wait for the summary to be filled in.
        await expect(this.line(/^\s*Program:\s*\S/).first()).toBeVisible({ timeout: this.navigationTimeout });
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
            await expect(this.nextStepHeading(step)).toBeVisible();
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
            const text = await this.line(new RegExp(`^\\s*${label}:`)).first().innerText();
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
        const step = this.page.locator(this.selectors.payFeeStepHeading);
        return (await step.isVisible().catch(() => false)) ? 'unpaid' : 'paid or waived';
    }

    // ------------------------------------------------------------------ contact

    /**
     * @param {string} [expectedPhone]
     * @returns {Promise<void>}
     */
    async verifyPhoneNumber(expectedPhone = '866-277-6589') {
        await expect(this.helpLink(expectedPhone)).toHaveAttribute('href', `tel:${expectedPhone}`);
    }

    /**
     * @param {string} [expectedEmail]
     * @returns {Promise<void>}
     */
    async verifyEmailAddress(expectedEmail = 'enrollmentonline@asu.edu') {
        await expect(this.helpLink(expectedEmail)).toHaveAttribute('href', `mailto:${expectedEmail}`);
    }

    // ------------------------------------------------------------------ QTR alert

    /**
     * Is the QTR reminder shown? (Seen for ASU Online applicants.)
     * @returns {Promise<boolean>}
     */
    async checkQtrAlertPresenceForAZOnline() {
        return this.qtrAlert().isVisible().catch(() => false);
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
        await expect(this.qtrAlert('QTR')).toBeHidden({ timeout: this.assertionTimeout });
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
        const PreviewPage = require('./PreviewPage');
        await new PreviewPage(this.page).verifyPageLoaded();
    }

    /**
     * The summary and help panel are shown (used for the phone-size check).
     * @returns {Promise<void>}
     */
    async verifySummaryAndHelpVisible() {
        await expect(this.page.locator(this.selectors.summaryHeading)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.helpRegion)).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * Basic accessibility of Next steps: one h1, no visible link without a name.
     * @returns {Promise<{ h1Count: number, unnamedControls: number }>}
     */
    async getAccessibilitySummary() {
        return this.getBasicAccessibility(this.selectors.link);
    }
}

module.exports = PostAppSubmissionDashboardPage;
