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
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; a section's disclosure button (it depends on the section name) comes
 * from sectionButton(). Specs use these names and the read-back methods, never their
 * own locators.
 */
/**
 * Fee waiver reasons under "If you feel your financial situation may qualify you for an
 * application fee waiver, please select all that apply:" (in-person applicants; verified
 * live 2026-11-12). Ticking any of them makes the applicant eligible: the page then shows a
 * certification statement and a "Fee waiver signature" box. The last checkbox on the page,
 * "None of these options apply to me.", is FEE_WAIVER_NONE.
 */
const FEE_WAIVER_OPTIONS = [
    'I have received or am eligible to receive an ACT or SAT testing fee waiver.',
    'I am enrolled in or am eligible to participate in the Federal Free or Reduced Price Lunch program (FRPL).',
    'My annual family income falls within the Eligibility Guidelines set by the USDA Food and Nutrition Service.',
    'I am enrolled in a federal, state, or local program that aids students from low-income families (e.g., TRIO programs such as Upward Bound).',
    'My family receives public assistance.',
    'I live in federally subsidized public housing, a foster home or am homeless.',
    'I am a ward of the state or an orphan.',
    'I can provide a supporting statement from a school official, college access counselor, financial aid officer, or community leader.',
    'I have received a NACAC fee waiver.',
    'I have received a College Board fee waiver.',
];
const FEE_WAIVER_NONE = 'None of these options apply to me.';

class ReviewPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="Review"][level=1]',
            introHeading: 'role=heading[name="Review and submit your application"]',
            // Inside a section's disclosure button.
            sectionEditButton: 'role=button[name="Edit"s]',
            affidavitHeading: 'role=heading[name="Application affidavit"]',
            affidavitSubHeadings: [
                'role=heading[name="Submitting Official Transcripts (For Degree-Seeking Students)"]',
                'role=heading[name="Academic Integrity"]',
                'role=heading[name="Prohibition Against Discrimination, Harassment and Retaliation"]',
            ],
            certifyCheckbox: 'role=checkbox[name=/certify that all information is correct and complete/]',
            feeHeading: 'role=heading[name="Pay your application fee"]',
            feeAmount: 'role=heading[name=/^\\$\\d+(\\.\\d{2})?$/]',
            paymentGroup: 'role=radiogroup[name="Choose a payment option"]',
            radio: 'role=radio',
            payNow: 'role=radio[name="Pay now (Visa, Mastercard, Discover or American Express)"]',
            payLater: 'role=radio[name="Pay later"]',
            // Fee already waived (e.g. Education benefits = Yes with a partner provider on My
            // information): this notice replaces the payment options and the waiver list.
            feeWaivedNotice: 'text=/Your application fee has been waived\\./',
            // Fee waiver (in-person applicants): reasons are checkboxes, see FEE_WAIVER_OPTIONS
            feeWaiverHeading: 'role=heading[name=/qualify you for an application fee waiver/]',
            feeWaiverCertification: 'text=/I certify that I understand and meet the eligibility requirements to request an admission application fee waiver/',
            feeWaiverSignature: 'role=textbox[name="Fee waiver signature"]',
            submitButton: 'role=button[name="Submit application"]',
            submitErrorsHeading: 'text="Please correct the following items:"',
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
        await expect(this.page.locator(this.selectors.introHeading)).toBeVisible({ timeout: this.assertionTimeout });
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
        // A click can be lost on a busy machine: click again if the section didn't open.
        if (!(await expect(btn).toHaveAttribute('aria-expanded', 'true', { timeout: this.assertionTimeout }).then(() => true).catch(() => false))) {
            await btn.click();
            await expect(btn).toHaveAttribute('aria-expanded', 'true', { timeout: this.navigationTimeout });
        }
    }

    /**
     * Which of the step sections Review lists, in SECTIONS order. A nondegree or visiting
     * applicant has no "My high school grades" section.
     * @returns {Promise<string[]>}
     */
    async getShownSections() {
        await this.sectionButton('Profile').waitFor({ state: 'visible', timeout: this.navigationTimeout });
        /** @type {string[]} */
        const shown = [];
        for (const name of Object.keys(SECTIONS)) {
            if (await this.sectionButton(name).isVisible().catch(() => false)) shown.push(name);
        }
        return shown;
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
        await this.sectionButton(name).locator(this.selectors.sectionEditButton).click();
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
        for (const selector of this.selectors.affidavitSubHeadings) {
            await expect(this.page.locator(selector), selector).toBeVisible();
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
        const amount = (await this.page.locator(this.selectors.feeAmount).first().innerText()).trim();
        const options = (await this.page.locator(this.selectors.paymentGroup).locator(this.selectors.radio).allInnerTexts())
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
     * The payment option currently chosen.
     * @returns {Promise<'Pay now'|'Pay later'|undefined>}
     */
    async getSelectedPaymentOption() {
        if ((await this.page.locator(this.selectors.payNow).getAttribute('aria-checked')) === 'true') return 'Pay now';
        if ((await this.page.locator(this.selectors.payLater).getAttribute('aria-checked')) === 'true') return 'Pay later';
        return undefined;
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
     * Click "Submit application" BEFORE certifying and capture the validation it shows.
     * Safety: refuses unless the certification checkbox is unticked, so the click can't
     * submit; throws if the page leaves Review anyway.
     * @returns {Promise<Array<{ field: string, message: string }>>}
     */
    async captureSubmitValidations() {
        const box = this.page.locator(this.selectors.certifyCheckbox);
        await expect(box).toBeVisible({ timeout: this.assertionTimeout });
        if (await box.isChecked()) {
            throw new Error('captureSubmitValidations: the certification is ticked, so Submit would submit; not clicking');
        }
        return this.captureFieldValidations({
            stepName: 'Review (Submit application)',
            button: this.page.locator(this.selectors.submitButton),
            allowSubmitPage: true,
        });
    }

    // ------------------------------------------------------------------ fee waiver

    /**
     * A fee waiver checkbox by its label (one of FEE_WAIVER_OPTIONS, or FEE_WAIVER_NONE).
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    feeWaiverOption(label) {
        return this.page.getByRole('checkbox', { name: label, exact: true });
    }

    /**
     * Does Review say the fee is already waived ("Your application fee has been waived. If all
     * your information is correct, you may proceed and submit your application.")?
     * @returns {Promise<boolean>}
     */
    async isFeeWaived() {
        return this.page.locator(this.selectors.feeWaivedNotice).first().isVisible();
    }

    /**
     * Are the payment options ("Pay now" / "Pay later") offered?
     * @returns {Promise<boolean>}
     */
    async isPaymentOffered() {
        return this.page.locator(this.selectors.paymentGroup).isVisible();
    }

    /**
     * The payment options Review lists, whatever the group is called: usually "Choose a
     * payment option" with Pay now / Pay later; an ASU Local applicant gets "Payment option"
     * with Pay later only (verified 2026-11-19). Empty when no payment is asked.
     * @returns {Promise<string[]>}
     */
    async getPaymentOptions() {
        /** @type {string[]} */
        const shown = [];
        for (const [label, selector] of [['Pay now', this.selectors.payNow], ['Pay later', this.selectors.payLater]]) {
            if (await this.page.locator(selector).isVisible().catch(() => false)) shown.push(label);
        }
        return shown;
    }

    /**
     * Is the fee waiver list offered on this Review page?
     * @returns {Promise<boolean>}
     */
    async isFeeWaiverOffered() {
        return this.page.locator(this.selectors.feeWaiverHeading).isVisible();
    }

    /**
     * The fee waiver checkboxes shown, in page order ("None of these options apply to me."
     * last), read from the page.
     * @returns {Promise<string[]>}
     */
    async getFeeWaiverOptions() {
        const known = [...FEE_WAIVER_OPTIONS, FEE_WAIVER_NONE];
        const labels = await this.page.getByRole('checkbox').evaluateAll((boxes) => boxes
            .map((b) => (b.getAttribute('aria-label') || b.closest('label')?.textContent || b.parentElement?.textContent || '').replace(/\s+/g, ' ').trim()));
        return labels.filter((l) => known.includes(l));
    }

    /**
     * Tick or untick fee waiver checkboxes.
     * @param {string[]} labels
     * @param {boolean} [checked]
     * @returns {Promise<void>}
     */
    async setFeeWaivers(labels, checked = true) {
        for (const label of labels) {
            const box = this.feeWaiverOption(label);
            await box.scrollIntoViewIfNeeded();
            if ((await box.isChecked()) !== checked) await box.click();
            if (checked) await expect(box).toBeChecked();
            else await expect(box).not.toBeChecked();
        }
    }

    /**
     * The fee waiver checkboxes currently ticked.
     * @returns {Promise<string[]>}
     */
    async getSelectedFeeWaivers() {
        /** @type {string[]} */
        const ticked = [];
        for (const label of await this.getFeeWaiverOptions()) {
            if (await this.feeWaiverOption(label).isChecked()) ticked.push(label);
        }
        return ticked;
    }

    /**
     * Are the certification statement and the "Fee waiver signature" box shown? They appear
     * once at least one waiver reason is ticked.
     * @returns {Promise<boolean>}
     */
    async isFeeWaiverSignatureShown() {
        return (await this.page.locator(this.selectors.feeWaiverSignature).isVisible())
            && this.page.locator(this.selectors.feeWaiverCertification).first().isVisible();
    }

    /**
     * Request a fee waiver: tick the reasons, then sign.
     * @param {{ reasons: string[], signature: string }} data - signature: the applicant's name
     * @returns {Promise<void>}
     */
    async requestFeeWaiver({ reasons, signature }) {
        await this.setFeeWaivers(reasons, true);
        const box = this.page.locator(this.selectors.feeWaiverSignature);
        await box.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        await box.fill(signature);
    }

    /** @returns {Promise<string>} what is typed in "Fee waiver signature" */
    async getFeeWaiverSignature() {
        return this.page.locator(this.selectors.feeWaiverSignature).inputValue();
    }

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

    /**
     * After submitApplication(): wait until the app leaves Review (submission accepted).
     * @param {number} [timeoutMs]
     * @returns {Promise<void>}
     */
    async waitForSubmitted(timeoutMs = 60000) {
        // Submitted = the app moved to the application's Next steps dashboard. If Review
        // refuses instead, it lists what to correct: fail with that list rather than wait.
        const deadline = Date.now() + timeoutMs;
        // A click on Submit while the payment note is still opening can be lost (seen
        // 2026-11-19): nothing is sent and the page stays as it was. If after 20s nothing has
        // happened and Submit is still there and enabled, click it once more.
        const retryAt = Date.now() + 20000;
        let retried = false;
        while (Date.now() < deadline) {
            if (/\/ug-app\/\d+\/dashboard/.test(this.page.url())) return;
            const errors = await this.getSubmitErrors();
            if (errors.length) throw new Error(`Submit application was blocked by Review: ${errors.join('; ')}`);
            if (!retried && Date.now() > retryAt) {
                retried = true;
                const submit = this.page.locator(this.selectors.submitButton);
                if (await submit.isEnabled().catch(() => false)) {
                    this.logger.warn('Still on Review 20s after Submit, with nothing listed to correct: clicking Submit again');
                    await submit.click();
                }
            }
            await this.page.waitForTimeout(500);
        }
        throw new Error(`Application not submitted after ${timeoutMs / 1000}s: still at ${this.page.url()}`);
    }

    /**
     * The items listed under "Please correct the following items:" after a refused submit
     * (empty when the message isn't shown).
     * @returns {Promise<string[]>}
     */
    async getSubmitErrors() {
        const heading = this.page.locator(this.selectors.submitErrorsHeading).first();
        if (!(await heading.isVisible().catch(() => false))) return [];
        const text = await heading.locator('xpath=..').innerText();
        return text.split(/\s*[\r\n]+\s*/).map((l) => l.trim())
            .filter((l) => l && !/^Please correct the following items:?$/.test(l));
    }
}

ReviewPage.FEE_WAIVER_OPTIONS = FEE_WAIVER_OPTIONS;
ReviewPage.FEE_WAIVER_NONE = FEE_WAIVER_NONE;
module.exports = ReviewPage;
