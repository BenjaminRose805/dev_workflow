# Task 3.2: Command-to-TUI Data Contracts

## Overview

This document defines the JSON output schemas that plan commands must provide for TUI integration, including update frequency requirements and real-time vs polling data patterns.

---

## Contract Design Principles

1. **Consistency** - All commands return JSON with `success` boolean
2. **Completeness** - Include all data TUI needs in single call
3. **Efficiency** - Avoid redundant data, use references where possible
4. **Extensibility** - Schema allows optional fields for future expansion

---

## Core Data Contracts

### 1. Status Contract (Existing - Enhanced)

**Command:** `node scripts/status-cli.js status` or `plan-orchestrator.js status`

**Schema:**
```typescript
interface StatusResponse {
  success: boolean;
  planPath: string;
  planName: string;
  currentPhase: string;
  lastUpdatedAt: string;  // ISO 8601

  summary: {
    totalTasks: number;
    completed: number;
    pending: number;
    in_progress: number;
    failed: number;
    skipped: number;
    percentage: number;
  };

  // NEW: Phase breakdown
  phases: PhaseInfo[];

  // NEW: Current run info
  currentRun: RunInfo | null;
}

interface PhaseInfo {
  number: number;
  title: string;
  total: number;
  completed: number;
  percentage: number;
  status: 'pending' | 'in_progress' | 'completed';
  hasVerify: boolean;      // NEW: Has VERIFY task
  verifyStatus: string;    // NEW: VERIFY task status
}

interface RunInfo {
  runId: string;
  startedAt: string;
  tasksCompletedThisRun: number;
  tasksFailedThisRun: number;
  elapsedSeconds: number;
}
```

**Update Frequency:** Real-time (file watch) or 500ms polling

**TUI Consumers:**
- Header panel (phase name)
- Progress panel (completion stats)
- Phase detail panel (phase breakdown)

---

### 2. Tasks Contract (Enhanced)

**Command:** `node scripts/status-cli.js tasks --status all`

**Schema:**
```typescript
interface TasksResponse {
  success: boolean;
  count: number;
  tasks: TaskInfo[];
}

interface TaskInfo {
  id: string;
  phase: string;
  phaseNumber: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  notes?: string;
  error?: string;

  // NEW: Retry information
  retryCount: number;
  maxRetries: number;
  retryErrors: RetryError[];

  // NEW: Dependency information
  blockedBy: string[];     // Task IDs that block this task
  blocks: string[];        // Task IDs this task blocks
  canStart: boolean;       // All blockers resolved?

  // NEW: Hierarchy
  parentTaskId?: string;   // For split subtasks (e.g., "1.1" for "1.1.1")
  subtasks: string[];      // Child task IDs

  // NEW: Findings
  hasFinding: boolean;
  findingPath?: string;
}

interface RetryError {
  attempt: number;
  error: string;
  timestamp: string;
}
```

**Update Frequency:** Real-time (file watch)

**TUI Consumers:**
- In Progress panel
- Completions panel
- Upcoming panel
- Dependency graph
- Retry indicator

---

### 3. Next Tasks Contract (Enhanced)

**Command:** `node scripts/plan-orchestrator.js next N`

**Schema:**
```typescript
interface NextTasksResponse {
  success: boolean;
  count: number;
  tasks: NextTaskInfo[];

  // NEW: Parallel group info
  parallelGroups: ParallelGroup[];
}

interface NextTaskInfo {
  id: string;
  description: string;
  phase: number;
  phaseTitle: string;
  status: string;
  reason: string;            // Why this task is next
  estimatedComplexity: 'low' | 'medium' | 'high';  // NEW
  isVerify: boolean;         // NEW
  blockedBy: string[];       // Tasks that must complete first
}

interface ParallelGroup {
  groupId: string;
  taskIds: string[];
  canRunInParallel: boolean;
  reason: string;            // Why they can/cannot parallelize
}
```

**Update Frequency:** On-demand (when building prompt)

**TUI Consumers:**
- Upcoming tasks panel
- Dependency graph (parallel groups)
- Prompt building

---

### 4. Phases Contract (New)

**Command:** `node scripts/plan-orchestrator.js phases`

**Schema:**
```typescript
interface PhasesResponse {
  success: boolean;
  totalPhases: number;
  currentPhase: number;
  phases: PhaseDetail[];
}

interface PhaseDetail {
  number: number;
  title: string;
  description?: string;

  // Task counts
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  failed: number;
  skipped: number;

  // Derived
  percentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';

  // Gating
  verifyTaskId?: string;
  verifyStatus?: string;
  blockedReason?: string;

  // Timing
  startedAt?: string;
  completedAt?: string;
  estimatedRemaining?: number;  // seconds
}
```

**Update Frequency:** On status.json change

**TUI Consumers:**
- Phase detail panel
- Header (current phase)

---

### 5. Dependencies Contract (New)

**Command:** `node scripts/plan-orchestrator.js dependencies [TASK_ID]`

**Schema:**
```typescript
interface DependenciesResponse {
  success: boolean;
  taskId?: string;           // If querying specific task

  // Full dependency graph
  nodes: DependencyNode[];
  edges: DependencyEdge[];

  // Analysis
  criticalPath: string[];    // Task IDs on longest path
  parallelizable: string[][]; // Groups that can run in parallel
  blockedTasks: BlockedInfo[];
}

interface DependencyNode {
  id: string;
  status: string;
  phase: number;
  isVerify: boolean;
  depth: number;             // Distance from start
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'phase' | 'explicit' | 'implicit';
}

interface BlockedInfo {
  taskId: string;
  blockedBy: string[];
  unblockableReason?: string;
}
```

**Update Frequency:** On-demand (expensive operation)

**TUI Consumers:**
- Dependency graph panel
- Task selection (show blockers)

---

### 6. Findings Contract (New)

**Command:** `node scripts/status-cli.js findings [TASK_ID]`

**Schema:**
```typescript
interface FindingsResponse {
  success: boolean;
  taskId?: string;

  // List mode (no taskId)
  findings?: FindingSummary[];

  // Detail mode (with taskId)
  finding?: FindingDetail;
}

interface FindingSummary {
  taskId: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  preview: string;           // First 100 chars
}

interface FindingDetail {
  taskId: string;
  filename: string;
  path: string;
  content: string;           // Full markdown content
  format: 'markdown' | 'json' | 'text';
  metadata: {
    createdAt: string;
    modifiedAt: string;
    wordCount: number;
    hasCode: boolean;
    hasTables: boolean;
  };
}
```

**Update Frequency:** On-demand (user request)

**TUI Consumers:**
- Findings browser modal
- Completions panel (hasFinding indicator)

---

### 7. Run History Contract (New)

**Command:** `node scripts/status-cli.js runs`

**Schema:**
```typescript
interface RunsResponse {
  success: boolean;
  totalRuns: number;
  currentRunId?: string;
  runs: RunDetail[];
}

interface RunDetail {
  runId: string;
  runNumber: number;
  startedAt: string;
  completedAt?: string;

  // Stats
  tasksCompleted: number;
  tasksFailed: number;
  tasksSkipped: number;

  // Derived
  durationSeconds?: number;
  isComplete: boolean;
  isCurrent: boolean;

  // Session info
  claudeSessionCount: number;
  totalToolCalls?: number;
}
```

**Update Frequency:** On run start/complete

**TUI Consumers:**
- Run history panel
- Footer (current run stats)

---

### 8. Retry Status Contract (Enhanced)

**Command:** `node scripts/status-cli.js retryable`

**Schema:**
```typescript
interface RetryableResponse {
  success: boolean;

  // Retryable tasks (can still retry)
  retryable: {
    count: number;
    tasks: RetryableTask[];
  };

  // Exhausted tasks (no retries left)
  exhausted: {
    count: number;
    tasks: ExhaustedTask[];
  };
}

interface RetryableTask {
  id: string;
  description: string;
  retryCount: number;
  maxRetries: number;
  lastError: string;
  lastAttemptAt: string;
  canRetryNow: boolean;
  cooldownRemaining?: number;  // seconds
}

interface ExhaustedTask {
  id: string;
  description: string;
  totalAttempts: number;
  errors: string[];
  requiresManualIntervention: boolean;
}
```

**Update Frequency:** Real-time (on task failure)

**TUI Consumers:**
- In Progress panel (retry indicator)
- Recovery logic
- Footer (retry stats)

---

## Data Update Patterns

### Real-Time (File Watch)

| Data | Source | Update Trigger |
|------|--------|----------------|
| Task status | status.json | On any task state change |
| Progress | status.json | On any task state change |
| Phase info | status.json | On task completion |
| Current run | status.json | On run state change |

**Implementation:**
```python
class StatusMonitor:
    """Watch status.json for changes."""

    def __init__(self, status_path: str, callback: Callable):
        self.status_path = status_path
        self.callback = callback
        # Use inotify on Linux, polling fallback
```

### Polling (Periodic)

| Data | Interval | Reason |
|------|----------|--------|
| Stuck detection | 30s | Expensive calculation |
| Run statistics | 10s | Aggregate calculation |
| Phase completion | 5s | Derived from tasks |

**Implementation:**
```python
class PollingUpdater:
    """Periodic data updates for expensive operations."""

    async def update_loop(self):
        while True:
            await self.update_stuck_status()
            await asyncio.sleep(30)
```

### On-Demand (User Action)

| Data | Trigger | Cache Duration |
|------|---------|----------------|
| Findings content | User selects task | 60s |
| Dependency graph | Panel opened | 30s |
| Task explanation | User requests | No cache |

**Implementation:**
```python
class CachedFetcher:
    """Fetch data with caching for expensive operations."""

    def __init__(self, ttl_seconds: int = 60):
        self.cache = {}
        self.ttl = ttl_seconds
```

---

## Integration Requirements

### For status-cli.js

Add/modify these commands:

```javascript
// Existing - ensure schema compliance
'status': () => StatusResponse,
'retryable': () => RetryableResponse,

// New commands needed
'findings': (taskId?) => FindingsResponse,
'runs': () => RunsResponse,
'tasks': (filter?) => TasksResponse,
```

### For plan-orchestrator.js

Add/modify these commands:

```javascript
// Existing - ensure schema compliance
'status': () => StatusResponse,
'next': (count) => NextTasksResponse,
'phases': () => PhasesResponse,

// New commands needed
'dependencies': (taskId?) => DependenciesResponse,
```

---

## Schema Validation

### JSON Schema Files

Create validation schemas in `scripts/lib/schemas/`:

```
schemas/
├── status-response.json
├── tasks-response.json
├── next-tasks-response.json
├── phases-response.json
├── dependencies-response.json
├── findings-response.json
├── runs-response.json
└── retryable-response.json
```

### Validation Integration

```javascript
// In plan-output-utils.js
const Ajv = require('ajv');
const ajv = new Ajv();

function validateResponse(schema, data) {
  const validate = ajv.compile(require(`./schemas/${schema}.json`));
  if (!validate(data)) {
    console.error('Schema validation failed:', validate.errors);
    return false;
  }
  return true;
}
```

---

## Backward Compatibility

### Existing Commands

All existing commands must continue to work with their current output format. New fields are added alongside existing ones.

### Version Field

Add version field to all responses for future compatibility:

```typescript
interface BaseResponse {
  success: boolean;
  version: string;  // "1.0", "1.1", etc.
}
```

### Feature Detection

TUI should detect available fields and gracefully degrade:

```python
def render_phase_detail(self, status: dict):
    if 'phases' in status:
        self._render_phase_bars(status['phases'])
    else:
        # Fallback to simple display
        self._render_phase_name(status['currentPhase'])
```

---

## Summary

| Contract | Command | New/Enhanced | Priority |
|----------|---------|--------------|----------|
| Status | status | Enhanced | HIGH |
| Tasks | tasks | Enhanced | HIGH |
| Next Tasks | next | Enhanced | MEDIUM |
| Phases | phases | Existing | HIGH |
| Dependencies | dependencies | New | MEDIUM |
| Findings | findings | New | MEDIUM |
| Run History | runs | New | LOW |
| Retry Status | retryable | Enhanced | HIGH |

Total contracts: 8 (4 enhanced, 4 new)
