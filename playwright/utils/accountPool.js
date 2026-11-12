// @ts-check
const fs = require('fs');
const path = require('path');
const { signUpVerifiedAccount, DEFAULT_PASSWORD } = require('./authHelper');
const { startApplicationAt, STEPS } = require('./applicationJourney');
const { signedInEmail } = require('./accountLog');
const { logger } = require('./testLogger');
const LoginPage = require('../pages/LoginPage');
const BasePage = require('../pages/BasePage');

/**
 * A pool of accounts parked on each wizard step, so the "save and continue" tests can run
 * on every run without creating an account each.
 *
 * Saving a step uses an account up for that step: it moves on and can't go back. So a suite
 * that reuses a parked account (its *_TEST_EMAIL in .env) keeps that account for its other
 * tests, and runs its save test on a second account taken from this pool. After the save,
 * that account sits on the NEXT step, so it is put in the next step's pool, where the next
 * suite's save test will take it on a later run:
 *
 *   no-application -> my-information -> my-program -> my-schools
 *     -> my-high-school-grades -> arizona-residency -> (Review: retired)
 *
 * When a step's pool is empty the save test creates a fresh account instead (one sign-up).
 * In steady state a full run needs about one new account for the whole chain.
 *
 * The pool is state/account-pool.json (git-ignored), shared under a lock by every worker
 * and terminal running from this checkout. Pooled accounts use the suite's default sign-up
 * password. An account whose test fails is dropped from the pool (its state is unknown).
 */
const STATE_DIR = path.join(__dirname, '..', 'state');
const STATE_FILE = path.join(STATE_DIR, 'account-pool.json');
const LOCK_DIR = path.join(STATE_DIR, 'account-pool.lock');

/** @typedef {'no-application'|'my-information'|'my-program'|'my-schools'|'my-high-school-grades'|'arizona-residency'} PoolStep */

/** Steps in order; an account saved on one is parked on the next. */
const ORDER = ['no-application', ...STEPS];

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
    fs.mkdirSync(STATE_DIR, { recursive: true });
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

/** @returns {Record<string, string[]>} */
function readPool() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
        return {};
    }
}

/**
 * Take one account parked on `step` out of the pool.
 * @param {string} step
 * @returns {string|undefined} its email
 */
function takeAccount(step) {
    return withLock(() => {
        const pool = readPool();
        const email = (pool[step] || []).shift();
        if (email) fs.writeFileSync(STATE_FILE, JSON.stringify(pool, null, 2));
        return email;
    });
}

/**
 * Park an account in the pool for `step` (ignored if it is already there).
 * @param {string} step
 * @param {string} email
 */
function putAccount(step, email) {
    withLock(() => {
        const pool = readPool();
        for (const list of Object.values(pool)) {
            const i = list.indexOf(email);
            if (i >= 0) list.splice(i, 1);
        }
        (pool[step] = pool[step] || []).push(email);
        fs.writeFileSync(STATE_FILE, JSON.stringify(pool, null, 2));
    });
}

/**
 * Open an account parked on `step` in its own browser context: one from the pool, or a
 * fresh one when the pool has none that still sits on that step.
 * @param {import('@playwright/test').Browser} browser
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {PoolStep} step
 * @returns {Promise<{ context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page,
 *   email: string, applicationId: string, fromPool: boolean, passOn: () => void }>}
 *   passOn(): call after the step was saved; parks the account for the next step's suite.
 */
async function openPooledAccount(browser, testInfo, step) {
    testInfo.setTimeout(Math.max(testInfo.timeout, 600000));
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const page = await context.newPage();
    let email = '';
    let applicationId = '';

    for (let i = 0; i < 3 && !email; i++) {
        const candidate = takeAccount(step);
        if (!candidate) break;
        try {
            if (!(await new LoginPage(page).login(candidate, DEFAULT_PASSWORD))) throw new Error('sign-in failed');
            if (step === 'no-application') {
                await page.waitForLoadState('networkidle').catch(() => {});
                if (await page.getByText('In-progress applications').isVisible().catch(() => false)) throw new Error('already has an application');
            } else {
                applicationId = await new BasePage(page).getApplicationId();
                const at = (page.url().match(/\/ug-app\/\d+\/([a-z-]+)/) || [])[1] || '';
                if (at !== step) {
                    // Somewhere else than expected: park it where it really is, and try another.
                    if (ORDER.includes(at) && at !== 'review') putAccount(at, candidate);
                    applicationId = '';
                    throw new Error(`is on "${at}", not "${step}"`);
                }
            }
            email = candidate;
        } catch (e) {
            logger.warn(`Pooled account ${candidate} not usable for ${step}: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
            await context.clearCookies();
        }
    }

    const fromPool = !!email;
    if (!email) {
        logger.info(`No pooled account on ${step}; creating a fresh one`);
        if (step === 'no-application') {
            ({ email } = await signUpVerifiedAccount(page, { mode: 'online', degreeType: 'pursue' }));
        } else {
            applicationId = await startApplicationAt(page, step, { captureValidations: false });
            email = signedInEmail(page) || '';
        }
    }
    logger.info(`Save test on ${step} uses ${email} (${fromPool ? 'from the pool' : 'new'})`);

    return {
        context, page, email, applicationId, fromPool,
        passOn: () => {
            const next = ORDER[ORDER.indexOf(step) + 1];
            if (email && next && next !== 'review') putAccount(next, email);
        },
    };
}

/**
 * Run a suite's save test without using up the suite's own account when that one is reused.
 *
 * Not reused (the suite created its account this run): `body` runs on the suite's own page.
 * Reused: `body` runs on an account from the pool, which is then passed on to the next step.
 *
 * @param {Object} o
 * @param {boolean} o.reused - the suite signed in to a parked account (*_TEST_EMAIL)
 * @param {import('@playwright/test').Browser} o.browser
 * @param {import('@playwright/test').TestInfo} o.testInfo
 * @param {PoolStep} o.step - the step this suite is on
 * @param {{ page: import('@playwright/test').Page, applicationId?: string }} o.own - the suite's own account
 * @param {(page: import('@playwright/test').Page, applicationId: string, pooled: boolean) => Promise<void>} o.body
 *   does the save; `pooled` is true when it runs on a pool account, which starts with the
 *   step untouched (so the body must fill what the suite's earlier tests would have filled)
 * @returns {Promise<void>}
 */
async function runSaveTest({ reused, browser, testInfo, step, own, body }) {
    if (!reused) {
        await body(own.page, own.applicationId || '', false);
        return;
    }
    const pooled = await openPooledAccount(browser, testInfo, step);
    testInfo.annotations.push({ type: 'account', description: `${pooled.email} (${pooled.fromPool ? 'from the pool' : 'new'})` });
    try {
        await body(pooled.page, pooled.applicationId, true);
        pooled.passOn();
    } finally {
        await pooled.context.close();
    }
}

module.exports = { openPooledAccount, runSaveTest, takeAccount, putAccount, readPool, STATE_FILE };
