// @ts-check
const AsuIdpPage = require('../pages/AsuIdpPage');
const GmailUtils = require('./integrations/gmailUtils');
const { nextSignupEmail } = require('./emailSequence');
const { logger } = require('./testLogger');
const { recordAccount, noteSignedIn } = require('./accountLog');

/**
 * Has this inbox ever received mail for `email`? If so the address was already
 * used for a sign-up (all plus-tags land in the same inbox), so skip it.
 * @param {GmailUtils} gmail
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function addressAlreadyUsed(gmail, email) {
    const res = await gmail.gmail.users.messages.list({ userId: 'me', q: `to:${email}`, maxResults: 1 });
    return (res.data.messages || []).length > 0;
}

/**
 * Reserve the next sequential address that has never received mail.
 * @param {GmailUtils} gmail
 * @param {number} [maxSkips]
 * @returns {Promise<string>}
 */
async function reserveFreshEmail(gmail, maxSkips = 20) {
    for (let i = 0; i < maxSkips; i++) {
        const { email } = nextSignupEmail();
        if (!(await addressAlreadyUsed(gmail, email))) return email;
        logger.info(`Skipping ${email}: inbox already has mail for it`);
    }
    throw new Error(`No unused sign-up address after ${maxSkips} tries; bump GMAIL_SEQUENCE_START`);
}

/**
 * Create a brand-new, email-verified account through the ASU IdP, reading the
 * verification email via the Gmail API, and return to the app authenticated.
 *
 * Addresses come from a persistent sequence (base+asuqa0001@gmail.com, 0002, ...).
 * If the IdP says the account already exists, the next number is tried.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [opts]
 * @param {string} [opts.email] - Use this exact address (no sequence, no retry).
 * @param {string} [opts.password] - >=10 chars, mixed case + number.
 * @param {GmailUtils} [opts.gmail] - Reuse an initialized GmailUtils instance.
 * @param {number} [opts.maxAttempts] - Sign-up attempts on "already exists" (default 3).
 * @param {'in-person'|'online'|'random'} [opts.mode] - Learning mode chosen on the landing
 *   page before Continue (default 'online'). The app carries it into the new application.
 * @param {'pursue'|'individual'} [opts.degreeType] - Default 'pursue'.
 * @returns {Promise<{ email: string, password: string }>}
 */
async function signUpVerifiedAccount(page, opts = {}) {
    const mode = opts.mode || 'online';
    const degreeType = opts.degreeType || 'pursue';
    const password = opts.password || 'AsuQaTest1234!';
    const maxAttempts = opts.email ? 1 : opts.maxAttempts || 3;
    const idp = new AsuIdpPage(page);
    const gmail = opts.gmail || new GmailUtils();
    if (!opts.gmail) await gmail.initialize();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await idp.startFromApp({ mode, degreeType });
        await idp.openSignupFromIdp();

        // Reserve the address only once the sign-up form is up, so failures earlier
        // in the flow don't burn sequence numbers.
        const email = opts.email || (await reserveFreshEmail(gmail));
        const since = new Date();
        await idp.signUp(email, password);

        const formError = await idp.getFormError();
        if (formError) {
            if (/already|exists|registered|in use/i.test(formError) && attempt < maxAttempts) {
                logger.warn(`${email} rejected ("${formError}"); trying next sequence number`);
                continue;
            }
            if (/too many|limit|exceeded/i.test(formError)) {
                // The IdP caps account creation per hour; retrying now only burns attempts.
                throw new Error(
                    `IdP sign-up rate limit hit for ${email}: "${formError}". ` +
                    'Wait about an hour before creating more accounts.'
                );
            }
            throw new Error(`IdP rejected sign-up for ${email}: "${formError}"`);
        }

        const { code, link } = await gmail.waitForVerificationEmail({
            toAddress: email,
            since,
            fromContains: 'noreply@asu.edu',
            subjectContains: '"Verification Code"',
        });
        logger.info(`Verification email received (code=${code ? 'yes' : 'no'}, link=${link ? 'yes' : 'no'})`);

        if (code) {
            await idp.submitVerificationCode(code);
        } else if (link) {
            await idp.openVerificationLink(link);
        } else {
            throw new Error('Verification email had neither a code nor a link; inspect gmailUtils regexes.');
        }

        await idp.waitForAppRedirect();
        // Add it to artifacts/accounts/accounts.xlsx (never the password).
        await recordAccount(page, email);
        return { email, password };
    }
    throw new Error(`Sign-up failed after ${maxAttempts} attempts`);
}

/**
 * Sign in to an existing (already-verified) account through the ASU IdP.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 */
async function signInExistingAccount(page, email, password) {
    const idp = new AsuIdpPage(page);
    await idp.startFromApp();
    await idp.openLoginFromIdp();
    await idp.signIn(email, password);
    const formError = await idp.getFormError(5000);
    if (formError) throw new Error(`IdP rejected sign-in for ${email}: "${formError}"`);
    await idp.waitForAppRedirect();
    noteSignedIn(page, email);
}

module.exports = { signUpVerifiedAccount, signInExistingAccount, reserveFreshEmail };
