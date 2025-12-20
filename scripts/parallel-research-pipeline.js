#!/usr/bin/env node

/**
 * Parallel Research Pipeline for plan:batch
 *
 * Three-phase approach to accelerate batch task implementation:
 * - PHASE 1: Analysis agent computes dependency graph
 * - PHASE 2: Research agents (parallel) analyze each task
 * - PHASE 3: Returns aggregated results for main implementation
 *
 * Usage:
 *   echo '{"tasks": [...]}' | node scripts/parallel-research-pipeline.js
 *   node scripts/parallel-research-pipeline.js tasks.json --max-concurrent 5
 *
 * Input Format:
 *   {
 *     "tasks": [
 *       {
 *         "id": "1.1",
 *         "description": "Create websocket test",
 *         "context": "Part of Phase 1...",
 *         "priority": "HIGH"
 *       }
 *     ]
 *   }
 *
 * Output Format:
 *   {
 *     "dependency_graph": {
 *       "parallel_groups": [
 *         ["1.1", "1.2", "1.3"],  // Group 1: can run in parallel
 *         ["2.1", "2.2"],         // Group 2: depends on Group 1
 *         ["3.1"]                 // Group 3: depends on Group 2
 *       ],
 *       "dependencies": {
 *         "2.1": ["1.1", "1.2"],
 *         "3.1": ["2.1"]
 *       }
 *     },
 *     "research_results": [
 *       {
 *         "task_id": "1.1",
 *         "research": { ... },
 *         "confidence": 85
 *       }
 *     ],
 *     "timing": {
 *       "phase1_analysis_ms": 5234,
 *       "phase2_research_ms": 12456,
 *       "phase3_aggregation_ms": 45,
 *       "total_ms": 17735,
 *       "sequential_estimate_ms": 45000,
 *       "time_saved_ms": 27265,
 *       "speedup_factor": 2.54
 *     },
 *     "summary": {
 *       "total_tasks": 10,
 *       "parallel_groups": 3,
 *       "max_parallelism": 3,
 *       "researched": 10,
 *       "errors": 0,
 *       "avg_confidence": 87
 *     }
 *   }
 */

const fs = require('fs');
const { AgentPool, Priority } = require('./lib/agent-pool');
const { launchResearchAgent, ErrorCodes } = require('./lib/agent-launcher');
const { generateCacheKey } = require('./lib/agent-cache');

// Global configuration
let VERBOSE = false;
let MAX_CONCURRENT = 3;

/**
 * Verbose logging to stderr
 */
function verbose(...args) {
  if (VERBOSE) {
    console.error('[parallel-research]', ...args);
  }
}

/**
 * PHASE 1: Analyze task dependencies using analysis agent
 * Returns parallel execution groups and dependency mapping
 */
async function phase1_analyzeDependencies(tasks) {
  const startTime = Date.now();
  verbose('PHASE 1: Starting dependency analysis...');

  // Build question for analysis agent
  const taskList = tasks.map(t =>
    `- ${t.id}: ${t.description}${t.priority ? ` [${t.priority}]` : ''}`
  ).join('\n');

  const question = `
Analyze these tasks and determine which can be executed in parallel:

${taskList}

Identify:
1. Which tasks have NO dependencies and can run in first parallel group
2. Which tasks depend on others (look for file dependencies, shared modules, test setup)
3. Group tasks into parallel execution groups where each group depends on previous groups

Return ONLY a dependency graph showing parallel groups.
`.trim();

  const codebaseContext = `
This is a Next.js project with:
- Source code in src/
- Tests in tests/
- Scripts in scripts/
- Plans in docs/plans/

Tasks may involve creating tests, implementing features, or refactoring code.
Tasks can run in parallel if they:
- Touch different files
- Don't depend on each other's outputs
- Don't share test setup requirements
`.trim();

  try {
    // Launch analysis agent
    const response = await launchResearchAgent({
      template: 'analysis-agent.md',
      variables: {
        question,
        codebase_context: codebaseContext
      },
      timeout: 90000, // 90 seconds for analysis
      cwd: process.cwd()
    });

    if (!response.success) {
      verbose('PHASE 1: Analysis agent failed, falling back to simple grouping');
      // Fallback: Put all tasks in one group
      return {
        parallel_groups: [tasks.map(t => t.id)],
        dependencies: {},
        analysis_time_ms: Date.now() - startTime,
        fallback: true,
        error: response.error
      };
    }

    // Parse analysis result
    const analysisResult = response.result;
    verbose('PHASE 1: Analysis complete:', JSON.stringify(analysisResult.recommendation).substring(0, 100));

    // Extract parallel groups from analysis
    const parallelGroups = extractParallelGroups(analysisResult, tasks);
    const dependencies = extractDependencies(analysisResult, tasks);

    const elapsed = Date.now() - startTime;
    verbose(`PHASE 1: Complete in ${elapsed}ms - ${parallelGroups.length} parallel groups identified`);

    return {
      parallel_groups: parallelGroups,
      dependencies,
      analysis_time_ms: elapsed,
      fallback: false,
      raw_analysis: VERBOSE ? analysisResult : undefined
    };

  } catch (error) {
    verbose('PHASE 1: Exception during analysis:', error.message);
    // Fallback on error
    return {
      parallel_groups: [tasks.map(t => t.id)],
      dependencies: {},
      analysis_time_ms: Date.now() - startTime,
      fallback: true,
      error: { message: error.message, code: 'ANALYSIS_EXCEPTION' }
    };
  }
}

/**
 * Extract parallel groups from analysis agent result
 * Looks for structured recommendations about grouping
 */
function extractParallelGroups(analysisResult, tasks) {
  // Try to find parallel groups in the recommendation or options
  const recommendation = analysisResult.recommendation || '';
  const evidence = analysisResult.evidence || [];

  // Look for patterns like "Group 1: task1, task2, task3"
  const groups = [];
  const groupPattern = /Group\s+\d+[:\s]+([0-9.,\s]+)/gi;
  let match;

  const allEvidence = [recommendation, ...evidence].join('\n');

  while ((match = groupPattern.exec(allEvidence)) !== null) {
    const taskIds = match[1]
      .split(/[,\s]+/)
      .filter(id => id.match(/^\d+\.\d+$/))
      .filter(id => tasks.some(t => t.id === id));

    if (taskIds.length > 0) {
      groups.push(taskIds);
    }
  }

  // If no groups found, use heuristic-based grouping
  if (groups.length === 0) {
    return heuristicGrouping(tasks);
  }

  // Ensure all tasks are included
  const includedTasks = new Set(groups.flat());
  const missingTasks = tasks
    .filter(t => !includedTasks.has(t.id))
    .map(t => t.id);

  if (missingTasks.length > 0) {
    groups.push(missingTasks);
  }

  return groups;
}

/**
 * Extract task dependencies from analysis result
 */
function extractDependencies(analysisResult, tasks) {
  const dependencies = {};
  const evidence = analysisResult.evidence || [];

  // Look for dependency patterns like "2.1 depends on 1.1, 1.2"
  const depPattern = /(\d+\.\d+)\s+depends?\s+on[:\s]+([0-9.,\s]+)/gi;
  let match;

  const allEvidence = [
    analysisResult.recommendation || '',
    ...evidence
  ].join('\n');

  while ((match = depPattern.exec(allEvidence)) !== null) {
    const taskId = match[1];
    const deps = match[2]
      .split(/[,\s]+/)
      .filter(id => id.match(/^\d+\.\d+$/))
      .filter(id => tasks.some(t => t.id === id));

    if (deps.length > 0 && tasks.some(t => t.id === taskId)) {
      dependencies[taskId] = deps;
    }
  }

  return dependencies;
}

/**
 * Fallback heuristic grouping when analysis agent fails
 * Groups by task ID prefix (e.g., "1.x" tasks together)
 */
function heuristicGrouping(tasks) {
  const groups = new Map();

  for (const task of tasks) {
    const prefix = task.id.split('.')[0];
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push(task.id);
  }

  return Array.from(groups.values());
}

/**
 * PHASE 2: Research each task in parallel using agent pool
 */
async function phase2_parallelResearch(tasks, dependencyGraph) {
  const startTime = Date.now();
  verbose(`PHASE 2: Starting parallel research for ${tasks.length} tasks (max concurrent: ${MAX_CONCURRENT})`);

  // Create agent pool
  const pool = new AgentPool({
    maxConcurrent: MAX_CONCURRENT,
    enableCache: true,
    cacheTTL: 3600000, // 1 hour
    maxRetries: 1,
    verbose: VERBOSE
  });

  // Track results
  const results = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Add research tasks to pool with priority based on dependency graph
  for (let groupIndex = 0; groupIndex < dependencyGraph.parallel_groups.length; groupIndex++) {
    const group = dependencyGraph.parallel_groups[groupIndex];

    // Higher priority for earlier groups (they unblock later groups)
    const priority = groupIndex === 0
      ? Priority.HIGH
      : groupIndex === 1
        ? Priority.NORMAL
        : Priority.LOW;

    for (const taskId of group) {
      const task = taskMap.get(taskId);
      if (!task) continue;

      pool.addTask({
        id: taskId,
        priority,
        fn: async () => {
          return await researchSingleTask(task);
        },
        cacheKey: {
          description: `research:${task.id}:${task.description}`,
          files: [] // Could add relevant files here
        },
        metadata: {
          taskId: task.id,
          groupIndex,
          description: task.description
        }
      });
    }
  }

  // Set up event listeners for progress tracking
  pool.on('taskCompleted', (task) => {
    const result = task.state === 'COMPLETED' ? task.result : {
      task_id: task.id,
      error: task.error,
      research: null,
      confidence: 0
    };
    results.push(result);

    verbose(`Research complete for task ${task.id}: ${task.state} (${results.length}/${tasks.length})`);
  });

  // Start the pool
  await pool.start();

  // Wait for all tasks to complete
  await pool.waitForCompletion(300000); // 5 minute timeout

  // Graceful shutdown
  await pool.shutdown({ timeout: 5000 });

  const elapsed = Date.now() - startTime;
  const stats = pool.getStats();

  verbose(`PHASE 2: Complete in ${elapsed}ms - ${stats.tasks.completed}/${tasks.length} succeeded`);

  return {
    results: results.sort((a, b) => {
      // Sort by original task order
      const indexA = tasks.findIndex(t => t.id === a.task_id);
      const indexB = tasks.findIndex(t => t.id === b.task_id);
      return indexA - indexB;
    }),
    research_time_ms: elapsed,
    pool_stats: stats
  };
}

/**
 * Research a single task using research agent
 */
async function researchSingleTask(task) {
  const { id, description, context = '', priority = 'NORMAL' } = task;

  const taskDescription = `
Research how to implement this task:

**Task ID:** ${id}
**Priority:** ${priority}
**Task:** ${description}
${context ? `**Context:** ${context}` : ''}

Focus on:
1. Target file location and naming convention
2. Similar existing patterns to follow
3. Dependencies and imports needed
4. Implementation approach based on codebase patterns
5. Complexity estimate (low/medium/high)

Return findings in standard research agent JSON format.
`.trim();

  try {
    const response = await launchResearchAgent({
      template: 'research-agent.md',
      variables: {
        task_description: taskDescription,
        context: context || 'No additional context provided.'
      },
      timeout: 60000, // 60 seconds per task
      cwd: process.cwd()
    });

    if (!response.success) {
      return {
        task_id: id,
        error: response.error,
        research: null,
        confidence: 0
      };
    }

    const agentResult = response.result;

    // Transform findings into structured research
    const research = {
      target_file: extractTargetFile(agentResult, task),
      patterns: extractPatterns(agentResult),
      dependencies: extractDeps(agentResult),
      suggested_approach: agentResult.summary || agentResult.recommendation || '',
      complexity: extractComplexity(agentResult),
      files_analyzed: agentResult.evidence?.files_analyzed || [],
      locations: agentResult.evidence?.locations || []
    };

    return {
      task_id: id,
      research,
      confidence: agentResult.confidence || 0,
      raw_findings: VERBOSE ? agentResult.findings : undefined
    };

  } catch (error) {
    return {
      task_id: id,
      error: {
        code: 'RESEARCH_EXCEPTION',
        message: error.message
      },
      research: null,
      confidence: 0
    };
  }
}

/**
 * Extract target file from agent result
 */
function extractTargetFile(agentResult, task) {
  const findings = agentResult.findings || [];
  const evidence = agentResult.evidence || [];

  // Look for file paths in findings
  const allText = [
    ...findings.map(f => typeof f === 'string' ? f : f.description || ''),
    ...evidence
  ].join('\n');

  const fileMatch = allText.match(/[\w\-./]+\.(ts|tsx|js|jsx|json|md)/);
  if (fileMatch) {
    return fileMatch[0];
  }

  // Try task description
  const descMatch = task.description.match(/[\w\-./]+\.(ts|tsx|js|jsx|json|md)/);
  return descMatch ? descMatch[0] : null;
}

/**
 * Extract patterns from agent result
 */
function extractPatterns(agentResult) {
  const patterns = [];
  const existingPatterns = agentResult.existing_patterns || [];

  for (const pattern of existingPatterns) {
    const desc = typeof pattern === 'string' ? pattern : pattern.pattern || pattern.description || '';
    if (desc) patterns.push(desc);
  }

  return patterns;
}

/**
 * Extract dependencies from agent result
 */
function extractDeps(agentResult) {
  const deps = [];

  if (agentResult.dependencies) {
    const currentlyInstalled = agentResult.dependencies.currently_installed || [];
    const needToAdd = agentResult.dependencies.would_need_to_add || [];

    deps.push(...currentlyInstalled, ...needToAdd);
  }

  return [...new Set(deps)]; // Deduplicate
}

/**
 * Extract complexity from agent result
 */
function extractComplexity(agentResult) {
  const text = JSON.stringify(agentResult).toLowerCase();

  if (text.includes('simple') || text.includes('straightforward')) {
    return 'low';
  } else if (text.includes('complex') || text.includes('challenging')) {
    return 'high';
  }

  return 'medium';
}

/**
 * PHASE 3: Aggregate results and compute metrics
 */
function phase3_aggregateResults(dependencyGraph, researchResults, timings) {
  const startTime = Date.now();
  verbose('PHASE 3: Aggregating results...');

  // Calculate summary statistics
  const total = researchResults.results.length;
  const errors = researchResults.results.filter(r => r.error).length;
  const researched = total - errors;
  const totalConfidence = researchResults.results.reduce((sum, r) => sum + (r.confidence || 0), 0);
  const avgConfidence = researched > 0 ? Math.round(totalConfidence / researched) : 0;

  // Estimate sequential time (sum of all task times)
  const avgTaskTime = researchResults.research_time_ms / MAX_CONCURRENT;
  const sequentialEstimate = avgTaskTime * total;
  const actualTime = timings.phase1 + timings.phase2;
  const timeSaved = sequentialEstimate - actualTime;
  const speedupFactor = sequentialEstimate / actualTime;

  const aggregationTime = Date.now() - startTime;
  verbose(`PHASE 3: Complete in ${aggregationTime}ms`);

  return {
    dependency_graph: {
      parallel_groups: dependencyGraph.parallel_groups,
      dependencies: dependencyGraph.dependencies
    },
    research_results: researchResults.results,
    timing: {
      phase1_analysis_ms: timings.phase1,
      phase2_research_ms: timings.phase2,
      phase3_aggregation_ms: aggregationTime,
      total_ms: actualTime + aggregationTime,
      sequential_estimate_ms: Math.round(sequentialEstimate),
      time_saved_ms: Math.round(timeSaved),
      speedup_factor: parseFloat(speedupFactor.toFixed(2))
    },
    summary: {
      total_tasks: total,
      parallel_groups: dependencyGraph.parallel_groups.length,
      max_parallelism: Math.max(...dependencyGraph.parallel_groups.map(g => g.length)),
      researched,
      errors,
      avg_confidence: avgConfidence
    }
  };
}

/**
 * Main pipeline execution
 */
async function runParallelResearchPipeline(tasks) {
  verbose(`Starting parallel research pipeline for ${tasks.length} tasks`);
  const overallStart = Date.now();

  // PHASE 1: Analyze dependencies
  const dependencyGraph = await phase1_analyzeDependencies(tasks);
  const phase1Time = dependencyGraph.analysis_time_ms;

  // PHASE 2: Parallel research
  const researchResults = await phase2_parallelResearch(tasks, dependencyGraph);
  const phase2Time = researchResults.research_time_ms;

  // PHASE 3: Aggregate
  const finalResults = phase3_aggregateResults(
    dependencyGraph,
    researchResults,
    { phase1: phase1Time, phase2: phase2Time }
  );

  const totalTime = Date.now() - overallStart;
  verbose(`Pipeline complete in ${totalTime}ms (speedup: ${finalResults.timing.speedup_factor}x)`);

  return finalResults;
}

/**
 * Read input from stdin or file
 */
function readInput(filePath) {
  return new Promise((resolve, reject) => {
    if (filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        resolve(content);
      } catch (err) {
        reject(new Error(`Failed to read file ${filePath}: ${err.message}`));
      }
    } else {
      let data = '';
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => { resolve(data); });
      process.stdin.on('error', err => { reject(err); });
    }
  });
}

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let inputFile = null;
  let verbose = false;
  let maxConcurrent = 3;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--max-concurrent' || arg === '-c') {
      maxConcurrent = parseInt(args[++i], 10) || 3;
    } else if (!arg.startsWith('-')) {
      inputFile = arg;
    }
  }

  return { inputFile, verbose, maxConcurrent };
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Parse arguments
    const { inputFile, verbose, maxConcurrent } = parseArgs();
    VERBOSE = verbose;
    MAX_CONCURRENT = Math.max(1, Math.min(10, maxConcurrent));

    verbose(`Configuration: max_concurrent=${MAX_CONCURRENT}, verbose=${VERBOSE}`);

    // Read input
    const inputContent = await readInput(inputFile);

    if (!inputContent.trim()) {
      console.error('Error: No input provided');
      console.error('Usage: echo \'{"tasks": [...]}\' | node scripts/parallel-research-pipeline.js');
      console.error('   or: node scripts/parallel-research-pipeline.js tasks.json --max-concurrent 5');
      process.exit(1);
    }

    // Parse JSON
    let inputData;
    try {
      inputData = JSON.parse(inputContent);
    } catch (err) {
      console.error('Error: Invalid JSON input');
      console.error(err.message);
      process.exit(1);
    }

    // Validate input
    if (!inputData.tasks || !Array.isArray(inputData.tasks)) {
      console.error('Error: Input must have a "tasks" array');
      console.error('Expected: {"tasks": [{"id": "1.1", "description": "...", "context": "...", "priority": "HIGH"}]}');
      process.exit(1);
    }

    for (const task of inputData.tasks) {
      if (!task.id || !task.description) {
        console.error('Error: Each task must have "id" and "description"');
        console.error(`Invalid task: ${JSON.stringify(task)}`);
        process.exit(1);
      }
    }

    verbose(`Processing ${inputData.tasks.length} tasks with parallel research pipeline`);

    // Run pipeline
    const results = await runParallelResearchPipeline(inputData.tasks);

    // Output JSON to stdout
    console.log(JSON.stringify(results, null, 2));

    // Exit with error if there were errors
    if (results.summary.errors > 0) {
      verbose(`Exiting with code 1 due to ${results.summary.errors} error(s)`);
      process.exit(1);
    }

    verbose('Pipeline completed successfully');
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
  runParallelResearchPipeline,
  phase1_analyzeDependencies,
  phase2_parallelResearch,
  phase3_aggregateResults
};
