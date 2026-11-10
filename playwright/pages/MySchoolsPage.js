// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for step 3 of the application wizard: "My schools"
 * (/ug-app/<applicationId>/my-schools).
 *
 * Rebuilt against the live page on 2026-11-10. Sections:
 *
 * Current or most recent high school
 *   Country -> (US) State -> City -> High school, plus optional SAIS, graduation month +
 *   year, and the name printed on the transcript (prefilled). The school is only kept
 *   after "Save school"; Continue otherwise fails with "Click 'Save school' to complete
 *   this step." Saved schools are listed in a table with Edit / "delete school", and
 *   "Add a high school" adds another.
 *
 * Colleges and universities
 *   "Have you previously attended...?" Yes/No. Yes reveals semester credits, an
 *   institution form (Country, State, City, Institution, "I am a current student",
 *   first/last attended month + year, Degree awarded, transcript name) saved with
 *   "Save institution" into an Institutions table (Edit / "delete institution",
 *   "Add a school"), and an unnamed eligibility Yes/No group under
 *   "Previous post-secondary (college/university) eligibility".
 *
 * Transcript policy
 *   "Which transcripts do I need to send?" opens a dialog; an acknowledgement checkbox
 *   is required.
 *
 * Dropdowns are custom comboboxes with a "Search..." box; options are role=option.
 */
class MySchoolsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My schools"][level=1]',

            // High school
            hsCountry: '#high_school_country_select',
            hsState: '#school_state_select',
            hsCity: '#school_city',
            hsSais: '#school_sais',
            hsName: '#school_highschool',
            hsGradMonth: '#school_graduation_date_month',
            hsGradYear: '#school_graduation_date_year',
            hsTranscriptName: '#school_transcript_name',
            saveSchoolButton: 'role=button[name="Save school"]',
            addHighSchoolButton: 'role=button[name="Add a high school"]',
            saveSchoolReminder: "text=Click 'Save school' to complete this step.",

            // Colleges and universities
            attendedCollegeGroup: 'role=radiogroup[name=/Have you previously attended/]',
            semesterCredits: '#semester_credits',
            instCountry: '#institute_country_select',
            instState: '#institute_state_select',
            instCity: '#institute_city',
            instName: '#institute_institution',
            instFirstMonth: '#institute_first_date_month',
            instFirstYear: '#institute_first_date_year',
            instLastMonth: '#institute_last_date_month',
            instLastYear: '#institute_last_date_year',
            instDegree: '#institute_degree_awarded',
            currentStudent: 'role=checkbox[name="I am a current student."]',
            saveInstitutionButton: 'role=button[name="Save institution"]',
            addInstitutionButton: 'role=button[name="Add a school"]',
            eligibilityHeading: 'role=heading[name=/Previous post-secondary \\(college\\/university\\) eligibility/]',

            // Transcript policy
            transcriptsLink: 'role=link[name="Which transcripts do I need to send?"]',
            transcriptAck: 'role=checkbox[name=/I acknowledge that I will need to submit official transcripts/]',

            // Footer / validation
            continueButton: 'button[type="submit"][form="page-form"]',
            requiredFieldError: 'text=This is a required field.',
        };

        /** Month names as the graduation/attendance dropdowns list them. */
        this.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
            'August', 'September', 'October', 'November', 'December'];
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open step 3 of the signed-in user's application.
     * @returns {Promise<void>}
     */
    async navigateToMySchools() {
        await this.gotoApplicationStep('my-schools');
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/my-schools/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * The three sections are present.
     * @returns {Promise<void>}
     */
    async validateMySchools() {
        await expect(this.page.getByRole('heading', { name: /^Current or most recent high school/ })).toBeVisible();
        await expect(this.page.getByRole('heading', { name: /^Colleges and universities/ })).toBeVisible();
        await expect(this.page.getByRole('heading', { name: 'Transcript policy' })).toBeVisible();
        await expect(this.page.locator(this.selectors.transcriptAck)).toBeVisible();
    }

    // ------------------------------------------------------------------ dropdown helpers

    /**
     * Open a dropdown and return its option labels (then close it).
     * @param {string} selector
     * @returns {Promise<string[]>}
     */
    async getDropdownOptions(selector) {
        await this.page.locator(selector).click();
        await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = (await this.page.getByRole('option').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
        await this.page.keyboard.press('Escape');
        return labels;
    }

    /**
     * Choose an option (exact label) from a dropdown, using its Search box when present.
     * With no value, the first option is chosen.
     * @param {string | import('@playwright/test').Locator} selector - CSS/role selector or a Locator
     * @param {string} [value]
     * @returns {Promise<string>} the label chosen
     */
    async choose(selector, value) {
        const box = typeof selector === 'string' ? this.page.locator(selector) : selector;
        await box.scrollIntoViewIfNeeded();
        await box.click();
        await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const label = value || (await this.page.getByRole('option').first().innerText()).trim();
        const search = this.page.getByPlaceholder('Search...');
        if (await search.isVisible().catch(() => false)) await search.fill(label);
        await this.page.getByRole('option', { name: label, exact: true }).first().click();
        return label;
    }

    /**
     * Accept "MM/YYYY", "June 2024", or { month, year }; return { month: 'June', year: '2024' }.
     * @param {string | { month: string, year: string } | undefined} date
     * @returns {{ month: string, year: string } | undefined}
     */
    toMonthYear(date) {
        if (!date) return undefined;
        if (typeof date === 'object') return date;
        const numeric = date.match(/^(\d{1,2})\/(\d{4})$/);
        if (numeric) return { month: this.MONTHS[Number(numeric[1]) - 1], year: numeric[2] };
        const named = date.match(/^([A-Za-z]+)\s+(\d{4})$/);
        if (named) return { month: named[1][0].toUpperCase() + named[1].slice(1).toLowerCase(), year: named[2] };
        throw new Error(`Unrecognised date "${date}" (use MM/YYYY or "Month YYYY")`);
    }

    // ------------------------------------------------------------------ high school

    /**
     * Month and year dropdowns that follow a date label ("Date first attended", ...).
     * @param {string} label
     * @returns {{ month: import('@playwright/test').Locator, year: import('@playwright/test').Locator }}
     */
    dateFieldsAfter(label) {
        // The high-school section precedes the college form (which reuses these labels).
        const p = this.page.getByText(label, { exact: true }).first();
        return {
            month: p.locator('xpath=following::*[@role="combobox"][1]'),
            year: p.locator('xpath=following::*[@role="combobox"][2]'),
        };
    }

    /**
     * Fill the high-school form (does not save).
     *
     * The current/most recent school asks for a graduation date; any additional school
     * asks for "Date first attended" and "Date last attended" instead. Whichever the form
     * shows is filled.
     * @param {{ country?: string, state?: string, city?: string, name?: string,
     *           graduationDate?: string | { month: string, year: string },
     *           firstAttended?: string | { month: string, year: string },
     *           lastAttended?: string | { month: string, year: string } }} data
     *   name defaults to the first school listed for the city.
     * @returns {Promise<{ country: string, state?: string, city?: string, name: string }>}
     */
    async fillHighSchool({ country = 'United States', state, city, name, graduationDate, firstAttended, lastAttended } = {}) {
        await this.choose(this.selectors.hsCountry, country);
        const chosenState = state ? await this.choose(this.selectors.hsState, state) : undefined;
        const chosenCity = city ? await this.choose(this.selectors.hsCity, city) : undefined;
        const chosenName = await this.choose(this.selectors.hsName, name);

        if (await this.page.locator(this.selectors.hsGradMonth).isVisible().catch(() => false)) {
            const grad = this.toMonthYear(graduationDate) || { month: 'May', year: String(new Date().getFullYear() + 1) };
            await this.choose(this.selectors.hsGradMonth, grad.month);
            await this.choose(this.selectors.hsGradYear, grad.year);
        } else {
            const from = this.toMonthYear(firstAttended) || { month: 'August', year: '2021' };
            const to = this.toMonthYear(lastAttended) || { month: 'May', year: '2022' };
            const first = this.dateFieldsAfter('Date first attended');
            await this.choose(first.month, from.month);
            await this.choose(first.year, from.year);
            const last = this.dateFieldsAfter('Date last attended');
            await this.choose(last.month, to.month);
            await this.choose(last.year, to.year);
        }
        return { country, state: chosenState, city: chosenCity, name: chosenName };
    }

    /**
     * @returns {Promise<void>}
     */
    async saveSchool() {
        await this.page.locator(this.selectors.saveSchoolButton).click();
        await this.page.locator(this.selectors.addHighSchoolButton).waitFor({ state: 'visible', timeout: this.navigationTimeout });
    }

    /**
     * Fill and save a high school (flow specs' entry point).
     * @param {{ country?: string, state?: string, city?: string, name?: string,
     *           graduationDate?: string | { month: string, year: string } }} data
     * @returns {Promise<{ country: string, state?: string, city?: string, name: string }>}
     */
    async addHighSchool(data) {
        if (await this.page.locator(this.selectors.addHighSchoolButton).isVisible().catch(() => false)) {
            await this.page.locator(this.selectors.addHighSchoolButton).click();
        }
        const school = await this.fillHighSchool(data);
        await this.saveSchool();
        return school;
    }

    /**
     * Names of saved high schools (from the "High school" table).
     * @returns {Promise<string[]>}
     */
    async getSavedHighSchools() {
        return this.savedRows('High school');
    }

    /**
     * Rows of a saved-schools table, identified by its column header.
     * @param {string} header - "High school" or "Institutions"
     * @returns {Promise<string[]>}
     */
    async savedRows(header) {
        const table = this.page.getByRole('table').filter({ has: this.page.getByRole('columnheader', { name: header, exact: true }) });
        if (!(await table.count())) return [];
        const cells = table.locator('tbody tr td:first-child, [role="rowgroup"]:nth-of-type(2) [role="row"] > [role="cell"]:first-child');
        return [...new Set((await cells.allInnerTexts()).map((t) => t.trim()).filter(Boolean))];
    }

    /**
     * Row of a saved school/institution.
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    savedRow(name) {
        return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name, exact: true }) });
    }

    /**
     * Open a saved high school for editing, apply changes, and save.
     * @param {string} currentName
     * @param {{ state?: string, city?: string, name?: string,
     *           graduationDate?: string | { month: string, year: string } }} updates
     * @returns {Promise<void>}
     */
    async editSchool(currentName, updates) {
        await this.savedRow(currentName).getByRole('button', { name: 'Edit', exact: true }).click();
        await this.page.locator(this.selectors.hsName).waitFor({ state: 'visible', timeout: this.assertionTimeout });
        if (updates.state) await this.choose(this.selectors.hsState, updates.state);
        if (updates.city) await this.choose(this.selectors.hsCity, updates.city);
        if (updates.name) await this.choose(this.selectors.hsName, updates.name);
        const grad = this.toMonthYear(updates.graduationDate);
        if (grad) {
            await this.choose(this.selectors.hsGradMonth, grad.month);
            await this.choose(this.selectors.hsGradYear, grad.year);
        }
        await this.saveSchool();
    }

    /**
     * Delete a saved high school or institution via its row's delete link,
     * confirming if the app asks.
     * @param {string} name
     * @returns {Promise<void>}
     */
    async removeSchool(name) {
        await this.savedRow(name).getByRole('link', { name: /^delete (school|institution)$/ }).click();
        const confirm = this.page.getByRole('dialog').or(this.page.getByRole('alertdialog')).first()
            .getByRole('button', { name: /^(delete|remove|yes|confirm)/i });
        if (await confirm.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await confirm.first().click();
        }
        await this.savedRow(name).waitFor({ state: 'detached', timeout: this.assertionTimeout });
    }

    // Older names kept for existing callers.

    /**
     * @param {{ state: string, city: string, name: string, saisNumber?: string }} data
     *   saisNumber is ignored: SAIS is optional and left empty.
     * @returns {Promise<{ country: string, state?: string, city?: string, name: string }>}
     */
    async addGraduatingSchool({ state, city, name }) {
        return this.addHighSchool({ country: 'United States', state, city, name });
    }

    /**
     * @param {{ name: string }} data
     * @returns {Promise<void>}
     */
    async validateGraduatingSchool({ name }) {
        await expect(this.savedRow(name)).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * Choose a random high-school country.
     * @returns {Promise<string>} the country chosen
     */
    async selectRandomHighSchoolCountry() {
        const countries = await this.getDropdownOptions(this.selectors.hsCountry);
        const country = countries[Math.floor(Math.random() * countries.length)];
        await this.choose(this.selectors.hsCountry, country);
        return country;
    }

    // ------------------------------------------------------------------ colleges

    /**
     * @param {boolean} attended
     * @returns {Promise<void>}
     */
    async answerAttendedCollege(attended) {
        await this.page.locator(this.selectors.attendedCollegeGroup)
            .getByRole('radio', { name: attended ? 'Yes' : 'No', exact: true }).click();
    }

    /**
     * "No" to the college question (flow specs' entry point).
     * @returns {Promise<void>}
     */
    async markNoCollegeAttended() {
        await this.answerAttendedCollege(false);
    }

    /**
     * The unnamed eligibility Yes/No group under its heading.
     * @param {boolean} [eligible]
     * @returns {Promise<void>}
     */
    async answerCollegeEligibility(eligible = true) {
        const group = this.page.locator(this.selectors.eligibilityHeading).locator('xpath=following::*[@role="radiogroup"][1]');
        await group.getByRole('radio', { name: eligible ? 'Yes' : 'No', exact: true }).click();
    }

    /**
     * Answer Yes, fill and save one institution, and answer eligibility.
     * Unspecified dropdowns take their first option.
     * @param {{ credits?: string|number, country?: string, state?: string, city?: string,
     *           institution?: string, currentStudent?: boolean,
     *           firstAttended?: string | { month: string, year: string },
     *           lastAttended?: string | { month: string, year: string },
     *           degreeAwarded?: string, eligible?: boolean }} [data]
     * @returns {Promise<{ institution: string }>}
     */
    async addCollegeOrUniversity(data = {}) {
        const {
            credits = 12, country = 'United States', state = 'Arizona', city = 'Mesa', institution,
            currentStudent = false, firstAttended = 'August 2024', lastAttended = 'May 2025',
            degreeAwarded = 'No Degree Awarded', eligible = true,
        } = data;
        await this.answerAttendedCollege(true);
        const add = this.page.locator(this.selectors.addInstitutionButton);
        if (await add.isVisible().catch(() => false)) await add.click();
        await this.page.locator(this.selectors.semesterCredits).fill(String(credits));
        await this.choose(this.selectors.instCountry, country);
        await this.choose(this.selectors.instState, state);
        await this.choose(this.selectors.instCity, city);
        const name = await this.choose(this.selectors.instName, institution);
        if (currentStudent) await this.page.locator(this.selectors.currentStudent).click();
        const first = this.toMonthYear(firstAttended);
        if (first) {
            await this.choose(this.selectors.instFirstMonth, first.month);
            await this.choose(this.selectors.instFirstYear, first.year);
        }
        const last = this.toMonthYear(lastAttended);
        if (last) {
            await this.choose(this.selectors.instLastMonth, last.month);
            await this.choose(this.selectors.instLastYear, last.year);
        }
        await this.choose(this.selectors.instDegree, degreeAwarded);
        await this.page.locator(this.selectors.saveInstitutionButton).click();
        await this.savedRow(name).waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await this.answerCollegeEligibility(eligible);
        return { institution: name };
    }

    /**
     * Names of saved institutions (from the "Institutions" table).
     * @returns {Promise<string[]>}
     */
    async getSavedInstitutions() {
        return this.savedRows('Institutions');
    }

    // ------------------------------------------------------------------ transcripts

    /**
     * @returns {Promise<void>}
     */
    async acknowledgeTranscripts() {
        const ack = this.page.locator(this.selectors.transcriptAck);
        if (!(await ack.isChecked().catch(() => false))) await ack.click();
        await expect(ack).toBeChecked({ timeout: this.assertionTimeout });
    }

    /**
     * Tick every acknowledgement checkbox on the page ("I acknowledge...",
     * "I understand..."). Nondegree/visiting applicants may see extra ones.
     * NOTE: the nondegree variants haven't been seen live yet; this ticks whatever
     * acknowledgement boxes are shown.
     * @returns {Promise<number>} how many were ticked
     */
    async acknowledgeNDGVUSCheckboxes() {
        const boxes = this.page.getByRole('checkbox', { name: /^I (acknowledge|understand)/ });
        let ticked = 0;
        for (let i = 0; i < await boxes.count(); i++) {
            const box = boxes.nth(i);
            if (await box.isVisible() && !(await box.isChecked())) {
                await box.click();
                ticked++;
            }
        }
        return ticked;
    }

    /**
     * Open "Which transcripts do I need to send?" and return the dialog text.
     * @returns {Promise<string>}
     */
    async openTranscriptRequirements() {
        await this.page.locator(this.selectors.transcriptsLink).click();
        const dialog = this.page.getByRole('dialog').filter({ hasText: 'Transcript Requirements' });
        await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * @returns {Promise<void>}
     */
    async closeDialog() {
        const dialog = this.page.getByRole('dialog').first();
        await dialog.getByRole('button', { name: 'Back', exact: true }).click();
        await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
    }

    /**
     * HiSET/GED is not offered as a separate path on this step as of 2026-11-10
     * (the high-school form has no GED option). Kept so flow specs fail clearly.
     * @param {Record<string, any>} _data
     * @returns {Promise<never>}
     */
    async addHiSetGED(_data) {
        throw new Error('addHiSetGED: no HiSET/GED entry exists on the live My schools step; map it once the app team confirms where GED is captured.');
    }

    // ------------------------------------------------------------------ footer

    /**
     * @param {string} [expectedMessage]
     * @returns {Promise<void>}
     */
    async verifyErrorMessage(expectedMessage = 'This is a required field.') {
        await expect(this.page.getByText(expectedMessage).first()).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * @returns {Promise<void>}
     */
    async clickContinue() {
        await this.page.locator(this.selectors.continueButton).click();
    }

    /**
     * Continue to step 4, My high school grades.
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.clickContinue();
        await this.page.waitForURL(/\/ug-app\/\d+\/my-high-school-grades/, { timeout: this.navigationTimeout });
    }
}

module.exports = MySchoolsPage;
