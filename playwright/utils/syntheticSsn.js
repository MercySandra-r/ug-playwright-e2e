// @ts-check

/**
 * A made-up Social Security Number for test applicants, new on every call.
 *
 * It is taken from a range that is never issued, so it cannot be a real person's number:
 * area 900-999 is not used for SSNs, and within it groups 01-49 are not used for the tax
 * IDs that share the 9xx area (ITIN, ATIN). The value is only handed to the form: never
 * log it, store it or put it in a file.
 *
 * Use this for every applicant except the duplicate-application check, which needs the
 * same number each time and takes it from TEST_SSN in .env.
 *
 * @returns {string} 9 digits
 */
function syntheticSsn() {
    const between = (/** @type {number} */ min, /** @type {number} */ max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const area = between(900, 999);
    const group = String(between(1, 49)).padStart(2, '0');
    const serial = String(between(1, 9999)).padStart(4, '0');
    return `${area}${group}${serial}`;
}

module.exports = { syntheticSsn };
