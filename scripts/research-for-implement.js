#!/usr/bin/env node

/**
 * Research for Implementation Script
 *
 * Invokes research agents to analyze tasks before implementation.
 * Helps gather context about file locations, patterns, dependencies, and approach.
 *
 * Usage:
 *   echo '{"tasks": [...]}' | node scripts/research-for-implement.js
 *   node scripts/research-for-implement.js tasks.json
 *   node scripts/research-for-implement.js --verbose < tasks.json
 *
 * Input Format:
 *   {
 *     "tasks": [
 *       {
 *         "id": "1.1",
 *         "description": "Create websocket-connection.test.ts",
 *         "context": "Part of Phase 1: Critical Unit Tests..."
 *       }
 *     ]
 *   }
 *
 * Output Format:
 *   {
 *     "results": [
 *       {
 *         "task_id": "1.1",
 *         "research": {
 *           "target_file": "tests/unit/lib/websocket-connection.test.ts",
 *           "patterns": [...],
 *           "dependencies": [...],
 *           "suggested_approach": "...",
 *           "complexity": "medium"
 *         },
 *         "confidence": 85
 *       }
 *     ],
 *     "summary": {
 *       "total": 1,
 *       "researched": 1,
 *       "errors": 0,
 *       "avg_confidence": 85
 *     }
 *   }
 */

const fs = require('fs');
const path = require('path');
const { launchResearchAgent } = require('./lib/agent-launcher');
const { fileExists, resolvePath } = require('./lib/file-utils');

// Global verbose flag
let VERBOSE = false;

/**
 * Log verbose output to stderr
 * @param {...any} args - Arguments to log
 */
function verbose(...args) {
  if (VERBOSE) {
    console.error('[VERBOSE]', ...args);
  }
}

/**
 * Research a single task using the research agent
 * @param {object} task - Task object with id, description, context
 * @returns {Promise<object>} Research result for this task
 */
async function researchTask(task) {
  const { id, description, context = '' } = task;

  verbose(`Starting research for task ${id}: ${description}`);

  // Build detailed task description for the agent
  const taskDescription = `
Research how to implement this task:

**Task ID:** ${id}
**Task:** ${description}

Your research should focus on:
1. **Target file location and structure** - Where should this be implemented? What's the file path pattern?
2. **Similar existing patterns** - Find similar implementations in the codebase to follow
3. **Dependencies and imports** - What modules/packages need to be imported?
4. **Test file patterns** (if implementing tests) - What testing patterns are used?
5. **Suggested implementation approach** - Based on codebase patterns, how should this be implemented?
6. **Complexity estimate** - Rate as "low", "medium", or "high" based on scope

Return your findings in the standard research agent JSON format.
`.trim();

  try {
    // Launch research agent
    const response = await launchResearchAgent({
      template: 'research-agent.md',
      variables: {
        task_description: taskDescription,
        context: context || 'No additional context provided.'
      },
      timeout: 60000, // 60 seconds per task
      cwd: process.cwd()
    });

    // Check if agent call succeeded
    if (!response.success) {
      verbose(`Research failed for task ${id}:`, response.error);
      return {
        task_id: id,
        error: response.error,
        research: null,
        confidence: 0
      };
    }

    const agentResult = response.result;
    verbose(`Research completed for task ${id} with confidence ${agentResult.confidence}`);

    // Transform agent findings into implementation-focused research
    const research = transformFindings(agentResult, task);

    return {
      task_id: id,
      research,
      confidence: agentResult.confidence || 0,
      raw_findings: VERBOSE ? agentResult.findings : undefined
    };

  } catch (err) {
    verbose(`Exception during research for task ${id}:`, err);
    return {
      task_id: id,
      error: {
        code: 'RESEARCH_EXCEPTION',
        message: err.message,
        context: { taskId: id }
      },
      research: null,
      confidence: 0
    };
  }
}

/**
 * Transform agent findings into implementation-focused research
 * @param {object} agentResult - Raw agent result
 * @param {object} task - Original task
 * @returns {object} Transformed research object
 */
function transformFindings(agentResult, task) {
  const { findings = [], evidence = {}, summary = '' } = agentResult;

  // Extract key information from findings
  let targetFile = null;
  const patterns = [];
  const dependencies = [];
  let suggestedApproach = summary;
  let complexity = 'medium';

  // Parse findings for specific information
  for (const finding of findings) {
    const findingText = typeof finding === 'string' ? finding : finding.description || '';
    const lowerFinding = findingText.toLowerCase();

    // Detect target file mentions
    if (lowerFinding.includes('target file') || lowerFinding.includes('should be created')) {
      // Try to extract file path from finding
      const pathMatch = findingText.match(/[\w\-./]+\.(ts|tsx|js|jsx|json|md)/);
      if (pathMatch) {
        targetFile = pathMatch[0];
      }
    }

    // Detect patterns
    if (lowerFinding.includes('pattern') || lowerFinding.includes('uses ') || lowerFinding.includes('follows')) {
      patterns.push(findingText);
    }

    // Detect dependencies
    if (lowerFinding.includes('import') || lowerFinding.includes('dependency') || lowerFinding.includes('require')) {
      dependencies.push(findingText);
    }

    // Detect complexity hints
    if (lowerFinding.includes('simple') || lowerFinding.includes('straightforward')) {
      complexity = 'low';
    } else if (lowerFinding.includes('complex') || lowerFinding.includes('challenging')) {
      complexity = 'high';
    }
  }

  // If no target file found, try to infer from task description
  if (!targetFile) {
    const taskDesc = task.description || '';
    const fileMatch = taskDesc.match(/[\w\-./]+\.(ts|tsx|js|jsx|json|md)/);
    if (fileMatch) {
      targetFile = fileMatch[0];
    }
  }

  // Extract patterns from evidence if available
  if (evidence.patterns_found && Array.isArray(evidence.patterns_found)) {
    patterns.push(...evidence.patterns_found);
  }

  // Build suggested approach from summary or findings
  if (!suggestedApproach && findings.length > 0) {
    suggestedApproach = `Based on research findings: ${findings.slice(0, 3).map(f =>
      typeof f === 'string' ? f : f.description
    ).join('; ')}`;
  }

  return {
    target_file: targetFile,
    patterns: [...new Set(patterns)], // Deduplicate
    dependencies: [...new Set(dependencies)], // Deduplicate
    suggested_approach: suggestedApproach,
    complexity,
    files_analyzed: evidence.files_analyzed || [],
    locations: evidence.locations || []
  };
}

/**
 * Main function: Research multiple tasks
 * @param {Array} tasks - Array of task objects
 * @returns {Promise<object>} Results object with summary
 */
async function researchForImplementation(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return {
      results: [],
      summary: {
        total: 0,
        researched: 0,
        errors: 0,
        avg_confidence: 0
      }
    };
  }

  verbose(`Starting research for ${tasks.length} task(s)`);

  // Research each task sequentially to avoid overwhelming the system
  const results = [];
  for (const task of tasks) {
    const result = await researchTask(task);
    results.push(result);
  }

  // Calculate summary statistics
  const total = results.length;
  const errors = results.filter(r => r.error).length;
  const researched = total - errors;
  const totalConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0);
  const avgConfidence = researched > 0 ? Math.round(totalConfidence / researched) : 0;

  verbose(`Research complete: ${researched}/${total} succeeded, ${errors} errors`);

  return {
    results,
    summary: {
      total,
      researched,
      errors,
      avg_confidence: avgConfidence
    }
  };
}

/**
 * Read input from stdin or file
 * @param {string|null} filePath - Optional file path
 * @returns {Promise<string>} Input content
 */
function readInput(filePath) {
  return new Promise((resolve, reject) => {
    if (filePath) {
      // Read from file
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        resolve(content);
      } catch (err) {
        reject(new Error(`Failed to read file ${filePath}: ${err.message}`));
      }
    } else {
      // Read from stdin
      let data = '';
      process.stdin.setEncoding('utf-8');

      process.stdin.on('data', chunk => {
        data += chunk;
      });

      process.stdin.on('end', () => {
        resolve(data);
      });

      process.stdin.on('error', err => {
        reject(new Error(`Failed to read stdin: ${err.message}`));
      });
    }
  });
}

/**
 * Parse CLI arguments
 * @returns {object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let inputFile = null;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (!arg.startsWith('-')) {
      inputFile = arg;
    }
  }

  return { inputFile, verbose };
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Parse arguments
    const { inputFile, verbose } = parseArgs();
    VERBOSE = verbose;

    verbose('Research for Implementation script starting...');
    verbose(`Input source: ${inputFile || 'stdin'}`);

    // Read input
    const inputContent = await readInput(inputFile);

    if (!inputContent.trim()) {
      console.error('Error: No input provided');
      console.error('Usage: echo \'{"tasks": [...]}\' | node scripts/research-for-implement.js');
      console.error('   or: node scripts/research-for-implement.js tasks.json');
      process.exit(1);
    }

    // Parse JSON input
    let inputData;
    try {
      inputData = JSON.parse(inputContent);
    } catch (err) {
      console.error('Error: Invalid JSON input');
      console.error(err.message);
      process.exit(1);
    }

    // Validate input structure
    if (!inputData.tasks || !Array.isArray(inputData.tasks)) {
      console.error('Error: Input must have a "tasks" array');
      console.error('Expected format: {"tasks": [{"id": "1.1", "description": "...", "context": "..."}]}');
      process.exit(1);
    }

    // Validate task objects
    for (const task of inputData.tasks) {
      if (!task.id || !task.description) {
        console.error(`Error: Each task must have "id" and "description" fields`);
        console.error(`Invalid task: ${JSON.stringify(task)}`);
        process.exit(1);
      }
    }

    verbose(`Found ${inputData.tasks.length} task(s) to research`);

    // Run research
    const results = await researchForImplementation(inputData.tasks);

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Exit with error code if there were errors
    if (results.summary.errors > 0) {
      verbose(`Exiting with code 1 due to ${results.summary.errors} error(s)`);
      process.exit(1);
    }

    verbose('Research completed successfully');
    process.exit(0);

  } catch (err) {
    console.error('Fatal error:', err.message);
    if (VERBOSE) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing/reuse
module.exports = {
  researchForImplementation,
  researchTask,
  transformFindings
};
