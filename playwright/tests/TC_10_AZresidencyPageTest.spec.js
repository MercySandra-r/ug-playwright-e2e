// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt, resumeApplication } = require('../utils/applicationJourney');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');

/**
 * Arizona residency (step 5 of the application wizard), against the live page.
 *
 * One fresh account per run (beforeAll) taken through steps 1-4 to step 5. Serial:
 * tests 1-8 start from a fresh load; the last test continues test 8's filled form
 * to Review. Account creation is rate-limited per hour; this suite creates one.
 *
 * The old document upload / additional-information / military tests are gone: the
 * live step has no uploads or free-text box, and military status is asked on
 * My information.
 *
 * Debugging without creating accounts: set RESIDENCY_TEST_EMAIL and
 * RESIDENCY_TEST_PASSWORD to an account whose application is on step 5.
 *
 * POM: every element comes from AZResidencyPage (its selectors, locator methods and
 * read-back methods); this spec has no locators of its own.
 */
test.describe('AZ Residency Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {AZResidencyPage} */
    let residencyPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        residencyPage = new AZResidencyPage(page);
        residencyPage.applicationId = process.env.RESIDENCY_TEST_EMAIL && process.env.RESIDENCY_TEST_PASSWORD
            ? await resumeApplication(page, process.env.RESIDENCY_TEST_EMAIL, process.env.RESIDENCY_TEST_PASSWORD)
            : await startApplicationAt(page, 'arizona-residency');
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => residencyPage.navigateToAZResidency();

    test('Verify error message for required fields', async () => {
        await freshPage();
        await residencyPage.clickContinue();
        await residencyPage.verifyErrorMessage('This is a required field.');
        // State, six Yes/No questions and the support total are all required.
        expect(await residencyPage.getRequiredFieldErrorCount()).toBeGreaterThanOrEqual(6);
    });

    test('Verify AZ Residency page loads successfully', async () => {
        await freshPage();
        await residencyPage.validateAZresidencyPage();
        // This applicant has no uniformed-services affiliation, so no veteran questions.
        expect(await residencyPage.isVeteranSectionShown()).toBe(false);
    });

    test('Answer permanent home question (non-AZ resident)', async () => {
        await freshPage();
        await residencyPage.answerPermanentHomeQuestion(false);
        expect(await residencyPage.getPermanentState()).toBe('California');
        expect(await residencyPage.isQuestionVisible('livedInAz12Months')).toBeFalsy();
        expect(await residencyPage.isQuestionVisible('married')).toBeFalsy();
    });

    test('Answer permanent home question (AZ resident)', async () => {
        await freshPage();
        await residencyPage.answerPermanentHomeQuestion(true);
        expect(await residencyPage.getPermanentState()).toBe('Arizona');
        expect(await residencyPage.isQuestionVisible('livedInAz12Months')).toBeTruthy();
        expect(await residencyPage.isQuestionVisible('married')).toBeTruthy();
        expect(await residencyPage.getAnswer('livedInAz12Months')).toBe('Yes');
    });

    test('Financial support must total 100%', async () => {
        await freshPage();
        await residencyPage.setFinancialSupport({ parent: 60, employment: 20 });
        expect(await residencyPage.getSupportTotal()).toBe(80);
        await residencyPage.clickContinue();
        await expect.poll(() => residencyPage.isSupportTotalErrorShown()).toBe(true);

        await residencyPage.setFinancialSupport({ parent: 60, employment: 40 });
        expect(await residencyPage.getSupportTotal()).toBe(100);
        await expect.poll(() => residencyPage.isSupportTotalErrorShown()).toBe(false);
    });

    test('Answer parent/guardian question', async () => {
        await freshPage();
        await residencyPage.answerParentGuardianQuestion(true);
        // Parents living in Arizona reveals the parent block.
        await residencyPage.verifyArizonaParentBlockShown();

        await residencyPage.fillArizonaParentDetails({ relationship: 'Mother', filedTaxes: true });
        expect(await residencyPage.getDropdownValue(residencyPage.selectors.parentRelationship)).toBe('Mother');
    });

    test('Employment follow-up question', async () => {
        await freshPage();
        expect(await residencyPage.isQuestionVisible('employedLast12Months')).toBeFalsy();
        await residencyPage.answer('employed', false);
        expect(await residencyPage.isQuestionVisible('employedLast12Months')).toBeTruthy();
        await residencyPage.answer('employed', true);
        await residencyPage.waitForQuestionHidden('employedLast12Months');
    });

    test('Complete AZ residency form: Arizona resident, every answer Yes', async () => {
        await freshPage();
        const autoFilled = await residencyPage.fillArizonaResidentAllYes();
        test.info().annotations.push({ type: 'follow-ups answered', description: JSON.stringify(autoFilled) });
        expect(await residencyPage.getPermanentState()).toBe('Arizona');
        expect(await residencyPage.getDropdownValue(residencyPage.selectors.parentState)).toBe('Arizona');
        expect(await residencyPage.getSupportTotal()).toBe(100);
        for (const key of Object.keys(residencyPage.QUESTIONS)) {
            if (await residencyPage.isQuestionVisible(key)) expect(await residencyPage.getAnswer(key), key).toBe('Yes');
        }
        // Every question is now answered: a second pass finds nothing left.
        expect(await residencyPage.answerRemainingQuestions(4, { answer: true, preferredOption: 'Arizona' })).toEqual([]);
    });

    test('Save and continue to next section', async () => {
        await residencyPage.saveAndContinue();
        await new ReviewPage(page).verifyPageLoaded();
    });
});

/**
 * Arizona residency for a veteran: My information answered "I am a U.S. service member or
 * veteran" with status Veteran, which adds three questions to this step (DD-214 character
 * of service, discharge date, "Are you registered to vote?").
 *
 * One fresh veteran applicant per run, taken through steps 1-4 (beforeAll); or set
 * RESIDENCY_VETERAN_TEST_EMAIL / RESIDENCY_VETERAN_TEST_PASSWORD to a veteran account whose
 * application is on (or past) step 5. The last test saves the step and continues to Review.
 */
test.describe('AZ Residency Page Tests (veteran)', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {AZResidencyPage} */
    let residencyPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        residencyPage = new AZResidencyPage(page);
        residencyPage.applicationId = process.env.RESIDENCY_VETERAN_TEST_EMAIL && process.env.RESIDENCY_VETERAN_TEST_PASSWORD
            ? await resumeApplication(page, process.env.RESIDENCY_VETERAN_TEST_EMAIL, process.env.RESIDENCY_VETERAN_TEST_PASSWORD)
            : await startApplicationAt(page, 'arizona-residency', { veteran: true });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => residencyPage.navigateToAZResidency();

    test('Veteran questions are asked: DD-214, discharge date, voter registration', async () => {
        await freshPage();
        expect(await residencyPage.isVeteranSectionShown()).toBe(true);
        expect(await residencyPage.isQuestionVisible('registeredToVote')).toBe(true);
        expect(await residencyPage.getDropdownOptionsOf(residencyPage.selectors.dd214CharacterOfService))
            .toEqual(residencyPage.DD214_CHARACTER_OF_SERVICE);
        expect(await residencyPage.getDropdownOptionsOf(residencyPage.selectors.dischargeMonth)).toHaveLength(12);
        const years = await residencyPage.getDropdownOptionsOf(residencyPage.selectors.dischargeYear);
        expect(years[0]).toBe(String(new Date().getFullYear()));
        expect(years).toHaveLength(101);
    });

    test('Veteran answers can be entered and read back', async () => {
        await freshPage();
        const entered = await residencyPage.fillVeteranDetails({
            characterOfService: 'Honorable', discharged: { month: 'May', year: '2020' }, registeredToVote: true,
        });
        expect(await residencyPage.getVeteranDetails()).toEqual(entered);
    });

    test('Arizona resident veteran, every answer Yes: save and continue to Review', async () => {
        await freshPage();
        await residencyPage.fillArizonaResidentAllYes();
        expect(await residencyPage.getVeteranDetails()).toEqual({
            characterOfService: 'Honorable', discharged: { month: 'May', year: '2020' }, registeredToVote: 'Yes',
        });
        await residencyPage.saveAndContinue();
        await new ReviewPage(page).verifyPageLoaded();
    });
});

/**
 * Arizona residency for a spouse/dependent of a U.S. service member or veteran (My
 * information's second uniformed-services option). The step asks "Which best describes
 * the service member or veteran?"; each answer has its own follow-ups. Every scenario is
 * also answered all-Yes with Arizona, checking nothing is left unanswered.
 *
 * One fresh spouse/dependent applicant per run, taken through steps 1-4 (beforeAll); or set
 * RESIDENCY_SPOUSE_TEST_EMAIL / RESIDENCY_SPOUSE_TEST_PASSWORD to such an account whose
 * application is on (or past) step 5. The last test saves the step and continues to Review.
 */
test.describe('AZ Residency Page Tests (spouse/dependent of a service member)', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {AZResidencyPage} */
    let residencyPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        residencyPage = new AZResidencyPage(page);
        residencyPage.applicationId = process.env.RESIDENCY_SPOUSE_TEST_EMAIL && process.env.RESIDENCY_SPOUSE_TEST_PASSWORD
            ? await resumeApplication(page, process.env.RESIDENCY_SPOUSE_TEST_EMAIL, process.env.RESIDENCY_SPOUSE_TEST_PASSWORD)
            : await startApplicationAt(page, 'arizona-residency', { spouseOfServiceMember: true });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => residencyPage.navigateToAZResidency();

    test('Which best describes the service member: options and their follow-ups', async () => {
        await freshPage();
        expect(await residencyPage.isSpouseOfServiceMemberSectionShown()).toBe(true);
        expect(await residencyPage.isVeteranSectionShown()).toBe(false);
        expect(await residencyPage.getDropdownOptionsOf(residencyPage.selectors.serviceMemberType))
            .toEqual(residencyPage.SERVICE_MEMBER_TYPES);
        /** @type {Record<string, string[]>} */
        const seen = {};
        for (const type of residencyPage.SERVICE_MEMBER_TYPES) {
            await residencyPage.choose(residencyPage.selectors.serviceMemberType, type);
            seen[type] = await residencyPage.getSpouseOfServiceMemberFollowUps();
        }
        expect(seen).toEqual({
            'Active Duty': ['stationedState'],
            'Armed Forces Reserve': ['stationedState'],
            'National Guard': ['stationedState'],
            'Not Applicable': [],
            'Veteran': ['registeredToVote', 'chapter30or33', 'discharged'],
        });
    });

    test('Every scenario answered all Yes with Arizona leaves nothing unanswered', async () => {
        test.setTimeout(600000);
        for (const type of residencyPage.SERVICE_MEMBER_TYPES) {
            await test.step(type, async () => {
                await freshPage();
                await residencyPage.fillArizonaResidentAllYes({ type });
                const details = await residencyPage.getSpouseOfServiceMemberDetails();
                expect(details.type).toBe(type);
                if (details.stationedState !== undefined) expect(details.stationedState).toBe('Arizona');
                if (details.registeredToVote !== undefined) expect(details.registeredToVote).toBe('Yes');
                if (details.chapter30or33 !== undefined) expect(details.chapter30or33).toBe('Yes');
                expect(await residencyPage.getQuestionsNotAnsweredYes(), `${type}: every question Yes`).toEqual([]);
                expect(await residencyPage.answerRemainingQuestions(4, { answer: true, preferredOption: 'Arizona' }),
                    `${type}: nothing left unanswered`).toEqual([]);
                expect(await residencyPage.getSupportTotal()).toBe(100);
            });
        }
    });

    test('Spouse of a veteran, every answer Yes: save and continue to Review', async () => {
        await freshPage();
        await residencyPage.fillArizonaResidentAllYes({ type: 'Veteran' });
        await residencyPage.saveAndContinue();
        await new ReviewPage(page).verifyPageLoaded();
    });
});
