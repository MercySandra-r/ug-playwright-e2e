// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F11: VUS_InPerson_FGD_Resident
 * (row F11 of the "E2E Flows" sheet, "NAA App - Automation Test flows" workbook)
 *
 *   VUS                 visiting university student: landing "individual classes" (No to "already
 *                       earned a bachelor's degree?" and to "previously started courses ... at
 *                       ASU"), then Yes to "Are you visiting ASU from another college or
 *                       university?" on My program; Review shows "Visiting University Student"
 *   InPerson            in person; no location is preselected, the first one offered is chosen
 *   Resident            U.S. citizen with an Arizona home address (the journey's default)
 *   Previous ASU        never affiliated; military status "None of these options apply to me"
 *   FGD                 My schools: Tempe High School, graduation date in the future; no
 *                       colleges; no transcript acknowledgement for a visiting student (checked)
 *   Grades              "As a nondegree or visiting university student, this page is not necessary"
 *   Residency           Arizona: permanent home and parents in Arizona (the sheet's "Arizona")
 *   Payment             whatever Review offers
 *
 * One fresh account per run (beforeAll), taken through My information by the journey; the
 * tests then cover My program (visiting, in person), My schools, grades, residency, Review and
 * submission.
 *
 * THIS FLOW ALWAYS SUBMITS the application (it cannot be undone), so every run leaves one
 * submitted application in QA. The last name is different on every run.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

/** Letters only, new on every run. */
const uniqueLastName = `Flow${Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')}`;
const nextYear = new Date().getFullYear() + 1;

const testData = {
    mode: /** @type {'in-person'} */ ('in-person'),
    degreeType: /** @type {'individual'} */ ('individual'),
    applicant: {
        firstName: 'Qa',
        lastName: uniqueLastName,
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 20) },
        usCitizen: true, // Arizona home address: the journey's default
    },
    highSchool: { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${nextYear}` },
    residency: { permanentState: 'Arizona' },
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;
/** Under 24 with an Arizona high school, home Arizona (verified for the TC_09 scenario). */
const ARIZONA_HOME_FIELDS = AZResidencyPage.RESIDENCY_SCENARIOS.arizonaHighSchool.homeArizona;

test.describe('F11 VUS InPerson FGD Resident', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyASUProgramPage} */
    let programPage;
    /** @type {MySchoolsPage} */
    let schoolsPage;
    /** @type {MyHighSchoolGradesPage} */
    let gradesPage;
    /** @type {AZResidencyPage} */
    let residencyPage;
    /** @type {ReviewPage} */
    let reviewPage;
    let applicationId = '';
    /** What My program chose (location and start term), for the Review check. */
    let chosen = { location: '', startTerm: '' };

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Landing (in person, nondegree/visiting, both questions No), sign-up and My information.
        applicationId = await startApplicationAt(page, 'my-program', {
            captureValidations: false,
            mode: testData.mode,
            degreeType: testData.degreeType,
            applicant: testData.applicant,
        });
        programPage = new MyASUProgramPage(page);
        schoolsPage = new MySchoolsPage(page);
        gradesPage = new MyHighSchoolGradesPage(page);
        residencyPage = new AZResidencyPage(page);
        reviewPage = new ReviewPage(page);
        for (const p of [programPage, schoolsPage, gradesPage, residencyPage, reviewPage]) p.applicationId = applicationId;
        testInfo.annotations.push({ type: 'application', description: `${applicationId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it. These helpers do a missing step once, so any test
    // can also be run on its own (for example from the UI panel).
    const done = { program: false, schools: false, grades: false, residency: false, submitted: false };

    async function ensureProgram() {
        if (done.program) return;
        await programPage.navigateToMyASUProgram();
        chosen = /** @type {{ location: string, startTerm: string }} */ (await programPage.selectProgram({ degreeType: 'Non-Degree', visiting: true }));
        await programPage.saveAndContinue();
        done.program = true;
    }
    async function ensureSchools() {
        if (done.schools) return;
        await ensureProgram();
        await schoolsPage.navigateToMySchools();
        await schoolsPage.addHighSchool(testData.highSchool);
        await schoolsPage.markNoCollegeAttended();
        await schoolsPage.saveAndContinue();
        done.schools = true;
    }
    async function ensureGrades() {
        if (done.grades) return;
        await ensureSchools();
        await gradesPage.navigateToMyHighSchoolGrades();
        await gradesPage.saveAndContinue();
        done.grades = true;
    }
    async function ensureResidency() {
        if (done.residency) return;
        await ensureGrades();
        await residencyPage.navigateToAZResidency();
        await residencyPage.fillResidencyInformation({ isArizonaResident: true, permanentState: testData.residency.permanentState });
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        done.residency = true;
    }
    /** IRREVERSIBLE: certifies and submits the application (once), with what Review offers for the fee. */
    async function ensureSubmitted() {
        if (done.submitted) return;
        await ensureResidency();
        await reviewPage.navigateToReviewPage();
        const fee = {
            waived: await reviewPage.isFeeWaived(),
            waiverListOffered: await reviewPage.isFeeWaiverOffered(),
            paymentOffered: await reviewPage.isPaymentOffered(),
        };
        test.info().annotations.push({ type: 'fee section', description: JSON.stringify(fee) });
        if (!fee.waived && fee.waiverListOffered) {
            await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
            await reviewPage.requestFeeWaiver({ reasons: [testData.feeWaiverReason], signature: fullName });
        }
        await reviewPage.submitApplication({ certify: true, paymentOption: !fee.waived && fee.paymentOffered ? 'later' : null });
        await reviewPage.waitForSubmitted();
        done.submitted = true;
    }

    test('My program: visiting university student in person, a campus location', async () => {
        await programPage.navigateToMyASUProgram();
        await programPage.verifySelectedDegreeType('Non-Degree');
        await programPage.verifyNondegreeFormVisible();
        chosen = /** @type {{ location: string, startTerm: string }} */ (await programPage.selectProgram({ degreeType: 'Non-Degree', visiting: true }));
        test.info().annotations.push({ type: 'My program', description: JSON.stringify(chosen) });
        expect(chosen.location).toBeTruthy();
        expect(chosen.location).not.toBe('ASU Online');
        expect(chosen.startTerm).toMatch(/^\d{4} (spring|summer|fall)/);
        await programPage.saveAndContinue();
        await schoolsPage.verifyPageLoaded();
        done.program = true;
    });

    test('My schools: a future graduate, no colleges, and no transcript acknowledgement asked', async () => {
        await ensureProgram();
        await schoolsPage.navigateToMySchools();
        await schoolsPage.addHighSchool(testData.highSchool);
        await schoolsPage.markNoCollegeAttended();
        expect(await schoolsPage.getSavedHighSchools()).toEqual([testData.highSchool.name]);
        expect(await schoolsPage.isTranscriptAcknowledgementShown()).toBe(false);
        await schoolsPage.saveAndContinue();
        await gradesPage.verifyPageLoaded();
        done.schools = true;
    });

    test('My high school grades is not necessary for a visiting student', async () => {
        await ensureSchools();
        await gradesPage.navigateToMyHighSchoolGrades();
        expect(await gradesPage.isStepNotNecessary()).toBe(true);
        expect(await gradesPage.saveAndContinue()).toBe('arizona-residency');
        done.grades = true;
    });

    test('Arizona residency: home in Arizona, the Arizona questions; fill, save and continue to Review', async () => {
        await ensureGrades();
        await residencyPage.navigateToAZResidency();
        expect(await residencyPage.isStepNotNecessary()).toBe(false);
        await residencyPage.selectPermanentState(testData.residency.permanentState);
        await expect.poll(() => residencyPage.getShownFields()).toEqual([...ARIZONA_HOME_FIELDS].sort());
        await residencyPage.fillResidencyInformation({ isArizonaResident: true, permanentState: testData.residency.permanentState });
        expect(await residencyPage.getPermanentState()).toBe(testData.residency.permanentState);
        expect(await residencyPage.getSupportTotal()).toBe(100);
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        done.residency = true;
    });

    test('Review: no grades section; visiting student in person, the high school and Arizona', async () => {
        await ensureResidency();
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getShownSections()).toEqual(['Profile', 'My information', 'My program', 'My schools', 'Arizona residency']);
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe(fullName);
        expect(await reviewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am a U.S. citizen');
        expect(await reviewPage.getSectionValue('My information', 'Military status')).toBe('None of these options apply to me');

        expect(await reviewPage.getSectionValue('My program', 'Program')).toBe('Visiting University Student');
        if (chosen.location) expect(await reviewPage.getSectionValue('My program', 'Location')).toBe(chosen.location);
        // Review words the term the other way round: "2027 spring - (All sessions)" on My
        // program is "Spring 2027 - (All sessions)" here.
        if (chosen.startTerm) {
            const [, year, season, rest] = /** @type {RegExpMatchArray} */ (chosen.startTerm.match(/^(\d{4}) (\w+)(.*)$/));
            expect(await reviewPage.getSectionValue('My program', 'Starting term'))
                .toBe(`${season[0].toUpperCase()}${season.slice(1)} ${year}${rest}`);
        }

        expect(await reviewPage.getSectionValue('My schools', 'High school name')).toBe(testData.highSchool.name);
        expect(await reviewPage.getSectionValue('My schools', 'Graduation date')).toBe(`May, ${nextYear}`);
        expect(await reviewPage.getSectionValue('Arizona residency', 'Begin by selecting the state you consider to be your permanent home.'))
            .toBe(testData.residency.permanentState);
    });

    test('Submit the application with what Review offers for the fee', async () => {
        await ensureSubmitted();
    });

    test('Next steps dashboard shows the submitted application', async () => {
        await ensureSubmitted();
        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = applicationId;
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(applicationId);
    });
});
