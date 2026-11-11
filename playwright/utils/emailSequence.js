// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Persistent, collision-free sequence for sign-up addresses.
 *
 * Every call hands out the next number and stores it in state/email-sequence.json
 * (gitignored), so runs never reuse an address: asuqa0001, asuqa0002, ...
 * A lock directory makes the increment safe across parallel Playwright workers.
 *
 * Env:
 *   GMAIL_TEST_ADDRESS     base inbox, e.g. ugnaaqaautomation1@gmail.com (required)
 *   GMAIL_SEQUENCE_PREFIX  tag prefix (default "asuqa")
 *   GMAIL_SEQUENCE_START   first number when no state file exists yet (default 1)
 */
const STATE_DIR = path.join(__dirname, '..', 'state');
const STATE_FILE = path.join(STATE_DIR, 'email-sequence.json');
const LOCK_DIR = path.join(STATE_DIR, 'email-sequence.lock');

/** @param {number} ms */
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Run `fn` while holding a cross-process lock (mkdir is atomic).
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function withLock(fn) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const deadline = Date.now() + 10000;
    for (;;) {
        try {
            fs.mkdirSync(LOCK_DIR);
            break;
        } catch (e) {
            // Break a stale lock left by a crashed run.
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

/**
 * Reserve and return the next sequence number.
 * @returns {number}
 */
function nextSequenceNumber() {
    return withLock(() => {
        let last = Number(process.env.GMAIL_SEQUENCE_START || 1) - 1;
        if (fs.existsSync(STATE_FILE)) {
            last = Number(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).last) || last;
        }
        const next = last + 1;
        fs.writeFileSync(STATE_FILE, JSON.stringify({ last: next, updatedAt: new Date().toISOString() }, null, 2));
        return next;
    });
}

/**
 * Build the next sequential sign-up address, e.g. ugnaaqaautomation1+asuqa0007@gmail.com.
 * @param {string} [inboxAddress] - the inbox to tag (default GMAIL_TEST_ADDRESS). The number
 *   sequence is shared by all inboxes.
 * @returns {{ email: string, sequence: number }}
 */
function nextSignupEmail(inboxAddress) {
    const base = inboxAddress || process.env.GMAIL_TEST_ADDRESS;
    if (!base || !base.includes('@')) {
        throw new Error('GMAIL_TEST_ADDRESS must be set to a real Gmail inbox (e.g. you@gmail.com)');
    }
    const prefix = process.env.GMAIL_SEQUENCE_PREFIX || 'asuqa';
    const [local, domain] = base.split('@');
    const sequence = nextSequenceNumber();
    const email = `${local.split('+')[0]}+${prefix}${String(sequence).padStart(4, '0')}@${domain}`;
    return { email, sequence };
}

module.exports = { nextSignupEmail, nextSequenceNumber };
