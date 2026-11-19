// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const MySchoolsPage = require('../pages/MySchoolsPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Multiple applications on one account, submitted one after another until the app does not
 * let another one through (the tester's "multiple application flow", 2026-11-19). Two tests,
 * each on its own new account:
 *
 *   Pursue a degree   each application a different program, with a start term not used yet
 *   NDG / VUS         nondegree and visiting applications in turn, each with a term not used yet
 *
 * After the first application (started from the landing page), each next one starts from the
 * Next steps page with "Start a new application". My information comes prefilled and is not
 * changed. A term already applied for is disabled on My program, so each application takes the
 * next open one. The loop stops when the Next steps page says no new application can be
 * started: "Why can't I start a new application? Only one application can be sent for each
 * start date. You cannot submit an application until additional start dates are announced."
 * On 2026-11-19 that came after two applications (Spring 2027 and Summer 2027). Every
 * application submitted, and what stopped the loop, is recorded.
 *
 * THESE TESTS SUBMIT MANY APPLICATIONS (one per open term; they cannot be undone).
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

/** At most this many applications per test (a guard; the app stops it sooner). */
const MAX_APPLICATIONS = 10;
/** Degree programs to take in turn (none needs extra questions such as Nursing's RN details). */
const DEGREE_PROGRAMS = ['Anthropology, BA', 'Accountancy, BS', 'African and African American Studies, BA', 'Anthropology, BS',
    'Applied Business and Technology Solutions, BA', 'Applied Military and Veterans Studies, BA', 'Art (Art History), BA', 'Biochemistry, BS',
    'Biological Sciences, BS', 'Communication, BA'];
const HIGH_SCHOOL = { country: 'United States', state: 'Arizona', city: 'Tempe', name: 'Tempe High School', graduationDate: `May ${new Date().getFullYear() - 2}` };

/**
 * Submit applications on one account until the app stops it.
 * @param {import('@playwright/test').Page} page
 * @param {{ mode: 'online'|'in-person', degreeType: 'pursue'|'individual', choose: (program: MyASUProgramPage, i: number, used: string[]) => Promise<{ label: string, term: string }> }} kind
 */
async function submitUntilStopped(page, kind) {
    /** @type {Array<{ applicationId: string, choice: string, term: string }>} */
    const submitted = [];
    let stoppedBy = '';
    let applicationId = await startApplicationAt(page, 'my-program', {
        captureValidations: false, mode: kind.mode, degreeType: kind.degreeType, applicant: { usCitizen: true },
    });

    for (let i = 0; i < MAX_APPLICATIONS; i++) {
        const info = new MyInformationPage(page);
        const program = new MyASUProgramPage(page);
        const schools = new MySchoolsPage(page);
        const grades = new MyHighSchoolGradesPage(page);
        const residency = new AZResidencyPage(page);
        const review = new ReviewPage(page);
        const dashboard = new PostAppSubmissionDashboardPage(page);
        for (const p of [info, program, schools, grades, residency, review, dashboard]) p.applicationId = applicationId;

        if (i > 0) {
            // My information comes prefilled and is not changed; Continue on it can do nothing.
            await info.navigateToMyInformation();
            await info.saveAndContinue().catch(() => {});
        }

        // My program: the next choice, with a start term not used yet; none left ends the loop.
        await program.navigateToMyASUProgram();
        /** @type {{ label: string, term: string }} */
        let chosen;
        try {
            chosen = await kind.choose(program, i, submitted.map((s) => s.term));
        } catch (e) {
            stoppedBy = `application ${i + 1} (${applicationId}), My program: ${String(e).split('\n')[0]}`;
            break;
        }
        try {
            await program.saveAndContinue();
        } catch (e) {
            stoppedBy = `application ${i + 1} (${applicationId}), saving My program: ${String(e).split('\n')[0]}`;
            break;
        }

        // My schools, grades and residency, then Review.
        await schools.navigateToMySchools();
        if (!(await schools.getSavedHighSchools()).length) await schools.addHighSchool(HIGH_SCHOOL);
        if (!(await schools.getSavedInstitutions()).length) await schools.markNoCollegeAttended();
        if (await schools.isTranscriptAcknowledgementShown()) await schools.acknowledgeTranscripts();
        await schools.saveAndContinue();
        if (!(await grades.isStepNotNecessary())) {
            await grades.chooseSelfReporting();
            await grades.useDefaultSelfReportedGrades();
        }
        if ((await grades.saveAndContinue()) !== 'review') {
            if (!(await residency.isStepNotNecessary())) {
                await residency.fillResidencyInformation({ isArizonaResident: false, permanentState: 'Outside the U.S. or Not Listed' });
            }
            await residency.saveAndContinue();
        }

        // IRREVERSIBLE: certify and submit with what Review offers for the fee.
        await review.navigateToReviewPage();
        const fee = { waived: await review.isFeeWaived(), waiverList: await review.isFeeWaiverOffered(), payment: await review.getPaymentOptions() };
        if (!fee.waived && fee.waiverList) {
            await review.setFeeWaivers(await review.getSelectedFeeWaivers(), false);
            await review.requestFeeWaiver({ reasons: [ReviewPage.FEE_WAIVER_OPTIONS[0]], signature: 'Qa Automation' });
        }
        await review.submitApplication({ certify: true, paymentOption: !fee.waived && fee.payment.includes('Pay later') ? 'later' : null });
        await review.waitForSubmitted();
        submitted.push({ applicationId, choice: chosen.label, term: chosen.term });
        test.info().annotations.push({ type: `application ${i + 1} submitted`, description: JSON.stringify(submitted[submitted.length - 1]) });
        console.log(`[multiple applications] ${i + 1} submitted: ${JSON.stringify(submitted[submitted.length - 1])}`);

        // The next application, from Next steps.
        await dashboard.verifyPageLoaded();
        // "Start a new application" is on the main dashboard (behind the "Application
        // submitted!" popup). Every open start date used: it says why no new one can be started.
        await dashboard.openMainDashboard();
        const blocked = await dashboard.getNewApplicationBlockedReason();
        if (blocked) {
            stoppedBy = `after application ${i + 1}, the dashboard: ${blocked}`;
            break;
        }
        try {
            ({ applicationId } = await dashboard.startOrResumeNewApplication({ mode: kind.mode === 'in-person' ? 'In-person' : 'Online', degreeType: kind.degreeType }));
        } catch (e) {
            const waitingFor = ((/** @type {Error} */ (e)).message.match(/waiting for (.*)/) || [])[1] || '';
            stoppedBy = `after application ${i + 1}: a new application could not be started: ${String(e).split('\n')[0]}${waitingFor ? ` (waiting for ${waitingFor})` : ''}`;
            // What the page showed when it stopped, to tell an app limit from a test problem.
            await test.info().attach('page when stopped', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
            await test.info().attach('page text when stopped', { body: `${page.url()}\n\n${await page.locator('body').innerText()}`, contentType: 'text/plain' });
            console.log(`[multiple applications] page when stopped: ${page.url()} :: ${JSON.stringify((await page.locator('body').innerText()).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60))}`);
            break;
        }
    }
    if (!stoppedBy) stoppedBy = `the ${MAX_APPLICATIONS}-application guard of this test`;
    test.info().annotations.push({ type: 'stopped by', description: stoppedBy });
    console.log(`[multiple applications] ${submitted.length} submitted; stopped by: ${stoppedBy}`);
    test.info().annotations.push({ type: 'applications submitted', description: String(submitted.length) });
    return { submitted, stoppedBy };
}

test.describe('Multiple applications until none can be added', () => {
    test.describe.configure({ timeout: 3600000 });

    test('Pursue a degree: a different program each time, every open start term', async ({ browser }, testInfo) => {
        const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        const page = await context.newPage();
        try {
            const { submitted, stoppedBy } = await submitUntilStopped(page, {
                mode: 'in-person', degreeType: 'pursue',
                choose: async (program, i, used) => {
                    const { first } = await program.selectProgram({ program: DEGREE_PROGRAMS[i % DEGREE_PROGRAMS.length], degreeType: 'Bachelor', avoidTerms: used });
                    return { label: `${first.program} (${first.location})`, term: first.startTerm };
                },
            });
            expect(submitted.length, `stopped by: ${stoppedBy}`).toBeGreaterThanOrEqual(2);
            expect(new Set(submitted.map((s) => s.term)).size, 'each application has its own start term').toBe(submitted.length);
            // The app's own limit: one application per start date, none left to apply for.
            expect(stoppedBy).toContain('Only one application can be sent for each start date');
        } finally {
            await context.close();
        }
    });

    test('NDG / VUS: nondegree and visiting in turn, every open start term', async ({ browser }, testInfo) => {
        const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        const page = await context.newPage();
        try {
            const { submitted, stoppedBy } = await submitUntilStopped(page, {
                mode: 'online', degreeType: 'individual',
                choose: async (program, i, used) => {
                    const visiting = i % 2 === 1;
                    const r = await program.selectProgram({ degreeType: 'Non-Degree', visiting, avoidTerms: used });
                    return { label: visiting ? 'Visiting University Student' : 'Nondegree', term: r.startTerm };
                },
            });
            expect(submitted.length, `stopped by: ${stoppedBy}`).toBeGreaterThanOrEqual(2);
            expect(new Set(submitted.map((s) => s.term)).size, 'each application has its own start term').toBe(submitted.length);
            // The app's own limit: one application per start date, none left to apply for.
            expect(stoppedBy).toContain('Only one application can be sent for each start date');
        } finally {
            await context.close();
        }
    });
});
