# Timestamps Output Format Specification

This document defines the structure for timestamp files written to `docs/plan-outputs/{plan-name}/timestamps/`.

## Purpose

The `timestamps/` directory stores execution timing data separate from status.json, providing:
- Detailed timing for performance analysis
- Historical run data for auditing
- Granular task timing for optimization

## File Structure

```
timestamps/
├── runs/                     # Per-run timing data
│   ├── run-{timestamp}.json  # Individual run timing
│   └── ...
├── tasks/                    # Per-task timing history
│   ├── {task-id}.json        # Task timing across runs
│   └── ...
└── summary.json              # Aggregated timing statistics
```

## Run Timing Format

**File:** `timestamps/runs/run-{timestamp}.json`

```json
{
  "runId": "run-1734567890123",
  "startedAt": "2025-12-18T22:30:00.000Z",
  "completedAt": "2025-12-18T22:45:30.000Z",
  "durationMs": 930000,
  "tasksExecuted": [
    {
      "taskId": "1.1",
      "startedAt": "2025-12-18T22:30:05.000Z",
      "completedAt": "2025-12-18T22:32:15.000Z",
      "durationMs": 130000,
      "status": "completed"
    },
    {
      "taskId": "1.2",
      "startedAt": "2025-12-18T22:32:20.000Z",
      "completedAt": "2025-12-18T22:35:45.000Z",
      "durationMs": 205000,
      "status": "completed"
    }
  ],
  "summary": {
    "totalTasks": 5,
    "completed": 4,
    "failed": 1,
    "skipped": 0,
    "parallelGroups": 2,
    "avgTaskDuration": 156000
  }
}
```

## Task Timing Format

**File:** `timestamps/tasks/{task-id}.json`

Where `{task-id}` has dots replaced with hyphens (e.g., `1-1.json`).

```json
{
  "taskId": "1.1",
  "description": "Create status-manager.js",
  "executions": [
    {
      "runId": "run-1734567890123",
      "startedAt": "2025-12-18T22:30:05.000Z",
      "completedAt": "2025-12-18T22:32:15.000Z",
      "durationMs": 130000,
      "status": "completed"
    },
    {
      "runId": "run-1734600000000",
      "startedAt": "2025-12-19T10:00:00.000Z",
      "completedAt": "2025-12-19T10:02:30.000Z",
      "durationMs": 150000,
      "status": "completed"
    }
  ],
  "statistics": {
    "totalExecutions": 2,
    "successRate": 1.0,
    "avgDurationMs": 140000,
    "minDurationMs": 130000,
    "maxDurationMs": 150000
  }
}
```

## Summary Format

**File:** `timestamps/summary.json`

```json
{
  "planPath": "docs/plans/my-plan.md",
  "planName": "My Plan",
  "totalRuns": 3,
  "lastRun": "2025-12-19T10:00:00.000Z",
  "totalExecutionTime": 2800000,
  "averageRunTime": 933333,
  "taskStatistics": {
    "avgTaskDuration": 145000,
    "fastestTask": {
      "taskId": "0.1",
      "avgDurationMs": 5000
    },
    "slowestTask": {
      "taskId": "2.2",
      "avgDurationMs": 350000
    }
  },
  "parallelizationStats": {
    "avgParallelGroups": 3,
    "estimatedSequentialTime": 4200000,
    "actualTime": 2800000,
    "timeSavedPercent": 33
  }
}
```

## Usage

### Recording Run Timing

```javascript
const { recordRunTiming, recordTaskTiming } = require('./scripts/lib/timestamp-utils');

// Start a run
const runId = startRun(planPath);

// Record task timing (called after each task)
recordTaskTiming(planPath, taskId, {
  runId,
  startedAt,
  completedAt,
  status: 'completed'
});

// Complete the run
completeRun(planPath, runId, completed, failed);
```

### Querying Timing Data

```javascript
const { getRunTiming, getTaskHistory, getSummary } = require('./scripts/lib/timestamp-utils');

// Get specific run
const run = getRunTiming(planPath, runId);

// Get task history
const taskHistory = getTaskHistory(planPath, '1.1');

// Get overall summary
const summary = getSummary(planPath);
```

## Integration with Status

The `timestamps/` directory complements `status.json`:
- `status.json` - Current state, task statuses, basic timing
- `timestamps/` - Historical timing data, statistics, performance analysis

When displaying status, timing data can be pulled from timestamps for richer information.

## Cleanup

Old timestamp data can be pruned:
- Keep last N runs (configurable, default 10)
- Archive runs older than X days
- Aggregate old data into summary before deletion
