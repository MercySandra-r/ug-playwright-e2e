// @ts-check
const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { signUpVerifiedAccount } = require('../utils/authHelper');
const LoginPage = require('../pages/LoginPage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const MyInformationPage = require('../pages/MyInformationPage');

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
        await expect(page.locator(myInfoPage.selectors.heading)).toBeVisible();
        await expect(page.getByRole('heading', { name: /^Former or alternate name\(s\)/ })).toBeVisible();
        await expect(page.locator(myInfoPage.selectors.legalSexGroup)).toBeVisible();
        await expect(page.locator(myInfoPage.selectors.primaryLanguage)).toBeVisible();
        await expect(page.locator(myInfoPage.selectors.homeCountry)).toBeVisible();
        await expect(page.getByRole('heading', { name: /^Ethnic\/racial background/ })).toBeVisible();
        await expect(page.getByRole('radiogroup', { name: 'U.S. citizenship' })).toBeVisible();
        await expect(page.getByRole('heading', { name: /^Parent or legal guardian/ })).toBeVisible();
        await expect(page.getByRole('heading', { name: /^Previous ASU affiliation/ })).toBeVisible();
        await expect(page.locator(myInfoPage.selectors.uniformedServices)).toBeVisible();
        await expect(page.getByRole('radiogroup', { name: 'Education benefits' })).toBeVisible();
        await expect(page.locator(myInfoPage.selectors.continueButton)).toBeVisible();
    });

    test('Update personal information (legal sex and primary language)', async () => {
        await myInfoPage.selectLegalSex('Female');
        await expect(page.locator(myInfoPage.selectors.legalSexGroup).getByRole('radio', { name: 'Female', exact: true })).toBeChecked();

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
        await page.locator(myInfoPage.selectors.homeCountry).click();
        await page.getByRole('option', { name: 'United States', exact: true }).click();
        await expect(page.getByText('Phone numbers and SMS preferences').first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'profile' }).last()).toHaveAttribute('href', '/profile');
    });

    test('Update address information', async () => {
        await myInfoPage.fillAddressInformation({
            country: 'United States', line1: '1151 S Forest Ave', line2: 'Apt 2', city: 'Tempe', state: 'Arizona', zip: '85281',
        });
        await expect(page.locator(myInfoPage.selectors.homeCountry)).toHaveValue('United States');
        await expect(page.locator(myInfoPage.selectors.addressLine1)).toHaveValue('1151 S Forest Ave');
        await expect(page.locator(myInfoPage.selectors.addressLine2)).toHaveValue('Apt 2');
        await expect(page.locator(myInfoPage.selectors.city)).toHaveValue('Tempe');
        await expect(page.locator(myInfoPage.selectors.state)).toHaveValue('Arizona');
        await expect(page.locator(myInfoPage.selectors.zipCode)).toHaveValue('85281');
    });

    test('Update ethnicity and race information', async () => {
        await myInfoPage.selectEthnicityAndRace({ hispanicLatino: 'No', races: ['Asian', 'White'] });
        await expect(page.getByRole('radiogroup', { name: 'Are you Hispanic/Latino? (Optional)' })
            .getByRole('radio', { name: 'No', exact: true })).toBeChecked();
        const raceField = page.locator(myInfoPage.selectors.race).locator('xpath=ancestor::*[contains(@class,"combobox") or @data-slot][1]/..');
        await expect(raceField).toContainText('Asian');
        await expect(raceField).toContainText('White');
    });

    test('Citizenship: U.S. citizen is asked for country of birth and SSN', async () => {
        await page.getByRole('radio', { name: 'I am a U.S. citizen', exact: true }).click();
        await expect(page.locator(myInfoPage.selectors.birthCountry)).toBeVisible();
        // Required for citizens; checked for presence only, never filled.
        await expect(page.getByRole('heading', { name: /^Social Security Number/ })).toBeVisible();
    });

    test('Citizenship: non-citizen is asked for visa type and countries', async () => {
        const { visaType } = await myInfoPage.selectCitizenshipStatus({ isUsCitizen: false, countryOfCitizenship: 'Canada' });
        expect(visaType).toBeTruthy();
        await expect(page.getByRole('combobox', { name: 'What type of visa will you be holding?' })).toHaveValue(/** @type {string} */ (visaType));
        await expect(page.locator(myInfoPage.selectors.citizenshipCountry)).toHaveValue('Canada');
        await expect(page.locator(myInfoPage.selectors.birthCountry)).toHaveValue('Canada');
        await expect(page.getByText('Social Security Number (if applicable)')).toBeVisible();
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
        await expect(page.getByRole('combobox', { name: /Select your benefit provider/ })).toHaveValue(/** @type {string} */ (provider));
    });

    test('Add parent or legal guardian', async () => {
        await myInfoPage.addParentInformation({ firstName: 'Pat', lastName: 'Guardian', isLiving: true });
        await expect(page.getByText(/Pat\s+Guardian/).first()).toBeVisible();
    });

    test('Floating help opens', async () => {
        await myInfoPage.validateFloatingHelp();
    });

    test('End to end: fill every field, save and continue, values persist', async () => {
        test.setTimeout(240000);
        const sel = myInfoPage.selectors;
        const entered = await myInfoPage.completeAllFields();
        test.info().annotations.push({ type: 'entered', description: JSON.stringify(entered) });

        await myInfoPage.saveAndContinue();
        await expect(page.getByRole('heading', { name: 'My ASU program', level: 1 })).toBeVisible();

        // Reopen step 1: everything entered must have been saved.
        await myInfoPage.navigateToMyInformation();
        const { formerName, address, guardian } = entered;
        expect(await myInfoPage.isFormerNameDisplayed(`${formerName.firstName} ${formerName.lastName}`)).toBe(true);
        await expect(page.locator(sel.legalSexGroup).getByRole('radio', { name: entered.legalSex, exact: true })).toBeChecked();
        await expect(page.locator(sel.primaryLanguage)).toHaveValue(entered.primaryLanguage);
        await expect(page.locator(sel.homeCountry)).toHaveValue(address.country);
        await expect(page.locator(sel.addressLine1)).toHaveValue(address.line1);
        await expect(page.locator(sel.addressLine2)).toHaveValue(address.line2);
        await expect(page.locator(sel.city)).toHaveValue(address.city);
        await expect(page.locator(sel.state)).toHaveValue(address.state);
        await expect(page.locator(sel.zipCode)).toHaveValue(address.zip);
        await expect(page.getByRole('radiogroup', { name: 'Are you Hispanic/Latino? (Optional)' })
            .getByRole('radio', { name: entered.hispanicLatino, exact: true })).toBeChecked();
        const raceField = page.locator(sel.race).locator('xpath=ancestor::*[contains(@class,"base-select")][1]');
        for (const race of entered.races) await expect(raceField).toContainText(race);
        for (const [race, origin] of Object.entries(entered.raceOrigins)) {
            await expect(page.getByRole('combobox', { name: new RegExp(`^Select ${race} origin`) })).toHaveValue(origin);
        }
        if (entered.primaryRace) {
            await expect(page.getByRole('combobox', { name: /^Please select one of the chosen ethnicities/ })).toHaveValue(entered.primaryRace);
        }
        await expect(page.getByRole('radio', { name: 'I am not a U.S. citizen', exact: true })).toBeChecked();
        await expect(page.getByRole('combobox', { name: 'What type of visa will you be holding?' })).toHaveValue(entered.visaType);
        await expect(page.locator(sel.citizenshipCountry)).toHaveValue(entered.countryOfCitizenship);
        await expect(page.locator(sel.birthCountry)).toHaveValue(entered.countryOfBirth);
        await expect(page.getByText(new RegExp(`${guardian.firstName}\\s+${guardian.lastName}`)).first()).toBeVisible();
        for (const key of entered.asuAffiliate.affiliations) await expect(page.locator(sel.affiliation[key])).toBeChecked();
        await expect(page.locator(sel.asuAffiliateId)).toHaveValue(entered.asuAffiliate.affiliateId);
        await expect(page.locator(sel.uniformedServices)).toHaveValue(entered.militaryStatus);
        await expect(page.getByRole('radiogroup', { name: 'Education benefits' }).getByRole('radio', { name: 'Yes', exact: true })).toBeChecked();
        await expect(page.getByRole('combobox', { name: /Select your benefit provider/ })).toHaveValue(entered.benefitProvider);
    });
});
