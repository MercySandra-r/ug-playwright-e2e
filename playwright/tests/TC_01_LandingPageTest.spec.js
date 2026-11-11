// @ts-check
const { test, expect } = require('@playwright/test');
const LandingPage = require('../pages/LandingPage');
const FooterLinksPage = require('../pages/FooterLinksPage');

// The landing page no longer hosts an account-creation form: sign-up moved to ASU's
// IdP (login.asu.edu). Account creation is covered by TC_28_EmailVerifiedSignup.
test.describe('Landing Page Tests', () => {
  /** @type {LandingPage} */
  let landingPage;
  /** @type {FooterLinksPage} */
  let footerLinksPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    footerLinksPage = new FooterLinksPage(page);

    // Navigate to the landing page before each test
    await landingPage.navigateToLandingPage();
  });

  test('Verify footer links', async () => {
    // This test corresponds to verifyFooter() in the original test
    const { FOOTER_LINKS } = FooterLinksPage;
    await footerLinksPage.scrollToFooter();

    // Exactly the expected links, in order, in each group
    expect(await footerLinksPage.getLinkNames()).toEqual({
      utility: FOOTER_LINKS.filter((l) => l.group === 'utility').map((l) => l.name),
      legal: FOOTER_LINKS.filter((l) => l.group === 'legal').map((l) => l.name),
    });

    for (const link of FOOTER_LINKS) {
      await test.step(`${link.name} opens in a new tab`, async () => {
        const shown = await footerLinksPage.readLink(link);
        expect(shown.visible, `${link.name} visible`).toBeTruthy();
        expect(shown.href, `${link.name} href`).toMatch(link.href);
        expect(shown.newTab, `${link.name} opens in a new tab`).toBeTruthy();

        expect(await footerLinksPage.openLink(link), `${link.name} destination`).toMatch(link.lands);
      });
    }
  });

  test('Verify landing page elements and navigation', async ({ page }) => {
    // This test corresponds to verifyLandingPage() in the original test
    await test.step('should validate view application details', async () => {
      await landingPage.validateViewAppDetails();
    });

    await test.step('should validate sign in functionality', async () => {
      await landingPage.validateLoginFunctionality();
    });

    // Choose a random MOL option
    await test.step('should allow selecting a random MOL option', async () => {
      const selectedMOL = await landingPage.chooseRandomMOL();
      expect(selectedMOL).toBeTruthy();
      expect(selectedMOL).toMatch(/In-person|Online/i);
    });
  });

  test('Choose In-person MOL option', async ({ page }) => {
    // This test corresponds to ChooseInperson_MOL() in the original test
    await test.step('should select in-person MOL option', async () => {
      const selectedMOL = await landingPage.chooseInPersonMOL();
      expect(selectedMOL).toBeTruthy();
      // Use case-insensitive check
      expect(selectedMOL.toLowerCase()).toContain('in-person');
    });
  });

  test('Choose Online MOL option', async ({ page }) => {
    // This test corresponds to ChooseOnline_MOL() in the original test
    await test.step('should select online MOL option', async () => {
      const selectedMOL = await landingPage.chooseOnlineMOL();
      expect(selectedMOL).toBeTruthy();
      expect(selectedMOL.toLowerCase()).toContain('online');
    });
  });

  test('Choose random MOL option', async ({ page }) => {
    // This test corresponds to ChooseRandom_MOL() in the original test
    await test.step('should select a random MOL option', async () => {
      const selectedMOL = await landingPage.chooseRandomMOL();
      expect(selectedMOL).toBeTruthy();
      expect(selectedMOL).toMatch(/In-person|Online/i);
    });
  });
});
