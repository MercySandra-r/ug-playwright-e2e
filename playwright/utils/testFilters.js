/**
 * Test Filtering and Tagging Utilities
 * 
 * This file provides utilities for filtering tests by tags, 
 * test groups, and other metadata.
 */

const fs = require('fs');
const path = require('path');
const envVariables = require('./envVariables');
const { logger } = require('./testLogger');

/**
 * Parse tags from a test file
 * @param {string} filePath - Path to the test file
 * @returns {Array<string>} Array of tags found in the file
 */
function parseTagsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tagRegex = /@tags?\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const customTagRegex = /@([a-zA-Z0-9_-]+)/g;
    
    const tags = new Set();
    
    // Find tags in format @tag('tagname')
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      match[1].split(',').forEach(tag => {
        tags.add(tag.trim());
      });
    }
    
    // Find tags in format @tagname within test descriptions
    while ((match = customTagRegex.exec(content)) !== null) {
      tags.add(match[1].trim());
    }
    
    return Array.from(tags);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error parsing tags from ${filePath}`, error);
    } else {
      logger.error(`Error parsing tags from ${filePath}: ${String(error)}`);
    }
    return [];
  }
}

/**
 * Check if a test should be run based on tag filtering
 * @param {Array<string>} testTags - Tags associated with the test
 * @param {Array<string>} filterTags - Tags to filter by
 * @param {boolean} includeMode - If true, include tests with matching tags; if false, exclude them
 * @returns {boolean} True if the test should be run
 */
function shouldRunTest(testTags, filterTags, includeMode = true) {
  if (!filterTags || filterTags.length === 0) {
    return true; // No filtering
  }
  
  const hasMatchingTag = testTags.some(tag => 
    filterTags.some(filterTag => 
      filterTag === '*' || // Wildcard
      filterTag === tag || // Exact match
      (filterTag.endsWith('*') && tag.startsWith(filterTag.slice(0, -1))) // Prefix match
    )
  );
  
  return includeMode ? hasMatchingTag : !hasMatchingTag;
}

/**
 * Get filtered test files based on tags
 * @param {string} testsDir - Directory containing test files
 * @returns {Array<string>} Array of test file paths that match the filter
 */
function getFilteredTestFiles(testsDir = '../tests') {
  const tagFilter = envVariables.getEnv('TAG_FILTER', '');
  const groupFilter = envVariables.getEnv('GROUP_FILTER', '');
  const excludeFilter = envVariables.getEnv('EXCLUDE_FILTER', '');
  
  if (!tagFilter && !groupFilter && !excludeFilter) {
    return []; // No filtering, return empty array to indicate all tests should run
  }
  
  const tagFilters = tagFilter ? tagFilter.split(',').map(t => t.trim()) : [];
  const groupFilters = groupFilter ? groupFilter.split(',').map(g => g.trim()) : [];
  const excludeFilters = excludeFilter ? excludeFilter.split(',').map(e => e.trim()) : [];
  
  const resolvedDir = path.resolve(__dirname, testsDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Test directory not found: ${resolvedDir}`);
    return [];
  }
  
  // Get all test files
  /** @type {string[]} */
  const allFiles = [];
  /**
   * @param {string} dir
   */
  function getFiles(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        getFiles(fullPath);
      } else if (item.endsWith('.spec.js')) {
        allFiles.push(fullPath);
      }
    }
  }
  
  getFiles(resolvedDir);
  
  // Filter files based on tags and groups
  return allFiles.filter(file => {
    const tags = parseTagsFromFile(file);
    const fileName = path.basename(file, '.spec.js');
    const groupMatch = groupFilters.length === 0 || 
                      groupFilters.some(group => fileName.toLowerCase().includes(group.toLowerCase()));
    
    const tagMatch = shouldRunTest(tags, tagFilters, true);
    const notExcluded = shouldRunTest(tags, excludeFilters, false);
    
    return (tagFilters.length === 0 || tagMatch) && 
           groupMatch && 
           (excludeFilters.length === 0 || notExcluded);
  });
}

/**
 * Create a project configuration with filtered tests
 * @param {Object} baseConfig - Base Playwright configuration
 * @returns {Object} Modified configuration with filtered tests
 */
function createFilteredConfig(baseConfig) {
  const filteredFiles = getFilteredTestFiles();
  
  if (filteredFiles.length === 0) {
    return baseConfig; // No filtering
  }
  
  // Create a new config with testMatch set to the filtered files
  return {
    ...baseConfig,
    testMatch: filteredFiles
  };
}

module.exports = {
  parseTagsFromFile,
  shouldRunTest,
  getFilteredTestFiles,
  createFilteredConfig
};
