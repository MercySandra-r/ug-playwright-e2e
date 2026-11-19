// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');
const { syntheticSsn } = require('../utils/syntheticSsn');

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
 *   Ethnic/racial background     - optional Hispanic/Latino radios + race multi-select;
 *                                  some races add an origin dropdown, 2+ races add "primary"
 *   U.S. citizenship             - required; "citizen" adds country of birth + SSN,
 *                                  "not a citizen" adds visa type and countries
 *   Parent or legal guardian     - optional inline form with its own Save
 *   Previous ASU affiliation     - required, at least one checkbox
 *   U.S. Uniformed Services      - required dropdown
 *   Education benefits           - required Yes/No; Yes adds a benefit-provider dropdown
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (an option by label, a race's origin
 * dropdown, a saved row's links) come from the locator methods below. Specs use these
 * names and the read-back method readFormValues(), never their own locators.
 *
 * Dropdowns are custom comboboxes: clicking opens a list with a "Search..." box, and
 * options are role=option. Stable ids (group_*) are used where the app provides them.
 *
 * Social Security Number: required when "I am a U.S. citizen" is chosen. By default a
 * made-up number from a never-issued range is typed (utils/syntheticSsn.js), new for each
 * applicant; a spec can pass its own, as the duplicate-application check does with TEST_SSN.
 * See selectCitizenshipStatus().
 */
class MyInformationPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My information"][level=1]',

            // Section headings
            formerNamesHeading: 'role=heading[name=/^Former or alternate name\\(s\\)/]',
            ethnicityHeading: 'role=heading[name=/^Ethnic\\/racial background/]',
            guardianHeading: 'role=heading[name=/^Parent or legal guardian/]',
            affiliationHeading: 'role=heading[name=/^Previous ASU affiliation/]',

            // Former names (inline form + saved table)
            addFormerNameBtn: 'role=button[name="Add a former name"]',
            saveFormerNameBtn: 'role=button[name="save name"]',
            cancelFormerNameBtn: 'role=button[name="Cancel editing former name"]',
            formerNameCell: 'role=cell[name="Former name"s]',
            nameFormFirstName: 'role=textbox[name="First name"s]',
            nameFormLastName: 'role=textbox[name="Last name"s]',
            confirmDeleteBtn: 'role=dialog >> role=button[name=/^(delete|remove|yes|confirm)/i]',
            // Shown (and "Add a former name" disabled) once 10 former names are saved.
            formerNameLimitMessage: 'text=Reached maximum limit',

            // Legal sex
            legalSexGroup: '[data-cy="my-info-legal-sex-group"]',

            // Dropdowns (custom comboboxes) and their shared parts
            primaryLanguage: '#group_primary_language_select',
            homeCountry: '#group_home_country',
            state: '#group_state_code',
            race: '#group_race',
            primaryRace: 'role=combobox[name=/^Please select one of the chosen ethnicities/]',
            birthCountry: '#group_birth_country',
            citizenshipCountry: 'role=combobox[name=/Country or territory of citizenship/]',
            visaType: 'role=combobox[name="What type of visa will you be holding?"]',
            // Student (F-1) and Exchange Visitor (J-1): required Yes/No (verified 2026-11-19).
            studentVisaInUsGroup: 'role=radiogroup[name=/currently in the United States on any kind of Student Visa/]',
            uniformedServices: '#group_us_uniformed_services',
            // Uniformed-services follow-ups (which ones show depends on the option chosen)
            serviceStatusGroup: 'role=radiogroup[name=/^Choose the status that best applies to you/]',
            serviceBranch: '#group_service_branch',
            serviceBranchLabel: 'label[for="group_service_branch"]',
            vaBenefitsGroup: 'role=radiogroup[name=/^I have applied or plan to apply for Department of Veterans Affairs educational benefits/]',
            jstAuthorizeGroup: 'role=radiogroup[name=/^I authorize Arizona State University to request my Joint Service Transcript/]',
            dropdownSearch: 'input[placeholder="Search..."]',
            option: 'role=option',

            // Address text fields; contact details live in Profile
            addressLine1: '#group_address_line_1',
            addressLine2: '#group_address_line_2',
            city: '#group_city',
            zipCode: '#group_zip_code',
            contactInfoNote: 'text=Phone numbers and SMS preferences',
            profileLink: 'role=link[name="profile"s]',

            // Ethnicity
            hispanicGroup: 'role=radiogroup[name="Are you Hispanic/Latino? (Optional)"]',

            // Citizenship
            citizenshipGroup: 'role=radiogroup[name="U.S. citizenship"]',
            usCitizenRadio: 'role=radio[name="I am a U.S. citizen"s]',
            nonCitizenRadio: 'role=radio[name="I am not a U.S. citizen"s]',
            ssnHeading: 'role=heading[name=/^Social Security Number/]',
            ssnOptionalLabel: 'text=Social Security Number (if applicable)',
            ssnInputs: 'input#social_security_number',

            // Parent or legal guardian (inline form + saved table)
            guardianFirstName: '#guardian_first_input',
            guardianLastName: '#guardian_last_input',
            addGuardianBtn: 'role=button[name="Add additional parent or guardian"]',
            guardianLivingGroup: 'role=radiogroup[name="Is this person living?"]',
            guardianRelation: 'role=combobox[name=/^Relation/]',
            guardianSchooling: 'role=combobox[name=/^Highest level of schooling completed/]',
            guardianAttendedAsuGroup: 'role=radiogroup[name=/Did this guardian attend ASU\\?/]',
            guardianForm: 'xpath=ancestor::*[.//button[normalize-space()="Save"]][1]',
            guardianSaveBtn: 'role=button[name="Save"s]',
            guardianNameCell: 'role=cell[name="Guardian name"s]',
            guardianEmail: 'role=textbox[name="Email address (Optional)"]',
            guardianPhone: 'role=textbox[name="Phone number (Optional)"]',

            // BriteVerify "Information Verification Required" dialog (after Continue)
            verifyDialog: 'role=alertdialog',
            verifyRows: 'role=row',
            verifyRowHeader: 'role=rowheader',
            verifyCell: 'role=cell',
            verifyGoBackButton: 'role=button[name="Go back and change"]',
            verifySubmitButton: 'role=button[name="Submit"s]',

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

            // Education benefits
            educationBenefitsGroup: 'role=radiogroup[name="Education benefits"]',
            benefitProvider: 'role=combobox[name=/Select your benefit provider/]',
            // Starbucks only (verified 2026-11-19): required, under the College Achievement Plan note.
            earnedBachelorGroup: 'role=radiogroup[name=/Have you earned a bachelor.s degree or higher/]',
            starbucksPartnerTypeGroup: 'role=radiogroup[name=/Are you a Starbucks partner or a family member of a partner/]',
            starbucksPartnerNumber: 'role=textbox[name="Enter your Starbucks partner number"]',
            starbucksPartnerVerified: 'text=Partner number verified',
            followingButton: 'xpath=following::button[1]',
            // Shown once the partner number is verified: SCAP terms + FERPA consent, and the
            // manager disclosure (Accept / Decline).
            scapAcceptCheckbox: 'role=checkbox[name="I accept"]',
            managerDisclosureHeading: 'role=heading[name="Manager disclosure"]',

            // Footer and help
            continueButton: 'button[type="submit"][form="page-form"]',
            helpButton: 'role=button[name=/^(Need )?Help$/]',
            helpDialog: 'role=dialog',
            helpPanel: 'role=complementary',

            // Validation
            requiredFieldError: 'text=This is a required field.',
        };

        /** Uniformed-services answer that means "no affiliation". */
        this.NO_UNIFORMED_SERVICES = 'None of these options apply to me';
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * An open dropdown's option by exact label (or the first option when none given).
     * @param {string} [label]
     * @returns {import('@playwright/test').Locator}
     */
    option(label) {
        return label
            ? this.page.getByRole('option', { name: label, exact: true }).first()
            : this.page.locator(this.selectors.option).first();
    }

    /**
     * A radio inside one of the page's radio groups.
     * @param {string} groupSelector - e.g. this.selectors.hispanicGroup
     * @param {string} label - e.g. "Yes"
     * @returns {import('@playwright/test').Locator}
     */
    radioIn(groupSelector, label) {
        return this.page.locator(groupSelector).getByRole('radio', { name: label, exact: true });
    }

    /**
     * The "Select <race> origin" dropdown some races reveal (e.g. Asian).
     * @param {string} race
     * @returns {import('@playwright/test').Locator}
     */
    raceOriginDropdown(race) {
        const escaped = race.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.page.getByRole('combobox', { name: new RegExp(`^Select ${escaped} origin`) });
    }

    /**
     * The visible label of an affiliation checkbox (the native input is hidden behind it).
     * @param {keyof MyInformationPage['selectors']['affiliation']} key
     * @returns {Promise<import('@playwright/test').Locator>}
     */
    async affiliationLabel(key) {
        const id = await this.page.locator(this.selectors.affiliation[key]).getAttribute('id');
        return this.page.locator(`label[for="${id}"]`);
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
        return this.page.locator(this.selectors.formerNameCell)
            .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
    }

    /**
     * The Edit or Delete link of a saved former name.
     * @param {'Edit'|'Delete'} action
     * @param {string} fullName
     * @returns {import('@playwright/test').Locator}
     */
    formerNameLink(action, fullName) {
        return this.page.getByRole('link', { name: `${action} former name for ${fullName}` });
    }

    /**
     * A saved guardian's Edit or Delete link.
     * @param {'Edit'|'Delete'} action
     * @param {string} fullName - "First Last"
     * @returns {import('@playwright/test').Locator}
     */
    guardianLink(action, fullName) {
        return this.page.getByRole('link', { name: `${action} guardian name for ${fullName}` });
    }

    /**
     * The BriteVerify dialog ("... could not be verified ...").
     * @returns {import('@playwright/test').Locator}
     */
    briteVerifyDialog() {
        return this.page.locator(this.selectors.verifyDialog).filter({ hasText: /could not be verified/i });
    }

    /**
     * The inline former-name form (around its Save button).
     * @returns {import('@playwright/test').Locator}
     */
    formerNameForm() {
        return this.page.locator(this.selectors.saveFormerNameBtn).locator('xpath=ancestor::*[.//input][1]');
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

    /**
     * Every section of the step is shown, plus the Continue button.
     * @returns {Promise<void>}
     */
    async verifyAllSectionsVisible() {
        const s = this.selectors;
        for (const selector of [s.heading, s.formerNamesHeading, s.legalSexGroup, s.primaryLanguage, s.homeCountry,
            s.ethnicityHeading, s.citizenshipGroup, s.guardianHeading, s.affiliationHeading, s.uniformedServices,
            s.educationBenefitsGroup, s.continueButton]) {
            await expect(this.page.locator(selector).first(), selector).toBeVisible({ timeout: this.assertionTimeout });
        }
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
        const search = this.page.locator(this.selectors.dropdownSearch);
        if (await search.isVisible().catch(() => false)) {
            await search.fill(optionText);
        }
        await this.option(optionText).click();
    }

    /**
     * Pick the first option of a dropdown (used when the test doesn't care which).
     * @param {string} comboboxSelector
     * @returns {Promise<string>} the chosen option's label
     */
    async chooseFirstDropdownOption(comboboxSelector) {
        return this.pickFromDropdown(this.page.locator(comboboxSelector));
    }

    /**
     * Open a dropdown given as a locator and pick an option (exact label), or the first one.
     * @param {import('@playwright/test').Locator} combobox
     * @param {string} [optionText]
     * @returns {Promise<string>} the chosen option's label
     */
    async pickFromDropdown(combobox, optionText) {
        await combobox.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click();
        const option = this.option(optionText);
        // An already-selected option shows a check mark on a second line ("Army\n✓").
        const label = (await option.innerText()).split('\n')[0].trim();
        await option.click();
        return label;
    }

    /**
     * Click Yes or No in one of the page's radio groups.
     * @param {string} groupSelector - e.g. this.selectors.educationBenefitsGroup
     * @param {boolean} yes
     */
    async answerYesNo(groupSelector, yes) {
        await this.radioIn(groupSelector, yes ? 'Yes' : 'No').click();
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
        await this.fillFormerNameForm(firstName, lastName);
    }

    /**
     * @param {string} firstName
     * @param {string} lastName
     * @returns {Promise<void>}
     */
    async fillFormerNameForm(firstName, lastName) {
        const form = this.formerNameForm();
        await form.locator(this.selectors.nameFormFirstName).fill(firstName);
        await form.locator(this.selectors.nameFormLastName).fill(lastName);
        await this.page.locator(this.selectors.saveFormerNameBtn).click();
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
     * Saved former names, in table order.
     * @returns {Promise<string[]>}
     */
    async getFormerNames() {
        return (await this.page.locator(this.selectors.formerNameCell).allInnerTexts()).map((t) => t.trim());
    }

    /**
     * Whether "Add a former name" can be clicked (it is disabled at the 10-name limit).
     * @returns {Promise<boolean>}
     */
    async canAddFormerName() {
        const add = this.page.locator(this.selectors.addFormerNameBtn);
        return (await add.isVisible().catch(() => false)) && add.isEnabled();
    }

    /**
     * At the limit: "Add a former name" is disabled and "Reached maximum limit" shows.
     * @returns {Promise<void>}
     */
    async verifyFormerNameLimitReached() {
        await expect(this.page.locator(this.selectors.addFormerNameBtn)).toBeDisabled({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.formerNameLimitMessage)).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * Edit a saved former name via its row's "Edit" link.
     * @param {string} currentFullName
     * @param {{ firstName: string, lastName: string }} newName
     * @returns {Promise<void>}
     */
    async editFormerName(currentFullName, { firstName, lastName }) {
        await this.formerNameLink('Edit', currentFullName).click();
        await this.fillFormerNameForm(firstName, lastName);
    }

    /**
     * Delete a saved former name via its row's "Delete" link, confirming if asked.
     * @param {string} fullName
     * @returns {Promise<void>}
     */
    async deleteFormerName(fullName) {
        await this.formerNameLink('Delete', fullName).click();
        const confirm = this.page.locator(this.selectors.confirmDeleteBtn).first();
        if (await confirm.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await confirm.click();
        }
        await this.formerNameRow(fullName).waitFor({ state: 'detached', timeout: this.assertionTimeout });
    }

    /**
     * @param {'Male'|'Female'|'X or another legal sex'|string} sex
     */
    async selectLegalSex(sex) {
        const label = /^x/i.test(sex) ? 'X or another legal sex' : sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
        await this.radioIn(this.selectors.legalSexGroup, label).click();
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
     * Choosing a home country reveals the note that phone and SMS settings live in Profile.
     * @param {string} [country]
     * @returns {Promise<void>}
     */
    async verifyContactInfoPointsToProfile(country = 'United States') {
        await this.chooseFromDropdown(this.selectors.homeCountry, country);
        await expect(this.page.locator(this.selectors.contactInfoNote).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.profileLink).last()).toHaveAttribute('href', '/profile');
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
        if (hispanic !== undefined) await this.answerYesNo(this.selectors.hispanicGroup, hispanic);
        /** @type {Record<string, string>} */
        const origins = {};
        let primary;
        if (races.length) {
            await this.page.locator(this.selectors.race).click();
            for (const race of races) await this.option(race).click();
            await this.page.keyboard.press('Escape');

            // Follow-ups the choice reveals (both required once shown):
            //  - "Select <race> origin" for some races (e.g. Asian)
            //  - with 2+ races, which one the applicant considers primary
            for (const race of races) {
                const origin = this.raceOriginDropdown(race);
                if (await origin.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
                    origins[race] = await this.pickFromDropdown(origin, raceOrigins[race]);
                }
            }
            if (races.length > 1) {
                const primaryBox = this.page.locator(this.selectors.primaryRace);
                if (await primaryBox.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
                    // Its options name a race's origin when it has one ("Asian Indian", not "Asian").
                    primary = await this.pickFromDropdown(primaryBox, primaryRace || origins[races[0]] || races[0]);
                }
            }
        }
        return { raceOrigins: origins, primaryRace: primary };
    }

    /**
     * Click "I am a U.S. citizen" or "I am not a U.S. citizen" only (no follow-up fields).
     * @param {boolean} isUsCitizen
     * @returns {Promise<void>}
     */
    async chooseCitizenship(isUsCitizen) {
        await this.page.locator(isUsCitizen ? this.selectors.usCitizenRadio : this.selectors.nonCitizenRadio).click();
    }

    /**
     * Answer U.S. citizenship.
     *
     * Citizen: also sets country of birth. The app then REQUIRES a Social Security
     * Number (SSN + confirm). With no `ssn` given, a made-up number from a never-issued
     * range is typed (utils/syntheticSsn.js), different for every applicant, so applicants
     * don't trip the duplicate-application check on each other. The duplicate-application
     * check itself passes `ssn: process.env.TEST_SSN`, which the tester sets. The number is
     * never hard-coded, logged or stored.
     *
     * Not a citizen: sets the visa type (first option if none given). The visa then
     * reveals two required dropdowns, country of citizenship and country of birth, plus
     * an optional "Social Security Number (if applicable)" that is left empty.
     *
     * Student (F-1) and Exchange Visitor (J-1) also ask "For the purposes of issuing an I-20
     * and obtaining a Student Visa, are you currently in the United States on any kind of
     * Student Visa?" (required), answered with `inUsOnStudentVisa` (default No).
     *
     * @param {{ isUsCitizen: boolean|string, countryOfBirth?: string,
     *           countryOfCitizenship?: string, visaType?: string, ssn?: string,
     *           inUsOnStudentVisa?: boolean }} data
     * @returns {Promise<{ visaType?: string, ssnFilled?: boolean }>}
     */
    async selectCitizenshipStatus({ isUsCitizen, countryOfBirth, countryOfCitizenship = 'Canada', visaType, ssn, inUsOnStudentVisa = false }) {
        const citizen = !!MyInformationPage.toBool(isUsCitizen);
        await this.chooseCitizenship(citizen);
        if (citizen) {
            await this.chooseFromDropdown(this.selectors.birthCountry, countryOfBirth || 'United States');
            const digits = (ssn || syntheticSsn()).replace(/\D/g, '');
            await this.fillSocialSecurityNumber(digits);
            return { ssnFilled: true };
        }
        const chosen = await this.pickFromDropdown(this.page.locator(this.selectors.visaType), visaType);

        // Fields revealed by the visa choice.
        const citizenshipCountry = this.page.locator(this.selectors.citizenshipCountry);
        if (await citizenshipCountry.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
            await this.chooseFromDropdown(this.selectors.citizenshipCountry, countryOfCitizenship);
        }
        if (await this.page.locator(this.selectors.birthCountry).isVisible().catch(() => false)) {
            await this.chooseFromDropdown(this.selectors.birthCountry, countryOfBirth || countryOfCitizenship);
        }
        if (await this.page.locator(this.selectors.studentVisaInUsGroup).isVisible().catch(() => false)) {
            await this.answerYesNo(this.selectors.studentVisaInUsGroup, inUsOnStudentVisa);
        }
        return { visaType: chosen };
    }

    /**
     * Type a test SSN into both boxes (SSN and confirm). Both inputs share the id
     * social_security_number. See selectCitizenshipStatus() for where the value comes from.
     * The boxes format as XXX-XX-XXXX, so digits are typed.
     * @param {string} digits - 9 digits
     * @returns {Promise<void>}
     */
    async fillSocialSecurityNumber(digits) {
        if (!/^\d{9}$/.test(digits)) throw new Error('The SSN must be 9 digits (check TEST_SSN in .env if this spec uses it)');
        const boxes = this.page.locator(this.selectors.ssnInputs);
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
     * Email and phone are only checked by BriteVerify when the step is continued.
     * @param {{ firstName: string, lastName: string, isLiving?: boolean|string,
     *           relation?: string, schooling?: string, attendedAsu?: boolean|string,
     *           email?: string, phone?: string }} parent - phone: US digits, e.g. "4809657788"
     * @returns {Promise<{ relation: string, schooling: string }>} the dropdown values used
     */
    async addParentInformation({ firstName, lastName, isLiving = true, relation, schooling, attendedAsu = false, email, phone }) {
        // The form is open by default; once a guardian is saved it is behind "Add additional parent or guardian".
        const first = this.page.locator(this.selectors.guardianFirstName);
        if (!(await first.isVisible().catch(() => false))) {
            await this.page.locator(this.selectors.addGuardianBtn).click();
        }
        await first.fill(firstName);
        await this.page.locator(this.selectors.guardianLastName).fill(lastName);
        await this.answerYesNo(this.selectors.guardianLivingGroup, MyInformationPage.toBool(isLiving) !== false);
        if (email) await this.page.locator(this.selectors.guardianEmail).fill(email);
        if (phone) {
            // A formatted field: type the digits rather than fill().
            const box = this.page.locator(this.selectors.guardianPhone);
            await box.click();
            await box.press('Control+A');
            await box.press('Backspace');
            await box.pressSequentially(phone, { delay: 30 });
        }

        const usedRelation = await this.pickFromDropdown(this.page.locator(this.selectors.guardianRelation), relation);
        const usedSchooling = await this.pickFromDropdown(this.page.locator(this.selectors.guardianSchooling), schooling);
        await this.answerYesNo(this.selectors.guardianAttendedAsuGroup, !!MyInformationPage.toBool(attendedAsu));

        await first.locator(this.selectors.guardianForm).locator(this.selectors.guardianSaveBtn).click();
        // Wait for the form to close and the row to appear; otherwise the next call could type
        // into this still-closing form and rename the guardian just saved.
        await expect(first).toBeHidden({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.guardianNameCell).filter({ hasText: `${firstName} ${lastName}` }).first())
            .toBeVisible({ timeout: this.assertionTimeout });
        return { relation: usedRelation, schooling: usedSchooling };
    }

    /**
     * Delete a saved guardian, confirming if asked.
     * @param {string} fullName - "First Last"
     * @returns {Promise<void>}
     */
    async deleteGuardian(fullName) {
        await this.guardianLink('Delete', fullName).click();
        const confirm = this.page.locator(this.selectors.confirmDeleteBtn).first();
        if (await confirm.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await confirm.click();
        }
        await expect(this.page.locator(this.selectors.guardianNameCell).filter({ hasText: new RegExp(`^\\s*${fullName}\\s*$`) }))
            .toHaveCount(0, { timeout: this.assertionTimeout });
    }

    /**
     * Saved guardians' names.
     * @returns {Promise<string[]>}
     */
    async getGuardians() {
        return (await this.page.locator(this.selectors.guardianNameCell).allInnerTexts()).map((t) => t.trim());
    }

    /**
     * Tick a Previous ASU affiliation checkbox (no-op if already ticked).
     * @param {keyof MyInformationPage['selectors']['affiliation']} key
     * @param {boolean} [checked]
     * @returns {Promise<void>}
     */
    async setAffiliation(key, checked = true) {
        const box = this.page.locator(this.selectors.affiliation[key]);
        if ((await box.isChecked()) === checked) return;
        await (await this.affiliationLabel(key)).click();
        if (checked) await expect(box).toBeChecked({ timeout: this.assertionTimeout });
        else await expect(box).not.toBeChecked({ timeout: this.assertionTimeout });
    }

    /**
     * Previous ASU affiliation. Defaults to "never affiliated". Choosing any real
     * affiliation unticks "never affiliated" first.
     * @param {{ affiliations?: Array<keyof MyInformationPage['selectors']['affiliation']>, affiliateId?: string }} [data]
     */
    async addAsuAffiliateInfo({ affiliations = ['neverAffiliated'], affiliateId } = {}) {
        if (!affiliations.includes('neverAffiliated')) await this.setAffiliation('neverAffiliated', false);
        for (const key of affiliations) await this.setAffiliation(key, true);
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
     * Options of a dropdown on this page (closes it again).
     * @param {string} selector
     * @returns {Promise<string[]>}
     */
    async getDropdownOptions(selector) {
        await this.page.locator(selector).click();
        const options = this.page.locator(this.selectors.option);
        await options.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = (await options.allInnerTexts()).map((t) => t.replace(/\s*✓\s*$/, '').trim()).filter(Boolean);
        await this.page.keyboard.press('Escape');
        return labels;
    }

    /**
     * Radio labels of one of the page's radio groups.
     * @param {string} groupSelector
     * @returns {Promise<string[]>}
     */
    async getRadioOptions(groupSelector) {
        const radios = this.page.locator(groupSelector).getByRole('radio');
        await radios.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await radios.allInnerTexts()).map((t) => t.trim());
    }

    /**
     * Follow-up fields shown under "Affiliation to U.S. Uniformed Services" for the
     * current choice, by name, with the branch question's wording (it differs for a
     * service member and a spouse/dependent).
     * @returns {Promise<{ fields: string[], branchLabel: string|undefined }>}
     */
    async getUniformedServicesFollowUps() {
        const s = this.selectors;
        await this.page.waitForTimeout(500); // follow-ups render after the choice
        /** @type {Array<[string, string]>} */
        const named = [['serviceStatus', s.serviceStatusGroup], ['serviceBranch', s.serviceBranch],
            ['vaBenefits', s.vaBenefitsGroup], ['jstAuthorize', s.jstAuthorizeGroup]];
        const fields = [];
        for (const [name, selector] of named) {
            if (await this.page.locator(selector).first().isVisible().catch(() => false)) fields.push(name);
        }
        const branchLabel = fields.includes('serviceBranch')
            ? await this.page.locator(s.serviceBranch).first().evaluate((el) => (el.getAttribute('aria-label')
                || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent)
                || (el.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')
                || '').replace(/\s+/g, ' ').trim())
            : undefined;
        return { fields, branchLabel };
    }

    /**
     * Choose a uniformed-services affiliation and answer its mandatory follow-ups:
     * status (first option unless given), branch (first unless given), VA benefits and
     * Joint Service Transcript authorisation (No unless given). Only the follow-ups the
     * choice shows are answered.
     * @param {{ affiliation?: string, status?: string, branch?: string,
     *           vaBenefits?: boolean, jstAuthorize?: boolean }} [data]
     *   affiliation defaults to the first option ("I am a U.S. service member or veteran")
     * @returns {Promise<{ affiliation: string, status?: string, branch?: string,
     *           vaBenefits?: string, jstAuthorize?: string }>} what was chosen
     */
    async fillUniformedServices({ affiliation, status, branch, vaBenefits = false, jstAuthorize = false } = {}) {
        const s = this.selectors;
        const chosen = affiliation
            ? (await this.chooseFromDropdown(s.uniformedServices, affiliation), affiliation)
            : await this.chooseFirstDropdownOption(s.uniformedServices);
        /** @type {{ affiliation: string, status?: string, branch?: string, vaBenefits?: string, jstAuthorize?: string }} */
        const out = { affiliation: chosen };
        const { fields } = await this.getUniformedServicesFollowUps();
        if (fields.includes('serviceStatus')) {
            out.status = status || (await this.getRadioOptions(s.serviceStatusGroup))[0];
            await this.radioIn(s.serviceStatusGroup, out.status).click();
        }
        if (fields.includes('serviceBranch')) {
            out.branch = await this.pickFromDropdown(this.page.locator(s.serviceBranch), branch);
        }
        if (fields.includes('vaBenefits')) {
            await this.answerYesNo(s.vaBenefitsGroup, vaBenefits);
            out.vaBenefits = vaBenefits ? 'Yes' : 'No';
        }
        if (fields.includes('jstAuthorize')) {
            await this.answerYesNo(s.jstAuthorizeGroup, jstAuthorize);
            out.jstAuthorize = jstAuthorize ? 'Yes' : 'No';
        }
        return out;
    }

    /**
     * Education benefits from a partnered employer/organisation (required Yes/No).
     * Starbucks also asks "Have you earned a bachelor's degree or higher?" (required,
     * `earnedBachelor`, default No) and then "Are you a Starbucks partner or a family member
     * of a partner who is a veteran or in the military?" (required, `starbucksPartnerType`,
     * default "Starbucks partner"; the other choice is "Eligible military partner family member"),
     * which asks "Enter your Starbucks partner number" ("US -" prefix; `starbucksPartnerNumber`,
     * required then: the app verifies it, so a made-up number is refused). Once it shows
     * "Partner number verified", the SCAP terms and FERPA consent are accepted ("I accept") and
     * the manager disclosure is answered (`managerDisclosure`, default "Accept").
     * @param {{ usesBenefits: boolean, provider?: string, earnedBachelor?: boolean, starbucksPartnerType?: string,
     *           starbucksPartnerNumber?: string, managerDisclosure?: 'Accept'|'Decline' }} data -
     *   provider: exact label, or the first listed provider when omitted.
     * @returns {Promise<string|undefined>} provider chosen, if any
     */
    async applyPartnerBenefits({ usesBenefits, provider, earnedBachelor = false, starbucksPartnerType = 'Starbucks partner', starbucksPartnerNumber = '', managerDisclosure = 'Accept' }) {
        await this.answerYesNo(this.selectors.educationBenefitsGroup, usesBenefits);
        if (!usesBenefits) return undefined;
        const chosen = await this.pickFromDropdown(this.page.locator(this.selectors.benefitProvider), provider);
        const bachelor = this.page.locator(this.selectors.earnedBachelorGroup);
        if (await bachelor.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await this.answerYesNo(this.selectors.earnedBachelorGroup, earnedBachelor);
        }
        const partnerType = this.page.locator(this.selectors.starbucksPartnerTypeGroup);
        if (await partnerType.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await this.radioIn(this.selectors.starbucksPartnerTypeGroup, starbucksPartnerType).click();
        }
        const partnerNumber = this.page.locator(this.selectors.starbucksPartnerNumber);
        if (await partnerNumber.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            // The number is verified by the app: it must be a real partner number QA accepts,
            // with the applicant's name matching (set STARBUCKS_* in .env; never hard-coded).
            if (!starbucksPartnerNumber) throw new Error('Starbucks asks for a partner number: pass starbucksPartnerNumber (STARBUCKS_PARTNER_NUMBER in .env)');
            await partnerNumber.fill(starbucksPartnerNumber);
            // The unlabelled button right after the box starts the check (Continue does too).
            await partnerNumber.locator(this.selectors.followingButton).click();
            await this.page.locator(this.selectors.starbucksPartnerVerified).waitFor({ state: 'visible', timeout: this.navigationTimeout });
            const accept = this.page.locator(this.selectors.scapAcceptCheckbox);
            if ((await accept.getAttribute('aria-checked')) !== 'true' && !(await accept.isChecked().catch(() => false))) await accept.click();
            await this.page.locator(this.selectors.managerDisclosureHeading).scrollIntoViewIfNeeded();
            await this.page.getByRole('radio', { name: managerDisclosure, exact: true }).click();
        }
        return chosen;
    }

    /**
     * Whether the Starbucks partner number shows "Partner number verified".
     * @returns {Promise<boolean>}
     */
    async isStarbucksPartnerVerified() {
        return this.page.locator(this.selectors.starbucksPartnerVerified).isVisible().catch(() => false);
    }

    /**
     * Answer education benefits at random (No, or Yes with the first provider).
     * @returns {Promise<string|undefined>}
     */
    async applyRandomPartnerBenefits() {
        return this.applyPartnerBenefits({ usesBenefits: Math.random() < 0.5 });
    }

    /**
     * Fill the step from flow-spec test data. Keys match the flow specs' testData:
     * legalSex, primaryLanguage, address, hispanicLatino, races, usCitizenship,
     * countryOfBirth, visaType, ssn (U.S. citizens; default a made-up number), militaryStatus,
     * partnerBenefits.hasPartnerBenefits.
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
                ssn: data.ssn,
            });
        }
        if (data.militaryStatus !== undefined) {
            const none = !data.militaryStatus || /^none$/i.test(String(data.militaryStatus));
            await this.selectMilitaryAffiliation(none ? this.NO_UNIFORMED_SERVICES : data.militaryStatus);
        }
        // Not asked for every visa (e.g. Student (F-1) replaces it with I-20 questions).
        if (data.partnerBenefits && data.partnerBenefits.hasPartnerBenefits !== undefined
            && await this.page.locator(this.selectors.educationBenefitsGroup).isVisible()) {
            const { hasPartnerBenefits, ...partner } = data.partnerBenefits;
            await this.applyPartnerBenefits({ ...partner, usesBenefits: !!hasPartnerBenefits });
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
     * empty), a parent/guardian with email and phone (saved), ASU affiliation with an
     * affiliate ID, uniformed services (the first option and its mandatory follow-ups), and
     * education benefits "Yes" with a provider.
     * @param {Partial<typeof MyInformationPage.ALL_FIELDS>} [overrides]
     * @returns {Promise<typeof MyInformationPage.ALL_FIELDS & { visaType: string, benefitProvider: string,
     *           raceOrigins: Record<string, string>, primaryRace: string|undefined,
     *           uniformed: { affiliation: string, status?: string, branch?: string, vaBenefits?: string, jstAuthorize?: string } }>}
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
        await this.addAsuAffiliateInfo(d.asuAffiliate);
        const uniformed = await this.fillUniformedServices(d.uniformedServices);
        const benefitProvider = await this.applyPartnerBenefits({ usesBenefits: true, provider: d.benefitProvider || undefined });
        return {
            ...d,
            raceOrigins,
            primaryRace,
            guardian: { ...d.guardian, ...guardian },
            uniformed,
            visaType: /** @type {string} */ (visaType),
            benefitProvider: /** @type {string} */ (benefitProvider),
        };
    }

    // ------------------------------------------------------------------ read-back

    /**
     * What the form currently shows, section by section, so specs can assert on values
     * without locators of their own. Fields that aren't shown come back undefined.
     * Opens and closes the race list to read which races are selected.
     * @returns {Promise<{
     *   formerNames: string[], legalSex: string|undefined, primaryLanguage: string|undefined,
     *   address: { country: string|undefined, line1: string|undefined, line2: string|undefined,
     *              city: string|undefined, state: string|undefined, zip: string|undefined },
     *   hispanicLatino: string|undefined, races: string[], raceOrigins: Record<string, string>,
     *   primaryRace: string|undefined, citizenship: string|undefined, visaType: string|undefined,
     *   countryOfCitizenship: string|undefined, countryOfBirth: string|undefined,
     *   guardians: string[], affiliations: string[], affiliateId: string|undefined,
     *   militaryStatus: string|undefined, serviceStatus: string|undefined,
     *   serviceBranch: string|undefined, vaBenefits: string|undefined, jstAuthorize: string|undefined,
     *   educationBenefits: string|undefined, benefitProvider: string|undefined }>}
     */
    async readFormValues() {
        const s = this.selectors;
        /** @param {string|import('@playwright/test').Locator} target */
        const value = async (target) => {
            const loc = typeof target === 'string' ? this.page.locator(target).first() : target.first();
            return (await loc.isVisible().catch(() => false)) ? loc.inputValue() : undefined;
        };
        /** @param {string} groupSelector */
        const checkedIn = async (groupSelector) => {
            const radio = this.page.locator(groupSelector).getByRole('radio', { checked: true });
            return (await radio.count()) ? (await radio.first().innerText()).trim() : undefined;
        };
        /** @param {string} cellSelector */
        const cells = async (cellSelector) => (await this.page.locator(cellSelector).allInnerTexts()).map((t) => t.trim());

        const races = await this.readSelectedRaces();
        /** @type {Record<string, string>} */
        const raceOrigins = {};
        for (const race of races) {
            const origin = await value(this.raceOriginDropdown(race));
            if (origin) raceOrigins[race] = origin;
        }
        /** @type {string[]} */
        const affiliations = [];
        for (const key of /** @type {Array<keyof MyInformationPage['selectors']['affiliation']>} */ (Object.keys(s.affiliation))) {
            if (await this.page.locator(s.affiliation[key]).isChecked()) affiliations.push(key);
        }
        return {
            formerNames: await cells(s.formerNameCell),
            legalSex: await checkedIn(s.legalSexGroup),
            primaryLanguage: await value(s.primaryLanguage),
            address: {
                country: await value(s.homeCountry),
                line1: await value(s.addressLine1),
                line2: await value(s.addressLine2),
                city: await value(s.city),
                state: await value(s.state),
                zip: await value(s.zipCode),
            },
            hispanicLatino: await checkedIn(s.hispanicGroup),
            races,
            raceOrigins,
            primaryRace: await value(s.primaryRace),
            citizenship: await checkedIn(s.citizenshipGroup),
            visaType: await value(s.visaType),
            countryOfCitizenship: await value(s.citizenshipCountry),
            countryOfBirth: await value(s.birthCountry),
            guardians: await cells(s.guardianNameCell),
            affiliations,
            affiliateId: await value(s.asuAffiliateId),
            militaryStatus: await value(s.uniformedServices),
            serviceStatus: await checkedIn(s.serviceStatusGroup),
            serviceBranch: await value(s.serviceBranch),
            vaBenefits: await checkedIn(s.vaBenefitsGroup),
            jstAuthorize: await checkedIn(s.jstAuthorizeGroup),
            educationBenefits: await checkedIn(s.educationBenefitsGroup),
            benefitProvider: await value(s.benefitProvider),
        };
    }

    /**
     * Races ticked in the race multi-select: opens the list, reads the selected options,
     * closes it again.
     * @returns {Promise<string[]>}
     */
    async readSelectedRaces() {
        const box = this.page.locator(this.selectors.race);
        await box.scrollIntoViewIfNeeded();
        await box.click();
        const options = this.page.locator(this.selectors.option);
        await options.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        // Read the whole list in one pass: it re-renders while open, so per-option reads can miss.
        // A selected option renders a check mark on a second line ("Asian\n✓"); keep the label.
        const selected = await options.evaluateAll((els) => els
            .filter((el) => el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true'
                || el.getAttribute('data-state') === 'checked')
            .map((el) => ((el instanceof HTMLElement ? el.innerText : el.textContent) || '').split('\n')[0].trim()));
        await this.page.keyboard.press('Escape');
        return selected;
    }

    // ------------------------------------------------------------------ footer

    /**
     * Click Continue ("Save and Continue") and wait for step 2, My program.
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.page.locator(this.selectors.continueButton).click();
        // BriteVerify may question contact details (e.g. a guardian's phone); continuing
        // as is is the normal path. Wait for whichever comes first.
        const deadline = Date.now() + this.navigationTimeout;
        while (!/\/my-program/.test(this.page.url()) && Date.now() < deadline) {
            if (await this.briteVerifyDialog().isVisible().catch(() => false)) {
                this.logger.info(`BriteVerify on Continue: ${JSON.stringify(await this.readVerificationItems())}; submitting as is`);
                await this.briteVerifyDialog().locator(this.selectors.verifySubmitButton).click();
            }
            await this.page.waitForTimeout(500);
        }
        await this.page.waitForURL(/\/ug-app\/\d+\/my-program/, { timeout: 5000 });
    }

    /**
     * Rows of the open BriteVerify dialog, e.g.
     * [{ item: 'Additional parent / guardian phone', value: '+1 (500) 555-0123' }].
     * @returns {Promise<Array<{ item: string, value: string }>>}
     */
    async readVerificationItems() {
        const rows = this.briteVerifyDialog().locator(this.selectors.verifyRows);
        /** @type {Array<{ item: string, value: string }>} */
        const items = [];
        for (let i = 0; i < await rows.count(); i++) {
            const item = (await rows.nth(i).locator(this.selectors.verifyRowHeader).innerText().catch(() => '')).trim();
            const value = (await rows.nth(i).locator(this.selectors.verifyCell).innerText().catch(() => '')).trim();
            if (item) items.push({ item, value });
        }
        return items;
    }

    /**
     * Click Continue expecting BriteVerify to question something: return what it lists,
     * then "Go back and change" (nothing is saved; the page stays on My information).
     * @returns {Promise<Array<{ item: string, value: string }>>}
     */
    async continueAndReadVerification() {
        await this.page.locator(this.selectors.continueButton).click();
        await this.briteVerifyDialog().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        const items = await this.readVerificationItems();
        await this.briteVerifyDialog().locator(this.selectors.verifyGoBackButton).click();
        await this.briteVerifyDialog().waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/my-information/);
        return items;
    }

    /**
     * Click Continue without expecting to leave (e.g. to trigger validation).
     * @returns {Promise<void>}
     */
    async clickContinue() {
        await this.page.locator(this.selectors.continueButton).click();
    }

    /**
     * Continue after opening this step with Review's Edit button: the step is saved and the
     * app returns straight to Review (not to My program).
     * @returns {Promise<void>}
     */
    async saveAndReturnToReview() {
        await this.clickContinue();
        await this.page.waitForURL(/\/ug-app\/\d+\/review/, { timeout: this.navigationTimeout });
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
        await expect(this.page.locator(this.selectors.helpDialog).or(this.page.locator(this.selectors.helpPanel)).first())
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
    // Valid contact details: the test inbox and ASU's public Admission Services number.
    guardian: { firstName: 'Pat', lastName: 'Guardian', isLiving: true, attendedAsu: false,
        email: 'ugnaaqaautomation+guardian@gmail.com', phone: '4809657788' },
    asuAffiliate: {
        /** @type {Array<'undergradDegreeSeeking'|'nondegreeOrGraduate'|'globalLaunch'|'transferPathway'|'employee'|'summerProgram'|'other'|'neverAffiliated'>} */
        affiliations: ['summerProgram'],
        affiliateId: '1234567890',
    },
    // First option ("I am a U.S. service member or veteran"); its mandatory follow-ups take
    // the first status and branch, and No for VA benefits and the Joint Service Transcript.
    uniformedServices: { affiliation: '', status: '', branch: '', vaBenefits: false, jstAuthorize: false },
    benefitProvider: '',
};

module.exports = MyInformationPage;
