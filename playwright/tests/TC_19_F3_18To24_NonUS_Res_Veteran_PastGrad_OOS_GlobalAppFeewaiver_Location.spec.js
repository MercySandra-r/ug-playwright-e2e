// @ts-check
const { test, expect } = require('@playwright/test');
const { startApplicationAt } = require('../utils/applicationJourney');
const AZResidencyPage = require('../pages/AZResidencyPage');
const ReviewPage = require('../pages/ReviewPage');
const PostAppSubmissionDashboardPage = require('../pages/PostAppSubmissionDashboardPage');

/**
 * Flow F3: 18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location
 * (row F3 of the "E2E Flows" sheet, "NAA App - Automation Test flows" workbook)
 *
 *   MOL                 in person
 *   18To24              applicant between 18 and 24 (born 20 years ago)
 *   NonUS_Res           not a U.S. citizen, resident: visa type "Permanent resident"
 *   Previous ASU        never affiliated
 *   Veteran             U.S. service member or veteran, status Veteran (My information)
 *   Program             campus location Tempe
 *   Partner benefits    No
 *   PastGrad            high school graduation date in the past
 *   Grades              self-report (the journey's default answers)
 *   OOS                 "Residency", the first field on Arizona residency, is set to
 *                       "Outside the U.S. or Not Listed"
 *   GlobalAppFeewaiver_Location
 *                       the sheet expects the application fee to be waived because of the
 *                       Tempe location: a message, and no payment option
 *
 * One fresh account per run (beforeAll), taken through steps 1-4 with the answers above;
 * the tests then cover Arizona residency, Review, submission and the fee expectation.
 *
 * THIS FLOW ALWAYS SUBMITS the application (it cannot be undone), so every run leaves one
 * submitted application in QA. The last name is different on every run.
 *
 * FEE: on 2026-11-12 QA did NOT waive the fee for Tempe; Review offered the fee waiver list
 * instead (as in F1). So the flow submits with whatever Review offers (waived: nothing to do;
 * waiver list: a reason and a signature; otherwise Pay later), and the LAST test states the
 * sheet's expectation. That test fails while the location waiver is not applied, without
 * stopping the rest of the flow.
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
        birth: { month: 'June', day: '15', year: String(new Date().getFullYear() - 20) },
        visaType: 'Permanent resident',
        campus: 'Tempe',
    },
    veteran: true,
    graduationDate: `May ${new Date().getFullYear() - 1}`, // PastGrad
    highSchool: 'Tempe High School',
    program: 'Anthropology, BA',
    residency: { permanentState: 'Outside the U.S. or Not Listed' }, // OOS
    feeWaiverReason: ReviewPage.FEE_WAIVER_OPTIONS[0],
};
const fullName = `${testData.applicant.firstName} ${testData.applicant.lastName}`;

test.describe('F3 18To24 NonUS Res Veteran PastGrad OOS GlobalAppFeewaiver Location', () => {
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
    /** What Review offered for the fee, recorded before submitting. */
    let fee = { waived: false, waiverListOffered: false, paymentOffered: false };

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(600000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        // Steps 1-4: pre-app, My information (permanent resident, veteran), My program (Tempe),
        // My schools (Arizona high school, past graduation), grades.
        applicationId = await startApplicationAt(page, 'arizona-residency', {
            captureValidations: false,
            mode: testData.mode,
            applicant: testData.applicant,
            veteran: testData.veteran,
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

    test('Arizona residency asks a veteran aged 18 to 24 the right questions', async () => {
        await residencyPage.navigateToAZResidency();
        expect(await residencyPage.isStepNotNecessary()).toBe(false);
        // Under 24: the parent questions; veteran: DD-214, discharge date, voter registration.
        await expect.poll(() => residencyPage.getShownFields()).toEqual([
            'claimedAsDependent', 'dd214CharacterOfService', 'dischargeDate', 'employed', 'enrolledElsewhere',
            'enrolledInAzCollege', 'filedStateTaxes', 'financialSupport', 'hasLicense', 'ownsVehicle',
            'parentState', 'permanentState', 'registeredToVote',
        ]);
        expect(await residencyPage.isVeteranSectionShown()).toBe(true);
        expect(await residencyPage.isSpouseOfServiceMemberSectionShown()).toBe(false);
    });

    test('Residency "Outside the U.S. or Not Listed" (OOS): fill, save and continue to Review', async () => {
        await residencyPage.navigateToAZResidency();
        await residencyPage.fillResidencyInformation({ isArizonaResident: false, permanentState: testData.residency.permanentState });
        expect(await residencyPage.getPermanentState()).toBe(testData.residency.permanentState);
        expect((await residencyPage.getVeteranDetails()).characterOfService).toBe('Honorable');
        expect(await residencyPage.getSupportTotal()).toBe(100);

        await residencyPage.saveAndContinue();
        await reviewPage.verifyPageLoaded();
    });

    test('Review shows the applicant, permanent resident, veteran, Tempe and the high school', async () => {
        await reviewPage.navigateToReviewPage();
        expect(await reviewPage.getSectionValue('Profile', 'Legal name')).toBe(fullName);
        expect(await reviewPage.getSectionValue('My information', 'U.S. citizenship')).toBe('I am not a U.S. citizen');
        expect(await reviewPage.getSectionValue('My information', 'Which type of visa will you be holding?')).toBe(testData.applicant.visaType);
        expect(await reviewPage.getSectionValue('My information', 'Previous ASU affiliation'))
            .toBe('I have never been affiliated with Arizona State University');
        expect(await reviewPage.getSectionValue('My information', 'Military status')).toBe('Veteran');
        expect(await reviewPage.getSectionValue('My information', 'Education benefits')).toBe('No');

        const { first } = await reviewPage.getChosenPrograms();
        expect(first).toBe(testData.program);
        expect(await reviewPage.getSectionValue('My program', 'Location')).toBe(testData.applicant.campus);

        expect(await reviewPage.getSectionValue('My schools', 'High school name')).toBe(testData.highSchool);
        expect(await reviewPage.getSectionValue('My schools', 'Graduation date')).toBe(`May, ${new Date().getFullYear() - 1}`);
    });

    test('Submit the application with what Review offers for the fee', async () => {
        await reviewPage.navigateToReviewPage();
        fee = {
            waived: await reviewPage.isFeeWaived(),
            waiverListOffered: await reviewPage.isFeeWaiverOffered(),
            paymentOffered: await reviewPage.isPaymentOffered(),
        };
        test.info().annotations.push({ type: 'fee section', description: JSON.stringify(fee) });

        // Not waived: request a waiver (reason + signature) when the list is offered.
        if (!fee.waived && fee.waiverListOffered) {
            await reviewPage.setFeeWaivers(await reviewPage.getSelectedFeeWaivers(), false);
            await reviewPage.requestFeeWaiver({ reasons: [testData.feeWaiverReason], signature: fullName });
        }
        // IRREVERSIBLE: certify and submit. "Pay later" only when payment is what is offered.
        await reviewPage.submitApplication({ certify: true, paymentOption: !fee.waived && fee.paymentOffered ? 'later' : null });
        await reviewPage.waitForSubmitted();
    });

    test('Next steps dashboard shows the submitted application', async () => {
        const dashboard = new PostAppSubmissionDashboardPage(page);
        dashboard.applicationId = applicationId;
        await dashboard.verifyPageLoaded();
        expect(await dashboard.getSubmittedApplicationId()).toBe(applicationId);
    });

    test('Fee was waived for the Tempe location, with no payment option (GlobalAppFeewaiver_Location)', async () => {
        // The sheet's expectation, checked from what Review showed before the submit.
        expect(fee, 'Review should say the fee is waived for the Tempe location, and offer no payment or waiver list')
            .toEqual({ waived: true, waiverListOffered: false, paymentOffered: false });
    });
});
