// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/** Summary sections, in page order. */
const SECTIONS = ['Profile', 'My information', 'My program', 'My schools', 'My high school grades', 'Arizona residency'];

/**
 * Page Object for "Preview Submitted Application" (/ug-app/<applicationId>/preview).
 *
 * Rebuilt against the live page on 2026-11-10 (submitted application 5020364). It only
 * exists once an application is submitted (before that the URL redirects to the
 * dashboard). Read-only page:
 *  - "Back" and "Return to previous page" links (both go to Next steps)
 *  - "Application ID: <id>", "Submitted on <date>", "Download as PDF"
 *  - Six collapsible summary sections (same label/value layout as Review, no Edit)
 *  - Application affidavit: "Read affidavit" expands the text inline; the certify
 *    checkbox is shown ticked and disabled
 * downloadPdf is deliberately not automated; tests only check the button.
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; a section's disclosure button comes from sectionButton(). Specs use
 * these names and the read-back methods, never their own locators.
 */
class PreviewPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="Preview Submitted Application"][level=1]',
            applicationIdHeading: 'role=heading[name=/^Application ID:/]',
            downloadPdfButton: 'role=button[name="Download as PDF"]',
            backLink: 'role=link[name="Back"]',
            returnLink: 'role=link[name="Return to previous page"]',
            affidavitHeading: 'role=heading[name="Application affidavit"]',
            readAffidavitButton: 'role=button[name="Read affidavit"]',
            certifyCheckbox: 'input[type="checkbox"]',
            affidavitText: 'text=Academic Integrity',
            submittedOnLine: 'p:visible:has-text("Submitted on")',
            // Controls checked for accessible names.
            mainControls: 'main a, main button',
        };
        this.SECTIONS = SECTIONS;
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open the preview of the signed-in user's submitted application the way a person does:
     * the Next steps dashboard, then "Review what you submitted". Uses this.applicationId,
     * else the "Your applications" card (via the post-submission dashboard page object).
     *
     * APP BUG (seen 2026-11-12): loading /ug-app/<id>/preview directly, or reloading it, shows
     * "No data has been entered" for My information's Legal sex and Primary language, though
     * both have values (they show when the page is reached through the link). So never open
     * the preview by URL here.
     * @returns {Promise<void>}
     */
    async navigateToPreviewPage() {
        const Dashboard = require('./PostAppSubmissionDashboardPage');
        const dashboard = new Dashboard(this.page);
        dashboard.applicationId = this.applicationId;
        const id = await dashboard.getSubmittedApplicationId();
        this.applicationId = id;
        await dashboard.navigateToDashboard();
        await dashboard.clickPreviewLink();
        await this.settle();
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/preview/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.applicationIdHeading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * Header, PDF button, six sections, affidavit (certified, disabled) and links.
     * @returns {Promise<void>}
     */
    async validatePreview() {
        await expect(this.page.locator(this.selectors.downloadPdfButton)).toBeVisible();
        for (const name of SECTIONS) {
            await expect(this.sectionButton(name)).toBeVisible();
        }
        await expect(this.page.locator(this.selectors.affidavitHeading)).toBeVisible();
        await expect(this.page.locator(this.selectors.backLink)).toBeVisible();
        await expect(this.page.locator(this.selectors.returnLink)).toBeVisible();
    }

    /**
     * @returns {Promise<{ applicationId: string, submittedOn: string }>}
     */
    async getApplicationHeader() {
        const idText = await this.page.locator(this.selectors.applicationIdHeading).innerText();
        const submitted = await this.page.locator(this.selectors.submittedOnLine).first().innerText();
        return {
            applicationId: (idText.match(/(\d+)/) || [])[1] || '',
            submittedOn: submitted.replace(/^\s*Submitted on\s*/, '').trim(),
        };
    }

    // ------------------------------------------------------------------ sections

    /**
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    sectionButton(name) {
        return this.page.getByRole('button', { name, exact: true });
    }

    /**
     * Expand a section and read its text lines in order (labels and values alternate,
     * though labels can repeat; see getSectionValue()).
     * @param {string} name - one of SECTIONS
     * @returns {Promise<string[]>}
     */
    async getSectionLines(name) {
        const btn = this.sectionButton(name);
        if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
        await expect(btn).toHaveAttribute('aria-expanded', 'true', { timeout: this.assertionTimeout });
        const panelId = await btn.getAttribute('aria-controls');
        const read = () => this.page.evaluate((id) => {
            const panel = id && document.getElementById(id);
            if (!panel) return [];
            return [...panel.querySelectorAll('p')]
                .map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim().replace(/^"(.*)"$/, '$1'));
        }, panelId);
        // Parts of a section load after it opens: My schools first shows "Graduating school"
        // over an empty paragraph, and the school's details fill it in a moment later
        // (seen 2026-11-19). Wait until no paragraph is empty, then read.
        await expect.poll(async () => (await read()).filter((t) => !t).length, { timeout: this.assertionTimeout })
            .toBe(0).catch(() => {});
        return (await read()).filter(Boolean);
    }

    /**
     * The value after the nth occurrence of a label in a section.
     * @param {string} name
     * @param {string} label
     * @param {number} [nth]
     * @returns {Promise<string|undefined>}
     */
    async getSectionValue(name, label, nth = 0) {
        const lines = await this.getSectionLines(name);
        let seen = -1;
        for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i] === label && ++seen === nth) return lines[i + 1];
        }
        return undefined;
    }

    /** @returns {Promise<string[]>} */
    async getProfileSection() { return this.getSectionLines('Profile'); }

    /** @returns {Promise<string[]>} */
    async getMyInfoSection() { return this.getSectionLines('My information'); }

    /** @returns {Promise<string[]>} */
    async getMyProgramSection() { return this.getSectionLines('My program'); }

    /** @returns {Promise<string[]>} */
    async getMySchoolsSection() { return this.getSectionLines('My schools'); }

    /** @returns {Promise<string[]>} */
    async getHighSchoolGradesSection() { return this.getSectionLines('My high school grades'); }

    /** @returns {Promise<string[]>} */
    async getArizonaResidencySection() { return this.getSectionLines('Arizona residency'); }

    /**
     * Program as shown: "Program" for one choice, "First choice" with a backup.
     * @returns {Promise<string|undefined>}
     */
    async getProgram() {
        return (await this.getSectionValue('My program', 'First choice')) ?? (await this.getSectionValue('My program', 'Program'));
    }

    // ------------------------------------------------------------------ affidavit

    /**
     * Affidavit heading and the certification, ticked and disabled.
     * @returns {Promise<void>}
     */
    async verifyApplicationAffidavit() {
        await expect(this.page.locator(this.selectors.affidavitHeading)).toBeVisible();
        await this.verifyAffidavitCheckboxDisabled();
    }

    /**
     * "Read affidavit" expands the affidavit text inline.
     * @returns {Promise<void>}
     */
    async clickReadAffidavitLink() {
        await this.page.locator(this.selectors.readAffidavitButton).click();
        await expect(this.page.locator(this.selectors.affidavitText).first()).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * The submitted certification is shown ticked and can't be changed.
     * @returns {Promise<void>}
     */
    async verifyAffidavitCheckboxDisabled() {
        const box = this.page.locator(this.selectors.certifyCheckbox).first();
        await expect(box).toBeChecked();
        await expect(box).toBeDisabled();
    }

    // ------------------------------------------------------------------ actions

    /**
     * The PDF button is shown and enabled. (The download itself isn't automated.)
     * @returns {Promise<void>}
     */
    async verifyDownloadPdfButton() {
        await expect(this.page.locator(this.selectors.downloadPdfButton)).toBeEnabled();
    }

    /**
     * "Back" returns to Next steps.
     * @returns {Promise<void>}
     */
    async clickBackButton() {
        await this.page.locator(this.selectors.backLink).click();
        await this.page.waitForURL(/\/ug-app\/\d+\/dashboard/, { timeout: this.navigationTimeout });
    }

    /**
     * "Return to previous page" returns to Next steps.
     * @returns {Promise<void>}
     */
    async clickReturnToPreviousPage() {
        await this.page.locator(this.selectors.returnLink).click();
        await this.page.waitForURL(/\/ug-app\/\d+\/dashboard/, { timeout: this.navigationTimeout });
    }

    /**
     * The PDF button and the first section are shown (used for the phone-size check).
     * @returns {Promise<void>}
     */
    async verifyKeyContentVisible() {
        await expect(this.page.locator(this.selectors.downloadPdfButton)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.sectionButton(SECTIONS[0])).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * Basic accessibility of the preview: one h1, no visible link/button without a name.
     * @returns {Promise<{ h1Count: number, unnamedControls: number }>}
     */
    async getAccessibilitySummary() {
        return this.getBasicAccessibility(this.selectors.mainControls);
    }

    /**
     * Flow specs called this when Preview came before submission. It now only exists
     * after submission, so this fails clearly; submit from Review (ReviewPage).
     * @returns {Promise<never>}
     */
    async submitApplication() {
        throw new Error('PreviewPage.submitApplication: Preview is post-submission now; submit from Review (ReviewPage.submitApplication)');
    }
}

module.exports = PreviewPage;
