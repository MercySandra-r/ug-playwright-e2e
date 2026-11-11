// @ts-check
const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { signUpVerifiedAccount } = require('../utils/authHelper');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');
const MyASUProgramPage = require('../pages/MyASUProgramPage');

/**
 * My information (step 1 of the application wizard), against the live page.
 *
 * One fresh account + application is created per run (beforeAll), because the
 * required-field test needs an untouched step 1 and the last test saves it.
 * The suite is serial: validation runs first, "Save and continue" runs last.
 * Account creation is rate-limited per hour by the IdP; this suite creates one.
 *
 * Social Security Number fields are only checked for visibility, never filled.
 *
 * POM: every element comes from MyInformationPage (its selectors, locator methods and
 * readFormValues()); this spec has no locators of its own.
 *
 * Debugging without creating accounts: set MYINFO_TEST_EMAIL and MYINFO_TEST_PASSWORD
 * to an account whose application has NOT finished step 1; beforeAll then signs in
 * and resumes that application instead of signing up.
 */
test.describe('My Information Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {MyInformationPage} */
    let myInfoPage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(240000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        myInfoPage = new MyInformationPage(page);
        if (process.env.MYINFO_TEST_EMAIL && process.env.MYINFO_TEST_PASSWORD) {
            await new LoginPage(page).login(process.env.MYINFO_TEST_EMAIL, process.env.MYINFO_TEST_PASSWORD);
            myInfoPage.applicationId = await myInfoPage.getApplicationId();
        } else {
            await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' });
            myInfoPage.applicationId = await new PreAppDashboardPage(page).startApplication();
        }
    });

    test.afterAll(async () => {
        await context?.close();
    });

    test.beforeEach(async () => {
        await myInfoPage.navigateToMyInformation();
    });

    test('Verify required field validations', async () => {
        await myInfoPage.verifyRequiredFieldValidation();
        // Legal sex, language, home address, citizenship, ASU affiliation,
        // uniformed services and education benefits are all required.
        expect(await myInfoPage.getRequiredFieldErrorCount()).toBeGreaterThanOrEqual(5);
    });

    test('Verify My Information page loads successfully', async () => {
        await myInfoPage.verifyAllSectionsVisible();
    });

    test('Update personal information (legal sex and primary language)', async () => {
        await myInfoPage.selectLegalSex('Female');
        await expect(myInfoPage.radioIn(myInfoPage.selectors.legalSexGroup, 'Female')).toBeChecked();

        await myInfoPage.selectPrimaryLanguage('Spanish');
        await expect(page.locator(myInfoPage.selectors.primaryLanguage)).toHaveValue('Spanish');
    });

    test('Add and manage former names', async () => {
        // Unique last name so reruns on a reused account don't collide with saved names.
        const lastName = faker.person.lastName().replace(/[^A-Za-z]/g, '');
        await myInfoPage.addFormerName({ firstName: 'Taylor', lastName });
        expect(await myInfoPage.isFormerNameDisplayed(`Taylor ${lastName}`)).toBeTruthy();

        await myInfoPage.editFormerName(`Taylor ${lastName}`, { firstName: 'Jordan', lastName });
        expect(await myInfoPage.isFormerNameDisplayed(`Jordan ${lastName}`)).toBeTruthy();

        await myInfoPage.deleteFormerName(`Jordan ${lastName}`);
        expect(await myInfoPage.isFormerNameDisplayed(`Jordan ${lastName}`, 2000)).toBeFalsy();
    });

    test('Contact information is managed in Profile', async () => {
        // Phone and SMS moved off this step; it points applicants to their profile.
        await myInfoPage.verifyContactInfoPointsToProfile();
    });

    test('Update address information', async () => {
        const address = { country: 'United States', line1: '1151 S Forest Ave', line2: 'Apt 2', city: 'Tempe', state: 'Arizona', zip: '85281' };
        await myInfoPage.fillAddressInformation(address);
        expect((await myInfoPage.readFormValues()).address).toEqual(address);
    });

    test('Update ethnicity and race information', async () => {
        const { raceOrigins, primaryRace } = await myInfoPage.selectEthnicityAndRace({ hispanicLatino: 'No', races: ['Asian', 'White'] });
        expect(await myInfoPage.readFormValues()).toMatchObject({
            hispanicLatino: 'No',
            races: expect.arrayContaining(['Asian', 'White']),
            raceOrigins,
            primaryRace,
        });
    });

    test('Citizenship: U.S. citizen is asked for country of birth and SSN', async () => {
        await myInfoPage.chooseCitizenship(true);
        await expect(page.locator(myInfoPage.selectors.birthCountry)).toBeVisible();
        // Required for citizens; checked for presence only, never filled here.
        await expect(page.locator(myInfoPage.selectors.ssnHeading)).toBeVisible();
    });

    test('Citizenship: non-citizen is asked for visa type and countries', async () => {
        const { visaType } = await myInfoPage.selectCitizenshipStatus({ isUsCitizen: false, countryOfCitizenship: 'Canada' });
        expect(visaType).toBeTruthy();
        expect(await myInfoPage.readFormValues()).toMatchObject({
            citizenship: 'I am not a U.S. citizen', visaType, countryOfCitizenship: 'Canada', countryOfBirth: 'Canada',
        });
        await expect(page.locator(myInfoPage.selectors.ssnOptionalLabel)).toBeVisible();
    });

    test('Update previous ASU affiliation', async () => {
        await myInfoPage.addAsuAffiliateInfo({ affiliations: ['neverAffiliated'] });
        await expect(page.locator(myInfoPage.selectors.affiliation.neverAffiliated)).toBeChecked();
    });

    test('Update military affiliation', async () => {
        await myInfoPage.selectMilitaryAffiliation();
        await expect(page.locator(myInfoPage.selectors.uniformedServices)).toHaveValue(myInfoPage.NO_UNIFORMED_SERVICES);
    });

    test('Education benefits: Yes asks for a benefit provider', async () => {
        const provider = await myInfoPage.applyPartnerBenefits({ usesBenefits: true });
        expect(provider).toBeTruthy();
        await expect(page.locator(myInfoPage.selectors.benefitProvider)).toHaveValue(/** @type {string} */ (provider));
    });

    test('Add parent or legal guardian', async () => {
        await myInfoPage.addParentInformation({ firstName: 'Pat', lastName: 'Guardian', isLiving: true });
        expect((await myInfoPage.readFormValues()).guardians).toContain('Pat Guardian');
    });

    test('Floating help opens', async () => {
        await myInfoPage.validateFloatingHelp();
    });

    test('End to end: fill every field, save and continue, values persist', async () => {
        test.setTimeout(240000);
        const entered = await myInfoPage.completeAllFields();
        test.info().annotations.push({ type: 'entered', description: JSON.stringify(entered) });

        await myInfoPage.saveAndContinue();
        await new MyASUProgramPage(page).verifyPageLoaded();

        // Reopen step 1: everything entered must have been saved.
        await myInfoPage.navigateToMyInformation();
        const saved = await myInfoPage.readFormValues();
        test.info().annotations.push({ type: 'saved', description: JSON.stringify(saved) });
        const { formerName, guardian, address } = entered;
        expect(saved).toMatchObject({
            formerNames: expect.arrayContaining([`${formerName.firstName} ${formerName.lastName}`]),
            legalSex: entered.legalSex,
            primaryLanguage: entered.primaryLanguage,
            address: { country: address.country, line1: address.line1, line2: address.line2, city: address.city, state: address.state, zip: address.zip },
            hispanicLatino: entered.hispanicLatino,
            races: expect.arrayContaining(entered.races),
            raceOrigins: entered.raceOrigins,
            primaryRace: entered.primaryRace,
            citizenship: 'I am not a U.S. citizen',
            visaType: entered.visaType,
            countryOfCitizenship: entered.countryOfCitizenship,
            countryOfBirth: entered.countryOfBirth,
            guardians: expect.arrayContaining([`${guardian.firstName} ${guardian.lastName}`]),
            affiliations: entered.asuAffiliate.affiliations,
            affiliateId: entered.asuAffiliate.affiliateId,
            militaryStatus: entered.militaryStatus,
            educationBenefits: 'Yes',
            benefitProvider: entered.benefitProvider,
        });
    });
});
