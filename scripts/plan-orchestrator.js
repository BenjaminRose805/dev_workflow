#!/usr/bin/env node

/**
 * Plan Orchestrator Helper Script
 *
 * Provides utilities for the orchestrator agent to query plan status
 * and determine next actions.
 *
 * ## Source of Truth
 *
 * This script reads from status.json as the PRIMARY source of truth for task
 * execution state. Markdown parsing is used as a FALLBACK only when status.json
 * is not available.
 *
 * - status.json: Authoritative task status (pending, in_progress, completed, etc.)
 * - Markdown: Reference documentation only; checkbox state is NOT reliable
 *
 * Usage:
 *   node scripts/plan-orchestrator.js <command> [options]
 *
 * Commands:
 *   status    - Get overall plan status
 *   next      - Get next recommended task(s)
 *   check     - Check if a specific task can be started
 *   deps      - Show dependency graph for a task
 *   phases    - List all phases with completion status
 */

const fs = require('fs');
const path = require('path');
const { getActivePlanPath, getActivePlanOutputPath } = require('./lib/plan-pointer');

/**
 * Load status.json for the plan
 */
function loadStatus(planPath) {
    const outputDir = getActivePlanOutputPath();
    if (!outputDir) return null;

    const statusPath = path.join(outputDir, 'status.json');
    try {
        const content = fs.readFileSync(statusPath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

/**
 * Load tasks from status.json (primary source) or fall back to markdown parsing
 *
 * status.json is THE authoritative source of truth for task execution state.
 * Markdown is only used as fallback when status.json doesn't exist.
 *
 * @param {string} planPath - Path to the plan file
 * @returns {{phases: Array, fromStatusJson: boolean}} Task data with source indicator
 */
function loadTasks(planPath) {
    const status = loadStatus(planPath);

    // PRIMARY: Use status.json if available
    if (status && status.tasks && status.tasks.length > 0) {
        // Convert status.json tasks into phase-grouped structure
        const phaseMap = new Map();

        for (const task of status.tasks) {
            const phaseName = task.phase || 'Unknown Phase';
            if (!phaseMap.has(phaseName)) {
                // Extract phase number from "Phase N: Title" format
                const phaseMatch = phaseName.match(/Phase\s+(\d+)/);
                const phaseNumber = phaseMatch ? parseInt(phaseMatch[1]) : 0;
                phaseMap.set(phaseName, {
                    number: phaseNumber,
                    title: phaseName.replace(/^Phase\s+\d+:\s*/, ''),
                    tasks: []
                });
            }

            phaseMap.get(phaseName).tasks.push({
                id: task.id,
                description: task.description,
                status: task.status,
                // Map status to completed flag for backwards compatibility
                completed: task.status === 'completed',
                phase: phaseMap.get(phaseName).number,
                startedAt: task.startedAt,
                completedAt: task.completedAt
            });
        }

        // Sort phases by number and return
        const phases = Array.from(phaseMap.values())
            .sort((a, b) => a.number - b.number);

        return { phases, fromStatusJson: true };
    }

    // FALLBACK: Parse markdown if status.json not available
    console.warn('Warning: status.json not found, falling back to markdown parsing. Task status may be inaccurate.');
    const parsed = parsePlan(planPath);
    return { phases: parsed.phases, fromStatusJson: false };
}

/**
 * Parse plan file to extract phases and tasks
 */
function parsePlan(planPath) {
    try {
        const content = fs.readFileSync(planPath, 'utf8');
        const lines = content.split('\n');

        const phases = [];
        let currentPhase = null;
        let currentTask = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match phase headers: ## Phase N: Title
            const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s*(.+)$/);
            if (phaseMatch) {
                currentPhase = {
                    number: parseInt(phaseMatch[1]),
                    title: phaseMatch[2].trim(),
                    tasks: []
                };
                phases.push(currentPhase);
                continue;
            }

            // Match task items: - [ ] N.N Description or - [x] N.N Description
            const taskMatch = line.match(/^-\s+\[([ x])\]\s+(\d+\.\d+(?:\.\d+)?)\s+(.+)$/);
            if (taskMatch && currentPhase) {
                currentPhase.tasks.push({
                    id: taskMatch[2],
                    description: taskMatch[3].trim(),
                    completed: taskMatch[1] === 'x',
                    phase: currentPhase.number
                });
                continue;
            }

            // Match subsection headers: ### N.N Task Name
            const subsectionMatch = line.match(/^###\s+(\d+\.\d+)\s+(.+)$/);
            if (subsectionMatch && currentPhase) {
                // Check if we already have this task from checklist
                const existingTask = currentPhase.tasks.find(t => t.id === subsectionMatch[1]);
                if (!existingTask) {
                    currentPhase.tasks.push({
                        id: subsectionMatch[1],
                        description: subsectionMatch[2].trim(),
                        completed: false,
                        phase: currentPhase.number
                    });
                }
            }
        }

        return { phases };
    } catch (e) {
        console.error('Error parsing plan:', e.message);
        return { phases: [] };
    }
}

/**
 * Merge plan structure with status data
 */
function mergePlanWithStatus(plan, status) {
    if (!status || !status.tasks) return plan;

    const statusMap = new Map(status.tasks.map(t => [t.id, t]));

    for (const phase of plan.phases) {
        for (const task of phase.tasks) {
            const taskStatus = statusMap.get(task.id);
            if (taskStatus) {
                task.status = taskStatus.status;
                task.startedAt = taskStatus.startedAt;
                task.completedAt = taskStatus.completedAt;
                task.notes = taskStatus.notes;
                task.findings = taskStatus.findings;
            } else {
                task.status = task.completed ? 'completed' : 'pending';
            }
        }
    }

    return plan;
}

/**
 * Get overall status summary
 */
function getStatusSummary(plan, status) {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let failed = 0;
    let skipped = 0;
    let pending = 0;

    for (const phase of plan.phases) {
        for (const task of phase.tasks) {
            total++;
            switch (task.status) {
                case 'completed': completed++; break;
                case 'in_progress': inProgress++; break;
                case 'failed': failed++; break;
                case 'skipped': skipped++; break;
                default: pending++;
            }
        }
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Find current phase (first phase with pending tasks)
    let currentPhase = null;
    for (const phase of plan.phases) {
        const hasPending = phase.tasks.some(t => t.status === 'pending' || t.status === 'in_progress');
        if (hasPending) {
            currentPhase = phase;
            break;
        }
    }

    return {
        total,
        completed,
        inProgress,
        failed,
        skipped,
        pending,
        percentage,
        currentPhase: currentPhase ? `Phase ${currentPhase.number}: ${currentPhase.title}` : 'All phases complete'
    };
}

/**
 * Get next recommended tasks
 */
function getNextTasks(plan, maxTasks = 3) {
    const next = [];

    // First, check for in-progress tasks
    for (const phase of plan.phases) {
        for (const task of phase.tasks) {
            if (task.status === 'in_progress') {
                next.push({
                    ...task,
                    reason: 'in_progress - should be completed first'
                });
            }
        }
    }

    if (next.length > 0) {
        return next.slice(0, maxTasks);
    }

    // Then, check for failed tasks that might be retried
    for (const phase of plan.phases) {
        for (const task of phase.tasks) {
            if (task.status === 'failed') {
                next.push({
                    ...task,
                    reason: 'failed - needs retry or manual intervention'
                });
            }
        }
    }

    // Finally, get pending tasks respecting phase order
    for (const phase of plan.phases) {
        // Check if this phase can be worked on (all previous phases substantially complete)
        const previousPhases = plan.phases.filter(p => p.number < phase.number);
        const previousIncomplete = previousPhases.some(p =>
            p.tasks.some(t => t.status === 'pending' || t.status === 'in_progress')
        );

        // Allow some flexibility - can start next phase if previous is mostly done
        const previousMostlyComplete = previousPhases.every(p => {
            const completed = p.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
            return completed >= p.tasks.length * 0.8; // 80% complete
        });

        if (previousIncomplete && !previousMostlyComplete) {
            continue; // Skip this phase for now
        }

        for (const task of phase.tasks) {
            if (task.status === 'pending' && next.length < maxTasks) {
                next.push({
                    ...task,
                    reason: 'pending - ready to implement'
                });
            }
        }

        if (next.length >= maxTasks) break;
    }

    return next;
}

/**
 * Check if a specific task can be started
 */
function checkTask(plan, taskId) {
    for (const phase of plan.phases) {
        const task = phase.tasks.find(t => t.id === taskId);
        if (task) {
            // Check if previous tasks in same phase are done
            const tasksInPhase = phase.tasks;
            const taskIndex = tasksInPhase.findIndex(t => t.id === taskId);

            // Check previous phases
            const previousPhases = plan.phases.filter(p => p.number < phase.number);
            const previousIncomplete = previousPhases.flatMap(p => p.tasks)
                .filter(t => t.status === 'pending' || t.status === 'in_progress');

            return {
                task,
                canStart: task.status === 'pending',
                blockers: previousIncomplete.map(t => t.id),
                phase: `Phase ${phase.number}: ${phase.title}`
            };
        }
    }

    return { error: `Task ${taskId} not found` };
}

/**
 * Get phases summary
 */
function getPhasesSummary(plan) {
    return plan.phases.map(phase => {
        const total = phase.tasks.length;
        const completed = phase.tasks.filter(t => t.status === 'completed').length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            number: phase.number,
            title: phase.title,
            total,
            completed,
            percentage,
            status: percentage === 100 ? 'complete' : percentage > 0 ? 'in_progress' : 'pending'
        };
    });
}

/**
 * Format output for display
 */
function formatOutput(data, format = 'pretty') {
    if (format === 'json') {
        return JSON.stringify(data, null, 2);
    }

    // Pretty format
    if (data.error) {
        return `Error: ${data.error}`;
    }

    return JSON.stringify(data, null, 2);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

// Get plan
const planPath = getActivePlanPath();
if (!planPath) {
    console.log(JSON.stringify({ error: 'No active plan set. Use /plan:set first.' }));
    process.exit(1);
}

// Check plan file exists
if (!fs.existsSync(planPath)) {
    console.log(JSON.stringify({ error: `Plan file not found: ${planPath}` }));
    process.exit(1);
}

// Load tasks from status.json (primary) or markdown (fallback)
// status.json is the authoritative source of truth for execution state
const { phases, fromStatusJson } = loadTasks(planPath);
const plan = { phases };
const status = loadStatus(planPath);

// If we're not using status.json, merge with whatever status exists
// (this maintains backwards compatibility when status.json is missing)
const mergedPlan = fromStatusJson ? plan : mergePlanWithStatus(plan, status);

switch (command) {
    case 'status': {
        const summary = getStatusSummary(mergedPlan, status);
        console.log(JSON.stringify({
            planPath,
            planName: status?.planName || path.basename(planPath, '.md'),
            source: fromStatusJson ? 'status.json' : 'markdown (fallback)',
            ...summary
        }, null, 2));
        break;
    }

    case 'next': {
        const maxTasks = parseInt(options[0]) || 3;
        const next = getNextTasks(mergedPlan, maxTasks);
        console.log(JSON.stringify({
            count: next.length,
            tasks: next.map(t => ({
                id: t.id,
                description: t.description,
                phase: t.phase,
                status: t.status,
                reason: t.reason
            }))
        }, null, 2));
        break;
    }

    case 'check': {
        const taskId = options[0];
        if (!taskId) {
            console.log(JSON.stringify({ error: 'Task ID required' }));
            process.exit(1);
        }
        const result = checkTask(mergedPlan, taskId);
        console.log(JSON.stringify(result, null, 2));
        break;
    }

    case 'phases': {
        const phases = getPhasesSummary(mergedPlan);
        console.log(JSON.stringify({ phases }, null, 2));
        break;
    }

    default:
        console.log(JSON.stringify({
            error: 'Unknown command',
            usage: 'node scripts/plan-orchestrator.js <status|next|check|phases> [options]',
            commands: {
                status: 'Get overall plan status',
                next: 'Get next recommended task(s) - optional: max count',
                check: 'Check if a task can be started - required: task ID',
                phases: 'List all phases with completion status'
            }
        }, null, 2));
}
