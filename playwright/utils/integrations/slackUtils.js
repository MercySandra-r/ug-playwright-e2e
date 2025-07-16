// @ts-check
const { WebClient } = require('@slack/web-api');
const { logger } = require('../testLogger');

/**
 * SlackUtils - A utility class for interacting with Slack
 */
class SlackUtils {
    /**
     * Create a new SlackUtils instance
     * @param {string} token - Slack bot token (starts with 'xoxb-')
     * @param {string} [defaultChannel] - Default channel to send messages to
     */
    /**
     * @param {string} token - Slack bot token (starts with 'xoxb-')
     * @param {string} [defaultChannel] - Default channel to send messages to
     */
    constructor(token, defaultChannel) {
        if (!token) {
            throw new Error('Slack bot token is required');
        }
        
        this.client = new WebClient(token);
        this.defaultChannel = defaultChannel;
    }

    /**
     * Send a message to a Slack channel
     * @param {string} message - Message to send
     * @param {Object} [options] - Additional options
     * @param {string} [options.channel] - Channel to send message to (overrides default)
     * @param {string} [options.username] - Username to display
     * @param {string} [options.icon_emoji] - Emoji to use as icon (e.g., ':robot_face:')
     * @param {Array<Object>} [options.attachments] - Message attachments
     * @returns {Promise<Object>} Slack API response
     */
    async sendMessage(message, { 
        channel = this.defaultChannel, 
        username = 'Test Bot',
        icon_emoji = ':robot_face:',
        attachments = []
    } = {}) {
        if (!channel) {
            throw new Error('Channel is required');
        }

        try {
            const result = await this.client.chat.postMessage({
                channel,
                text: message,
                username,
                icon_emoji,
                attachments
            });

            logger.info(`Message sent to Slack channel ${channel}`);
            return result;
        } catch (error) {
            logger.error(`Error sending Slack message: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Send a test report to Slack
     * @param {Object} report - Test report data
     * @param {string} report.status - Test execution status (e.g., 'PASSED', 'FAILED')
     * @param {number} report.passed - Number of passed tests
     * @param {number} report.failed - Number of failed tests
     * @param {number} report.skipped - Number of skipped tests
     * @param {string} report.reportUrl - URL to the detailed test report
     * @param {string} [channel] - Channel to send report to (overrides default)
     * @returns {Promise<Object>} Slack API response
     */
    async sendTestReport(report, channel = this.defaultChannel) {
        if (!channel) {
            throw new Error('Channel is required for sending test report');
        }

        const { status, passed, failed, skipped, reportUrl } = report;
        const total = passed + failed + skipped;
        const passPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;

        const message = `*Test Execution ${status}*\n` +
                       `*Environment*: ${process.env.ENV || 'QA'}\n` +
                       `*Total Tests*: ${total}\n` +
                       `*Passed*: ${passed} (${passPercentage}%)\n` +
                       `*Failed*: ${failed}\n` +
                       `*Skipped*: ${skipped}\n` +
                       `*Report*: ${reportUrl || 'Not available'}`;

        // Color for the attachment (green for passed, red for failed, yellow for other statuses)
        let color = '#36a64f'; // green
        if (status === 'FAILED') {
            color = '#ff0000'; // red
        } else if (status !== 'PASSED') {
            color = '#f2c744'; // yellow
        }

        const attachments = [{
            color,
            fields: [
                {
                    title: 'Status',
                    value: status,
                    short: true
                },
                {
                    title: 'Pass Rate',
                    value: `${passPercentage}%`,
                    short: true
                },
                {
                    title: 'Total Tests',
                    value: total.toString(),
                    short: true
                },
                {
                    title: 'Failed',
                    value: failed.toString(),
                    short: true
                }
            ],
            footer: 'Automated Test Report',
            ts: Math.floor(Date.now() / 1000)
        }];

        return this.sendMessage('', {
            channel,
            username: 'Test Automation',
            icon_emoji: ':bar_chart:',
            attachments
        });
    }

    /**
     * Upload a file to Slack
     * @param {string} filePath - Path to the file to upload
     * @param {string} [initialComment] - Initial comment to add to the file
     * @param {string} [channel] - Channel to upload file to (overrides default)
     * @returns {Promise<Object>} Slack API response
     */
    async uploadFile(filePath, initialComment = '', channel = this.defaultChannel) {
        if (!channel) {
            throw new Error('Channel is required for file upload');
        }

        try {
            const result = await this.client.files.upload({
                channels: channel,
                file: require('fs').createReadStream(filePath),
                initial_comment: initialComment,
                filename: require('path').basename(filePath)
            });

            logger.info(`File uploaded to Slack: ${filePath}`);
            return result;
        } catch (error) {
            logger.error(`Error uploading file to Slack: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}

module.exports = SlackUtils;
