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
 * Flow F8: NDG_Online_FGD_Resident
 * (row F8 of the "E2E Flows" sheet, "NAA App - Automation Test flows" workbook)
 *
 *   NDG                 nondegree: on the landing page "No, I want to take individual classes
 *                       as a nondegree or visiting university student", then No to "Have you
 *                       already earned a bachelor's degree?" and No to "Have you previously
 *                       started courses to pursue an associate or bachelor's degree at ASU..."
 *   Online              online; My program's nondegree form: not visiting, location ASU Online
 *   Resident            U.S. citizen with an Arizona home address (the journey's default)
 *   Previous ASU        never affiliated; military status "None of these options apply to me"
 *   FGD                 My schools: Tempe High School, graduation date in the future; no
 *                       colleges. A nondegree applicant is not asked the transcript
 *                       acknowledgement (checked)
 *   Grades              skipped: "As a nondegree or visiting university student, this page is
 *                       not necessary", and Review has no grades section
 *   Residency           "Outside the U.S. or Not Listed" (OOS, as the sheet says)
 *   Payment             whatever Review offers (on 2026-11-19: $75.00, Pay now / Pay later)
 *
 * One fresh account per run (beforeAll), taken through My information by the journey; the
 * tests then cover My program (nondegree), My schools, grades, residency, Review and submission.
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
    mode: /** @type {'online'} */ ('online'),
    degreeType: /** @type {'individual'} */ ('individual'),
    applicant: {
        firstName: 'Qa',
        lastName: uniqueLastName,
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 25) },
        usCitizen: true, // Arizona home address: the journey's default
    },
    location: 'ASU Online',
    highSchool: { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${nextYear}` },
    residency: { permanentState: 'Outside the U.S. or Not Listed' }, // OOS
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;

test.describe('F8 NDG Online FGD Resident', () => {
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
    /** @type {string} */
    let startTerm = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Landing (online, nondegree, both questions No), sign-up and My information.
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
        ({ startTerm } = await programPage.selectProgram({ degreeType: 'Non-Degree', visiting: false }));
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
        await residencyPage.fillResidencyInformation({ isArizonaResident: false, permanentState: testData.residency.permanentState });
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

    test('My program: the nondegree form, not visiting, ASU Online', async () => {
        await programPage.navigateToMyASUProgram();
        // The landing page's choice carries over: nondegree form, no program cards.
        await programPage.verifySelectedDegreeType('Non-Degree');
        await programPage.verifyNondegreeFormVisible();
        const chosen = await programPage.selectProgram({ degreeType: 'Non-Degree', visiting: false });
        startTerm = chosen.startTerm;
        expect(chosen.visiting).toBe(false);
        expect(startTerm).toMatch(/^\d{4} (spring|summer|fall)/);
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

    test('My high school grades is not necessary for a nondegree student', async () => {
        await ensureSchools();
        await gradesPage.navigateToMyHighSchoolGrades();
        expect(await gradesPage.isStepNotNecessary()).toBe(true);
        expect(await gradesPage.saveAndContinue()).toBe('arizona-residency');
        done.grades = true;
    });

    test('Arizona residency "Outside the U.S. or Not Listed" (OOS): fill, save and continue to Review', async () => {
        await ensureGrades();
        await residencyPage.navigateToAZResidency();
        expect(await residencyPage.isStepNotNecessary()).toBe(false);
        // Arizona high school, aged 24 or over: no parent questions.
        await expect.poll(() => residencyPage.getShownFields())
            .toEqual([...AZResidencyPage.RESIDENCY_SCENARIOS.arizonaHighSchoolAdult.asShown].sort());
        await residencyPage.fillResidencyInformation({ isArizonaResident: false, permanentState: testData.residency.permanentState });
        expect(await residencyPage.getPermanentState()).toBe(testData.residency.permanentState);
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        done.residency = true;
    });

    test('Review: no grades section; ASU Online, the start term and the high school', async () => {
        await ensureResidency();
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getShownSections()).toEqual(['Profile', 'My information', 'My program', 'My schools', 'Arizona residency']);
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe(fullName);
        expect(await reviewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am a U.S. citizen');

        expect(await reviewPage.getSectionValue('My program', 'Program')).toBe('Nondegree');
        expect(await reviewPage.getSectionValue('My program', 'Location')).toBe(testData.location);
        // Review words the term the other way round: "2027 spring - (Session A)" on My program
        // is "Spring 2027 - (Session A)" here.
        if (startTerm) {
            const [, year, season, rest] = /** @type {RegExpMatchArray} */ (startTerm.match(/^(\d{4}) (\w+)(.*)$/));
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
