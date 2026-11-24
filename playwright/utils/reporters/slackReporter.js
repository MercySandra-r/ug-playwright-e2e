// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Posts a short summary of every run to Slack: the result, counts, pass rate, duration,
 * browsers and the failed or flaky tests with their first error line.
 *
 * It reads the run data the Test Run Summary reporter writes
 * (reports/test-run-summary/run-data.json), so it is listed after that reporter in
 * playwright.config.js. It does nothing until Slack is set up in .env:
 *
 *   SLACK_WEBHOOK_URL   an incoming webhook (posts to the channel chosen when it was created)
 *   or
 *   SLACK_BOT_TOKEN     a bot token (xoxb-...) with chat:write, and files:write to attach the
 *   SLACK_CHANNEL       Test Run Summary page; SLACK_CHANNEL is the channel ID (C0123...)
 *
 *   or
 *   SLACK_CHANNEL_EMAIL the channel's email address (no Slack app needed): the summary is
 *                       emailed from the test inbox through the Gmail API, with the Test Run
 *                       Summary page attached; the Gmail token needs gmail.send
 *
 *   SLACK_NOTIFY=off    turns posting off without removing the settings
 *
 * The traces of failed tests (copied next to the summary by the Test Run Summary reporter) are
 * attached too, as downloads, up to TRACE_LIMIT_MB in all (the email must stay under Gmail's
 * 25 MB); any left out are named in the message. A webhook can't carry files.
 *
 * A Slack error is logged and never fails the run.
 */

/**
 * @typedef {import('./testRunSummaryReporter').RunModel} RunModel
 */

/** @param {number} ms */
const fmt = (ms) => (ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`);
/** Slack mrkdwn needs &, < and > escaped. @param {string} s */
const md = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The Slack message for a run.
 * @param {RunModel} model
 * @param {{ reportPath?: string, traces?: { attached: string[], left: string[] } }} [options]
 *   traces: file names of the attached traces and of those left out (too large)
 * @returns {{ text: string, blocks: any[] }}
 */
function buildSlackMessage(model, { reportPath, traces } = {}) {
    const tests = model.tests;
    /** @param {string} o */
    const n = (o) => tests.filter((t) => t.outcome === o).length;
    const total = tests.length; const passed = n('passed'); const failed = n('failed'); const flaky = n('flaky'); const skipped = n('skipped');
    const notRun = n('didnotrun');
    // Counts are of the tests meant to run: skipped ones (or a listing, where nothing runs) are
    // left out; tests that did not run (stopped by a failure) stay in and count against the rate.
    const ran = total - skipped;
    const rate = ran ? Math.round(((passed + flaky) / ran) * 1000) / 10 : 0;
    const browsers = [...new Set(tests.map((t) => t.project || '').filter(Boolean))];
    const notRunPart = notRun ? `, ${notRun} did not run` : '';
    const headline = !ran
        ? ':grey_question: *No tests ran*'
        : failed
            ? `:x: *${failed} of ${ran} tests failed${notRunPart}*`
            : notRun ? `:x: *${notRun} of ${ran} tests did not run*`
                : flaky ? `:warning: *All ${ran} tests passed, ${flaky} on a retry*` : `:white_check_mark: *${ran === 1 ? 'The test' : `All ${ran} tests`} passed*`;
    const started = model.startedAt ? new Date(model.startedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    /** @type {any[]} */
    const blocks = [
        { type: 'header', text: { type: 'plain_text', text: 'NAA Automation · Test Run Summary' } },
        { type: 'section', text: { type: 'mrkdwn', text: headline } },
        { type: 'section', fields: [
            { type: 'mrkdwn', text: `*Pass rate*\n${rate}%` },
            { type: 'mrkdwn', text: `*Duration*\n${fmt(model.durationMs)}` },
            { type: 'mrkdwn', text: `*Passed / Failed*\n${passed + flaky} / ${failed}` },
            { type: 'mrkdwn', text: `*Flaky / Did not run / Skipped*\n${flaky} / ${notRun} / ${skipped}` },
            { type: 'mrkdwn', text: `*Browsers*\n${md(browsers.join(', ') || model.browser)}` },
            { type: 'mrkdwn', text: `*Site*\n${md(model.baseURL || '-')}` },
        ] },
    ];
    if (browsers.length > 1) {
        blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: browsers.map((b) => {
            const rows = tests.filter((t) => t.project === b);
            const ok = rows.filter((t) => t.outcome === 'passed' || t.outcome === 'flaky').length;
            return `*${md(b)}* ${ok}/${rows.length}`;
        }).join('   ·   ') }] });
    }
    // Tests that did not run are counted under the failure that stopped them; only those with no
    // failure to point to (the run stopped) get a line of their own.
    const attention = tests.filter((t) => t.outcome === 'failed' || t.outcome === 'flaky' || (t.outcome === 'didnotrun' && !t.blockedBy));
    if (attention.length) {
        const lines = attention.slice(0, 10).map((t) => {
            const tc = (t.file.match(/^(TC_\d+)(?:_(F\d+))?/) || []);
            const where = `${tc[1] || t.file}${tc[2] ? ` ${tc[2]}` : ''}`;
            const err = (t.errors[0] || '').split('\n').find((l) => l.trim()) || '';
            const stopped = t.outcome === 'failed'
                ? tests.filter((s) => s.outcome === 'didnotrun' && s.blockedBy === t.title && s.file === t.file && s.project === t.project).length : 0;
            const mark = t.outcome === 'failed' ? ':x:' : t.outcome === 'flaky' ? ':warning:' : ':no_entry_sign:';
            return `${mark} *${md(where)}* ${md(t.title)}${browsers.length > 1 && t.project ? ` _(${md(t.project)})_` : ''}`
                + `${stopped ? ` _(${stopped} later test${stopped === 1 ? '' : 's'} did not run)_` : ''}${t.outcome === 'didnotrun' ? ' _(did not run: the run stopped first)_' : ''}`
                + `${err ? `\n      \`${md(err.slice(0, 150))}\`` : ''}`;
        });
        if (attention.length > 10) lines.push(`…and ${attention.length - 10} more in the report`);
        blocks.push({ type: 'divider' }, { type: 'section', text: { type: 'mrkdwn', text: `*Needs attention*\n${lines.join('\n')}` } });
    }
    if (traces && (traces.attached.length || traces.left.length)) {
        /** @type {string[]} */
        const lines = [];
        if (traces.attached.length) {
            lines.push(`*Traces attached (${traces.attached.length})*: download one, then drop it on https://trace.playwright.dev or run \`npx playwright show-trace <file>\` to replay the failed test step by step.`);
        }
        if (traces.left.length) {
            const names = traces.left.map((t) => `\`${md(t)}\``).join(', ');
            lines.push(`Not attached (too large): ${names}, in \`reports/test-run-summary/data/\` on the machine that ran the tests.`);
        }
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } });
    }
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `${started ? `Started ${md(started)} · ` : ''}${reportPath ? `Report: \`${md(reportPath)}\`` : ''}` }] });
    const text = !ran
        ? 'NAA Automation: no tests ran'
        : `NAA Automation: ${failed ? `${failed} of ${ran} tests failed${notRunPart}` : notRun ? `${notRun} of ${ran} tests did not run` : `${ran === 1 ? '1 test' : `all ${ran} tests`} passed`} (${rate}% pass rate, ${fmt(model.durationMs)})`;
    return { text, blocks };
}

/**
 * Send the message (and, with a bot token, the report page) to Slack.
 * @param {{ text: string, blocks: any[] }} message
 * @param {{ htmlPath?: string, files?: string[] }} [options] files: extra attachments (traces)
 * @returns {Promise<string>} how it was sent
 */
async function sendToSlack(message, { htmlPath, files = [] } = {}) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL;
    if (token && channel) {
        const { WebClient } = require('@slack/web-api');
        const client = new WebClient(token);
        const posted = await client.chat.postMessage({ channel, text: message.text, blocks: message.blocks });
        // The report page goes into the message's thread.
        if (htmlPath && fs.existsSync(htmlPath) && posted.ts) {
            await client.filesUploadV2({ channel_id: channel, thread_ts: posted.ts, file: fs.createReadStream(htmlPath),
                filename: path.basename(htmlPath), title: 'Test Run Summary' });
        }
        for (const file of files) {
            if (!posted.ts || !fs.existsSync(file)) continue;
            await client.filesUploadV2({ channel_id: channel, thread_ts: posted.ts, file: fs.createReadStream(file),
                filename: path.basename(file), title: path.basename(file) });
        }
        return `bot token, channel ${channel}`;
    }
    if (webhook && /^https:\/\/hooks\.slack\.com\//.test(webhook)) {
        const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
        if (!res.ok) throw new Error(`Slack webhook answered ${res.status}: ${await res.text()}`);
        return 'incoming webhook';
    }
    const channelEmail = process.env.SLACK_CHANNEL_EMAIL;
    if (channelEmail && EMAIL.test(channelEmail)) {
        await sendByEmail(message, channelEmail, { htmlPath, files });
        return 'email to the channel';
    }
    throw new Error('Slack is not set up: set SLACK_WEBHOOK_URL, SLACK_BOT_TOKEN and SLACK_CHANNEL, or SLACK_CHANNEL_EMAIL in .env');
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Slack mrkdwn of the message as simple HTML for an email. @param {string} s */
function mdToHtml(s) {
    const emoji = { ':x:': '❌', ':white_check_mark:': '✅', ':warning:': '⚠️', ':grey_question:': '❔' };
    return String(s)
        .replace(/:[a-z_]+:/g, (m) => emoji[/** @type {keyof typeof emoji} */ (m)] || m)
        .replace(/`([^`]+)`/g, '<code style="background:#f3f3f3;padding:1px 4px;border-radius:3px">$1</code>')
        .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
        .replace(/(^|[\s(])_([^_\n]+)_/g, '$1<i>$2</i>')
        .replace(/\n/g, '<br>');
}
/** Slack mrkdwn as plain text. @param {string} s */
function mdToText(s) {
    const emoji = { ':x:': '[FAILED]', ':white_check_mark:': '[OK]', ':warning:': '[!]', ':grey_question:': '[?]' };
    return String(s).replace(/:[a-z_]+:/g, (m) => emoji[/** @type {keyof typeof emoji} */ (m)] || m)
        .replace(/[*`]/g, '').replace(/(^|[\s(])_([^_\n]+)_/g, '$1$2').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Email the run summary to the channel's email address (Slack posts every email the address
 * receives) from the test inbox, through the Gmail API. The Test Run Summary page is attached.
 * The Gmail token needs the gmail.send permission as well as gmail.readonly.
 * @param {{ text: string, blocks: any[] }} message
 * @param {string} to
 * @param {{ htmlPath?: string, files?: string[] }} [options] files: zip attachments (traces)
 * @returns {Promise<void>}
 */
async function sendByEmail(message, to, { htmlPath, files = [] } = {}) {
    const GmailUtils = require('../integrations/gmailUtils');
    const gmail = new GmailUtils({
        credentialsPath: process.env.GMAIL_CREDENTIALS_PATH, tokenPath: process.env.GMAIL_TOKEN_PATH,
        scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    });
    await gmail.initialize();

    /** @type {string[]} */ const html = []; /** @type {string[]} */ const text = [];
    for (const b of message.blocks) {
        if (b.type === 'header') { html.push(`<h2 style="margin:0 0 8px;color:#8c1d40">${b.text.text}</h2>`); text.push(b.text.text, ''); }
        else if (b.type === 'divider') { html.push('<hr style="border:0;border-top:1px solid #ddd">'); text.push('----'); }
        else if (b.type === 'context') { const t = b.elements.map((/** @type {any} */ e) => e.text).join(' '); html.push(`<p style="color:#666;font-size:12px">${mdToHtml(t)}</p>`); text.push(mdToText(t)); }
        else if (b.fields) {
            html.push(`<table style="border-collapse:collapse;margin:6px 0">${b.fields.map((/** @type {any} */ f) => { const [k, v] = f.text.split('\n'); return `<tr><td style="padding:3px 16px 3px 0;color:#555">${mdToHtml(k)}</td><td style="padding:3px 0">${mdToHtml(v || '')}</td></tr>`; }).join('')}</table>`);
            text.push(...b.fields.map((/** @type {any} */ f) => mdToText(f.text.replace('\n', ': '))));
        } else if (b.text) { html.push(`<p>${mdToHtml(b.text.text)}</p>`); text.push(mdToText(b.text.text)); }
    }
    const htmlBody = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#1b2130">${html.join('\n')}</div>`;

    const from = process.env.GMAIL_TEST_ADDRESS || 'me';
    const mixed = `mixed-${Date.now()}`; const alt = `alt-${Date.now()}`;
    const b64 = (/** @type {string|Buffer} */ v) => Buffer.from(v).toString('base64').replace(/(.{76})/g, '$1\r\n');
    const lines = [
        `From: NAA Test Automation <${from}>`, `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(message.text).toString('base64')}?=`,
        'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${mixed}"`, '',
        `--${mixed}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '',
        `--${alt}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(text.join('\n')),
        `--${alt}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(htmlBody),
        `--${alt}--`,
    ];
    if (htmlPath && fs.existsSync(htmlPath)) {
        lines.push(`--${mixed}`, `Content-Type: text/html; charset="UTF-8"; name="${path.basename(htmlPath)}"`,
            `Content-Disposition: attachment; filename="${path.basename(htmlPath)}"`, 'Content-Transfer-Encoding: base64', '',
            b64(fs.readFileSync(htmlPath)));
    }
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        const name = path.basename(file);
        lines.push(`--${mixed}`, `Content-Type: application/zip; name="${name}"`,
            `Content-Disposition: attachment; filename="${name}"`, 'Content-Transfer-Encoding: base64', '',
            b64(fs.readFileSync(file)));
    }
    lines.push(`--${mixed}--`);
    try {
        // Sent as an upload rather than inline JSON, so a message with traces can be up to Gmail's limit.
        await gmail.gmail.users.messages.send({ userId: 'me', requestBody: {}, media: { mimeType: 'message/rfc822', body: lines.join('\r\n') } });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/insufficient.*scope/i.test(msg)) throw new Error('the Gmail token may only read mail: renew it with the gmail.send permission (one sign-in)');
        throw e;
    }
}

/**
 * The failed tests' trace files to attach, in test order, until TRACE_LIMIT_MB (default 15 MB of
 * files, about 20 MB once encoded for email) is reached.
 * @param {RunModel} model
 * @param {string} dataDir - folder of run-data.json (trace paths are relative to it)
 * @returns {{ attached: string[], left: string[] }} attached: full paths; left: file names
 */
function pickTraces(model, dataDir) {
    const limit = (Number(process.env.TRACE_LIMIT_MB) || 15) * 1024 * 1024;
    /** @type {string[]} */ const attached = [];
    /** @type {string[]} */ const left = [];
    let total = 0;
    for (const t of model.tests) {
        for (const tr of t.traces || []) {
            const file = path.resolve(dataDir, tr.src);
            if (!fs.existsSync(file)) continue;
            const size = fs.statSync(file).size;
            if (total + size <= limit) { attached.push(file); total += size; } else left.push(tr.name);
        }
    }
    return { attached, left };
}

/** Whether Slack is set up and not turned off. */
function slackEnabled() {
    if (/^(off|false|0|no)$/i.test(process.env.SLACK_NOTIFY || '')) return false;
    const webhook = process.env.SLACK_WEBHOOK_URL || '';
    return /^https:\/\/hooks\.slack\.com\/services\/[^/]+\/[^/]+\/[^/]+$/.test(webhook)
        || !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL)
        || EMAIL.test(process.env.SLACK_CHANNEL_EMAIL || '');
}

/** @typedef {import('@playwright/test/reporter').Reporter} Reporter */

/** @implements {Reporter} */
class SlackReporter {
    /** @param {{ runData?: string, report?: string }} [options] */
    constructor(options = {}) {
        this.runData = options.runData || 'reports/test-run-summary/run-data.json';
        this.report = options.report || 'reports/test-run-summary/test-run-summary.html';
        /** @type {string} */
        this.root = process.cwd();
    }

    /** @param {import('@playwright/test/reporter').FullConfig} config */
    onBegin(config) {
        this.root = config.configFile ? path.dirname(config.configFile) : process.cwd();
    }

    async onEnd() {
        if (!slackEnabled()) return;
        const dataPath = path.resolve(this.root, this.runData);
        if (!fs.existsSync(dataPath)) {
            console.warn(`Slack: no run data at ${dataPath}; nothing posted`);
            return;
        }
        try {
            /** @type {RunModel} */
            const model = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            // A listing (--list) or a run where every test was skipped has nothing to report.
            if (!model.tests.some((t) => t.outcome !== 'skipped')) {
                console.log('Slack: no tests ran; nothing posted');
                return;
            }
            const traces = pickTraces(model, path.dirname(dataPath));
            const message = buildSlackMessage(model, { reportPath: this.report,
                traces: { attached: traces.attached.map((f) => path.basename(f)), left: traces.left } });
            const how = await sendToSlack(message, { htmlPath: path.resolve(this.root, this.report), files: traces.attached });
            console.log(`Slack: run summary posted (${how})`);
        } catch (e) {
            console.warn(`Slack: could not post the run summary: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    printsToStdio() {
        return false;
    }
}

SlackReporter.buildSlackMessage = buildSlackMessage;
SlackReporter.sendToSlack = sendToSlack;
SlackReporter.slackEnabled = slackEnabled;
SlackReporter.pickTraces = pickTraces;
module.exports = SlackReporter;
