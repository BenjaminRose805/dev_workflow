#!/usr/bin/env node

/**
 * Results Scanner
 * Scans .claude/prompt-results/ for execution results and generates JSON summary.
 *
 * Usage: node scripts/scan-results.js
 * Output: JSON to stdout
 */

const path = require('path');
const { readFile, globSync, resolvePath, getCached, setCached } = require('./lib/file-utils');

const CACHE_KEY = 'scan-results';
// DEPRECATED: This directory no longer exists in the current architecture.
// The prompt-results system has been replaced by the plan-based workflow.
// Keeping for backwards compatibility - will return empty results if directory missing.
const RESULTS_DIR = '.claude/prompt-results';

/**
 * Parse meta.json file and extract metadata
 * @param {string} metaPath - Absolute path to meta.json
 * @returns {object|null} Parsed metadata or null on error
 */
function parseMetadata(metaPath) {
  const content = readFile(metaPath);
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Warning: Invalid JSON in ${metaPath}`);
    return null;
  }
}

/**
 * Extract result ID from directory path
 * @param {string} dirPath - Directory path
 * @returns {string} Result ID (directory name)
 */
function getResultId(dirPath) {
  return path.basename(dirPath);
}

/**
 * Get list of output files in result directory
 * @param {string} dirPath - Directory path
 * @returns {string[]} List of output file paths (relative to result dir)
 */
function getOutputFiles(dirPath) {
  try {
    const pattern = path.join(dirPath, '*.md');
    const files = globSync(pattern);
    return files.map(file => path.basename(file));
  } catch (error) {
    return [];
  }
}

/**
 * Extract prompt name from metadata
 * @param {object} meta - Metadata object
 * @returns {string} Prompt name(s)
 */
function extractPromptName(meta) {
  if (!meta) {
    return 'unknown';
  }

  // Handle batch executions with multiple prompts
  if (meta.type === 'batch' && Array.isArray(meta.prompts)) {
    if (meta.prompts.length === 0) {
      return 'batch (empty)';
    }
    if (meta.prompts.length === 1) {
      return meta.prompts[0].name || meta.prompts[0].path || 'unknown';
    }
    return `batch (${meta.prompts.length} prompts)`;
  }

  // Handle single prompt execution
  if (meta.prompts && Array.isArray(meta.prompts) && meta.prompts.length > 0) {
    return meta.prompts[0].name || meta.prompts[0].path || 'unknown';
  }

  // Fallback to type or unknown
  return meta.type || 'unknown';
}

/**
 * Scan a single result directory
 * @param {string} dirPath - Absolute path to result directory
 * @returns {object|null} Result metadata or null on error
 */
function scanResultDirectory(dirPath) {
  try {
    const metaPath = path.join(dirPath, 'meta.json');
    const meta = parseMetadata(metaPath);

    if (!meta) {
      console.error(`Warning: Could not parse metadata in ${dirPath}`);
      return null;
    }

    const id = getResultId(dirPath);
    const promptName = extractPromptName(meta);
    const outputFiles = getOutputFiles(dirPath);

    return {
      id,
      prompt: promptName,
      timestamp: meta.timestamp || null,
      status: meta.status || 'unknown',
      output_files: outputFiles,
      type: meta.type || 'single',
      agents: meta.agents || 1,
      duration: meta.duration || null,
      successful: meta.successful || 0,
      failed: meta.failed || 0
    };
  } catch (error) {
    console.error(`Error scanning ${dirPath}: ${error.message}`);
    return null;
  }
}

/**
 * Group results by date
 * @param {object[]} results - Array of result objects
 * @returns {object} Results grouped by date
 */
function groupByDate(results) {
  const grouped = {};

  for (const result of results) {
    if (!result.timestamp) {
      continue;
    }

    try {
      const date = new Date(result.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(result);
    } catch (error) {
      console.error(`Warning: Invalid timestamp for result ${result.id}`);
    }
  }

  // Sort results within each date by timestamp (newest first)
  for (const dateKey in grouped) {
    grouped[dateKey].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Descending order
    });
  }

  return grouped;
}

/**
 * Scan all result directories in .claude/prompt-results/
 * @returns {object} Scan results with results array and grouped data
 */
function scanAllResults() {
  try {
    const resultsDir = resolvePath(RESULTS_DIR);

    // Find all meta.json files
    const metaPattern = path.join(resultsDir, '*/meta.json');
    const metaFiles = globSync(metaPattern);

    // Check cache
    const cached = getCached(CACHE_KEY, metaFiles);
    if (cached) {
      return cached;
    }

    if (metaFiles.length === 0) {
      const emptyResult = {
        results: [],
        byDate: {},
        stats: {
          total: 0,
          byStatus: {},
          byType: {}
        }
      };

      // Cache empty result briefly
      setCached(CACHE_KEY, emptyResult, [], 60000); // 1 minute

      return emptyResult;
    }

    // Scan each result directory
    const results = [];
    const stats = {
      total: 0,
      byStatus: {},
      byType: {}
    };

    for (const metaFile of metaFiles) {
      const dirPath = path.dirname(metaFile);
      const result = scanResultDirectory(dirPath);

      if (result) {
        results.push(result);
        stats.total++;

        // Track by status
        const status = result.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Track by type
        const type = result.type || 'single';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    }

    // Sort results by timestamp (newest first)
    results.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    // Group by date
    const byDate = groupByDate(results);

    const output = {
      results,
      byDate,
      stats
    };

    // Cache the result
    setCached(CACHE_KEY, output, metaFiles);

    return output;
  } catch (error) {
    console.error(`Fatal error scanning results: ${error.message}`);
    return {
      results: [],
      byDate: {},
      stats: {
        total: 0,
        byStatus: {},
        byType: {}
      },
      error: error.message
    };
  }
}

/**
 * Main entry point
 */
function main() {
  try {
    const results = scanAllResults();

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  parseMetadata,
  getResultId,
  getOutputFiles,
  extractPromptName,
  scanResultDirectory,
  groupByDate,
  scanAllResults
};
