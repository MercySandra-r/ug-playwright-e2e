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
 */
class MyHighSchoolGradesPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page);

        this.selectors = {
            heading: 'role=heading[name="My high school grades"][level=1]',
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

            continueButton: 'button[type="submit"][form="page-form"]',
            gradeReportingError: 'text=Please select an option for grade reporting',
        };

        this.SUBJECTS = SUBJECTS;
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
        await expect(this.page.getByRole('heading', { name: 'Want a faster admission decision?' })).toBeVisible();
        await expect(this.page.locator(this.selectors.selfReportGroup)).toBeVisible();
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
        await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const label = value || (await this.page.getByRole('option').first().innerText()).replace(/\s*✓\s*$/, '').trim();
        await this.page.getByRole('option', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( ✓)?$`) }).first().click();
        await this.closeOpenList();
        return label;
    }

    /**
     * Some lists (e.g. Grading system) stay open after a pick, showing a tick; close any
     * open list with Escape, then by clicking the page heading.
     * @returns {Promise<void>}
     */
    async closeOpenList() {
        const options = this.page.getByRole('option');
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
        await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const labels = (await this.page.getByRole('option').allInnerTexts())
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
        await this.page.locator(this.selectors.selfReportGroup)
            .getByRole('radio', { name: selfReport ? 'Yes' : 'No', exact: true }).click();
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
        await this.page.getByRole('tablist').waitFor({ state: 'visible', timeout: this.assertionTimeout });
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
        const tab = this.page.getByRole('tab', { name: subject, exact: true });
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
            await this.choose(`#grades-update-${i}`, g);
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
     * Saved course row in the current subject's table.
     * @param {string} name
     * @returns {import('@playwright/test').Locator}
     */
    courseRow(name) {
        return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name, exact: true }) });
    }

    /**
     * Saved courses for a subject: [{ name, grades }].
     * @param {string} subject
     * @returns {Promise<Array<{ name: string, grades: string }>>}
     */
    async getCourses(subject) {
        await this.selectSubject(subject);
        const panel = this.page.getByRole('tabpanel', { name: subject });
        const rows = panel.locator('xpath=following::table[1]').getByRole('row');
        /** @type {Array<{ name: string, grades: string }>} */
        const out = [];
        for (let i = 1; i < await rows.count(); i++) {
            const cells = rows.nth(i).getByRole('cell');
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
        await this.page.getByRole('button', { name: `Edit course work for ${name}` }).click();
        const modal = this.page.getByRole('dialog', { name: 'Edit course' });
        await modal.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const gradeBoxes = modal.getByRole('combobox', { name: / grade$/ });
        await gradeBoxes.first().waitFor({ state: 'visible', timeout: this.assertionTimeout });
        for (let i = 0; i < grades.length && i < await gradeBoxes.count(); i++) {
            // Inside the dialog the list closes on its own; never click outside (it would close the dialog).
            await gradeBoxes.nth(i).click();
            await this.page.getByRole('option', { name: grades[i], exact: true }).first().click();
        }
        await modal.getByRole('button', { name: 'Update course', exact: true }).click();
        await modal.waitFor({ state: 'hidden', timeout: this.assertionTimeout });
        await expect(this.courseRow(name).getByRole('cell').nth(1)).toHaveText(grades.join(', '), { timeout: this.assertionTimeout });
    }

    /**
     * Delete a saved course, confirming if asked.
     * @param {string} name
     * @returns {Promise<void>}
     */
    async deleteCourse(name) {
        await this.page.getByRole('button', { name: `Delete course work for ${name}` }).click();
        const confirm = this.page.getByRole('dialog').or(this.page.getByRole('alertdialog')).first()
            .getByRole('button', { name: /^(delete|remove|yes|confirm)/i });
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
        if (grade) await expect(row.getByRole('cell').nth(1)).toContainText(grade);
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
