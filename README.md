# ASU Undergraduate Application – Automated Tests

End-to-end tests for ASU's undergraduate application site (QA: `https://apply-qa.apps.asu.edu`),
written with [Playwright](https://playwright.dev) in JavaScript. The suite was migrated from an
earlier Selenium/Java framework and rebuilt around the current site.

Everything lives in the `playwright/` folder.

## What is covered

The suite has 254 tests in 24 spec files (`playwright/tests/`), numbered in the order of the
application.

| Spec | Area | Tests |
|---|---|---|
| TC_01 | Landing page and footer links | 5 |
| TC_02 | Email-verified sign-up | 1 |
| TC_03 | Sign-in and forgot password | 11 |
| TC_04 | Pre-application dashboard | 9 |
| TC_05 | My information | 17 |
| TC_06 | My ASU program | 13 |
| TC_07 | My schools (up to ten high schools and ten colleges) | 12 |
| TC_08 | My high school grades | 18 |
| TC_09 | Arizona residency, including 10 applicant scenarios | 44 |
| TC_10 | Profile | 12 |
| TC_11 | Review | 13 |
| TC_12 | Post-submission dashboard ("Next steps") | 12 |
| TC_13 | Preview of the submitted application | 16 |
| TC_14–TC_23 | End-to-end flows F1–F10 | 63 |
| TC_25 | End-to-end flow F12: Nursing RN/BSN with a backup program | 8 |

Flow F11 (visiting student in person) is still to be built and will take TC_24.

The end-to-end flows are defined in [`playwright/docs/E2E_FLOWS.md`](playwright/docs/E2E_FLOWS.md):
each one is a different kind of applicant taken through the whole application and submitted.

| Flow | Applicant |
|---|---|
| F1 | In person, over 24, U.S. citizen, spouse/dependent of a service member, future graduate, OOS, ABOR fee waiver |
| F2 | ASU Local (`/?asulocal=`), under 18, active duty, partner benefits, HiSet, Arizona, fee waived |
| F3 | Tempe, 18–24, permanent resident, veteran, past graduate, OOS, Tempe fee waiver |
| F4 | Online, 18–24, permanent resident, Armed Forces Reserve, Nursing RN/BSN with a backup, HiSet, OOS |
| F5 | Prop 308: in person, DACA, no military status, future graduate of an Arizona high school |
| F6 | Online, 18, non-resident (JN visa), past graduate; grades and residency are not needed |
| F7 | Duplicate application: the SSN of a submitted application entered from Review; the error on Review and My program, cleared by a new SSN |
| F8 | Nondegree, online, U.S. citizen with an Arizona address, future graduate; grades not needed, OOS |
| F9 | Nondegree, in person, J-1 non-resident, past graduate; grades and residency not needed |
| F10 | Visiting student, online, DACA, past graduate; grades not needed, Prop 308 residency |

## Tools

- **Playwright** (`@playwright/test`) on Node.js: test runner, browsers, reports and trace viewer
- **Page Object Model**: one class per page of the application in `playwright/pages/`; specs use
  those classes and contain no locators of their own
- **Gmail API** (`googleapis`): reads the verification and password-reset codes that the ASU
  sign-in service emails to new test accounts
- **TypeScript compiler** in check mode: type-checks the JavaScript (`checkJs`, strict)
- **dotenv**: settings and test accounts from `playwright/.env`
- **ExcelJS**: keeps a spreadsheet of the accounts the suite creates

## Getting started

Requires Node.js 18 or later.

```bash
cd playwright
npm install
npx playwright install
```

Then create `playwright/.env` from `.env.example` and set up the test inbox (next section).

## Test accounts and email verification

Sign-in goes through ASU's sign-in service (`login.asu.edu`), which only accepts verified email
addresses. The suite creates its own accounts:

1. It signs up with a new address on the test inbox, using plus-tags:
   `ugnaaqaautomation+asuqa0001@gmail.com`, `+asuqa0002`, and so on. All of them arrive in the
   one inbox.
2. It reads the verification code from that inbox through the Gmail API and enters it.
3. It carries on into the application with a verified account.

The test inbox is `ugnaaqaautomation@gmail.com`, which is whitelisted on the sign-in service, so
accounts can be created without a limit. To set it up on a new machine:

1. Put the Google OAuth client file in `playwright/credentials/credentials.json`.
2. In `playwright/.env`, set `GMAIL_TEST_ADDRESS=ugnaaqaautomation@gmail.com`.
3. Run any test that signs up (for example TC_02). The first time, a Google consent screen
   opens: sign in as the test inbox and allow read-only access. The access token is saved in
   `playwright/credentials/gmail-token.json`.

Full details: [`playwright/docs/EMAIL_VERIFICATION_SETUP.md`](playwright/docs/EMAIL_VERIFICATION_SETUP.md).

The `credentials/` folder, `.env` and `state/` are git-ignored and must never be committed.

### Reusing accounts

Each page suite can sign in to an existing account parked on its step instead of creating a
new one: set its `*_TEST_EMAIL` / `*_TEST_PASSWORD` pair in `.env` (listed in `.env.example`).
Without them, the suite creates a fresh account.

Tests that save a step use up the account for that step. With a reused account they run on a
second account from a pool of parked accounts (`playwright/state/account-pool.json`), and pass it
on to the next step's suite. When the pool is empty, a fresh account is created.

Every account the suite creates is listed in `playwright/artifacts/accounts/accounts.xlsx`
(email, creation time, application IDs, notes; no passwords).

## Running the tests

From `playwright/`:

```bash
npx playwright test --project=chromium                                 # everything, on Chrome
npx playwright test tests/TC_03_LogInTest.spec.js --project=chromium   # one file
npx playwright test -g "Forgot Password" --project=chromium            # tests whose title matches
npx playwright test --project=chromium --ui                            # interactive UI mode
npx playwright show-report reports/html-report                        # open the last report
npx tsc --noEmit -p .                                                  # type-check (keep at 0 errors)
```

Tests are normally run on Chromium; other browsers are configured in `playwright.config.js` but
not used day to day.

Failed tests are retried up to 3 times. Reports are written to `playwright/reports/`, and
screenshots, traces and videos of failures to `playwright/test-results/`.

### Settings that change what runs

| Setting (`.env`) | Effect |
|---|---|
| `REVIEW_ALLOW_SUBMIT=1` | TC_11's last test really submits the application. Submission cannot be undone. |
| `TEST_SSN` | Used only by the duplicate-application flow F7 (TC_20, `npm run test:dup-identity`): it must be the SSN of the application already submitted in QA. Other U.S. citizen applicants get a made-up number from a range that is never issued. |
| `SUBMITTED_TEST_EMAIL` / `_PASSWORD` | An account with a submitted application for TC_12 and TC_13. Without it they create and submit one. |
| `FORGOT_PASSWORD_TEST_EMAIL` | A spare account for the password-reset test. Without it the test creates one. |

The end-to-end flows (TC_14 onwards) always submit their application, with a new name each run.

## Project layout

```
playwright/
  tests/        specs (TC_NN_*.spec.js)
  pages/        page objects, one per page of the application
  utils/        sign-up, account pool, application journey, Gmail inbox, logging, helpers
  docs/         flow definitions and inbox setup
  credentials/  Google OAuth client and token (git-ignored)
  state/        address counter and account pool (git-ignored)
  artifacts/    accounts spreadsheet, debug screenshots, one-off run output (git-ignored)
```

`utils/applicationJourney.js` takes a new applicant through the steps before the one a suite
tests, with configurable answers (age, citizenship, military status, high school, study mode and
more), so each suite starts on its own page.

## Known application behaviour (QA, November 2026)

- **HiSet is shown as GED** once My schools is continued.
- **Preview loaded by URL or reloaded** shows "No data has been entered" for Legal sex and
  Primary language; the suite opens it through the dashboard link instead.
- **Review shows the country as "USA"** where My schools shows "United States".
- **Re-saving a step that was already saved is ignored**, so answers for step 1 must be set on
  its first save.
- **A duplicate high school is not rejected** on My schools when Save school is clicked.
- **Duplicate application**: Review shows the error and still offers the payment option (expected).
