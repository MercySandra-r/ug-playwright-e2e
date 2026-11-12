// @ts-check
const fs = require('fs');
const path = require('path');
const GmailUtils = require('./integrations/gmailUtils');
const { logger } = require('./testLogger');

/**
 * The Gmail inboxes sign-ups can use, and which of them the IdP is currently refusing.
 *
 * The ASU IdP limits verification emails per inbox ("Too many email verification requests
 * for that email"). With more than one inbox configured, a sign-up that hits the limit
 * switches to the next inbox, and the limited one is left alone for COOL_DOWN_MS (a refused
 * sign-up still registers its address, so trying again only wastes addresses).
 *
 * Inboxes come from .env, in order of preference:
 *   GMAIL_TEST_ADDRESS,   GMAIL_CREDENTIALS_PATH,   GMAIL_TOKEN_PATH      (first inbox)
 *   GMAIL_TEST_ADDRESS_2, GMAIL_CREDENTIALS_PATH_2, GMAIL_TOKEN_PATH_2    (second) ... up to _5
 * Each inbox needs its own authorised token file (see docs/EMAIL_VERIFICATION_SETUP.md).
 *
 * Cool-downs are kept in state/inbox-cooldown.json (git-ignored), so every worker and every
 * terminal running from this checkout sees them.
 */
const STATE_FILE = path.join(__dirname, '..', 'state', 'inbox-cooldown.json');
const COOL_DOWN_MS = 60 * 60 * 1000;

/**
 * @typedef {Object} Inbox
 * @property {string} address - e.g. qa.inbox@gmail.com
 * @property {string} [credentialsPath]
 * @property {string} [tokenPath]
 */

/** @returns {Inbox[]} every configured inbox, first choice first */
function getInboxes() {
    /** @type {Inbox[]} */
    const inboxes = [];
    for (const suffix of ['', '_2', '_3', '_4', '_5']) {
        const address = process.env[`GMAIL_TEST_ADDRESS${suffix}`];
        if (!address || !address.includes('@')) continue;
        inboxes.push({
            address,
            credentialsPath: process.env[`GMAIL_CREDENTIALS_PATH${suffix}`] || undefined,
            tokenPath: process.env[`GMAIL_TOKEN_PATH${suffix}`] || undefined,
        });
    }
    if (!inboxes.length) throw new Error('GMAIL_TEST_ADDRESS must be set to a real Gmail inbox (e.g. you@gmail.com)');
    return inboxes;
}

/** @returns {Record<string, number>} address -> time (ms) its cool-down ends */
function readCoolDowns() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
        return {};
    }
}

/**
 * Remember that the IdP refused this inbox; it won't be picked again until the cool-down ends.
 * @param {string} address
 * @param {number} [ms]
 */
function markRateLimited(address, ms = COOL_DOWN_MS) {
    const all = readCoolDowns();
    all[address] = Date.now() + ms;
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 2));
    logger.warn(`Inbox ${address} is rate-limited by the IdP; not using it until ${new Date(all[address]).toLocaleTimeString()}`);
}

/**
 * The first configured inbox that is not cooling down, or null when all are.
 * @returns {Inbox|null}
 */
function pickInbox() {
    const coolDowns = readCoolDowns();
    return getInboxes().find((inbox) => !(coolDowns[inbox.address] > Date.now())) || null;
}

/** When the first cool-down ends, as a local time, for error messages. */
function nextAvailableTime() {
    const coolDowns = readCoolDowns();
    const ends = getInboxes().map((i) => coolDowns[i.address] || 0);
    return new Date(Math.min(...ends)).toLocaleTimeString();
}

/**
 * The configured inbox an address belongs to ("base+tag@x" belongs to "base@x"), or null.
 * @param {string} email
 * @returns {Inbox|null}
 */
function inboxForEmail(email) {
    const [local, domain] = email.toLowerCase().split('@');
    const base = `${local.split('+')[0]}@${domain}`;
    return getInboxes().find((inbox) => inbox.address.toLowerCase() === base) || null;
}

/**
 * Is this one of the suite's sign-up addresses: "<inbox>+<prefix>NNNN@domain" on any
 * configured inbox (prefix: GMAIL_SEQUENCE_PREFIX, default "asuqa")?
 * @param {string} email
 * @returns {boolean}
 */
function isSignupAddress(email) {
    const prefix = process.env.GMAIL_SEQUENCE_PREFIX || 'asuqa';
    const tag = (email.split('@')[0].split('+')[1] || '');
    return !!inboxForEmail(email) && tag.startsWith(prefix) && /^[0-9]{4,}$/.test(tag.slice(prefix.length));
}

/** @type {Map<string, Promise<GmailUtils>>} one client per inbox per process */
const clients = new Map();

/**
 * A ready Gmail client for an inbox. Fails clearly when the inbox has no token yet, rather
 * than opening a consent screen in the middle of a test run.
 * @param {Inbox} inbox
 * @returns {Promise<GmailUtils>}
 */
function gmailFor(inbox) {
    let client = clients.get(inbox.address);
    if (!client) {
        client = (async () => {
            const gmail = new GmailUtils({ credentialsPath: inbox.credentialsPath, tokenPath: inbox.tokenPath });
            if (!fs.existsSync(gmail.tokenPath)) {
                throw new Error(`Inbox ${inbox.address} is not authorised yet: no token at ${gmail.tokenPath}. ` +
                    'See docs/EMAIL_VERIFICATION_SETUP.md.');
            }
            await gmail.initialize();
            return gmail;
        })();
        clients.set(inbox.address, client);
    }
    return client;
}

module.exports = { getInboxes, pickInbox, markRateLimited, nextAvailableTime, inboxForEmail, isSignupAddress, gmailFor, COOL_DOWN_MS };
