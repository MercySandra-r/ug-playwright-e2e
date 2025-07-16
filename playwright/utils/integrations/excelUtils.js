// @ts-check
const ExcelJS = require('exceljs');
const path = require('path');
const { logger } = require('../testLogger');

/**
 * ExcelUtils - A utility class for handling Excel file operations
 */
class ExcelUtils {
    /**
     * Create a new ExcelUtils instance
     * @param {string} [filePath='testdata.xlsx'] - Path to the Excel file
     */
    constructor(filePath = 'testdata.xlsx') {
        this.filePath = path.resolve(process.cwd(), filePath);
        this.workbook = new ExcelJS.Workbook();
        this.worksheet = null;
    }

    /**
     * Initialize the Excel file and worksheet
     * @param {string} [sheetName='Sheet1'] - Name of the worksheet to work with
     * @returns {Promise<void>}
     */
    async initialize(sheetName = 'Sheet1') {
        try {
            if (await this.fileExists()) {
                await this.workbook.xlsx.readFile(this.filePath);
            }
            this.worksheet = this.workbook.getWorksheet(sheetName) || 
                            this.workbook.addWorksheet(sheetName);
        } catch (error) {
            logger.error(`Error initializing Excel file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if the Excel file exists
     * @returns {Promise<boolean>}
     */
    async fileExists() {
        const fs = require('fs').promises;
        try {
            await fs.access(this.filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Read data from Excel file
     * @param {Object} [options] - Options for reading data
     * @param {string} [options.sheetName] - Specific sheet name to read from
     * @param {boolean} [options.headers=true] - Whether the first row contains headers
     * @returns {Promise<Array<Object>>} Array of row objects
     */
    async readData({ sheetName, headers = true } = {}) {
        try {
            if (sheetName) {
                this.worksheet = this.workbook.getWorksheet(sheetName);
                if (!this.worksheet) {
                    throw new Error(`Sheet '${sheetName}' not found`);
                }
            }

            const data = [];
            const headerRow = [];
            let startRow = 1; // 1-based index

            // Get headers if they exist
            if (headers && this.worksheet.rowCount > 0) {
                this.worksheet.getRow(1).eachCell((cell, colNumber) => {
                    headerRow[colNumber] = cell.value || `Column${colNumber}`;
                });
                startRow = 2;
            }

            // Process data rows
            for (let i = startRow; i <= this.worksheet.rowCount; i++) {
                const row = this.worksheet.getRow(i);
                const rowData = {};
                
                row.eachCell((cell, colNumber) => {
                    const header = headers ? headerRow[colNumber] : colNumber;
                    rowData[header] = cell.value;
                });
                
                if (Object.keys(rowData).length > 0) {
                    data.push(rowData);
                }
            }

            return data;
        } catch (error) {
            logger.error(`Error reading Excel data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Write data to Excel file
     * @param {Array<Object>} data - Data to write (array of objects)
     * @param {Object} [options] - Options for writing data
     * @param {string} [options.sheetName] - Sheet name to write to
     * @param {boolean} [options.overwrite=false] - Whether to overwrite existing sheet
     * @returns {Promise<void>}
     */
    async writeData(data, { sheetName, overwrite = false } = {}) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data must be a non-empty array');
            }

            let worksheet = sheetName ? this.workbook.getWorksheet(sheetName) : this.worksheet;
            
            // Create new worksheet or clear existing one
            if (!worksheet) {
                worksheet = this.workbook.addWorksheet(sheetName || 'Sheet1');
            } else if (overwrite) {
                worksheet.spliceRows(1, worksheet.rowCount);
            }

            // Get headers from data keys
            const headers = Object.keys(data[0]);
            
            // Add headers
            worksheet.addRow(headers);
            
            // Add data rows
            data.forEach(row => {
                const rowData = headers.map(header => row[header]);
                worksheet.addRow(rowData);
            });

            // Auto-fit columns
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, cell => {
                    const columnLength = cell.value ? cell.value.toString().length : 0;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = Math.min(Math.max(maxLength + 2, 10), 50);
            });

            // Save workbook
            await this.workbook.xlsx.writeFile(this.filePath);
        } catch (error) {
            logger.error(`Error writing Excel data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get cell value by row and column
     * @param {number} row - Row number (1-based)
     * @param {number|string} column - Column number (1-based) or letter (A, B, C, ...)
     * @returns {any} Cell value
     */
    getCellValue(row, column) {
        try {
            if (!this.worksheet) {
                throw new Error('No worksheet initialized');
            }
            
            // Convert column letter to number if needed
            const colNumber = typeof column === 'string' 
                ? this.columnLetterToNumber(column)
                : column;
                
            return this.worksheet.getCell(row, colNumber).value;
        } catch (error) {
            logger.error(`Error getting cell value: ${error.message}`);
            throw error;
        }
    }

    /**
     * Set cell value
     * @param {number} row - Row number (1-based)
     * @param {number|string} column - Column number (1-based) or letter (A, B, C, ...)
     * @param {any} value - Value to set
     * @returns {Promise<void>}
     */
    async setCellValue(row, column, value) {
        try {
            if (!this.worksheet) {
                throw new Error('No worksheet initialized');
            }

            // Convert column letter to number if needed
            const colNumber = typeof column === 'string' 
                ? this.columnLetterToNumber(column)
                : column;

            const cell = this.worksheet.getCell(row, colNumber);
            cell.value = value;

            await this.workbook.xlsx.writeFile(this.filePath);
        } catch (error) {
            logger.error(`Error setting cell value: ${error.message}`);
            throw error;
        }
    }

    /**
     * Convert column letter to number (e.g., 'A' -> 1, 'B' -> 2, ...)
     * @param {string} column - Column letter(s)
     * @returns {number} Column number (1-based)
     */
    columnLetterToNumber(column) {
        if (typeof column !== 'string' || !/^[A-Za-z]+$/.test(column)) {
            throw new Error('Invalid column letter');
        }
        
        column = column.toUpperCase();
        let result = 0;
        
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        
        return result;
    }
}

module.exports = ExcelUtils;
