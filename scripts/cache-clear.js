#!/usr/bin/env node

/**
 * Cache Clear Script
 * Clears various cache types in .claude/cache/
 *
 * Usage:
 *   node scripts/cache-clear.js --all           # Clear all caches
 *   node scripts/cache-clear.js --scripts       # Clear only scripts cache
 *   node scripts/cache-clear.js --research      # Clear only research cache
 *   node scripts/cache-clear.js --verbose       # Show detailed output
 *
 * Multiple flags can be combined:
 *   node scripts/cache-clear.js --scripts --research --verbose
 */

const fs = require('fs');
const path = require('path');
const { resolvePath } = require('./lib/file-utils');
const { createArgParser, COMMON_FLAGS } = require('./lib/arg-parser');

// Cache directories
const CACHE_DIRS = {
  scripts: '.claude/cache/scripts',
  research: '.claude/cache/research',
};

// Global verbose flag
let VERBOSE = false;

/**
 * Log verbose output to stderr
 * @param {...any} args - Arguments to log
 */
function verbose(...args) {
  if (VERBOSE) {
    console.error('[cache-clear]', ...args);
  }
}

// Create argument parser
const argParser = createArgParser({
  name: 'cache-clear',
  description: 'Cache Clear Script - Clears various cache types in .claude/cache/',
  flags: {
    ...COMMON_FLAGS,
    all: { short: '-a', long: '--all', description: 'Clear all cache types' },
    scripts: { short: '-s', long: '--scripts', description: 'Clear scripts cache only' },
    research: { short: '-r', long: '--research', description: 'Clear research cache only' },
  },
  examples: [
    'node scripts/cache-clear.js --all',
    'node scripts/cache-clear.js --scripts --research --verbose',
  ],
});

/**
 * Parse command line arguments
 * @returns {{ all: boolean, scripts: boolean, research: boolean, verbose: boolean }}
 */
function parseArgs() {
  return argParser.parse();
}

/**
 * Print usage information
 */
function printUsage() {
  argParser.printHelp();
}

/**
 * Clear files in a cache directory
 * @param {string} cacheType - Cache type name
 * @param {string} cachePath - Relative cache directory path
 * @returns {{ files: number, bytes: number }} Files and bytes cleared
 */
function clearCacheDirectory(cacheType, cachePath) {
  try {
    const absolutePath = resolvePath(cachePath);

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      verbose(`Cache directory ${cacheType} does not exist: ${absolutePath}`);
      return { files: 0, bytes: 0 };
    }

    let filesCleared = 0;
    let bytesCleared = 0;

    // Read all files in directory
    const files = fs.readdirSync(absolutePath);

    for (const file of files) {
      const filePath = path.join(absolutePath, file);
      const stats = fs.statSync(filePath);

      // Skip directories
      if (stats.isDirectory()) {
        continue;
      }

      // Get file size before deleting
      bytesCleared += stats.size;

      // Delete the file
      try {
        fs.unlinkSync(filePath);
        filesCleared++;
        verbose(`Deleted ${cacheType} cache file: ${file} (${stats.size} bytes)`);
      } catch (err) {
        console.error(`Warning: Failed to delete ${filePath}: ${err.message}`);
      }
    }

    verbose(`Cleared ${filesCleared} file(s) from ${cacheType} cache (${bytesCleared} bytes)`);

    return {
      files: filesCleared,
      bytes: bytesCleared,
    };

  } catch (error) {
    console.error(`Error clearing ${cacheType} cache: ${error.message}`);
    return { files: 0, bytes: 0 };
  }
}

/**
 * Clear selected caches
 * @param {object} options - Cache clearing options
 * @returns {object} Results object
 */
function clearCaches(options) {
  const { all, scripts, research } = options;

  // If no specific flags set, default to help
  if (!all && !scripts && !research) {
    printUsage();
    process.exit(1);
  }

  const results = {
    cleared: {},
    total: {
      files: 0,
      bytes: 0,
    },
  };

  // Determine which caches to clear
  const cachesToClear = [];

  if (all) {
    cachesToClear.push('scripts', 'research');
  } else {
    if (scripts) cachesToClear.push('scripts');
    if (research) cachesToClear.push('research');
  }

  verbose(`Clearing cache(s): ${cachesToClear.join(', ')}`);

  // Clear each selected cache
  for (const cacheType of cachesToClear) {
    const cachePath = CACHE_DIRS[cacheType];
    const result = clearCacheDirectory(cacheType, cachePath);

    results.cleared[cacheType] = result;
    results.total.files += result.files;
    results.total.bytes += result.bytes;
  }

  return results;
}

/**
 * Main entry point
 */
function main() {
  try {
    const options = parseArgs();
    VERBOSE = options.verbose;

    verbose('Cache clear script starting...');

    // Clear caches
    const results = clearCaches(options);

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Exit with success
    verbose('Cache clear complete');
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
  clearCaches,
  clearCacheDirectory,
  parseArgs,
};
