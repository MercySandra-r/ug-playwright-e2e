// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F1: Greater24_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR
 *
 *   Greater24        applicant older than 24 (born 25 years ago)
 *   US               U.S. citizen with a U.S. home address in Arizona (My information; the
 *                    SSN typed is a made-up one, new on every run)
 *   SpouseDependent  spouse/dependent of a U.S. service member or veteran (My information)
 *   FutureGrad       high school graduation date in the future (My schools)
 *   InstateSchool    an Arizona high school (Tempe High School)
 *   OOS              "Residency", the first field on Arizona residency, is set to
 *                    "Outside the U.S. or Not Listed"
 *   ABOR             the application fee waiver on Review
 *
 * The applicant studies in person: the fee waiver is offered to in-person applicants, and
 * My program then asks for a campus before the start term.
 *
 * One fresh account per run (beforeAll), taken through steps 1-4 with the answers above;
 * the tests then cover Arizona residency, Review with the fee waiver, and submission.
 *
 * THIS FLOW ALWAYS SUBMITS the application (it cannot be undone), so every run leaves one
 * submitted application in QA. The last name is different on every run, so runs don't look
 * like the same person applying twice.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

/** Letters only, new on every run. */
const uniqueLastName = `Flow${Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')}`;

const testData = {
    mode: /** @type {'in-person'} */ ('in-person'),
    applicant: {
        firstName: 'Qa',
        lastName: uniqueLastName,
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 25) },
        usCitizen: true,
    },
    spouseOfServiceMember: true,
    graduationDate: `May ${new Date().getFullYear() + 1}`,
    // Home address on My information (the journey's default): a U.S. address in Arizona.
    homeAddress: '1151 S Forest Ave, Tempe, Arizona 85281, United States',
    highSchool: 'Tempe High School', // in-state school
    program: 'Anthropology, BA',
    residency: {
        permanentState: 'Outside the U.S. or Not Listed', // OOS
        serviceMember: { type: 'Active Duty' },
    },
    feeWaiver: {
        reasons: [ReviewPage.FEE_WAIVER_OPTIONS[0], ReviewPage.FEE_WAIVER_OPTIONS[4]],
    },
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;

test.describe('F1 Greater24 US Res SpouseDependent FutureGrad InstateSchool OOS ABOR', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {AZResidencyPage} */
    let residencyPage;
    /** @type {ReviewPage} */
    let reviewPage;
    let applicationId = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Steps 1-4: pre-app, My information (citizen, spouse/dependent), My program (campus
        // and term), My schools (Arizona high school, future graduation), grades.
        applicationId = await startApplicationAt(page, 'arizona-residency', {
            captureValidations: false,
            mode: testData.mode,
            applicant: testData.applicant,
            spouseOfServiceMember: testData.spouseOfServiceMember,
            graduationDate: testData.graduationDate,
        });
        residencyPage = new AZResidencyPage(page);
        residencyPage.applicationId = applicationId;
        reviewPage = new ReviewPage(page);
        reviewPage.applicationId = applicationId;
        testInfo.annotations.push({ type: 'application', description: `${applicationId} (${fullName})` });
    });

    test.afterAll(async () => {
        await context?.close();
    });

    // Each test needs the steps before it. These two helpers do a missing step once, so any
    // test can also be run on its own (for example from the UI panel): the group then creates
    // its applicant and the test first saves residency, or submits, as needed.
    let residencySaved = false;
    async function ensureResidencySaved() {
        if (residencySaved) return;
        await residencyPage.navigateToAZResidency();
        await residencyPage.fillResidencyInformation(
            { isArizonaResident: false, permanentState: testData.residency.permanentState },
            testData.residency.serviceMember,
        );
        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        residencySaved = true;
    }
    let submitted = false;
    /** IRREVERSIBLE: certifies and submits the application (once). */
    async function ensureSubmitted() {
        if (submitted) return;
        await ensureResidencySaved();
        await reviewPage.navigateToReviewPage();
        await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
        await reviewPage.requestFeeWaiver({ reasons: testData.feeWaiver.reasons, signature: fullName });
        await reviewPage.submitApplication({ certify: true, paymentOption: null });
        await reviewPage.waitForSubmitted();
        submitted = true;
    }

    test('Arizona residency asks an over-24 spouse/dependent the right questions', async () => {
        await residencyPage.navigateToAZResidency();
        expect(await residencyPage.isStepNotNecessary()).toBe(false);
        // Arizona high school, 24 or over: no parent questions; spouse/dependent: the service member's type.
        await expect.poll(() => residencyPage.getShownFields()).toEqual([
            'employed', 'enrolledElsewhere', 'enrolledInAzCollege', 'filedStateTaxes', 'financialSupport',
            'hasLicense', 'ownsVehicle', 'permanentState', 'serviceMemberType',
        ]);
        expect(await residencyPage.isSpouseOfServiceMemberSectionShown()).toBe(true);
        expect(await residencyPage.isVeteranSectionShown()).toBe(false);
    });

    test('Residency "Outside the U.S. or Not Listed" (OOS): fill, save and continue to Review', async () => {
        await residencyPage.navigateToAZResidency();
        await residencyPage.fillResidencyInformation(
            { isArizonaResident: false, permanentState: testData.residency.permanentState },
            testData.residency.serviceMember,
        );
        expect(await residencyPage.getPermanentState()).toBe(testData.residency.permanentState);
        expect((await residencyPage.getSpouseOfServiceMemberDetails()).type).toBe(testData.residency.serviceMember.type);
        expect(await residencyPage.getSupportTotal()).toBe(100);

        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
        residencySaved = true;
    });

    test('Review shows the applicant, program and high school', async () => {
        await ensureResidencySaved();
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe(fullName);
        const { first } = await reviewPage.getChosenPrograms();
        expect(first).toBe(testData.program);
        // In person: a campus, not ASU Online
        expect(await reviewPage.getSectionValue('My program', 'Location')).not.toBe('ASU Online');
        expect(await reviewPage.getSectionValue('My schools', 'High school name')).toBe(testData.highSchool);
    });

    test('Fee waiver (ABOR): the reasons offered, and ticking one asks for a signature', async () => {
        await ensureResidencySaved();
        await reviewPage.navigateToReviewPage();
        // ABOR: the waiver checkboxes are shown and no fee (payment option) is.
        expect(await reviewPage.isFeeWaiverOffered()).toBe(true);
        expect(await reviewPage.isPaymentOffered()).toBe(false);
        expect(await reviewPage.getFeeWaiverOptions()).toEqual([...ReviewPage.FEE_WAIVER_OPTIONS, ReviewPage.FEE_WAIVER_NONE]);

        // Start clean, whatever an earlier visit left ticked.
        await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
        expect(await reviewPage.isFeeWaiverSignatureShown()).toBe(false);

        // Any one reason makes the applicant eligible: certification and signature appear.
        await reviewPage.setFeeWaivers([testData.feeWaiver.reasons[0]]);
        await expect.poll(() => reviewPage.isFeeWaiverSignatureShown()).toBe(true);

        // Unticked again: they go away.
        await reviewPage.setFeeWaivers([testData.feeWaiver.reasons[0]], false);
        await expect.poll(() => reviewPage.isFeeWaiverSignatureShown()).toBe(false);
    });

    test('Submit the application with the fee waiver', async () => {
        await ensureResidencySaved();
        await reviewPage.navigateToReviewPage();
        await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
        await reviewPage.requestFeeWaiver({ reasons: testData.feeWaiver.reasons, signature: fullName });
        expect(await reviewPage.getSelectedFeeWaivers()).toEqual(testData.feeWaiver.reasons);
        expect(await reviewPage.getFeeWaiverSignature()).toBe(fullName);

        // IRREVERSIBLE: certify and submit. No payment option: the fee waiver replaces it.
        await reviewPage.submitApplication({ certify: true, paymentOption: null });
        await reviewPage.waitForSubmitted();
        submitted = true;
    });

    test('Next steps dashboard shows the submitted application', async () => {
        await ensureSubmitted();
        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = applicationId;
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(applicationId);
    });
});
