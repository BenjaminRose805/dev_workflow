/**
 * File Utilities
 * Common file operations for scripts including read, glob, and cache.
 */

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

// Simple in-memory cache with mtime tracking
const cache = new Map();

/**
 * Read file contents
 * @param {string} filePath - Path to file
 * @returns {string|null} File contents or null if not found
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Write file contents
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @returns {boolean} Success status
 */
function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Write file contents atomically (crash-safe)
 * Writes to a temp file first, then renames to target.
 * This ensures partial writes never corrupt the target file.
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @returns {boolean} Success status
 */
function writeFileAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  // Use process ID and timestamp for unique temp file name
  const tempPath = path.join(dir, `.${basename}.${process.pid}.${Date.now()}.tmp`);

  try {
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temp file
    fs.writeFileSync(tempPath, content, 'utf-8');

    // Rename atomically (atomic on POSIX systems)
    fs.renameSync(tempPath, filePath);

    return true;
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Write file contents atomically (async version)
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @returns {Promise<boolean>} Success status
 */
async function writeFileAtomicAsync(filePath, content) {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const tempPath = path.join(dir, `.${basename}.${process.pid}.${Date.now()}.tmp`);

  try {
    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });

    // Write to temp file
    await fs.promises.writeFile(tempPath, content, 'utf-8');

    // Rename atomically
    await fs.promises.rename(tempPath, filePath);

    return true;
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.promises.unlink(tempPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean}
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Get file modification time
 * @param {string} filePath - Path to file
 * @returns {number|null} Mtime in milliseconds or null
 */
function getFileMtime(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch (error) {
    return null;
  }
}

/**
 * Glob for files using fast-glob
 * @param {string|string[]} patterns - Glob patterns
 * @param {object} options - fast-glob options
 * @returns {Promise<string[]>} Matching file paths
 */
async function glob(patterns, options = {}) {
  const defaultOptions = {
    onlyFiles: true,
    absolute: true,
    ...options
  };
  return fg(patterns, defaultOptions);
}

/**
 * Sync glob for files
 * @param {string|string[]} patterns - Glob patterns
 * @param {object} options - fast-glob options
 * @returns {string[]} Matching file paths
 */
function globSync(patterns, options = {}) {
  const defaultOptions = {
    onlyFiles: true,
    absolute: true,
    ...options
  };
  return fg.sync(patterns, defaultOptions);
}

/**
 * Get cached value if still valid
 * @param {string} key - Cache key
 * @param {string[]} dependentFiles - Files that invalidate cache if changed
 * @returns {any|null} Cached value or null
 */
function getCached(key, dependentFiles = []) {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if any dependent files have changed
  for (const file of dependentFiles) {
    const currentMtime = getFileMtime(file);
    const cachedMtime = entry.mtimes[file];
    if (currentMtime !== cachedMtime) {
      cache.delete(key);
      return null;
    }
  }

  // Check TTL
  if (entry.ttl && Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {string[]} dependentFiles - Files that invalidate cache if changed
 * @param {number} ttlMs - Time to live in milliseconds (default: 5 min)
 */
function setCached(key, value, dependentFiles = [], ttlMs = 5 * 60 * 1000) {
  const mtimes = {};
  for (const file of dependentFiles) {
    mtimes[file] = getFileMtime(file);
  }

  cache.set(key, {
    value,
    mtimes,
    ttl: ttlMs,
    expires: Date.now() + ttlMs
  });
}

/**
 * Clear all cached values
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 * @returns {{ size: number, keys: string[] }}
 */
function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

/**
 * Resolve path relative to project root
 * @param {...string} segments - Path segments
 * @returns {string} Absolute path
 */
function resolvePath(...segments) {
  return path.resolve(process.cwd(), ...segments);
}

module.exports = {
  readFile,
  writeFile,
  writeFileAtomic,
  writeFileAtomicAsync,
  fileExists,
  getFileMtime,
  glob,
  globSync,
  getCached,
  setCached,
  clearCache,
  getCacheStats,
  resolvePath
};
