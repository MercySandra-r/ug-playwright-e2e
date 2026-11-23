// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const { runSaveTest } = require('../utils/accountPool');

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
 *
 * POM: every element comes from MyHighSchoolGradesPage (its selectors, locator methods
 * and read-back methods); this spec has no locators of its own.
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

    test('Verify error messages for required fields', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.clickContinue();
        await gradesPage.verifyErrorMessage('Please select an option for grade reporting');
    });

    test('Verify My High School Grades page loads successfully', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.validateMyHighSchoolGrade();
    });

    test('Select transcript only report type', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.selectTranscriptOnlyCard();
        await gradesPage.verifyTranscriptOnlyShown();
    });

    test('Self-reporting shows overall academics', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await gradesPage.verifyOverallAcademicsShown();
    });

    test('Select GPA scale and grading system', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.gpaScale)).toEqual(['4', '100']);
        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.gradingSystem)).toEqual(['A-F', '100 point based']);

        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.75', gpaScale: '4', gradingSystem: 'A-F' });
        await gradesPage.validateAcademicDetails({ unweightedGPA: '3.75' });
        expect(await gradesPage.getAcademicDetails()).toMatchObject({ gpaScale: '4', gradingSystem: 'A-F' });
    });

    test('Validate course subjects and course title options', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        expect(await gradesPage.getSubjectTabs()).toEqual(gradesPage.SUBJECTS);

        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.academicYear))
            .toEqual(['Freshman/9', 'Sophomore/10', 'Junior/11', 'Senior/12']);
        const titles = await gradesPage.getDropdownOptions(gradesPage.selectors.courseName);
        expect(titles).toContain('English I / Freshman English');
    });

    test('Validate grading system (grade fields follow course duration)', { tag: '@regression' }, async () => {
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
            return gradesPage.getDropdownOptions(gradesPage.gradeFieldSelector(0));
        })();
        expect(gradeOptions).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'In Progress', 'Pass']);
    });

    test('Add and validate a course', { tag: '@regression' }, async () => {
        await freshPage();
        await gradesPage.answerSelfReport(true);
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        const course = await gradesPage.addCourse({ subject: 'English', academicYear: 'Freshman/9', name: 'English I / Freshman English', grades: ['A', 'B'] });
        await gradesPage.validateCourse({ name: course.name, grade: 'A, B' });
    });

    test('Add multiple courses across different subjects', { tag: '@regression' }, async () => {
        const math = await gradesPage.addCourse({ subject: 'Math', academicYear: 'Freshman/9' });
        const science = await gradesPage.addCourse({ subject: 'Science', academicYear: 'Freshman/9' });
        expect((await gradesPage.getCourses('Math')).map((c) => c.name)).toContain(math.name);
        expect((await gradesPage.getCourses('Science')).map((c) => c.name)).toContain(science.name);
        expect((await gradesPage.getCourses('English')).map((c) => c.name)).toContain('English I / Freshman English');
    });

    test('Edit a course', { tag: '@regression' }, async () => {
        await gradesPage.selectSubject('English');
        await gradesPage.editCourse('English I / Freshman English', { grades: ['B', 'A'] });
        await gradesPage.validateCourse({ name: 'English I / Freshman English', grade: 'B, A' });
    });

    test('Delete a course', { tag: '@regression' }, async () => {
        const [science] = await gradesPage.getCourses('Science');
        await gradesPage.deleteCourse(science.name);
        expect(await gradesPage.getCourses('Science')).toEqual([]);
    });

    test('Self-report choice can be changed back to transcripts only', { tag: '@regression' }, async () => {
        // Switching to No should hide the self-report form; switch back to keep courses.
        await gradesPage.answerSelfReport(false);
        await gradesPage.verifyTranscriptOnlyShown();
        await gradesPage.answerSelfReport(true);
    });

    test('Save and continue to next section', async ({ browser }, testInfo) => {
        // Saving uses the account up for this suite, so with a reused account this runs on one
        // from the account pool (see utils/accountPool.js).
        await runSaveTest({
            reused: !!(process.env.GRADES_TEST_EMAIL && process.env.GRADES_TEST_PASSWORD),
            browser, testInfo, step: 'my-high-school-grades', own: { page, applicationId: gradesPage.applicationId },
            body: async (p, applicationId, pooled) => {
                const grades = new MyHighSchoolGradesPage(p);
                grades.applicationId = applicationId;
                // A pool account has nothing entered yet; the suite's own account was filled above.
                if (pooled && !(await grades.isStepNotNecessary())) {
                    await grades.chooseSelfReporting();
                    await grades.useDefaultSelfReportedGrades();
                }
                await grades.saveAndContinue();
                await new AZResidencyPage(p).verifyPageLoaded();
            },
        });
    });
});

/**
 * My high school grades for a FUTURE graduate (graduation date next May on My schools):
 * no Yes/No question; two cards instead, "Self-report senior year grades only" and
 * "Self-report all high school grades". Senior-year courses are entered for every subject.
 *
 * One fresh applicant per run, taken through steps 1-3 with a future graduation date; or set
 * GRADES_FUTURE_TEST_EMAIL / GRADES_FUTURE_TEST_PASSWORD to such an account on step 4.
 * The last test saves the step and continues to Arizona residency.
 */
test.describe('My High School Grades Page Tests (future graduate)', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyHighSchoolGradesPage} */
    let gradesPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        gradesPage = new MyHighSchoolGradesPage(page);
        gradesPage.applicationId = process.env.GRADES_FUTURE_TEST_EMAIL && process.env.GRADES_FUTURE_TEST_PASSWORD
            ? await resumeApplication(page, process.env.GRADES_FUTURE_TEST_EMAIL, process.env.GRADES_FUTURE_TEST_PASSWORD)
            : await startApplicationAt(page, 'my-high-school-grades', { graduationDate: `May ${new Date().getFullYear() + 1}` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => gradesPage.navigateToMyHighSchoolGrades();

    test('Future graduation date: report cards instead of the Yes/No question', async () => {
        await freshPage();
        expect(await gradesPage.isSelfReportQuestionShown()).toBe(false);
        expect(await gradesPage.areReportCardsShown()).toBe(true);
        await gradesPage.clickContinue();
        await gradesPage.verifyErrorMessage('Please select an option for grade reporting');
    });

    test('Each card asks for overall academics, all required', async () => {
        for (const card of /** @type {Array<'seniorOnly'|'allGrades'>} */ (['seniorOnly', 'allGrades'])) {
            await freshPage();
            await gradesPage.chooseReportCard(card);
            await gradesPage.verifyOverallAcademicsShown();
            const errors = await gradesPage.captureFieldValidations({ stepName: `Grades: ${gradesPage.REPORT_CARDS[card]}, nothing entered` });
            expect(errors.filter((e) => e.message === 'This is a required field.'), card).toHaveLength(3);
        }
    });

    test('Academic year: locked to Senior/12 for senior grades, any year for all grades', async () => {
        await freshPage();
        await gradesPage.chooseReportCard('seniorOnly');
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        expect(await gradesPage.getAcademicYearState()).toEqual({ value: 'Senior/12', locked: true });

        await freshPage();
        await gradesPage.chooseReportCard('allGrades');
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        expect((await gradesPage.getAcademicYearState()).locked).toBe(false);
        expect(await gradesPage.getDropdownOptions(gradesPage.selectors.academicYear))
            .toEqual(['Freshman/9', 'Sophomore/10', 'Junior/11', 'Senior/12']);
    });

    test('At least one senior-year course is required', async () => {
        await freshPage();
        await gradesPage.chooseReportCard('seniorOnly');
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        await gradesPage.clickContinue();
        await gradesPage.verifyErrorMessage('Please enter at least one course for senior year.');
    });

    test('Senior year grades: two courses in every subject, then continue', async () => {
        test.setTimeout(900000);
        await freshPage();
        await gradesPage.chooseReportCard('seniorOnly');
        await gradesPage.enterAcademicDetails({ unweightedGPA: '3.50' });
        const added = await gradesPage.addCoursesForEverySubject({ perSubject: 2 });
        test.info().annotations.push({ type: 'courses added', description: JSON.stringify(added.map((c) => `${c.subject}: ${c.name}`)) });
        expect(added).toHaveLength(gradesPage.SUBJECTS.length * 2);

        for (const subject of gradesPage.SUBJECTS) {
            const expected = added.filter((c) => c.subject === subject).map((c) => c.name);
            const saved = (await gradesPage.getCourses(subject)).map((c) => c.name);
            expect(saved, subject).toEqual(expect.arrayContaining(expected));
            expect(saved, subject).toHaveLength(2);
        }
        // Saving would use up a reused account (GRADES_FUTURE_TEST_EMAIL); only a fresh one continues.
        if (!(process.env.GRADES_FUTURE_TEST_EMAIL && process.env.GRADES_FUTURE_TEST_PASSWORD)) {
            await gradesPage.saveAndContinue();
            await new AZResidencyPage(page).verifyPageLoaded();
        }
    });
});
