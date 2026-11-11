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
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (a program card, an option or radio by
 * label, an interest checkbox) come from the locator methods below. Specs use these
 * names and the read-back methods, never their own locators.
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
            option: 'role=option',
            radio: 'role=radio',

            // Search and filters (degree path)
            searchInput: '#search_input',
            interestArea: '#interest_area_select',
            college: '#college_select',
            locationFilterButton: 'role=button[name=/^Location/]',
            applyFiltersButton: 'role=button[name="Apply filters"s]',
            associateOnly: '#associate-degree-programs',
            associateOnlyLabel: 'label[for="associate-degree-programs"]',
            clearAllFilters: 'role=button[name=/^Clear all filters/]',

            // Program cards
            programCardHeading: 'role=heading[level=3]',
            programCardFromHeading: 'xpath=ancestor::*[.//button[normalize-space()="Choose this program"]][1]',
            chooseProgramButton: '[data-cy="my-programs-choose-program-button"]',
            chooseThisProgram: 'role=button[name="Choose this program"]',
            viewDetailsLink: 'text="View details"',

            // Dialogs: program details / calendar (dialog), choose-program (alertdialog)
            dialog: 'role=dialog',
            programDialog: 'role=alertdialog',
            dialogBackButton: 'role=button[name="Back"s]',
            dialogCloseButton: 'role=button[name="Close"s]',
            dialogNextButton: 'role=button[name="Next"s]',
            saveChoiceButton: 'role=button[name="Save choice"s]',
            locationToggle: 'role=button[name="Toggle dropdown"s]',
            backupRequiredHeading: 'role=heading[name="Backup program required"]',

            // Saved selections
            firstSelectionHeading: 'role=heading[name="First program selection"]',
            backupSelectionHeading: 'role=heading[name="Backup program selection"]',
            chooseBackupHeading: 'role=heading[name="Choose a backup program"]',
            changeProgramButton: 'role=button[name="Change program"]',
            selectionLine1: 'xpath=following::*[self::h3 or self::p][1]',
            selectionLine2: 'xpath=following::*[self::h3 or self::p][2]',

            // Nondegree path
            visitingGroup: 'role=radiogroup[name="Are you visiting ASU from another college or university?"]',
            nondegreeLocation: 'role=combobox[name="What ASU location would you like to attend?"]',
            nondegreeStartTermGroup: 'role=radiogroup[name=/^When would you like to start\\?/]',

            // Misc
            academicCalendarLink: 'role=link[name="Academic Calendar"]',
            continueButton: 'button[type="submit"][form="page-form"]',
            firstChoiceError: 'text=Please select a first choice program.',
            // Shown under the selection (with "Update term" / "Change program") when the same
            // person (name, birthday, SSN) has already applied for that start date.
            duplicateStartDateError: 'text=You have already submitted an application for your chosen start date.',
            updateTermButton: 'role=button[name="Update term"]',
        };
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * An open list's option by exact label.
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    option(label) {
        return this.page.getByRole('option', { name: label, exact: true });
    }

    /**
     * A radio by exact label inside a scope (dialog, form or radio group).
     * @param {import('@playwright/test').Locator} scope
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    radioIn(scope, label) {
        return scope.getByRole('radio', { name: label, exact: true });
    }

    /**
     * Card heading for a program. An exact name ("Computer Science, BS") matches exactly;
     * a short name ("Computer Science") matches the first card that starts with it.
     * @param {string} program
     * @returns {import('@playwright/test').Locator}
     */
    programHeading(program) {
        const cards = this.page.locator(this.selectors.programCardHeading);
        return program.includes(',')
            ? cards.filter({ hasText: new RegExp(`^\\s*${MyASUProgramPage.escape(program)}\\s*$`) }).first()
            : cards.filter({ hasText: new RegExp(`^\\s*${MyASUProgramPage.escape(program)}\\b`) }).first();
    }

    /**
     * The card element (ancestor holding both the heading and its buttons).
     * @param {string} program
     * @returns {import('@playwright/test').Locator}
     */
    programCard(program) {
        return this.programHeading(program).locator(this.selectors.programCardFromHeading);
    }

    /**
     * An optional interest checkbox, e.g. "Pre-law interest".
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    interestCheckbox(name) {
        return this.page.getByRole('checkbox', { name, exact: true });
    }

    /**
     * The Academic Calendar dialog.
     * @returns {import('@playwright/test').Locator}
     */
    academicCalendarDialog() {
        return this.page.locator(this.selectors.dialog).filter({ hasText: 'Academic Calendar' });
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    static escape(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    /**
     * The degree-path controls are shown: search, filters, calendar link and Continue.
     * @returns {Promise<void>}
     */
    async verifyDegreeSearchVisible() {
        const s = this.selectors;
        for (const selector of [s.heading, s.searchInput, s.interestArea, s.college, s.academicCalendarLink, s.continueButton]) {
            await expect(this.page.locator(selector).first(), selector).toBeVisible({ timeout: this.assertionTimeout });
        }
    }

    /**
     * The nondegree form is shown instead of program cards.
     * @returns {Promise<void>}
     */
    async verifyNondegreeFormVisible() {
        await expect(this.page.locator(this.selectors.visitingGroup)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.chooseProgramButton)).toHaveCount(0);
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
        await this.option(label).click();
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
        const submit = async () => {
            await this.waitForResults();
            await input.fill(searchTerm);
            await input.press('Enter');
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(500);
            return (await input.inputValue()) === searchTerm;
        };
        if (await submit()) return;

        // APP BUG (seen 2026-11-10): after arriving on this step via Continue from step 1
        // (in-app navigation), Enter clears the search box and nothing is filtered. A
        // fresh page load fixes it. Reloading drops unsaved choices, so only do it when
        // nothing has been chosen yet.
        if (await this.page.locator(this.selectors.firstSelectionHeading).isVisible().catch(() => false)) {
            throw new Error(`Program search for "${searchTerm}" was ignored (app bug after in-app navigation) and a reload would drop the unsaved first choice`);
        }
        this.logger.warn(`Program search for "${searchTerm}" was ignored; reloading step 2 and retrying (known app bug)`);
        await this.page.reload();
        await this.verifyPageLoaded();
        if (!(await submit())) throw new Error(`Program search for "${searchTerm}" still ignored after reload`);
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
            await this.option(value).click();
            await this.closeOpenList(toggle);
        }
        if (locations && locations.length) {
            await this.page.locator(this.selectors.locationFilterButton).first().click();
            const dialog = this.page.locator(this.selectors.dialog);
            await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
            for (const name of locations) {
                await dialog.getByText(name, { exact: true }).first().click();
            }
            await dialog.locator(this.selectors.applyFiltersButton).click();
            await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        }
        if (associateOnly !== undefined) {
            const box = this.page.locator(this.selectors.associateOnly);
            if ((await box.isChecked()) !== associateOnly) {
                await this.page.locator(this.selectors.associateOnlyLabel).click();
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
        const options = this.page.locator(this.selectors.option);
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

    // ------------------------------------------------------------------ cards and dialogs

    /**
     * Open a program's "View details" dialog and return its text.
     * @param {string} program
     * @returns {Promise<string>}
     */
    async openProgramDetails(program) {
        // Rendered as a link on cards (and on saved selections), so match by text.
        await this.programCard(program).locator(this.selectors.viewDetailsLink).click();
        const dialog = this.page.locator(this.selectors.dialog);
        await dialog.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * Close the open details or calendar dialog with its Back button.
     * @returns {Promise<void>}
     */
    async closeDialog() {
        const dialog = this.page.locator(this.selectors.dialog).or(this.page.locator(this.selectors.programDialog)).first();
        await dialog.locator(this.selectors.dialogBackButton).click();
        await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
    }

    /**
     * Open a program's "Choose this program" dialog, read the start terms and whether each
     * can be chosen, then close the dialog WITHOUT saving. Terms the applicant has already
     * applied for (for this program) are shown disabled: "Select a start date you have
     * not already applied for."
     * @param {string} program - e.g. "Anthropology, BA"
     * @returns {Promise<Array<{ label: string, disabled: boolean }>>}
     */
    async getStartTermOptions(program) {
        await this.waitForResults();
        if (!(await this.programHeading(program).isVisible().catch(() => false))) {
            await this.searchProgram(program.replace(/,.*$/, ''));
        }
        await this.programCard(program).locator(this.selectors.chooseThisProgram).click();
        const dialog = this.page.locator(this.selectors.programDialog);
        await dialog.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        const radios = dialog.locator(this.selectors.radio);
        await radios.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const raw = await radios.evaluateAll((els) => els.map((e) => ({
            label: (e.getAttribute('aria-label') || e.textContent || '').trim(),
            disabled: e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('disabled'),
        })));
        /** @type {Map<string, boolean>} */
        const byLabel = new Map();
        for (const t of raw) {
            if (!/\d{4}/.test(t.label)) continue;
            byLabel.set(t.label, (byLabel.get(t.label) || false) || t.disabled);
        }
        await dialog.locator(this.selectors.dialogCloseButton).click();
        await dialog.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        return [...byLabel].map(([label, disabled]) => ({ label, disabled }));
    }

    /**
     * Pick the start-term radio that best matches the request:
     * exact label, else "<year> <season>", else season, else the first one offered.
     * @param {import('@playwright/test').Locator} scope - dialog or form holding the radios
     * @param {string} [desired] - e.g. "2027 fall - (Session A)" or "Fall 2025"
     * @returns {Promise<string>} the label chosen
     */
    async chooseStartTerm(scope, desired) {
        const radios = scope.locator(this.selectors.radio);
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
        await this.radioIn(scope, pick).first().click();
        return pick;
    }

    /**
     * Click "Choose this program" on a card and complete the 2-step dialog.
     * @param {{ program: string, startTerm?: string, location?: string }} data
     * @returns {Promise<{ program: string, startTerm: string, location: string, backupRequired: boolean }>}
     */
    async chooseProgram({ program, startTerm, location }) {
        await this.waitForResults();
        let heading = this.programHeading(program);
        if (!(await heading.isVisible().catch(() => false))) {
            await this.searchProgram(program.replace(/,.*$/, ''));
            heading = this.programHeading(program);
        }
        await heading.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        const name = (await heading.innerText()).trim();
        await this.programCard(program).locator(this.selectors.chooseThisProgram).click();

        const dialog = this.page.locator(this.selectors.programDialog);
        await dialog.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        if (location) {
            await dialog.locator(this.selectors.locationToggle).click();
            await this.option(location).click();
        }
        const term = await this.chooseStartTerm(dialog, startTerm);
        await dialog.locator(this.selectors.dialogNextButton).click();

        const save = dialog.locator(this.selectors.saveChoiceButton);
        await save.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const backupRequired = await dialog.locator(this.selectors.backupRequiredHeading).isVisible();
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
     * @returns {Promise<boolean>} whether the page is asking for a backup program
     */
    async isBackupRequested() {
        return this.page.locator(this.selectors.chooseBackupHeading).isVisible();
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
        await this.radioIn(this.page.locator(this.selectors.visitingGroup), visiting ? 'Yes' : 'No').click();
        const locationBox = this.page.locator(this.selectors.nondegreeLocation);
        if (location) {
            await locationBox.click();
            await this.option(location).click();
        }
        const term = await this.chooseStartTerm(this.page.locator(this.selectors.nondegreeStartTermGroup), startTerm);
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
        for (const [key, selector] of [['first', this.selectors.firstSelectionHeading], ['backup', this.selectors.backupSelectionHeading]]) {
            const h = this.page.locator(selector).first();
            if (!(await h.isVisible().catch(() => false))) continue;
            const nameEl = h.locator(this.selectors.selectionLine1);
            const program = (await nameEl.innerText()).trim();
            const next1 = (await nameEl.locator(this.selectors.selectionLine1).innerText().catch(() => '')).trim();
            const next2 = (await nameEl.locator(this.selectors.selectionLine2).innerText().catch(() => '')).trim();
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
            if (!(await this.isInterestSelected(name))) await this.interestCheckbox(name).click();
        }
    }

    /**
     * @param {string} name - e.g. "Pre-law interest"
     * @returns {Promise<boolean>}
     */
    async isInterestSelected(name) {
        const box = this.interestCheckbox(name);
        return (await box.getAttribute('aria-checked')) === 'true' || (await box.isChecked().catch(() => false));
    }

    // ------------------------------------------------------------------ calendar, messages, footer

    /**
     * Open the Academic Calendar dialog and return its text.
     * @returns {Promise<string>}
     */
    async openAcademicCalendar() {
        await this.page.locator(this.selectors.academicCalendarLink).click();
        const dialog = this.academicCalendarDialog();
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
     * A message is shown and the page stays on My program.
     * @param {string} [expectedMessage]
     * @returns {Promise<void>}
     */
    async verifyErrorMessage(expectedMessage = 'Please select a first choice program.') {
        await expect(this.page.getByText(expectedMessage).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/my-program/);
    }

    /**
     * Saving a program and term this person already applied for is blocked: the
     * duplicate message shows with "Update term" and "Change program", and the page
     * stays on My program.
     * @returns {Promise<void>}
     */
    async verifyDuplicateStartDateBlocked() {
        await expect(this.page).toHaveURL(/\/my-program/);
        await expect(this.page.locator(this.selectors.duplicateStartDateError)).toHaveText(
            "You have already submitted an application for your chosen start date. Multiple applications can't be "
            + "submitted for the same start date. You'll need to select a new start date to continue this application.",
            { timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.updateTermButton)).toBeVisible();
        await expect(this.page.locator(this.selectors.changeProgramButton).first()).toBeVisible();
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
