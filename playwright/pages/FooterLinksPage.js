// @ts-check
const BasePage = require('./BasePage');

/**
 * The global ASU footer, as shown on the landing page (verified live 2026-11-11).
 * Two link groups, every link external and opening in a new tab (target=_blank):
 *  - utility nav: Maps and Locations, Jobs, Directory, Contact ASU, My ASU
 *  - "University Legal and Compliance": Copyright and Trademark, Accessibility, Privacy,
 *    Terms of Use, Emergency
 *
 * APP QUIRK: Contact ASU's href starts with a space (" https://www.asu.edu/about/contact").
 * Browsers trim it, so read hrefs trimmed.
 *
 * POM rule for this page: every element is declared in `this.selectors` or `link()`;
 * specs use the methods below, never their own locators.
 */

/** @typedef {'utility'|'legal'} FooterGroup */
/**
 * @typedef {{ name: string, group: FooterGroup, href: RegExp, lands: RegExp }} FooterLink
 *   href: the link's own target; lands: where the new tab ends up after asu.edu's redirects
 */

/** @type {FooterLink[]} expected links, in display order (destinations verified live 2026-11-11) */
const FOOTER_LINKS = [
    { name: 'Maps and Locations', group: 'utility', href: /asu\.edu\/map\/interactive/i, lands: /asu\.edu\/about\/map/i },
    { name: 'Jobs', group: 'utility', href: /asu\.edu\/asujobs/i, lands: /cfo\.asu\.edu\/applicant/i },
    { name: 'Directory', group: 'utility', href: /isearch\.asu\.edu\/asu-people/i, lands: /search\.asu\.edu/i },
    { name: 'Contact ASU', group: 'utility', href: /asu\.edu\/about\/contact/i, lands: /asu\.edu\/about\/contact/i },
    // Signed-out visitors are sent to ASU web login first.
    { name: 'My ASU', group: 'utility', href: /my\.asu\.edu/i, lands: /my\.asu\.edu|weblogin\.asu\.edu/i },
    { name: 'Copyright and Trademark', group: 'legal', href: /asu\.edu\/copyright/i, lands: /asu\.edu\/about\/copyright-trademark/i },
    { name: 'Accessibility', group: 'legal', href: /asu\.edu\/accessibility/i, lands: /accessibility\.asu\.edu/i },
    { name: 'Privacy', group: 'legal', href: /asu\.edu\/privacy/i, lands: /asu\.edu\/about\/privacy/i },
    { name: 'Terms of Use', group: 'legal', href: /asu\.edu\/tou/i, lands: /asu\.edu\/about\/terms-of-use/i },
    { name: 'Emergency', group: 'legal', href: /asu\.edu\/emergency/i, lands: /cfo\.asu\.edu\/emergency/i },
];

class FooterLinksPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page, 'FooterLinksPage');
        this.selectors = {
            footer: 'footer',
            utilityNav: 'footer nav:not([aria-label])',
            legalNav: 'footer nav[aria-label="University Legal and Compliance"]',
        };
    }

    /**
     * A footer link by its text, inside its group.
     * @param {FooterLink} link
     * @returns {import('@playwright/test').Locator}
     */
    link(link) {
        const nav = link.group === 'legal' ? this.selectors.legalNav : this.selectors.utilityNav;
        return this.page.locator(nav).getByRole('link', { name: link.name, exact: true });
    }

    /** @returns {Promise<void>} scroll the footer into view */
    async scrollToFooter() {
        await this.page.locator(this.selectors.footer).first().scrollIntoViewIfNeeded();
    }

    /**
     * Link texts shown in each group, in order.
     * @returns {Promise<Record<FooterGroup, string[]>>}
     */
    async getLinkNames() {
        const names = (/** @type {string} */ nav) => this.page.locator(nav).getByRole('link').allInnerTexts()
            .then((ts) => ts.map((t) => t.trim()));
        return { utility: await names(this.selectors.utilityNav), legal: await names(this.selectors.legalNav) };
    }

    /**
     * What a link looks like before it's clicked.
     * @param {FooterLink} link
     * @returns {Promise<{ visible: boolean, href: string, newTab: boolean }>}
     */
    async readLink(link) {
        const el = this.link(link);
        return {
            visible: await el.isVisible(),
            href: ((await el.getAttribute('href')) || '').trim(),
            newTab: (await el.getAttribute('target')) === '_blank',
        };
    }

    /**
     * Whether the footer links can be clicked through to their new tabs in this browser.
     * Not in WebKit: on Windows its page process crashes after about ten new tabs (whatever
     * they load), taking the app's tab with it. There the links' address and target are
     * checked (readLink) without opening them.
     * @returns {boolean}
     */
    canOpenLinks() {
        return this.page.context().browser()?.browserType().name() !== 'webkit';
    }

    /**
     * Click a link and return the URL its new tab settles on (then close the tab).
     * Waits for the expected destination (`lands`), not the external page's full load.
     * @param {FooterLink} link
     * @returns {Promise<string>}
     */
    async openLink(link) {
        const [tab] = await Promise.all([
            this.page.context().waitForEvent('page', { timeout: this.navigationTimeout }),
            this.link(link).click(),
        ]);
        try {
            await tab.waitForURL(link.lands, { waitUntil: 'commit', timeout: this.navigationTimeout }).catch(() => {});
            return tab.url();
        } finally {
            // A tab whose external page is still loading can be slow to close: stop the load
            // first and don't wait on the close forever.
            await tab.evaluate(() => window.stop()).catch(() => {});
            await Promise.race([tab.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 5000))]);
        }
    }
}

FooterLinksPage.FOOTER_LINKS = FOOTER_LINKS;
module.exports = FooterLinksPage;
