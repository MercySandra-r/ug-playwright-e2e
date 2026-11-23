// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const ProfilePage = require('../pages/ProfilePage');
const PreAppDashboardPage = require('../pages/PreAppDashboardPage');
const { signUpVerifiedAccount } = require('../utils/authHelper');

/**
 * Applicant profile (/profile and its edit pages), against the live site.
 *
 * Signs in once (beforeAll) to TEST_EMAIL / TEST_PASSWORD, an existing account. Without
 * them it creates its own account and starts one application on it (the profile is fully
 * editable with exactly one application in progress). Serial.
 *
 * To keep that shared account intact:
 *  - Fields the application relies on (legal name, birthday, phone) are only opened,
 *    checked and cancelled; their validation is checked on an empty Save, which
 *    captureFieldValidations refuses to let through (it throws if the page moves on).
 *  - Low-impact fields are saved: preferred first name (set, then cleared again),
 *    pronouns and gender identity.
 *
 * POM: every element comes from ProfilePage (its selectors, locator methods and
 * read-back methods); this spec has no locators of its own.
 */
test.describe('Profile Page Tests', () => {
    test.describe.configure({ mode: 'serial', timeout: 120000 });

    /** The account's email: TEST_EMAIL, or the account created in beforeAll. */
    let email = process.env.TEST_EMAIL || '';

    /** @type {import('@playwright/test').BrowserContext} */
    let context;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {ProfilePage} */
    let profilePage;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180000);
        context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
        page = await context.newPage();
        if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
            await new LoginPage(page).login(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
        } else {
            testInfo.setTimeout(420000);
            ({ email } = await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' }));
            await new PreAppDashboardPage(page).startApplication();
        }
        profilePage = new ProfilePage(page);
    });

    test.afterAll(async () => {
        await context?.close();
    });

    const freshPage = () => profilePage.navigateToProfile();

    test('Profile menu "Edit profile" opens the profile', { tag: '@regression' }, async () => {
        await profilePage.openProfileFromDashboard();
    });

    test('One in-progress application: every field is editable, email is not', { tag: '@regression' }, async () => {
        // TEST_EMAIL's account has exactly one in-progress application. With none, nothing
        // is editable; with several, legal name and birthday are read-only.
        await freshPage();
        expect(await profilePage.getEditableFields()).toEqual(ProfilePage.expectedEditableFields(1));
        expect(await profilePage.isContactEmailEditable()).toBe(false);
    });

    test('Profile shows the account and its details', { tag: ['@smoke', '@regression'] }, async () => {
        await freshPage();
        const profile = await profilePage.readProfile();
        expect(profile.contactEmail).toBe(email);
        // "Welcome, <name>": the preferred first name when one is set, otherwise the legal first
        // name, followed by the last name.
        const lastName = profile.legalName.split(' ').slice(-1)[0];
        expect(profile.welcomeName).toBe(profile.preferredFirstName ? `${profile.preferredFirstName} ${lastName}` : profile.legalName);
        expect(profile.applicationId).toMatch(/^\d+$/);
        expect(profile.birthday).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
        expect(profile.phoneNumber).toMatch(/^\+\d+ \(\d{3}\) \d{3}-\d{4}$/);
        expect(await profilePage.validateEmail(email)).toBe(true);
    });

    test('Legal name editor shows the current name; Cancel keeps it', { tag: '@regression' }, async () => {
        await freshPage();
        const before = await profilePage.readProfile();
        await profilePage.openEditor('legalName');
        const form = await profilePage.readLegalNameForm();
        expect([form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')).toBe(before.legalName);
        await profilePage.cancel();
        expect((await profilePage.readProfile()).legalName).toBe(before.legalName);
    });

    test('Legal name: empty Save shows field validations', { tag: '@regression' }, async () => {
        await freshPage();
        await profilePage.openEditor('legalName');
        await profilePage.clearLegalName();
        const errors = await profilePage.captureSaveValidations('Profile legal name');
        expect(errors.length).toBeGreaterThan(0);
        await profilePage.cancel();
    });

    test('Preferred first name can be set and cleared', { tag: '@regression' }, async () => {
        await freshPage();
        // The account is shared between runs: always clear the name again, even if a check
        // fails, so the next run starts without one.
        try {
            await profilePage.updatePreferredFirstName('Q');
            const set = await profilePage.readProfile();
            expect(set.preferredFirstName).toBe('Q');
            expect(set.welcomeName).toBe(`Q ${set.legalName.split(' ').slice(-1)[0]}`);
        } finally {
            await freshPage();
            await profilePage.updatePreferredFirstName('');
        }
        const cleared = await profilePage.readProfile();
        expect(cleared.preferredFirstName).toBe('');
        expect(cleared.welcomeName).toBe(cleared.legalName);
    });

    test('Birthday editor shows the current birthday; Cancel keeps it', { tag: '@regression' }, async () => {
        await freshPage();
        const { birthday } = await profilePage.readProfile();
        await profilePage.openEditor('birthday');
        const { month, day, year } = await profilePage.readBirthdayForm();
        expect(`${month} ${day}, ${year}`).toBe(birthday);
        await profilePage.cancel();
    });

    test('Pronouns: options and saving a choice', { tag: '@regression' }, async () => {
        await freshPage();
        await profilePage.openEditor('pronouns');
        expect(await profilePage.getRadioOptions(profilePage.selectors.pronounsGroup)).toEqual(['He/Him', 'She/Her', 'They/Them']);
        await profilePage.cancel();
        await profilePage.selectPronouns('They/Them');
        expect((await profilePage.readProfile()).pronouns).toBe('They/Them');
    });

    test('Gender identity: options and saving a choice', { tag: '@regression' }, async () => {
        await freshPage();
        await profilePage.openEditor('genderIdentity');
        expect(await profilePage.getRadioOptions(profilePage.selectors.genderGroup))
            .toEqual(['Female', 'Male', 'Nonbinary', 'Identity not listed', 'Prefer not to disclose']);
        await profilePage.cancel();
        await profilePage.selectGender('Prefer not to disclose');
        expect((await profilePage.readProfile()).genderIdentity).toBe('Prefer not to disclose');
    });

    test('Phone editor shows the current number and answers; Cancel keeps them', { tag: '@regression' }, async () => {
        await freshPage();
        const before = await profilePage.readProfile();
        await profilePage.openEditor('phoneNumber');
        const form = await profilePage.readPhoneForm();
        expect(`${form.countryCode} (${form.phone.slice(0, 3)}) ${form.phone.slice(3, 6)}-${form.phone.slice(6)}`).toBe(before.phoneNumber);
        expect(form.sms).toBe(before.smsPreference);
        expect(form.isMobile).toMatch(/^(Yes|No)$/);
        await profilePage.cancel();
    });

    test('Phone: empty Save shows field validations', { tag: '@regression' }, async () => {
        await freshPage();
        await profilePage.openEditor('phoneNumber');
        await profilePage.clearPhone();
        const errors = await profilePage.captureSaveValidations('Profile phone');
        expect(errors.length).toBeGreaterThan(0);
        await profilePage.cancel();
    });

    test('Return to dashboard', { tag: '@regression' }, async () => {
        await freshPage();
        await profilePage.returnToDashboard();
    });
});
