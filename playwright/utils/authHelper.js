// @ts-check
const AsuIdpPage = require('../pages/AsuIdpPage');
const GmailUtils = require('./integrations/gmailUtils');
const { logger } = require('./testLogger');

/**
 * Build a unique, deliverable sign-up address from a single real Gmail inbox using
 * plus-tag addressing (`base+tag@gmail.com` all lands in `base@gmail.com`).
 *
 * Set GMAIL_TEST_ADDRESS to the real inbox, e.g. "asu.qa.automation@gmail.com".
 * @param {string} [tag] - Unique tag (default: timestamp).
 * @returns {string}
 */
function uniqueSignupEmail(tag = String(Date.now())) {
    const base = process.env.GMAIL_TEST_ADDRESS;
    if (!base || !base.includes('@')) {
        throw new Error('GMAIL_TEST_ADDRESS must be set to a real Gmail inbox (e.g. you@gmail.com)');
    }
    const [local, domain] = base.split('@');
    // Strip any existing +tag on the base so tags don't stack.
    return `${local.split('+')[0]}+${tag}@${domain}`;
}

/**
 * Create a brand-new, email-verified account through the ASU IdP, reading the
 * verification email via the Gmail API, and return to the app authenticated.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [opts]
 * @param {string} [opts.email] - Override the generated sign-up address.
 * @param {string} [opts.password] - Override the password (>=10 chars, mixed case + number).
 * @param {GmailUtils} [opts.gmail] - Reuse an initialized GmailUtils instance.
 * @returns {Promise<{ email: string, password: string }>}
 */
async function signUpVerifiedAccount(page, opts = {}) {
    const email = opts.email || uniqueSignupEmail();
    const password = opts.password || 'AsuQaTest1234!';
    const idp = new AsuIdpPage(page);
    const gmail = opts.gmail || new GmailUtils();
    if (!opts.gmail) await gmail.initialize();

    const since = new Date();
    await idp.gotoSignup();
    await idp.signUp(email, password);

    const { code, link } = await gmail.waitForVerificationEmail({ toAddress: email, since });
    logger.info(`Verification email received (code=${code ? 'yes' : 'no'}, link=${link ? 'yes' : 'no'})`);

    if (code) {
        await idp.submitVerificationCode(code);
    } else if (link) {
        await idp.openVerificationLink(link);
    } else {
        throw new Error('Verification email had neither a code nor a link; inspect gmailUtils regexes.');
    }

    await idp.waitForAppRedirect();
    return { email, password };
}

/**
 * Sign in to an existing (already-verified) account through the ASU IdP.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 */
async function signInExistingAccount(page, email, password) {
    const idp = new AsuIdpPage(page);
    await idp.gotoLogin();
    await idp.signIn(email, password);
    await idp.waitForAppRedirect();
}

module.exports = { uniqueSignupEmail, signUpVerifiedAccount, signInExistingAccount };
