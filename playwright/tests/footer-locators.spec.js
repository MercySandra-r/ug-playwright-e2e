const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://apply-qa.apps.asu.edu/');
  const page1 = await context.newPage();
  await page1.goto('https://www.google.com/sorry/index?continue=https://www.google.com/search%3Fq%3Dplaywright%2Bshow%2Breport%26oq%3Dplaywright%2Bshow%2Breport%26gs_lcrp%3DEgZjaHJvbWUyBggAEEUYOdIBCDM2MzBqMGoxqAIAsAIA%26sourceid%3Dchrome%26ie%3DUTF-8%26sei%3DG3h3aPifHKa94-EP_7iuoAE&q=EgRqMyY6GJvw3cMGIjB6HWQoxdGCZ_ybzkyPsH64XWOgctMO7Ffkemf4zW6uqD699icTwnZNDR03gnkxtskyAVJaAUM');
  await page1.locator('iframe[name="a-vzhc3henw5im"]').contentFrame().getByRole('checkbox', { name: 'I\'m not a robot' }).click();
  await page1.close();
  await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();