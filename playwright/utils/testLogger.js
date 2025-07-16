/**
 * Test logger utility for consistent logging across tests
 */

/**
 * @typedef {Object} Logger
 * @property {(message: string) => void} info
 * @property {(message: string) => void} warn
 * @property {(message: string, error?: Error) => void} error
 * @property {(message: string) => void} debug
 */

/** @type {Logger} */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  debug: (message) => console.debug(`[DEBUG] ${message}`)
};

module.exports = { logger };
