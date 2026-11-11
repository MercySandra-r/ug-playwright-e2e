// @ts-check
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../testLogger');
const { authenticate } = require('@google-cloud/local-auth');

/**
 * Message of a caught value (catch variables are `unknown`).
 * @param {unknown} e
 * @returns {string}
 */
const messageOf = (e) => (e instanceof Error ? e.message : String(e));

/**
 * GoogleDriveUtils - A utility class for interacting with Google Drive
 */
class GoogleDriveUtils {
    /**
     * Create a new GoogleDriveUtils instance
     * @param {Object} [options] - Configuration options
     * @param {string} [options.credentialsPath] - Path to credentials JSON file
     * @param {string} [options.tokenPath] - Path to save/load auth token
     * @param {string[]} [options.scopes] - OAuth2 scopes
     */
    constructor({
        credentialsPath = path.join(process.cwd(), 'credentials.json'),
        tokenPath = path.join(process.cwd(), 'token.json'),
        scopes = ['https://www.googleapis.com/auth/drive.file']
    } = {}) {
        this.credentialsPath = credentialsPath;
        this.tokenPath = tokenPath;
        this.scopes = scopes;
        /** @type {any} OAuth2 client (shape differs between local-auth and fromJSON) */
        this.auth = null;
        /** @type {import('googleapis').drive_v3.Drive | null} */
        this.drive = null;
    }

    /**
     * Initialize the Google Drive client
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Try to load existing auth
            this.auth = await this.loadSavedAuth();
            
            // If no saved auth, authenticate
            if (!this.auth) {
                this.auth = await this.authenticate();
                await this.saveAuth();
            }
            
            // Create Google Drive client
            this.drive = google.drive({ version: 'v3', auth: this.auth });
            
            logger.info('Google Drive client initialized');
        } catch (error) {
            logger.error(`Error initializing Google Drive: ${messageOf(error)}`);
            throw error;
        }
    }

    /**
     * Load saved authentication if available
     * @returns {Promise<Object|null>} The saved auth or null if not found
     */
    async loadSavedAuth() {
        try {
            const content = await fs.readFile(this.tokenPath, 'utf8');
            const credentials = JSON.parse(content);
            return google.auth.fromJSON(credentials);
        } catch (error) {
            return null;
        }
    }

    /**
     * Authenticate with Google
     * @returns {Promise<Object>} The authenticated client
     */
    async authenticate() {
        try {
            // Try to authenticate using @google-cloud/local-auth
            const auth = await authenticate({
                scopes: this.scopes,
                keyfilePath: this.credentialsPath
            });
            
            return auth;
        } catch (error) {
            // Fall back to manual OAuth2 flow if local-auth fails
            logger.warn('Local auth failed, falling back to OAuth2 flow');
            
            const { client_secret, client_id, redirect_uris } = require(this.credentialsPath).web;
            const oAuth2Client = new google.auth.OAuth2(
                client_id, 
                client_secret, 
                redirect_uris[0]
            );

            // Check if we have a saved token
            try {
                const token = await fs.readFile(this.tokenPath, 'utf8');
                oAuth2Client.setCredentials(JSON.parse(token));
                return oAuth2Client;
            } catch (err) {
                // If no saved token, get new token
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: this.scopes,
                });
                
                logger.info(`Authorize this app by visiting this URL: ${authUrl}`);
                throw new Error('Please authorize the application by visiting the URL above and save the token to token.json');
            }
        }
    }

    /**
     * Save authentication credentials
     * @returns {Promise<void>}
     */
    async saveAuth() {
        if (!this.auth) return;
        
        const payload = JSON.stringify({
            type: 'authorized_user',
            client_id: this.auth._clientId,
            client_secret: this.auth._clientSecret,
            refresh_token: this.auth.credentials.refresh_token
        });
        
        await fs.writeFile(this.tokenPath, payload);
    }

    /**
     * Upload a file to Google Drive
     * @param {string} filePath - Path to the file to upload
     * @param {Object} [options] - Upload options
     * @param {string|null} [options.folderId] - ID of the folder to upload to
     * @param {string|null} [options.mimeType] - MIME type of the file
     * @param {Record<string, any>} [options.properties] - Additional file properties
     * @returns {Promise<Object>} Uploaded file metadata
     */
    async uploadFile(filePath, { 
        folderId = null, 
        mimeType = null,
        properties = {}
    } = {}) {
        if (!this.drive) {
            throw new Error('Google Drive client not initialized. Call initialize() first.');
        }

        try {
            const fileName = path.basename(filePath);
            const fileContent = await fs.readFile(filePath);
            
            /** @type {{ name: string, parents?: string[], [key: string]: any }} */
            const fileMetadata = {
                name: fileName,
                ...properties
            };
            
            if (folderId) {
                fileMetadata.parents = [folderId];
            }
            
            const media = {
                mimeType: mimeType || this.getMimeType(filePath),
                body: fileContent
            };
            
            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, name, webViewLink, webContentLink, mimeType, size',
            });
            
            logger.info(`File uploaded: ${response.data.name} (${response.data.id})`);
            return response.data;
        } catch (error) {
            logger.error(`Error uploading file to Google Drive: ${messageOf(error)}`);
            throw error;
        }
    }

    /**
     * Create a folder in Google Drive
     * @param {string} folderName - Name of the folder to create
     * @param {string|null} [parentFolderId] - ID of the parent folder
     * @returns {Promise<Object>} Created folder metadata
     */
    async createFolder(folderName, parentFolderId = null) {
        if (!this.drive) {
            throw new Error('Google Drive client not initialized. Call initialize() first.');
        }

        try {
            /** @type {{ name: string, mimeType: string, parents?: string[] }} */
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            };
            
            if (parentFolderId) {
                fileMetadata.parents = [parentFolderId];
            }
            
            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                fields: 'id, name, webViewLink',
            });
            
            logger.info(`Folder created: ${response.data.name} (${response.data.id})`);
            return response.data;
        } catch (error) {
            logger.error(`Error creating folder in Google Drive: ${messageOf(error)}`);
            throw error;
        }
    }

    /**
     * List files in Google Drive
     * @param {Object} [query] - Query parameters
     * @param {string|null} [query.folderId] - ID of the folder to list contents of
     * @param {string|null} [query.mimeType] - Filter by MIME type
     * @param {number} [query.pageSize=100] - Number of items per page
     * @returns {Promise<Array<import('googleapis').drive_v3.Schema$File>>} List of files
     */
    async listFiles({ 
        folderId = null, 
        mimeType = null,
        pageSize = 100 
    } = {}) {
        if (!this.drive) {
            throw new Error('Google Drive client not initialized. Call initialize() first.');
        }

        try {
            let query = "trashed = false";
            
            if (folderId) {
                query += ` and '${folderId}' in parents`;
            }
            
            if (mimeType) {
                query += ` and mimeType = '${mimeType}'`;
            }
            
            const response = await this.drive.files.list({
                q: query,
                pageSize: pageSize,
                fields: 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size)',
                orderBy: 'name',
            });
            
            return response.data.files || [];
        } catch (error) {
            logger.error(`Error listing files in Google Drive: ${messageOf(error)}`);
            throw error;
        }
    }

    /**
     * Get MIME type based on file extension
     * @private
     * @param {string} filePath - Path to the file
     * @returns {string} MIME type
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        /** @type {Record<string, string>} */
        const mimeTypes = {
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.zip': 'application/zip',
            '.json': 'application/json',
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }
}

module.exports = GoogleDriveUtils;
