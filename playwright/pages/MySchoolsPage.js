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
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (a saved row, a saved-schools table,
 * date fields after a label, an option by label) come from the locator methods below.
 * Specs use these names and the read-back methods, never their own locators.
 */
class MySchoolsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My schools"][level=1]',
            highSchoolHeading: 'role=heading[name=/^Current or most recent high school/]',
            collegesHeading: 'role=heading[name=/^Colleges and universities/]',
            transcriptHeading: 'role=heading[name="Transcript policy"]',

            // Dropdown parts
            option: 'role=option',
            dropdownSearch: 'input[placeholder="Search..."]',
            radio: 'role=radio',
            // From a date label ("Date first attended") to its month and year dropdowns.
            monthAfterLabel: 'xpath=following::*[@role="combobox"][1]',
            yearAfterLabel: 'xpath=following::*[@role="combobox"][2]',

            // Saved-schools tables (High school / Institutions)
            table: 'role=table',
            row: 'role=row',
            savedNameCells: 'tbody tr td:first-child, [role="rowgroup"]:nth-of-type(2) [role="row"] > [role="cell"]:first-child',
            rowEditButton: 'role=button[name="Edit"s]',
            rowDeleteLink: 'role=link[name=/^delete (school|institution)$/]',
            dialog: 'role=dialog',
            alertDialog: 'role=alertdialog',
            confirmDeleteButton: 'role=button[name=/^(delete|remove|yes|confirm)/i]',
            dialogBackButton: 'role=button[name="Back"s]',

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
            // The eligibility Yes/No group has no name; it is the first radio group after its heading.
            eligibilityGroupAfterHeading: 'xpath=following::*[@role="radiogroup"][1]',

            // Transcript policy
            transcriptsLink: 'role=link[name="Which transcripts do I need to send?"]',
            transcriptAck: 'role=checkbox[name=/I acknowledge that I will need to submit official transcripts/]',
            acknowledgementCheckboxes: 'role=checkbox[name=/^I (acknowledge|understand)/]',

            // Footer / validation
            continueButton: 'button[type="submit"][form="page-form"]',
            requiredFieldError: 'text=This is a required field.',
        };

        /** Month names as the graduation/attendance dropdowns list them. */
        this.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
            'August', 'September', 'October', 'November', 'December'];
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
     * A radio by exact label inside a scope.
     * @param {import('@playwright/test').Locator} scope
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    radioIn(scope, label) {
        return scope.getByRole('radio', { name: label, exact: true });
    }

    /**
     * Month and year dropdowns that follow a date label ("Date first attended", ...).
     * @param {string} label
     * @returns {{ month: import('@playwright/test').Locator, year: import('@playwright/test').Locator }}
     */
    dateFieldsAfter(label) {
        // The high-school section precedes the college form (which reuses these labels).
        const p = this.page.getByText(label, { exact: true }).first();
        return {
            month: p.locator(this.selectors.monthAfterLabel),
            year: p.locator(this.selectors.yearAfterLabel),
        };
    }

    /**
     * A saved-schools table, identified by its column header.
     * @param {string} header - "High school" or "Institutions"
     * @returns {import('@playwright/test').Locator}
     */
    savedTable(header) {
        return this.page.locator(this.selectors.table)
            .filter({ has: this.page.getByRole('columnheader', { name: header, exact: true }) });
    }

    /**
     * Row of a saved school/institution.
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    savedRow(name) {
        return this.page.locator(this.selectors.row).filter({ has: this.page.getByRole('cell', { name, exact: true }) });
    }

    /**
     * The "Transcript Requirements" dialog.
     * @returns {import('@playwright/test').Locator}
     */
    transcriptDialog() {
        return this.page.locator(this.selectors.dialog).filter({ hasText: 'Transcript Requirements' });
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
        const s = this.selectors;
        for (const selector of [s.highSchoolHeading, s.hsCountry, s.collegesHeading, s.attendedCollegeGroup, s.transcriptHeading, s.transcriptAck]) {
            await expect(this.page.locator(selector).first(), selector).toBeVisible({ timeout: this.assertionTimeout });
        }
    }

    // ------------------------------------------------------------------ dropdown helpers

    /**
     * Open a dropdown and return its option labels (then close it).
     * @param {string} selector
     * @returns {Promise<string[]>}
     */
    async getDropdownOptions(selector) {
        // Close any list left open (e.g. the city list right after choosing a city), then
        // read only this dropdown's own list (its aria-controls), not another one's options.
        await this.page.keyboard.press('Escape');
        await this.page.locator(this.selectors.option).first().waitFor({ state: 'hidden', timeout: this.assertionTimeout }).catch(() => {});
        const box = this.page.locator(selector);
        await box.click();
        const listId = await box.getAttribute('aria-controls');
        const options = listId
            ? this.page.locator(`[id="${listId}"]`).locator(this.selectors.option)
            : this.page.locator(this.selectors.option);
        await options.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = (await options.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
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
        await this.option().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const label = value || (await this.option().innerText()).trim();
        const search = this.page.locator(this.selectors.dropdownSearch);
        if (await search.isVisible().catch(() => false)) await search.fill(label);
        await this.option(label).click();
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
     *           graduationDate?: string | { month: string, year: string },
     *           firstAttended?: string | { month: string, year: string },
     *           lastAttended?: string | { month: string, year: string } }} data
     *   graduationDate is used for the current school, first/last attended for previous ones
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
        const table = this.savedTable(header);
        if (!(await table.count())) return [];
        const cells = table.locator(this.selectors.savedNameCells);
        return [...new Set((await cells.allInnerTexts()).map((t) => t.trim()).filter(Boolean))];
    }

    /**
     * Open a saved high school for editing, apply changes, and save.
     * @param {string} currentName
     * @param {{ state?: string, city?: string, name?: string,
     *           graduationDate?: string | { month: string, year: string } }} updates
     * @returns {Promise<void>}
     */
    async editSchool(currentName, updates) {
        await this.savedRow(currentName).locator(this.selectors.rowEditButton).click();
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
        await this.savedRow(name).locator(this.selectors.rowDeleteLink).click();
        const confirm = this.page.locator(this.selectors.dialog).or(this.page.locator(this.selectors.alertDialog)).first()
            .locator(this.selectors.confirmDeleteButton);
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
        await this.radioIn(this.page.locator(this.selectors.attendedCollegeGroup), attended ? 'Yes' : 'No').click();
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
        const group = this.page.locator(this.selectors.eligibilityHeading).locator(this.selectors.eligibilityGroupAfterHeading);
        await this.radioIn(group, eligible ? 'Yes' : 'No').click();
    }

    /**
     * Answer Yes, fill and save one institution, and answer eligibility.
     * Unspecified dropdowns take their first option.
     * @param {{ credits?: string|number, country?: string, state?: string, city?: string,
     *           institution?: string, currentStudent?: boolean,
     *           firstAttended?: string | { month: string, year: string },
     *           lastAttended?: string | { month: string, year: string },
     *           degreeAwarded?: string, eligible?: boolean, excludeInstitutions?: string[] }} [data]
     *   excludeInstitutions: with no institution given, pick the first listed one not in this list
     * @returns {Promise<{ institution: string }>}
     */
    async addCollegeOrUniversity(data = {}) {
        const {
            credits = 12, country = 'United States', state = 'Arizona', city = 'Mesa', institution,
            currentStudent = false, firstAttended = 'August 2024', lastAttended = 'May 2025',
            degreeAwarded = 'No Degree Awarded', eligible = true, excludeInstitutions = [],
        } = data;
        await this.answerAttendedCollege(true);
        const add = this.page.locator(this.selectors.addInstitutionButton);
        if (await add.isVisible().catch(() => false)) await add.click();
        const creditsBox = this.page.locator(this.selectors.semesterCredits);
        if (await creditsBox.isVisible().catch(() => false)) await creditsBox.fill(String(credits));
        await this.choose(this.selectors.instCountry, country);
        await this.choose(this.selectors.instState, state);
        await this.choose(this.selectors.instCity, city);
        let target = institution;
        if (!target) {
            // The institution list reloads for the chosen city; read it once it has settled, and
            // from this dropdown's own list. Picking "the first option" straight away can take
            // the city list that is still on screen (e.g. "Ajo", the first Arizona city).
            await this.settle(5000);
            const listed = await this.getDropdownOptions(this.selectors.instName);
            target = listed.find((n) => !excludeInstitutions.includes(n));
            if (!target) throw new Error(`No institution listed for ${city}, ${state} beyond ${excludeInstitutions.length} already saved`);
        }
        const name = await this.choose(this.selectors.instName, target);
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

    // ------------------------------------------------------------------ several schools at once

    /**
     * Open an empty high-school form (the first one is open by default; later ones are
     * behind "Add a high school").
     * @returns {Promise<void>}
     */
    async openHighSchoolForm() {
        const add = this.page.locator(this.selectors.addHighSchoolButton);
        const country = this.page.locator(this.selectors.hsCountry);
        // A click right after a dialog closes can be swallowed; retry until the form shows.
        for (let attempt = 0; attempt < 3 && !(await country.isVisible().catch(() => false)); attempt++) {
            if (await add.isVisible().catch(() => false)) {
                await add.scrollIntoViewIfNeeded();
                await add.click();
            }
            await country.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        }
        await country.waitFor({ state: 'visible', timeout: this.assertionTimeout });
    }

    /**
     * Add high schools until `total` are saved, choosing different schools from the
     * site's list for the city and different attendance years for each. The first saved
     * school is the current one (graduation date); the rest are previous schools.
     * @param {number} total - e.g. 5
     * @param {{ country?: string, state?: string, city?: string }} [where]
     * @returns {Promise<string[]>} names of the schools this call added
     */
    async addHighSchools(total, { country = 'United States', state = 'Arizona', city = 'Tempe' } = {}) {
        await this.openHighSchoolForm();
        await this.choose(this.selectors.hsCountry, country);
        await this.choose(this.selectors.hsState, state);
        await this.choose(this.selectors.hsCity, city);
        const listed = await this.getDropdownOptions(this.selectors.hsName);
        /** @type {string[]} */
        const added = [];
        // Re-count before each addition (the table can render late), and stop at `total`.
        for (let i = 0; (await this.getSavedHighSchools()).length < total; i++) {
            const saved = await this.getSavedHighSchools();
            const available = listed.filter((n) => !saved.includes(n));
            if (!available.length) throw new Error(`No more high schools listed for ${city}, ${state}`);
            const year = 2017 + i; // a different year range per previous school
            await this.addHighSchool({
                country, state, city, name: available[0],
                graduationDate: 'May 2026',
                firstAttended: { month: 'August', year: String(year) },
                lastAttended: { month: 'May', year: String(year + 1) },
            });
            added.push(available[0]);
        }
        return added;
    }

    /**
     * Answer Yes to the college question and add institutions until `total` are saved,
     * choosing different institutions from the site's list and different dates for each.
     * @param {number} total - e.g. 5
     * @param {{ state?: string, city?: string }} [where]
     * @returns {Promise<string[]>} names of the institutions this call added
     */
    async addColleges(total, { state = 'Arizona', city = 'Mesa' } = {}) {
        /** @type {string[]} */
        const added = [];
        // Re-count before each addition (the table can render late), and stop at `total`.
        for (let i = 0; (await this.getSavedInstitutions()).length < total; i++) {
            const saved = await this.getSavedInstitutions();
            const year = 2019 + i;
            const { institution } = await this.addCollegeOrUniversity({
                state, city, excludeInstitutions: [...saved, ...added, ''],
                firstAttended: { month: 'August', year: String(year) },
                lastAttended: { month: 'May', year: String(year + 1) },
            });
            added.push(institution);
        }
        return added;
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
        const boxes = this.page.locator(this.selectors.acknowledgementCheckboxes);
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
        const dialog = this.transcriptDialog();
        await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * @returns {Promise<void>}
     */
    async closeDialog() {
        const dialog = this.page.locator(this.selectors.dialog).first();
        await dialog.locator(this.selectors.dialogBackButton).click();
        await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
    }

    /**
     * High school equivalency instead of a high school. "HiSet" and "GED" are entries at the
     * end of the High school name list for a city (after the schools, with "Home School"),
     * e.g. Arizona, Ajo. Everything else on the form is as for a high school.
     * @param {{ type?: 'HiSet'|'GED', country?: string, state?: string, city?: string,
     *           graduationDate?: string | { month: string, year: string } }} [data]
     * @returns {Promise<{ country: string, state?: string, city?: string, name: string }>}
     */
    async addHiSetGED({ type = 'HiSet', country = 'United States', state = 'Arizona', city = 'Ajo', graduationDate } = {}) {
        return this.addHighSchool({ country, state, city, name: type, ...(graduationDate ? { graduationDate } : {}) });
    }

    // ------------------------------------------------------------------ footer

    /**
     * @param {string} [expectedMessage]
     * @returns {Promise<void>}
     */
    async verifyErrorMessage(expectedMessage = 'This is a required field.') {
        await expect(this.page.getByText(expectedMessage).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/my-schools/);
    }

    /**
     * Continue with a filled but unsaved school: the page asks for "Save school" and stays.
     * @returns {Promise<void>}
     */
    async verifySaveSchoolReminder() {
        await expect(this.page.locator(this.selectors.saveSchoolReminder)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/my-schools/);
    }

    /**
     * @returns {Promise<string|undefined>} the high-school country currently chosen
     */
    async getHighSchoolCountry() {
        return this.page.locator(this.selectors.hsCountry).inputValue();
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
