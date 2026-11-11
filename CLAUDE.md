# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Playwright (JavaScript, CommonJS) end-to-end test suite for ASU's undergraduate application site (`https://apply-qa.apps.asu.edu`), migrated from a Selenium/Java framework. `Selenium_to_Playwright_Migration_Plan.md` and the Jira CSV at the root describe the migration plan. `playwright/MigrationMapping.md` and `playwright/MigrationSummary.md` are status notes from July 2025 and are out of date: the filenames they list don't match the current `tests/` names.

All real work happens in `playwright/`, which has its own `package.json` and `node_modules`. The root `package.json` (xlsx, faker) and `debug-dashboard-fields.js` are leftovers. `seed.spec.ts` at the root is the seed file for the Playwright MCP test generator.

## Commands

Run everything from `playwright/`:

```bash
cd playwright
npm install
npx playwright install                     # browsers
npx playwright test --project=chromium     # full suite on one browser (preferred)
npx playwright test tests/TC_04_LogInTest.spec.js --project=chromium   # single file
npx playwright test -g "test title substring" --project=chromium       # single test by title
npx playwright test --headed / --debug / --ui
npx playwright show-report reports/html-report
npx tsc --noEmit -p .                      # type-check (checkJs, strict); must stay at 0 errors
```

- `package.json` has shortcuts for the same commands: `npm run test:chrome`, `test:headed`, `test:debug`, `test:ui`, `report`.
- Quote spec paths when running one file: some filenames contain spaces (for example TC_20).
- Type-check: `tsconfig.json` (the only config; there is no `jsconfig.json`) checks pages, utils and the maintained specs, and excludes `node_modules`, the generated `reports/`, `test-results/` and `artifacts/`, and the flow specs TC_17–TC_27 (they call page-object methods that no longer exist and need rebuilding). The run is clean (0 errors); keep it that way.
- Without `--project`, `npx playwright test` runs every configured project (chromium, firefox, webkit, msedge, mobile-chrome, mobile-safari, chrome-beta). Tests are normally run on chromium only.
- `npm run lint` calls `eslint .`, but the repo has no ESLint config, so it won't run as-is.
- Config: `playwright.config.js` sets a 60s test timeout, a 10s expect timeout, 1 retry locally (2 retries and 1 worker on CI), `fullyParallel`, `baseURL` from `BASE_URL` (falls back to the QA site), global setup and teardown in `utils/`, HTML and JSON reporters under `reports/`, and artifacts in `test-results/`.

## Environment

- `playwright/.env` is loaded by `dotenv` (see `.env.example`). Main variables: `NODE_ENV` (local|qa|staging|prod, used by `config/env.config.js`), `BASE_URL`, `DEFAULT_USERNAME`/`DEFAULT_PASSWORD`, `SAVE_AUTH_STATE`, and `TEST_EMAIL`/`TEST_PASSWORD`. Tests TC_04 and TC_07–TC_15 use `TEST_EMAIL`/`TEST_PASSWORD` to log in to an existing account, with hardcoded fallbacks. `.env.example` doesn't list `SAVE_AUTH_STATE`, `TEST_EMAIL` or `TEST_PASSWORD`.
- `utils/globalSetup.js` logs in and writes `state/authenticated.json` only when `SAVE_AUTH_STATE=true`. Current specs don't use that storage state.
- Some tests call `test.skip` under `process.env.CI` or when their data files are missing.

## Architecture

**Page Object Model.** Each file in `pages/` holds a class that extends `pages/BasePage.js` and is exported with `module.exports = ClassName`. The constructor takes a Playwright `page`. `BasePage` adds logging (`utils/testLogger`), a base URL from `utils/configLoader`, timeouts from `utils/timeoutManager`, and shared helpers for navigation, waits and assertions. The page objects follow the application wizard in order:

Landing (create account) → VerifyEmail → Login → PreAppDashboard → MyInformation → MyASUProgram → MySchools → MyHighSchoolGrades → AZResidency → Review → Preview → PostAppSubmissionDashboard. ResetPassword, Profile, SHIM and FooterLinks are side pages.

**Tests** (`tests/TC_NN_*.spec.js`) come in two kinds:
- **TC_01–TC_16** each cover one page or feature. They import `test`/`expect` straight from `@playwright/test`. The `utils/baseTest.js` fixture exists but the specs don't use it.
- **TC_17–TC_27** are end-to-end applicant flows (F1–F11). They predate the site changes and need rebuilding. **TC_29_F12** (Nursing - RN/BSN with backup program) is the first flow written in the current strict-POM style. Each filename encodes the scenario: age band, US/non-US, residency, military status, graduation timing, fee waiver, and so on. Every flow keeps its data in a `testData` object at the top of the file and walks through the whole wizard with the page objects.

Patterns the specs share:
- Most suites use `test.describe.serial` with long timeouts set by `test.describe.configure({ timeout: 180000 })`, because the steps depend on each other.
- New users are created on every run: a unique email from `faker` or `Date.now()`, then the account-creation form on the Landing page. Email verification isn't completed. Tests wait for the `/verify-email` URL, then log in directly.
- The flow specs use relative `page.goto('/dashboard')`, which resolves against `baseURL`. TC_04, TC_05 and TC_06 hardcode `https://apply-qa.apps.asu.edu/...` instead. `LandingPage.js` also matches on the QA host when it detects the post-signup redirect. Changing `BASE_URL` won't redirect any of these.
- Rebuilt suites (TC_04–TC_15) follow strict POM: every element is named in its page object's `selectors` or a locator method, and specs assert through page methods and read-backs (for example `readFormValues()`) with no locators of their own. Each suite creates one account in `beforeAll`, and has a `*_TEST_EMAIL` / `*_TEST_PASSWORD` pair to reuse an existing account instead.
- Locators are mostly role-based (`getByRole(..., { name })`), with fallback chains in try/catch blocks because the application UI is unstable.
- Debug files go under `playwright/artifacts/` (git-ignored, see `utils/artifactPaths.js`). Specs and page objects save screenshots with `screenshotPath(name)` into `artifacts/screenshots/`, never into `playwright/` itself. One-off runs that keep their own output use `--output=artifacts/runs/<name>`, because Playwright clears `test-results/` at the start of each run. Old loose screenshots are in `artifacts/screenshots/old/`. `reports/` and `test-results/` are generated and not tracked.

**Utilities** (`utils/`): test data comes from `testDataLoader` (JSON/CSV/Excel from `fixtures/testData/`, which is currently empty), `testDataGenerator` and `dataProvider`. Other helpers handle retries, iframes, file upload, drag-and-drop, and visual comparison (pixelmatch/pngjs). `utils/integrations/` holds Excel, Slack and Google Drive clients; its README documents them.

**Type checking.** `tsconfig.json` sets `checkJs` and `strict`, and adds custom declarations from `types/` and `@types/`. Keep JSDoc annotations valid when editing `pages/`, `utils/` and the specs.

## AI test-agent setup

`.vscode/mcp.json` registers the Playwright test MCP server (`npx playwright run-test-mcp-server`). `.github/chatmodes/` defines three agents:
- **planner**: explores the app and writes test plans.
- **generator**: runs the plan steps live in a browser, then writes a single-test spec file with a comment before each step.
- **healer**: debugs failing tests and fixes them.
