# Implementation Plan: Parallel Execution Dependencies

## Overview

- **Goal:** Implement task-level dependency graph for fine-grained parallel execution
- **Priority:** P1
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/parallel-execution-dependencies/`

> Enables `depends:` syntax in task descriptions for explicit cross-task and cross-phase dependencies. Replaces coarse phase ordering with DAG-based scheduling.

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Dependencies

### Upstream
- **parallel-execution-foundation.md** - Provides `--plan` argument and conflict detection

### Downstream
- **git-workflow-phase3-safety.md** - Can use dependencies for rollback ordering
- **git-workflow-phase4-advanced.md** - Can use dependencies for merge ordering
- **git-workflow-phase5-worktrees.md** - Multi-plan benefits from fine-grained scheduling

### External Tools
- None

---

## Phase 1: Dependency Syntax Parsing

**Objective:** Parse `(depends: X.Y, X.Z)` syntax from task descriptions.

- [ ] 1.1 Define dependency syntax specification
  - Format: `(depends: 1.1)` or `(depends: 1.1, 1.2, 2.3)`
  - Must appear in task description (checklist item or task section)
  - Task IDs must be valid (exist in plan)
  - Document in `.claude/commands/plan/_common/status-tracking.md`
- [ ] 1.2 Create `parseDependencies(taskDescription)` function in `scripts/lib/plan-status.js`
  - Regex pattern: `/\(depends:\s*([\d.,\s]+)\)/i`
  - Extract and split task IDs
  - Return array of dependency task IDs
  - Return empty array if no dependencies
- [ ] 1.3 Create `validateDependencies(taskId, dependencies, allTaskIds)` function
  - Check all dependency task IDs exist
  - Check for self-dependency (task depends on itself)
  - Return validation result with errors if invalid
- [ ] 1.4 Add unit tests for dependency parsing in `scripts/tests/test-dependencies.js`
  - Test single dependency: `(depends: 1.1)`
  - Test multiple: `(depends: 1.1, 1.2, 2.3)`
  - Test whitespace variations
  - Test invalid formats

**VERIFY Phase 1:**
- [ ] `parseDependencies("Implement auth (depends: 1.1, 1.2)")` returns `["1.1", "1.2"]`
- [ ] `parseDependencies("No dependencies here")` returns `[]`
- [ ] Invalid task IDs in dependencies detected and reported
- [ ] Self-dependency detected and rejected

---

## Phase 2: Dependency Graph Construction

**Objective:** Build and store task dependency graph in status.json.

- [ ] 2.1 Create `buildDependencyGraph(tasks)` function in `scripts/lib/plan-status.js`
  - Input: array of tasks with descriptions
  - Output: Map of taskId -> { dependencies: [], dependents: [], inDegree: number }
  - Parse dependencies from each task description
  - Calculate dependents (reverse mapping)
  - Calculate in-degree for topological sort
- [ ] 2.2 Create `detectDependencyCycles(graph)` function
  - Implement cycle detection using DFS
  - Return cycle path if found: `["1.1", "1.2", "1.3", "1.1"]`
  - Return null if no cycles
- [ ] 2.3 Extend `initializePlanStatus()` to build and store dependency graph
  - Call `buildDependencyGraph()` during initialization
  - Store in status.json under `dependencyGraph` field
  - Validate no cycles, fail initialization if cycles found
- [ ] 2.4 Add `dependencies` and `dependents` fields to task objects in status.json
  - Each task stores its own dependencies for quick lookup
- [ ] 2.5 Create `refreshDependencyGraph(planPath)` function
  - Rebuild graph from current plan file
  - Update status.json
  - Useful after plan edits

**VERIFY Phase 2:**
- [ ] status.json contains `dependencyGraph` after initialization
- [ ] Each task has `dependencies` array in status.json
- [ ] Cycle detection catches `A->B->C->A` pattern
- [ ] Graph correctly calculates in-degrees

---

## Phase 3: DAG-Aware Task Selection

**Objective:** Modify `next` command to return tasks based on dependency graph.

- [ ] 3.1 Create `getReadyTasks(status, maxTasks)` function in `scripts/lib/plan-status.js`
  - Task is ready if: status is `pending` AND all dependencies are `completed` or `skipped`
  - Respect existing phase ordering as secondary criterion
  - Return up to maxTasks ready tasks
- [ ] 3.2 Modify `cmdNext()` in `status-cli.js` to use DAG-aware selection
  - Replace current phase-based selection with `getReadyTasks()`
  - Still respect `[SEQUENTIAL]` annotations within ready tasks
  - Still respect file conflict detection from foundation plan
- [ ] 3.3 Add `blockedBy` field to task output when task has unmet dependencies
  - Show which dependencies are not yet complete
  - Helps debugging why a task isn't being selected
- [ ] 3.4 Add `--ignore-deps` flag to `next` command
  - Bypass dependency checking for manual overrides
  - Useful for debugging or forcing task order
- [ ] 3.5 Update `next` command JSON output format
  - Include `dependencies`, `dependents`, `blockedBy` fields

**VERIFY Phase 3:**
- [ ] Task with incomplete dependencies not returned by `next`
- [ ] Task becomes ready immediately when last dependency completes
- [ ] `blockedBy` shows pending dependencies
- [ ] `--ignore-deps` bypasses dependency checking

---

## Phase 4: Cross-Phase Dependencies

**Objective:** Enable dependencies that cross phase boundaries.

- [ ] 4.1 Update `getReadyTasks()` to allow cross-phase scheduling
  - If task 3.1 depends only on 1.1, it can start as soon as 1.1 completes
  - Don't wait for entire Phase 1 or Phase 2
- [ ] 4.2 Preserve phase ordering as tiebreaker
  - When multiple tasks are ready, prefer earlier phases
  - Configurable via `--phase-priority` flag
- [ ] 4.3 Update progress display to show cross-phase execution
  - Indicate when tasks from different phases run in parallel
  - Show "Phase 1: 80%, Phase 2: 20%" style progress
- [ ] 4.4 Document cross-phase dependency behavior
  - When to use phase ordering vs explicit dependencies
  - Best practices for complex plans

**VERIFY Phase 4:**
- [ ] Task 3.1 can start before Phase 2 completes if dependencies met
- [ ] Progress shows parallel phase execution
- [ ] Phase priority works as tiebreaker

---

## Phase 5: Pipeline Phase Overlap

**Objective:** Enable next phase to start before current phase's VERIFY tasks complete.

- [ ] 5.1 Add `(non-blocking)` annotation for VERIFY tasks
  - Pattern: `**VERIFY Phase N:** (non-blocking)`
  - VERIFY tasks don't block next phase from starting
  - VERIFY failures still reported but don't cascade
- [ ] 5.2 Implement `pipeline-start` annotation parsing
  - Pattern: `**pipeline-start:** when X.Y completes`
  - Phase can start when specific task completes, not entire prior phase
- [ ] 5.3 Update `getReadyTasks()` to handle pipeline annotations
  - Check pipeline-start conditions
  - Allow early phase advancement
- [ ] 5.4 Add pipeline visualization to progress output
  - Show overlapping phases
  - Indicate pipeline advancement points
- [ ] 5.5 Document pipeline patterns and when to use them

**VERIFY Phase 5:**
- [ ] VERIFY marked `(non-blocking)` doesn't block next phase
- [ ] `pipeline-start` enables early phase advancement
- [ ] Progress shows pipeline overlap

---

## Phase 6: Dependency Visualization

**Objective:** Provide tools to visualize and validate dependency graphs.

- [ ] 6.1 Add `deps` command to status-cli.js
  - `node scripts/status-cli.js deps` - Show dependency summary
  - `node scripts/status-cli.js deps --graph` - ASCII graph visualization
  - `node scripts/status-cli.js deps --task 2.3` - Show deps for specific task
- [ ] 6.2 Implement ASCII dependency graph output
  - Show tasks as nodes
  - Show dependencies as arrows
  - Highlight ready tasks, completed tasks, blocked tasks
- [ ] 6.3 Add `--validate-deps` flag to `init` command
  - Check all dependencies are valid
  - Report any cycles or invalid references
  - Fail initialization if critical issues found
- [ ] 6.4 Add dependency info to `/plan:status` skill output
  - Show blocked tasks and their blockers
  - Show critical path (longest dependency chain)

**VERIFY Phase 6:**
- [ ] `deps` command shows dependency summary
- [ ] `deps --graph` produces readable ASCII visualization
- [ ] Validation catches invalid dependencies
- [ ] Critical path calculated correctly

---

## Phase 7: Orchestrator Integration

**Objective:** Update orchestrator and batch commands to use DAG scheduling.

- [ ] 7.1 Update `.claude/commands/plan/orchestrate.md` to use DAG-aware `next`
  - Document new behavior
  - Explain cross-phase execution
- [ ] 7.2 Update `.claude/commands/plan/batch.md` to respect dependencies
  - Don't batch tasks where one depends on another
  - Group independent tasks for parallel execution
- [ ] 7.3 Update `.claude/commands/plan/implement.md` dependency checking
  - Warn if implementing task with unmet dependencies
  - Allow override with `--force` flag
- [ ] 7.4 Add dependency-aware progress estimation
  - Estimate completion based on critical path
  - Show "blocked time" vs "working time"

**VERIFY Phase 7:**
- [ ] Orchestrator correctly uses DAG scheduling
- [ ] Batch respects dependencies
- [ ] Implement warns about unmet dependencies

---

## Phase 8: Integration Testing

- [ ] 8.1 Create test plan with complex dependencies
  - Cross-phase dependencies
  - Diamond pattern (A->B, A->C, B->D, C->D)
  - Long dependency chains
- [ ] 8.2 Run test plan through orchestrator
  - Verify correct execution order
  - Verify parallel execution of independent tasks
  - Measure speedup vs phase-only ordering
- [ ] 8.3 Test edge cases
  - All tasks depend on task 0.1 (fan-out)
  - All tasks feed into final task (fan-in)
  - Circular dependency rejection
- [ ] 8.4 Document test results and performance measurements

**VERIFY Phase 8:**
- [ ] Complex dependency plan executes correctly
- [ ] Parallel speedup measured and documented
- [ ] Edge cases handled gracefully
- [ ] No regressions in existing functionality

---

## Success Criteria

### Functional
- [ ] `depends:` syntax parsed from task descriptions
- [ ] Dependency graph stored in status.json
- [ ] Cycle detection prevents invalid plans
- [ ] DAG-aware `next` command returns ready tasks
- [ ] Cross-phase dependencies enable fine-grained parallelism
- [ ] Pipeline overlap reduces total execution time

### Quality
- [ ] 30%+ speedup on complex plans with mixed dependencies
- [ ] No regressions in existing plan execution
- [ ] Visualization tools help debug dependency issues
- [ ] Documentation complete with examples

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cycle in dependencies | HIGH | LOW | Cycle detection at init, clear error message |
| Over-parallelization | MEDIUM | MEDIUM | Resource limits, phase priority tiebreaker |
| Complex debugging | MEDIUM | MEDIUM | Visualization tools, blockedBy field |
| Performance overhead | LOW | LOW | Graph is small, operations are O(n) |
| Breaking existing plans | HIGH | LOW | Dependencies optional, phase ordering preserved |

---

## Example Plan with Dependencies

```markdown
## Phase 1: Foundation

- [ ] 1.1 Create shared types (src/types/auth.ts)
- [ ] 1.2 Create database schema (src/db/schema.ts)
- [ ] 1.3 Implement auth service (depends: 1.1, 1.2)

**VERIFY Phase 1:** (non-blocking)
- [ ] 1.4 Type check passes

## Phase 2: API Layer

**pipeline-start:** when 1.3 completes

- [ ] 2.1 Create auth middleware (depends: 1.3)
- [ ] 2.2 Create user endpoints (depends: 2.1)
- [ ] 2.3 Create admin endpoints (depends: 2.1)

## Phase 3: Testing

- [ ] 3.1 Unit tests for types (depends: 1.1)
- [ ] 3.2 Unit tests for auth service (depends: 1.3)
- [ ] 3.3 Integration tests (depends: 2.2, 2.3)
```

**Execution order with DAG:**
1. 1.1, 1.2 (parallel - no deps)
2. 1.3, 3.1 (parallel - 1.3 deps met, 3.1 only needs 1.1)
3. 1.4, 2.1, 3.2 (parallel - pipeline allows 2.1, VERIFY non-blocking)
4. 2.2, 2.3 (parallel - both depend on 2.1)
5. 3.3 (depends on 2.2, 2.3)

**Speedup:** 5 steps vs 7 steps with strict phase ordering = ~30% faster
