// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * "Need help? Contact us." (verified 2026-11-19): opened by the floating Help button on the
 * application steps, and shown inline on the 404 page. A region headed "Need help? Contact us."
 * holds one region per contact, each with an h3 title, phone links (tel:) and email links
 * (mailto:). What it lists depends on the application:
 *
 *   online      ASU Online enrollment team, Admission Services, After hours support, guide
 *   SCAP        the same, with the Starbucks contacts (1-844-ASU-SBUX, scap@asu.edu) once the
 *               Starbucks benefit is saved
 *   in person   Admission Services ("Get support to complete your ASU application."), After hours
 *   ASU Local   ASU Local Support (asulocal.asu.edu/contact), Admission Services, After hours
 *
 * POM rule: every element is declared here; specs use the read-back methods.
 */
class NeedHelpPanel extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.selectors = {
            helpButton: 'role=button[name=/^(Need )?Help$/]',
            region: 'role=region[name="Need help? Contact us."]',
            contactRegion: 'role=region',
            contactTitle: 'role=heading[level=3]',
            phoneLinks: 'a[href^="tel:"]',
            emailLinks: 'a[href^="mailto:"]',
            otherLinks: 'a:not([href^="tel:"]):not([href^="mailto:"])',
            guideText: 'text=/Check our application guide/',
        };
    }

    /**
     * Open the panel with the floating Help button.
     * @returns {Promise<void>}
     */
    async open() {
        const help = this.page.locator(this.selectors.helpButton).first();
        await help.waitFor({ state: 'visible', timeout: this.navigationTimeout });
        await help.click();
        await expect(this.page.locator(this.selectors.region).first()).toBeVisible({ timeout: this.assertionTimeout });
    }

    /**
     * Close the panel (Escape).
     * @returns {Promise<void>}
     */
    async close() {
        await this.page.keyboard.press('Escape');
    }

    /**
     * The contact blocks the panel lists, in order.
     * @returns {Promise<Array<{ title: string, phones: string[], emails: string[], links: string[], text: string }>>}
     */
    async getContacts() {
        const region = this.page.locator(this.selectors.region).filter({ visible: true }).first();
        await region.waitFor({ state: 'visible', timeout: this.assertionTimeout });
        const blocks = region.locator(this.selectors.contactRegion);
        const out = [];
        for (let i = 0; i < await blocks.count(); i++) {
            const block = blocks.nth(i);
            const texts = async (/** @type {string} */ sel) => (await block.locator(sel).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
            out.push({
                title: (await block.locator(this.selectors.contactTitle).first().innerText()).trim(),
                phones: await texts(this.selectors.phoneLinks),
                emails: await texts(this.selectors.emailLinks),
                links: await texts(this.selectors.otherLinks),
                text: (await block.innerText()).replace(/\s+/g, ' ').trim(),
            });
        }
        return out;
    }

    /**
     * Whether the panel ends with "Check our application guide ..." (online and SCAP).
     * @returns {Promise<boolean>}
     */
    async isApplicationGuideShown() {
        return (await this.page.locator(this.selectors.region).filter({ visible: true }).first()
            .locator('xpath=..').locator(this.selectors.guideText).filter({ visible: true }).count()) > 0;
    }
}

module.exports = NeedHelpPanel;
