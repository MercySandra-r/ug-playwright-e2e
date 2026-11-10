// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');

/**
 * My high school grades (step 4 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll) taken through steps 1-3 to step 4. Serial:
 * tests 1-7 start from a fresh load; 8-13 continue one page session (courses added
 * there are only kept once Continue is clicked). The last test continues to step 5.
 * Account creation is rate-limited per hour by the IdP; this suite creates one.
 *
 * Debugging without creating accounts: set GRADES_TEST_EMAIL and GRADES_TEST_PASSWORD
 * to an account whose application is on step 4.
 */
test.describe('My High School Grades Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyHighSchoolGradesPage} */
    let gradesPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(420000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        gradesPage = new MyHighSchoolGradesPage(page);
        gradesPage.applicationId = process.env.GRADES_TEST_EMAIL && process.env.GRADES_TEST_PASSWORD
            ? await resumeApplication(page, process.env.GRADES_TEST_EMAIL, process.env.GRADES_TEST_PASSWORD)
            : await startApplicationAt(page, 'my-high-school-grades');
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => gradesPage.navigateToMyHighSchoolGrades();

    test('Verify error messages for required fields', async () => {
        await freshPage();
        await gradesPage.clickContinue();
        await gradesPage.verifyErrorMessage('Please select an option for grade reporting');
        await expect(page).toHaveURL(/\/my-high-school-grades/);
    });

    test('Verify My High School Grades page loads successfully', async () => {
        await freshPage();
        await gradesPage.validateMyHighSchoolGrade();
    });

    test('Select transcript only report type', async () => {
        await freshPage();
        await gradesPage.selectTranscriptOnlyCard();
        await expect(page.locator(gradesPage.selectors.noSelfReportHint)).toBeVisible();
        await expect(page.locator(gradesPage.selectors.overallAcademicsHeading)).toHaveCount(0);
    });

    test('Self-reporting shows overall academics', async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await expect(page.locator(gradesPage.selectors.overallAcademicsHeading)).toBeVisible();
        await expect(page.locator(gradesPage.selectors.unweightedGpa)).toBeVisible();
        await expect(page.locator(gradesPage.selectors.gpaScale)).toBeVisible();
        await expect(page.locator(gradesPage.selectors.gradingSystem)).toBeVisible();
    });

    test('Select GPA scale and grading system', async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.gpaScale)).toEqual(['4', '100']);
        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.gradingSystem)).toEqual(['A-F', '100 point based']);

        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.75', gpaScale: '4', gradingSystem: 'A-F' });
        await gradesPage.validateAcademicDetails({ unweightedGPA: '3.75' });
        await expect(page.locator(gradesPage.selectors.gpaScale)).toHaveValue('4');
        await expect(page.locator(gradesPage.selectors.gradingSystem)).toHaveValue('A-F');
    });

    test('Validate course subjects and course title options', async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        const tabs = (await page.getByRole('tab').allInnerTexts()).map((t) => t.trim());
        expect(tabs).toEqual(gradesPage.SUBJECTS);

        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.academicYear))
            .toEqual(['Freshman/9', 'Sophomore/10', 'Junior/11', 'Senior/12']);
        const titles = await gradesPage.getDropdownOptions(gradesPage.selectors.courseName);
        expect(titles).toContain('English I / Freshman English');
    });

    test('Validate grading system (grade fields follow course duration)', async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        expect(await gradesPage.gradeFieldCountFor('Semester')).toBe(2);
        expect(await gradesPage.gradeFieldCountFor('Full Year')).toBeGreaterThanOrEqual(1);
        const gradeOptions = await (async () => {
            await gradesPage.choose(gradesPage.selectors.academicYear);
            await gradesPage.choose(gradesPage.selectors.courseName);
            await gradesPage.choose(gradesPage.selectors.duration, 'Semester');
            await gradesPage.choose(gradesPage.selectors.courseLevel, 'High School');
            return gradesPage.getDropdownOptions('#grades-update-0');
        })();
        expect(gradeOptions).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'In Progress', 'Pass']);
    });

    test('Add and validate a course', async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        const course = await gradesPage.addCourse({ subject: 'English', academicYear: 'Freshman/9', name: 'English I / Freshman English', grades: ['A', 'B'] });
        await gradesPage.validateCourse({ name: course.name, grade: 'A, B' });
    });

    test('Add multiple courses across different subjects', async () => {
        const math = await gradesPage.addCourse({ subject: 'Math', academicYear: 'Freshman/9' });
        const science = await gradesPage.addCourse({ subject: 'Science', academicYear: 'Freshman/9' });
        expect((await gradesPage.getCourses('Math')).map((c) => c.name)).toContain(math.name);
        expect((await gradesPage.getCourses('Science')).map((c) => c.name)).toContain(science.name);
        expect((await gradesPage.getCourses('English')).map((c) => c.name)).toContain('English I / Freshman English');
    });

    test('Edit a course', async () => {
        await gradesPage.selectSubject('English');
        await gradesPage.editCourse('English I / Freshman English', { grades: ['B', 'A'] });
        await gradesPage.validateCourse({ name: 'English I / Freshman English', grade: 'B, A' });
    });

    test('Delete a course', async () => {
        const [science] = await gradesPage.getCourses('Science');
        await gradesPage.deleteCourse(science.name);
        expect(await gradesPage.getCourses('Science')).toEqual([]);
    });

    test('Self-report choice can be changed back to transcripts only', async () => {
        // Switching to No should hide the self-report form; switch back to keep courses.
        await gradesPage.answerSelfReport(false);
        await expect(page.locator(gradesPage.selectors.noSelfReportHint)).toBeVisible();
        await gradesPage.answerSelfReport(true);
    });

    test('Save and continue to next section', async () => {
        await gradesPage.saveAndContinue();
        await expect(page.getByRole('heading', { name: /Arizona residency/i, level: 1 })).toBeVisible();
    });
});
