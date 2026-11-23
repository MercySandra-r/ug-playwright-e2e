// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Test Run Summary: an HTML report written after every run next to Playwright's default one.
 *
 *   reports/html-report/                              Playwright's own report (traces, steps, screenshots)
 *   reports/test-run-summary/test-run-summary.html    this one: a one-page summary of the run,
 *                                                     grouped by spec, with failures and flaky tests
 *                                                     first, error messages, failure screenshots,
 *                                                     test notes (e.g. application IDs) and the
 *                                                     slowest tests; its data is in run-data.json
 *
 * Registered in playwright.config.js:
 *   ['./utils/reporters/testRunSummaryReporter.js', { outputFolder: 'reports/test-run-summary' }]
 *
 * The page is self-contained (no external files) and follows the system's light/dark mode.
 * `TestRunSummaryReporter.renderReport(model)` builds the same page from any run model, so a run
 * can also be shown from other sources (for example a console log).
 */

/**
 * @typedef {'passed'|'failed'|'flaky'|'skipped'} Outcome
 * @typedef {{ file: string, title: string, group: string, line: number, outcome: Outcome, project?: string,
 *             durationMs: number, retries: number, errors: string[],
 *             notes: Array<{ type: string, description: string }>,
 *             images: Array<{ name: string, src: string }> }} TestRow
 * @typedef {{ title: string, startedAt: string, durationMs: number, browser: string,
 *             workers: number|string, retries: number|string, baseURL: string,
 *             source: string, tests: TestRow[] }} RunModel
 */

/** Page areas by spec number (flows are named from their file names). */
const AREAS = {
    '01': 'Landing page and footer links', '02': 'Email-verified sign-up', '03': 'Sign-in and forgot password',
    '04': 'Pre-application dashboard', '05': 'My information', '06': 'My ASU program', '07': 'My schools',
    '08': 'My high school grades', '09': 'Arizona residency', '10': 'Profile', '11': 'Review and Submit validations',
    '12': 'Next steps dashboard', '13': 'Preview of the submitted application',
};

/** @param {string} s */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** @param {number} ms */
const fmt = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`);
/** @param {string} s */
const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

/**
 * "TC_31_F18_Kaplan_FeeWaived_MultipleApplications" -> { tc: 'TC_31', flow: 'F18', area: 'Kaplan, fee waived, multiple applications' }
 * @param {string} file - spec file name without folder or ".spec.js"
 */
function describeSpec(file) {
    const m = file.match(/^TC_(\d+)_(?:(F\d+)_)?(.*)$/);
    if (!m) return { tc: file, flow: '', area: file, nn: '' };
    const [, nn, flow, rest] = m;
    const words = rest.split('_').map((w) => w.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/Test$|Page Test$/, '').trim()).filter(Boolean);
    const area = AREAS[/** @type {keyof typeof AREAS} */ (nn)] || words.join(', ');
    return { tc: `TC_${nn}`, flow: flow || '', area, nn };
}

/**
 * The report page for a run.
 * @param {RunModel} model
 * @returns {string}
 */
function renderReport(model) {
    const tests = [...model.tests].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || (a.project || '').localeCompare(b.project || ''));
    // Several browsers in one run: each test shows its browser, with a breakdown and a filter.
    const projects = [...new Set(tests.map((t) => t.project || '').filter(Boolean))].sort();
    const multi = projects.length > 1;
    /** @param {TestRow} t */
    const bchip = (t) => (multi && t.project ? `<span class="bchip">${esc(t.project)}</span>` : '');
    /** @param {Outcome} o */
    const count = (o) => tests.filter((t) => t.outcome === o).length;
    const total = tests.length;
    const passed = count('passed'); const failed = count('failed'); const flaky = count('flaky'); const skipped = count('skipped');
    const ran = total - skipped;
    const rate = ran ? Math.round(((passed + flaky) / ran) * 1000) / 10 : 0;
    const verdict = failed ? 'failed' : flaky ? 'flaky' : skipped && !passed ? 'skipped' : 'passed';
    const verdictText = { passed: 'All tests passed', failed: `${failed} test${failed === 1 ? '' : 's'} failed`, flaky: 'Passed with flaky tests', skipped: 'Nothing ran' }[verdict];

    /** @type {Map<string, TestRow[]>} */
    const bySpec = new Map();
    for (const t of tests) { if (!bySpec.has(t.file)) bySpec.set(t.file, []); /** @type {TestRow[]} */ (bySpec.get(t.file)).push(t); }

    const icon = { passed: '✓', failed: '✕', flaky: '!', skipped: '–' };
    /** @param {TestRow} t @param {number} slowest */
    const testRow = (t, slowest) => {
        const width = slowest ? Math.max(2, Math.round((t.durationMs / slowest) * 100)) : 0;
        const notes = t.notes.filter((n) => n.description).map((n) => `<span class="tag"><b>${esc(n.type)}</b> ${esc(n.description.length > 140 ? `${n.description.slice(0, 137)}…` : n.description)}</span>`).join('');
        const errors = t.errors.map((e) => `<pre class="err">${esc(e)}</pre>`).join('');
        const images = t.images.map((i) => `<a class="shot" href="${esc(i.src)}" target="_blank" rel="noopener"><img src="${esc(i.src)}" alt="${esc(i.name)}" loading="lazy"></a>`).join('');
        return `<li class="test" data-outcome="${t.outcome}" data-project="${esc(t.project || '')}" data-text="${esc(`${t.file} ${t.group} ${t.title} ${t.notes.map((n) => n.description).join(' ')}`.toLowerCase())}">
<span class="st ${t.outcome}" title="${t.outcome}">${icon[t.outcome]}</span>
<div class="tbody"><div class="tname">${bchip(t)}${esc(t.title)}${t.retries ? ` <span class="retry">retried ${t.retries}×</span>` : ''}</div>
${notes ? `<div class="tags">${notes}</div>` : ''}${errors}${images ? `<div class="shots">${images}</div>` : ''}</div>
<div class="tdur"><span>${fmt(t.durationMs)}</span><span class="trk"><i style="width:${width}%"></i></span></div></li>`;
    };
    /** The tests of a spec, with a heading wherever the describe block changes. @param {TestRow[]} rows */
    const testList = (rows) => {
        const slowest = Math.max(...rows.map((r) => r.durationMs));
        const groups = new Set(rows.map((r) => r.group));
        let current = '\u0000';
        return rows.map((r) => {
            const head = groups.size > 1 && r.group !== current && r.group ? `<li class="dgroup">${esc(r.group)}</li>` : '';
            current = r.group;
            return head + testRow(r, slowest);
        }).join('\n');
    };

    /** @param {[string, TestRow[]]} entry */
    const specCard = ([file, rows]) => {
        const d = describeSpec(file);
        const c = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
        for (const r of rows) c[r.outcome]++;
        const dur = rows.reduce((a, r) => a + r.durationMs, 0);
        const seg = /** @type {Outcome[]} */ (['passed', 'flaky', 'failed', 'skipped']).filter((o) => c[o]).map((o) => `<i class="${o}" style="flex:${c[o]}"></i>`).join('');
        const state = c.failed ? 'failed' : c.flaky ? 'flaky' : c.passed ? 'passed' : 'skipped';
        return `<details class="spec ${state}"${c.failed || c.flaky ? ' open' : ''} data-file="${esc(file.toLowerCase())}">
<summary><span class="badge">${esc(d.tc)}${d.flow ? `<small>${esc(d.flow)}</small>` : ''}</span>
<span class="sname"><b>${esc(d.area)}</b><small>${esc(file)}.spec.js</small></span>
<span class="sbar">${seg}</span>
<span class="scount"><b>${c.passed + c.flaky}</b>/${rows.length}</span><span class="sdur">${fmt(dur)}</span><span class="chev" aria-hidden="true">›</span></summary>
<ul>${testList(rows)}</ul></details>`;
    };
    const specs = [...bySpec.entries()];
    const pages = specs.filter(([f]) => !describeSpec(f).flow);
    const flows = specs.filter(([f]) => describeSpec(f).flow);
    const section = (/** @type {string} */ title, /** @type {Array<[string, TestRow[]]>} */ list) => (list.length
        ? `<section class="group"><h2>${esc(title)} <span>${list.length} spec${list.length === 1 ? '' : 's'} · ${list.reduce((a, [, r]) => a + r.length, 0)} tests</span></h2>${list.map(specCard).join('\n')}</section>` : '');

    const attention = tests.filter((t) => t.outcome === 'failed' || t.outcome === 'flaky');
    const attentionHtml = attention.length
        ? `<section class="attention"><h2>Needs attention <span>${attention.length}</span></h2><ul class="alist">${attention.map((t) => {
            const d = describeSpec(t.file);
            return `<li><span class="st ${t.outcome}">${icon[t.outcome]}</span><div><b>${esc(d.tc)}${d.flow ? ` ${esc(d.flow)}` : ''}</b> · ${bchip(t)}${esc(t.title)}${t.outcome === 'flaky' ? ' <span class="retry">passed on a retry</span>' : ''}${t.errors[0] ? `<pre class="err">${esc(t.errors[0].split('\n').slice(0, 6).join('\n'))}</pre>` : ''}</div></li>`;
        }).join('')}</ul></section>`
        : `<section class="allgood"><div class="ag-head"><span class="big">✓</span><div><b>No failures and no flaky tests</b><br><span class="muted">Every test that ran passed on its first attempt.</span></div></div>
<ul class="areas">${[['Pages', pages], ['End-to-end flows', flows]].filter(([, l]) => l.length).map(([name, l]) => {
            const list = /** @type {Array<[string, TestRow[]]>} */ (l);
            const all = list.flatMap(([, r]) => r); const ok = all.filter((t) => t.outcome === 'passed' || t.outcome === 'flaky').length;
            const time = all.reduce((a, t) => a + t.durationMs, 0);
            return `<li><span class="a-name">${esc(String(name))}</span><span class="a-bar"><i style="width:${all.length ? Math.round((ok / all.length) * 100) : 0}%"></i></span><span class="a-num"><b>${ok}</b>/${all.length}</span><span class="a-dur">${fmt(time)}</span></li>`;
        }).join('')}</ul>
<p class="muted small">Test time adds up per test; the run itself took ${esc(fmt(model.durationMs))} with ${esc(String(model.workers))} workers in parallel.</p></section>`;

    const slow = tests.filter((t) => t.outcome !== 'skipped').sort((a, b) => b.durationMs - a.durationMs).slice(0, 8);
    const slowMax = slow.length ? slow[0].durationMs : 1;
    const slowHtml = slow.map((t) => { const d = describeSpec(t.file); return `<li><span class="sl-name"><b>${esc(d.tc)}${d.flow ? ` ${esc(d.flow)}` : ''}</b> ${bchip(t)}${esc(t.title)}</span><span class="sl-bar"><i style="width:${Math.round((t.durationMs / slowMax) * 100)}%"></i></span><span class="sl-dur">${fmt(t.durationMs)}</span></li>`; }).join('');

    const R = 52; const C = 2 * Math.PI * R;
    const ring = (/** @type {number} */ part, /** @type {string} */ cls, /** @type {number} */ offset) => (part ? `<circle class="${cls}" cx="60" cy="60" r="${R}" stroke-dasharray="${(part / total) * C} ${C}" stroke-dashoffset="${-offset * C / total}"/>` : '');
    const started = model.startedAt ? new Date(model.startedAt) : null;
    const when = started ? started.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Run Summary</title>
<style>
:root{--bg:#f4f5f8;--card:#fff;--text:#1b2130;--muted:#626c7d;--line:#e3e7ee;--soft:#f0f2f6;--brand:#8c1d40;--brand2:#ffc627;
--ok:#16803a;--okbg:#ddf4e5;--bad:#c4321f;--badbg:#fde4e0;--flk:#b26a00;--flkbg:#fdf0d6;--skp:#7d8796;--skpbg:#eceff3;--shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08)}
@media (prefers-color-scheme:dark){:root{--bg:#0f1217;--card:#171b22;--text:#e7eaf0;--muted:#98a2b3;--line:#262c36;--soft:#1d222b;--brand:#e07a99;--brand2:#ffc627;
--ok:#4cc37b;--okbg:#14301f;--bad:#ff7d70;--badbg:#3a1c1a;--flk:#f2b34b;--flkbg:#3a2c12;--skp:#8b95a5;--skpbg:#232933;--shadow:none}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif}
header{background:linear-gradient(120deg,#5c0f2a,#8c1d40 55%,#a3264f);color:#fff;padding:28px 16px 84px}
.wrap{max-width:1120px;margin:0 auto}
header .eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.8}
header h1{margin:4px 0 6px;font-size:28px;font-weight:700;letter-spacing:-.01em}
header .meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
header .chip{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:3px 11px;font-size:12.5px}
header .verdict{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:15px}
header .verdict i{width:10px;height:10px;border-radius:50%;background:var(--brand2);box-shadow:0 0 0 4px rgba(255,198,39,.25)}
header .verdict.failed i{background:#ff8a7a;box-shadow:0 0 0 4px rgba(255,138,122,.25)}
main{max-width:1120px;margin:-64px auto 0;padding:0 16px 56px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}
.hero{display:grid;grid-template-columns:170px 1fr;gap:24px;align-items:center;padding:22px 24px}
.ring{position:relative;width:150px;height:150px;margin:auto}
.ring svg{width:150px;height:150px;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:13;stroke-linecap:butt}
.ring .track{stroke:var(--soft)}.ring .passed{stroke:var(--ok)}.ring .flaky{stroke:var(--flk)}.ring .failed{stroke:var(--bad)}.ring .skipped{stroke:var(--skp)}
.ring .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring .center b{font-size:30px;font-weight:700;letter-spacing:-.02em}.ring .center span{font-size:12px;color:var(--muted)}
.tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.tile{background:var(--soft);border-radius:10px;padding:12px 14px}
.tile .n{font-size:24px;font-weight:700;letter-spacing:-.02em}.tile .l{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.tile.passed .n{color:var(--ok)}.tile.failed .n{color:var(--bad)}.tile.flaky .n{color:var(--flk)}.tile.skipped .n{color:var(--skp)}
.tile.zero .n{color:var(--muted)}
.dist{display:flex;height:8px;border-radius:99px;overflow:hidden;margin-top:14px;background:var(--soft)}
.dist i{display:block}.dist .passed,.sbar .passed{background:var(--ok)}.dist .failed,.sbar .failed{background:var(--bad)}.dist .flaky,.sbar .flaky{background:var(--flk)}.dist .skipped,.sbar .skipped{background:var(--skp)}
.row2{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-top:16px}
.attention,.allgood,.slow{padding:18px 20px}
h2{font-size:15px;margin:0 0 12px;font-weight:650}h2 span{color:var(--muted);font-weight:500;font-size:13px;margin-left:6px}
.muted{color:var(--muted)}.small{font-size:12px;margin:12px 0 0}
.ag-head{display:flex;gap:16px;align-items:center;margin-bottom:16px}
.areas{list-style:none;margin:0;padding:0}.areas li{display:grid;grid-template-columns:130px 1fr 64px 84px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
.a-name{font-weight:600}.a-bar{height:8px;background:var(--soft);border-radius:9px;overflow:hidden}.a-bar i{display:block;height:100%;background:var(--ok)}
.a-num{text-align:right;font-variant-numeric:tabular-nums}.a-num b{color:var(--ok)}.a-dur{text-align:right;color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
.allgood .big{width:46px;height:46px;border-radius:50%;background:var(--okbg);color:var(--ok);display:grid;place-items:center;font-size:24px;font-weight:700;flex:none}
.alist{list-style:none;margin:0;padding:0}.alist li{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--line)}.alist li:first-child{border-top:0}
.slow ul{list-style:none;margin:0;padding:0}.slow li{display:grid;grid-template-columns:1fr 90px 64px;gap:10px;align-items:center;padding:5px 0;font-size:13px}
.sl-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sl-name b{color:var(--brand)}
.sl-bar{height:6px;background:var(--soft);border-radius:9px;overflow:hidden}.sl-bar i{display:block;height:100%;background:var(--brand);opacity:.75}
.sl-dur{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}
.toolbar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 0;margin-top:22px;background:var(--bg)}
.filters{display:flex;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:3px}
.filters button{border:0;background:none;color:var(--muted);font:inherit;font-weight:600;font-size:13px;padding:6px 12px;border-radius:7px;cursor:pointer}
.filters button[aria-pressed="true"]{background:var(--soft);color:var(--text)}
.filters button span{margin-left:6px;font-weight:500;opacity:.8}
.toolbar input{flex:1 1 220px;min-width:0;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit}
.toolbar .tbtn{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:10px;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}
.group{margin-top:18px}.group h2{font-size:17px;margin:6px 2px 10px}
.spec{background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:8px;box-shadow:var(--shadow);overflow:hidden}
.spec.failed{border-left:4px solid var(--bad)}.spec.flaky{border-left:4px solid var(--flk)}.spec.passed{border-left:4px solid var(--ok)}.spec.skipped{border-left:4px solid var(--skp)}
.spec summary{display:grid;grid-template-columns:70px minmax(0,1fr) 120px 62px 78px 14px;gap:14px;align-items:center;padding:12px 16px;cursor:pointer;list-style:none}
.spec summary::-webkit-details-marker{display:none}
.badge{display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--soft);border-radius:9px;padding:5px 4px;font-weight:700;font-size:12.5px;color:var(--brand);line-height:1.15}
.badge small{font-size:11px;color:var(--muted);font-weight:600}
.sname{min-width:0}.sname b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sname small{display:block;color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sbar{display:flex;height:7px;border-radius:9px;overflow:hidden;background:var(--soft)}.sbar i{display:block}
.scount{text-align:right;font-variant-numeric:tabular-nums}.scount b{color:var(--ok)}.spec.failed .scount b{color:var(--bad)}
.sdur{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums;font-size:13px}
.chev{color:var(--muted);transition:transform .15s;font-size:18px}.spec[open] .chev{transform:rotate(90deg)}
.spec ul{list-style:none;margin:0;padding:4px 16px 10px;border-top:1px solid var(--line)}
.test{display:grid;grid-template-columns:24px minmax(0,1fr) 120px;gap:12px;align-items:start;padding:9px 0;border-bottom:1px dashed var(--line)}
.test:last-child{border-bottom:0}
.st{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;flex:none}
.st.passed{background:var(--okbg);color:var(--ok)}.st.failed{background:var(--badbg);color:var(--bad)}.st.flaky{background:var(--flkbg);color:var(--flk)}.st.skipped{background:var(--skpbg);color:var(--skp)}
.tname{overflow-wrap:anywhere}.grp{display:block;color:var(--muted);font-size:12px}
.bchip{display:inline-block;font-size:11px;font-weight:700;color:var(--brand);background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:0 6px;margin-right:6px;vertical-align:1px}
.bybrowser{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.bb{font-size:12.5px;background:var(--okbg);color:var(--ok);border-radius:999px;padding:3px 11px}.bb b{font-weight:700}.bb.bad{background:var(--badbg);color:var(--bad)}
.toolbar select{padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit}
.retry{font-size:11px;font-weight:700;color:var(--flk);background:var(--flkbg);border-radius:6px;padding:1px 6px;margin-left:4px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.tag{font-size:12px;background:var(--soft);border-radius:6px;padding:2px 8px;color:var(--muted);overflow-wrap:anywhere}.tag b{color:var(--text);font-weight:600}
.err{margin:8px 0 0;padding:10px 12px;background:var(--badbg);color:var(--text);border-radius:8px;font:12px/1.45 Consolas,"Cascadia Mono",monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto}
.shots{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.shot img{height:110px;border:1px solid var(--line);border-radius:6px;display:block}
.tdur{display:flex;flex-direction:column;align-items:flex-end;gap:6px;color:var(--muted);font-size:12.5px;font-variant-numeric:tabular-nums;padding-top:2px}
.tdur .trk{display:block;width:100%;height:4px;border-radius:9px;background:var(--soft);overflow:hidden}
.tdur .trk i{display:block;height:100%;border-radius:9px;background:var(--brand);opacity:.6}
.dgroup{padding:12px 0 4px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--brand);border-bottom:1px solid var(--line)}
.dgroup:first-child{padding-top:8px}
footer{color:var(--muted);font-size:12px;margin-top:26px;text-align:center}
[hidden]{display:none!important}
@media (max-width:860px){.tiles{grid-template-columns:repeat(3,1fr)}.row2{grid-template-columns:1fr}.hero{grid-template-columns:1fr}
.spec summary{grid-template-columns:58px minmax(0,1fr) 56px 14px}.sbar,.sdur{display:none}.test{grid-template-columns:24px minmax(0,1fr)}.tdur{grid-column:2;align-items:flex-start;flex-direction:row}.tdur .trk{display:none}
.areas li{grid-template-columns:1fr 60px 70px}.a-bar{display:none}}
</style></head>
<body>
<header><div class="wrap">
<div class="eyebrow">ASU Undergraduate Application · Automated tests</div>
<h1>Test Run Summary</h1>
<div class="verdict ${verdict}"><i></i>${esc(verdictText)}</div>
<div class="meta">${when ? `<span class="chip">${esc(when)}</span>` : ''}<span class="chip">Duration ${esc(fmt(model.durationMs))}</span><span class="chip">${esc(model.browser)}</span><span class="chip">Workers ${esc(String(model.workers))}</span><span class="chip">Retries ${esc(String(model.retries))}</span>${model.baseURL ? `<span class="chip">${esc(model.baseURL)}</span>` : ''}</div>
</div></header>
<main>
<div class="card hero">
<div class="ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="${R}"/>${ring(passed, 'passed', 0)}${ring(flaky, 'flaky', passed)}${ring(failed, 'failed', passed + flaky)}${ring(skipped, 'skipped', passed + flaky + failed)}</svg>
<div class="center"><b>${rate}%</b><span>pass rate</span></div></div>
<div><div class="tiles">
<div class="tile"><div class="n">${total}</div><div class="l">Tests</div></div>
<div class="tile passed${passed ? '' : ' zero'}"><div class="n">${passed}</div><div class="l">Passed</div></div>
<div class="tile failed${failed ? '' : ' zero'}"><div class="n">${failed}</div><div class="l">Failed</div></div>
<div class="tile flaky${flaky ? '' : ' zero'}"><div class="n">${flaky}</div><div class="l">Flaky</div></div>
<div class="tile skipped${skipped ? '' : ' zero'}"><div class="n">${skipped}</div><div class="l">Skipped</div></div>
<div class="tile"><div class="n">${bySpec.size}</div><div class="l">Spec files</div></div>
</div>
<div class="dist">${(/** @type {Outcome[]} */ (['passed', 'flaky', 'failed', 'skipped'])).filter((o) => count(o)).map((o) => `<i class="${o}" style="flex:${count(o)}" title="${o}: ${count(o)}"></i>`).join('')}</div>
${multi ? `<div class="bybrowser">${projects.map((p) => { const rows = tests.filter((t) => t.project === p); const ok = rows.filter((t) => t.outcome === 'passed' || t.outcome === 'flaky').length; const bad = rows.filter((t) => t.outcome === 'failed').length; return `<span class="bb${bad ? ' bad' : ''}"><b>${esc(p)}</b> ${ok}/${rows.length}${bad ? ` · ${bad} failed` : ''}</span>`; }).join('')}</div>` : ''}
</div></div>
<div class="row2"><div class="card">${attentionHtml}</div><div class="card slow"><h2>Slowest tests</h2><ul>${slowHtml}</ul></div></div>
<div class="toolbar" role="toolbar">
<div class="filters">${[['all', 'All', total], ['passed', 'Passed', passed], ['failed', 'Failed', failed], ['flaky', 'Flaky', flaky], ['skipped', 'Skipped', skipped]].map(([k, l, n]) => `<button type="button" data-f="${k}" aria-pressed="${k === 'all'}">${l}<span>${n}</span></button>`).join('')}</div>
${multi ? `<select id="pb" aria-label="Browser"><option value="">All browsers</option>${projects.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select>` : ''}
<input id="q" type="search" placeholder="Search tests, specs or notes (e.g. Kaplan, F7, Review)" aria-label="Search tests">
<button class="tbtn" type="button" id="ex">Expand all</button><button class="tbtn" type="button" id="co">Collapse all</button>
</div>
${section('Pages', pages)}
${section('End-to-end flows', flows)}
<footer>${esc(model.source)} · Generated ${esc(new Date().toLocaleString('en-GB'))}</footer>
</main>
<script>
(function(){
  var f='all', q=document.getElementById('q'), pb=document.getElementById('pb');
  function apply(){
    var v=q.value.trim().toLowerCase();
    document.querySelectorAll('.spec').forEach(function(s){
      var any=false;
      s.querySelectorAll('.test').forEach(function(t){var hit=(f==='all'||t.dataset.outcome===f)&&(!v||t.dataset.text.indexOf(v)>=0)&&(!pb||!pb.value||t.dataset.project===pb.value);t.hidden=!hit;any=any||hit;});
      s.hidden=!any; if(v||f!=='all'||(pb&&pb.value)){s.open=any;}
    });
    document.querySelectorAll('.group').forEach(function(g){g.hidden=!g.querySelector('.spec:not([hidden])');});
  }
  document.querySelectorAll('.filters button').forEach(function(b){b.addEventListener('click',function(){f=b.dataset.f;document.querySelectorAll('.filters button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});apply();});});
  q.addEventListener('input',apply); if(pb){pb.addEventListener('change',apply);}
  document.getElementById('ex').onclick=function(){document.querySelectorAll('.spec:not([hidden])').forEach(function(s){s.open=true;});};
  document.getElementById('co').onclick=function(){document.querySelectorAll('.spec').forEach(function(s){s.open=false;});};
})();
</script>
</body></html>`;
}

/** @typedef {import('@playwright/test/reporter').Reporter} Reporter */

/** @implements {Reporter} */
class TestRunSummaryReporter {
    /** @param {{ outputFolder?: string, fileName?: string }} [options] */
    constructor(options = {}) {
        this.outputFolder = options.outputFolder || 'reports/test-run-summary';
        this.fileName = options.fileName || 'test-run-summary.html';
        /** @type {import('@playwright/test/reporter').FullConfig | undefined} */
        this.config = undefined;
        /** @type {import('@playwright/test/reporter').Suite | undefined} */
        this.suite = undefined;
        /** @type {Map<string, { retries: number, last: import('@playwright/test/reporter').TestResult }>} */
        this.results = new Map();
    }

    /**
     * @param {import('@playwright/test/reporter').FullConfig} config
     * @param {import('@playwright/test/reporter').Suite} suite
     */
    onBegin(config, suite) {
        this.config = config;
        this.suite = suite;
    }

    /**
     * @param {import('@playwright/test/reporter').TestCase} test
     * @param {import('@playwright/test/reporter').TestResult} result
     */
    onTestEnd(test, result) {
        const seen = this.results.get(test.id);
        this.results.set(test.id, { retries: seen ? seen.retries + 1 : 0, last: result });
    }

    /** @param {import('@playwright/test/reporter').FullResult} result */
    async onEnd(result) {
        if (!this.config || !this.suite) return;
        const root = this.config.rootDir;
        const outDir = path.resolve(this.config.configFile ? path.dirname(this.config.configFile) : process.cwd(), this.outputFolder);
        fs.rmSync(outDir, { recursive: true, force: true });
        fs.mkdirSync(outDir, { recursive: true });
        let shot = 0;
        /** @type {TestRow[]} */
        const rows = [];
        for (const test of this.suite.allTests()) {
            const entry = this.results.get(test.id);
            const outcome = test.outcome();
            /** @type {Outcome} */
            const o = !entry || outcome === 'skipped' ? 'skipped' : outcome === 'flaky' ? 'flaky' : outcome === 'unexpected' ? 'failed' : 'passed';
            const last = entry && entry.last;
            const titles = test.titlePath().filter(Boolean);
            // titlePath: [project, file, ...describes, title]
            const describes = titles.slice(2, -1);
            /** @type {Array<{ name: string, src: string }>} */
            const images = [];
            if (last && o === 'failed') {
                for (const a of last.attachments) {
                    if (!a.path || !/^image\//.test(a.contentType) || !fs.existsSync(a.path)) continue;
                    const name = `shot-${++shot}${path.extname(a.path) || '.png'}`;
                    fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
                    fs.copyFileSync(a.path, path.join(outDir, 'data', name));
                    images.push({ name: a.name, src: `data/${name}` });
                }
            }
            const notes = [...test.annotations, ...((last && /** @type {any} */ (last).annotations) || [])]
                .filter((n, i, all) => all.findIndex((m) => m.type === n.type && m.description === n.description) === i)
                .map((n) => ({ type: n.type, description: n.description || '' }));
            rows.push({
                project: titles[0] || '',
                file: path.basename(test.location.file).replace(/\.spec\.[cm]?[jt]s$/, ''),
                title: test.title,
                group: describes.join(' › '),
                line: test.location.line,
                outcome: o,
                durationMs: last ? last.duration : 0,
                retries: entry ? entry.retries : 0,
                errors: last ? last.errors.map((e) => stripAnsi(e.message || e.value || '').trim()).filter(Boolean).map((m) => (m.length > 2000 ? `${m.slice(0, 2000)}…` : m)) : [],
                notes,
                images,
            });
        }
        const project = this.config.projects[0];
        const use = /** @type {{ baseURL?: string, browserName?: string, headless?: boolean }} */ ((project && project.use) || {});
        const projects = [...new Set(this.suite.suites.map((s) => s.title).filter(Boolean))];
        /** @type {RunModel} */
        const model = {
            title: 'Test Run Summary',
            startedAt: result.startTime.toISOString(),
            durationMs: result.duration,
            browser: `${projects.join(', ') || use.browserName || 'browser'}${use.headless === false ? ', headed' : ''}`,
            workers: this.config.workers,
            retries: project ? project.retries : '',
            baseURL: use.baseURL || '',
            source: `Playwright run, ${path.relative(root, outDir) || outDir}`,
            tests: rows,
        };
        fs.writeFileSync(path.join(outDir, this.fileName), renderReport(model));
        fs.writeFileSync(path.join(outDir, 'run-data.json'), JSON.stringify(model, null, 2));
    }

    printsToStdio() {
        return false;
    }
}

TestRunSummaryReporter.renderReport = renderReport;
module.exports = TestRunSummaryReporter;
