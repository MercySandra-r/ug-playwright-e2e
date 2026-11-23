// @ts-check

/**
 * Partner test data for QA (test values, safe to keep in the repository).
 *
 * Starbucks (SCAP): a partner number QA verifies, and the name it belongs to; the applicant's
 * legal name must match it for "Verify partner number" to succeed. Values in .env
 * (STARBUCKS_PARTNER_NUMBER, STARBUCKS_FIRST_NAME, STARBUCKS_LAST_NAME) override these.
 * Used by F14 (TC_27) and the SCAP part of F15 (TC_28).
 */
const STARBUCKS = {
    partnerNumber: process.env.STARBUCKS_PARTNER_NUMBER || '1192786',
    firstName: process.env.STARBUCKS_FIRST_NAME || 'Daniel',
    lastName: process.env.STARBUCKS_LAST_NAME || 'Cortez',
};

module.exports = { STARBUCKS };
