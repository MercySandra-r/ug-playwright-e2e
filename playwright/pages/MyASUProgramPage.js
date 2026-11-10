// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/** Labels of the "I want to.." options. */
const INTENT = {
    degree: 'pursue a degree',
    nondegree: 'take classes as a nondegree or visiting student',
};

/**
 * Page Object for step 2 of the application wizard: "My ASU program"
 * (/ug-app/<applicationId>/my-program).
 *
 * Rebuilt against the live page on 2026-11-10.
 *
 * Degree path ("I want to.. pursue a degree"):
 *   - Program search (keywords + Enter), filters (Interest area, College, Location
 *     dialog, Associate degree programs), program cards with "View details" and
 *     "Choose this program".
 *   - "Choose this program" opens a 2-step dialog: location dropdown + start-term radios,
 *     Next, then a summary with "Save choice".
 *   - Programs with higher admission requirements need a backup program; after saving
 *     the first choice the page shows "Choose a backup program" with the same cards.
 *   - Saved choices appear under "First program selection" / "Backup program selection"
 *     with "Change program". Optional interest checkboxes (Pre-law, Pre-med/health,
 *     Pre-veterinary, Teaching certificate) follow.
 *
 * Nondegree path ("take classes as a nondegree or visiting student"):
 *   - "Are you visiting ASU from another college or university?" Yes/No, a location
 *     dropdown, and start-term radios. No program cards.
 *
 * Continue without a first choice shows "Please select a first choice program."
 *
 * Choices are NOT saved when the dialog's "Save choice" is clicked: they live in the page
 * until Continue. Reloading or navigating away before Continue drops them.
 */
class MyASUProgramPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My ASU program"][level=1]',
            degreeIntent: '#group-degree-type-select',

            // Search and filters (degree path)
            searchInput: '#search_input',
            interestArea: '#interest_area_select',
            college: '#college_select',
            locationFilterButton: 'role=button[name=/^Location/]',
            associateOnly: '#associate-degree-programs',
            clearAllFilters: 'role=button[name=/^Clear all filters/]',

            // Program cards
            chooseProgramButton: '[data-cy="my-programs-choose-program-button"]',

            // Saved selections
            firstSelectionHeading: 'role=heading[name="First program selection"]',
            backupSelectionHeading: 'role=heading[name="Backup program selection"]',
            chooseBackupHeading: 'role=heading[name="Choose a backup program"]',
            changeProgramButton: 'role=button[name="Change program"]',

            // Nondegree path
            visitingGroup: 'role=radiogroup[name="Are you visiting ASU from another college or university?"]',
            nondegreeLocation: 'role=combobox[name="What ASU location would you like to attend?"]',

            // Misc
            academicCalendarLink: 'role=link[name="Academic Calendar"]',
            continueButton: 'button[type="submit"][form="page-form"]',
            firstChoiceError: 'text=Please select a first choice program.',
        };
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open step 2 of the signed-in user's application.
     * @returns {Promise<void>}
     */
    async navigateToMyASUProgram() {
        await this.gotoApplicationStep('my-program');
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/my-program/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    // ------------------------------------------------------------------ degree intent

    /**
     * Map test-data degree types ('Bachelor', 'Degree', 'Non-Degree', ...) to an intent.
     * @param {string} [degreeType]
     * @returns {'degree'|'nondegree'}
     */
    static intentFor(degreeType) {
        return /non[\s-]?degree|visiting|ndg/i.test(degreeType || '') ? 'nondegree' : 'degree';
    }

    /**
     * Set "I want to.." (no-op if already set).
     * @param {string} degreeType - e.g. 'Bachelor' or 'Non-Degree'
     * @returns {Promise<void>}
     */
    async selectDegreeIntent(degreeType) {
        const label = INTENT[MyASUProgramPage.intentFor(degreeType)];
        const box = this.page.locator(this.selectors.degreeIntent);
        if ((await box.innerText()).trim() === label) return;
        await box.click();
        await this.page.getByRole('option', { name: label, exact: true }).click();
        await expect(box).toHaveText(label, { timeout: this.assertionTimeout });
    }

    /**
     * @param {string} degreeType - e.g. 'Bachelor' or 'Non-Degree'
     * @returns {Promise<void>}
     */
    async verifySelectedDegreeType(degreeType) {
        const label = INTENT[MyASUProgramPage.intentFor(degreeType)];
        await expect(this.page.locator(this.selectors.degreeIntent)).toHaveText(label, { timeout: this.assertionTimeout });
    }

    // ------------------------------------------------------------------ search and filters

    /**
     * Wait for program cards to be listed.
     * @returns {Promise<void>}
     */
    async waitForResults() {
        await this.page.locator(this.selectors.chooseProgramButton).first()
            .waitFor({ state: 'visible', timeout: this.navigationTimeout });
    }

    /**
     * Names of the programs currently listed (card headings), e.g. "Computer Science, BS".
     * @returns {Promise<string[]>}
     */
    async getProgramList() {
        await this.waitForResults();
        return this.page.locator(this.selectors.chooseProgramButton).evaluateAll((buttons) => buttons.map((b) => {
            /** @type {Element|null} */
            let el = b;
            while (el && !el.querySelector('h3')) el = el.parentElement;
            const h3 = el && el.querySelector('h3');
            return h3 && h3.textContent ? h3.textContent.trim() : '';
        }).filter(Boolean));
    }

    /**
     * Search by keyword (Enter submits) and wait for the list to refresh.
     * @param {string} searchTerm
     * @returns {Promise<void>}
     */
    async searchProgram(searchTerm) {
        const input = this.page.locator(this.selectors.searchInput);
        await input.fill(searchTerm);
        await input.press('Enter');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(500);
    }

    /**
     * @returns {Promise<void>}
     */
    async clearSearch() {
        await this.searchProgram('');
    }

    /**
     * @param {{ interestArea?: string, college?: string, locations?: string[], associateOnly?: boolean }} filters
     *   locations use the Location dialog's labels, e.g. "Tempe", "ASU Online".
     * @returns {Promise<void>}
     */
    async applyFilters({ interestArea, college, locations, associateOnly } = {}) {
        // Interest area and College are multi-select lists that stay open after a pick.
        for (const [selector, value] of /** @type {Array<[string, string|undefined]>} */ ([
            [this.selectors.interestArea, interestArea],
            [this.selectors.college, college],
        ])) {
            if (!value) continue;
            const toggle = this.page.locator(selector);
            await toggle.click();
            await this.page.getByRole('option', { name: value, exact: true }).click();
            await this.closeOpenList(toggle);
        }
        if (locations && locations.length) {
            await this.page.locator(this.selectors.locationFilterButton).first().click();
            const dialog = this.page.getByRole('dialog');
            await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
            for (const name of locations) {
                await dialog.getByText(name, { exact: true }).first().click();
            }
            await dialog.getByRole('button', { name: 'Apply filters', exact: true }).click();
            await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        }
        if (associateOnly !== undefined) {
            const box = this.page.locator(this.selectors.associateOnly);
            if ((await box.isChecked()) !== associateOnly) {
                await this.page.locator(`label[for="associate-degree-programs"]`).click();
            }
        }
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Close a filter's floating option list. Escape doesn't close it and the list can
     * cover its own toggle, so click outside (the page heading); toggle as a fallback.
     * @param {import('@playwright/test').Locator} toggle
     * @returns {Promise<void>}
     */
    async closeOpenList(toggle) {
        const options = this.page.getByRole('option');
        const isOpen = () => options.first().isVisible().catch(() => false);
        await this.page.keyboard.press('Escape');
        if (await isOpen()) await this.page.locator(this.selectors.heading).click();
        if (await isOpen()) await toggle.click({ force: true });
        await options.first().waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * @returns {Promise<void>}
     */
    async clearAllFilters() {
        const clear = this.page.locator(this.selectors.clearAllFilters);
        for (let i = 0; i < await clear.count(); i++) {
            if (await clear.nth(i).isVisible()) {
                await clear.nth(i).click();
                break;
            }
        }
        await this.page.waitForLoadState('networkidle');
    }

    // ------------------------------------------------------------------ cards

    /**
     * Card heading for a program. An exact name ("Computer Science, BS") matches exactly;
     * a short name ("Computer Science") matches the first card that starts with it.
     * @param {string} program
     * @returns {import('@playwright/test').Locator}
     */
    programHeading(program) {
        const cards = this.page.getByRole('heading', { level: 3 });
        return program.includes(',')
            ? cards.filter({ hasText: new RegExp(`^\\s*${MyASUProgramPage.escape(program)}\\s*$`) }).first()
            : cards.filter({ hasText: new RegExp(`^\\s*${MyASUProgramPage.escape(program)}\\b`) }).first();
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    static escape(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * The card element (ancestor holding both the heading and its buttons).
     * @param {string} program
     * @returns {import('@playwright/test').Locator}
     */
    programCard(program) {
        return this.programHeading(program)
            .locator('xpath=ancestor::*[.//button[normalize-space()="Choose this program"]][1]');
    }

    /**
     * Open a program's "View details" dialog and return its text.
     * @param {string} program
     * @returns {Promise<string>}
     */
    async openProgramDetails(program) {
        // Rendered as a link on cards (and on saved selections), so match by text.
        await this.programCard(program).getByText('View details', { exact: true }).click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * @returns {Promise<void>}
     */
    async closeDialog() {
        const dialog = this.page.getByRole('dialog').or(this.page.getByRole('alertdialog')).first();
        await dialog.getByRole('button', { name: 'Back', exact: true }).click();
        await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
    }

    /**
     * Pick the start-term radio that best matches the request:
     * exact label, else "<year> <season>", else season, else the first one offered.
     * @param {import('@playwright/test').Locator} scope - dialog or form holding the radios
     * @param {string} [desired] - e.g. "2027 fall - (Session A)" or "Fall 2025"
     * @returns {Promise<string>} the label chosen
     */
    async chooseStartTerm(scope, desired) {
        const radios = scope.getByRole('radio');
        await radios.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = [...new Set((await radios.evaluateAll((els) =>
            els.map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim()))).filter((l) => /\d{4}/.test(l)))];
        let pick = desired && labels.find((l) => l === desired);
        const m = desired && desired.match(/(spring|summer|fall)\D*(\d{4})|(\d{4})\D*(spring|summer|fall)/i);
        if (!pick && m) {
            const season = (m[1] || m[4]).toLowerCase();
            const year = m[2] || m[3];
            pick = labels.find((l) => l.startsWith(`${year} ${season}`)) || labels.find((l) => l.includes(season));
        }
        if (!pick) {
            pick = labels[0];
            if (desired) this.logger.warn(`Start term "${desired}" not offered; using "${pick}"`);
        }
        await scope.getByRole('radio', { name: pick, exact: true }).first().click();
        return pick;
    }

    /**
     * Click "Choose this program" on a card and complete the 2-step dialog.
     * @param {{ program: string, startTerm?: string, location?: string }} data
     * @returns {Promise<{ program: string, startTerm: string, location: string, backupRequired: boolean }>}
     */
    async chooseProgram({ program, startTerm, location }) {
        let heading = this.programHeading(program);
        if (!(await heading.isVisible().catch(() => false))) {
            await this.searchProgram(program.replace(/,.*$/, ''));
            heading = this.programHeading(program);
        }
        await heading.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        const name = (await heading.innerText()).trim();
        await this.programCard(program).getByRole('button', { name: 'Choose this program' }).click();

        const dialog = this.page.getByRole('alertdialog');
        await dialog.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        if (location) {
            await dialog.getByRole('button', { name: 'Toggle dropdown', exact: true }).click();
            await this.page.getByRole('option', { name: location, exact: true }).click();
        }
        const term = await this.chooseStartTerm(dialog, startTerm);
        await dialog.getByRole('button', { name: 'Next', exact: true }).click();

        const save = dialog.getByRole('button', { name: 'Save choice', exact: true });
        await save.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const backupRequired = await dialog.getByRole('heading', { name: 'Backup program required' }).isVisible();
        const summary = (await dialog.innerText()).replace(/\s+/g, ' ');
        const usedLocation = location || (summary.match(/Step 2 of 2 .*?, \w+ (.+?) \d{4} (spring|summer|fall)/i) || [])[1] || '';
        await save.click();
        await dialog.waitFor({ state: 'hidden', timeout: this.navigationTimeout });
        await this.page.waitForLoadState('networkidle');
        this.logger.info(`Chose ${name} (${term}${usedLocation ? ', ' + usedLocation : ''})${backupRequired ? ' - backup required' : ''}`);
        return { program: name, startTerm: term, location: usedLocation, backupRequired };
    }

    /**
     * Choose a backup program after a higher-admission first choice.
     * @param {{ program?: string, startTerm?: string, location?: string }} [data] - program
     *   defaults to the first one listed under "Choose a backup program".
     * @returns {Promise<{ program: string, startTerm: string, location: string, backupRequired: boolean }>}
     */
    async chooseBackupProgram({ program, startTerm, location } = {}) {
        await this.page.locator(this.selectors.chooseBackupHeading).waitFor({ state: 'visible', timeout: this.navigationTimeout });
        const target = program || (await this.getProgramList())[0];
        return this.chooseProgram({ program: target, startTerm, location });
    }

    /**
     * Select a program the way the specs ask for it. Two call styles:
     *  - flow specs: selectProgram({ program, degreeType, startTerm, location,
     *                               backupProgram, autoBackup = true })
     *  - index style: selectProgram(index, 'first'|'second') on the current list
     * For nondegree types it fills the nondegree form instead (no program cards).
     * When the first choice needs a backup, one is chosen unless autoBackup is false.
     * @param {number | { program?: string, degreeType?: string, startTerm?: string,
     *   location?: string, backupProgram?: string, autoBackup?: boolean, visiting?: boolean }} arg
     * @param {'first'|'second'} [choice]
     * @returns {Promise<Record<string, any>>}
     */
    async selectProgram(arg, choice = 'first') {
        if (typeof arg === 'number') {
            if (choice === 'second') {
                await this.page.locator(this.selectors.chooseBackupHeading).waitFor({ state: 'visible', timeout: this.navigationTimeout });
            }
            const names = await this.getProgramList();
            if (!names[arg]) throw new Error(`No program at index ${arg} (${names.length} listed)`);
            return this.chooseProgram({ program: names[arg] });
        }

        const data = arg;
        if (data.degreeType) await this.selectDegreeIntent(data.degreeType);
        if (MyASUProgramPage.intentFor(data.degreeType) === 'nondegree') {
            return this.selectNondegreeOptions({ visiting: data.visiting, location: data.location, startTerm: data.startTerm });
        }
        if (!data.program) throw new Error('selectProgram needs a program name for the degree path');
        const first = await this.chooseProgram({ program: data.program, startTerm: data.startTerm, location: data.location });
        /** @type {Record<string, any>} */
        const result = { first };
        if (first.backupRequired && data.autoBackup !== false) {
            result.backup = await this.chooseBackupProgram({ program: data.backupProgram, startTerm: data.startTerm });
        }
        return result;
    }

    /**
     * Pick a random program from the current list (degree path).
     * @param {{ degreeType?: string, startTerm?: string }} [data]
     * @returns {Promise<Record<string, any>>}
     */
    async selectRandomProgram({ degreeType, startTerm } = {}) {
        if (degreeType) await this.selectDegreeIntent(degreeType);
        if (MyASUProgramPage.intentFor(degreeType) === 'nondegree') {
            return this.selectNondegreeOptions({ startTerm });
        }
        const names = await this.getProgramList();
        const program = names[Math.floor(Math.random() * names.length)];
        return this.selectProgram({ program, startTerm });
    }

    /**
     * Fill the nondegree form.
     * @param {{ visiting?: boolean, location?: string, startTerm?: string }} [data]
     * @returns {Promise<{ visiting: boolean, location: string, startTerm: string }>}
     */
    async selectNondegreeOptions({ visiting = false, location, startTerm } = {}) {
        await this.page.locator(this.selectors.visitingGroup)
            .getByRole('radio', { name: visiting ? 'Yes' : 'No', exact: true }).click();
        const locationBox = this.page.locator(this.selectors.nondegreeLocation);
        if (location) {
            await locationBox.click();
            await this.page.getByRole('option', { name: location, exact: true }).click();
        }
        const termGroup = this.page.getByRole('radiogroup', { name: /^When would you like to start\?/ });
        const term = await this.chooseStartTerm(termGroup, startTerm);
        return { visiting, location: await locationBox.inputValue().catch(() => location || ''), startTerm: term };
    }

    // ------------------------------------------------------------------ saved selections

    /**
     * Read the saved first/backup choices shown on the page.
     *
     * Two layouts: while a backup is still needed the first choice is compact (program
     * name as a paragraph, no term/location); once complete each choice shows the name
     * as a heading followed by term and location paragraphs.
     * @returns {Promise<{ first?: { program: string, term: string, location: string },
     *                     backup?: { program: string, term: string, location: string } }>}
     */
    async getSelectedPrograms() {
        /** @type {Record<string, any>} */
        const out = {};
        for (const [key, title] of [['first', 'First program selection'], ['backup', 'Backup program selection']]) {
            const h = this.page.getByRole('heading', { name: title, exact: true });
            if (!(await h.isVisible().catch(() => false))) continue;
            const nameEl = h.locator('xpath=following::*[self::h3 or self::p][1]');
            const program = (await nameEl.innerText()).trim();
            const next1 = (await nameEl.locator('xpath=following::*[self::h3 or self::p][1]').innerText().catch(() => '')).trim();
            const next2 = (await nameEl.locator('xpath=following::*[self::h3 or self::p][2]').innerText().catch(() => '')).trim();
            const hasTerm = /\d{4} (spring|summer|fall)/i.test(next1);
            out[key] = { program, term: hasTerm ? next1 : '', location: hasTerm ? next2 : '' };
        }
        return out;
    }

    /**
     * Click "Change program" on the first or backup selection; the program list returns.
     * @param {'first'|'backup'} [which]
     * @returns {Promise<void>}
     */
    async changeProgram(which = 'first') {
        const buttons = this.page.locator(this.selectors.changeProgramButton);
        await (which === 'backup' ? buttons.last() : buttons.first()).click();
        await this.waitForResults();
    }

    /**
     * Tick optional interests, e.g. ['Pre-law interest', 'Pre-med/health interest'].
     * @param {string[]} interests
     * @returns {Promise<void>}
     */
    async selectInterests(interests) {
        for (const name of interests) {
            const box = this.page.getByRole('checkbox', { name, exact: true });
            if ((await box.getAttribute('aria-checked')) !== 'true' && !(await box.isChecked().catch(() => false))) {
                await box.click();
            }
        }
    }

    // ------------------------------------------------------------------ calendar, footer

    /**
     * Open the Academic Calendar dialog and return its text.
     * @returns {Promise<string>}
     */
    async openAcademicCalendar() {
        await this.page.locator(this.selectors.academicCalendarLink).click();
        const dialog = this.page.getByRole('dialog').filter({ hasText: 'Academic Calendar' });
        await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * @param {string} calendarText - text returned by openAcademicCalendar()
     * @returns {boolean} true if it lists at least one term with session dates
     */
    verifyAcademicCalendar(calendarText) {
        return /(Spring|Summer|Fall) \d{4}/.test(calendarText) && /Session [A-C]:/.test(calendarText);
    }

    /**
     * @param {string} [expectedMessage]
     * @returns {Promise<void>}
     */
    async verifyErrorMessage(expectedMessage = 'Please select a first choice program.') {
        await expect(this.page.getByText(expectedMessage).first()).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * @returns {Promise<void>}
     */
    async clickContinue() {
        await this.page.locator(this.selectors.continueButton).click();
    }

    /**
     * Continue to step 3, My schools.
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.clickContinue();
        await this.page.waitForURL(/\/ug-app\/\d+\/my-schools/, { timeout: this.navigationTimeout });
    }

    /**
     * @returns {Promise<boolean>} true once the app has moved on to My schools
     */
    async isSaveSuccessful() {
        return /\/my-schools/.test(this.page.url());
    }
}

module.exports = MyASUProgramPage;
