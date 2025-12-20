#!/usr/bin/env node

/**
 * Cache Statistics Script
 * Shows cache hit rates, sizes, and other statistics for all cache types
 *
 * Usage:
 *   node scripts/cache-stats.js                 # Show all cache stats
 *   node scripts/cache-stats.js --scripts       # Show only scripts cache stats
 *   node scripts/cache-stats.js --research      # Show only research cache stats
 *   node scripts/cache-stats.js --speculative   # Show only speculative cache stats
 *   node scripts/cache-stats.js --verbose       # Show detailed output
 *
 * Output Format:
 * {
 *   "caches": {
 *     "scripts": {
 *       "type": "scripts",
 *       "path": "/absolute/path/.claude/cache/scripts",
 *       "exists": true,
 *       "totalEntries": 10,
 *       "validEntries": 8,
 *       "expiredEntries": 2,
 *       "totalSizeBytes": 12345,
 *       "totalSizeKB": "12.05",
 *       "totalSizeMB": "0.01",
 *       "files": [...]
 *     }
 *   },
 *   "totals": {
 *     "totalEntries": 18,
 *     "validEntries": 15,
 *     "expiredEntries": 3,
 *     "totalSizeBytes": 23701,
 *     "totalSizeKB": "23.14",
 *     "totalSizeMB": "0.02"
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');
const { resolvePath, fileExists, readFile, getFileMtime } = require('./lib/file-utils');

// Cache directories
const CACHE_DIRS = {
  scripts: '.claude/cache/scripts',
  research: '.claude/cache/research',
  speculative: '.claude/cache/speculative',
};

// Cache versions
const CACHE_VERSIONS = {
  scripts: 1,
  research: 1,
  speculative: 1,
};

// Global verbose flag
let VERBOSE = false;

/**
 * Log verbose output to stderr
 * @param {...any} args - Arguments to log
 */
function verbose(...args) {
  if (VERBOSE) {
    console.error('[cache-stats]', ...args);
  }
}

/**
 * Parse command line arguments
 * @returns {{ all: boolean, scripts: boolean, research: boolean, speculative: boolean, verbose: boolean, detailed: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    all: false,
    scripts: false,
    research: false,
    speculative: false,
    verbose: false,
    detailed: false,
  };

  for (const arg of args) {
    switch (arg) {
      case '--all':
      case '-a':
        parsed.all = true;
        break;
      case '--scripts':
      case '-s':
        parsed.scripts = true;
        break;
      case '--research':
      case '-r':
        parsed.research = true;
        break;
      case '--speculative':
      case '-p':
        parsed.speculative = true;
        break;
      case '--verbose':
      case '-v':
        parsed.verbose = true;
        break;
      case '--detailed':
      case '-d':
        parsed.detailed = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  return parsed;
}

/**
 * Print usage information
 */
function printUsage() {
  console.error(`
Cache Statistics Script

Usage:
  node scripts/cache-stats.js                 # Show all cache stats
  node scripts/cache-stats.js --scripts       # Show only scripts cache stats
  node scripts/cache-stats.js --research      # Show only research cache stats
  node scripts/cache-stats.js --speculative   # Show only speculative cache stats
  node scripts/cache-stats.js --verbose       # Show detailed progress output
  node scripts/cache-stats.js --detailed      # Include file-level details

Options:
  --all, -a           Show all cache types (default)
  --scripts, -s       Show scripts cache stats only
  --research, -r      Show research cache stats only
  --speculative, -p   Show speculative cache stats only
  --verbose, -v       Show detailed progress output
  --detailed, -d      Include file-level details in output
  --help, -h          Show this help message

Output format:
{
  "caches": {
    "scripts": {
      "type": "scripts",
      "path": "/path/.claude/cache/scripts",
      "exists": true,
      "totalEntries": 10,
      "validEntries": 8,
      "expiredEntries": 2,
      "totalSizeBytes": 12345,
      "totalSizeKB": "12.05",
      "totalSizeMB": "0.01"
    }
  },
  "totals": {
    "totalEntries": 18,
    "validEntries": 15,
    "expiredEntries": 3,
    "totalSizeBytes": 23701,
    "totalSizeKB": "23.14",
    "totalSizeMB": "0.02"
  }
}
`);
}

/**
 * Validate cache entry based on type
 * @param {object} entry - Cache entry object
 * @param {string} cacheType - Cache type
 * @returns {boolean} True if valid
 */
function isCacheEntryValid(entry, cacheType) {
  try {
    // Check version
    const expectedVersion = CACHE_VERSIONS[cacheType];
    if (entry.version !== expectedVersion) {
      return false;
    }

    // Check TTL expiration
    if (entry.expires_at) {
      const now = new Date().toISOString();
      if (entry.expires_at < now) {
        return false;
      }
    }

    // Check file mtimes if present
    if (entry.file_mtimes && typeof entry.file_mtimes === 'object') {
      for (const [filePath, cachedMtime] of Object.entries(entry.file_mtimes)) {
        const currentMtime = getFileMtime(filePath);

        // If file no longer exists or mtime changed, cache is invalid
        if (currentMtime === null || currentMtime !== cachedMtime) {
          return false;
        }
      }
    }

    return true;

  } catch (error) {
    return false;
  }
}

/**
 * Get statistics for a single cache directory
 * @param {string} cacheType - Cache type name
 * @param {string} cachePath - Relative cache directory path
 * @param {boolean} detailed - Include file-level details
 * @returns {object} Cache statistics
 */
function getCacheStats(cacheType, cachePath, detailed = false) {
  const absolutePath = resolvePath(cachePath);

  const stats = {
    type: cacheType,
    path: absolutePath,
    exists: false,
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    invalidEntries: 0,
    totalSizeBytes: 0,
    totalSizeKB: '0',
    totalSizeMB: '0',
  };

  // Add files array if detailed mode
  if (detailed) {
    stats.files = [];
  }

  try {
    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      verbose(`Cache directory ${cacheType} does not exist: ${absolutePath}`);
      return stats;
    }

    stats.exists = true;

    // Read all files in directory
    const files = fs.readdirSync(absolutePath);

    for (const file of files) {
      const filePath = path.join(absolutePath, file);

      try {
        const fileStats = fs.statSync(filePath);

        // Skip directories
        if (fileStats.isDirectory()) {
          continue;
        }

        // Skip non-JSON files
        if (!file.endsWith('.json')) {
          continue;
        }

        stats.totalEntries++;
        stats.totalSizeBytes += fileStats.size;

        // Try to read and validate cache entry
        let isValid = false;
        let entry = null;

        try {
          const content = readFile(filePath);
          if (content) {
            entry = JSON.parse(content);
            isValid = isCacheEntryValid(entry, cacheType);
          }
        } catch (parseError) {
          verbose(`Failed to parse ${file}: ${parseError.message}`);
        }

        if (isValid) {
          stats.validEntries++;
        } else if (entry !== null) {
          // Could parse but invalid
          stats.expiredEntries++;
        } else {
          // Couldn't parse
          stats.invalidEntries++;
        }

        // Add file details if requested
        if (detailed && entry) {
          stats.files.push({
            file,
            size: fileStats.size,
            created: entry.created_at || null,
            expires: entry.expires_at || null,
            valid: isValid,
            key: entry.key || null,
            taskId: entry.task_id || null,
          });
        }

      } catch (fileError) {
        verbose(`Error processing file ${file}: ${fileError.message}`);
      }
    }

    // Calculate human-readable sizes
    stats.totalSizeKB = (stats.totalSizeBytes / 1024).toFixed(2);
    stats.totalSizeMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(2);

    verbose(`Cache ${cacheType}: ${stats.totalEntries} entries, ${stats.validEntries} valid, ${stats.totalSizeKB} KB`);

  } catch (error) {
    console.error(`Error getting stats for ${cacheType} cache: ${error.message}`);
  }

  return stats;
}

/**
 * Get statistics for all or selected caches
 * @param {object} options - Options for which caches to check
 * @param {boolean} detailed - Include file-level details
 * @returns {object} Combined cache statistics
 */
function getAllCacheStats(options, detailed = false) {
  const { all, scripts, research, speculative } = options;

  // If no specific flags set, default to all
  const showAll = all || (!scripts && !research && !speculative);

  const cachesToCheck = [];

  if (showAll) {
    cachesToCheck.push('scripts', 'research', 'speculative');
  } else {
    if (scripts) cachesToCheck.push('scripts');
    if (research) cachesToCheck.push('research');
    if (speculative) cachesToCheck.push('speculative');
  }

  verbose(`Checking cache(s): ${cachesToCheck.join(', ')}`);

  const results = {
    caches: {},
    totals: {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      invalidEntries: 0,
      totalSizeBytes: 0,
      totalSizeKB: '0',
      totalSizeMB: '0',
    },
  };

  // Get stats for each selected cache
  for (const cacheType of cachesToCheck) {
    const cachePath = CACHE_DIRS[cacheType];
    const cacheStats = getCacheStats(cacheType, cachePath, detailed);

    results.caches[cacheType] = cacheStats;

    // Aggregate totals
    results.totals.totalEntries += cacheStats.totalEntries;
    results.totals.validEntries += cacheStats.validEntries;
    results.totals.expiredEntries += cacheStats.expiredEntries;
    results.totals.invalidEntries += cacheStats.invalidEntries;
    results.totals.totalSizeBytes += cacheStats.totalSizeBytes;
  }

  // Calculate total human-readable sizes
  results.totals.totalSizeKB = (results.totals.totalSizeBytes / 1024).toFixed(2);
  results.totals.totalSizeMB = (results.totals.totalSizeBytes / (1024 * 1024)).toFixed(2);

  return results;
}

/**
 * Main entry point
 */
function main() {
  try {
    const options = parseArgs();
    VERBOSE = options.verbose;

    verbose('Cache stats script starting...');

    // Get cache statistics
    const results = getAllCacheStats(options, options.detailed);

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Exit with success
    verbose('Cache stats complete');
    process.exit(0);

  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    if (VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  getAllCacheStats,
  getCacheStats,
  isCacheEntryValid,
  parseArgs,
};
