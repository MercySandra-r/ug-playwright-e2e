// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Yes/No question ids on the step, with their live wording (2026-11-10).
 * @type {Record<string, { id: string, label: string }>}
 */
const QUESTIONS = {
    livedInAz12Months: { id: 'radio_isAzResident12m', label: 'Have you been living in Arizona continuously for the last 12 months?' },
    enrolledElsewhere: { id: 'radio_isEnrolledInAnotherUni', label: 'Are you currently enrolled at another college or university?' },
    enrolledInAzCollege: { id: 'radio_DOM_AZ', label: 'Were you enrolled at any Arizona college or university in 2026 or 2025 calendar year?' },
    hasLicense: { id: 'radio_isHavingLicense', label: 'Do you have a current driver’s license or state issued ID?' },
    ownsVehicle: { id: 'radio_isOwnsVehicle', label: 'Do you own or operate a car, motorcycle or other motor vehicle?' },
    filedStateTaxes: { id: 'radio_isFiledTaxLastYear', label: 'Did you, or will you, file state taxes for 2025?' },
    married: { id: 'radio_isMarried', label: 'Are you married?' },
    employed: { id: 'radio_isEmployed', label: 'Are you currently employed?' },
    employedLast12Months: { id: 'radio_isEmployedInLast12m', label: 'Were you employed in the last 12 months?' },
    parentFiledTaxes: { id: 'radio_isParentFiledTaxLastYear', label: 'Did or will your parent(s) or legal guardian(s) file a state income tax return for the 2025 tax year?' },
    parentHasAzLicense: { id: 'radio_isParentHavingLicenseInAz', label: 'Does either parent or legal guardian have a current Arizona driver license?' },
    parentEmployedInAz: { id: 'radio_isParentEmployedInAz', label: 'Is either parent or legal guardian employed in Arizona?' },
    // Veterans only (uniformed services "I am a U.S. service member or veteran", status Veteran).
    registeredToVote: { id: 'radio_isRegisteredToVote', label: 'Are you registered to vote?' },
};

/** "Which character of service is noted on your DD-214?" options, as listed (2026-11-11). */
const DD214_CHARACTER_OF_SERVICE = ['Under Honorable Conditions (General)', 'Under Other Than Honorable Conditions',
    'Bad Conduct', 'Dishonorable', 'Uncharacterized', 'Honorable'];

/** Financial-support inputs (percent of support, must total 100). */
const SUPPORT = {
    parent: '#group-inputParentOrGuardianSupport',
    employment: '#group-inputEmploymentSupport',
    financialAid: '#group-inputFinancialAidSupport',
    spouse: '#group-inputSpouseSupport',
    other: '#group-inputOtherSourceSupport',
};

/**
 * Page Object for step 5 of the application wizard: "Arizona residency"
 * (/ug-app/<applicationId>/arizona-residency).
 *
 * Rebuilt against the live page on 2026-11-10. Everything is required:
 *  - Permanent home state (#permanent). Arizona adds "living in Arizona for 12 months"
 *    and "Are you married?".
 *  - Yes/No questions (see QUESTIONS), answered by their stable radiogroup ids.
 *  - Financial support percentages that must total 100 ("Total must be equal to 100%").
 *    Entering parent support reveals "state your parents live in"; Arizona there adds a
 *    parent block (relationship, date they began living in Arizona, parent taxes / AZ
 *    license / AZ employment), and parent taxes Yes adds the state they filed in.
 *  - "Are you currently employed?" No adds "Were you employed in the last 12 months?".
 *
 * Because follow-ups appear based on answers, answerRemainingQuestions() fills any
 * Yes/No group or dropdown still empty (No / first option) and logs what it did.
 * The old document-upload API is gone: the step has no uploads.
 *
 * Veterans (My information: "I am a U.S. service member or veteran", status Veteran) also
 * get: "Which character of service is noted on your DD-214?" (dropdown), "When were you
 * discharged or released from active duty?" (month + year) and "Are you registered to
 * vote?" (Yes/No). See fillVeteranDetails() / getVeteranDetails().
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (a question's radio group, a radio,
 * an option by label) come from the locator methods below. Specs use these names and
 * the read-back methods, never their own locators.
 */
class AZResidencyPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="Arizona residency"][level=1]',
            introText: 'text=Begin by selecting the state you consider to be your permanent home.',
            financialSupportHeading: 'role=heading[name="Financial support"]',
            supportTotalLabel: 'text=/Total sum/',
            parentElement: 'xpath=..',
            option: 'role=option',
            dropdownSearch: 'input[placeholder="Search..."]',
            permanentState: '#permanent',
            parentState: '#group-stateParentLives',
            parentRelationship: '#group-selectParentRelationship',
            parentAzSinceMonth: '#group-DOM_PAR_DT-month',
            parentAzSinceYear: '#group-DOM_PAR_DT-year',
            parentTaxState: '#group-selectStateParentFiledTax',
            // Shown when "Are you currently enrolled at another college or university?" is Yes.
            currentlyEnrolledAt: 'role=textbox[name="Where are you currently enrolled?"]',

            // Veterans only
            veteranIntro: 'text=You indicated that you are a veteran of the US military.',
            dd214CharacterOfService: '#group-selectService',
            dischargeMonth: '#group-MILEXITDT-month',
            dischargeYear: '#group-MILEXITDT-year',
            supportTotalError: 'text=Total must be equal to 100%',
            requiredFieldError: 'text=This is a required field.',
            continueButton: 'button[type="submit"][form="page-form"]',
        };
        this.QUESTIONS = QUESTIONS;
        this.SUPPORT = SUPPORT;
        this.DD214_CHARACTER_OF_SERVICE = DD214_CHARACTER_OF_SERVICE;
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * An open list's option by label; selected options show a trailing "✓".
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    option(label) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.page.getByRole('option', { name: new RegExp(`^${escaped}(\\s*✓)?$`) }).first();
    }

    /**
     * A Yes/No question's radio group, by key (see QUESTIONS) or raw radiogroup id.
     * @param {string} keyOrId
     * @returns {import('@playwright/test').Locator}
     */
    questionGroup(keyOrId) {
        const id = QUESTIONS[keyOrId] ? QUESTIONS[keyOrId].id : keyOrId;
        return this.page.locator(`[role="radiogroup"][id="${id}"]`);
    }

    /**
     * A radio by exact label inside a scope.
     * @param {import('@playwright/test').Locator} scope
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    radioIn(scope, label) {
        return scope.getByRole('radio', { name: label, exact: true });
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open step 5 of the signed-in user's application.
     * @returns {Promise<void>}
     */
    async navigateToAZResidency() {
        await this.gotoApplicationStep('arizona-residency');
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/arizona-residency/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * The residency intro, state picker, core questions and support table are present.
     * @returns {Promise<void>}
     */
    async validateAZresidencyPage() {
        await expect(this.page.locator(this.selectors.introText)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.permanentState)).toBeVisible();
        for (const key of ['enrolledElsewhere', 'enrolledInAzCollege', 'hasLicense', 'ownsVehicle', 'filedStateTaxes', 'employed']) {
            await expect(this.questionGroup(key), key).toBeVisible();
        }
        await expect(this.page.locator(this.selectors.financialSupportHeading)).toBeVisible();
    }

    /**
     * @returns {Promise<string>} the permanent home state currently chosen
     */
    async getPermanentState() {
        return this.page.locator(this.selectors.permanentState).inputValue();
    }

    /**
     * @param {string} selector - e.g. this.selectors.parentRelationship
     * @returns {Promise<string>} the dropdown's current value
     */
    async getDropdownValue(selector) {
        return this.page.locator(selector).inputValue();
    }

    /**
     * The answer currently ticked for a question.
     * @param {string} keyOrId
     * @returns {Promise<'Yes'|'No'|undefined>}
     */
    async getAnswer(keyOrId) {
        const group = this.questionGroup(keyOrId);
        for (const label of /** @type {Array<'Yes'|'No'>} */ (['Yes', 'No'])) {
            if ((await this.radioIn(group, label).getAttribute('aria-checked').catch(() => null)) === 'true') return label;
        }
        return undefined;
    }

    /**
     * @returns {Promise<number>} how many "This is a required field." messages are shown
     */
    async getRequiredFieldErrorCount() {
        return this.page.locator(this.selectors.requiredFieldError).count();
    }

    /**
     * @returns {Promise<boolean>} whether "Total must be equal to 100%" is shown
     */
    async isSupportTotalErrorShown() {
        return this.page.locator(this.selectors.supportTotalError).isVisible();
    }

    // ------------------------------------------------------------------ veterans

    /**
     * Whether the veteran questions (DD-214, discharge date, voter registration) are shown.
     * @returns {Promise<boolean>}
     */
    async isVeteranSectionShown() {
        return this.page.locator(this.selectors.dd214CharacterOfService).isVisible().catch(() => false);
    }

    /**
     * Answer the veteran questions.
     * @param {{ characterOfService?: string, discharged?: { month: string, year: string },
     *           registeredToVote?: boolean }} [data] - defaults: Honorable, May 2020, Yes
     * @returns {Promise<{ characterOfService: string, discharged: { month: string, year: string }, registeredToVote: 'Yes'|'No' }>}
     */
    async fillVeteranDetails({ characterOfService = 'Honorable', discharged = { month: 'May', year: '2020' }, registeredToVote = true } = {}) {
        await this.choose(this.selectors.dd214CharacterOfService, characterOfService);
        await this.choose(this.selectors.dischargeMonth, discharged.month);
        await this.choose(this.selectors.dischargeYear, discharged.year);
        await this.answer('registeredToVote', registeredToVote);
        return { characterOfService, discharged, registeredToVote: registeredToVote ? 'Yes' : 'No' };
    }

    /**
     * The veteran answers as shown.
     * @returns {Promise<{ characterOfService: string, discharged: { month: string, year: string }, registeredToVote: 'Yes'|'No'|undefined }>}
     */
    async getVeteranDetails() {
        return {
            characterOfService: await this.getDropdownValue(this.selectors.dd214CharacterOfService),
            discharged: {
                month: await this.getDropdownValue(this.selectors.dischargeMonth),
                year: await this.getDropdownValue(this.selectors.dischargeYear),
            },
            registeredToVote: await this.getAnswer('registeredToVote'),
        };
    }

    /**
     * Parents in Arizona reveal the parent block (relationship, date, parent questions).
     * @returns {Promise<void>}
     */
    async verifyArizonaParentBlockShown() {
        await expect(this.page.locator(this.selectors.parentRelationship)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.parentAzSinceMonth)).toBeVisible();
        for (const key of ['parentFiledTaxes', 'parentHasAzLicense', 'parentEmployedInAz']) {
            await expect(this.questionGroup(key), key).toBeVisible();
        }
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Choose a dropdown option (first one when no value), using Search when offered.
     * @param {string} selector
     * @param {string} [value]
     * @returns {Promise<string>}
     */
    async choose(selector, value) {
        await this.closeOpenList();
        const box = this.page.locator(selector);
        await box.scrollIntoViewIfNeeded();
        await box.click();
        const first = this.page.locator(this.selectors.option).first();
        await first.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        // A selected option is shown with a trailing "✓"; ignore it when reading/matching.
        const label = value || (await first.innerText()).replace(/\s*✓\s*$/, '').trim();
        const search = this.page.locator(this.selectors.dropdownSearch);
        if (await search.isVisible().catch(() => false)) await search.fill(label);
        await this.option(label).click();
        await this.closeOpenList();
        return label;
    }

    /**
     * Option labels of one of the page's dropdowns (closes it again).
     * @param {string} selector
     * @returns {Promise<string[]>}
     */
    async getDropdownOptionsOf(selector) {
        await this.closeOpenList();
        await this.page.locator(selector).click();
        const options = this.page.locator(this.selectors.option);
        await options.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = (await options.allInnerTexts()).map((t) => t.replace(/\s*✓\s*$/, '').trim()).filter(Boolean);
        await this.closeOpenList();
        return labels;
    }

    /**
     * Choose `preferred` if the dropdown offers it, otherwise its first option.
     * @param {string} selector
     * @param {string} [preferred] - e.g. "Arizona"
     * @returns {Promise<string>} the label chosen
     */
    async chooseOrFirst(selector, preferred) {
        if (!preferred) return this.choose(selector);
        await this.closeOpenList();
        const box = this.page.locator(selector);
        await box.scrollIntoViewIfNeeded();
        await box.click();
        await this.page.locator(this.selectors.option).first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const offered = (await this.page.locator(this.selectors.option).allInnerTexts())
            .map((t) => t.replace(/\s*✓\s*$/, '').trim());
        await this.closeOpenList();
        return this.choose(selector, offered.includes(preferred) ? preferred : undefined);
    }

    /**
     * Some lists stay open after a pick and ignore Escape; close any open list
     * (Escape, then a click on the page heading).
     * @returns {Promise<void>}
     */
    async closeOpenList() {
        const options = this.page.locator(this.selectors.option);
        if (!(await options.first().isVisible().catch(() => false))) return;
        await this.page.keyboard.press('Escape');
        if (await options.first().isVisible().catch(() => false)) {
            await this.page.locator(this.selectors.heading).click();
        }
        await options.first().waitFor({ state: 'hidden', timeout: this.assertionTimeout }).catch(() => {});
    }

    /**
     * Answer a Yes/No question by key (see QUESTIONS) or raw radiogroup id.
     * @param {string} keyOrId
     * @param {boolean} yes
     * @returns {Promise<void>}
     */
    async answer(keyOrId, yes) {
        const group = this.questionGroup(keyOrId);
        await group.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        await this.radioIn(group, yes ? 'Yes' : 'No').click();
    }

    /**
     * @param {string} keyOrId
     * @returns {Promise<boolean>}
     */
    async isQuestionVisible(keyOrId) {
        return this.questionGroup(keyOrId).isVisible().catch(() => false);
    }

    /**
     * Wait until a follow-up question is hidden again.
     * @param {string} keyOrId
     * @returns {Promise<void>}
     */
    async waitForQuestionHidden(keyOrId) {
        await expect(this.questionGroup(keyOrId)).toBeHidden({ timeout: this.assertionTimeout });
    }

    // ------------------------------------------------------------------ sections

    /**
     * @param {string} state - e.g. "Arizona", "California"
     * @returns {Promise<void>}
     */
    async selectPermanentState(state) {
        await this.choose(this.selectors.permanentState, state);
    }

    /**
     * Old API: AZ resident -> permanent home Arizona and "lived here 12 months" Yes;
     * otherwise California.
     * @param {boolean} isAZResident
     * @returns {Promise<void>}
     */
    async answerPermanentHomeQuestion(isAZResident) {
        await this.selectPermanentState(isAZResident ? 'Arizona' : 'California');
        if (isAZResident) await this.answer('livedInAz12Months', true);
    }

    /**
     * @param {boolean} hasLivedInAZ
     * @returns {Promise<void>}
     */
    async answerLivingInAZQuestion(hasLivedInAZ) {
        await this.answer('livedInAz12Months', hasLivedInAZ);
    }

    /**
     * Set financial-support percentages (unspecified sources become 0).
     * @param {{ parent?: number, employment?: number, financialAid?: number, spouse?: number, other?: number }} support
     * @returns {Promise<void>}
     */
    async setFinancialSupport(support) {
        for (const [key, selector] of Object.entries(SUPPORT)) {
            const value = String(/** @type {Record<string, number|undefined>} */ (support)[key] ?? 0);
            const box = this.page.locator(selector);
            await box.fill(value);
            await box.blur();
        }
    }

    /**
     * @returns {Promise<number>} the "Total sum" shown under the table
     */
    async getSupportTotal() {
        const text = await this.page.locator(this.selectors.supportTotalLabel).first().locator(this.selectors.parentElement).innerText();
        const m = text.match(/(\d+(\.\d+)?)/);
        return m ? Number(m[1]) : NaN;
    }

    /**
     * Old API: "Is a parent or guardian an Arizona resident?" -> parent support 100% and
     * parents' state Arizona (Yes) or California (No).
     * @param {boolean} hasAZParent
     * @returns {Promise<void>}
     */
    async answerParentGuardianQuestion(hasAZParent) {
        await this.setFinancialSupport({ parent: 100 });
        await this.choose(this.selectors.parentState, hasAZParent ? 'Arizona' : 'California');
    }

    /**
     * Parent block shown when the parents' state is Arizona.
     * @param {{ relationship?: string, azSince?: { month: string, year: string },
     *           filedTaxes?: boolean, taxState?: string, hasAzLicense?: boolean, employedInAz?: boolean }} [data]
     * @returns {Promise<void>}
     */
    async fillArizonaParentDetails(data = {}) {
        const { relationship = 'Both', azSince = { month: 'January', year: '2010' }, filedTaxes = true,
            taxState = 'Arizona', hasAzLicense = true, employedInAz = true } = data;
        await this.choose(this.selectors.parentRelationship, relationship);
        await this.choose(this.selectors.parentAzSinceMonth, azSince.month);
        await this.choose(this.selectors.parentAzSinceYear, azSince.year);
        await this.answer('parentFiledTaxes', filedTaxes);
        if (filedTaxes && await this.page.locator(this.selectors.parentTaxState).isVisible({ timeout: 3000 }).catch(() => false)) {
            await this.choose(this.selectors.parentTaxState, taxState);
        }
        await this.answer('parentHasAzLicense', hasAzLicense);
        await this.answer('parentEmployedInAz', employedInAz);
    }

    /**
     * Old API name. The step has no military question as of 2026-11-10 (military
     * affiliation is asked on My information); kept as a no-op that logs.
     * @param {boolean} _isMilitary
     * @returns {Promise<void>}
     */
    async answerMilitaryQuestion(_isMilitary) {
        this.logger.warn('answerMilitaryQuestion: no military question on Arizona residency (asked on My information)');
    }

    /**
     * Fill any Yes/No group or dropdown that's still empty: No (or Yes) for questions,
     * the preferred option (or the first one) for dropdowns. Repeats while new follow-ups
     * appear. Returns what it filled.
     * @param {number} [maxRounds]
     * @param {{ answer?: boolean, preferredOption?: string }} [options]
     *   answer: true answers Yes (default No); preferredOption: picked in any dropdown
     *   that offers it, e.g. "Arizona"
     * @returns {Promise<string[]>}
     */
    async answerRemainingQuestions(maxRounds = 4, { answer = false, preferredOption } = {}) {
        /** @type {string[]} */
        const filled = [];
        for (let round = 0; round < maxRounds; round++) {
            // APP BUG: different questions can share an id (e.g. "In which state was your
            // license issued?" and "Where did ... file your state taxes" are both
            // group-selectStateLicenseIssued), so tag each element with its own key.
            const pending = await this.page.evaluate((round) => {
                const visible = (/** @type {Element} */ e) => /** @type {HTMLElement} */ (e).offsetParent !== null;
                /** @type {Array<{ kind: string, id: string, key: string }>} */
                const out = [];
                let n = 0;
                for (const g of document.querySelectorAll('main [role="radiogroup"][id]')) {
                    if (!visible(g) || g.querySelector('[role="radio"][aria-checked="true"]')) continue;
                    const key = `r${round}-${n++}`;
                    g.setAttribute('data-autofill-key', key);
                    out.push({ kind: 'radio', id: g.id, key });
                }
                // A dropdown with a value shows a "Clear selected value" button next to it
                // (its input can stay blank), so look for that within its small container.
                const hasValue = (/** @type {Element} */ c) => {
                    if ((/** @type {HTMLInputElement} */ (c)).value) return true;
                    let el = c.parentElement;
                    for (let i = 0; el && i < 4; i++, el = el.parentElement) {
                        if (el.querySelectorAll('input[role="combobox"]').length > 1) break;
                        if (el.querySelector('button[aria-label="Clear selected value"]')) return true;
                    }
                    return false;
                };
                for (const c of document.querySelectorAll('main input[role="combobox"][id]')) {
                    if (!visible(c) || hasValue(c)) continue;
                    const key = `r${round}-${n++}`;
                    c.setAttribute('data-autofill-key', key);
                    out.push({ kind: 'combo', id: c.id, key });
                }
                return out;
            }, round);
            const todo = pending;
            if (!todo.length) break;
            for (const item of todo) {
                const target = `[data-autofill-key="${item.key}"]`;
                if (item.kind === 'radio') {
                    await this.radioIn(this.page.locator(target), answer ? 'Yes' : 'No').click();
                } else {
                    await this.chooseOrFirst(target, preferredOption);
                }
                filled.push(item.id);
            }
        }
        if (filled.length) this.logger.info(`Auto-answered: ${filled.join(', ')}`);
        return filled;
    }

    /**
     * Fill the whole step. Defaults describe an out-of-state applicant supported by
     * parents in California with every question answered No.
     * @param {{ isArizonaResident?: boolean, permanentState?: string,
     *           support?: { parent?: number, employment?: number, financialAid?: number, spouse?: number, other?: number },
     *           parentState?: string, answers?: Record<string, boolean>,
     *           parentInfo?: Record<string, any>, defaultAnswer?: boolean, preferredOption?: string,
     *           enrolledAt?: string,
     *           veteran?: { characterOfService?: string, discharged?: { month: string, year: string }, registeredToVote?: boolean } }} [data]
     *   veteran: answers for the veteran questions when they are shown (defaults: Honorable,
     *   May 2020, registered to vote = defaultAnswer)
     *   enrolledAt: school typed into "Where are you currently enrolled?" when it appears
     *   (default "Mesa Community College")
     *   defaultAnswer / preferredOption: how the safety net answers anything left
     *   (default No and the first option)
     * @returns {Promise<string[]>} ids filled by the safety net
     */
    async fillResidencyInformation(data = {}) {
        const isAz = data.isArizonaResident === true;
        await this.selectPermanentState(data.permanentState || (isAz ? 'Arizona' : 'California'));
        if (isAz) await this.answer('livedInAz12Months', true);
        await this.setFinancialSupport(data.support || { parent: 100 });
        if ((data.support?.parent ?? 100) > 0) {
            await this.choose(this.selectors.parentState, data.parentState || (isAz ? 'Arizona' : 'California'));
            if ((data.parentState || (isAz ? 'Arizona' : 'California')) === 'Arizona') {
                await this.fillArizonaParentDetails(data.parentInfo || {});
            }
        }
        for (const [key, yes] of Object.entries(data.answers || {})) {
            if (await this.isQuestionVisible(key)) await this.answer(key, yes);
        }
        if (await this.isVeteranSectionShown()) {
            await this.fillVeteranDetails({ registeredToVote: data.defaultAnswer === true, ...(data.veteran || {}) });
        }
        const enrolledAt = this.page.locator(this.selectors.currentlyEnrolledAt);
        if (await enrolledAt.isVisible().catch(() => false) && !(await enrolledAt.inputValue())) {
            await enrolledAt.fill(data.enrolledAt || 'Mesa Community College');
        }
        return this.answerRemainingQuestions(6, { answer: data.defaultAnswer === true, preferredOption: data.preferredOption });
    }

    /**
     * Arizona resident with every answer Yes: permanent home and parents' state Arizona,
     * every question (including follow-ups they reveal) Yes, and Arizona in any dropdown
     * that offers it (license state, tax state, ...). Parent support 100%.
     * @returns {Promise<string[]>} ids filled by the safety net
     */
    async fillArizonaResidentAllYes() {
        return this.fillResidencyInformation({
            isArizonaResident: true,
            permanentState: 'Arizona',
            parentState: 'Arizona',
            parentInfo: { relationship: 'Both', filedTaxes: true, taxState: 'Arizona', hasAzLicense: true, employedInAz: true },
            answers: Object.fromEntries(Object.keys(QUESTIONS).map((key) => [key, true])),
            defaultAnswer: true,
            preferredOption: 'Arizona',
        });
    }

    /**
     * Flow-spec name for an out-of-state applicant.
     * @param {{ parentInfo?: Record<string, any> }} [data]
     * @returns {Promise<string[]>}
     */
    async fillOutOfStateResidency(data = {}) {
        return this.fillResidencyInformation({ isArizonaResident: false, parentInfo: data.parentInfo });
    }

    // ------------------------------------------------------------------ footer

    /**
     * @param {string} [expectedMessage]
     * @returns {Promise<void>}
     */
    async verifyErrorMessage(expectedMessage = 'This is a required field.') {
        await expect(this.page.getByText(expectedMessage).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/arizona-residency/);
    }

    /**
     * @returns {Promise<void>}
     */
    async clickContinue() {
        await this.page.locator(this.selectors.continueButton).click();
    }

    /**
     * Continue to step 6, Review.
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.clickContinue();
        await this.page.waitForURL(/\/ug-app\/\d+\/review/, { timeout: this.navigationTimeout });
    }
}

module.exports = AZResidencyPage;
