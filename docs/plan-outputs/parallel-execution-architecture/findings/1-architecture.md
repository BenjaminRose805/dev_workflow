# Phase 1: Architecture Discovery Findings

**Analysis Plan:** Parallel Execution Architecture
**Tasks Covered:** 1.1, 1.2, 1.3, 1.4, 1.5
**Date:** 2025-12-25

---

## 1.1 Plan-Related Files Map

### Claude Commands (`.claude/commands/plan/`)

| File | Purpose | Key Relationships |
|------|---------|-------------------|
| `orchestrate.md` | Autonomous execution loop - runs plan to completion | Calls `status-cli.js`, spawns Task agents |
| `implement.md` | Implement specific tasks from plan | Core execution engine, supports `--autonomous` mode |
| `batch.md` | Execute multiple tasks with parallel support | Uses Task tool for parallel agents |
| `verify.md` | Check task completion status | Updates status.json, uses `check-file-status.js` |
| `status.md` | Display plan progress summary | Reads from status.json |
| `set.md` | Set active plan | Writes to `.claude/current-plan.txt`, calls `status-cli.js init` |
| `create.md` | Create plan from template | Creates plan file, initializes status tracking |
| `split.md` | Split tasks into subtasks | Modifies plan structure |
| `explain.md` | Explain plan tasks | Read-only analysis |
| `archive.md` | Archive completed plans | Moves completed plans |
| `templates.md` | List available templates | Read-only |
| `migrate.md` | Migrate plan to output-separated format | Creates status.json from existing plan |
| `_common/status-tracking.md` | Shared status tracking reference | Included by other commands |

### Scripts (`scripts/`)

| File | Purpose | Called By |
|------|---------|-----------|
| `status-cli.js` | CLI for all status operations | All plan commands |
| `lib/plan-status.js` | Core status management library | `status-cli.js`, `scan-plans.js` |
| `scan-plans.js` | Scan all plans, return JSON | `set.md` |
| `lib/markdown-parser.js` | Parse plan markdown structure | `plan-status.js`, `scan-plans.js` |
| `lib/plan-output-utils.js` | Retry, stuck task detection | `status-cli.js` |
| `check-file-status.js` | Batch file verification | `verify.md` |
| `validate-plan-format.js` | Validate plan structure | Manual validation |

### State Files

| File | Purpose | Updated By |
|------|---------|------------|
| `.claude/current-plan.txt` | Active plan pointer | `set.md`, `create.md` |
| `docs/plan-outputs/{plan}/status.json` | Task execution state (source of truth) | `status-cli.js` |
| `docs/plan-outputs/{plan}/findings/*.md` | Task findings/output | `implement.md`, `verify.md` |
| `docs/plans/*.md` | Plan definitions (read-only during execution) | `create.md` only |

### File Relationship Diagram

```
.claude/current-plan.txt  ─────────────────────────────────────┐
       │                                                        │
       └───► docs/plans/{plan}.md  ◄───── Plan Definition       │
                    │                     (NOT modified         │
                    │                      during execution)    │
                    ▼                                           │
       plan-status.js::initializePlanStatus()                   │
                    │                                           │
                    ▼                                           │
       docs/plan-outputs/{plan}/                                │
                    ├── status.json  ◄── Source of Truth        │
                    ├── findings/    ◄── Task outputs           │
                    └── timestamps/  ◄── Timing data            │
                                                                │
       All plan:* commands read current-plan.txt ───────────────┘
```

---

## 1.2 Orchestrator Implementation (`plan:orchestrate`)

### Purpose
Autonomous execution loop that runs a plan from start to finish without user intervention.

### Execution Loop

```
1. Initialize
   ├── Load status via `node scripts/status-cli.js status`
   ├── Check for active plan
   └── Read plan file for context

2. Main Loop (REPEAT UNTIL COMPLETE)
   │
   ├── Step 2.1: Get Next Tasks
   │   └── `node scripts/status-cli.js next 5`
   │
   ├── Step 2.2: Execute Tasks in Parallel
   │   ├── Launch up to 3-5 Task agents simultaneously
   │   ├── Use subagent_type="general-purpose"
   │   └── Each agent marks own task started/complete
   │
   ├── Step 2.3: Collect Results
   │   └── Wait for all agents via TaskOutput
   │
   ├── Step 2.4: Report Progress
   │   └── Output formatted status update
   │
   └── Step 2.5: Loop Back (IMMEDIATELY)

3. Completion
   └── Output final summary when percentage == 100
```

### Parallelization Rules (from orchestrate.md)

| Condition | Execution Mode |
|-----------|----------------|
| Same phase tasks | Parallel (up to 5) |
| Cross-phase tasks | Sequential (complete earlier phases first) |
| Dependencies exist | Sequential |

### Batch Size Guidelines

| Plan Size | Batch Size | Rationale |
|-----------|------------|-----------|
| < 10 tasks | 2-3 | Small plan, quick iteration |
| 10-30 tasks | 3-4 | Medium plan, balanced |
| > 30 tasks | 4-5 | Large plan, maximize throughput |

### Error Handling
- Task failures: Mark failed, continue with non-dependent tasks
- Agent timeout: 10 minutes default, mark as failed
- Retry: Failed tasks retried at end (max 2 retries)

---

## 1.3 How `plan:implement` Executes Tasks

### Argument Parsing

| Format | Example | Behavior |
|--------|---------|----------|
| Single task | `1.1` | Implement one task |
| Multiple tasks | `1.1 1.2 1.3` | Implement listed tasks |
| Phase selector | `phase:1` or `p:1` | All pending in phase |
| All pending | `all` | All pending tasks |
| Autonomous | `--autonomous` | Skip confirmations |

### Execution Flow

```
1. Load active plan + initialize status
2. Parse arguments (or interactive selection)
3. Detect execution constraints:
   ├── Look for **Execution Note:** [SEQUENTIAL]
   ├── Detect file conflicts (same file → sequential)
   └── Respect phase ordering
4. Show execution preview
5. For each task:
   ├── Mark started: markTaskStarted(planPath, taskId)
   ├── Analyze task complexity
   ├── Spawn agents (parallel if independent)
   ├── Agents return content (read-only pattern)
   ├── Main conversation writes files
   ├── Mark complete: markTaskCompleted(planPath, taskId, findings)
   └── Commit changes: git commit -m "task {id}: {description}"
6. Report progress
```

### Agent Execution Strategy

| Scenario | Agent Strategy |
|----------|----------------|
| Single file creation | 1 agent |
| Multiple independent files | Parallel agents (1 per file group) |
| Test + implementation | Parallel agents |
| Refactoring across files | Parallel grouped by module |
| Analysis + code generation | Sequential (analysis first) |

### Read-Only Agent Pattern (Critical)

Agents do NOT write files directly. They return content:

```
IMPORTANT: Do NOT write files directly. Instead:
1. Analyze the task requirements
2. Generate the complete code/content
3. Return your output in this format:
   FILE: <path>
   ```<language>
   <content>
   ```
4. The main conversation will handle file writing
```

This prevents:
- Permission issues
- Race conditions
- Partial writes

---

## 1.4 Current Execution Flow (Sequential vs Parallel)

### Current Parallelism Levels

| Level | Support | Implementation |
|-------|---------|----------------|
| Parallel Plans | **NOT SUPPORTED** | Single `current-plan.txt` pointer |
| Parallel Phases | **LIMITED** | Must complete prior phases first |
| Parallel Tasks | **SUPPORTED** | Within same phase, if independent |
| Parallel Agents | **SUPPORTED** | Multiple Task agents per task |

### Sequential Enforcement

#### Explicit: `[SEQUENTIAL]` Annotation

```markdown
**Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify same file
```

Parsed by `parseExecutionNotes()` in `plan-status.js`:

```javascript
// Pattern matched:
/\*\*Execution Note:\*\*\s*Tasks?\s+([\d.,\s-]+)\s+(?:are|is)\s+\[SEQUENTIAL\]/gi
```

#### Implicit: File Conflict Detection

From `implement.md`:
> If multiple selected tasks mention the same file path, treat as sequential

#### Phase Ordering

From `implement.md`:
> Tasks in DIFFERENT phases: Always sequential (phase order matters)

### Parallel Execution Rules Summary

1. `[SEQUENTIAL]` annotation → Run one at a time, in order
2. File conflicts → Sequential (even without annotation)
3. Same phase, independent → Parallel OK
4. Different phases → Sequential by phase order
5. Explicit dependencies (task B mentions task A) → Run A first

### Execution Group Example

```
Execution Plan:
├── Sequential Group 1 (Phase 0):
│   └── 0.3 Update playwright.config.ts
├── Parallel Group 2 (Phase 1):
│   ├── 1.1 websocket-connection.test.ts
│   ├── 1.2 preferences-store.test.ts
│   └── 1.3 api-utils.test.ts
├── Sequential Group 3 (Phase 3) [SEQUENTIAL]:
│   ├── 3.1 Merge ORCHESTRATOR.md content
│   ├── 3.2 Merge ARCHITECTURE.md content
│   ├── 3.3 Create redirect file
│   └── 3.4 Remove duplicate section
```

---

## 1.5 Task Dependency Handling Mechanisms

### Dependency Sources

#### 1. status-cli.js `next` Command

```javascript
// From cmdNext() in status-cli.js:

// 1. First return in-progress tasks (implicit dependency)
const inProgress = status.tasks.filter(t => t.status === 'in_progress');

// 2. Then failed tasks (may need retry)
for (const task of phase.tasks) {
  if (task.status === 'failed') { ... }
}

// 3. Finally pending tasks respecting phase order
for (const phase of phases) {
  // Check if previous phases are complete enough (80% threshold)
  const previousMostlyComplete = previousPhases.every(p => {
    const completed = p.tasks.filter(t =>
      t.status === 'completed' || t.status === 'skipped'
    ).length;
    return completed >= p.tasks.length * 0.8;
  });

  if (previousIncomplete && !previousMostlyComplete) {
    continue; // Skip this phase for now
  }
}
```

#### 2. Execution Constraint Parsing

In `plan-status.js`:

```javascript
function parseExecutionNotes(planContent) {
  const constraints = [];
  const notePattern = /\*\*Execution Note:\*\*\s*Tasks?\s+([\d.,\s-]+)\s+(?:are|is)\s+\[SEQUENTIAL\]/gi;

  // Expands "3.1-3.4" → ["3.1", "3.2", "3.3", "3.4"]
  const taskIds = expandTaskRange(cleanRange);

  constraints.push({
    taskRange: cleanRange,
    taskIds,
    reason
  });
}
```

#### 3. Per-Task Constraint Storage

Constraints are stored in `status.json`:

```json
{
  "sequentialGroups": [
    {
      "taskRange": "3.1-3.4",
      "taskIds": ["3.1", "3.2", "3.3", "3.4"],
      "reason": "all modify same file"
    }
  ],
  "tasks": [
    {
      "id": "3.1",
      "executionConstraints": {
        "sequential": true,
        "sequentialGroup": "3.1-3.4",
        "reason": "all modify same file"
      }
    }
  ]
}
```

### Dependency Enforcement Points

| Component | Enforcement | Mechanism |
|-----------|-------------|-----------|
| `status-cli.js next` | Phase ordering | 80% completion threshold |
| `implement.md` | Sequential annotation | Parse `[SEQUENTIAL]` before grouping |
| `implement.md` | File conflicts | Detect same file paths |
| `orchestrate.md` | Cross-phase | Complete earlier phases first |

### Phase Completion Threshold

From `status-cli.js`:

```javascript
// 80% threshold for phase advancement
const previousMostlyComplete = previousPhases.every(p => {
  const completed = p.tasks.filter(t =>
    t.status === 'completed' || t.status === 'skipped'
  ).length;
  return completed >= p.tasks.length * 0.8;
});
```

This allows starting next phase before current phase is 100% complete (flexibility).

### Retry Tracking

From `plan-output-utils.js`:

```javascript
const MAX_RETRIES = 2;

function getRetryableTasks(planPath) {
  // Returns tasks with status 'failed' and retryCount < MAX_RETRIES
}

function incrementRetryCount(planPath, taskId, errorMessage) {
  // Increments retryCount, resets status to 'pending'
}
```

### Stuck Task Detection

```javascript
const STUCK_TASK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function detectAndMarkStuckTasks(planPath) {
  // Marks in_progress tasks as failed if started > 30 min ago
}
```

---

## Summary

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     PLAN SYSTEM ARCHITECTURE                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User Commands (Claude Skills)                               │
│  ├── /plan:orchestrate  → Autonomous loop                    │
│  ├── /plan:implement    → Execute tasks                      │
│  ├── /plan:batch        → Parallel execution                 │
│  ├── /plan:verify       → Check completion                   │
│  └── /plan:status       → View progress                      │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Execution Engine                                            │
│  ├── Task agents (parallel, read-only pattern)               │
│  ├── Main conversation (file writes, coordination)           │
│  └── Git commits (per-task granularity)                      │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Status Management (status-cli.js + plan-status.js)          │
│  ├── status.json (authoritative source of truth)             │
│  ├── Constraint parsing ([SEQUENTIAL] annotations)           │
│  ├── Phase ordering (80% completion threshold)               │
│  └── Retry/stuck detection                                   │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  State Files                                                 │
│  ├── .claude/current-plan.txt (active plan pointer)          │
│  ├── docs/plans/*.md (plan definitions, read-only)           │
│  └── docs/plan-outputs/*/status.json (execution state)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Key Findings

1. **Single Plan Limitation**: Only one plan can be active at a time (`current-plan.txt`)
2. **Task-Level Parallelism**: Well-supported within phases
3. **Agent Pattern**: Read-only agents prevent race conditions
4. **Dependency Tracking**: Mix of explicit (`[SEQUENTIAL]`) and implicit (phase order, file conflicts)
5. **Status Source of Truth**: `status.json` not markdown checkboxes
6. **Phase Advancement**: 80% threshold allows overlap
7. **Error Recovery**: Retry mechanism (2 max), stuck detection (30 min)
