# Phase 5: Implementation Patterns

**Analysis Plan:** Parallel Execution Architecture
**Tasks Covered:** 5.1, 5.2, 5.3, 5.4, 5.5
**Date:** 2025-12-25

---

## Overview

This document defines four concrete implementation patterns for parallel execution in the plan system, along with a comprehensive tradeoff analysis. Each pattern is designed to address different scenarios and constraints identified in Phases 1-4.

---

## 5.1 Pattern: Independent Parallel Execution

### Description

Independent parallel execution is the simplest pattern where tasks have **no dependencies** on each other - they don't share files, state, or outputs. Tasks execute simultaneously without coordination.

### When to Use

- Tasks modify disjoint file sets
- Tasks produce outputs that aren't consumed by other tasks
- Tasks have no shared state requirements
- Maximum parallelism is desired

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 INDEPENDENT PARALLEL PATTERN                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      Orchestrator                            │
│                           │                                  │
│          ┌────────────────┼────────────────┐                │
│          │                │                │                │
│          ▼                ▼                ▼                │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐            │
│     │ Task A  │     │ Task B  │     │ Task C  │            │
│     │ (docs/) │     │ (tests/)│     │ (cli/)  │            │
│     └────┬────┘     └────┬────┘     └────┬────┘            │
│          │               │               │                  │
│          │  No sync      │  No sync      │                  │
│          │  required     │  required     │                  │
│          ▼               ▼               ▼                  │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐            │
│     │Output A │     │Output B │     │Output C │            │
│     └─────────┘     └─────────┘     └─────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Task Selection

```javascript
function selectIndependentTasks(tasks, maxParallel = 5) {
  const selected = [];
  const usedFiles = new Set();

  for (const task of tasks) {
    const taskFiles = extractFileReferences(task);
    const hasConflict = taskFiles.some(f => usedFiles.has(f));

    if (!hasConflict && selected.length < maxParallel) {
      selected.push(task);
      taskFiles.forEach(f => usedFiles.add(f));
    }
  }

  return selected;
}
```

#### 2. Parallel Launch

```markdown
# Launch all tasks simultaneously
Use the Task tool with multiple calls in a single response:

Task 1: [Agent for task A]
Task 2: [Agent for task B]
Task 3: [Agent for task C]

All three launch at the same time, no waiting between them.
```

#### 3. Result Collection

```javascript
// Wait for all results without ordering
const results = await Promise.all([
  TaskOutput({ task_id: agent1Id }),
  TaskOutput({ task_id: agent2Id }),
  TaskOutput({ task_id: agent3Id })
]);

// All results available, write outputs in any order
for (const result of results) {
  writeFiles(result.outputs);
  markTaskCompleted(result.taskId);
}
```

### Current Implementation Status

**Supported:** YES - within same phase, if no `[SEQUENTIAL]` annotation

**Location:** `plan:batch` and `plan:orchestrate`

**Constraints:**
- Maximum 5 parallel agents per batch
- Only within same phase (phase ordering still enforced)
- File conflict detection is manual (via `[SEQUENTIAL]` annotation)

### Example Scenario

```markdown
## Phase 2: Documentation Updates

- [ ] 2.1 Update API documentation (docs/api/*.md)
- [ ] 2.2 Update CLI reference (docs/cli/*.md)
- [ ] 2.3 Update tutorials (docs/tutorials/*.md)
- [ ] 2.4 Update configuration guide (docs/config/*.md)

No [SEQUENTIAL] annotation → All 4 tasks run in parallel
```

### Metrics

| Metric | Value |
|--------|-------|
| Coordination overhead | None |
| Maximum parallelism | O(n) tasks simultaneously |
| Failure isolation | Complete (tasks independent) |
| Complexity | Low |

---

## 5.2 Pattern: Dependency-Aware Parallel Execution

### Description

Dependency-aware execution represents task relationships as a **Directed Acyclic Graph (DAG)**, enabling maximum parallelism while respecting explicit dependencies. Tasks run as soon as all their predecessors complete.

### When to Use

- Tasks have explicit dependencies on each other
- Some tasks produce outputs needed by others
- Maximum parallelism needed within dependency constraints
- Fine-grained control over execution order

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              DEPENDENCY-AWARE PARALLEL PATTERN               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Task Dependency Graph (DAG):                               │
│                                                              │
│   ┌─────┐     ┌─────┐                                       │
│   │ T1  │────►│ T3  │─────────┐                             │
│   └─────┘     └─────┘         │                             │
│                               ▼                             │
│   ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐              │
│   │ T2  │────►│ T4  │────►│ T6  │────►│ T7  │              │
│   └─────┘     └─────┘     └─────┘     └─────┘              │
│       │                       ▲                             │
│       └───────────────────────┘                             │
│                                                              │
│   Execution Timeline:                                        │
│   ─────────────────────────────────────────────────────►    │
│   │         │         │         │         │                 │
│   T1,T2     T3,T4     T5        T6        T7                │
│   (parallel)(parallel)(wait T4) (wait T3,T5)(wait T6)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Dependency Declaration (Plan Markdown)

```markdown
## Phase 1: Core Implementation

- [ ] 1.1 Create shared types (src/types/auth.ts)
- [ ] 1.2 Create database schema (src/db/schema.ts)
- [ ] 1.3 Implement auth service (depends: 1.1, 1.2)
- [ ] 1.4 Create API endpoints (depends: 1.3)
- [ ] 1.5 Write unit tests (depends: 1.1)
- [ ] 1.6 Write integration tests (depends: 1.3, 1.4)
```

#### 2. DAG Construction

```javascript
function buildDependencyGraph(tasks) {
  const graph = new Map();

  for (const task of tasks) {
    graph.set(task.id, {
      task,
      dependencies: parseDependencies(task.description),
      dependents: [],
      status: 'pending',
      inDegree: 0
    });
  }

  // Calculate in-degrees and dependents
  for (const [id, node] of graph) {
    for (const depId of node.dependencies) {
      const depNode = graph.get(depId);
      if (depNode) {
        depNode.dependents.push(id);
        node.inDegree++;
      }
    }
  }

  return graph;
}
```

#### 3. Topological Execution (Kahn's Algorithm)

```javascript
async function executeDAG(graph, maxParallel = 5) {
  const ready = [];
  const completed = new Set();

  // Find initially ready tasks (inDegree = 0)
  for (const [id, node] of graph) {
    if (node.inDegree === 0) {
      ready.push(id);
    }
  }

  while (ready.length > 0 || hasInProgress(graph)) {
    // Launch up to maxParallel ready tasks
    const batch = ready.splice(0, maxParallel);
    const promises = batch.map(id => executeTask(graph.get(id).task));

    // Wait for any completion
    const result = await Promise.race(promises);
    completed.add(result.taskId);

    // Update dependents
    const node = graph.get(result.taskId);
    for (const dependentId of node.dependents) {
      const dependent = graph.get(dependentId);
      dependent.inDegree--;
      if (dependent.inDegree === 0 && !completed.has(dependentId)) {
        ready.push(dependentId);
      }
    }
  }
}
```

#### 4. Ready Task Detection

```javascript
function getReadyTasks(graph, completed) {
  const ready = [];

  for (const [id, node] of graph) {
    if (node.status === 'pending') {
      const allDepsCompleted = node.dependencies.every(
        depId => completed.has(depId)
      );
      if (allDepsCompleted) {
        ready.push(id);
      }
    }
  }

  return ready;
}
```

### Current Implementation Status

**Supported:** PARTIAL - phase-level only, not task-level

**Current behavior:**
- Phase ordering: 80% completion threshold before next phase
- Within phase: No task-level dependency support
- `[SEQUENTIAL]` annotation: Orders tasks but doesn't express dependencies

**Gap:** Need explicit `depends: X.Y` syntax in task descriptions

### Proposed Enhancement

```json
// Enhanced status.json structure
{
  "tasks": [
    {
      "id": "1.3",
      "description": "Implement auth service",
      "dependencies": ["1.1", "1.2"],
      "dependents": ["1.4", "1.6"],
      "status": "pending"
    }
  ],
  "dependencyGraph": {
    "1.1": { "dependents": ["1.3", "1.5"] },
    "1.2": { "dependents": ["1.3"] },
    "1.3": { "dependencies": ["1.1", "1.2"], "dependents": ["1.4", "1.6"] }
  }
}
```

### Metrics

| Metric | Value |
|--------|-------|
| Coordination overhead | Moderate (graph maintenance) |
| Maximum parallelism | O(width of DAG) |
| Failure handling | Skip dependents, continue others |
| Complexity | Medium-High |

---

## 5.3 Pattern: Batched Parallel Execution

### Description

Batched execution groups tasks into fixed-size batches that execute in parallel, with synchronization points between batches. This is the **current default pattern** in the plan system.

### When to Use

- Simple implementation needed
- Predictable resource usage
- Phase-level ordering is sufficient
- No complex inter-task dependencies

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 BATCHED PARALLEL PATTERN                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Batch 1 (Phase 1 tasks):                                  │
│   ┌───────────────────────────────────────┐                 │
│   │ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │                 │
│   │ │ T1  │  │ T2  │  │ T3  │  │ T4  │   │                 │
│   │ └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘   │                 │
│   │    │        │        │        │       │                 │
│   │    └────────┴────────┴────────┘       │                 │
│   │              │                        │                 │
│   │              ▼                        │                 │
│   │         Wait for all                  │                 │
│   └───────────────────────────────────────┘                 │
│                  │                                           │
│                  ▼ Batch boundary (sync point)               │
│                                                              │
│   Batch 2 (Phase 2 tasks):                                  │
│   ┌───────────────────────────────────────┐                 │
│   │ ┌─────┐  ┌─────┐  ┌─────┐            │                 │
│   │ │ T5  │  │ T6  │  │ T7  │            │                 │
│   │ └──┬──┘  └──┬──┘  └──┬──┘            │                 │
│   │    │        │        │                │                 │
│   │    └────────┴────────┘                │                 │
│   │              │                        │                 │
│   │              ▼                        │                 │
│   │         Wait for all                  │                 │
│   └───────────────────────────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation (Current)

#### 1. Batch Selection (`status-cli.js next N`)

```javascript
function cmdNext(maxTasks = 5) {
  const next = [];

  // Priority 1: In-progress tasks
  // Priority 2: Failed tasks (retry)
  // Priority 3: Pending tasks (respecting phase order)

  for (const phase of phases) {
    // Check 80% completion threshold
    const previousMostlyComplete = previousPhases.every(p => {
      const completed = p.tasks.filter(t =>
        t.status === 'completed' || t.status === 'skipped'
      ).length;
      return completed >= p.tasks.length * 0.8;
    });

    if (previousIncomplete && !previousMostlyComplete) {
      continue; // Skip this phase
    }

    // Add pending tasks from this phase
    for (const task of phase.tasks) {
      if (task.status === 'pending' && next.length < maxTasks) {
        next.push(task);
      }
    }
  }

  return next;
}
```

#### 2. Batch Execution (`plan:orchestrate`)

```markdown
Main Execution Loop:

Step 2.1: Get Next Tasks
  └── node scripts/status-cli.js next 5

Step 2.2: Execute Tasks in Parallel
  ├── Launch up to 3-5 Task agents simultaneously
  ├── Use subagent_type="general-purpose"
  └── Each agent marks own task started/complete

Step 2.3: Collect Results
  └── Wait for all agents via TaskOutput

Step 2.4: Report Progress

Step 2.5: Loop Back (IMMEDIATELY)
```

#### 3. Batch Size Guidelines

| Plan Size | Batch Size | Rationale |
|-----------|------------|-----------|
| < 10 tasks | 2-3 | Small plan, quick iteration |
| 10-30 tasks | 3-4 | Medium plan, balanced |
| > 30 tasks | 4-5 | Large plan, maximize throughput |

### Sequential Constraint Handling

Tasks marked `[SEQUENTIAL]` execute one at a time within a batch:

```markdown
**Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify same file

Batch containing 3.1-3.4:
├── 3.1 (execute, wait)
├── 3.2 (execute, wait)
├── 3.3 (execute, wait)
└── 3.4 (execute, wait)
```

### Current Implementation Status

**Supported:** YES - this is the default pattern

**Location:**
- Batch selection: `scripts/status-cli.js` `cmdNext()`
- Execution: `.claude/commands/plan/orchestrate.md`
- Batch skill: `.claude/commands/plan/batch.md`

### Metrics

| Metric | Value |
|--------|-------|
| Coordination overhead | Low (batch boundaries only) |
| Maximum parallelism | O(batch size) |
| Failure handling | Retry in next batch |
| Complexity | Low |

### Advantages

1. **Simple mental model:** Batches are predictable
2. **Resource control:** Fixed parallel task limit
3. **Phase isolation:** Batches respect phase boundaries
4. **Easy debugging:** Clear sync points

### Disadvantages

1. **Under-utilization:** Wait for slowest task in batch
2. **Artificial boundaries:** May delay ready tasks
3. **No dependency optimization:** Doesn't exploit task graph

---

## 5.4 Pattern: Pipeline Parallelism (Phase Overlap)

### Description

Pipeline parallelism allows **phases to overlap** at their boundaries, starting the next phase before the current phase fully completes. This reduces wait time by exploiting the 80% threshold and task independence.

### When to Use

- Phases have independent early tasks
- Later phase tasks don't depend on all prior phase tasks
- Reducing total execution time is critical
- VERIFY tasks can run in background

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  PIPELINE PARALLEL PATTERN                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Timeline:                                                  │
│   ────────────────────────────────────────────────────────►  │
│                                                              │
│   Phase 1:  │████████████████████████│                      │
│             │████│ T1                │                      │
│             │████████│ T2            │                      │
│             │████████████│ T3        │                      │
│             │████████████████│ T4    │ (80% complete)       │
│             │████████████████████│ T5│ (continues)          │
│                               │                              │
│   Phase 2:                    │███████████████████│          │
│   (starts at 80%)             │███│ T6            │          │
│                               │███████│ T7        │          │
│                               │███████████│ T8    │          │
│                                              │               │
│   Phase 3:                                   │██████████│    │
│   (starts when Phase 2 at 80%)               │          │    │
│                                                              │
│   Overlap reduces total time by ~20-30%                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Current 80% Threshold (Already Implemented)

```javascript
// From status-cli.js
const previousMostlyComplete = previousPhases.every(p => {
  const completed = p.tasks.filter(t =>
    t.status === 'completed' || t.status === 'skipped'
  ).length;
  return completed >= p.tasks.length * 0.8;  // 80% allows overlap
});
```

#### 2. Enhanced Pipeline with Task-Level Dependencies

```javascript
function getPipelineReadyTasks(status, maxTasks) {
  const ready = [];

  for (const phase of status.phases) {
    for (const task of phase.tasks) {
      if (task.status !== 'pending') continue;

      // Check task-level dependencies, not just phase
      const dependencies = parseTaskDependencies(task);
      const allDepsComplete = dependencies.every(depId => {
        const depTask = findTask(status, depId);
        return depTask && depTask.status === 'completed';
      });

      if (allDepsComplete) {
        ready.push(task);
        if (ready.length >= maxTasks) break;
      }
    }
  }

  return ready;
}
```

#### 3. VERIFY as Non-Blocking Background

```markdown
## Phase 1: Implementation

- [ ] 1.1-1.4 Implementation tasks

**VERIFY Phase 1:** (non-blocking)
- [ ] 1.5 Run build check
- [ ] 1.6 Run tests

## Phase 2: Integration (pipeline-start: 60% of Phase 1)

**Pipeline Note:** Phase 2 tasks 2.1-2.2 can start when 1.1-1.3 complete,
before VERIFY Phase 1 finishes.
```

#### 4. Pipeline Annotation Syntax

```markdown
## Phase 2: Documentation (parallel-with: Phase 3)
- Tasks modify: docs/*

## Phase 3: Tests (parallel-with: Phase 2)
- Tasks modify: tests/*

**Pipeline Note:** Phases 2-3 run concurrently with Phase 1 VERIFY
```

### Current Implementation Status

**Supported:** PARTIAL - 80% threshold enables some overlap

**Gap:** No explicit pipeline annotations or task-level dependency tracking

### Proposed Enhancement

```markdown
## Phase 1: Core
- [ ] 1.1 Create types
- [ ] 1.2 Create utils
- [ ] 1.3 Create service (depends: 1.1, 1.2)

**VERIFY Phase 1:** (background: true)
- [ ] 1.4 Type check
- [ ] 1.5 Unit tests

## Phase 2: Integration
**pipeline-start:** when 1.3 completes (not waiting for VERIFY)
- [ ] 2.1 Integration tests (depends: 1.3)
```

### Execution Timeline Comparison

**Without Pipeline (Sequential):**
```
Phase 1: │████████████████│
                         │
Phase 2:                  │████████████│
                                       │
Phase 3:                               │████████│

Total: 36 units
```

**With Pipeline (80% Threshold):**
```
Phase 1: │████████████████│
                    │
Phase 2:            │████████████│
                              │
Phase 3:                      │████████│

Total: 28 units (22% reduction)
```

**With Aggressive Pipeline (Task Dependencies):**
```
Phase 1: │████████████████│
              │
Phase 2:      │████████████│
                     │
Phase 3:             │████████│

Total: 24 units (33% reduction)
```

### Metrics

| Metric | Value |
|--------|-------|
| Coordination overhead | Moderate (dependency tracking) |
| Maximum parallelism | O(concurrent phases × tasks) |
| Failure handling | Complex (may need rollback) |
| Complexity | Medium-High |

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| VERIFY fails after next phase starts | Implement rollback or mark dependent tasks failed |
| Resource contention | Monitor and throttle concurrent phases |
| Debugging complexity | Clear logging of pipeline state |

---

## 5.5 Pattern Tradeoff Comparison

### Summary Table

| Pattern | Parallelism Level | Coordination Overhead | Complexity | Best Use Case |
|---------|-------------------|----------------------|------------|---------------|
| **Independent** | Maximum | None | Low | Disjoint file sets |
| **DAG-Based** | Optimized | Moderate | High | Complex dependencies |
| **Batched** | Fixed | Low | Low | Simple plans |
| **Pipeline** | High | Moderate | Medium | Long-running plans |

### Detailed Comparison Matrix

| Dimension | Independent | DAG-Based | Batched | Pipeline |
|-----------|-------------|-----------|---------|----------|
| **Implementation Effort** | Low | High | Low (done) | Medium |
| **Maximum Speedup** | ~5x (batch limit) | Depends on graph | ~5x | ~1.5x per overlap |
| **Failure Isolation** | Complete | Partial (deps) | By batch | Complex |
| **Debugging** | Easy | Medium | Easy | Hard |
| **Resource Predictability** | High | Variable | High | Medium |
| **Scalability** | Linear | Sub-linear | Linear | Sub-linear |

### When to Use Each Pattern

#### Use Independent Parallel When:

```
✓ Tasks modify completely different files
✓ No shared state between tasks
✓ Maximum throughput needed
✓ Simple plan structure

Example scenarios:
- Parallel documentation updates across sections
- Independent test file creation
- Multi-module code generation
```

#### Use DAG-Based When:

```
✓ Complex inter-task dependencies exist
✓ Some tasks produce outputs needed by others
✓ Maximum parallelism within constraints needed
✓ Plan has many tasks with varied dependencies

Example scenarios:
- Build systems with compile → link → package
- Data pipelines with transform → aggregate → report
- Service deployment with schema → services → integration
```

#### Use Batched When:

```
✓ Simple is better
✓ Predictable resource usage needed
✓ Phase boundaries are meaningful
✓ Current implementation sufficient

Example scenarios:
- Most standard plans (current default)
- CI/CD pipelines
- Plans without complex dependencies
```

#### Use Pipeline When:

```
✓ Phases take long time
✓ Early tasks of next phase are independent
✓ VERIFY can run in background
✓ Total time reduction is priority

Example scenarios:
- Large refactoring plans
- Multi-team coordination
- Long-running analysis plans
```

### Performance Projections

Based on analysis of current plans:

| Plan Type | Current (Batched) | With DAG | With Pipeline |
|-----------|------------------|----------|---------------|
| Small (10 tasks) | 100% | 85% | 90% |
| Medium (30 tasks) | 100% | 70% | 75% |
| Large (50+ tasks) | 100% | 55% | 60% |

*Percentages represent relative execution time (lower is better)*

### Implementation Priority Recommendation

1. **Keep Batched (Current)** - Already working, low risk
2. **Add Pipeline Annotations** - Medium effort, good ROI
3. **Implement DAG Support** - High effort, highest potential gain
4. **Optimize Independent Detection** - Low effort, incremental gain

### Hybrid Approach

The optimal approach may combine patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                     HYBRID EXECUTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1 (Independent):                                      │
│  ├── Parallel docs (2.1-2.4)    ─┬─ Independent pattern      │
│  └── Parallel tests (2.5-2.8)   ─┘                          │
│                                                              │
│  Phase 2 (DAG):                                             │
│  ├── 3.1 Types                                              │
│  ├── 3.2 Utils (depends: 3.1)   ─┬─ DAG pattern             │
│  └── 3.3 Service (depends: 3.2) ─┘                          │
│                                                              │
│  Phase 3 (Pipeline overlap with Phase 2 VERIFY):            │
│  └── 4.1-4.3                     ─── Pipeline pattern        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Decision Flowchart

```
                    ┌─────────────────┐
                    │ Analyze Tasks   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ No deps? │  │ Complex  │  │ Simple   │
        │ Disjoint │  │ deps?    │  │ phase    │
        │ files?   │  │ Graph?   │  │ order?   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             ▼             ▼             ▼
       Independent      DAG-Based      Batched
                             │
                             │ Long phases?
                             ▼
                       + Pipeline
```

---

## Summary

### Key Findings

| Finding | Impact | Recommendation |
|---------|--------|----------------|
| Batched pattern works well | Foundation is solid | Keep as default |
| DAG would enable finer parallelism | 30-45% potential speedup | Implement for complex plans |
| Pipeline already partially exists | 80% threshold | Add explicit annotations |
| Independent pattern is underutilized | Quick win | Auto-detect file independence |

### Implementation Roadmap

**Phase 1: Quick Wins**
- Formalize `[PARALLEL]` annotation for phases
- Auto-detect independent tasks (file manifest)
- Add `pipeline-start` annotation parsing

**Phase 2: DAG Support**
- Add `depends:` syntax to task descriptions
- Build dependency graph at plan initialization
- Modify `next` command to return DAG-ready tasks

**Phase 3: Full Pipeline**
- Background VERIFY execution
- Cross-phase task scheduling
- Rollback mechanisms for pipeline failures

### Verification Criteria

- [ ] All 4 patterns documented with architecture diagrams
- [ ] Implementation examples provided for each pattern
- [ ] Current vs proposed comparison completed
- [ ] Tradeoff matrix created with clear decision criteria
- [ ] Hybrid approach documented for real-world usage
