// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const { inboxForEmail } = require('../utils/inboxes');
const { signUpVerifiedAccount } = require('../utils/authHelper');

/**
 * Test suite for Login functionality.
 * Sign-in now happens on ASU's IdP (login.asu.edu); LoginPage drives it.
 * Messages below are the IdP's wording (verified live 2026-11-10).
 *
 * POM: every element comes from LoginPage; this spec has no locators of its own.
 */
test.describe('Login Tests', () => {
    /** @type {LoginPage} */
    let loginPage;
    const testEmail = process.env.TEST_EMAIL || 'myah.koepp@test.asu.edu';
    const invalidEmail = 'invalid-email';
    const nonExistentEmail = 'nonexistent@example.com';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);

        // Opens the IdP "Sign in with email" form via the app's Sign in button
        await loginPage.navigateToLoginPage();
    });

    test('Verify login with invalid email format', async () => {
        await loginPage.enterCredentials(invalidEmail, 'anypassword');

        // The IdP validates the format inline and keeps Sign in disabled
        expect(await loginPage.isInvalidEmailFormatErrorVisible()).toBeTruthy();
        await expect(loginPage.signInButton()).toBeDisabled();
    });

    test('Verify login with non-existent email', async () => {
        await loginPage.enterCredentials(nonExistentEmail, 'anypassword');
        await loginPage.clickLogin();

        // The IdP gives the same generic message for unknown accounts and bad passwords
        expect(await loginPage.isIncorrectCredentialsErrorVisible()).toBeTruthy();
    });

    test('Verify login with incorrect password', async () => {
        await loginPage.enterCredentials(testEmail, 'IncorrectPassword123!');
        await loginPage.clickLogin();

        expect(await loginPage.isIncorrectCredentialsErrorVisible()).toBeTruthy();
    });

    test('Verify login with ASURITE', async () => {
        // "Sign In with ASURITE ID" hands off to ASU web login (weblogin.asu.edu)
        await loginPage.clickLoginWithAsurite();

        expect(await loginPage.isAsuLoginPageDisplayed()).toBeTruthy();
    });

    test('Verify login form validation', async () => {
        // Touch and leave both fields empty: the IdP flags them and keeps Sign in disabled
        await loginPage.touchEmptyFields();
        await loginPage.verifyRequiredFieldErrors();
    });
});

/**
 * Forgot password, on the IdP's "Reset your password" page (verified live 2026-11-11).
 *
 * The page never says whether an address is registered: any address moves on to the
 * code + new-password step. The validation tests use an unregistered address, so they
 * send no email. Only the last test sends one (a real reset).
 */
test.describe('Forgot Password Tests', () => {
    /** @type {LoginPage} */
    let loginPage;
    /** @type {import('../pages/ForgotPasswordPage')} */
    let forgot;
    const { PASSWORD_RULES } = require('../pages/ForgotPasswordPage');
    // Unregistered: the IdP accepts it but sends nothing.
    const unregisteredEmail = 'nobody.reset.check@example.com';
    const validPassword = 'ResetCheck12345';

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.navigateToLoginPage();
        forgot = await loginPage.openForgotPassword();
    });

    test('Verify Forgot password opens the reset page and Return to sign in goes back', async () => {
        expect(await forgot.readEmailStep()).toEqual({
            heading: true, instructions: true, email: true, sendCode: true, returnToSignIn: true,
        });

        await forgot.returnToSignIn();
        expect(await loginPage.isSignInOptionsPageDisplayed()).toBeTruthy();
    });

    test('Verify Send verification code with an empty email', async () => {
        await forgot.requestCode('');

        expect(await forgot.isErrorShown('emailRequired')).toBeTruthy();
        expect((await forgot.readResetStep()).reset).toBeFalsy();
    });

    test('Verify an unregistered email still moves on to the reset step', async () => {
        // The IdP doesn't reveal which addresses have accounts.
        await forgot.requestCode(unregisteredEmail);
        await forgot.waitForResetStep();

        expect(await forgot.readResetStep()).toEqual({ code: true, newPassword: true, confirmPassword: true, reset: true });
        // Nothing typed yet: no rule is met
        expect(await forgot.getPasswordRules()).toEqual(Object.fromEntries(PASSWORD_RULES.map((r) => [r, false])));
    });

    test('Verify the new password rules update as you type', async () => {
        await forgot.requestCode(unregisteredEmail);
        await forgot.waitForResetStep();

        const [length, lower, upper, number] = PASSWORD_RULES;
        expect(await forgot.checkPasswordRules('abc')).toEqual({ [length]: false, [lower]: true, [upper]: false, [number]: false });
        expect(await forgot.checkPasswordRules('abcdefghij')).toEqual({ [length]: true, [lower]: true, [upper]: false, [number]: false });
        expect(await forgot.checkPasswordRules('Abcdefghij')).toEqual({ [length]: true, [lower]: true, [upper]: true, [number]: false });
        expect(await forgot.checkPasswordRules('Abcdefghi1')).toEqual({ [length]: true, [lower]: true, [upper]: true, [number]: true });
    });

    test('Verify reset step validation: empty code, weak password, mismatch, wrong code', async () => {
        await forgot.requestCode(unregisteredEmail);
        await forgot.waitForResetStep();

        // Everything empty: the code is checked first
        await forgot.submitReset();
        expect(await forgot.isErrorShown('codeRequired')).toBeTruthy();

        // Code given, password too weak
        await forgot.fillReset({ code: '123456', password: 'abc', confirm: 'abc' });
        await forgot.submitReset();
        expect(await forgot.isErrorShown('passwordRequirements')).toBeTruthy();

        // Strong password, confirmation differs
        await forgot.fillReset({ code: '123456', password: validPassword, confirm: `${validPassword}x` });
        await forgot.submitReset();
        expect(await forgot.isErrorShown('passwordMismatch')).toBeTruthy();

        // All valid but the code is wrong (no code was ever sent to this address)
        await forgot.fillReset({ code: '123456', password: validPassword, confirm: validPassword });
        await forgot.submitReset();
        expect(await forgot.isErrorShown('invalidCode', 20000)).toBeTruthy();
    });

    test('Verify a password reset via the emailed code, then sign in with the new password', async ({ browser }, testInfo) => {
        test.setTimeout(420000);
        // The account's password changes on every run, so it must be one nothing else signs in
        // to: never TEST_EMAIL or another shared account. It must also be on the inbox the
        // suite reads, or the reset code could not be read.
        //   - FORGOT_PASSWORD_TEST_EMAIL set and on that inbox: that spare account is used.
        //   - otherwise: this test signs up a fresh account for itself (one sign-up per run).
        let email = process.env.FORGOT_PASSWORD_TEST_EMAIL || '';
        if (!email || !inboxForEmail(email)) {
            const signupContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
            try {
                ({ email } = await signUpVerifiedAccount(await signupContext.newPage(), { mode: 'online', degreeType: 'pursue' }));
            } finally {
                await signupContext.close();
            }
        }
        testInfo.annotations.push({ type: 'account', description: email });
        // New each run, so the IdP can't reject it as a recently used password.
        const newPassword = `AsuQaReset${Date.now()}`;

        // Sends one email (the IdP's reset code), read through the Gmail API
        await forgot.resetPasswordViaEmail(email, newPassword);
        expect(await forgot.isResetSuccessful()).toBeTruthy();

        // "Sign in" on the success screen, then sign in with the new password
        await forgot.signInAfterReset();
        expect(await loginPage.login(email, newPassword)).toBeTruthy();
    });
});
