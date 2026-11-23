// @ts-check
const { test, expect } = require('@playwright/test');
const { STARBUCKS } = require('../utils/partnerTestData');
const { startApplicationAt } = require('../utils/applicationJourney');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');
const NeedHelpPanel = require('../pages/NeedHelpPanel');
const ErrorPage = require('../pages/ErrorPage');

/**
 * Flow F15: Need help and the error pages (two of the NAA regression workbook areas; contents verified
 * live 2026-11-19).
 *
 * Need help ("Need help? Contact us.", the floating Help button) lists different contacts per
 * kind of application: online, in person, ASU Local and SCAP (Starbucks). One new applicant per
 * kind, each opened on My program.
 *
 * Error pages, signed in (on the online applicant):
 *   /error           500 "Something went wrong and the server could not complete your request."
 *   unknown pages    404 "The page you're looking for doesn't exist.", with Need help inline
 *   both             "Return to dashboard" goes to /dashboard
 *   someone else's application (/ug-app/1/...) signs the user out
 *
 * The SCAP group uses the partner test data in utils/partnerTestData.js (STARBUCKS_* in .env
 * override it). Nothing is submitted.
 *
 * POM: every element comes from the page objects; this spec has no locators of its own.
 */

const ADMISSION_SERVICES = { title: 'Admission Services', phones: ['480-965-7788'], emails: ['admissions@asu.edu'] };
const AFTER_HOURS = { title: 'After hours support', phones: ['855-278-5080'], emails: [] };
const ONLINE_TEAM = { title: 'ASU Online enrollment team', phones: ['866-277-6589'], emails: ['enrollmentonline@asu.edu'] };
const SCAP_TEAM = { title: 'ASU Online enrollment team', phones: ['1-844-ASU-SBUX'], emails: ['scap@asu.edu'] };

/** The parts of each contact block that are checked. */
const summary = (/** @type {Array<{ title: string, phones: string[], emails: string[] }>} */ contacts) =>
    contacts.map(({ title, phones, emails }) => ({ title, phones, emails }));

/**
 * One new applicant of a kind, taken to My program, with the Need help panel ready.
 * @param {string} name
 * @param {{ mode: 'online'|'in-person'|'asu-local', expected: Array<{ title: string, phones: string[], emails: string[] }>,
 *           guide: boolean, extra?: (help: NeedHelpPanel, contacts: Awaited<ReturnType<NeedHelpPanel['getContacts']>>) => void }} kind
 */
function needHelpGroup(name, kind) {
    test.describe(`Need help: ${name} application`, () => {
        test.describe.configure({ mode: 'serial', timeout: 180000 });
        /** @type {import('@playwright/test').BrowserContext} */
        let context;
        /** @type {NeedHelpPanel} */
        let help;

        test.beforeAll(async ({ browser }, testInfo) => {
            testInfo.setTimeout(480000);
            context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
            const page = await context.newPage();
            const id = await startApplicationAt(page, 'my-program', { captureValidations: false, mode: kind.mode, applicant: { usCitizen: true } });
            testInfo.annotations.push({ type: 'application', description: id });
            help = new NeedHelpPanel(page);
        });
        test.afterAll(async () => { await context?.close(); });

        test(`Need help lists the ${name} contacts`, async () => {
            await help.open();
            const contacts = await help.getContacts();
            test.info().annotations.push({ type: 'contacts', description: JSON.stringify(summary(contacts)) });
            expect(summary(contacts)).toEqual(kind.expected);
            expect(await help.isApplicationGuideShown()).toBe(kind.guide);
            kind.extra?.(help, contacts);
            await help.close();
        });
    });
}

needHelpGroup('online', { mode: 'online', expected: [ONLINE_TEAM, ADMISSION_SERVICES, AFTER_HOURS], guide: true });
needHelpGroup('in-person', {
    mode: 'in-person', expected: [ADMISSION_SERVICES, AFTER_HOURS], guide: false,
    extra: (_help, contacts) => expect(contacts[0].text).toContain('Get support to complete your ASU application.'),
});
needHelpGroup('ASU Local', {
    mode: 'asu-local',
    expected: [{ title: 'ASU Local Support', phones: [], emails: [] }, ADMISSION_SERVICES, AFTER_HOURS],
    guide: false,
    extra: (_help, contacts) => {
        expect(contacts[0].links).toContain('asulocal.asu.edu/contact');
        for (const site of ['Long Beach', 'Los Angeles', 'Chula Vista', 'Yuma', 'Washington, D.C.']) expect(contacts[0].text).toContain(site);
    },
});

test.describe('Need help: SCAP (Starbucks) application', () => {
    test.describe.configure({ mode: 'serial', timeout: 240000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {NeedHelpPanel} */
    let help;
    let id = '';
    let benefitSaved = false;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        id = await startApplicationAt(page, 'my-information', { captureValidations: false, mode: 'online',
            applicant: { firstName: STARBUCKS.firstName, lastName: STARBUCKS.lastName } });
        testInfo.annotations.push({ type: 'application', description: id });
        help = new NeedHelpPanel(page);
    });
    test.afterAll(async () => { await context?.close(); });

    async function ensureBenefitSaved() {
        if (benefitSaved) return;
        const info = new MyInformationPage(page);
        info.applicationId = id;
        await info.navigateToMyInformation();
        await info.completeRequiredFields({ usCitizenship: 'Yes', countryOfBirth: 'United States',
            partnerBenefits: { hasPartnerBenefits: true, provider: 'Starbucks', starbucksPartnerNumber: STARBUCKS.partnerNumber } });
        await info.saveAndContinue();
        benefitSaved = true;
    }

    test('Before the Starbucks benefit is saved: the online contacts', async () => {
        const info = new MyInformationPage(page);
        info.applicationId = id;
        await info.navigateToMyInformation();
        await help.open();
        expect(summary(await help.getContacts())).toEqual([ONLINE_TEAM, ADMISSION_SERVICES, AFTER_HOURS]);
        await help.close();
    });

    test('With the Starbucks benefit saved: the SCAP contacts (1-844-ASU-SBUX, scap@asu.edu)', async () => {
        await ensureBenefitSaved();
        const program = new MyASUProgramPage(page);
        program.applicationId = id;
        await program.navigateToMyASUProgram();
        await help.open();
        expect(summary(await help.getContacts())).toEqual([SCAP_TEAM, ADMISSION_SERVICES, AFTER_HOURS]);
        expect(await help.isApplicationGuideShown()).toBe(true);
        await help.close();
    });
});

test.describe('Error pages (signed in)', () => {
    test.describe.configure({ mode: 'serial', timeout: 180000 });
    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {ErrorPage} */
    let errorPage;
    /** @type {NeedHelpPanel} */
    let help;
    let id = '';

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(480000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        const page = await context.newPage();
        id = await startApplicationAt(page, 'my-program', { captureValidations: false, mode: 'online', applicant: { usCitizen: true } });
        testInfo.annotations.push({ type: 'application', description: id });
        errorPage = new ErrorPage(page);
        help = new NeedHelpPanel(page);
    });
    test.afterAll(async () => { await context?.close(); });

    test('/error: 500, "Something went wrong..."; Return to dashboard', async () => {
        await errorPage.open('/error');
        expect(await errorPage.read()).toEqual({ code: '500', message: 'Something went wrong and the server could not complete your request.' });
        await errorPage.returnToDashboard();
    });

    test('An unknown page: 404, "The page you\'re looking for doesn\'t exist.", Need help inline; Return to dashboard', async () => {
        await errorPage.open('/this-page-does-not-exist-qa');
        expect(await errorPage.read()).toEqual({ code: '404', message: 'The page you\'re looking for doesn\'t exist.' });
        // The inline Need help (seen 2026-11-19: the in-person contacts, also for an online applicant).
        const contacts = await help.getContacts();
        test.info().annotations.push({ type: '404 Need help', description: JSON.stringify(summary(contacts)) });
        expect(contacts.map((c) => c.title)).toEqual(expect.arrayContaining(['Admission Services', 'After hours support']));
        await errorPage.returnToDashboard();
    });

    test('An unknown step of the application: 404', async () => {
        await errorPage.open(`/ug-app/${id}/not-a-step`);
        expect((await errorPage.read()).code).toBe('404');
        await errorPage.returnToDashboard();
    });

    test('Someone else\'s application: the applicant is signed out', async () => {
        await errorPage.open('/ug-app/1/my-information');
        expect(await errorPage.isSignedOut()).toBe(true);
    });
});
