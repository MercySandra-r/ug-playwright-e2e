// @ts-check
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { ARTIFACTS_DIR } = require('./artifactPaths');
const { logger } = require('./testLogger');

/**
 * A running list of the accounts the suite creates, as an Excel sheet:
 *
 *   artifacts/accounts/accounts.xlsx   one row per account (open this)
 *   artifacts/accounts/accounts.json   the same rows; the source the sheet is rebuilt from
 *
 * Columns: email, created on (local date and time), created by (the test that made the
 * account), application IDs, submitted? (each application, submitted or not), notes. Passwords
 * are never written. Accounts and applications from before 2026-11-25 show "Not recorded" in
 * the two new columns, unless the note already said. artifacts/ is git-ignored. Tab "Accounts" lists accounts on the inbox the suite
 * uses now (GMAIL_TEST_ADDRESS); tab "Retired inboxes" keeps the older ones as history.
 *
 * The JSON is updated under a lock (parallel workers), then the sheet is rebuilt from it.
 * If the sheet is open in Excel the rebuild is skipped with a warning; the next account
 * rebuilds it. Logging never fails a test.
 */
const DIR = path.join(ARTIFACTS_DIR, 'accounts');
const JSON_FILE = path.join(DIR, 'accounts.json');
const XLSX_FILE = path.join(DIR, 'accounts.xlsx');
const LOCK_DIR = path.join(DIR, 'accounts.lock');

/**
 * @typedef {Object} AccountRow
 * @property {string} email
 * @property {string} created - local date and time, or '' when unknown
 * @property {string[]} applicationIds
 * @property {string} notes
 * @property {string} [createdBy] - the test that created the account
 * @property {Record<string, string>} [submitted] - application ID -> "" (not submitted) or when it was submitted
 */

/**
 * The test running now, e.g. "TC_08_MyHighSchoolGradesTest › Current graduate (retry 1)";
 * '' outside a test (diagnostic scripts).
 * @returns {string}
 */
function currentTest() {
    try {
        const info = require('@playwright/test').test.info();
        const file = path.basename(info.file).replace(/\.spec\.[jt]s$/, '');
        const titles = info.titlePath.slice(1).filter(Boolean);
        return [file, ...titles].join(' › ') + (info.retry ? ` (retry ${info.retry})` : '');
    } catch {
        return '';
    }
}

/** Which account each open page is signed in to (set at sign-up and sign-in). */
/** @type {WeakMap<import('@playwright/test').Page, string>} */
const signedIn = new WeakMap();

/** @param {number} ms */
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Run `fn` holding a cross-process lock (mkdir is atomic).
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function withLock(fn) {
    fs.mkdirSync(DIR, { recursive: true });
    const deadline = Date.now() + 10000;
    for (;;) {
        try {
            fs.mkdirSync(LOCK_DIR);
            break;
        } catch (e) {
            try {
                if (Date.now() - fs.statSync(LOCK_DIR).mtimeMs > 30000) fs.rmdirSync(LOCK_DIR);
            } catch { /* lock vanished between calls; retry */ }
            if (Date.now() > deadline) throw new Error(`Timed out waiting for ${LOCK_DIR}`);
            sleepSync(50);
        }
    }
    try {
        return fn();
    } finally {
        fs.rmdirSync(LOCK_DIR);
    }
}

/** @returns {AccountRow[]} */
function readRows() {
    return fs.existsSync(JSON_FILE) ? JSON.parse(fs.readFileSync(JSON_FILE, 'utf8')) : [];
}

/** @param {Date} d */
function localStamp(d) {
    const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Add or update one row in the JSON, then rebuild the sheet.
 * @param {string} email
 * @param {(row: AccountRow, isNew: boolean) => void} change
 * @returns {Promise<void>}
 */
async function upsert(email, change) {
    try {
        const rows = withLock(() => {
            const all = readRows();
            let row = all.find((r) => r.email === email);
            const isNew = !row;
            if (!row) {
                row = { email, created: '', applicationIds: [], notes: '' };
                all.push(row);
            }
            change(row, isNew);
            all.sort((a, b) => a.email.localeCompare(b.email));
            fs.writeFileSync(JSON_FILE, JSON.stringify(all, null, 2));
            return all;
        });
        await writeSheet(rows);
    } catch (e) {
        logger.warn(`Account log not updated for ${email}: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Rebuild accounts.xlsx from the rows.
 * @param {AccountRow[]} rows
 * @returns {Promise<void>}
 */
async function writeSheet(rows) {
    const workbook = new ExcelJS.Workbook();
    /** @param {string} name */
    const addTab = (name) => {
        const sheet = workbook.addWorksheet(name);
        sheet.columns = [
            { header: 'Email', key: 'email', width: 46 },
            { header: 'Created on', key: 'created', width: 20 },
            { header: 'Created by', key: 'createdBy', width: 60 },
            { header: 'Application IDs', key: 'applicationIds', width: 18 },
            { header: 'Submitted?', key: 'submitted', width: 40 },
            { header: 'Notes', key: 'notes', width: 60 },
        ];
        sheet.getRow(1).font = { bold: true };
        // Several applications show one per line in "Submitted?".
        sheet.getColumn('submitted').alignment = { wrapText: true, vertical: 'top' };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        return sheet;
    };
    // "Accounts": accounts on the inbox the suite uses now. "Retired inboxes": accounts on
    // inboxes no longer in .env, kept as history only.
    const current = addTab('Accounts');
    const retired = addTab('Retired inboxes');
    for (const r of rows) {
        (isOnCurrentInbox(r.email) ? current : retired).addRow({
            ...r,
            createdBy: r.createdBy || 'Not recorded',
            applicationIds: r.applicationIds.join(', '),
            submitted: submittedText(r),
        });
    }
    try {
        await workbook.xlsx.writeFile(XLSX_FILE);
    } catch (e) {
        // Usually the file is open in Excel (locked on Windows). The JSON has the row.
        logger.warn(`accounts.xlsx not rewritten (is it open in Excel?): ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * The "Submitted?" cell: one line per application, e.g. "5021652: No" or
 * "5020484: Yes, 2026-11-14 10:22:05". "No application" when there is none.
 * @param {AccountRow} r
 * @returns {string}
 */
function submittedText(r) {
    if (!r.applicationIds.length) return 'No application';
    return r.applicationIds.map((id) => {
        const when = r.submitted?.[id];
        if (when === undefined) {
            // Before submissions were tracked; some notes name the submitted application.
            const named = r.notes.includes(id) || r.applicationIds.length === 1;
            if (named && /unsubmitted|not submitted|in progress/i.test(r.notes)) return `${id}: No`;
            if (named && /\bsubmitted\b/i.test(r.notes)) return `${id}: Yes`;
            return `${id}: Not recorded`;
        }
        return when ? `${id}: Yes, ${when}` : `${id}: No`;
    }).join('\n');
}

/**
 * Is this address on one of the inboxes configured in .env? With no inbox configured,
 * every account counts as current.
 * @param {string} email
 * @returns {boolean}
 */
function isOnCurrentInbox(email) {
    try {
        // Lazy: inboxes.js loads the Gmail client, which plain logging doesn't need.
        return !!require('./inboxes').inboxForEmail(email);
    } catch {
        return true;
    }
}

/**
 * Rebuild accounts.xlsx from accounts.json (e.g. after the inboxes in .env change).
 * @returns {Promise<void>}
 */
async function rebuildSheet() {
    await writeSheet(withLock(readRows));
}

/**
 * Record a newly created account and remember that `page` is signed in to it.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} [notes]
 * @returns {Promise<void>}
 */
async function recordAccount(page, email, notes = '') {
    signedIn.set(page, email);
    await upsert(email, (row) => {
        row.created = localStamp(new Date());
        row.createdBy = currentTest();
        row.submitted = row.submitted || {};
        if (notes) row.notes = notes;
    });
}

/**
 * Remember that `page` signed in to an existing account (no row is written).
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 */
function noteSignedIn(page, email) {
    signedIn.set(page, email);
}

/**
 * The account `page` is signed in to, when it signed up or signed in through the suite.
 * @param {import('@playwright/test').Page} page
 * @returns {string|undefined}
 */
function signedInEmail(page) {
    return signedIn.get(page);
}

/**
 * Record an application started on the account `page` is signed in to.
 * Does nothing when the account isn't known (signed in some other way).
 * @param {import('@playwright/test').Page} page
 * @param {string} applicationId
 * @returns {Promise<void>}
 */
async function recordApplication(page, applicationId) {
    const email = signedIn.get(page);
    if (!email) return;
    await upsert(email, (row, isNew) => {
        if (!row.applicationIds.includes(applicationId)) row.applicationIds.push(applicationId);
        row.submitted = row.submitted || {};
        if (!(applicationId in row.submitted)) row.submitted[applicationId] = '';
        if (isNew) row.notes = 'Account created before the log existed';
    });
}

/**
 * Record that an application on the account `page` is signed in to was submitted.
 * Does nothing when the account isn't known (signed in some other way).
 * @param {import('@playwright/test').Page} page
 * @param {string} applicationId
 * @returns {Promise<void>}
 */
async function recordSubmitted(page, applicationId) {
    const email = signedIn.get(page);
    if (!email) return;
    await upsert(email, (row) => {
        if (!row.applicationIds.includes(applicationId)) row.applicationIds.push(applicationId);
        row.submitted = { ...row.submitted, [applicationId]: localStamp(new Date()) };
    });
}

/**
 * Add or replace the note on an account (creating the row if needed).
 * @param {string} email
 * @param {string} notes
 * @param {string[]} [applicationIds]
 * @returns {Promise<void>}
 */
async function annotateAccount(email, notes, applicationIds = []) {
    await upsert(email, (row) => {
        row.notes = notes;
        for (const id of applicationIds) if (!row.applicationIds.includes(id)) row.applicationIds.push(id);
    });
}

module.exports = { recordAccount, noteSignedIn, signedInEmail, recordApplication, recordSubmitted, annotateAccount, rebuildSheet, XLSX_FILE, JSON_FILE };
