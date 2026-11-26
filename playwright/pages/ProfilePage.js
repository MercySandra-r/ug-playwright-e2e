// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Profile fields as named in their "Edit <field>, current value: <value>" links, and the
 * page each link opens.
 */
const FIELDS = {
    legalName: { label: 'legal name', path: '/profile/edit-name' },
    preferredFirstName: { label: 'preferred first name', path: '/profile/edit-preferred-first-name' },
    birthday: { label: 'birthday', path: '/profile/edit-birthday' },
    pronouns: { label: 'pronouns', path: '/profile/edit-pronoun' },
    genderIdentity: { label: 'gender identity', path: '/profile/edit-gender' },
    phoneNumber: { label: 'phone number', path: '/profile/edit-phone-number' },
    smsPreference: { label: 'SMS messaging preference', path: '/profile/edit-phone-number' },
};

/** Shown instead of a value when an optional field is empty. */
const EMPTY_VALUES = ['Add one', 'Select'];

/**
 * Page Object for the applicant profile (/profile), reached from the Profile menu's
 * "Edit profile" or Review's Profile section.
 *
 * Rebuilt against the live page on 2026-11-11:
 *  - /profile is a read-only summary: "Welcome, <name>", "Application ID: <id>", then one
 *    row per field with an "Edit <field>, current value: <value>" link (legal name,
 *    preferred first name, birthday, pronouns, gender identity, phone number, SMS
 *    preference). Contact email and the sign-in method are shown without an edit link.
 *  - Each link opens its own page with Save and Cancel: edit-name (first, middle, last,
 *    suffix), edit-preferred-first-name, edit-birthday (month/day/year), edit-pronoun
 *    (He/Him, She/Her, They/Them), edit-gender (Female, Male, Nonbinary, Identity not
 *    listed, Prefer not to disclose), edit-phone-number (country code, number, mobile and
 *    SMS questions).
 * There is no address or emergency contact on Profile any more.
 *
 * What can be edited depends on the account's in-progress applications (QA team,
 * 2026-11-11); a field is editable when it shows its Edit link:
 *  - none in progress: nothing is editable
 *  - one in progress (after the pre-app dashboard): every field
 *  - several in progress: all but legal name and birthday
 *  - contact email: never
 * See expectedEditableFields() and getEditableFields().
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (a field's Edit link, a radio, an
 * option) come from the locator methods below. Specs use these names and the read-back
 * methods, never their own locators.
 */
class ProfilePage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'ProfilePage');

        this.selectors = {
            // Summary (/profile)
            pageLabel: 'text="Applicant profile"',
            welcomeText: 'text=/^Welcome, /',
            applicationIdText: 'text=/^Application ID: /',
            contactEmailLabel: 'text="Contact email"',
            // The value right after the "Contact email" label (it has an info button between).
            contactEmailValue: 'xpath=following::p[1]',
            contactEmailEditLink: 'role=link[name=/^Edit (contact )?email/i]',
            editLinks: 'role=link[name=/^Edit .+, current value: /]',
            returnToDashboardLink: 'role=link[name="Return to dashboard"]',

            // Profile menu (header)
            profileMenuButton: 'role=button[name="Profile menu"]',
            profileMenu: 'role=menu',
            editProfileItem: 'text="Edit profile"',

            // Edit pages: shared
            saveButton: 'role=button[name="Save"s]',
            cancelButton: 'role=button[name="Cancel"s]',
            cancelText: 'text="Cancel"',
            option: 'role=option',

            // edit-name
            firstNameInput: 'role=textbox[name="First name"s]',
            // Since 2026-11-26 these read "Middle name Optional" / "Suffix Optional" (was "(Optional)").
            middleNameInput: 'role=textbox[name=/^Middle name\\b/]',
            lastNameInput: 'role=textbox[name="Last name"s]',
            suffixSelect: 'role=combobox[name=/^Suffix\\b/]',

            // edit-preferred-first-name
            preferredFirstNameInput: 'role=textbox[name="Preferred first name (Optional)"]',

            // edit-birthday
            birthdayGroup: 'role=group[name="Birthday"]',
            birthMonthSelect: 'role=combobox[name="Month"s]',
            birthDaySelect: 'role=combobox[name="Day"s]',
            birthYearSelect: 'role=combobox[name="Year"s]',

            // edit-pronoun, edit-gender
            pronounsGroup: 'role=radiogroup[name="Pronouns (Optional)"]',
            genderGroup: 'role=radiogroup[name="Gender identity (Optional)"]',
            radio: 'role=radio',

            // edit-phone-number
            countryCodeInput: 'role=textbox[name="Country code"]',
            phoneNumberInput: 'role=textbox[name="Phone number"s]',
            mobileGroup: 'role=radiogroup[name="Is this a mobile number?"]',
            smsGroup: 'role=radiogroup[name=/SMS messaging/]',

            // "Information Verification Required" dialog (BriteVerify) after saving a phone
            verifyDialog: 'role=alertdialog',
            goBackAndChangeButton: 'role=button[name="Go back and change"]',
        };
        this.FIELDS = FIELDS;
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * A field's "Edit <field>, current value: ..." link on /profile.
     * @param {keyof FIELDS} field
     * @returns {import('@playwright/test').Locator}
     */
    editLink(field) {
        const label = FIELDS[field].label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.page.getByRole('link', { name: new RegExp(`^Edit ${label}, current value: `) });
    }

    /**
     * A radio by exact label inside one of the page's radio groups.
     * @param {string} groupSelector
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    radioIn(groupSelector, label) {
        return this.page.locator(groupSelector).getByRole('radio', { name: label, exact: true });
    }

    /**
     * An open list's option by exact label.
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    option(label) {
        return this.page.getByRole('option', { name: label, exact: true }).first();
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open /profile.
     * @returns {Promise<void>}
     */
    async navigateToProfile() {
        await this.gotoPath('/profile');
        await this.verifyPageLoaded();
    }

    /**
     * Open Profile the way users do: Profile menu -> "Edit profile".
     * @returns {Promise<void>}
     */
    async openProfile() {
        await this.page.locator(this.selectors.profileMenuButton).click();
        await this.page.locator(this.selectors.profileMenu).locator(this.selectors.editProfileItem).click();
        await this.verifyPageLoaded();
    }

    /**
     * From the main dashboard, open Profile through the Profile menu.
     * @returns {Promise<void>}
     */
    async openProfileFromDashboard() {
        await this.gotoPath('/dashboard');
        await this.openProfile();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/profile$/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.pageLabel)).toBeVisible({ timeout: this.navigationTimeout });
        // Loaded = the welcome line and the details are there. Not an Edit link: with no
        // application in progress the profile has none (verified 2026-11-19).
        await expect(this.page.locator(this.selectors.welcomeText).first()).toBeVisible({ timeout: this.navigationTimeout });
        await this.page.waitForLoadState('networkidle').catch(() => {});
    }

    /**
     * "Return to dashboard" goes back to /dashboard.
     * @returns {Promise<void>}
     */
    async returnToDashboard() {
        await this.page.locator(this.selectors.returnToDashboardLink).click();
        await this.page.waitForURL(/\/dashboard/, { timeout: this.navigationTimeout });
    }

    // ------------------------------------------------------------------ read-back

    /**
     * Everything the summary shows. Optional fields that are empty come back as ''.
     * @returns {Promise<{ welcomeName: string, applicationId: string, contactEmail: string,
     *   legalName: string, preferredFirstName: string, birthday: string, pronouns: string,
     *   genderIdentity: string, phoneNumber: string, smsPreference: string }>}
     */
    async readProfile() {
        const names = await this.page.locator(this.selectors.editLinks).evaluateAll((links) =>
            links.map((a) => a.getAttribute('aria-label') || (a.textContent || '').trim()));
        /** @param {keyof FIELDS} field */
        const valueOf = (field) => {
            const prefix = `Edit ${FIELDS[field].label}, current value: `;
            const raw = (names.find((n) => n.startsWith(prefix)) || '').slice(prefix.length).trim();
            return EMPTY_VALUES.includes(raw) ? '' : raw;
        };
        const welcome = await this.page.locator(this.selectors.welcomeText).first().innerText();
        const appId = await this.page.locator(this.selectors.applicationIdText).first().innerText().catch(() => '');
        const email = await this.page.locator(this.selectors.contactEmailLabel).first()
            .locator(this.selectors.contactEmailValue).innerText();
        return {
            welcomeName: welcome.replace(/^Welcome,\s*/, '').trim(),
            applicationId: (appId.match(/(\d+)/) || [])[1] || '',
            contactEmail: email.trim(),
            legalName: valueOf('legalName'),
            preferredFirstName: valueOf('preferredFirstName'),
            birthday: valueOf('birthday'),
            pronouns: valueOf('pronouns'),
            genderIdentity: valueOf('genderIdentity'),
            phoneNumber: valueOf('phoneNumber'),
            smsPreference: valueOf('smsPreference'),
        };
    }

    /**
     * Fields that should be editable (see the class notes). Contact email is never editable
     * and isn't listed. Verified 2026-11-19 (TC_30):
     *   0  no application in progress (e.g. the only one submitted): nothing editable
     *   1  the account's only application, in progress: everything editable
     *   2  several applications on the account, one in progress (e.g. one submitted, one
     *      started): legal name and birthday read-only, the rest editable
     * @param {number} inProgressCount - 0, 1, or 2 for "several applications"
     * @returns {Array<keyof FIELDS>}
     */
    static expectedEditableFields(inProgressCount) {
        const all = /** @type {Array<keyof FIELDS>} */ (Object.keys(FIELDS));
        if (inProgressCount <= 0) return [];
        if (inProgressCount === 1) return all;
        return all.filter((f) => f !== 'legalName' && f !== 'birthday');
    }

    /**
     * Fields that currently show an Edit link, in FIELDS order.
     * @returns {Promise<Array<keyof FIELDS>>}
     */
    async getEditableFields() {
        await this.page.locator(this.selectors.pageLabel).waitFor({ state: 'visible', timeout: this.navigationTimeout });
        /** @type {Array<keyof FIELDS>} */
        const editable = [];
        for (const field of /** @type {Array<keyof FIELDS>} */ (Object.keys(FIELDS))) {
            if (await this.editLink(field).isVisible().catch(() => false)) editable.push(field);
        }
        return editable;
    }

    /**
     * Contact email never has an Edit link.
     * @returns {Promise<boolean>}
     */
    async isContactEmailEditable() {
        return this.page.locator(this.selectors.contactEmailEditLink).isVisible().catch(() => false);
    }

    /**
     * Old API: whether the profile shows this contact email.
     * @param {string} expectedEmail
     * @returns {Promise<boolean>}
     */
    async validateEmail(expectedEmail) {
        return (await this.readProfile()).contactEmail === expectedEmail.trim();
    }

    /**
     * Old API: the application shown on the profile, e.g. "Application ID: 5020353".
     * @returns {Promise<string>}
     */
    async checkStatus() {
        return (await this.page.locator(this.selectors.applicationIdText).first().innerText()).trim();
    }

    // ------------------------------------------------------------------ edit pages

    /**
     * Open a field's edit page from /profile.
     * @param {keyof FIELDS} field
     * @returns {Promise<void>}
     */
    async openEditor(field) {
        await this.editLink(field).click();
        await this.page.waitForURL(new RegExp(`${FIELDS[field].path}$`), { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.saveButton)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * Save the open edit page; back on /profile.
     * @returns {Promise<boolean>} true once back on the summary
     */
    async save() {
        await this.page.locator(this.selectors.saveButton).click();
        await this.page.waitForURL(/\/profile$/, { timeout: this.navigationTimeout });
        await this.verifyPageLoaded();
        return true;
    }

    /**
     * Leave the open edit page without saving (Cancel is a button on most pages, plain
     * text on the phone page).
     * @returns {Promise<void>}
     */
    async cancel() {
        // Never "Submit as is" from the verification dialog: go back, then cancel.
        const verify = this.page.locator(this.selectors.verifyDialog);
        if (await verify.isVisible().catch(() => false)) {
            await verify.locator(this.selectors.goBackAndChangeButton).click();
            await verify.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        }
        await this.page.locator(this.selectors.cancelButton).or(this.page.locator(this.selectors.cancelText)).first().click();
        await this.page.waitForURL(/\/profile$/, { timeout: this.navigationTimeout });
        await this.verifyPageLoaded();
    }

    /**
     * Whether Save is enabled on the open edit page (pronouns/gender keep it disabled
     * until a choice is made).
     * @returns {Promise<boolean>}
     */
    async isSaveEnabled() {
        return this.page.locator(this.selectors.saveButton).isEnabled();
    }

    /**
     * Values on the open edit-name page.
     * @returns {Promise<{ firstName: string, middleName: string, lastName: string, suffix: string }>}
     */
    async readLegalNameForm() {
        const value = (/** @type {string} */ s) => this.page.locator(s).inputValue();
        const suffix = this.page.locator(this.selectors.suffixSelect);
        const suffixText = await suffix.evaluate((el) => (el instanceof HTMLSelectElement
            ? (el.selectedOptions[0]?.textContent || '') : /** @type {HTMLInputElement} */ (el).value).trim());
        return {
            firstName: await value(this.selectors.firstNameInput),
            middleName: await value(this.selectors.middleNameInput),
            lastName: await value(this.selectors.lastNameInput),
            suffix: suffixText === 'Please select one' ? '' : suffixText,
        };
    }

    /**
     * Values on the open edit-birthday page.
     * @returns {Promise<{ month: string, day: string, year: string }>}
     */
    async readBirthdayForm() {
        return {
            month: await this.page.locator(this.selectors.birthMonthSelect).inputValue(),
            day: await this.page.locator(this.selectors.birthDaySelect).inputValue(),
            year: await this.page.locator(this.selectors.birthYearSelect).inputValue(),
        };
    }

    /**
     * Values on the open edit-phone-number page.
     * @returns {Promise<{ countryCode: string, phone: string, isMobile: string|undefined, sms: string|undefined }>}
     */
    async readPhoneForm() {
        /** @param {string} group */
        const checked = async (group) => {
            const radio = this.page.locator(group).getByRole('radio', { checked: true });
            return (await radio.count()) ? (await radio.first().innerText()).trim() : undefined;
        };
        return {
            countryCode: await this.page.locator(this.selectors.countryCodeInput).inputValue(),
            phone: (await this.page.locator(this.selectors.phoneNumberInput).inputValue()).replace(/\D/g, ''),
            isMobile: await checked(this.selectors.mobileGroup),
            sms: await checked(this.selectors.smsGroup),
        };
    }

    /**
     * Radio labels of a radio group on the open edit page.
     * @param {string} groupSelector - this.selectors.pronounsGroup or genderGroup
     * @returns {Promise<string[]>}
     */
    async getRadioOptions(groupSelector) {
        const radios = this.page.locator(groupSelector).locator(this.selectors.radio);
        await radios.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await radios.allInnerTexts()).map((t) => t.trim());
    }

    /**
     * Empty first and last name on the open edit-name page (nothing is saved).
     * @returns {Promise<void>}
     */
    async clearLegalName() {
        await this.page.locator(this.selectors.firstNameInput).fill('');
        await this.page.locator(this.selectors.lastNameInput).fill('');
    }

    /**
     * Empty the phone number on the open edit-phone-number page (nothing is saved).
     * @returns {Promise<void>}
     */
    async clearPhone() {
        // The formatted field ignores fill(''); select everything and delete it.
        const box = this.page.locator(this.selectors.phoneNumberInput);
        await box.click();
        await box.press('Control+A');
        await box.press('Backspace');
        await expect(box).toHaveValue('', { timeout: this.assertionTimeout });
    }

    /**
     * Click Save on the open edit page and capture the field validations it shows. Throws
     * (via captureFieldValidations) if the save goes through instead.
     * @param {string} stepName - name for the log and report
     * @returns {Promise<Array<{ field: string, message: string }>>}
     */
    async captureSaveValidations(stepName) {
        return this.captureFieldValidations({ stepName, button: this.page.locator(this.selectors.saveButton) });
    }

    // ------------------------------------------------------------------ updates (each opens, fills, saves)

    /**
     * @param {string} name - '' clears it
     * @returns {Promise<void>}
     */
    async updatePreferredFirstName(name) {
        await this.openEditor('preferredFirstName');
        await this.page.locator(this.selectors.preferredFirstNameInput).fill(name);
        await this.save();
    }

    /**
     * Choose pronouns and save. (No custom pronouns are offered any more.)
     * @param {'He/Him'|'She/Her'|'They/Them'|string} pronouns
     * @param {string} [_customPronouns] - ignored
     * @returns {Promise<void>}
     */
    async selectPronouns(pronouns, _customPronouns) {
        await this.openEditor('pronouns');
        await this.radioIn(this.selectors.pronounsGroup, pronouns).click();
        await this.save();
    }

    /**
     * Choose a gender identity and save.
     * @param {'Female'|'Male'|'Nonbinary'|'Identity not listed'|'Prefer not to disclose'|string} gender
     * @param {string} [_customGender] - ignored
     * @returns {Promise<void>}
     */
    async selectGender(gender, _customGender) {
        await this.openEditor('genderIdentity');
        await this.radioIn(this.selectors.genderGroup, gender).click();
        await this.save();
    }

    /**
     * Old API: update name parts and/or preferred name. Legal-name parts are saved on
     * edit-name, the preferred name on its own page. dateOfBirth is ignored here; use
     * openEditor('birthday') to change it deliberately.
     * @param {{ firstName?: string, middleName?: string, lastName?: string, preferredName?: string, dateOfBirth?: string }} info
     * @returns {Promise<void>}
     */
    async updatePersonalInfo(info) {
        if (info.firstName || info.middleName || info.lastName) {
            await this.openEditor('legalName');
            if (info.firstName) await this.page.locator(this.selectors.firstNameInput).fill(info.firstName);
            if (info.middleName) await this.page.locator(this.selectors.middleNameInput).fill(info.middleName);
            if (info.lastName) await this.page.locator(this.selectors.lastNameInput).fill(info.lastName);
            await this.save();
        }
        if (info.preferredName) await this.updatePreferredFirstName(info.preferredName);
    }

    /**
     * Old API: only the phone number lives on Profile now; address fields are ignored.
     * @param {{ phoneNumber?: string }} contact
     * @returns {Promise<void>}
     */
    async updateContactInfo(contact) {
        if (!contact.phoneNumber) return;
        await this.openEditor('phoneNumber');
        await this.page.locator(this.selectors.phoneNumberInput).fill(contact.phoneNumber);
        await this.save();
    }

    /**
     * Old API. Profile has no emergency contact any more; logs and does nothing.
     * @param {Record<string, string>} _contact
     * @returns {Promise<void>}
     */
    async updateEmergencyContact(_contact) {
        this.logger.warn('updateEmergencyContact: Profile has no emergency contact section');
    }

    /**
     * Old API: whether a message is shown on the page.
     * @param {string} expectedMessage
     * @returns {Promise<boolean>}
     */
    async verifyErrorMessage(expectedMessage) {
        return this.page.getByText(expectedMessage).first()
            .waitFor({ state: 'visible', timeout: this.assertionTimeout }).then(() => true).catch(() => false);
    }
}

module.exports = ProfilePage;
