#!/usr/bin/env node

/**
 * File Status Checker
 * Checks existence, size, mtime, and optionally runs tests for given files.
 *
 * Usage:
 *   echo '["file1.js", "file2.ts"]' | node scripts/check-file-status.js
 *   node scripts/check-file-status.js --files file1.js file2.ts
 *   node scripts/check-file-status.js --file tasks.json
 *   node scripts/check-file-status.js --files file1.js --run-tests
 *   node scripts/check-file-status.js --file tasks.json --run-tests --verbose
 *
 * Input format (from stdin or file):
 * ["path/to/file1.js", "path/to/file2.ts"]
 *
 * Or for command line:
 * --files file1.js file2.ts file3.ts
 *
 * Output format:
 * {
 *   "checks": [
 *     {
 *       "file": "path/to/file.ts",
 *       "exists": true,
 *       "size": 1234,
 *       "mtime": 1702857600000,
 *       "tests_pass": true,
 *       "coverage": 85.5
 *     }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');
const { execa } = require('execa');
const { fileExists, getFileMtime, resolvePath } = require('./lib/file-utils');

const TEST_TIMEOUT = 60000; // 60 seconds for test execution
const VITEST_BIN = path.join(__dirname, '..', 'node_modules', '.bin', 'vitest');

/**
 * Parse command line arguments
 * @returns {{ files: string[]|null, file: string|null, runTests: boolean, verbose: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let files = null;
  let file = null;
  let runTests = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' || args[i] === '-f') {
      // Collect all following args until next flag
      files = [];
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        files.push(args[i]);
        i++;
      }
      i--; // Step back one since loop will increment
    } else if (args[i] === '--file' && i + 1 < args.length) {
      file = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--run-tests' || args[i] === '-t') {
      runTests = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return { files, file, runTests, verbose };
}

/**
 * Print usage information
 */
function printUsage() {
  console.error(`
File Status Checker

Usage:
  echo '["file1.js", "file2.ts"]' | node scripts/check-file-status.js
  node scripts/check-file-status.js --files file1.js file2.ts
  node scripts/check-file-status.js --file tasks.json
  node scripts/check-file-status.js --files file1.js --run-tests
  node scripts/check-file-status.js --file tasks.json --run-tests --verbose

Options:
  --files, -f <paths...>  File paths to check (space-separated)
  --file <path>           Read file paths from JSON file
  --run-tests, -t         Run tests for test files
  --verbose, -v           Show detailed progress output
  --help, -h              Show this help message

Input format (stdin or file):
["path/to/file1.js", "path/to/file2.ts"]

Output format:
{
  "checks": [
    {
      "file": "path/to/file.ts",
      "exists": true,
      "size": 1234,
      "mtime": 1702857600000,
      "tests_pass": true,
      "coverage": 85.5
    }
  ]
}
`);
}

/**
 * Read input from stdin or file
 * @param {string|null} filePath - Optional file path
 * @returns {Promise<string[]>} Array of file paths
 */
async function readInput(filePath) {
  try {
    let content;

    if (filePath) {
      // Read from file
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      // Read from stdin
      content = await new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf-8');

        process.stdin.on('data', chunk => {
          data += chunk;
        });

        process.stdin.on('end', () => {
          resolve(data);
        });

        process.stdin.on('error', reject);

        // If stdin is a TTY and no file specified, show error
        if (process.stdin.isTTY) {
          reject(new Error('No input provided. Use --files, --file, or pipe JSON to stdin.'));
        }
      });
    }

    const parsed = JSON.parse(content);

    // Support both array of strings and object with files array
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.files && Array.isArray(parsed.files)) {
      return parsed.files;
    } else {
      throw new Error('Input must be an array of file paths or object with "files" array');
    }
  } catch (error) {
    throw new Error(`Failed to read input: ${error.message}`);
  }
}

/**
 * Validate input file paths
 * @param {any} files - Files array to validate
 * @throws {Error} If input is invalid
 */
function validateInput(files) {
  if (!Array.isArray(files)) {
    throw new Error('Input must be an array of file paths');
  }

  if (files.length === 0) {
    throw new Error('File paths array cannot be empty');
  }

  for (let i = 0; i < files.length; i++) {
    if (typeof files[i] !== 'string') {
      throw new Error(`File path at index ${i} must be a string`);
    }
  }
}

/**
 * Check if file is a test file
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file appears to be a test file
 */
function isTestFile(filePath) {
  const basename = path.basename(filePath);
  return basename.includes('.test.') || basename.includes('.spec.') || filePath.includes('/tests/');
}

/**
 * Get file stats (size and mtime)
 * @param {string} filePath - Path to file
 * @returns {object|null} { size: number, mtime: number } or null if file doesn't exist
 */
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtimeMs
    };
  } catch (error) {
    return null;
  }
}

/**
 * Run vitest for a specific test file
 * @param {string} filePath - Path to test file
 * @param {boolean} verbose - Show verbose output
 * @returns {Promise<object>} { tests_pass: boolean, coverage: number|null, error: string|null }
 */
async function runTestsForFile(filePath, verbose = false) {
  try {
    // Resolve absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : resolvePath(filePath);

    if (!fileExists(absolutePath)) {
      return {
        tests_pass: false,
        coverage: null,
        error: 'File does not exist'
      };
    }

    if (verbose) {
      console.error(`Running tests for ${filePath}...`);
    }

    // Run vitest with coverage for this specific file
    const args = [
      'run', // Run once, don't watch
      absolutePath,
      '--coverage',
      '--reporter=json',
      '--reporter=verbose'
    ];

    const result = await execa(VITEST_BIN, args, {
      cwd: process.cwd(),
      timeout: TEST_TIMEOUT,
      reject: false, // Don't throw on non-zero exit
      stdio: verbose ? 'inherit' : 'pipe'
    });

    // Parse test results
    // Exit code 0 = all tests passed
    // Exit code 1 = some tests failed
    const tests_pass = result.exitCode === 0;

    // Try to extract coverage from output
    let coverage = null;
    if (result.stdout) {
      // Look for coverage percentage in output
      const coverageMatch = result.stdout.match(/All files\s*\|\s*([\d.]+)/);
      if (coverageMatch) {
        coverage = parseFloat(coverageMatch[1]);
      }
    }

    if (verbose) {
      console.error(`  Tests ${tests_pass ? 'PASSED' : 'FAILED'}${coverage !== null ? ` (coverage: ${coverage}%)` : ''}`);
    }

    return {
      tests_pass,
      coverage,
      error: null
    };

  } catch (error) {
    if (verbose) {
      console.error(`  Error running tests: ${error.message}`);
    }

    return {
      tests_pass: false,
      coverage: null,
      error: error.message
    };
  }
}

/**
 * Check status of a single file
 * @param {string} filePath - Path to file to check
 * @param {boolean} runTests - Whether to run tests for test files
 * @param {boolean} verbose - Show verbose output
 * @returns {Promise<object>} Check result object
 */
async function checkFileStatus(filePath, runTests = false, verbose = false) {
  if (verbose) {
    console.error(`Checking ${filePath}...`);
  }

  // Resolve to absolute path
  const absolutePath = path.isAbsolute(filePath) ? filePath : resolvePath(filePath);

  const result = {
    file: filePath,
    exists: false,
    size: null,
    mtime: null,
    tests_pass: null,
    coverage: null
  };

  // Check if file exists
  result.exists = fileExists(absolutePath);

  if (!result.exists) {
    if (verbose) {
      console.error(`  File does not exist`);
    }
    return result;
  }

  // Get file stats
  const stats = getFileStats(absolutePath);
  if (stats) {
    result.size = stats.size;
    result.mtime = stats.mtime;
  }

  // Run tests if requested and file is a test file
  if (runTests && isTestFile(filePath)) {
    const testResult = await runTestsForFile(absolutePath, verbose);
    result.tests_pass = testResult.tests_pass;
    result.coverage = testResult.coverage;
    if (testResult.error) {
      result.test_error = testResult.error;
    }
  }

  if (verbose) {
    console.error(`  Exists: ${result.exists}, Size: ${result.size} bytes, Mtime: ${result.mtime}`);
  }

  return result;
}

/**
 * Check status of multiple files
 * @param {string[]} files - Array of file paths to check
 * @param {boolean} runTests - Whether to run tests for test files
 * @param {boolean} verbose - Show verbose output
 * @returns {Promise<object>} Results object with checks array
 */
async function checkFilesStatus(files, runTests = false, verbose = false) {
  if (verbose) {
    console.error(`\nChecking ${files.length} file(s)...\n`);
  }

  const checks = [];

  // Process files sequentially to avoid overwhelming the system
  for (const file of files) {
    const result = await checkFileStatus(file, runTests, verbose);
    checks.push(result);
  }

  if (verbose) {
    console.error('\n--- Summary ---');
    console.error(`Total files: ${checks.length}`);
    console.error(`Exist: ${checks.filter(c => c.exists).length}`);
    console.error(`Missing: ${checks.filter(c => !c.exists).length}`);
    if (runTests) {
      const tested = checks.filter(c => c.tests_pass !== null);
      console.error(`Tests run: ${tested.length}`);
      console.error(`Tests passed: ${tested.filter(c => c.tests_pass).length}`);
      console.error(`Tests failed: ${tested.filter(c => c.tests_pass === false).length}`);
    }
    console.error('');
  }

  return { checks };
}

/**
 * Main entry point
 */
async function main() {
  try {
    const { files: cliFiles, file, runTests, verbose } = parseArgs();

    let files;
    if (cliFiles && cliFiles.length > 0) {
      // Use files from command line
      files = cliFiles;
    } else {
      // Read from stdin or file
      files = await readInput(file);
    }

    // Validate input
    validateInput(files);

    // Check files
    const output = await checkFilesStatus(files, runTests, verbose);

    // Output JSON to stdout
    console.log(JSON.stringify(output, null, 2));

    // Exit with success
    process.exit(0);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  checkFileStatus,
  checkFilesStatus,
  getFileStats,
  isTestFile,
  runTestsForFile,
  validateInput,
  readInput,
  parseArgs
};
