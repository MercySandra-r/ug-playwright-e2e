# Email verification via the Gmail API

The QA app no longer hosts its own sign-up. Clicking **Sign in** redirects to ASU's
central IdP (`login.asu.edu`, OAuth `client_id=adms-nonprod`), which enforces a real
email-verification step. Throwaway `@example.com` addresses can't receive that mail,
so automated sign-up is blocked.

This setup gives the tests a real inbox they can read programmatically: sign up with a
unique `base+<timestamp>@gmail.com` address, pull the verification code/link out of the
email with the Gmail API, complete verification, and land back on the app authenticated.

## Pieces added

| File | Role |
| --- | --- |
| `utils/integrations/gmailUtils.js` | Read-only Gmail client; `waitForVerificationEmail()` polls for the mail and extracts a code **and** any link. |
| `pages/AsuIdpPage.js` | Page object for `login.asu.edu` sign-up / sign-in / verification. |
| `utils/authHelper.js` | `signUpVerifiedAccount(page)`, `signInExistingAccount(page, email, pw)`. Both start from the app's **Sign in** button. |
| `utils/emailSequence.js` | Persistent sign-up address sequence: `base+asuqa0001@gmail.com`, `0002`, ... stored in `state/email-sequence.json`. |

## Sign-up addresses (sequence)

Each sign-up takes the next number from `state/email-sequence.json` (gitignored), so runs
never reuse an address. Before using one, the helper also checks the Gmail inbox and skips
any address that has ever received mail. If the IdP still answers "already exists", it moves
to the next number (up to 3 attempts). Optional env: `GMAIL_SEQUENCE_PREFIX` (default
`asuqa`), `GMAIL_SEQUENCE_START` (first number when the state file doesn't exist yet).

## "Session invalid, please try again."

The IdP shows this when the sign-up form is opened directly at `login.asu.edu/signup`
without the app starting the OAuth hand-off. Always enter through the app
(`AsuIdpPage.startFromApp()`), which `authHelper` does.
| `tests/TC_02_EmailVerifiedSignup.spec.js` | Reference test; skipped unless `GMAIL_TEST_ADDRESS` is set. |

## One-time setup

1. **Pick a Gmail inbox** for QA (a dedicated account, not a personal one). Plus-tag
   addressing means `you+anything@gmail.com` all lands in `you@gmail.com`, giving a
   fresh address per run from one inbox.
2. **Create OAuth credentials** in Google Cloud Console:
   - New project → enable the **Gmail API**.
   - Create an **OAuth client ID** of type **Desktop app** → download it and save it as `credentials/credentials.json` (the `credentials/` folder is git-ignored)
     into `playwright/` (same pattern the Drive util already uses).
   - On the OAuth consent screen, add that Gmail address as a **test user** (or publish).
3. **Configure `.env`** (see `.env.example`):
   ```
   GMAIL_TEST_ADDRESS=you@gmail.com
   GMAIL_CREDENTIALS_PATH=credentials/credentials.json
   GMAIL_TOKEN_PATH=credentials/gmail-token.json
   ```
4. **First authorized run** opens a browser consent screen once and caches the token to
   `gmail-token.json`. Run the reference test locally (headed) to trigger it:
   ```
   npx playwright test tests/TC_02_EmailVerifiedSignup.spec.js --project=chromium --headed
   ```

## Using it in a flow spec

```js
const { signUpVerifiedAccount } = require('../utils/authHelper');

const { email, password } = await signUpVerifiedAccount(page);
// page is now on apply-qa.apps.asu.edu, authenticated — continue the wizard.
```

For the per-page suites that just need *a* logged-in session, prefer a persistent
pre-verified account via `signInExistingAccount(page, process.env.TEST_EMAIL, process.env.TEST_PASSWORD)`,
and consider saving `storageState` once so every spec starts authenticated.

## Confirmed behaviour (first live run, 2026-11-10)

- ASU QA **does** deliver to external Gmail. The mail comes from `noreply@asu.edu` with
  subject **"Your Verification Code"** and a **6-digit code** (no link). `authHelper`
  filters on that sender and subject, and `gmailUtils` matches exactly 6 digits.
- `submitVerificationCode()` entered the code and the OAuth callback returned to the app
  authenticated. TC_02 passed headed in about 32s.

## Things to watch

- **Cloudflare bot detection.** `login.asu.edu/signup` loads a Cloudflare challenge
  layer. Headless Playwright may be challenged. If sign-up stalls there, run headed, or
  ask the app team to allow-list the test runner's IP in non-prod.

## Secrets

`credentials.json`, `gmail-token.json` and `.env` are secrets and are now covered by
`playwright/.gitignore`. **`playwright/.env` is already committed in git history** — rotate
anything sensitive in it and remove it from tracking (`git rm --cached playwright/.env`)
as a follow-up.
