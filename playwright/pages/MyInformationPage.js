// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for step 1 of the application wizard: "My information"
 * (/ug-app/<applicationId>/my-information).
 *
 * Rebuilt against the live page on 2026-11-10. Name, birthday, email and phone are no
 * longer on this step (they're collected on the pre-app dashboard and edited in
 * Profile). The step has these sections:
 *   Former or alternate name(s)  - optional, inline "Add a former name" form
 *   Legal sex                    - required radio group
 *   Primary language at home     - required dropdown
 *   Home address                 - required: country dropdown, then line 1, city, state, ZIP
 *   Ethnic/racial background     - optional Hispanic/Latino radios + race multi-select
 *   U.S. citizenship             - required; "citizen" adds country of birth + SSN,
 *                                  "not a citizen" adds visa type
 *   Parent or legal guardian     - optional inline form with its own Save
 *   Previous ASU affiliation     - required, at least one checkbox
 *   U.S. Uniformed Services      - required dropdown
 *   Education benefits           - required Yes/No; Yes adds a benefit-provider dropdown
 *
 * Dropdowns are custom comboboxes: clicking opens a list with a "Search..." box, and
 * options are role=option. Stable ids (group_*) are used where the app provides them.
 *
 * Social Security Number: required when "I am a U.S. citizen" is chosen. This page
 * object deliberately never fills it; see selectCitizenshipStatus().
 */
class MyInformationPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My information"][level=1]',

            // Former names (inline form)
            addFormerNameBtn: 'role=button[name="Add a former name"]',
            saveFormerNameBtn: 'role=button[name="save name"]',
            cancelFormerNameBtn: 'role=button[name="Cancel editing former name"]',

            // Legal sex
            legalSexGroup: '[data-cy="my-info-legal-sex-group"]',

            // Dropdowns (custom comboboxes)
            primaryLanguage: '#group_primary_language_select',
            homeCountry: '#group_home_country',
            state: '#group_state_code',
            race: '#group_race',
            birthCountry: '#group_birth_country',
            citizenshipCountry: 'role=combobox[name=/Country or territory of citizenship/]',
            uniformedServices: '#group_us_uniformed_services',

            // Address text fields
            addressLine1: '#group_address_line_1',
            addressLine2: '#group_address_line_2',
            city: '#group_city',
            zipCode: '#group_zip_code',

            // Parent or legal guardian (inline form)
            guardianFirstName: '#guardian_first_input',
            guardianLastName: '#guardian_last_input',

            // Previous ASU affiliation checkboxes (by input name)
            affiliation: {
                undergradDegreeSeeking: 'input[name="affiliationASUCOMMDGS"]',
                nondegreeOrGraduate: 'input[name="affiliationASUCOMMNDG"]',
                globalLaunch: 'input[name="affiliationASUCOMGLLN"]',
                transferPathway: 'input[name="affiliationASUCOMGFA"]',
                employee: 'input[name="affiliationASUCOMEMPL"]',
                summerProgram: 'input[name="affiliationASUCOMSUMM"]',
                other: 'input[name="affiliationASUCOMOTH"]',
                neverAffiliated: 'input[name="affiliationASUCOMNVR"]',
            },
            asuAffiliateId: '#group_asu_affiliate_id',

            // Footer: the form's submit button ("Continue" / "Save and Continue")
            continueButton: 'button[type="submit"][form="page-form"]',
            helpButton: 'role=button[name=/^(Need )?Help$/]',

            // Validation
            requiredFieldError: 'text=This is a required field.',
        };

        /** Uniformed-services answer that means "no affiliation". */
        this.NO_UNIFORMED_SERVICES = 'None of these options apply to me';
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open step 1 of the signed-in user's application.
     * @returns {Promise<void>}
     */
    async navigateToMyInformation() {
        await this.gotoApplicationStep('my-information');
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/my-information/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Pick an option from one of the page's custom dropdowns. Types into the list's
     * "Search..." box when present (long lists like language and country).
     * @param {string} comboboxSelector
     * @param {string} optionText - exact option label
     * @returns {Promise<void>}
     */
    async chooseFromDropdown(comboboxSelector, optionText) {
        const combobox = this.page.locator(comboboxSelector);
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click();
        const search = this.page.getByPlaceholder('Search...');
        if (await search.isVisible().catch(() => false)) {
            await search.fill(optionText);
        }
        await this.page.getByRole('option', { name: optionText, exact: true }).first().click();
    }

    /**
     * Pick the first option of a dropdown (used when the test doesn't care which).
     * @param {string} comboboxSelector
     * @returns {Promise<string>} the chosen option's label
     */
    async chooseFirstDropdownOption(comboboxSelector) {
        const combobox = this.page.locator(comboboxSelector);
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click();
        const first = this.page.getByRole('option').first();
        const label = (await first.innerText()).trim();
        await first.click();
        return label;
    }

    /**
     * Click Yes or No in a named radio group.
     * @param {string} groupName
     * @param {boolean} yes
     */
    async answerYesNo(groupName, yes) {
        await this.page.getByRole('radiogroup', { name: groupName })
            .getByRole('radio', { name: yes ? 'Yes' : 'No', exact: true }).click();
    }

    /**
     * Normalise 'Yes'/'No'/true/false test data to a boolean.
     * @param {string|boolean|undefined} value
     * @returns {boolean|undefined}
     */
    static toBool(value) {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'boolean') return value;
        return /^(y|yes|true)$/i.test(String(value).trim());
    }

    // ------------------------------------------------------------------ sections

    /**
     * Add a former or alternate name.
     * @param {{ firstName: string, lastName: string } | string} name - object, or "First Last"
     * @returns {Promise<void>}
     */
    async addFormerName(name) {
        const { firstName, lastName } = typeof name === 'string'
            ? { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') || name }
            : name;
        await this.page.locator(this.selectors.addFormerNameBtn).click();
        const form = this.page.locator(this.selectors.saveFormerNameBtn).locator('xpath=ancestor::*[.//input][1]');
        await form.getByRole('textbox', { name: 'First name' }).fill(firstName);
        await form.getByRole('textbox', { name: 'Last name' }).fill(lastName);
        await this.page.locator(this.selectors.saveFormerNameBtn).click();
    }

    /**
     * Row for a saved former name in the "Former or Alternate Names" table.
     * @param {string} fullName - "First Last" as entered
     * @returns {import('@playwright/test').Locator}
     */
    formerNameRow(fullName) {
        // Each value cell's accessible name is its column label ("Former name"), so
        // match on the cell's text instead.
        const escaped = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.page.getByRole('cell', { name: 'Former name', exact: true })
            .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
    }

    /**
     * Waits briefly for the saved name to appear in the table.
     * @param {string} fullName - "First Last" as entered
     * @param {number} [timeoutMs]
     * @returns {Promise<boolean>}
     */
    async isFormerNameDisplayed(fullName, timeoutMs = this.assertionTimeout) {
        return this.formerNameRow(fullName)
            .waitFor({ state: 'visible', timeout: timeoutMs })
            .then(() => true).catch(() => false);
    }

    /**
     * Edit a saved former name via its row's "Edit" link.
     * @param {string} currentFullName
     * @param {{ firstName: string, lastName: string }} newName
     * @returns {Promise<void>}
     */
    async editFormerName(currentFullName, { firstName, lastName }) {
        await this.page.getByRole('link', { name: `Edit former name for ${currentFullName}` }).click();
        const form = this.page.locator(this.selectors.saveFormerNameBtn).locator('xpath=ancestor::*[.//input][1]');
        await form.getByRole('textbox', { name: 'First name' }).fill(firstName);
        await form.getByRole('textbox', { name: 'Last name' }).fill(lastName);
        await this.page.locator(this.selectors.saveFormerNameBtn).click();
    }

    /**
     * Delete a saved former name via its row's "Delete" link, confirming if asked.
     * @param {string} fullName
     * @returns {Promise<void>}
     */
    async deleteFormerName(fullName) {
        await this.page.getByRole('link', { name: `Delete former name for ${fullName}` }).click();
        const confirm = this.page.getByRole('dialog').getByRole('button', { name: /^(delete|remove|yes|confirm)/i });
        if (await confirm.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await confirm.first().click();
        }
        await this.formerNameRow(fullName).waitFor({ state: 'detached', timeout: this.assertionTimeout });
    }

    /**
     * @param {'Male'|'Female'|'X or another legal sex'|string} sex
     */
    async selectLegalSex(sex) {
        const label = /^x/i.test(sex) ? 'X or another legal sex' : sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
        await this.page.locator(this.selectors.legalSexGroup).getByRole('radio', { name: label, exact: true }).click();
    }

    /**
     * @param {string} language - e.g. "English"
     */
    async selectPrimaryLanguage(language) {
        await this.chooseFromDropdown(this.selectors.primaryLanguage, language);
    }

    /**
     * Fill the home address. Accepts both {line1, zipCode} and the flow specs'
     * {street, zip} spellings.
     * @param {{ country?: string, line1?: string, street?: string, line2?: string,
     *           city: string, state: string, zipCode?: string, zip?: string }} address
     * @returns {Promise<void>}
     */
    async fillAddressInformation(address) {
        const country = address.country || 'United States';
        await this.chooseFromDropdown(this.selectors.homeCountry, country);
        await this.page.locator(this.selectors.addressLine1).fill(address.line1 || address.street || '');
        if (address.line2) await this.page.locator(this.selectors.addressLine2).fill(address.line2);
        await this.page.locator(this.selectors.city).fill(address.city);
        await this.chooseFromDropdown(this.selectors.state, address.state);
        await this.page.locator(this.selectors.zipCode).fill(address.zipCode || address.zip || '');
    }

    /**
     * Optional ethnicity questions.
     * @param {{ hispanicLatino?: string|boolean, races?: string[],
     *           raceOrigins?: Record<string, string>, primaryRace?: string }} data
     *   races use the dropdown's labels, e.g. "Asian", "White". raceOrigins: answer for a
     *   race's "Select <race> origin" follow-up (first option when omitted). primaryRace:
     *   which chosen race is primary when there are 2+, by its label in that list (an origin
     *   such as "Asian Indian" for races that have one); defaults to the first race.
     * @returns {Promise<{ raceOrigins: Record<string, string>, primaryRace: string|undefined }>}
     */
    async selectEthnicityAndRace({ hispanicLatino, races = [], raceOrigins = {}, primaryRace }) {
        const hispanic = MyInformationPage.toBool(hispanicLatino);
        if (hispanic !== undefined) await this.answerYesNo('Are you Hispanic/Latino? (Optional)', hispanic);
        /** @type {Record<string, string>} */
        const origins = {};
        let primary;
        if (races.length) {
            await this.page.locator(this.selectors.race).click();
            for (const race of races) {
                await this.page.getByRole('option', { name: race, exact: true }).click();
            }
            await this.page.keyboard.press('Escape');

            // Follow-ups the choice reveals (both required once shown):
            //  - "Select <race> origin" for some races (e.g. Asian)
            //  - with 2+ races, which one the applicant considers primary
            for (const race of races) {
                const escaped = race.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const origin = this.page.getByRole('combobox', { name: new RegExp(`^Select ${escaped} origin`) });
                if (await origin.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
                    origins[race] = await this.pickFromDropdown(origin, raceOrigins[race]);
                }
            }
            if (races.length > 1) {
                const primaryBox = this.page.getByRole('combobox', { name: /^Please select one of the chosen ethnicities/ });
                if (await primaryBox.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
                    // Its options name a race's origin when it has one ("Asian Indian", not "Asian").
                    primary = await this.pickFromDropdown(primaryBox, primaryRace || origins[races[0]] || races[0]);
                }
            }
        }
        return { raceOrigins: origins, primaryRace: primary };
    }

    /**
     * Open a dropdown given as a locator and pick an option (exact label), or the first one.
     * @param {import('@playwright/test').Locator} combobox
     * @param {string} [optionText]
     * @returns {Promise<string>} the chosen option's label
     */
    async pickFromDropdown(combobox, optionText) {
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click();
        const option = optionText
            ? this.page.getByRole('option', { name: optionText, exact: true }).first()
            : this.page.getByRole('option').first();
        const label = (await option.innerText()).trim();
        await option.click();
        return label;
    }

    /**
     * Answer U.S. citizenship.
     *
     * Citizen: also sets country of birth. The app then REQUIRES a Social Security
     * Number (SSN + confirm). The SSN is filled ONLY from the TEST_SSN environment
     * variable (or an explicit `ssn`), which the tester sets themselves for test data,
     * e.g. TEST_SSN=111111111 for the duplicate-application check. It is never
     * hard-coded; with no value the boxes are left empty and the step can't complete.
     *
     * Not a citizen: sets the visa type (first option if none given). The visa then
     * reveals two required dropdowns, country of citizenship and country of birth, plus
     * an optional "Social Security Number (if applicable)" that is left empty.
     *
     * @param {{ isUsCitizen: boolean|string, countryOfBirth?: string,
     *           countryOfCitizenship?: string, visaType?: string, ssn?: string }} data
     * @returns {Promise<{ visaType?: string, ssnFilled?: boolean }>}
     */
    async selectCitizenshipStatus({ isUsCitizen, countryOfBirth, countryOfCitizenship = 'Canada', visaType, ssn = process.env.TEST_SSN }) {
        const citizen = MyInformationPage.toBool(isUsCitizen);
        if (citizen) {
            await this.page.getByRole('radio', { name: 'I am a U.S. citizen', exact: true }).click();
            await this.chooseFromDropdown(this.selectors.birthCountry, countryOfBirth || 'United States');
            const digits = (ssn || '').replace(/\D/g, '');
            if (!digits) {
                this.logger.warn('U.S. citizen selected: no TEST_SSN set, so the required SSN is left empty');
                return { ssnFilled: false };
            }
            await this.fillSocialSecurityNumber(digits);
            return { ssnFilled: true };
        }
        await this.page.getByRole('radio', { name: 'I am not a U.S. citizen', exact: true }).click();
        const visa = this.page.getByRole('combobox', { name: 'What type of visa will you be holding?' });
        await visa.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        await visa.click();
        const option = visaType
            ? this.page.getByRole('option', { name: visaType, exact: true })
            : this.page.getByRole('option').first();
        const chosen = (await option.innerText()).trim();
        await option.click();

        // Fields revealed by the visa choice.
        const citizenshipCountry = this.page.getByRole('combobox', { name: /Country or territory of citizenship/ });
        if (await citizenshipCountry.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
            await this.chooseFromDropdown(this.selectors.citizenshipCountry, countryOfCitizenship);
        }
        if (await this.page.locator(this.selectors.birthCountry).isVisible().catch(() => false)) {
            await this.chooseFromDropdown(this.selectors.birthCountry, countryOfBirth || countryOfCitizenship);
        }
        return { visaType: chosen };
    }

    /**
     * Type a tester-provided test SSN into both boxes (SSN and confirm). Both inputs
     * share the id social_security_number. Values come from TEST_SSN; see
     * selectCitizenshipStatus(). The boxes format as XXX-XX-XXXX, so digits are typed.
     * @param {string} digits - 9 digits, e.g. "111111111"
     * @returns {Promise<void>}
     */
    async fillSocialSecurityNumber(digits) {
        if (!/^\d{9}$/.test(digits)) throw new Error('TEST_SSN must be 9 digits');
        const boxes = this.page.locator('input#social_security_number');
        await boxes.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        for (let i = 0; i < await boxes.count(); i++) {
            const box = boxes.nth(i);
            await box.click();
            await box.press('Control+A');
            await box.press('Backspace');
            await box.pressSequentially(digits, { delay: 40 });
        }
        await boxes.last().blur();
    }

    /**
     * Optional parent or legal guardian, saved with the section's own Save button.
     * Once "Is this person living?" is answered the section also requires Relation,
     * Highest level of schooling completed, and "Did this guardian attend ASU?"
     * (email and phone stay optional). Dropdowns default to their first option.
     * @param {{ firstName: string, lastName: string, isLiving?: boolean|string,
     *           relation?: string, schooling?: string, attendedAsu?: boolean|string }} parent
     * @returns {Promise<{ relation: string, schooling: string }>} the dropdown values used
     */
    async addParentInformation({ firstName, lastName, isLiving = true, relation, schooling, attendedAsu = false }) {
        // The form is open by default; once a guardian is saved it is behind "Add additional parent or guardian".
        const first = this.page.locator(this.selectors.guardianFirstName);
        if (!(await first.isVisible().catch(() => false))) {
            await this.page.getByRole('button', { name: 'Add additional parent or guardian' }).click();
        }
        await first.fill(firstName);
        await this.page.locator(this.selectors.guardianLastName).fill(lastName);
        await this.answerYesNo('Is this person living?', MyInformationPage.toBool(isLiving) !== false);

        const pick = async (/** @type {RegExp} */ name, /** @type {string|undefined} */ value) => {
            const box = this.page.getByRole('combobox', { name });
            await box.waitFor({ state: 'visible', timeout: this.assertionTimeout });
            await box.click();
            const option = value
                ? this.page.getByRole('option', { name: value, exact: true })
                : this.page.getByRole('option').first();
            const chosen = (await option.innerText()).trim();
            await option.click();
            return chosen;
        };
        const usedRelation = await pick(/^Relation/, relation);
        const usedSchooling = await pick(/^Highest level of schooling completed/, schooling);
        await this.page.getByRole('radiogroup', { name: /Did this guardian attend ASU\?/ })
            .getByRole('radio', { name: MyInformationPage.toBool(attendedAsu) ? 'Yes' : 'No', exact: true }).click();

        const section = this.page.locator(this.selectors.guardianFirstName).locator('xpath=ancestor::*[.//button[normalize-space()="Save"]][1]');
        await section.getByRole('button', { name: 'Save', exact: true }).click();
        return { relation: usedRelation, schooling: usedSchooling };
    }

    /**
     * Previous ASU affiliation. Defaults to "never affiliated".
     * @param {{ affiliations?: Array<keyof MyInformationPage['selectors']['affiliation']>, affiliateId?: string }} [data]
     */
    async addAsuAffiliateInfo({ affiliations = ['neverAffiliated'], affiliateId } = {}) {
        for (const key of affiliations) {
            // The native input is visually hidden behind a styled box; click its label.
            const box = this.page.locator(this.selectors.affiliation[key]);
            if (await box.isChecked()) continue;
            const id = await box.getAttribute('id');
            await this.page.locator(`label[for="${id}"]`).click();
            await expect(box).toBeChecked({ timeout: this.assertionTimeout });
        }
        if (affiliateId) await this.page.locator(this.selectors.asuAffiliateId).fill(affiliateId);
    }

    /**
     * Affiliation to U.S. Uniformed Services (required).
     * @param {string} [option] - defaults to "None of these options apply to me"
     */
    async selectMilitaryAffiliation(option = this.NO_UNIFORMED_SERVICES) {
        await this.chooseFromDropdown(this.selectors.uniformedServices, option);
    }

    /**
     * Education benefits from a partnered employer/organisation (required Yes/No).
     * @param {{ usesBenefits: boolean, provider?: string }} data - provider: exact label,
     *   or the first listed provider when omitted.
     * @returns {Promise<string|undefined>} provider chosen, if any
     */
    async applyPartnerBenefits({ usesBenefits, provider }) {
        await this.answerYesNo('Education benefits', usesBenefits);
        if (!usesBenefits) return undefined;
        const providerBox = this.page.getByRole('combobox', { name: /Select your benefit provider/ });
        await providerBox.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        await providerBox.click();
        const option = provider
            ? this.page.getByRole('option', { name: provider, exact: true })
            : this.page.getByRole('option').first();
        const chosen = (await option.innerText()).trim();
        await option.click();
        return chosen;
    }

    /**
     * Answer education benefits at random (No, or Yes with the first provider).
     * @returns {Promise<string|undefined>}
     */
    async applyRandomPartnerBenefits() {
        return this.applyPartnerBenefits({ usesBenefits: Math.random() < 0.5 });
    }

    /**
     * Fill the step from flow-spec test data. Keys match the TC_17–TC_27 testData:
     * legalSex, primaryLanguage, address, hispanicLatino, races, usCitizenship,
     * countryOfBirth, visaType, militaryStatus, partnerBenefits.hasPartnerBenefits.
     * Sections whose key is absent are left alone.
     * @param {Record<string, any>} data
     * @returns {Promise<void>}
     */
    async fillPersonalInformation(data) {
        if (data.legalSex) await this.selectLegalSex(data.legalSex);
        if (data.primaryLanguage) await this.selectPrimaryLanguage(data.primaryLanguage);
        if (data.address) await this.fillAddressInformation(data.address);
        if (data.hispanicLatino !== undefined || data.races) {
            await this.selectEthnicityAndRace({ hispanicLatino: data.hispanicLatino, races: data.races || [] });
        }
        if (data.usCitizenship !== undefined) {
            await this.selectCitizenshipStatus({
                isUsCitizen: data.usCitizenship,
                countryOfBirth: data.countryOfBirth,
                visaType: data.visaType,
            });
        }
        if (data.militaryStatus !== undefined) {
            const none = !data.militaryStatus || /^none$/i.test(String(data.militaryStatus));
            await this.selectMilitaryAffiliation(none ? this.NO_UNIFORMED_SERVICES : data.militaryStatus);
        }
        if (data.partnerBenefits && data.partnerBenefits.hasPartnerBenefits !== undefined) {
            await this.applyPartnerBenefits({ usesBenefits: !!data.partnerBenefits.hasPartnerBenefits, provider: data.partnerBenefits.provider });
        }
    }

    /**
     * Fill every required field with valid defaults (non-citizen path, so no SSN is
     * needed). Pass overrides to change any section.
     * @param {Record<string, any>} [overrides]
     * @returns {Promise<void>}
     */
    async completeRequiredFields(overrides = {}) {
        const data = {
            legalSex: 'Female',
            primaryLanguage: 'English',
            address: { country: 'United States', line1: '1151 S Forest Ave', city: 'Tempe', state: 'Arizona', zip: '85281' },
            usCitizenship: 'No',
            militaryStatus: 'None',
            partnerBenefits: { hasPartnerBenefits: false },
            ...overrides,
        };
        await this.fillPersonalInformation(data);
        await this.addAsuAffiliateInfo(overrides.asuAffiliate || {});
    }

    /**
     * Fill EVERY field on the step, optional ones included, in page order: a former name,
     * legal sex, language, full home address (with line 2), Hispanic/Latino and races,
     * non-citizen path (visa, citizenship and birth countries; the optional SSN stays
     * empty), a parent/guardian (saved), ASU affiliation with an affiliate ID, uniformed
     * services, and education benefits "Yes" with a provider.
     * @param {Partial<typeof MyInformationPage.ALL_FIELDS>} [overrides]
     * @returns {Promise<typeof MyInformationPage.ALL_FIELDS & { visaType: string, benefitProvider: string,
     *           raceOrigins: Record<string, string>, primaryRace: string|undefined }>}
     *   what was entered, including the dropdown values picked by default
     */
    async completeAllFields(overrides = {}) {
        const d = { ...MyInformationPage.ALL_FIELDS, ...overrides };
        await this.addFormerName(d.formerName);
        await this.selectLegalSex(d.legalSex);
        await this.selectPrimaryLanguage(d.primaryLanguage);
        await this.fillAddressInformation(d.address);
        const { raceOrigins, primaryRace } = await this.selectEthnicityAndRace({ hispanicLatino: d.hispanicLatino, races: d.races });
        const { visaType } = await this.selectCitizenshipStatus({
            isUsCitizen: false, visaType: d.visaType || undefined,
            countryOfCitizenship: d.countryOfCitizenship, countryOfBirth: d.countryOfBirth,
        });
        const guardian = await this.addParentInformation(d.guardian);
        const never = this.page.locator(this.selectors.affiliation.neverAffiliated);
        if (!d.asuAffiliate.affiliations.includes('neverAffiliated') && await never.isChecked()) {
            await this.page.locator(`label[for="${await never.getAttribute('id')}"]`).click();
        }
        await this.addAsuAffiliateInfo(d.asuAffiliate);
        await this.selectMilitaryAffiliation(d.militaryStatus);
        const benefitProvider = await this.applyPartnerBenefits({ usesBenefits: true, provider: d.benefitProvider || undefined });
        return {
            ...d,
            raceOrigins,
            primaryRace,
            guardian: { ...d.guardian, ...guardian },
            visaType: /** @type {string} */ (visaType),
            benefitProvider: /** @type {string} */ (benefitProvider),
        };
    }

    // ------------------------------------------------------------------ footer

    /**
     * Click Continue ("Save and Continue") and wait for step 2, My program.
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.page.locator(this.selectors.continueButton).click();
        await this.page.waitForURL(/\/ug-app\/\d+\/my-program/, { timeout: this.navigationTimeout });
    }

    /**
     * Click Continue without expecting to leave (e.g. to trigger validation).
     * @returns {Promise<void>}
     */
    async clickContinue() {
        await this.page.locator(this.selectors.continueButton).click();
    }

    /**
     * @returns {Promise<number>} how many "This is a required field." messages are shown
     */
    async getRequiredFieldErrorCount() {
        return this.page.locator(this.selectors.requiredFieldError).count();
    }

    /**
     * Continue on an incomplete form: the step must stay put and flag required fields.
     * @returns {Promise<void>}
     */
    async verifyRequiredFieldValidation() {
        await this.clickContinue();
        await expect(this.page.locator(this.selectors.requiredFieldError).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/my-information/);
    }

    /**
     * The floating Help button opens help content.
     * @returns {Promise<void>}
     */
    async validateFloatingHelp() {
        const help = this.page.locator(this.selectors.helpButton).first();
        await expect(help).toBeVisible();
        await help.click();
        await expect(this.page.getByRole('dialog').or(this.page.getByRole('complementary')).first())
            .toBeVisible({ timeout: this.assertionTimeout });
        await this.page.keyboard.press('Escape');
    }
}

/**
 * Default answers for completeAllFields(): one value for every field on the step.
 * visaType / benefitProvider left empty mean "first option in the list".
 */
MyInformationPage.ALL_FIELDS = {
    formerName: { firstName: 'Qa', lastName: 'Formername' },
    legalSex: 'Female',
    primaryLanguage: 'English',
    address: { country: 'United States', line1: '1151 S Forest Ave', line2: 'Apt 101', city: 'Tempe', state: 'Arizona', zip: '85281' },
    hispanicLatino: 'No',
    races: ['Asian', 'White'],
    visaType: '',
    countryOfCitizenship: 'Canada',
    countryOfBirth: 'Canada',
    guardian: { firstName: 'Pat', lastName: 'Guardian', isLiving: true, attendedAsu: false },
    asuAffiliate: {
        /** @type {Array<'undergradDegreeSeeking'|'nondegreeOrGraduate'|'globalLaunch'|'transferPathway'|'employee'|'summerProgram'|'other'|'neverAffiliated'>} */
        affiliations: ['summerProgram'],
        affiliateId: '1234567890',
    },
    militaryStatus: 'None of these options apply to me',
    benefitProvider: '',
};

module.exports = MyInformationPage;
