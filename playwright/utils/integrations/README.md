# Integration Utilities

This directory contains utility classes for integrating with various third-party services used in the test automation framework.

## Available Utilities

### 1. Excel Utilities (`excelUtils.js`)
A utility class for reading from and writing to Excel files using the `exceljs` library.

**Features:**
- Read data from Excel files with support for headers
- Write data to Excel files with auto-formatting
- Handle multiple sheets
- Cell-level operations
- Support for large datasets

**Example Usage:**
```javascript
const ExcelUtils = require('./integrations/excelUtils');

async function example() {
  const excel = new ExcelUtils('testdata.xlsx');
  await excel.initialize('Sheet1');
  
  // Read data
  const data = await excel.readData();
  
  // Write data
  await excel.writeData([
    { id: 1, name: 'Test', value: 123 },
    { id: 2, name: 'Example', value: 456 }
  ]);
  
  // Get/set cell values
  await excel.setCellValue(1, 'A', 'Header');
  const value = excel.getCellValue(2, 1);
}
```

### 2. Slack Integration (`slackUtils.js`)
A utility class for sending messages and files to Slack channels.

**Features:**
- Send simple text messages
- Send rich formatted messages with attachments
- Upload files to Slack
- Format and send test execution reports

**Setup:**
1. Create a Slack app at https://api.slack.com/apps
2. Add the `chat:write` and `files:write` OAuth scopes
3. Install the app to your workspace
4. Copy the Bot User OAuth Token (starts with `xoxb-`)

**Example Usage:**
```javascript
const SlackUtils = require('./integrations/slackUtils');

async function example() {
  const slack = new SlackUtils('xoxb-your-token', 'channel-name');
  
  // Send a simple message
  await slack.sendMessage('Hello from Playwright!');
  
  // Send a test report
  await slack.sendTestReport({
    status: 'PASSED',
    passed: 10,
    failed: 2,
    skipped: 1,
    reportUrl: 'http://example.com/report'
  });
  
  // Upload a file
  await slack.uploadFile('test-results.html', 'Test execution results');
}
```

### 3. Google Drive Integration (`googleDriveUtils.js`)
A utility class for interacting with Google Drive to upload and manage files.

**Features:**
- Upload files to Google Drive
- Create folders
- List files with filtering
- Support for service account and OAuth2 authentication

**Setup:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials (OAuth client ID)
5. Download the credentials JSON file as `credentials.json` in your project root

**Example Usage:**
```javascript
const GoogleDriveUtils = require('./integrations/googleDriveUtils');

async function example() {
  const drive = new GoogleDriveUtils({
    credentialsPath: './credentials.json',
    tokenPath: './token.json'
  });
  
  await drive.initialize();
  
  // Upload a file
  const file = await drive.uploadFile('report.html', {
    folderId: 'drive-folder-id',
    properties: { description: 'Test execution report' }
  });
  
  console.log(`File uploaded: ${file.webViewLink}`);
  
  // Create a folder
  const folder = await drive.createFolder('Test Results');
  
  // List files
  const files = await drive.listFiles({
    folderId: folder.id,
    mimeType: 'text/html'
  });
}
```

## Common Setup

### Environment Variables
Some utilities may require environment variables. Create a `.env` file in your project root:

```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_DEFAULT_CHANNEL=test-results

# Google Drive
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

### Dependencies
Make sure to install the required dependencies:

```bash
npm install exceljs @slack/web-api googleapis @google-cloud/local-auth
```

## Testing

Each utility has corresponding test files in the `tests/utils/` directory. To run the tests:

```bash
# Run all utility tests
npx playwright test tests/utils/

# Run specific utility tests
npx playwright test tests/utils/excelUtils.test.js
```

## Error Handling

All utilities include proper error handling and logging. Check the console output for any errors during execution. For production use, make sure to handle errors appropriately in your test scripts.
