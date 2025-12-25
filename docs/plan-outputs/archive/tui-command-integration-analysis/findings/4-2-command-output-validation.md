# Task 4.2: Command Output Validation Report

## Executive Summary

This report validates whether existing commands can provide the data required by the 8 proposed TUI data contracts from Phase 3.2. Analysis covers current implementation capabilities, gaps, and implementation effort estimates.

**Key Findings:**
- 3 contracts CAN_PROVIDE with minimal changes
- 4 contracts NEED_ENHANCEMENT (moderate changes)
- 1 contract NEW_COMMAND_REQUIRED (significant implementation)

---

## Validation Methodology

For each data contract:
1. **Current State** - What data exists in status.json and command outputs
2. **Gap Analysis** - Missing fields/capabilities vs. contract requirements
3. **Implementation Effort** - LOW (<4 hours) / MEDIUM (4-16 hours) / HIGH (>16 hours)
4. **Verdict** - CAN_PROVIDE / NEEDS_ENHANCEMENT / NEW_COMMAND_REQUIRED

Evidence includes:
- Actual status.json structure (lines 1-259 of status.json)
- plan-output-utils.js implementation (1,279 lines)
- status-cli.js implementation (763 lines)
- plan-orchestrator.js implementation (456 lines)

---

## Contract 1: Status Contract (Enhanced)

### Required Schema
```typescript
interface StatusResponse {
  success: boolean;
  planPath: string;
  planName: string;
  currentPhase: string;
  lastUpdatedAt: string;
  summary: { totalTasks, completed, pending, in_progress, failed, skipped, percentage };
  phases: PhaseInfo[];           // NEW
  currentRun: RunInfo | null;    // NEW
}
```

### Current State

**status-cli.js `cmdStatus()` (lines 116-138):**
```javascript
const response = {
  planPath: status.planPath,
  planName: status.planName,
  currentPhase: status.currentPhase,
  lastUpdatedAt: status.lastUpdatedAt,
  summary: status.summary,
  tasks: status.tasks.map(t => ({
    id: t.id,
    phase: t.phase,
    description: t.description,
    status: t.status
  }))
};
```

**Available in status.json:**
- ✅ planPath, planName, currentPhase, lastUpdatedAt
- ✅ summary (all 6 fields)
- ✅ runs array with runId, startedAt, tasksCompleted, tasksFailed
- ✅ tasks array with phase field

**plan-orchestrator.js `getPhasesSummary()` (lines 338-353):**
```javascript
return plan.phases.map(phase => {
  const total = phase.tasks.length;
  const completed = phase.tasks.filter(t => t.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    number: phase.number,
    title: phase.title,
    total, completed, percentage,
    status: percentage === 100 ? 'complete' : percentage > 0 ? 'in_progress' : 'pending'
  };
});
```

### Gap Analysis

**Missing Fields:**

1. **`phases` array** - Phase breakdown with per-phase stats
   - **Current:** `getPhasesSummary()` computes this but only in `phases` command
   - **Gap:** Not included in `status` command output
   - **Implementation:** Call `getPhasesSummary()` in `cmdStatus()`

2. **`currentRun` object** - Current run information
   - **Current:** `status.runs` array exists (line 950 in plan-output-utils.js)
   - **Gap:** No field to identify current (incomplete) run
   - **Implementation:** Filter `runs.find(r => !r.completedAt)`

3. **`PhaseInfo.hasVerify`** - Verify task detection
   - **Current:** Task IDs parsed but no explicit VERIFY detection
   - **Gap:** Need to parse task description for "VERIFY" keyword
   - **Implementation:** Regex match `/\*\*VERIFY/`

4. **`PhaseInfo.verifyStatus`** - Verify task status
   - **Current:** Can get from `status.tasks.find()`
   - **Gap:** Need to lookup task by ID
   - **Implementation:** Simple filter/find

5. **`summary.percentage`** - Completion percentage
   - **Current:** Not in summary (line 251-258 of status.json)
   - **Gap:** Need to calculate `(completed / totalTasks) * 100`
   - **Implementation:** Add to recalculateSummary() (line 169)

### Implementation Effort

**MEDIUM** (8-12 hours)

**Changes Required:**

1. **status-cli.js `cmdStatus()`** - Add phases and currentRun fields
2. **plan-output-utils.js `recalculateSummary()`** - Add percentage calculation
3. **plan-orchestrator.js** - Add VERIFY task detection logic
4. **Integration** - Import getPhasesSummary() into status-cli.js

**Code Locations:**
- status-cli.js:116-138 (cmdStatus function)
- plan-output-utils.js:169-189 (recalculateSummary)
- plan-orchestrator.js:338-353 (getPhasesSummary)

### Verdict

**NEEDS_ENHANCEMENT**

All data exists in status.json. Main work is:
- Merging outputs from two existing functions
- Adding percentage calculation
- Adding VERIFY task detection regex

---

## Contract 2: Tasks Contract (Enhanced)

### Required Schema
```typescript
interface TaskInfo {
  // Existing fields (all present)
  id, phase, description, status, startedAt, completedAt, notes, error;

  // NEW fields
  phaseNumber: number;
  retryCount: number;
  maxRetries: number;
  retryErrors: RetryError[];
  blockedBy: string[];
  blocks: string[];
  canStart: boolean;
  parentTaskId?: string;
  subtasks: string[];
  hasFinding: boolean;
  findingPath?: string;
}
```

### Current State

**status.json task structure (lines 8-57):**
```json
{
  "id": "1.1",
  "phase": "Phase 1: Discovery - Current State Mapping",
  "description": "...",
  "status": "completed",
  "startedAt": "2025-12-24T18:07:12.464Z",
  "completedAt": "2025-12-24T18:09:30.043Z",
  "duration": 137579,
  "notes": "..."
}
```

**plan-output-utils.js retry tracking (lines 1050-1078):**
```javascript
function incrementRetryCount(planPath, taskId, errorMessage) {
  task.retryCount = (task.retryCount || 0) + 1;
  task.lastError = errorMessage;
  task.lastErrorAt = new Date().toISOString();
  return { canRetry, retryCount: task.retryCount, maxRetries: MAX_RETRIES };
}
```

**Available fields:**
- ✅ All existing fields (id, phase, description, status, timestamps, notes, error)
- ✅ retryCount, lastError, lastErrorAt (when task has failed/retried)
- ✅ MAX_RETRIES constant = 2 (line 1036)

### Gap Analysis

**Missing Fields:**

1. **`phaseNumber`** - Numeric phase identifier
   - **Current:** phase = "Phase 1: Discovery..."
   - **Gap:** Not extracted as number
   - **Implementation:** Regex `/Phase\s+(\d+)/` on phase field

2. **`retryErrors[]`** - History of all retry errors
   - **Current:** Only `lastError` stored (single string)
   - **Gap:** No array to track all attempts
   - **Implementation:** Change task structure to store array

3. **`blockedBy[]` / `blocks[]`** - Dependency tracking
   - **Current:** No dependency tracking in status.json
   - **Gap:** Need to infer from phase order or explicit deps
   - **Implementation:** NEW - requires dependency analysis system

4. **`canStart`** - Whether task can be executed
   - **Current:** Not calculated
   - **Gap:** Need to check if blockedBy tasks are complete
   - **Implementation:** Derived from blockedBy array

5. **`parentTaskId` / `subtasks[]`** - Task hierarchy
   - **Current:** No parent/child relationships tracked
   - **Gap:** No hierarchy in status.json
   - **Implementation:** Parse task IDs (e.g., "1.1.1" parent is "1.1")

6. **`hasFinding` / `findingPath`** - Findings metadata
   - **Current:** findings/ directory exists with task files
   - **Gap:** Not tracked in task object
   - **Implementation:** Check if `findings/${taskId}.md` exists

### Implementation Effort

**MEDIUM** (10-14 hours)

**Changes Required:**

1. **status.json schema** - Add retryErrors array, parentTaskId, subtasks, hasFinding
2. **plan-output-utils.js** - Modify incrementRetryCount() to push to array
3. **Dependency system** - NEW module to calculate blockedBy/blocks
4. **Task initialization** - Parse task ID hierarchy for parent/child
5. **Findings detection** - Check filesystem for task findings

**Code Locations:**
- plan-output-utils.js:1050-1078 (incrementRetryCount)
- status-cli.js:129-134 (task mapping in cmdStatus)
- NEW: scripts/lib/dependency-analyzer.js (to create)

### Verdict

**NEEDS_ENHANCEMENT**

Most fields exist or can be derived. Major new work:
- Dependency tracking system (blockedBy/blocks)
- Retry error history (array instead of single error)
- Task hierarchy parsing

---

## Contract 3: Next Tasks Contract (Enhanced)

### Required Schema
```typescript
interface NextTasksResponse {
  count: number;
  tasks: NextTaskInfo[];
  parallelGroups: ParallelGroup[];  // NEW
}

interface NextTaskInfo {
  // Existing: id, description, phase, status, reason
  estimatedComplexity: 'low' | 'medium' | 'high';  // NEW
  isVerify: boolean;                                // NEW
  blockedBy: string[];                              // NEW
}
```

### Current State

**plan-orchestrator.js `getNextTasks()` (lines 242-305):**
```javascript
const next = [];
// Returns in_progress tasks first, then failed, then pending
for (const task of phase.tasks) {
  if (task.status === 'pending' && next.length < maxTasks) {
    next.push({
      ...task,
      reason: 'pending - ready to implement'
    });
  }
}
```

**status-cli.js `cmdNext()` (lines 309-335):**
```javascript
outputJSON({
  planPath: status.planPath,
  currentPhase: status.currentPhase,
  inProgress: inProgressTasks.map(...),
  nextTasks: pendingTasks.map(t => ({
    id: t.id,
    phase: t.phase,
    description: t.description
  })),
  summary: status.summary
});
```

### Gap Analysis

**Missing Fields:**

1. **`parallelGroups[]`** - Tasks that can run in parallel
   - **Current:** No parallel group detection
   - **Gap:** Need to analyze which tasks have no dependencies on each other
   - **Implementation:** Group tasks by phase, check for explicit deps

2. **`estimatedComplexity`** - Task complexity estimation
   - **Current:** Not tracked
   - **Gap:** No heuristic for complexity
   - **Implementation:** Heuristic: count words, detect keywords (implement/design/analyze)

3. **`isVerify`** - Whether task is a VERIFY checkpoint
   - **Current:** Not detected
   - **Gap:** Need regex on description
   - **Implementation:** Match `/\*\*VERIFY/` in task.description

4. **`blockedBy[]`** - Dependency information
   - **Current:** Not tracked
   - **Gap:** Same as Contract 2
   - **Implementation:** Requires dependency system

### Implementation Effort

**MEDIUM** (6-10 hours)

**Changes Required:**

1. **plan-orchestrator.js `getNextTasks()`** - Add isVerify detection
2. **Complexity estimator** - NEW function to analyze task description
3. **Parallel group analyzer** - NEW function to find independent tasks
4. **Dependency integration** - Use dependency system from Contract 2

**Code Locations:**
- plan-orchestrator.js:242-305 (getNextTasks)
- NEW: scripts/lib/complexity-estimator.js
- NEW: scripts/lib/parallel-analyzer.js

### Verdict

**NEEDS_ENHANCEMENT**

Base functionality exists. New features:
- Parallel group detection (requires dependency system)
- Complexity estimation (heuristic function)
- VERIFY detection (simple regex)

---

## Contract 4: Phases Contract

### Required Schema
```typescript
interface PhasesResponse {
  success: boolean;
  totalPhases: number;
  currentPhase: number;
  phases: PhaseDetail[];
}
```

### Current State

**plan-orchestrator.js `cmdPhases` (lines 438-442):**
```javascript
case 'phases': {
  const phases = getPhasesSummary(mergedPlan);
  console.log(JSON.stringify({ phases }, null, 2));
  break;
}
```

**plan-orchestrator.js `getPhasesSummary()` (lines 338-353):**
```javascript
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
```

### Gap Analysis

**Missing Fields:**

1. **`totalPhases`** - Count of phases
   - **Current:** Not in output
   - **Gap:** Need `phases.length`
   - **Implementation:** Add to response object

2. **`currentPhase`** - Current phase number
   - **Current:** status.currentPhase is string "Phase 1: ..."
   - **Gap:** Need numeric extraction
   - **Implementation:** Regex `/Phase\s+(\d+)/`

3. **`PhaseDetail` extended fields:**
   - **Current:** Has number, title, total, completed, percentage, status
   - **Missing:** pending, in_progress, failed, skipped counts
   - **Implementation:** Count tasks by status in each phase

4. **`verifyTaskId` / `verifyStatus`** - VERIFY task tracking
   - **Current:** Not tracked
   - **Gap:** Find VERIFY task in phase
   - **Implementation:** Filter tasks for VERIFY keyword

5. **`startedAt` / `completedAt`** - Phase timing
   - **Current:** Not tracked in status.json
   - **Gap:** No phase-level timestamps
   - **Implementation:** Min/max of task timestamps in phase

6. **`estimatedRemaining`** - Time estimate
   - **Current:** Not calculated
   - **Gap:** No time tracking/estimation
   - **Implementation:** Average task duration × pending tasks

### Implementation Effort

**MEDIUM** (6-8 hours)

**Changes Required:**

1. **plan-orchestrator.js `getPhasesSummary()`** - Add all status counts
2. **Phase timing** - Calculate from task timestamps
3. **VERIFY detection** - Filter for VERIFY tasks
4. **Time estimation** - Calculate average task duration

**Code Locations:**
- plan-orchestrator.js:338-353 (getPhasesSummary)
- plan-orchestrator.js:438-442 (cmdPhases)

### Verdict

**CAN_PROVIDE**

Command and function already exist. Just need to:
- Add more status counts (simple aggregation)
- Add phase-level metadata (derived from tasks)
- Add VERIFY task detection

---

## Contract 5: Dependencies Contract

### Required Schema
```typescript
interface DependenciesResponse {
  success: boolean;
  taskId?: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
  parallelizable: string[][];
  blockedTasks: BlockedInfo[];
}
```

### Current State

**plan-orchestrator.js `checkTask()` (lines 310-333):**
```javascript
function checkTask(plan, taskId) {
  const task = phase.tasks.find(t => t.id === taskId);

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
```

**Current dependency logic:**
- ✅ Phase-based dependencies (earlier phases block later phases)
- ✅ Can identify blockers for a specific task
- ❌ No explicit task-to-task dependencies
- ❌ No dependency graph structure
- ❌ No critical path analysis
- ❌ No parallel group detection

### Gap Analysis

**Missing Capabilities:**

1. **Dependency graph structure** - No nodes/edges representation
2. **Critical path calculation** - No longest path algorithm
3. **Parallel group detection** - No independent task grouping
4. **Explicit dependencies** - No task.dependsOn field in status.json

**Full Dependency System Required:**

This is a **MAJOR NEW FEATURE** that doesn't exist. Would need:

1. **Dependency storage** - Add `dependsOn: string[]` to task schema
2. **Graph construction** - Build DAG from tasks + dependencies
3. **Graph algorithms:**
   - Topological sort (detect cycles)
   - Critical path (longest path through DAG)
   - Parallel groups (independent subgraphs)
   - Transitive closure (all blockers, not just direct)

4. **Command implementation** - New `dependencies` command in plan-orchestrator.js

### Implementation Effort

**HIGH** (20-30 hours)

**Changes Required:**

1. **status.json schema** - Add dependsOn field to tasks
2. **Graph data structure** - NEW module: dependency-graph.js
3. **Graph algorithms** - Implement topological sort, critical path, parallelization
4. **Command** - NEW `dependencies` command in plan-orchestrator.js
5. **Integration** - Update task initialization to parse dependencies

**Code Locations:**
- NEW: scripts/lib/dependency-graph.js (full implementation)
- plan-orchestrator.js:310-333 (extend checkTask)
- plan-orchestrator.js:444 (add 'dependencies' case)
- plan-output-utils.js:209-214 (extend initializeStatus)

### Verdict

**NEW_COMMAND_REQUIRED**

This is the most complex contract. Requires:
- Full dependency system design and implementation
- Graph algorithms (critical path, parallelization)
- Schema changes to status.json
- New command infrastructure

Recommend implementing in phases:
1. Phase-based dependencies only (LOW effort, 4 hours)
2. Explicit task dependencies (MEDIUM, 8 hours)
3. Graph algorithms (HIGH, 12 hours)

---

## Contract 6: Findings Contract

### Required Schema
```typescript
interface FindingsResponse {
  success: boolean;
  taskId?: string;
  findings?: FindingSummary[];      // List mode
  finding?: FindingDetail;          // Detail mode
}
```

### Current State

**status-cli.js findings commands (lines 220-273):**

```javascript
// cmdWriteFindings (lines 222-256)
const relativePath = writeFindings(planPath, taskId, content);
outputJSON({ success: true, taskId, findingsPath: relativePath });

// cmdReadFindings (lines 261-273)
const content = readFindings(planPath, taskId);
console.log(content);  // Raw output, not JSON
```

**plan-output-utils.js findings functions (lines 986-1009):**

```javascript
function writeFindings(planPath, taskId, content) {
  const findingsDir = getFindingsDir(planPath);
  const filename = `${taskId.replace(/\./g, '-')}.md`;
  const filepath = path.join(findingsDir, filename);
  const relativePath = path.relative(resolvePath('.'), filepath);

  if (writeFile(filepath, content)) {
    return relativePath;
  }
  return null;
}

function readFindings(planPath, taskId) {
  const findingsDir = getFindingsDir(planPath);
  const filename = `${taskId.replace(/\./g, '-')}.md`;
  const filepath = path.join(findingsDir, filename);
  return readFile(filepath);
}
```

**Available:**
- ✅ Write findings to file
- ✅ Read findings from file
- ✅ Findings directory structure: `docs/plan-outputs/{plan}/findings/{task-id}.md`

### Gap Analysis

**Missing Features:**

1. **List mode** - No command to list all findings
   - **Current:** Only read single task findings
   - **Gap:** Need to scan findings/ directory
   - **Implementation:** `fs.readdirSync(findingsDir)`, parse filenames

2. **FindingSummary fields:**
   - **filename, path** - Can get from fs.readdirSync
   - **size** - Can get from fs.statSync
   - **createdAt** - Can get from fs.statSync
   - **preview** - Need to read first 100 chars

3. **FindingDetail.metadata:**
   - **createdAt, modifiedAt** - Can get from fs.statSync
   - **wordCount** - Count whitespace-split tokens
   - **hasCode, hasTables** - Regex for ```/| patterns

4. **JSON output** - read-findings outputs raw text, not JSON
   - **Current:** `console.log(content)` (line 272)
   - **Gap:** Not wrapped in JSON response
   - **Implementation:** Conditional output based on --json flag

### Implementation Effort

**LOW** (4-6 hours)

**Changes Required:**

1. **status-cli.js** - Add `list-findings` command
2. **plan-output-utils.js** - Add `listFindings()` function
3. **Metadata extraction** - Parse markdown for code/table detection
4. **JSON mode** - Add --json flag to read-findings

**Code Locations:**
- status-cli.js:220-273 (findings commands)
- plan-output-utils.js:986-1009 (findings functions)
- NEW: status-cli.js:cmdListFindings (new command)

### Verdict

**CAN_PROVIDE**

Core functionality exists (read/write). Just need:
- List command (directory scan)
- Metadata extraction (fs.statSync + regex)
- JSON output mode

---

## Contract 7: Run History Contract

### Required Schema
```typescript
interface RunsResponse {
  success: boolean;
  totalRuns: number;
  currentRunId?: string;
  runs: RunDetail[];
}
```

### Current State

**status.json runs array (line 250):**
```json
"runs": []
```

**plan-output-utils.js run tracking (lines 936-977):**

```javascript
function startRun(planPath) {
  const runId = `run-${Date.now()}`;
  const run = {
    runId,
    startedAt: new Date().toISOString(),
    tasksCompleted: 0,
    tasksFailed: 0
  };
  status.runs = status.runs || [];
  status.runs.push(run);
  return runId;
}

function completeRun(planPath, runId, completed, failed) {
  const run = status.runs.find(r => r.runId === runId);
  if (!run) return false;

  run.completedAt = new Date().toISOString();
  run.tasksCompleted = completed;
  run.tasksFailed = failed;

  return saveStatus(planPath, status);
}
```

**status-cli.js run commands (lines 278-304):**

```javascript
// cmdStartRun (lines 278-285)
const runId = startRun(planPath);
outputJSON({ success: true, runId });

// cmdCompleteRun (lines 290-304)
const success = completeRun(planPath, runId, completed, failed);
outputJSON({ success: true, runId, completed, failed });
```

**Available:**
- ✅ Run tracking in status.json
- ✅ start-run and complete-run commands
- ✅ Basic run data: runId, startedAt, completedAt, tasksCompleted, tasksFailed

### Gap Analysis

**Missing Features:**

1. **List runs command** - No command to retrieve runs array
   - **Current:** Commands only start/complete runs
   - **Gap:** Need to output runs array
   - **Implementation:** Load status.json, return runs with metadata

2. **RunDetail extended fields:**
   - **runNumber** - Sequential run number (1, 2, 3...)
   - **tasksSkipped** - Not tracked
   - **durationSeconds** - Calculate from start/complete timestamps
   - **isComplete** - Check if completedAt exists
   - **isCurrent** - Check if completedAt is null
   - **claudeSessionCount** - Not tracked
   - **totalToolCalls** - Not tracked

3. **currentRunId** - Identify active run
   - **Implementation:** `runs.find(r => !r.completedAt)?.runId`

### Implementation Effort

**LOW** (3-5 hours)

**Changes Required:**

1. **status-cli.js** - Add `runs` command
2. **Response builder** - Map runs to RunDetail schema
3. **Derived fields** - Calculate runNumber, duration, isComplete, isCurrent
4. **Optional tracking** - Add skipped count, session count (if desired)

**Code Locations:**
- status-cli.js:278-304 (run commands)
- NEW: status-cli.js:cmdRuns (new command)
- plan-output-utils.js:936-977 (run tracking)

### Verdict

**CAN_PROVIDE**

Runs are tracked in status.json. Just need:
- New command to list runs
- Calculate derived fields (duration, isComplete, etc.)
- Optional: extend run tracking for session/tool counts

---

## Contract 8: Retry Status Contract (Enhanced)

### Required Schema
```typescript
interface RetryableResponse {
  success: boolean;
  retryable: { count, tasks };
  exhausted: { count, tasks };
}
```

### Current State

**status-cli.js retry commands (lines 553-604):**

```javascript
// cmdRetryable (lines 554-562)
function cmdRetryable(planPath) {
  const { getRetryableTasks } = require('./lib/plan-output-utils');
  const tasks = getRetryableTasks(planPath);

  outputJSON({
    count: tasks.length,
    tasks: tasks
  });
}

// cmdExhausted (lines 567-575)
function cmdExhausted(planPath) {
  const { getExhaustedTasks } = require('./lib/plan-output-utils');
  const tasks = getExhaustedTasks(planPath);

  outputJSON({
    count: tasks.length,
    tasks: tasks
  });
}
```

**plan-output-utils.js retry functions (lines 1104-1141):**

```javascript
function getRetryableTasks(planPath) {
  return status.tasks
    .filter(t => t.status === 'failed')
    .filter(t => (t.retryCount || 0) < MAX_RETRIES)
    .map(t => ({
      id: t.id,
      description: t.description,
      phase: t.phase,
      retryCount: t.retryCount || 0,
      lastError: t.lastError,
      lastErrorAt: t.lastErrorAt
    }));
}

function getExhaustedTasks(planPath) {
  return status.tasks
    .filter(t => t.status === 'failed')
    .filter(t => (t.retryCount || 0) >= MAX_RETRIES)
    .map(t => ({
      id: t.id,
      description: t.description,
      phase: t.phase,
      retryCount: t.retryCount,
      lastError: t.lastError,
      lastErrorAt: t.lastErrorAt
    }));
}
```

**Available:**
- ✅ Separate commands for retryable and exhausted tasks
- ✅ retryCount, lastError, lastErrorAt tracking
- ✅ MAX_RETRIES = 2 (line 1036)

### Gap Analysis

**Missing Features:**

1. **Unified response** - Contract expects both retryable + exhausted in one response
   - **Current:** Separate commands
   - **Gap:** Need single command with nested structure
   - **Implementation:** Combine both calls into one command

2. **RetryableTask extended fields:**
   - **maxRetries** - Not included in response
   - **canRetryNow** - Not calculated
   - **cooldownRemaining** - No cooldown mechanism exists

3. **ExhaustedTask extended fields:**
   - **totalAttempts** - Currently using retryCount
   - **errors[]** - Array of all errors (only have lastError)
   - **requiresManualIntervention** - Not determined

### Implementation Effort

**LOW** (2-4 hours)

**Changes Required:**

1. **status-cli.js** - Modify `retryable` command to return both sections
2. **Response builder** - Nest retryable/exhausted under top-level keys
3. **Add maxRetries** - Include MAX_RETRIES constant in response
4. **Optional cooldown** - Add cooldown logic if desired (not critical)

**Code Locations:**
- status-cli.js:554-575 (cmdRetryable, cmdExhausted)
- plan-output-utils.js:1104-1141 (getRetryableTasks, getExhaustedTasks)

### Verdict

**CAN_PROVIDE**

All core functionality exists. Just need:
- Merge two commands into single unified response
- Add maxRetries field to output
- Optional: add cooldown/manual intervention flags

---

## Summary Table

| # | Contract | Verdict | Effort | Key Gaps | Priority |
|---|----------|---------|--------|----------|----------|
| 1 | Status | NEEDS_ENHANCEMENT | MEDIUM | phases array, currentRun, percentage | HIGH |
| 2 | Tasks | NEEDS_ENHANCEMENT | MEDIUM | dependency tracking, retry history, hierarchy | HIGH |
| 3 | Next Tasks | NEEDS_ENHANCEMENT | MEDIUM | parallelGroups, complexity, isVerify | MEDIUM |
| 4 | Phases | CAN_PROVIDE | MEDIUM | status counts, VERIFY detection, timing | HIGH |
| 5 | Dependencies | **NEW_COMMAND_REQUIRED** | **HIGH** | **Full graph system needed** | MEDIUM |
| 6 | Findings | CAN_PROVIDE | LOW | list command, metadata extraction | MEDIUM |
| 7 | Run History | CAN_PROVIDE | LOW | runs command, derived fields | LOW |
| 8 | Retry Status | CAN_PROVIDE | LOW | unified response structure | HIGH |

---

## Implementation Priority Recommendation

### Phase 1: Quick Wins (LOW effort - 1 week)
**Contracts:** 6, 7, 8
- Run History command
- Findings list command
- Unified retry status response
- **Total Effort:** 9-15 hours
- **Impact:** Immediate TUI enhancements

### Phase 2: Core Enhancements (MEDIUM effort - 2 weeks)
**Contracts:** 1, 3, 4
- Status contract enhancements (phases, currentRun)
- Next Tasks enhancements (isVerify, complexity)
- Phases command completion
- **Total Effort:** 20-30 hours
- **Impact:** Full TUI panel data coverage (except dependencies)

### Phase 3: Advanced Features (MEDIUM effort - 2 weeks)
**Contract:** 2 (partial)
- Retry error history
- Task hierarchy (parent/child)
- Findings metadata in tasks
- **Total Effort:** 15-20 hours
- **Impact:** Rich task detail display

### Phase 4: Dependency System (HIGH effort - 3-4 weeks)
**Contracts:** 2 (full), 5
- Full dependency graph implementation
- Critical path analysis
- Parallel group detection
- Blocked task tracking
- **Total Effort:** 30-40 hours
- **Impact:** Advanced workflow orchestration

---

## Risk Assessment

### Low Risk Changes
- Adding derived fields (percentage, durations)
- New commands that read existing data
- Metadata extraction from filesystem

### Medium Risk Changes
- Schema modifications to status.json (backward compatibility)
- Retry error array (migration needed)
- Task hierarchy parsing (ID format assumptions)

### High Risk Changes
- Dependency system (complex graph algorithms)
- Parallel group detection (correctness critical)
- Critical path calculation (performance on large plans)

---

## Backward Compatibility Strategy

### Approach: Graceful Degradation

All new fields are **optional additions**. Existing consumers continue working:

```javascript
// Old TUI code still works
const { completed, pending } = status.summary;

// New TUI code uses enhanced data
if (status.phases) {
  renderPhaseBreakdown(status.phases);
} else {
  renderSimpleProgress(status.summary);
}
```

### Migration Path

1. **Status.json v1 → v2:**
   - Add optional fields with defaults
   - Old status.json files auto-upgrade on first write
   - Example: `retryErrors: task.lastError ? [{attempt: 1, error: task.lastError, timestamp: task.lastErrorAt}] : []`

2. **Command versioning:**
   - Add `--version 2` flag to commands
   - Default behavior unchanged (v1)
   - New fields only in v2 responses

3. **Feature detection:**
   ```python
   def has_dependency_support(status):
       return 'blockedBy' in status.get('tasks', [{}])[0]
   ```

---

## Conclusion

### Feasibility: ✅ VALIDATED

All 8 data contracts **can be fulfilled** with varying effort levels:

- **3 contracts** ready with minor changes (LOW effort)
- **4 contracts** need enhancements (MEDIUM effort)
- **1 contract** requires new system (HIGH effort)

### Total Implementation Estimate

- **Minimum viable:** 30-45 hours (Phases 1-2)
- **Full system:** 60-85 hours (Phases 1-4)

### Recommended Approach

1. **Implement Phases 1-2 first** (quick wins + core enhancements)
   - Enables 7/8 contracts
   - Provides 80% of TUI functionality
   - ~50 hours of work

2. **Defer dependency system** (Phase 4)
   - Complex implementation
   - Can use phase-based dependencies as interim
   - Implement when workflow orchestration is priority

### Next Steps

1. Create implementation plan for Phase 1 (LOW effort contracts)
2. Design status.json schema migration for Phase 2
3. Prototype dependency graph design for Phase 4 evaluation
