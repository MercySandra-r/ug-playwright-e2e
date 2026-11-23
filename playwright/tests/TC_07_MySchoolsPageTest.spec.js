// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const { openPooledAccount } = require('../utils/accountPool');

/**
 * My schools (step 3 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll) taken through steps 1-2 to step 3. Serial:
 * tests 1-6 start from a fresh load; 7-14 continue the same page session, because
 * saved schools only persist once Continue is clicked. The step ends with ten high
 * schools and ten colleges, is continued, and the last test checks all twenty were kept.
 *
 * Duplicates: every school added is a different one, and the tests check that no saved
 * name appears twice. (A saved high school is no longer offered for the next one; checked
 * 2026-11-20.)
 * "Add a high school" opens an empty form: the earlier school's choices are no longer
 * carried over into it (fixed, tester 2026-11-19). MySchoolsPage.addHighSchool checks
 * this every time it opens a new form.
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

    /** How many high schools, and how many colleges or universities, the step ends with. */
    const SCHOOL_COUNT = 10;
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

    test('Verify error message for required fields', { tag: '@regression' }, async () => {
        await freshPage();
        await schoolsPage.clickContinue();
        await schoolsPage.verifyErrorMessage('This is a required field.');
    });

    test('Verify My Schools page loads successfully', { tag: '@regression' }, async () => {
        await freshPage();
        await schoolsPage.validateMySchools();
    });

    test('Select random high school country', { tag: '@regression' }, async () => {
        await freshPage();
        const country = await schoolsPage.selectRandomHighSchoolCountry();
        expect(country).toBeTruthy();
        expect(await schoolsPage.getHighSchoolCountry()).toBe(country);
    });

    test('Verify school search functionality', { tag: '@regression' }, async () => {
        await freshPage();
        await schoolsPage.choose(schoolsPage.selectors.hsCountry, 'United States');
        await schoolsPage.choose(schoolsPage.selectors.hsState, 'Arizona');
        await schoolsPage.choose(schoolsPage.selectors.hsCity, 'Tempe');
        const schools = await schoolsPage.getListedHighSchools();
        expect(schools.length).toBeGreaterThanOrEqual(SCHOOL_COUNT);
        expect(schools).toContain('Tempe High School');
    });

    test('A filled school must be saved before continuing', { tag: '@regression' }, async () => {
        await freshPage();
        await schoolsPage.fillHighSchool(HIGH_SCHOOL);
        await schoolsPage.markNoCollegeAttended();
        await schoolsPage.acknowledgeTranscripts();
        await schoolsPage.clickContinue();
        await schoolsPage.verifySaveSchoolReminder();
    });

    test('Add and validate a graduating school', { tag: '@regression' }, async () => {
        await freshPage();
        await schoolsPage.addHighSchool(HIGH_SCHOOL);
        await schoolsPage.validateGraduatingSchool({ name: HIGH_SCHOOL.name });
        expect(await schoolsPage.getSavedHighSchools()).toEqual([HIGH_SCHOOL.name]);
    });

    test('Edit a school', { tag: '@regression' }, async () => {
        await schoolsPage.editSchool(HIGH_SCHOOL.name, { name: 'Compadre High School' });
        await schoolsPage.validateGraduatingSchool({ name: 'Compadre High School' });
        expect(await schoolsPage.getSavedHighSchools()).not.toContain(HIGH_SCHOOL.name);
    });

    test('Remove a school', { tag: '@regression' }, async () => {
        // Add a second (previous) school and remove it. Removing the current/most recent one
        // makes the page ask for a current school again before it will continue.
        // (Adding many schools is covered by the 10-school test below.)
        await schoolsPage.addHighSchool(HIGH_SCHOOL);
        expect(await schoolsPage.getSavedHighSchools()).toEqual(expect.arrayContaining(['Compadre High School', HIGH_SCHOOL.name]));
        await schoolsPage.removeSchool(HIGH_SCHOOL.name);
        expect(await schoolsPage.getSavedHighSchools()).toEqual(['Compadre High School']);
    });

    test('Add and remove a college or university', { tag: '@regression' }, async () => {
        const { institution } = await schoolsPage.addCollegeOrUniversity({ state: 'Arizona', city: 'Mesa' });
        expect(await schoolsPage.getSavedInstitutions()).toContain(institution);

        await schoolsPage.removeSchool(institution);
        expect(await schoolsPage.getSavedInstitutions()).not.toContain(institution);
        await schoolsPage.markNoCollegeAttended();
    });

    test('Transcript requirements dialog', { tag: '@regression' }, async () => {
        const text = await schoolsPage.openTranscriptRequirements();
        expect(text).toContain('High school transcripts only');
        await schoolsPage.closeDialog();
    });

    test(`Add ${SCHOOL_COUNT} different high schools`, async () => {
        test.setTimeout(600000);
        // Whatever is saved already counts towards the total (normally Compadre High School from
        // the tests above; nothing after a reload or when this test runs on its own, because
        // schools only live in the page until Continue).
        const before = await schoolsPage.getSavedHighSchools();
        const added = await schoolsPage.addHighSchools(SCHOOL_COUNT, { country: 'United States', state: 'Arizona', city: 'Tempe' });
        test.info().annotations.push({ type: 'high schools added', description: JSON.stringify(added) });
        expect(added).toHaveLength(SCHOOL_COUNT - before.length);
        const saved = await schoolsPage.getSavedHighSchools();
        expect(saved).toHaveLength(SCHOOL_COUNT);
        expect(saved).toEqual(expect.arrayContaining([...before, ...added]));
        expect(new Set(saved).size, 'no high school is saved twice').toBe(saved.length);
    });

    // Saving uses the account up for this suite. With a reused account (MYSCHOOLS_TEST_EMAIL)
    // the save and the check after it run on an account from the account pool instead (see
    // utils/accountPool.js), which first gets its own high schools and colleges.
    // Without one (the usual case) they run on the suite's own account: no new account.
    const reused = !!(process.env.MYSCHOOLS_TEST_EMAIL && process.env.MYSCHOOLS_TEST_PASSWORD);
    /** @type {Awaited<ReturnType<typeof openPooledAccount>> | undefined} */
    let pooled;

    test.afterAll(async () => {
        await pooled?.context.close();
    });

    test(`Add ${SCHOOL_COUNT} different colleges or universities, save and continue, and all schools are kept`, async ({ browser }, testInfo) => {
        test.setTimeout(1800000);
        // Mesa first: its institution list matches the dropdown's search (Tempe's search drops some
        // listed names). Mesa lists 8, so the rest come from Phoenix.
        const before = await schoolsPage.getSavedInstitutions();
        const added = await schoolsPage.addColleges(SCHOOL_COUNT, { state: 'Arizona', city: 'Mesa' });
        test.info().annotations.push({ type: 'institutions added', description: JSON.stringify(added) });
        const saved = await schoolsPage.getSavedInstitutions();
        expect(saved).toHaveLength(SCHOOL_COUNT);
        expect(saved).toEqual(expect.arrayContaining([...before, ...added]));
        expect(new Set(saved).size, 'no institution is saved twice').toBe(saved.length);

        // Save the step. The high schools come from the test above; topped up if this test
        // runs on its own, or on a pool account.
        let target = schoolsPage;
        if (reused) {
            pooled = await openPooledAccount(browser, testInfo, 'my-schools');
            testInfo.annotations.push({ type: 'account', description: `${pooled.email} (${pooled.fromPool ? 'from the pool' : 'new'})` });
            target = new MySchoolsPage(pooled.page);
            target.applicationId = pooled.applicationId;
            await target.navigateToMySchools();
            await target.verifyPageLoaded();
        }
        await target.addHighSchools(SCHOOL_COUNT, { country: 'United States', state: 'Arizona', city: 'Tempe' });
        await target.addColleges(SCHOOL_COUNT, { state: 'Arizona', city: 'Mesa' });
        // Keep the colleges: answer stays "Yes".
        await target.acknowledgeTranscripts();
        await target.saveAndContinue();
        await new MyHighSchoolGradesPage(target.page).verifyPageLoaded();

        // Back on My schools: everything was kept by the save.
        await target.navigateToMySchools();
        const keptHighSchools = await target.getSavedHighSchools();
        const keptInstitutions = await target.getSavedInstitutions();
        expect(keptHighSchools).toHaveLength(SCHOOL_COUNT);
        expect(keptInstitutions).toHaveLength(SCHOOL_COUNT);
        expect(new Set(keptHighSchools).size, 'no high school is kept twice').toBe(SCHOOL_COUNT);
        expect(new Set(keptInstitutions).size, 'no institution is kept twice').toBe(SCHOOL_COUNT);
        // Saved and checked: a pool account now sits on grades, for that suite's save test.
        pooled?.passOn();
    });
});
