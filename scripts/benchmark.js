#!/usr/bin/env node

/**
 * Benchmark Script
 * Measures execution time and performance for all scripts in scripts/ directory
 *
 * Usage:
 *   node scripts/benchmark.js                    # Run all benchmarks
 *   node scripts/benchmark.js --scripts scan-plans cache-stats  # Run specific scripts
 *   node scripts/benchmark.js --verbose          # Show detailed output
 *   node scripts/benchmark.js --json             # Output JSON only
 *   node scripts/benchmark.js --iterations 5     # Run multiple iterations
 *   node scripts/benchmark.js --warmup           # Include warmup run
 *
 * Output Format:
 * {
 *   "benchmarks": [
 *     {
 *       "script": "scan-plans",
 *       "command": "node scripts/scan-plans.js",
 *       "iterations": [
 *         { "iteration": 1, "duration": 123.45, "exitCode": 0, "success": true }
 *       ],
 *       "stats": {
 *         "min": 120.5,
 *         "max": 125.3,
 *         "mean": 123.45,
 *         "median": 123.2,
 *         "stdDev": 1.8,
 *         "successRate": 1.0
 *       }
 *     }
 *   ],
 *   "summary": {
 *     "totalScripts": 10,
 *     "totalDuration": 1234.56,
 *     "successfulScripts": 9,
 *     "failedScripts": 1,
 *     "averageDuration": 123.45
 *   }
 * }
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Available scripts to benchmark (matches index.js COMMANDS)
const AVAILABLE_SCRIPTS = {
  'scan-plans': { file: 'scan-plans.js', args: [] },
  'parse-plan-structure': { file: 'parse-plan-structure.js', args: ['docs/plans'] },
  'scan-results': { file: 'scan-results.js', args: [] },
  'check-file-status': { file: 'check-file-status.js', args: ['--files', 'package.json', 'tsconfig.json'] },
  'substitute-variables': { file: 'substitute-variables.js', args: [] },
  'cache-clear': { file: 'cache-clear.js', args: ['--help'] }, // Use --help to avoid destructive operations
  'cache-stats': { file: 'cache-stats.js', args: [] },
};

// Global flags
let VERBOSE = false;
let JSON_ONLY = false;

/**
 * Log verbose output to stderr
 * @param {...any} args - Arguments to log
 */
function verbose(...args) {
  if (VERBOSE && !JSON_ONLY) {
    console.error('[benchmark]', ...args);
  }
}

/**
 * Log progress output to stderr
 * @param {...any} args - Arguments to log
 */
function progress(...args) {
  if (!JSON_ONLY) {
    console.error(...args);
  }
}

/**
 * Parse command line arguments
 * @returns {object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    scripts: null, // null means all
    iterations: 1,
    warmup: false,
    verbose: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--scripts':
      case '-s':
        options.scripts = [];
        // Collect scripts until next flag
        while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options.scripts.push(args[++i]);
        }
        break;

      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i], 10);
        if (isNaN(options.iterations) || options.iterations < 1) {
          console.error('Error: --iterations must be a positive integer');
          process.exit(1);
        }
        break;

      case '--warmup':
      case '-w':
        options.warmup = true;
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--json':
      case '-j':
        options.json = true;
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      default:
        console.error(`Unknown argument: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage() {
  console.error(`
Benchmark Script - Performance Testing for Scripts

Usage:
  node scripts/benchmark.js [options]

Options:
  --scripts <names...>, -s    Benchmark specific scripts (space-separated)
  --iterations <n>, -i        Number of iterations per script (default: 1)
  --warmup, -w                Include warmup run before benchmarking
  --verbose, -v               Show detailed output during execution
  --json, -j                  Output JSON only (no progress messages)
  --help, -h                  Show this help message

Available Scripts:
  ${Object.keys(AVAILABLE_SCRIPTS).join('\n  ')}

Examples:
  node scripts/benchmark.js
  node scripts/benchmark.js --scripts scan-plans cache-stats
  node scripts/benchmark.js --iterations 5 --warmup
  node scripts/benchmark.js --verbose --json

Output:
  JSON object with benchmark results and statistics
`);
}

/**
 * Execute a script and measure its execution time
 * @param {string} scriptName - Name of the script
 * @param {object} scriptConfig - Script configuration
 * @param {number} iteration - Iteration number
 * @returns {Promise<object>} Execution result with duration
 */
function runScript(scriptName, scriptConfig, iteration) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, scriptConfig.file);
    const startTime = process.hrtime.bigint();

    verbose(`Running ${scriptName} (iteration ${iteration})...`);

    const child = spawn('node', [scriptPath, ...scriptConfig.args], {
      stdio: VERBOSE ? 'inherit' : 'pipe',
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    if (!VERBOSE) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      resolve({
        iteration,
        duration,
        exitCode: null,
        success: false,
        error: err.message,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    child.on('exit', (code) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      verbose(`${scriptName} (iteration ${iteration}) completed in ${duration.toFixed(2)}ms with exit code ${code}`);

      resolve({
        iteration,
        duration,
        exitCode: code,
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

/**
 * Calculate statistics from benchmark iterations
 * @param {object[]} iterations - Array of iteration results
 * @returns {object} Statistical summary
 */
function calculateStats(iterations) {
  const durations = iterations.map(i => i.duration);
  const successful = iterations.filter(i => i.success);

  // Sort for median calculation
  const sortedDurations = [...durations].sort((a, b) => a - b);

  // Calculate mean
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;

  // Calculate median
  const mid = Math.floor(sortedDurations.length / 2);
  const median = sortedDurations.length % 2 === 0
    ? (sortedDurations[mid - 1] + sortedDurations[mid]) / 2
    : sortedDurations[mid];

  // Calculate standard deviation
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: Math.min(...durations),
    max: Math.max(...durations),
    mean,
    median,
    stdDev,
    successRate: successful.length / iterations.length,
    totalIterations: iterations.length,
    successfulIterations: successful.length,
    failedIterations: iterations.length - successful.length,
  };
}

/**
 * Benchmark a single script
 * @param {string} scriptName - Name of the script
 * @param {object} scriptConfig - Script configuration
 * @param {object} options - Benchmark options
 * @returns {Promise<object>} Benchmark result
 */
async function benchmarkScript(scriptName, scriptConfig, options) {
  const scriptPath = path.join(__dirname, scriptConfig.file);

  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    return {
      script: scriptName,
      command: `node scripts/${scriptConfig.file} ${scriptConfig.args.join(' ')}`.trim(),
      error: 'Script file not found',
      iterations: [],
      stats: null,
    };
  }

  progress(`Benchmarking ${scriptName}...`);

  const iterations = [];

  // Warmup run
  if (options.warmup) {
    verbose('Running warmup...');
    await runScript(scriptName, scriptConfig, 0);
  }

  // Benchmark runs
  for (let i = 1; i <= options.iterations; i++) {
    const result = await runScript(scriptName, scriptConfig, i);
    iterations.push(result);

    // Add small delay between iterations to avoid interference
    if (i < options.iterations) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const stats = calculateStats(iterations);

  // Remove stdout/stderr from iterations if not verbose (to keep output clean)
  const cleanIterations = iterations.map(({ stdout, stderr, ...rest }) => {
    if (VERBOSE) {
      return { stdout, stderr, ...rest };
    }
    return rest;
  });

  return {
    script: scriptName,
    command: `node scripts/${scriptConfig.file} ${scriptConfig.args.join(' ')}`.trim(),
    iterations: cleanIterations,
    stats,
  };
}

/**
 * Run all benchmarks
 * @param {object} options - Benchmark options
 * @returns {Promise<object>} Complete benchmark results
 */
async function runBenchmarks(options) {
  const startTime = Date.now();

  // Determine which scripts to benchmark
  let scriptsToRun;
  if (options.scripts && options.scripts.length > 0) {
    scriptsToRun = options.scripts;

    // Validate script names
    for (const scriptName of scriptsToRun) {
      if (!AVAILABLE_SCRIPTS[scriptName]) {
        console.error(`Error: Unknown script "${scriptName}"`);
        console.error(`Available scripts: ${Object.keys(AVAILABLE_SCRIPTS).join(', ')}`);
        process.exit(1);
      }
    }
  } else {
    // Run all scripts
    scriptsToRun = Object.keys(AVAILABLE_SCRIPTS);
  }

  verbose(`Benchmarking ${scriptsToRun.length} script(s) with ${options.iterations} iteration(s) each`);

  // Run benchmarks
  const benchmarks = [];
  for (const scriptName of scriptsToRun) {
    const scriptConfig = AVAILABLE_SCRIPTS[scriptName];
    const result = await benchmarkScript(scriptName, scriptConfig, options);
    benchmarks.push(result);
  }

  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // Calculate summary
  const successfulScripts = benchmarks.filter(b => b.stats && b.stats.successRate === 1.0);
  const failedScripts = benchmarks.filter(b => !b.stats || b.stats.successRate < 1.0);

  const summary = {
    totalScripts: benchmarks.length,
    totalDuration,
    successfulScripts: successfulScripts.length,
    failedScripts: failedScripts.length,
    averageDuration: benchmarks
      .filter(b => b.stats)
      .reduce((sum, b) => sum + b.stats.mean, 0) / benchmarks.length || 0,
    iterations: options.iterations,
    warmup: options.warmup,
  };

  return {
    benchmarks,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Main entry point
 */
async function main() {
  try {
    const options = parseArgs();

    if (options.help) {
      printUsage();
      process.exit(0);
    }

    VERBOSE = options.verbose;
    JSON_ONLY = options.json;

    verbose('Starting benchmarks...');

    // Run benchmarks
    const results = await runBenchmarks(options);

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Print summary to stderr if not JSON-only mode
    if (!JSON_ONLY) {
      console.error('\n=== Benchmark Summary ===');
      console.error(`Total Scripts: ${results.summary.totalScripts}`);
      console.error(`Successful: ${results.summary.successfulScripts}`);
      console.error(`Failed: ${results.summary.failedScripts}`);
      console.error(`Total Duration: ${results.summary.totalDuration}ms`);
      console.error(`Average Script Duration: ${results.summary.averageDuration.toFixed(2)}ms`);
      console.error(`Iterations per Script: ${results.summary.iterations}`);
      console.error(`Warmup: ${results.summary.warmup ? 'Yes' : 'No'}`);
    }

    // Exit with error if any benchmarks failed
    const exitCode = results.summary.failedScripts > 0 ? 1 : 0;
    process.exit(exitCode);

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
  runScript,
  benchmarkScript,
  runBenchmarks,
  calculateStats,
  parseArgs,
  AVAILABLE_SCRIPTS,
};
