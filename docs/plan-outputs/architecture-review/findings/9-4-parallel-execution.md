# 9.4 Parallel/Concurrent Execution Patterns

**Task:** Analyze parallel/concurrent execution patterns
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

This analysis examines when to run commands in parallel vs. sequentially, conflict prevention, coordination mechanisms, result aggregation, and partial failure handling.

---

## 1. Parallel vs. Sequential Decision Framework

### Run in Parallel When:
- **No dependencies:** Tasks have no interdependencies
- **Independent resources:** Different files, APIs, data stores
- **Embarrassingly parallel:** Tasks are completely independent
- **Speculative research:** Pre-fetching next operations

### Run Sequentially When:
- **Critical dependencies:** Task N depends on Task N-1
- **Shared resources:** Same file read/written by multiple tasks
- **Transaction boundaries:** Operations must be atomic
- **Resource constraints:** Single API rate limit

---

## 2. Execution Patterns

### Pattern 1: Concurrency-Limited Pool

```javascript
const pool = {
  maxConcurrent: 5,
  queue: [],
  active: new Set(),

  async execute(task) {
    if (this.active.size >= this.maxConcurrent) {
      await this.waitForSlot();
    }

    this.active.add(task.id);
    try {
      return await task.fn();
    } finally {
      this.active.delete(task.id);
      this.processQueue();
    }
  }
};
```

### Pattern 2: Priority Queues

```javascript
const Priority = {
  HIGH: 3,    // User-requested
  NORMAL: 2,  // Standard workflow
  LOW: 1      // Background/speculative
};

class PriorityQueue {
  constructor() {
    this.queues = {
      [Priority.HIGH]: [],
      [Priority.NORMAL]: [],
      [Priority.LOW]: []
    };
  }

  next() {
    for (const priority of [Priority.HIGH, Priority.NORMAL, Priority.LOW]) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
    return null;
  }
}
```

### Pattern 3: Dependency Graph Execution

```javascript
async function executeWithDependencies(tasks) {
  const graph = buildDependencyGraph(tasks);
  const completed = new Set();

  while (completed.size < tasks.length) {
    // Find tasks with all dependencies met
    const ready = tasks.filter(t =>
      !completed.has(t.id) &&
      t.dependencies.every(d => completed.has(d))
    );

    // Execute ready tasks in parallel
    await Promise.all(ready.map(async t => {
      await t.execute();
      completed.add(t.id);
    }));
  }
}
```

---

## 3. Conflict Prevention

### File Conflicts

**Types:**
- Read-write conflicts
- Write-write conflicts
- State consistency issues

**Solutions:**

```javascript
// Solution 1: File Partitioning
const taskWorkspace = (taskId) => `/temp/${taskId}/workspace/`;

// Solution 2: Read-Only Shared Resources
const sharedData = Object.freeze(await loadSharedData());

// Solution 3: Output Merge at End
const outputs = await Promise.all(tasks.map(t => t.execute()));
await mergeOutputs(outputs);
```

### API Rate Limits

```javascript
const rateLimiter = {
  requestsPerMinute: 100,
  requestCost: 5,

  get maxConcurrent() {
    return Math.floor(this.requestsPerMinute / this.requestCost);
  }
};

// Set pool limit based on API constraints
pool.maxConcurrent = rateLimiter.maxConcurrent;
```

---

## 4. Coordination Mechanisms

### Cache Invalidation

```javascript
function isCacheValid(entry, files) {
  // Check TTL
  if (entry.expires_at < Date.now()) return false;

  // Check file modification times
  for (const [path, cachedMtime] of Object.entries(entry.file_mtimes)) {
    const currentMtime = getFileMtime(path);
    if (currentMtime !== cachedMtime) return false;
  }

  return true;
}
```

### Lock-Free Design

Prefer partitioning over locking:

```
Output structure:
docs/plan-outputs/
├── task-1/
│   └── findings.md
├── task-2/
│   └── findings.md
└── task-3/
    └── findings.md
```

### Explicit Locking (When Needed)

```javascript
async function withLock(resource, fn) {
  const lockFile = `${resource}.lock`;
  const lockId = generateId();

  while (!await tryAcquireLock(lockFile, lockId)) {
    await sleep(100);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(lockFile, lockId);
  }
}
```

---

## 5. Result Aggregation

### Frequency-Based Analysis

```javascript
function aggregateResults(results) {
  const patterns = new Map();

  for (const result of results) {
    for (const pattern of result.patterns) {
      const count = patterns.get(pattern) || 0;
      patterns.set(pattern, count + 1);
    }
  }

  // Filter to common patterns (>40% mention rate)
  const threshold = results.length * 0.4;
  return [...patterns.entries()]
    .filter(([_, count]) => count >= threshold)
    .map(([pattern, count]) => ({ pattern, frequency: count / results.length }));
}
```

### Order Preservation

```javascript
async function runParallel(tasks) {
  const results = new Array(tasks.length);

  await Promise.all(tasks.map(async (task, index) => {
    results[index] = await task.execute();
  }));

  return results; // Same order as input
}
```

### Aggregation Strategies

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| Union | Dependencies, resources | `new Set([...a, ...b])` |
| Intersection | Required compatibility | `a.filter(x => b.includes(x))` |
| Majority Vote | Recommendations | `mostFrequent(results)` |

---

## 6. Partial Failure Handling

### Strategy 1: Graceful Degradation

```javascript
function aggregateWithPartialResults(results, minRequired) {
  const valid = results.filter(r => !r.error);

  if (valid.length < minRequired) {
    return {
      success: false,
      reason: `Insufficient results (${valid.length}/${minRequired})`
    };
  }

  return {
    success: true,
    partialResults: true,
    failedCount: results.length - valid.length,
    aggregation: aggregate(valid)
  };
}
```

### Strategy 2: Retry with Backoff

```javascript
async function executeWithRetry(task, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await task.execute();
    } catch (error) {
      lastError = error;
      await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
    }
  }

  throw lastError;
}
```

### Strategy 3: Critical vs. Non-Critical

```javascript
async function executeGroups(groups) {
  for (const group of groups) {
    const results = await Promise.allSettled(
      group.tasks.map(t => t.execute())
    );

    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0 && group.critical) {
      throw new Error('Critical task failed');
    }

    // Non-critical failures: log and continue
    if (failures.length > 0) {
      console.warn(`${failures.length} non-critical tasks failed`);
    }
  }
}
```

### Strategy 4: Health Monitoring

```javascript
class HealthMonitor {
  constructor(thresholds) {
    this.errorRate = 0;
    this.completed = 0;
    this.failed = 0;
    this.thresholds = thresholds;
  }

  recordResult(success) {
    this.completed++;
    if (!success) this.failed++;
    this.errorRate = this.failed / this.completed;
  }

  isHealthy() {
    return this.errorRate < this.thresholds.maxErrorRate;
  }
}
```

---

## 7. Recommendations

| Scenario | Pattern | Configuration |
|----------|---------|---------------|
| Independent tasks | Concurrency pool | maxConcurrent: 5 |
| Mixed workloads | Priority queue | HIGH/NORMAL/LOW |
| Dependent tasks | Dependency graph | Parallel groups |
| Shared resources | Partitioning | Per-task directories |
| API-constrained | Rate limiting | Based on API limits |
| Failure-tolerant | Partial aggregation | minRequired: 50% |
| Transient failures | Retry + backoff | maxRetries: 3 |

---

## 8. Implementation Checklist

- [ ] Implement concurrency-limited pool
- [ ] Add priority queue support
- [ ] Build dependency graph executor
- [ ] Implement file partitioning strategy
- [ ] Add cache invalidation with mtime
- [ ] Create result aggregation pipeline
- [ ] Implement retry with exponential backoff
- [ ] Add health monitoring
- [ ] Handle partial failures gracefully
- [ ] Add execution metrics/observability
