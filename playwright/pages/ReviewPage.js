// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/** Review sections, and the wizard step each one's Edit button opens. */
const SECTIONS = {
    'Profile': '/profile',
    'My information': '/my-information',
    'My program': '/my-program',
    'My schools': '/my-schools',
    'My high school grades': '/my-high-school-grades',
    'Arizona residency': '/arizona-residency',
};

/**
 * Page Object for step 6 of the application wizard: "Review"
 * (/ug-app/<applicationId>/review).
 *
 * Rebuilt against the live page on 2026-11-10:
 *  - Six collapsible summary sections (Profile ... Arizona residency); each expands into
 *    label/value pairs and has an Edit button that opens that step.
 *  - Application affidavit (transcripts, academic integrity, ACD 401 / asu.edu/reportit
 *    links) and a required "I, <name>, certify..." checkbox.
 *  - "Pay your application fee": nonrefundable amount due (e.g. $75.00) and a
 *    "Choose a payment option" radiogroup: "Pay now (Visa, Mastercard, Discover or
 *    American Express)" or "Pay later". Card brands are no longer chosen on this page.
 *  - Footer: "Previous step", "Submit application".
 *
 * submitApplication() is IRREVERSIBLE (it submits the application). Tests gate it
 * behind REVIEW_ALLOW_SUBMIT=1. This page object never enters card details.
 */
class ReviewPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="Review"][level=1]',
            affidavitHeading: 'role=heading[name="Application affidavit"]',
            certifyCheckbox: 'role=checkbox[name=/certify that all information is correct and complete/]',
            feeHeading: 'role=heading[name="Pay your application fee"]',
            paymentGroup: 'role=radiogroup[name="Choose a payment option"]',
            payNow: 'role=radio[name="Pay now (Visa, Mastercard, Discover or American Express)"]',
            payLater: 'role=radio[name="Pay later"]',
            submitButton: 'role=button[name="Submit application"]',
            previousStepButton: 'role=button[name="Previous step"]',
            acd401Link: 'role=link[name=/^ACD 401: Prohibition Against Discrimination/]',
            reportItLink: 'role=link[name="asu.edu/reportit"]',
        };
        this.SECTIONS = SECTIONS;
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open step 6 of the signed-in user's application.
     * @returns {Promise<void>}
     */
    async navigateToReviewPage() {
        await this.gotoApplicationStep('review');
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/review/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * Sections, affidavit, fee and submit button are present.
     * @returns {Promise<void>}
     */
    async validateReview() {
        await expect(this.page.getByRole('heading', { name: 'Review and submit your application' })).toBeVisible();
        for (const name of Object.keys(SECTIONS)) {
            await expect(this.sectionButton(name)).toBeVisible();
        }
        await expect(this.page.locator(this.selectors.affidavitHeading)).toBeVisible();
        await expect(this.page.locator(this.selectors.certifyCheckbox)).toBeVisible();
        await expect(this.page.locator(this.selectors.feeHeading)).toBeVisible();
        await expect(this.page.locator(this.selectors.submitButton)).toBeVisible();
    }

    // ------------------------------------------------------------------ sections

    /**
     * The disclosure button for a section (its name is "<Section> Edit").
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    sectionButton(name) {
        return this.page.getByRole('button', { name: `${name} Edit`, exact: true });
    }

    /**
     * @param {string} name
     * @returns {Promise<void>}
     */
    async expandSection(name) {
        const btn = this.sectionButton(name);
        if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
        await expect(btn).toHaveAttribute('aria-expanded', 'true', { timeout: this.assertionTimeout });
    }

    /**
     * Expand a section and read its text lines in order, e.g.
     * ['Legal name', 'Qa Automation', 'Preferred first name', 'No data has been entered', ...].
     * Labels can repeat (My program lists Location/Starting term per choice) and some
     * sections have sub-headings, so use getSectionValue() to look values up.
     * @param {string} name - a key of SECTIONS
     * @returns {Promise<string[]>}
     */
    async getSectionLines(name) {
        await this.expandSection(name);
        const buttonId = await this.sectionButton(name).getAttribute('id');
        return this.page.evaluate((id) => {
            const btn = id && document.getElementById(id);
            const panelId = btn && btn.getAttribute('aria-controls');
            const panel = panelId && document.getElementById(panelId);
            if (!panel) return [];
            return [...panel.querySelectorAll('p')]
                .map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim().replace(/^"(.*)"$/, '$1'))
                .filter(Boolean);
        }, buttonId);
    }

    /**
     * The value shown after the nth occurrence of a label in a section.
     * @param {string} name - section, a key of SECTIONS
     * @param {string} label - e.g. 'Legal sex', 'Starting term'
     * @param {number} [nth] - 0-based occurrence (e.g. 1 for the second choice's Location)
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

    /**
     * Old API name: the section's lines.
     * @param {string} name
     * @returns {Promise<string[]>}
     */
    async getSectionDetails(name) { return this.getSectionLines(name); }

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
     * Click a section's Edit button; it opens that step (or Profile).
     * @param {string} name - a key of SECTIONS
     * @returns {Promise<void>}
     */
    async clickEditSection(name) {
        await this.expandSection(name);
        await this.sectionButton(name).getByRole('button', { name: 'Edit', exact: true }).click();
        const slug = SECTIONS[/** @type {keyof typeof SECTIONS} */ (name)];
        await this.page.waitForURL(new RegExp(slug.replace(/\//g, '\\/')), { timeout: this.navigationTimeout });
    }

    // ------------------------------------------------------------------ affidavit

    /**
     * Affidavit sections and the certify checkbox are shown.
     * @returns {Promise<void>}
     */
    async verifyApplicationAffidavit() {
        await expect(this.page.locator(this.selectors.affidavitHeading)).toBeVisible();
        for (const h of ['Submitting Official Transcripts (For Degree-Seeking Students)', 'Academic Integrity',
            'Prohibition Against Discrimination, Harassment and Retaliation']) {
            await expect(this.page.getByRole('heading', { name: h })).toBeVisible();
        }
        await expect(this.page.locator(this.selectors.certifyCheckbox)).toBeVisible();
    }

    /**
     * Tick (or untick) the affidavit certification.
     * @param {boolean} [certify]
     * @returns {Promise<void>}
     */
    async certifyAffidavit(certify = true) {
        const box = this.page.locator(this.selectors.certifyCheckbox);
        if ((await box.isChecked()) !== certify) await box.click();
        if (certify) await expect(box).toBeChecked();
        else await expect(box).not.toBeChecked();
    }

    /**
     * Flow-spec name: certify the affidavit.
     * @returns {Promise<void>}
     */
    async acknowledgeAndContinue() {
        await this.certifyAffidavit(true);
    }

    /**
     * The affidavit's external links.
     * @returns {Promise<{ acd401: string|null, reportIt: string|null }>}
     */
    async verifyExternalLinks() {
        const acd401 = await this.page.locator(this.selectors.acd401Link).getAttribute('href');
        const reportIt = await this.page.locator(this.selectors.reportItLink).getAttribute('href');
        return { acd401, reportIt };
    }

    // ------------------------------------------------------------------ fee and payment

    /**
     * Read the fee section.
     * @returns {Promise<{ amount: string, options: string[] }>}
     */
    async verifyApplicationFeeSection() {
        await expect(this.page.locator(this.selectors.feeHeading)).toBeVisible();
        const amount = (await this.page.getByRole('heading', { name: /^\$\d+(\.\d{2})?$/ }).first().innerText()).trim();
        const options = (await this.page.locator(this.selectors.paymentGroup).getByRole('radio').allInnerTexts())
            .map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
        return { amount, options: [...new Set(options)] };
    }

    /**
     * Choose a payment option. Card brands from the old API ('Visa', 'MasterCard',
     * 'Discover', 'American Express') all mean "Pay now"; 'later'/'Pay Later' -> "Pay later".
     * Choosing only marks the radio; nothing is charged until submission/payment.
     * @param {string} method
     * @returns {Promise<void>}
     */
    async selectPaymentMethod(method) {
        const later = /later/i.test(method);
        const radio = this.page.locator(later ? this.selectors.payLater : this.selectors.payNow);
        await radio.click();
        await expect(radio).toHaveAttribute('aria-checked', 'true', { timeout: this.assertionTimeout });
    }

    /**
     * Flow-spec name. Fee waivers aren't offered on this page as of 2026-11-10, so this
     * chooses "Pay later".
     * @returns {Promise<void>}
     */
    async handlePaymentOrWaiver() {
        await this.selectPaymentMethod('later');
    }

    // ------------------------------------------------------------------ flow-spec checks

    /** @returns {Promise<void>} */
    async verifyPersonalInformation() {
        expect(await this.getSectionValue('Profile', 'Legal name')).toBeTruthy();
        expect(await this.getSectionValue('Profile', 'Email')).toContain('@');
    }

    /**
     * Chosen programs. One program is labelled "Program"; with a backup the section shows
     * "First choice" and "Second choice".
     * @returns {Promise<{ first?: string, second?: string }>}
     */
    async getChosenPrograms() {
        const first = (await this.getSectionValue('My program', 'First choice')) ?? (await this.getSectionValue('My program', 'Program'));
        const second = await this.getSectionValue('My program', 'Second choice');
        return { first, second };
    }

    /** @returns {Promise<void>} */
    async verifyProgramInformation() {
        expect((await this.getChosenPrograms()).first).toBeTruthy();
    }

    /** @returns {Promise<void>} */
    async verifySchoolInformation() {
        expect(await this.getSectionValue('My schools', 'High school name')).toBeTruthy();
    }

    /** @returns {Promise<void>} */
    async verifyResidencyInformation() {
        expect((await this.getArizonaResidencySection()).length).toBeGreaterThan(0);
    }

    // ------------------------------------------------------------------ submission (irreversible)

    /**
     * IRREVERSIBLE: click "Submit application". Certifies the affidavit and chooses
     * "Pay later" first unless told not to. Callers must gate this explicitly.
     * @param {{ certify?: boolean, paymentOption?: 'now'|'later'|null }} [options]
     * @returns {Promise<void>}
     */
    async submitApplication({ certify = true, paymentOption = 'later' } = {}) {
        if (certify) await this.certifyAffidavit(true);
        if (paymentOption) await this.selectPaymentMethod(paymentOption);
        this.logger.warn('Submitting the application (irreversible)');
        await this.page.locator(this.selectors.submitButton).click();
    }
}

module.exports = ReviewPage;
