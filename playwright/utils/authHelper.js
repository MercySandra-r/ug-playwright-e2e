// @ts-check
const AsuIdpPage = require('../pages/AsuIdpPage');
const GmailUtils = require('./integrations/gmailUtils');
const { nextSignupEmail } = require('./emailSequence');
const { logger } = require('./testLogger');
const { recordAccount, noteSignedIn } = require('./accountLog');
const { getInboxes, pickInbox, markRateLimited, describeInboxes, inboxForEmail, gmailFor } = require('./inboxes');

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
 * @param {GmailUtils} gmail - client for the inbox being tagged
 * @param {string} [inboxAddress] - default GMAIL_TEST_ADDRESS
 * @param {number} [maxSkips]
 * @returns {Promise<string>}
 */
async function reserveFreshEmail(gmail, inboxAddress, maxSkips = 20) {
    for (let i = 0; i < maxSkips; i++) {
        const { email } = nextSignupEmail(inboxAddress);
        if (!(await addressAlreadyUsed(gmail, email))) return email;
        logger.info(`Skipping ${email}: inbox already has mail for it`);
    }
    throw new Error(`No unused sign-up address after ${maxSkips} tries; bump GMAIL_SEQUENCE_START`);
}

/**
 * Create a brand-new, email-verified account through the ASU IdP, reading the
 * verification email via the Gmail API, and return to the app authenticated.
 *
 * Addresses come from a persistent sequence (base+asuqa0001@gmail.com, 0002, ...) shared,
 * under a lock, by every run from this checkout, so parallel terminals never get the same
 * number. If the IdP still says the account already exists (a run from another checkout or
 * machine took it), the next number is tried.
 *
 * Rate limit: when the IdP answers "Too many email verification requests for that email",
 * that inbox is put on a one-hour cool-down and the sign-up is retried on the next inbox
 * configured in .env (GMAIL_TEST_ADDRESS_2, ...; see utils/inboxes.js). Inboxes on
 * cool-down are skipped without an attempt. It fails only when every inbox is limited.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [opts]
 * @param {string} [opts.email] - Use this exact address (no sequence, no retry).
 * @param {string} [opts.password] - >=10 chars, mixed case + number.
 * @param {GmailUtils} [opts.gmail] - Reuse an initialized GmailUtils instance (first inbox only).
 * @param {number} [opts.maxAttempts] - Sign-up attempts on "already exists" (default 5).
 * @param {'in-person'|'online'|'random'} [opts.mode] - Learning mode chosen on the landing
 *   page before Continue (default 'online'). The app carries it into the new application.
 * @param {'pursue'|'individual'} [opts.degreeType] - Default 'pursue'.
 * @returns {Promise<{ email: string, password: string }>}
 */
async function signUpVerifiedAccount(page, opts = {}) {
    const mode = opts.mode || 'online';
    const degreeType = opts.degreeType || 'pursue';
    const password = opts.password || 'AsuQaTest1234!';
    const maxAttempts = opts.email ? 1 : opts.maxAttempts || 5;
    const idp = new AsuIdpPage(page);

    // A given address fixes the inbox; otherwise take the first inbox not on cool-down.
    let inbox = opts.email ? inboxForEmail(opts.email) || getInboxes()[0] : pickInbox();
    if (!inbox) {
        throw new Error('No sign-up attempted: the IdP has rate-limited every configured inbox, so there is none left to switch to. ' +
            `Inboxes: ${describeInboxes()}. Wait for one to free up, add another inbox to .env (GMAIL_TEST_ADDRESS_3, ...), ` +
            'or reuse existing accounts (the *_TEST_EMAIL variables) so fewer are created.');
    }

    // Each attempt starts from the app again (startFromApp clears the remembered learning
    // mode), so a rejected attempt's error message can't be mistaken for the next one's.
    for (let attempt = 1, switches = 0; attempt <= maxAttempts + switches; attempt++) {
        await idp.startFromApp({ mode, degreeType });
        await idp.openSignupFromIdp();

        const gmail = opts.gmail && inbox === getInboxes()[0] ? opts.gmail : await gmailFor(inbox);
        // Reserve the address only once the sign-up form is up, so failures earlier
        // in the flow don't burn sequence numbers.
        const email = opts.email || (await reserveFreshEmail(gmail, inbox.address));
        const since = new Date();
        await idp.signUp(email, password);

        const formError = await idp.getFormError();
        if (formError) {
            if (/already|exists|registered|in use/i.test(formError) && attempt < maxAttempts + switches) {
                logger.warn(`${email} rejected ("${formError}"); trying next sequence number`);
                continue;
            }
            if (/too many|limit|exceeded/i.test(formError)) {
                // The IdP caps verification emails per inbox. Leave this inbox alone for an
                // hour and carry on with the next one, if there is one.
                markRateLimited(inbox.address);
                const next = opts.email ? null : pickInbox();
                if (next) {
                    logger.warn(`Sign-up refused for ${email} ("${formError}"); switching to inbox ${next.address}`);
                    inbox = next;
                    switches++;
                    continue;
                }
                throw new Error(
                    `IdP sign-up rate limit hit for ${email}: "${formError}". ` +
                    `No inbox is left to switch to. Inboxes: ${describeInboxes()}.`
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
