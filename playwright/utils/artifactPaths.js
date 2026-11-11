// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Where ad-hoc debug files go, so they don't pile up in playwright/.
 *
 *   artifacts/screenshots/  screenshots saved by specs and page objects
 *   artifacts/runs/         --output folders of one-off runs (e.g. --output=artifacts/runs/tc12)
 *
 * artifacts/ is git-ignored. Playwright's own outputDir (test-results/) is wiped at the
 * start of every run, so files meant to survive a rerun go here instead.
 */
const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts');
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');

/**
 * Absolute path for a debug screenshot, creating the folder if needed.
 * @param {string} fileName - e.g. `debug-beforeEach-failed-${Date.now()}.png`
 * @returns {string}
 */
function screenshotPath(fileName) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    return path.join(SCREENSHOTS_DIR, fileName);
}

module.exports = { ARTIFACTS_DIR, SCREENSHOTS_DIR, screenshotPath };
