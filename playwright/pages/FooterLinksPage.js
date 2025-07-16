/**
 * FooterLinksPage Class
 * 
 * This page object handles the validation of footer links on the application pages.
 * It provides methods to verify the presence and functionality of each footer link.
 */

const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');
const ElementAssertUtils = require('../utils/elementAssertUtils');
const TextVerificationUtils = require('../utils/textVerificationUtils');

class FooterLinksPage extends BasePage {
  /**
   * Create a new FooterLinksPage instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    super(page, 'FooterLinksPage');
    this.elementAssert = new ElementAssertUtils(page);
    this.textVerify = new TextVerificationUtils(page);

    // Define selectors for footer links based on actual page structure
    this.selectors = {
      // Main footer container - using more flexible selectors
      footerContainer: 'footer, contentinfo, [role="contentinfo"], footer[role="contentinfo"]',
      
      // Footer navigation sections
      footerPrimaryNav: 'footer nav:first-of-type',
      footerLegalNav: 'nav[aria-label="University Legal and Compliance"]',
      
      // Footer navigation links
      footerNavLinks: 'footer nav:first-of-type a',
      
      // Specific footer links using text content for better reliability
      privacyLink: 'nav[aria-label="University Legal and Compliance"] a:has-text("Privacy")',
      copyrightLink: 'nav[aria-label="University Legal and Compliance"] a:has-text("Copyright and Trademark")',
      termsOfUseLink: 'nav[aria-label="University Legal and Compliance"] a:has-text("Terms of Use")',
      accessibilityLink: 'nav[aria-label="University Legal and Compliance"] a:has-text("Accessibility")',
      contactASULink: 'footer nav:first-of-type a:has-text("Contact ASU")',
      emergencyLink: 'nav[aria-label="University Legal and Compliance"] a:has-text("Emergency")',
      
      // Content verification selectors
      linkPageTitle: 'h1, h2, [role="heading"]',
      linkPageContent: 'main, [role="main"], .page-content, .content',
      
      // University Legal and Compliance section
      legalComplianceSection: 'footer nav[aria-label="University Legal and Compliance"]',
      
      // Footer utility links
      utilityLinks: 'footer nav:not([aria-label]) a',
    };
  }

  /**
   * Validate that all footer links are present and functional
   * @returns {Promise<void>}
   */
  async validateFooterLinks() {
    this.logger.info('Validating footer links');
    
    try {
      // First verify the footer container is present and scroll it into view
      const footer = this.page.locator(this.selectors.footerContainer).first();
      await footer.scrollIntoViewIfNeeded();
      await this.elementAssert.assertVisible(this.selectors.footerContainer);
      
      // List of footer links to validate with their expected URL patterns
      // Some links have specific URL patterns that don't match their display text
      const footerLinks = [
        { 
          selector: this.selectors.privacyLink, 
          name: 'Privacy', 
          expectedUrlPart: 'privacy',
          // Some links might have specific URL patterns
          urlPatterns: ['privacy']
        },
        { 
          selector: this.selectors.copyrightLink, 
          name: 'Copyright', 
          expectedUrlPart: 'copyright',
          urlPatterns: ['copyright']
        },
        { 
          selector: this.selectors.termsOfUseLink, 
          name: 'Terms of Use', 
          expectedUrlPart: 'terms',
          // Add specific URL patterns that should be considered valid for this link
          urlPatterns: ['terms', 'tou']
        },
        { 
          selector: this.selectors.accessibilityLink, 
          name: 'Accessibility', 
          expectedUrlPart: 'accessibility',
          urlPatterns: ['accessibility']
        },
        { 
          selector: this.selectors.contactASULink, 
          name: 'Contact ASU', 
          expectedUrlPart: 'contact',
          urlPatterns: ['contact']
        },
        { 
          selector: this.selectors.emergencyLink, 
          name: 'Emergency', 
          expectedUrlPart: 'emergency',
          urlPatterns: ['emergency']
        }
      ];  
      
      // Validate each footer link
      for (const link of footerLinks) {
        await this.validateFooterLink(link.selector, link.name, link.expectedUrlPart, link.urlPatterns);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error validating footer links: ${errorMessage}`);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Validate an individual footer link
   * @param {string} selector - Link selector
   * @param {string} linkName - Name of the link for logging
   * @param {string} expectedUrlPart - Text expected in the URL after clicking
   * @param {string[]} [urlPatterns] - Array of valid URL patterns to match against
   * @returns {Promise<void>}
   */
  async validateFooterLink(selector, linkName, expectedUrlPart, urlPatterns = [expectedUrlPart]) {
    try {
      this.logger.debug(`Validating footer link: ${linkName}`);
      
      // Check if the link exists and is visible
      const linkElement = this.page.locator(selector).first();
      await linkElement.scrollIntoViewIfNeeded();
      await this.elementAssert.assertVisible(selector);
      
      // Store the current URL for returning later
      const originalUrl = this.page.url();
      this.logger.debug(`Current URL before click: ${originalUrl}`);
      
      // Get navigation timeout from timeout manager
      const { getTimeout } = require('../utils/timeoutManager');
      const navigationTimeout = getTimeout('navigation');
      
      try {
        // Get the href attribute to determine if it's an external link
        const href = await linkElement.getAttribute('href');
        this.logger.debug(`Link href: ${href}`);
        
        if (href && (href.startsWith('http') || href.startsWith('//'))) {
          // For external links, just check the URL pattern without waiting for navigation
          // Convert to lowercase for case-insensitive comparison
          const normalizedHref = href.toLowerCase();
          
          // Check if any of the URL patterns match the href
          const normalizedPatterns = urlPatterns.map(p => p.toLowerCase());
          const urlParts = normalizedHref.split('/').filter(Boolean);
          const lastUrlPart = urlParts.length > 0 ? urlParts[urlParts.length - 1] : '';
          
          // Check if any pattern matches the URL
          const patternMatch = normalizedPatterns.some(pattern => 
            normalizedHref.includes(pattern) || 
            (lastUrlPart && lastUrlPart.includes(pattern))
          );
          
          if (patternMatch) {
            this.logger.debug(`External link validated: ${href} (matched patterns: ${urlPatterns.join(', ')})`);
            return;
          }
          
          // If we get here, the URL didn't match any expected patterns
          throw new Error(
            `External link URL validation failed. ` +
            `Expected URL to contain one of: ${urlPatterns.join(', ')}, ` +
            `but got: ${href}`
          );
        }
        
        // For internal links, handle navigation
        this.logger.debug('Handling internal link navigation...');
        
        // Click the link and wait for navigation with configured timeout
        await Promise.all([
          this.page.waitForNavigation({ 
            timeout: navigationTimeout,
            waitUntil: 'domcontentloaded',
            url: `**/*${expectedUrlPart}*`
          }),
          linkElement.click()
        ]);
        
        // Wait for the page to be fully loaded
        await this.page.waitForLoadState('networkidle');
        
        // Verify we landed on the expected page
        const newUrl = this.page.url();
        this.logger.debug(`New URL after navigation: ${newUrl}`);
        expect(newUrl.toLowerCase()).toContain(expectedUrlPart.toLowerCase());
      } catch (navError) {
        // If navigation fails, check if the URL changed at all
        const currentUrl = this.page.url();
        if (currentUrl !== originalUrl) {
          this.logger.debug(`Navigation occurred to: ${currentUrl}`);
          expect(currentUrl.toLowerCase()).toContain(expectedUrlPart.toLowerCase());
        } else {
          throw navError;
        }
      }
      
      // Verify page content
      try {
        // Wait for page title with configured timeout
        const titleElement = this.page.locator(this.selectors.linkPageTitle).first();
        await titleElement.waitFor({ 
          state: 'visible', 
          timeout: getTimeout('assertion') 
        });
        const pageTitle = await titleElement.textContent();
        this.logger.debug(`${linkName} page title: ${pageTitle}`);
        
        // Verify content exists
        await this.elementAssert.assertPresent(this.selectors.linkPageContent);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Could not verify content for ${linkName} page: ${errorMessage}`);
      }
      
      // Go back to the original page
      await this.page.goBack();
      await this.page.waitForLoadState('networkidle');
      
      // Verify we're back at the original URL
      expect(this.getCurrentUrl()).toBe(originalUrl);
      
      this.logger.debug(`Successfully validated footer link: ${linkName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to validate footer link ${linkName}: ${errorMessage}`);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }
}

module.exports = FooterLinksPage;
