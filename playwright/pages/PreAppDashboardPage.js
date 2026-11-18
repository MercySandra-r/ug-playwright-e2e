// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

/**
 * Page Object for the pre-application dashboard (/dashboard before any application):
 * "Welcome! You're a few steps away from becoming a Sun Devil."
 *
 * Rebuilt against the live page on 2026-11-11 (new account asuqa0045):
 *  - Legal name: First name, Preferred first name (optional), Middle name (optional),
 *    Last name, Suffix (optional dropdown)
 *  - Contact email: the account's email, shown read-only (its Edit button is disabled)
 *  - Birthday: Month / Day / Year dropdowns; years run from 5 years ago back 100 years
 *  - Phone number: country code (+1 default) and number; "Is this a mobile number?" and
 *    an SMS opt-in can follow once a number is entered
 *  - "Start new application", then the Application FAQ accordion
 * Empty submit flags first name, last name, birthday ("This is a required field.") and
 * phone ("Phone number is required"); a short number gives "Enter a valid phone number."
 * After "Start new application" a BriteVerify dialog may question the contact details
 * ("could not be verified"); submitting as is is the normal path.
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (an option, a radio, an FAQ question,
 * the learning-mode radio) come from the locator methods below. Specs use these names
 * and the read-back methods, never their own locators.
 */
class PreAppDashboardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'PreAppDashboardPage');

        this.selectors = {
            welcomeHeading: 'role=heading[name=/^Welcome! You.re a few steps away from becoming a Sun Devil/][level=1]',
            introText: 'text=Begin your new application by providing your legal name, birthday and phone number.',
            profileMenu: 'role=button[name="Profile menu"]',

            // Legal name
            firstNameInput: 'role=textbox[name="First name"s]',
            preferredFirstNameInput: 'role=textbox[name="Preferred first name (Optional)"]',
            middleNameInput: 'role=textbox[name="Middle name (Optional)"]',
            lastNameInput: 'role=textbox[name="Last name"s]',
            suffixSelect: 'role=combobox[name=/^Suffix/]',

            // Contact email (read-only here; edited in Profile)
            contactEmailLabel: 'text=Contact email',
            contactEmailEditButton: 'role=button[name="Edit"s]',

            // Birthday
            birthdayGroup: 'role=group[name=/^Birthday/]',
            birthMonthSelect: 'role=combobox[name="Month"s]',
            birthDaySelect: 'role=combobox[name="Day"s]',
            birthYearSelect: 'role=combobox[name="Year"s]',

            // Phone
            phoneHeading: 'role=heading[name="Phone number"][level=3]',
            countryCodeInput: 'role=textbox[name="Country code"]',
            phoneNumberInput: 'role=textbox[name="Phone number"s]',
            mobileGroup: 'role=radiogroup[name="Is this a mobile number?"]',
            smsGroup: 'role=radiogroup[name=/SMS messaging/]',

            // Start, FAQ
            startNewAppButton: 'role=button[name="Start new application"]',
            faqHeading: 'role=heading[name="Application FAQ"][level=2]',

            // Dropdown options
            option: 'role=option',

            // Learning-mode modal (accounts that skipped the landing-page choice)
            degreeRadio: '[role="radio"][value="DG"]',
            modalContinueButton: 'role=button[name="Continue"s]',

            // BriteVerify dialog after Start new application
            alertDialog: 'role=alertdialog',

            // Messages
            requiredFieldError: 'text=This is a required field.',
            phoneRequiredError: 'text=Phone number is required',
            invalidPhoneError: 'text=Enter a valid phone number.',
        };

        this.MONTHS = MONTHS;
        this.currentYear = new Date().getFullYear();
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * An open list's option by exact label (or the first option when none given).
     * @param {string} [label]
     * @returns {import('@playwright/test').Locator}
     */
    option(label) {
        return label
            ? this.page.getByRole('option', { name: label, exact: true }).first()
            : this.page.locator(this.selectors.option).first();
    }

    /**
     * A radio by exact label inside one of the page's radio groups.
     * @param {string} groupSelector - e.g. this.selectors.mobileGroup
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    radioIn(groupSelector, label) {
        return this.page.locator(groupSelector).getByRole('radio', { name: label, exact: true });
    }

    /**
     * Learning-mode radio in the modal some accounts see first.
     * @param {'online'|'in-person'|string} mode
     * @returns {import('@playwright/test').Locator}
     */
    learningModeRadio(mode) {
        return this.page.locator(`[role="radio"][value="${mode}"]`);
    }

    /**
     * An Application FAQ question (a disclosure button).
     * @param {string} question
     * @returns {import('@playwright/test').Locator}
     */
    faqQuestion(question) {
        return this.page.getByRole('button', { name: question, exact: true });
    }

    /**
     * The contact email as shown on the form.
     * @param {string} email
     * @returns {import('@playwright/test').Locator}
     */
    contactEmailText(email) {
        return this.page.getByText(email, { exact: true });
    }

    /**
     * The BriteVerify "could not be verified" dialog.
     * @returns {import('@playwright/test').Locator}
     */
    briteVerifyDialog() {
        return this.page.locator(this.selectors.alertDialog).filter({ hasText: 'could not be verified' });
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open the pre-app dashboard. Accounts that signed in (rather than coming from the
     * landing page's learning-mode choice) first get "How would you like to attend ASU?";
     * it is answered with `mode`.
     * @param {'online'|'in-person'|'asu-local'} [mode]
     * @returns {Promise<void>}
     */
    async navigateToDashboard(mode = 'online') {
        await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        await this.answerLearningModeIfAsked(mode);
        await this.verifyPageLoaded();
        // The form re-initialises shortly after load and can wipe values typed too early.
        await this.settle();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/dashboard/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.welcomeHeading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * Every part of the form is shown, plus Start new application and the FAQ.
     * @returns {Promise<void>}
     */
    async verifyFormVisible() {
        const s = this.selectors;
        for (const selector of [s.introText, s.firstNameInput, s.preferredFirstNameInput, s.middleNameInput, s.lastNameInput,
            s.suffixSelect, s.contactEmailLabel, s.birthdayGroup, s.birthMonthSelect, s.birthDaySelect, s.birthYearSelect,
            s.phoneHeading, s.countryCodeInput, s.phoneNumberInput, s.startNewAppButton, s.faqHeading]) {
            await expect(this.page.locator(selector).first(), selector).toBeVisible({ timeout: this.assertionTimeout });
        }
    }

    /**
     * The account's email is shown as the contact email and can't be edited here.
     * @param {string} email
     * @returns {Promise<void>}
     */
    async verifyContactEmail(email) {
        await expect(this.contactEmailText(email).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.contactEmailEditButton).first()).toBeDisabled();
    }

    // ------------------------------------------------------------------ dropdowns

    /**
     * Pick an option from one of the page's dropdowns.
     * @param {string} selector
     * @param {string} value - exact option label
     * @returns {Promise<void>}
     */
    async chooseFromDropdown(selector, value) {
        await this.page.locator(selector).click();
        await this.option(value).click();
    }

    /**
     * Option labels of a dropdown (closes it again).
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

    /** @returns {Promise<string[]>} */
    async getSuffixOptions() { return this.getDropdownOptions(this.selectors.suffixSelect); }

    /** @returns {Promise<string[]>} birth years offered, newest first */
    async getBirthYearOptions() { return this.getDropdownOptions(this.selectors.birthYearSelect); }

    // ------------------------------------------------------------------ legal name

    /**
     * Fill the legal name (optional parts only when given).
     * @param {{ firstName: string, preferredFirstName?: string, middleName?: string,
     *           lastName: string, suffix?: string }} data
     * @returns {Promise<void>}
     */
    async fillPersonalInformation({ firstName, preferredFirstName, middleName, lastName, suffix }) {
        await this.page.locator(this.selectors.firstNameInput).fill(firstName);
        if (preferredFirstName) await this.page.locator(this.selectors.preferredFirstNameInput).fill(preferredFirstName);
        if (middleName) await this.page.locator(this.selectors.middleNameInput).fill(middleName);
        await this.page.locator(this.selectors.lastNameInput).fill(lastName);
        if (suffix) await this.chooseFromDropdown(this.selectors.suffixSelect, suffix);
    }

    // ------------------------------------------------------------------ birthday

    /**
     * Set the birthday. Month may be a name ("June") or number (6).
     * @param {{ month: string|number, day: string|number, year: string|number }} date
     * @returns {Promise<void>}
     */
    async setDateOfBirth({ month, day, year }) {
        const monthName = /^\d+$/.test(String(month)) ? MONTHS[Number(month) - 1] : String(month);
        await this.chooseFromDropdown(this.selectors.birthMonthSelect, monthName);
        await this.chooseFromDropdown(this.selectors.birthDaySelect, String(Number(day)));
        await this.chooseFromDropdown(this.selectors.birthYearSelect, String(year));
    }

    /**
     * A random birthday for someone `age` years old (day 1-28 to suit every month).
     * @param {number} age
     * @returns {{ month: string, day: number, year: number }}
     */
    generateRandomBirthDateForAge(age) {
        return {
            month: MONTHS[Math.floor(Math.random() * 12)],
            day: Math.floor(Math.random() * 28) + 1,
            year: this.currentYear - age,
        };
    }

    /**
     * @param {number} minAge
     * @param {number} maxAge
     * @returns {Promise<{ month: string, day: number, year: number }>}
     */
    async setDateOfBirthForAgeBetween(minAge, maxAge) {
        const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
        const date = this.generateRandomBirthDateForAge(age);
        await this.setDateOfBirth(date);
        return date;
    }

    /** Age 25-35. @returns {Promise<{ month: string, day: number, year: number }>} */
    async setDateOfBirthForAdult() { return this.setDateOfBirthForAgeBetween(25, 35); }

    /** Age 18-24. @returns {Promise<{ month: string, day: number, year: number }>} */
    async setDateOfBirthForYoungAdult() { return this.setDateOfBirthForAgeBetween(18, 24); }

    /** Age 18 by birth year. @returns {Promise<{ month: string, day: number, year: number }>} */
    async setDateOfBirthForExactly18() { return this.setDateOfBirthForAgeBetween(18, 18); }

    /** Age 16-17. @returns {Promise<{ month: string, day: number, year: number }>} */
    async setDateOfBirthForMinor() { return this.setDateOfBirthForAgeBetween(16, 17); }

    // ------------------------------------------------------------------ phone

    /**
     * Enter the phone number and answer the follow-ups if they appear: mobile (Yes for
     * phoneType 'Mobile') and SMS (always No, so nothing is texted to test numbers).
     * The contact email can't be edited here; `email` is ignored.
     * @param {{ email?: string, phoneNumber: string, phoneType?: string, countryCode?: string }} data
     * @returns {Promise<void>}
     */
    async fillContactInformation({ phoneNumber, phoneType = 'Mobile' }) {
        await this.fillPhone(phoneNumber);
        const mobile = this.page.locator(this.selectors.mobileGroup);
        const isMobile = /mobile/i.test(phoneType);
        if (await mobile.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            // The phone section can re-render as it settles and drop the answer; re-click until it sticks.
            const answer = this.radioIn(this.selectors.mobileGroup, isMobile ? 'Yes' : 'No');
            for (let attempt = 0; attempt < 3; attempt++) {
                await answer.click();
                if (await expect(answer).toHaveAttribute('aria-checked', 'true', { timeout: 2000 }).then(() => true).catch(() => false)) break;
            }
            await expect(answer).toHaveAttribute('aria-checked', 'true', { timeout: this.assertionTimeout });
        }
        // The SMS question (and its terms) renders a moment after "mobile: Yes" and pushes
        // the Start button down; wait for it so nothing shifts under the next click.
        const sms = this.page.locator(this.selectors.smsGroup);
        if (await sms.waitFor({ state: 'visible', timeout: isMobile ? 5000 : 1500 }).then(() => true).catch(() => false)) {
            await this.radioIn(this.selectors.smsGroup, 'No').click();
            await expect(this.radioIn(this.selectors.smsGroup, 'No')).toHaveAttribute('aria-checked', 'true', { timeout: this.assertionTimeout });
        }
    }

    /**
     * Type a phone number and make sure it stuck (the formatted field can drop input
     * typed while the form is still initialising).
     * @param {string} phone - digits, e.g. "2025551234"
     * @returns {Promise<void>}
     */
    async fillPhone(phone) {
        const box = this.page.locator(this.selectors.phoneNumberInput);
        const digits = phone.replace(/\D/g, '');
        for (let attempt = 0; attempt < 3; attempt++) {
            await box.fill(phone);
            await box.blur();
            if ((await box.inputValue()).replace(/\D/g, '') === digits) return;
            await this.page.waitForTimeout(1000);
        }
        throw new Error(`Phone number field did not keep "${phone}" (shows "${await box.inputValue()}")`);
    }

    /**
     * Rough E.164 check of a phone number (no page interaction).
     * @param {string} phone
     * @param {string} [_countryCode]
     * @returns {Promise<boolean>}
     */
    async isValidPhoneNumber(phone, _countryCode = 'US') {
        return /^\+?[1-9]\d{1,14}$/.test(phone);
    }

    // ------------------------------------------------------------------ read-back and validation

    /**
     * What the form currently shows.
     * @returns {Promise<{ firstName: string, preferredFirstName: string, middleName: string,
     *   lastName: string, suffix: string, birth: { month: string, day: string, year: string },
     *   countryCode: string, phone: string }>}
     */
    async readFormValues() {
        const value = (/** @type {string} */ selector) => this.page.locator(selector).first().inputValue();
        return {
            firstName: await value(this.selectors.firstNameInput),
            preferredFirstName: await value(this.selectors.preferredFirstNameInput),
            middleName: await value(this.selectors.middleNameInput),
            lastName: await value(this.selectors.lastNameInput),
            suffix: await value(this.selectors.suffixSelect),
            birth: {
                month: await value(this.selectors.birthMonthSelect),
                day: await value(this.selectors.birthDaySelect),
                year: await value(this.selectors.birthYearSelect),
            },
            countryCode: await value(this.selectors.countryCodeInput),
            phone: (await value(this.selectors.phoneNumberInput)).replace(/\D/g, ''),
        };
    }

    /**
     * Start new application on the empty form: first name, last name and birthday are
     * flagged as required, the phone as "Phone number is required", and the page stays.
     * @returns {Promise<void>}
     */
    async verifyRequiredFieldErrors() {
        await this.page.locator(this.selectors.startNewAppButton).click();
        await expect(this.page.locator(this.selectors.phoneRequiredError)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.requiredFieldError)).toHaveCount(3);
        await expect(this.page).toHaveURL(/\/dashboard/);
    }

    /**
     * An invalid phone number is flagged on submit. Only the phone is filled, so the
     * click can't start an application; the page must stay on the dashboard.
     * @param {string} phone - e.g. "123"
     * @returns {Promise<void>}
     */
    async verifyInvalidPhoneError(phone) {
        await this.fillPhone(phone);
        await this.page.locator(this.selectors.startNewAppButton).click();
        await expect(this.page.locator(this.selectors.invalidPhoneError)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/dashboard/);
    }

    /**
     * Whether a message is shown anywhere on the form (old API; fieldName is ignored).
     * @param {string} _fieldName
     * @param {string} expectedMessage
     * @returns {Promise<boolean>}
     */
    async verifyFieldError(_fieldName, expectedMessage) {
        return this.page.getByText(expectedMessage).first().isVisible().catch(() => false);
    }

    // ------------------------------------------------------------------ FAQ

    /**
     * Expand an FAQ question and return its answer text.
     * @param {string} question - e.g. "Is there an application fee?"
     * @returns {Promise<string>}
     */
    async expandFaq(question) {
        const button = this.faqQuestion(question);
        if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
        await expect(button).toHaveAttribute('aria-expanded', 'true', { timeout: this.assertionTimeout });
        const panelId = await button.getAttribute('aria-controls');
        const panel = panelId ? this.page.locator(`[id="${panelId}"]`) : button.locator('xpath=following-sibling::*[1]');
        await expect(panel).toBeVisible({ timeout: this.assertionTimeout });
        return (await panel.innerText()).replace(/\s+/g, ' ').trim();
    }

    // ------------------------------------------------------------------ start an application

    /**
     * Answer the learning-mode modal if it is shown over the form.
     * @param {'online'|'in-person'|'asu-local'} mode
     * @returns {Promise<void>}
     */
    async answerLearningModeIfAsked(mode) {
        const firstName = this.page.locator(this.selectors.firstNameInput);
        const modeRadio = this.learningModeRadio(mode);
        // Whichever appears first: the form itself, or the learning-mode modal over it.
        await firstName.or(modeRadio).first().waitFor({ state: 'visible', timeout: this.navigationTimeout });
        if (await modeRadio.isVisible().catch(() => false)) {
            await modeRadio.click();
            const degree = this.page.locator(this.selectors.degreeRadio);
            if (await degree.isVisible().catch(() => false)) await degree.click();
            await this.page.locator(this.selectors.modalContinueButton).click();
        }
        await firstName.waitFor({ state: 'visible', timeout: this.navigationTimeout });
    }

    /**
     * Fill the pre-app dashboard and start an application. Handles the learning-mode
     * modal and the BriteVerify dialog. Answers "No" to SMS so nothing is texted.
     * @param {{ firstName?: string, preferredFirstName?: string, middleName?: string,
     *           lastName?: string, suffix?: string,
     *           birth?: { month: string, day: string, year: string },
     *           phone?: string, mode?: 'online'|'in-person'|'asu-local', captureValidations?: boolean }} [data]
     *   captureValidations: click Start new application on the empty form first and record the
     *   field validations (see BasePage.captureFieldValidations)
     * @returns {Promise<string>} the new application's ID
     */
    async startApplication(data = {}) {
        const {
            firstName = 'Qa',
            lastName = 'Automation',
            preferredFirstName,
            middleName,
            suffix,
            birth = { month: 'June', day: '15', year: '2000' },
            phone = '2025551234',
            mode = 'online',
            captureValidations = false,
        } = data;

        if (!/\/dashboard/.test(this.page.url())) {
            await this.page.goto('/dashboard', { timeout: this.navigationTimeout });
        }
        await this.answerLearningModeIfAsked(mode);

        const startButton = this.page.locator(this.selectors.startNewAppButton);
        if (captureValidations) {
            // Click Start new application on the empty form first and record what it flags,
            // then reload: filling the form that just failed validation can lose answers
            // (the phone section re-renders and drops the mobile/SMS choice).
            await this.captureFieldValidations({ stepName: 'Start new application', button: startButton });
            await this.navigateToDashboard(mode);
        }
        await this.fillPersonalInformation({ firstName, preferredFirstName, middleName, lastName, suffix });
        await this.setDateOfBirth(birth);
        await this.fillContactInformation({ phoneNumber: phone, phoneType: 'Mobile' });

        // The form sometimes re-renders while the later fields are filled and drops the
        // names typed first (Start then fails with "This is a required field" on both).
        // Check them just before Start and type them again if they were lost.
        for (let attempt = 0; attempt < 3; attempt++) {
            const typedFirst = await this.page.locator(this.selectors.firstNameInput).inputValue();
            const typedLast = await this.page.locator(this.selectors.lastNameInput).inputValue();
            if (typedFirst === firstName && typedLast === lastName) break;
            this.logger.warn('Pre-app names were cleared by a re-render; typing them again');
            await this.fillPersonalInformation({ firstName, preferredFirstName, middleName, lastName, suffix });
            await this.page.waitForTimeout(500);
        }

        await startButton.scrollIntoViewIfNeeded();
        await startButton.click();
        await this.handleBriteVerifyPopup('submit');
        await this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: 45000 });
        const match = this.page.url().match(/\/ug-app\/(\d+)\//);
        if (!match) throw new Error(`Application did not start; at ${this.page.url()}`);
        this.logger.info(`Started application ${match[1]}`);
        await require('../utils/accountLog').recordApplication(this.page, match[1]);
        return match[1];
    }

    /**
     * Click "Start new application" (old API: the form must already be filled) and
     * answer BriteVerify if it asks.
     * @returns {Promise<void>}
     */
    async startNewApplication() {
        await this.page.locator(this.selectors.startNewAppButton).click();
        await this.handleBriteVerifyPopup('submit');
        await this.settle();
    }

    /**
     * Old API: every action submits the form with "Start new application".
     * @param {'save'|'continue'|'submit'} [_action]
     * @returns {Promise<void>}
     */
    async submitForm(_action = 'continue') {
        await this.startNewApplication();
    }

    /**
     * Handle the BriteVerify dialog that can appear after "Start new application":
     * "The following information you provided could not be verified. Please review:"
     * with "Go back and change" / "Submit". This is expected app behaviour (it checks
     * contact details such as the phone number), and it doesn't always appear.
     * @param {'submit'|'change'} [action='submit'] - "Submit" as is, or "Go back and change".
     * @param {number} [timeoutMs=20000] - How long to wait for the dialog to show up.
     * @returns {Promise<boolean>} true if the dialog appeared and was answered.
     */
    async handleBriteVerifyPopup(action = 'submit', timeoutMs = 20000) {
        const dialog = this.briteVerifyDialog();
        const shown = await dialog
            .waitFor({ state: 'visible', timeout: timeoutMs })
            .then(() => true)
            .catch(() => false);
        if (!shown) return false;

        const button = action === 'change' ? 'Go back and change' : 'Submit';
        this.logger.info(`BriteVerify dialog shown; clicking "${button}"`);
        await dialog.getByRole('button', { name: button, exact: true }).click();
        await dialog.waitFor({ state: 'hidden', timeout: this.navigationTimeout }).catch(() => {});
        return true;
    }

    /**
     * Whether the application wizard opened (/ug-app/<applicationId>/<step>).
     * @returns {Promise<boolean>}
     */
    async isApplicationStarted() {
        return this.page.waitForURL(/\/ug-app\/\d+\//, { timeout: 45000 }).then(() => true).catch(() => false);
    }
}

module.exports = PreAppDashboardPage;
