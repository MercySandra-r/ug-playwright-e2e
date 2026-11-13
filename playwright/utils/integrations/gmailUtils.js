// @ts-check
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../testLogger');
const { authenticate } = require('@google-cloud/local-auth');

/**
 * GmailUtils - read-only Gmail client used to complete email-verification steps
 * during automated sign-up.
 *
 * Auth follows the same pattern as GoogleDriveUtils: a Google OAuth *desktop/web*
 * client `credentials/credentials.json`, with the authorized-user token cached in
 * `credentials/gmail-token.json`. The credentials/ folder is git-ignored.
 * The only difference is the scope: `gmail.readonly`.
 *
 * Because the token is scope-bound, Gmail and Drive need SEPARATE token files.
 *
 * @example
 *   const gmail = new GmailUtils();
 *   await gmail.initialize();
 *   const { code, link } = await gmail.waitForVerificationEmail({
 *     toAddress: 'asu.qa.test+1699999999@gmail.com',
 *     since: new Date(),
 *   });
 */
class GmailUtils {
    /**
     * @param {Object} [options]
     * @param {string} [options.credentialsPath] - Path to the OAuth client credentials JSON.
     * @param {string} [options.tokenPath] - Path to save/load the cached auth token.
     * @param {string[]} [options.scopes] - OAuth2 scopes (default: gmail.readonly).
     */
    constructor({
        credentialsPath = process.env.GMAIL_CREDENTIALS_PATH || 'credentials/credentials.json',
        tokenPath = process.env.GMAIL_TOKEN_PATH || 'credentials/gmail-token.json',
        scopes = ['https://www.googleapis.com/auth/gmail.readonly'],
    } = {}) {
        // Relative paths are taken from the playwright/ folder, whatever the working directory.
        const projectDir = path.join(__dirname, '..', '..');
        this.credentialsPath = path.resolve(projectDir, credentialsPath);
        this.tokenPath = path.resolve(projectDir, tokenPath);
        this.scopes = scopes;
        /** @type {import('google-auth-library').OAuth2Client | any} */
        this.auth = null;
        /** @type {any} */
        this.gmail = null;
    }

    /**
     * Initialize the Gmail client, authenticating (and caching the token) if needed.
     * The first run opens a browser consent screen via @google-cloud/local-auth.
     * @returns {Promise<void>}
     */
    async initialize() {
        this.auth = await this.loadSavedAuth();
        if (!this.auth) {
            this.auth = await authenticate({ scopes: this.scopes, keyfilePath: this.credentialsPath });
            await this.saveAuth();
        }
        this.gmail = google.gmail({ version: 'v1', auth: this.auth });
        logger.info('Gmail client initialized');
    }

    /**
     * @returns {Promise<Object|null>}
     */
    async loadSavedAuth() {
        try {
            const content = await fs.readFile(this.tokenPath, 'utf8');
            return google.auth.fromJSON(JSON.parse(content));
        } catch {
            return null;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async saveAuth() {
        if (!this.auth || !this.auth.credentials || !this.auth.credentials.refresh_token) return;
        const payload = JSON.stringify({
            type: 'authorized_user',
            client_id: this.auth._clientId,
            client_secret: this.auth._clientSecret,
            refresh_token: this.auth.credentials.refresh_token,
        });
        await fs.writeFile(this.tokenPath, payload);
        logger.info(`Gmail token cached at ${this.tokenPath}`);
    }

    /**
     * Poll the inbox until a verification email for `toAddress` arrives, then pull
     * both a numeric code and any verification link out of it.
     *
     * @param {Object} opts
     * @param {string} opts.toAddress - The address the sign-up used (plus-tag or catch-all).
     * @param {Date} [opts.since] - Only match mail received at/after this time (default: now).
     * @param {string} [opts.subjectContains] - Extra subject filter, e.g. "verify".
     * @param {string} [opts.fromContains] - Sender filter (default: 'asu.edu').
     * @param {number} [opts.timeoutMs] - Give up after this long (default: 60000).
     * @param {number} [opts.pollIntervalMs] - Gap between polls (default: 3000).
     * @param {RegExp} [opts.codeRegex] - How to find the code (default: 6-digit run).
     * @param {string[]} [opts.excludeIds] - Ignore these messages (e.g. from messageIdsTo()
     *   before the request), so an earlier email inside the clock-skew slack isn't picked up.
     * @returns {Promise<{ code: string|null, link: string|null, subject: string, messageId: string, body: string }>}
     */
    async waitForVerificationEmail({
        toAddress,
        since = new Date(),
        subjectContains,
        fromContains = 'asu.edu',
        timeoutMs = 60000,
        pollIntervalMs = 3000,
        // ASU IdP sends "Your Verification Code" from noreply@asu.edu with a 6-digit code.
        codeRegex = /\b(\d{6})\b/,
        excludeIds = [],
    }) {
        if (!this.gmail) throw new Error('GmailUtils not initialized. Call initialize() first.');

        // Gmail's `after:` is second-granularity; subtract a little slack for clock skew.
        const afterSec = Math.floor(since.getTime() / 1000) - 30;
        const queryParts = [`to:${toAddress}`, `after:${afterSec}`];
        if (fromContains) queryParts.push(`from:${fromContains}`);
        if (subjectContains) queryParts.push(`subject:${subjectContains}`);
        const q = queryParts.join(' ');

        const deadline = Date.now() + timeoutMs;
        logger.info(`Waiting for verification email (q="${q}")`);

        while (Date.now() < deadline) {
            const list = await this.gmail.users.messages.list({ userId: 'me', q, maxResults: 5 });
            const messages = (list.data.messages || []).filter((/** @type {any} */ m) => !excludeIds.includes(String(m.id)));
            if (messages.length > 0) {
                // Newest first: messages.list already returns most-recent first.
                const msg = await this.gmail.users.messages.get({ userId: 'me', id: messages[0].id, format: 'full' });
                const body = this._extractBody(msg.data);
                const subject = this._header(msg.data, 'Subject');
                const codeMatch = body.match(codeRegex);
                const linkMatch = body.match(/https?:\/\/[^\s"'<>]+/i);
                return {
                    code: codeMatch ? codeMatch[1] : null,
                    link: linkMatch ? linkMatch[0] : null,
                    subject,
                    messageId: messages[0].id,
                    body,
                };
            }
            await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
        throw new Error(`No verification email for ${toAddress} within ${timeoutMs}ms (q="${q}")`);
    }

    /**
     * IDs of the most recent messages sent to `toAddress` (newest first).
     * @param {string} toAddress
     * @param {number} [max]
     * @returns {Promise<string[]>}
     */
    async messageIdsTo(toAddress, max = 10) {
        if (!this.gmail) throw new Error('GmailUtils not initialized. Call initialize() first.');
        const list = await this.gmail.users.messages.list({ userId: 'me', q: `to:${toAddress}`, maxResults: max });
        return (list.data.messages || []).map((/** @type {any} */ m) => String(m.id));
    }

    /**
     * @param {any} message - A full Gmail message resource.
     * @param {string} name - Header name.
     * @returns {string}
     */
    _header(message, name) {
        const headers = (message.payload && message.payload.headers) || [];
        const h = headers.find((/** @type {any} */ x) => x.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
    }

    /**
     * Decode the message body, preferring text/plain and falling back to text/html.
     * Walks nested multipart payloads.
     * @param {any} message - A full Gmail message resource.
     * @returns {string}
     */
    _extractBody(message) {
        /** @type {Record<string,string>} */
        const parts = {};
        const walk = (/** @type {any} */ p) => {
            if (!p) return;
            if (p.body && p.body.data && p.mimeType && (p.mimeType === 'text/plain' || p.mimeType === 'text/html')) {
                parts[p.mimeType] = Buffer.from(p.body.data, 'base64').toString('utf8');
            }
            (p.parts || []).forEach(walk);
        };
        walk(message.payload);
        const raw = parts['text/plain'] || parts['text/html'] || '';
        // Strip tags so code/link regexes work on HTML-only emails too.
        if (parts['text/plain']) return raw;
        // Drop <style>/<script> blocks first so CSS text doesn't pollute the body.
        return raw.replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
    }
}

module.exports = GmailUtils;
