#!/usr/bin/env node

/**
 * Verify Tasks with Agent
 * Uses the verify-agent template to check task completion status.
 *
 * Usage:
 *   echo '{"tasks": [...]}' | node scripts/verify-with-agent.js
 *   node scripts/verify-with-agent.js --file tasks.json
 *   node scripts/verify-with-agent.js --file tasks.json --verbose
 *   node scripts/verify-with-agent.js --file tasks.json --parallel
 *   node scripts/verify-with-agent.js --file tasks.json --parallel --max-concurrent 5
 *
 * Input format:
 * {
 *   "tasks": [
 *     {
 *       "id": "1.1",
 *       "description": "Create websocket-connection.test.ts",
 *       "expected_files": ["tests/unit/lib/websocket-connection.test.ts"]
 *     }
 *   ]
 * }
 *
 * Output format:
 * {
 *   "results": [
 *     {
 *       "task_id": "1.1",
 *       "status": "DONE",
 *       "confidence": 95,
 *       "evidence": [...]
 *     }
 *   ],
 *   "summary": {
 *     "total": 1,
 *     "done": 0,
 *     "needed": 1,
 *     "errors": 0
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');
const { launchResearchAgent, ErrorCodes } = require('./lib/agent-launcher');
const { verifyResult: verifyResultSchema } = require('./lib/schemas');
const { runAgentsInParallel } = require('./lib/parallel-agents');

const VERIFY_TIMEOUT = 30000; // 30 seconds per task
const AGENT_TEMPLATE = 'verify-agent.md';
const PARALLEL_THRESHOLD = 3; // Use parallel for 3+ tasks

/**
 * Parse command line arguments
 * @returns {{ file: string|null, verbose: boolean, parallel: boolean, maxConcurrent: number }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let file = null;
  let verbose = false;
  let parallel = false;
  let maxConcurrent = 3;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
      file = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === '--verbose') {
      verbose = true;
    } else if (args[i] === '--parallel') {
      parallel = true;
    } else if (args[i] === '--max-concurrent' && i + 1 < args.length) {
      const value = parseInt(args[i + 1], 10);
      if (!isNaN(value) && value >= 1 && value <= 5) {
        maxConcurrent = value;
      }
      i++; // Skip next arg
    } else if (args[i] === '--help' || args[i] === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return { file, verbose, parallel, maxConcurrent };
}

/**
 * Print usage information
 */
function printUsage() {
  console.error(`
Verify Tasks with Agent

Usage:
  echo '{"tasks": [...]}' | node scripts/verify-with-agent.js
  node scripts/verify-with-agent.js --file tasks.json
  node scripts/verify-with-agent.js --file tasks.json --verbose
  node scripts/verify-with-agent.js --file tasks.json --parallel
  node scripts/verify-with-agent.js --file tasks.json --parallel --max-concurrent 5

Options:
  --file <path>           Read tasks from JSON file
  --verbose               Show detailed progress output
  --parallel              Enable parallel execution (auto-enabled for 3+ tasks)
  --max-concurrent <n>    Max concurrent agents (1-5, default: 3)
  --help, -h              Show this help message

Input format:
{
  "tasks": [
    {
      "id": "1.1",
      "description": "Create websocket-connection.test.ts",
      "expected_files": ["tests/unit/lib/websocket-connection.test.ts"]
    }
  ]
}

Output format:
{
  "results": [...],
  "summary": {
    "total": 2,
    "done": 1,
    "needed": 1,
    "errors": 0
  }
}
`);
}

/**
 * Read input from stdin or file
 * @param {string|null} filePath - Optional file path
 * @returns {Promise<object>} Parsed input object
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
          reject(new Error('No input provided. Use --file or pipe JSON to stdin.'));
        }
      });
    }

    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read input: ${error.message}`);
  }
}

/**
 * Validate input structure
 * @param {object} input - Input object to validate
 * @throws {Error} If input is invalid
 */
function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be a JSON object');
  }

  if (!Array.isArray(input.tasks)) {
    throw new Error('Input must contain a "tasks" array');
  }

  if (input.tasks.length === 0) {
    throw new Error('Tasks array cannot be empty');
  }

  // Validate each task
  for (let i = 0; i < input.tasks.length; i++) {
    const task = input.tasks[i];
    if (!task.id) {
      throw new Error(`Task at index ${i} missing required field: id`);
    }
    if (!task.description) {
      throw new Error(`Task at index ${i} missing required field: description`);
    }
    if (!task.expected_files) {
      throw new Error(`Task at index ${i} missing required field: expected_files`);
    }
    if (!Array.isArray(task.expected_files)) {
      throw new Error(`Task at index ${i}: expected_files must be an array`);
    }
  }
}

/**
 * Verify a single task using the verify agent
 * @param {object} task - Task object with id, description, expected_files
 * @param {boolean} verbose - Whether to show verbose output
 * @returns {Promise<object>} Verification result
 */
async function verifyTaskWithAgent(task, verbose = false) {
  const { id, description, expected_files } = task;

  if (verbose) {
    console.error(`Verifying task ${id}: ${description}...`);
  }

  try {
    // Prepare template variables
    const variables = {
      task_id: id,
      task_description: description,
      expected_files: expected_files.join(', ')
    };

    // Launch the verify agent
    const response = await launchResearchAgent({
      template: AGENT_TEMPLATE,
      variables,
      timeout: VERIFY_TIMEOUT,
      cwd: process.cwd(),
      schema: verifyResultSchema
    });

    // Check if agent execution was successful
    if (!response.success) {
      if (verbose) {
        console.error(`  Error: ${response.error.message}`);
      }
      return {
        task_id: id,
        status: 'ERROR',
        error: response.error.message,
        error_code: response.error.code,
        confidence: 0,
        evidence: []
      };
    }

    // Extract and validate result
    const result = response.result;

    // Ensure required fields are present
    if (!result.task_id) result.task_id = id;
    if (!result.status) {
      if (verbose) {
        console.error(`  Warning: Agent did not return status, marking as ERROR`);
      }
      return {
        task_id: id,
        status: 'ERROR',
        error: 'Agent did not return valid status',
        confidence: 0,
        evidence: []
      };
    }

    if (verbose) {
      console.error(`  Result: ${result.status} (confidence: ${result.confidence}%)`);
    }

    return result;

  } catch (error) {
    if (verbose) {
      console.error(`  Unexpected error: ${error.message}`);
    }
    return {
      task_id: id,
      status: 'ERROR',
      error: error.message,
      confidence: 0,
      evidence: []
    };
  }
}

/**
 * Verify multiple tasks with agent (sequential)
 * @param {Array<object>} tasks - Array of task objects
 * @param {boolean} verbose - Whether to show verbose output
 * @returns {Promise<Array>} Array of results
 */
async function verifyTasksSequential(tasks, verbose = false) {
  if (verbose) {
    console.error(`\nVerifying ${tasks.length} task(s) sequentially...\n`);
  }

  const results = [];

  // Process tasks sequentially
  for (const task of tasks) {
    const result = await verifyTaskWithAgent(task, verbose);
    results.push(result);
  }

  return results;
}

/**
 * Verify multiple tasks with agent (parallel)
 * @param {Array<object>} tasks - Array of task objects
 * @param {boolean} verbose - Whether to show verbose output
 * @param {number} maxConcurrent - Max concurrent agents
 * @returns {Promise<Array>} Array of results
 */
async function verifyTasksParallel(tasks, verbose = false, maxConcurrent = 3) {
  if (verbose) {
    console.error(`\nVerifying ${tasks.length} task(s) in parallel (max ${maxConcurrent} concurrent)...\n`);
  }

  const results = await runAgentsInParallel(
    tasks,
    async (task) => await verifyTaskWithAgent(task, false), // Don't show verbose in agent fn
    {
      maxConcurrent,
      verbose,
      onProgress: verbose ? (status) => {
        console.error(`Progress: ${status.completed}/${status.total} (running: ${status.running}, errors: ${status.errors})`);
      } : null,
      onTaskComplete: verbose ? (task, result) => {
        console.error(`  Task ${task.id}: ${result.status} (confidence: ${result.confidence || 0}%)`);
      } : null,
    }
  );

  return results;
}

/**
 * Verify multiple tasks with agent
 * @param {Array<object>} tasks - Array of task objects
 * @param {boolean} verbose - Whether to show verbose output
 * @param {boolean} parallel - Whether to use parallel execution
 * @param {number} maxConcurrent - Max concurrent agents
 * @returns {Promise<object>} Aggregated results with summary
 */
async function verifyTasksWithAgent(tasks, verbose = false, parallel = false, maxConcurrent = 3) {
  // Auto-enable parallel for many tasks
  const useParallel = parallel || tasks.length >= PARALLEL_THRESHOLD;

  let results;
  if (useParallel) {
    results = await verifyTasksParallel(tasks, verbose, maxConcurrent);
  } else {
    results = await verifyTasksSequential(tasks, verbose);
  }

  // Aggregate summary
  const summary = {
    total: results.length,
    done: results.filter(r => r.status === 'DONE').length,
    needed: results.filter(r => r.status === 'NEEDED').length,
    blocked: results.filter(r => r.status === 'BLOCKED').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
    errors: results.filter(r => r.status === 'ERROR').length
  };

  if (verbose) {
    console.error('\n--- Summary ---');
    console.error(`Total:   ${summary.total}`);
    console.error(`Done:    ${summary.done}`);
    console.error(`Needed:  ${summary.needed}`);
    console.error(`Blocked: ${summary.blocked}`);
    console.error(`Partial: ${summary.partial}`);
    console.error(`Errors:  ${summary.errors}`);
    console.error('');
  }

  return {
    results,
    summary
  };
}

/**
 * Main entry point
 */
async function main() {
  try {
    const { file, verbose, parallel, maxConcurrent } = parseArgs();

    // Read input
    const input = await readInput(file);

    // Validate input
    validateInput(input);

    // Verify tasks
    const output = await verifyTasksWithAgent(input.tasks, verbose, parallel, maxConcurrent);

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
  verifyTaskWithAgent,
  verifyTasksWithAgent,
  verifyTasksSequential,
  verifyTasksParallel,
  validateInput,
  readInput,
  parseArgs
};
