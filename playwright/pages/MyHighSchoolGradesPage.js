// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/** Subject tabs, in page order. */
const SUBJECTS = ['English', 'Math', 'Science', 'Social Science', 'Language', 'Fine Arts/CTE', 'Electives'];

/**
 * Page Object for step 4 of the application wizard: "My high school grades"
 * (/ug-app/<applicationId>/my-high-school-grades).
 *
 * Rebuilt against the live page on 2026-11-10.
 *
 * "Would you like to self-report your high school grades?" Yes/No (required; Continue
 * without an answer shows "Please select an option for grade reporting").
 *   No  -> "Select Save and Continue to go to the next page." Nothing else is needed.
 *   Yes -> Overall academics: unweighted GPA, GPA scale (4 | 100), grading system
 *          (A-F | 100 point based); then courses per subject tab (English, Math,
 *          Science, Social Science, Language, Fine Arts/CTE, Electives). "Add a course":
 *          academic year, course name, duration, course level, then one grade per term
 *          (Semester = 2 grades, ...), "Save course". Saved courses list per subject
 *          with Edit / Delete. No minimum number of courses is enforced.
 *
 * POM rule for this page: every element is declared here. Fixed elements are named in
 * `this.selectors`; elements that depend on data (a subject tab, a course row or its
 * Edit/Delete button, a grade field, an option by label) come from the locator methods
 * below. Specs use these names and the read-back methods, never their own locators.
 */
class MyHighSchoolGradesPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My high school grades"][level=1]',
            introHeading: 'role=heading[name="Want a faster admission decision?"]',
            option: 'role=option',
            selfReportGroup: 'role=group[name="Would you like to self-report your high school grades?"]',
            noSelfReportHint: 'text=Select Save and Continue to go to the next page.',

            // Overall academics
            overallAcademicsHeading: 'role=heading[name="Overall academics"]',
            unweightedGpa: '#group-unweighted-gpa',
            gpaScale: '#group-gpa-scale',
            gradingSystem: '#grading-system',

            // Course form
            academicYear: '#new_academic_year',
            courseName: '#new_course_name_group',
            duration: '#new_duration',
            courseLevel: '#new_course-level',
            // Only the grade inputs themselves (their list containers share the id prefix).
            gradeFields: 'input[role="combobox"][id^="grades-update-"]',
            saveCourseButton: 'role=button[name="Save course"]',
            clearCourseButton: 'role=button[name="Clear course fields"]',

            // Subject tabs and saved courses
            subjectTabs: 'role=tablist',
            subjectTab: 'role=tab',
            coursesTableAfterPanel: 'xpath=following::table[1]',
            row: 'role=row',
            cell: 'role=cell',

            // Edit course dialog and delete confirmation
            editCourseDialog: 'role=dialog[name="Edit course"]',
            editGradeBoxes: 'role=combobox[name=/ grade$/]',
            updateCourseButton: 'role=button[name="Update course"s]',
            dialog: 'role=dialog',
            alertDialog: 'role=alertdialog',
            confirmDeleteButton: 'role=button[name=/^(delete|remove|yes|confirm)/i]',

            continueButton: 'button[type="submit"][form="page-form"]',
            gradeReportingError: 'text=Please select an option for grade reporting',
        };

        this.SUBJECTS = SUBJECTS;
    }

    // ------------------------------------------------------------------ locators that depend on data

    /**
     * An open list's option by label; selected options show a trailing "✓".
     * @param {string} label
     * @returns {import('@playwright/test').Locator}
     */
    option(label) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.page.getByRole('option', { name: new RegExp(`^${escaped}( ✓)?$`) }).first();
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
     * @param {string} subject - one of SUBJECTS
     * @returns {import('@playwright/test').Locator}
     */
    subjectTab(subject) {
        return this.page.getByRole('tab', { name: subject, exact: true });
    }

    /**
     * @param {string} subject - one of SUBJECTS
     * @returns {import('@playwright/test').Locator}
     */
    subjectPanel(subject) {
        return this.page.getByRole('tabpanel', { name: subject });
    }

    /**
     * Selector of the i-th grade dropdown in the "Add a course" form (0-based).
     * @param {number} i
     * @returns {string}
     */
    gradeFieldSelector(i) {
        return `#grades-update-${i}`;
    }

    /**
     * Saved course row in the current subject's table.
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    courseRow(name) {
        return this.page.locator(this.selectors.row).filter({ has: this.page.getByRole('cell', { name, exact: true }) });
    }

    /**
     * A saved course's Edit or Delete button.
     * @param {'Edit'|'Delete'} action
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    courseButton(action, name) {
        return this.page.getByRole('button', { name: `${action} course work for ${name}` });
    }

    // ------------------------------------------------------------------ navigation

    /**
     * Open step 4 of the signed-in user's application.
     * @returns {Promise<void>}
     */
    async navigateToMyHighSchoolGrades() {
        await this.gotoApplicationStep('my-high-school-grades');
        await this.verifyPageLoaded();
    }

    /**
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/\/ug-app\/\d+\/my-high-school-grades/, { timeout: this.navigationTimeout });
        await expect(this.page.locator(this.selectors.heading)).toBeVisible({ timeout: this.navigationTimeout });
    }

    /**
     * The intro and the self-report question are present.
     * @returns {Promise<void>}
     */
    async validateMyHighSchoolGrade() {
        await expect(this.page.locator(this.selectors.introHeading)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.selfReportGroup)).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * Answering No shows only the "Save and Continue" hint, no Overall academics.
     * @returns {Promise<void>}
     */
    async verifyTranscriptOnlyShown() {
        await expect(this.page.locator(this.selectors.noSelfReportHint)).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page.locator(this.selectors.overallAcademicsHeading)).toHaveCount(0);
    }

    /**
     * Answering Yes shows Overall academics: GPA, GPA scale and grading system.
     * @returns {Promise<void>}
     */
    async verifyOverallAcademicsShown() {
        const s = this.selectors;
        for (const selector of [s.overallAcademicsHeading, s.unweightedGpa, s.gpaScale, s.gradingSystem]) {
            await expect(this.page.locator(selector), selector).toBeVisible({ timeout: this.assertionTimeout });
        }
    }

    /**
     * Overall academics as shown: { unweightedGPA, gpaScale, gradingSystem }.
     * @returns {Promise<{ unweightedGPA: string, gpaScale: string, gradingSystem: string }>}
     */
    async getAcademicDetails() {
        return {
            unweightedGPA: await this.page.locator(this.selectors.unweightedGpa).inputValue(),
            gpaScale: await this.page.locator(this.selectors.gpaScale).inputValue(),
            gradingSystem: await this.page.locator(this.selectors.gradingSystem).inputValue(),
        };
    }

    /**
     * Subject tab labels in page order.
     * @returns {Promise<string[]>}
     */
    async getSubjectTabs() {
        return (await this.page.locator(this.selectors.subjectTab).allInnerTexts()).map((t) => t.trim());
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Choose a dropdown option by exact label (first option when none given).
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
        const label = value || (await first.innerText()).replace(/\s*✓\s*$/, '').trim();
        await this.option(label).click();
        await this.closeOpenList();
        return label;
    }

    /**
     * Some lists (e.g. Grading system) stay open after a pick, showing a tick; close any
     * open list with Escape, then by clicking the page heading.
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
     * Option labels of a dropdown (closes it again).
     * @param {string} selector
     * @returns {Promise<string[]>}
     */
    async getDropdownOptions(selector) {
        await this.closeOpenList();
        await this.page.locator(selector).click();
        const options = this.page.locator(this.selectors.option);
        await options.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = (await options.allInnerTexts())
            .map((t) => t.replace(/\s+/g, ' ').replace(/\s*✓\s*$/, '').trim()).filter(Boolean);
        await this.closeOpenList();
        return labels;
    }

    // ------------------------------------------------------------------ self-report choice

    /**
     * Answer "Would you like to self-report your high school grades?".
     * @param {boolean} selfReport
     * @returns {Promise<void>}
     */
    async answerSelfReport(selfReport) {
        await this.radioIn(this.page.locator(this.selectors.selfReportGroup), selfReport ? 'Yes' : 'No').click();
        if (selfReport) {
            await this.page.locator(this.selectors.unweightedGpa).waitFor({ state: 'visible', timeout: this.assertionTimeout });
        } else {
            await this.page.locator(this.selectors.noSelfReportHint).waitFor({ state: 'visible', timeout: this.assertionTimeout });
        }
    }

    /**
     * Old report-type API: 'self'/'self-report'/'senior'/'all' -> Yes; anything else
     * ('transcript', ...) -> No.
     * @param {string} reportType
     * @returns {Promise<void>}
     */
    async selectReportType(reportType) {
        await this.answerSelfReport(/self|senior|all/i.test(reportType));
    }

    /**
     * Flow-spec name for "don't self-report" (official transcripts later).
     * @returns {Promise<void>}
     */
    async selectTranscriptOnlyCard() {
        await this.answerSelfReport(false);
    }

    /**
     * Nondegree/visiting and nonresident variants. NOTE: no variant of this step has
     * been seen for these applicants yet (2026-11-10); the step is answered "No".
     * @returns {Promise<void>}
     */
    async useNDGVUSFlow() {
        await this.answerSelfReport(false);
    }

    /**
     * @returns {Promise<void>}
     */
    async useNonResidentFlow() {
        await this.answerSelfReport(false);
    }

    // ------------------------------------------------------------------ overall academics

    /**
     * @param {'4'|'100'|string|number} scale
     * @returns {Promise<void>}
     */
    async selectGPAScale(scale) {
        await this.choose(this.selectors.gpaScale, String(scale).replace(/\.0+$/, ''));
    }

    /**
     * @param {'A-F'|'100 point based'|string} system - also accepts 'letter'/'percent'
     * @returns {Promise<void>}
     */
    async selectGradingSystem(system) {
        const label = /^a\s*-\s*f$|letter/i.test(system) ? 'A-F' : /100|percent|point/i.test(system) ? '100 point based' : system;
        await this.choose(this.selectors.gradingSystem, label);
        await this.page.locator(this.selectors.subjectTabs).waitFor({ state: 'visible', timeout: this.assertionTimeout });
    }

    /**
     * Fill Overall academics. classRank/classSize from the old API are ignored (the
     * page no longer asks for them).
     * @param {{ unweightedGPA: string|number, gpaScale?: string|number, gradingSystem?: string }} data
     * @returns {Promise<void>}
     */
    async enterAcademicDetails({ unweightedGPA, gpaScale = '4', gradingSystem = 'A-F' }) {
        await this.setUnweightedGpa(unweightedGPA);
        await this.selectGPAScale(gpaScale);
        await this.selectGradingSystem(gradingSystem);
    }

    /**
     * The GPA box is a formatted input that ignores fill(); type it key by key.
     * @param {string|number} gpa - e.g. "3.50"
     * @returns {Promise<void>}
     */
    async setUnweightedGpa(gpa) {
        const box = this.page.locator(this.selectors.unweightedGpa);
        const value = String(gpa);
        for (let attempt = 0; attempt < 2; attempt++) {
            await box.click();
            await box.press('Control+A');
            await box.press('Backspace');
            await box.pressSequentially(value, { delay: 60 });
            await box.blur();
            if (parseFloat(await box.inputValue()) === parseFloat(value)) return;
        }
        throw new Error(`Unweighted GPA field did not accept "${value}" (shows "${await box.inputValue()}")`);
    }

    /**
     * @param {{ unweightedGPA: string|number }} data
     * @returns {Promise<void>}
     */
    async validateAcademicDetails({ unweightedGPA }) {
        const shown = await this.page.locator(this.selectors.unweightedGpa).inputValue();
        expect(parseFloat(shown)).toBe(parseFloat(String(unweightedGPA)));
    }

    // ------------------------------------------------------------------ courses

    /**
     * @param {string} subject - one of SUBJECTS
     * @returns {Promise<void>}
     */
    async selectSubject(subject) {
        const tab = this.subjectTab(subject);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.assertionTimeout });
    }

    /**
     * Fill the "Add a course" form for the current subject and save it.
     * Unspecified dropdowns take their first option; grades default to "A".
     * @param {{ subject?: string, academicYear?: string, name?: string, duration?: string,
     *           level?: string, grades?: string[], grade?: string }} [data]
     * @returns {Promise<{ subject: string, name: string, grades: string[] }>}
     */
    async addCourse(data = {}) {
        const subject = data.subject || 'English';
        await this.selectSubject(subject);
        await this.choose(this.selectors.academicYear, data.academicYear);
        const name = await this.choose(this.selectors.courseName, data.name);
        await this.choose(this.selectors.duration, data.duration || 'Semester');
        await this.choose(this.selectors.courseLevel, data.level || 'High School');

        const fields = this.page.locator(this.selectors.gradeFields);
        await fields.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const count = await fields.count();
        /** @type {string[]} */
        const grades = [];
        for (let i = 0; i < count; i++) {
            const g = (data.grades && data.grades[i]) || data.grade || 'A';
            await this.choose(this.gradeFieldSelector(i), g);
            grades.push(g);
        }
        await this.page.locator(this.selectors.saveCourseButton).click();
        await this.courseRow(name).waitFor({ state: 'visible', timeout: this.assertionTimeout });
        return { subject, name, grades };
    }

    /**
     * How many grade fields the form shows for a duration (fills the form up to level).
     * @param {string} duration - Semester | Trimester | Quarterly | Full Year
     * @returns {Promise<number>}
     */
    async gradeFieldCountFor(duration) {
        await this.choose(this.selectors.academicYear);
        await this.choose(this.selectors.courseName);
        await this.choose(this.selectors.duration, duration);
        await this.choose(this.selectors.courseLevel, 'High School');
        await this.page.locator(this.selectors.gradeFields).first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const n = await this.page.locator(this.selectors.gradeFields).count();
        await this.page.locator(this.selectors.clearCourseButton).click();
        return n;
    }

    /**
     * Saved courses for a subject: [{ name, grades }].
     * @param {string} subject
     * @returns {Promise<Array<{ name: string, grades: string }>>}
     */
    async getCourses(subject) {
        await this.selectSubject(subject);
        const rows = this.subjectPanel(subject).locator(this.selectors.coursesTableAfterPanel).locator(this.selectors.row);
        /** @type {Array<{ name: string, grades: string }>} */
        const out = [];
        for (let i = 1; i < await rows.count(); i++) {
            const cells = rows.nth(i).locator(this.selectors.cell);
            if ((await cells.count()) < 2) continue;
            out.push({ name: (await cells.nth(0).innerText()).trim(), grades: (await cells.nth(1).innerText()).trim() });
        }
        return out;
    }

    /**
     * Change a saved course's grades. "Edit" opens an "Edit course" dialog (prefilled;
     * grade dropdowns named "1st Semester grade", ...) saved with "Update course".
     * @param {string} name
     * @param {{ grades: string[] }} updates
     * @returns {Promise<void>}
     */
    async editCourse(name, { grades }) {
        await this.courseButton('Edit', name).click();
        const modal = this.page.locator(this.selectors.editCourseDialog);
        await modal.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const gradeBoxes = modal.locator(this.selectors.editGradeBoxes);
        await gradeBoxes.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        for (let i = 0; i < grades.length && i < await gradeBoxes.count(); i++) {
            // Inside the dialog the list closes on its own; never click outside (it would close the dialog).
            await gradeBoxes.nth(i).click();
            await this.option(grades[i]).click();
        }
        await modal.locator(this.selectors.updateCourseButton).click();
        await modal.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        await expect(this.courseRow(name).locator(this.selectors.cell).nth(1)).toHaveText(grades.join(', '), { timeout: this.assertionTimeout });
    }

    /**
     * Delete a saved course, confirming if asked.
     * @param {string} name
     * @returns {Promise<void>}
     */
    async deleteCourse(name) {
        await this.courseButton('Delete', name).click();
        const confirm = this.page.locator(this.selectors.dialog).or(this.page.locator(this.selectors.alertDialog)).first()
            .locator(this.selectors.confirmDeleteButton);
        if (await confirm.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await confirm.first().click();
        }
        await this.courseRow(name).waitFor({ state: 'detached', timeout: this.assertionTimeout });
    }

    /**
     * @param {{ name: string, grade?: string }} data
     * @returns {Promise<void>}
     */
    async validateCourse({ name, grade }) {
        const row = this.courseRow(name);
        await expect(row).toBeVisible({ timeout: this.assertionTimeout });
        if (grade) await expect(row.locator(this.selectors.cell).nth(1)).toContainText(grade);
    }

    // ------------------------------------------------------------------ flow-spec entry points

    /**
     * Fill the step from flow-spec test data.
     * @param {{ isSelfReported?: boolean, unweightedGPA?: string|number, gpaScale?: string|number,
     *           gradingSystem?: string, courses?: Array<Record<string, any>> }} [data]
     * @returns {Promise<void>}
     */
    async fillGradeInformation(data = {}) {
        if (data.isSelfReported === false) {
            await this.answerSelfReport(false);
            return;
        }
        await this.answerSelfReport(true);
        await this.enterAcademicDetails({
            unweightedGPA: data.unweightedGPA ?? '3.50',
            gpaScale: data.gpaScale ?? '4',
            gradingSystem: data.gradingSystem ?? 'A-F',
        });
        const courses = data.courses && data.courses.length ? data.courses : [{ subject: 'English' }];
        for (const course of courses) await this.addCourse(course);
    }

    /**
     * Self-report with defaults: GPA 3.50 on a 4 scale, A-F, one English course.
     * @returns {Promise<void>}
     */
    async useDefaultSelfReportedGrades() {
        await this.fillGradeInformation({});
    }

    /**
     * HiSET/GED isn't captured on this step as of 2026-11-10. Kept so flow specs fail clearly.
     * @param {Record<string, any>} _data
     * @returns {Promise<never>}
     */
    async enterHiSetGEDGrades(_data) {
        throw new Error('enterHiSetGEDGrades: the live My high school grades step has no HiSET/GED entry; map it once the app team confirms where GED is captured.');
    }

    // ------------------------------------------------------------------ footer

    /**
     * @param {string} [expectedMessage]
     * @returns {Promise<void>}
     */
    async verifyErrorMessage(expectedMessage = 'Please select an option for grade reporting') {
        await expect(this.page.getByText(expectedMessage).first()).toBeVisible({ timeout: this.assertionTimeout });
        await expect(this.page).toHaveURL(/\/my-high-school-grades/);
    }

    /**
     * @returns {Promise<void>}
     */
    async clickContinue() {
        await this.page.locator(this.selectors.continueButton).click();
    }

    /**
     * Continue to step 5, Arizona residency.
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.clickContinue();
        await this.page.waitForURL(/\/ug-app\/\d+\/arizona-residency/, { timeout: this.navigationTimeout });
    }
}

module.exports = MyHighSchoolGradesPage;
