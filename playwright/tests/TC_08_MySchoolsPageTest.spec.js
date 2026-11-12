// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');

/**
 * My schools (step 3 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll) taken through steps 1-2 to step 3. Serial:
 * tests 1-6 start from a fresh load; 7-14 continue the same page session, because
 * saved schools only persist once Continue is clicked. The step ends with five high
 * schools and five colleges, is continued, and the last test checks all ten were kept.
 * Account creation is rate-limited per hour by the IdP; this suite creates one.
 *
 * Debugging without creating accounts: set MYSCHOOLS_TEST_EMAIL and
 * MYSCHOOLS_TEST_PASSWORD to an account whose application is on step 3.
 *
 * POM: every element comes from MySchoolsPage (its selectors, locator methods and
 * read-back methods); this spec has no locators of its own.
 */
test.describe('My Schools Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    const HIGH_SCHOOL = { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: 'May 2026' };

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MySchoolsPage} */
    let schoolsPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(360000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        schoolsPage = new MySchoolsPage(page);
        schoolsPage.applicationId = process.env.MYSCHOOLS_TEST_EMAIL && process.env.MYSCHOOLS_TEST_PASSWORD
            ? await resumeApplication(page, process.env.MYSCHOOLS_TEST_EMAIL, process.env.MYSCHOOLS_TEST_PASSWORD)
            : await startApplicationAt(page, 'my-schools');
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => schoolsPage.navigateToMySchools();

    test('Verify error message for required fields', async () => {
        await freshPage();
        await schoolsPage.clickContinue();
        await schoolsPage.verifyErrorMessage('This is a required field.');
    });

    test('Verify My Schools page loads successfully', async () => {
        await freshPage();
        await schoolsPage.validateMySchools();
    });

    test('Select random high school country', async () => {
        await freshPage();
        const country = await schoolsPage.selectRandomHighSchoolCountry();
        expect(country).toBeTruthy();
        expect(await schoolsPage.getHighSchoolCountry()).toBe(country);
    });

    test('Verify school search functionality', async () => {
        await freshPage();
        await schoolsPage.choose(schoolsPage.selectors.hsCountry, 'United States');
        await schoolsPage.choose(schoolsPage.selectors.hsState, 'Arizona');
        await schoolsPage.choose(schoolsPage.selectors.hsCity, 'Tempe');
        const schools = await schoolsPage.getDropdownOptions(schoolsPage.selectors.hsName);
        expect(schools.length).toBeGreaterThan(1);
        expect(schools).toContain('Tempe High School');
    });

    test('A filled school must be saved before continuing', async () => {
        await freshPage();
        await schoolsPage.fillHighSchool(HIGH_SCHOOL);
        await schoolsPage.markNoCollegeAttended();
        await schoolsPage.acknowledgeTranscripts();
        await schoolsPage.clickContinue();
        await schoolsPage.verifySaveSchoolReminder();
    });

    test('Add and validate a graduating school', async () => {
        await freshPage();
        await schoolsPage.addHighSchool(HIGH_SCHOOL);
        await schoolsPage.validateGraduatingSchool({ name: HIGH_SCHOOL.name });
        expect(await schoolsPage.getSavedHighSchools()).toEqual([HIGH_SCHOOL.name]);
    });

    test('Edit a school', async () => {
        await schoolsPage.editSchool(HIGH_SCHOOL.name, { name: 'Compadre High School' });
        await schoolsPage.validateGraduatingSchool({ name: 'Compadre High School' });
        expect(await schoolsPage.getSavedHighSchools()).not.toContain(HIGH_SCHOOL.name);
    });

    test('Add multiple schools', async () => {
        await schoolsPage.addHighSchool(HIGH_SCHOOL);
        const saved = await schoolsPage.getSavedHighSchools();
        expect(saved).toEqual(expect.arrayContaining(['Compadre High School', HIGH_SCHOOL.name]));
        expect(saved.length).toBe(2);
    });

    test('Remove a school', async () => {
        // Remove the additional (previous) school. Removing the current/most recent one
        // makes the page ask for a current school again before it will continue.
        await schoolsPage.removeSchool(HIGH_SCHOOL.name);
        expect(await schoolsPage.getSavedHighSchools()).toEqual(['Compadre High School']);
    });

    test('Add and remove a college or university', async () => {
        const { institution } = await schoolsPage.addCollegeOrUniversity({ state: 'Arizona', city: 'Mesa' });
        expect(await schoolsPage.getSavedInstitutions()).toContain(institution);

        await schoolsPage.removeSchool(institution);
        expect(await schoolsPage.getSavedInstitutions()).not.toContain(institution);
        await schoolsPage.markNoCollegeAttended();
    });

    test('Transcript requirements dialog', async () => {
        const text = await schoolsPage.openTranscriptRequirements();
        expect(text).toContain('High school transcripts only');
        await schoolsPage.closeDialog();
    });

    test('Add five high schools', async () => {
        test.setTimeout(300000);
        const added = await schoolsPage.addHighSchools(5, { country: 'United States', state: 'Arizona', city: 'Tempe' });
        test.info().annotations.push({ type: 'high schools added', description: JSON.stringify(added) });
        const saved = await schoolsPage.getSavedHighSchools();
        expect(saved).toHaveLength(5);
        expect(saved).toEqual(expect.arrayContaining(['Compadre High School', ...added]));
    });

    test('Add five colleges or universities', async () => {
        test.setTimeout(300000);
        // Mesa: its institution list matches the dropdown's search (Tempe's search drops some listed names).
        const added = await schoolsPage.addColleges(5, { state: 'Arizona', city: 'Mesa' });
        test.info().annotations.push({ type: 'institutions added', description: JSON.stringify(added) });
        const saved = await schoolsPage.getSavedInstitutions();
        expect(saved).toHaveLength(5);
        expect(saved).toEqual(expect.arrayContaining(added));
    });

    test('Save and continue to next section', async () => {
        test.skip(!!(process.env.MYSCHOOLS_TEST_EMAIL && process.env.MYSCHOOLS_TEST_PASSWORD), 'Saves the step, which would use up the reused account (see *_TEST_EMAIL in .env); runs on a fresh account');
        // Keep the five colleges: answer stays "Yes".
        await schoolsPage.acknowledgeTranscripts();
        await schoolsPage.saveAndContinue();
        await new MyHighSchoolGradesPage(page).verifyPageLoaded();
    });

    test('Five high schools and five colleges are kept after Continue', async () => {
        test.skip(!!(process.env.MYSCHOOLS_TEST_EMAIL && process.env.MYSCHOOLS_TEST_PASSWORD), 'Saves the step, which would use up the reused account (see *_TEST_EMAIL in .env); runs on a fresh account');
        await schoolsPage.navigateToMySchools();
        expect(await schoolsPage.getSavedHighSchools()).toHaveLength(5);
        expect(await schoolsPage.getSavedInstitutions()).toHaveLength(5);
    });
});
