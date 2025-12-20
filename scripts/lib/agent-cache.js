/**
 * Agent Cache System
 *
 * Provides persistent file-based caching for agent research results.
 * Cache entries are stored in .claude/cache/research/ with validation
 * based on TTL and source file modification times.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fileExists, getFileMtime, resolvePath } = require('./file-utils');

// Constants
const CACHE_DIR = '.claude/cache/research';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_VERSION = 1;

// In-memory statistics tracking
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
};

/**
 * Generate a short hash from a string
 * @param {string} input - Input string to hash
 * @returns {string} 8-character hex hash
 */
function generateHash(input) {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('hex')
    .substring(0, 8);
}

/**
 * Generate cache key from task description and files
 * @param {string} taskDescription - The task description
 * @param {string[]} files - Array of file paths that affect cache validity
 * @returns {string} Cache key (short hash)
 */
function generateCacheKey(taskDescription, files = []) {
  // Sort files to ensure consistent ordering
  const sortedFiles = [...files].sort();

  // Get mtimes for all files
  const fileMtimes = {};
  for (const file of sortedFiles) {
    const mtime = getFileMtime(file);
    if (mtime !== null) {
      fileMtimes[file] = mtime;
    }
  }

  // Create hash input combining task description and file mtimes
  const hashInput = JSON.stringify({
    task: taskDescription,
    files: fileMtimes,
  });

  return generateHash(hashInput);
}

/**
 * Get the cache file path for a given key
 * @param {string} key - Cache key
 * @returns {string} Absolute path to cache file
 */
function getCacheFilePath(key) {
  return resolvePath(CACHE_DIR, `${key}.json`);
}

/**
 * Ensure cache directory exists
 * @returns {boolean} Success status
 */
function ensureCacheDirectory() {
  try {
    const cacheDir = resolvePath(CACHE_DIR);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Failed to create cache directory: ${error.message}`);
    return false;
  }
}

/**
 * Validate cache entry
 * @param {object} entry - Cache entry object
 * @param {string[]} files - Files to check for modifications
 * @returns {boolean} True if cache entry is valid
 */
function isCacheEntryValid(entry, files = []) {
  // Check version
  if (entry.version !== CACHE_VERSION) {
    return false;
  }

  // Check TTL expiration
  const now = new Date().toISOString();
  if (entry.expires_at && entry.expires_at < now) {
    return false;
  }

  // Check file mtimes
  if (entry.file_mtimes && typeof entry.file_mtimes === 'object') {
    for (const [filePath, cachedMtime] of Object.entries(entry.file_mtimes)) {
      const currentMtime = getFileMtime(filePath);

      // If file no longer exists or mtime changed, cache is invalid
      if (currentMtime === null || currentMtime !== cachedMtime) {
        return false;
      }
    }
  }

  // Additional validation: check if any new files were added
  // that weren't in the original cache
  if (files && files.length > 0) {
    for (const file of files) {
      if (entry.file_mtimes && !(file in entry.file_mtimes)) {
        // A new file dependency was added that wasn't tracked
        return false;
      }
    }
  }

  return true;
}

/**
 * Get cached result if valid
 * @param {string} key - Cache key
 * @param {string[]} [files=[]] - Optional files to validate against
 * @returns {any|null} Cached result or null if invalid/missing
 */
function getCachedResult(key, files = []) {
  try {
    const cacheFile = getCacheFilePath(key);

    // Check if cache file exists
    if (!fileExists(cacheFile)) {
      stats.misses++;
      return null;
    }

    // Read and parse cache file
    const content = fs.readFileSync(cacheFile, 'utf-8');
    const entry = JSON.parse(content);

    // Validate cache entry
    if (!isCacheEntryValid(entry, files)) {
      stats.misses++;
      // Clean up invalid cache entry
      try {
        fs.unlinkSync(cacheFile);
      } catch (err) {
        // Ignore deletion errors
      }
      return null;
    }

    // Cache hit!
    stats.hits++;
    return entry.result;

  } catch (error) {
    stats.misses++;
    // If any error occurs (parse error, read error, etc.), treat as cache miss
    return null;
  }
}

/**
 * Store result in cache
 * @param {string} key - Cache key
 * @param {any} result - Result to cache
 * @param {object} [options={}] - Options
 * @param {number} [options.ttlMs=3600000] - Time to live in milliseconds
 * @param {string[]} [options.files=[]] - Files that affect cache validity
 * @param {string} [options.taskDescription=''] - Original task description
 * @returns {boolean} Success status
 */
function setCachedResult(key, result, options = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    files = [],
    taskDescription = '',
  } = options;

  try {
    // Ensure cache directory exists
    if (!ensureCacheDirectory()) {
      return false;
    }

    // Collect file mtimes
    const fileMtimes = {};
    for (const file of files) {
      const mtime = getFileMtime(file);
      if (mtime !== null) {
        fileMtimes[file] = mtime;
      }
    }

    // Create cache entry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    const entry = {
      version: CACHE_VERSION,
      key,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      task_description_hash: generateHash(taskDescription),
      files_hash: generateHash(JSON.stringify(files.sort())),
      file_mtimes: fileMtimes,
      result,
    };

    // Write to cache file
    const cacheFile = getCacheFilePath(key);
    fs.writeFileSync(cacheFile, JSON.stringify(entry, null, 2), 'utf-8');

    stats.sets++;
    return true;

  } catch (error) {
    console.error(`Failed to set cache: ${error.message}`);
    return false;
  }
}

/**
 * Invalidate cache entries
 * @param {string|RegExp} [pattern] - Optional pattern to match keys (string or regex)
 * @returns {number} Number of entries invalidated
 */
function invalidateCache(pattern = null) {
  try {
    const cacheDir = resolvePath(CACHE_DIR);

    if (!fs.existsSync(cacheDir)) {
      return 0;
    }

    let count = 0;
    const files = fs.readdirSync(cacheDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      // Extract key from filename
      const key = path.basename(file, '.json');

      // Check if pattern matches
      let shouldDelete = false;

      if (pattern === null) {
        // No pattern - delete all
        shouldDelete = true;
      } else if (typeof pattern === 'string') {
        // String pattern - simple includes check
        shouldDelete = key.includes(pattern);
      } else if (pattern instanceof RegExp) {
        // Regex pattern
        shouldDelete = pattern.test(key);
      }

      if (shouldDelete) {
        const filePath = path.join(cacheDir, file);
        fs.unlinkSync(filePath);
        count++;
      }
    }

    stats.invalidations += count;
    return count;

  } catch (error) {
    console.error(`Failed to invalidate cache: ${error.message}`);
    return 0;
  }
}

/**
 * Get cache statistics
 * @returns {object} Statistics object
 */
function getCacheStats() {
  try {
    const cacheDir = resolvePath(CACHE_DIR);

    let totalEntries = 0;
    let totalSize = 0;
    let validEntries = 0;
    let expiredEntries = 0;

    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(cacheDir, file);
        const fileStats = fs.statSync(filePath);
        totalSize += fileStats.size;
        totalEntries++;

        // Check if entry is valid
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = JSON.parse(content);

          if (isCacheEntryValid(entry)) {
            validEntries++;
          } else {
            expiredEntries++;
          }
        } catch (err) {
          expiredEntries++;
        }
      }
    }

    return {
      hits: stats.hits,
      misses: stats.misses,
      sets: stats.sets,
      invalidations: stats.invalidations,
      hitRate: stats.hits + stats.misses > 0
        ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) + '%'
        : '0%',
      totalEntries,
      validEntries,
      expiredEntries,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      cacheDirectory: cacheDir,
    };

  } catch (error) {
    console.error(`Failed to get cache stats: ${error.message}`);
    return {
      hits: stats.hits,
      misses: stats.misses,
      sets: stats.sets,
      invalidations: stats.invalidations,
      hitRate: '0%',
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalSizeBytes: 0,
      totalSizeKB: '0',
      cacheDirectory: resolvePath(CACHE_DIR),
      error: error.message,
    };
  }
}

/**
 * Clean up expired cache entries
 * @returns {number} Number of entries cleaned up
 */
function cleanupExpiredEntries() {
  try {
    const cacheDir = resolvePath(CACHE_DIR);

    if (!fs.existsSync(cacheDir)) {
      return 0;
    }

    let count = 0;
    const files = fs.readdirSync(cacheDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(cacheDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const entry = JSON.parse(content);

        // Check if expired
        if (!isCacheEntryValid(entry)) {
          fs.unlinkSync(filePath);
          count++;
        }
      } catch (err) {
        // If we can't read/parse, consider it invalid and delete
        try {
          fs.unlinkSync(filePath);
          count++;
        } catch (deleteErr) {
          // Ignore deletion errors
        }
      }
    }

    return count;

  } catch (error) {
    console.error(`Failed to cleanup expired entries: ${error.message}`);
    return 0;
  }
}

/**
 * Reset statistics (useful for testing)
 */
function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.invalidations = 0;
}

// Initialize: Clean up expired entries on module load
cleanupExpiredEntries();

module.exports = {
  generateCacheKey,
  getCachedResult,
  setCachedResult,
  invalidateCache,
  getCacheStats,
  cleanupExpiredEntries,
  resetStats,

  // Constants (exported for testing/configuration)
  CACHE_DIR,
  DEFAULT_TTL_MS,
  CACHE_VERSION,
};
