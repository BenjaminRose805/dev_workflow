# Test Plan: Dependency Patterns Validation

## Overview

- **Goal:** Validate DAG-aware scheduling with complex dependency patterns
- **Priority:** P2
- **Created:** 2025-12-26
- **Output:** `docs/plan-outputs/test-dependency-patterns/`

> This is a test plan used to validate the parallel execution dependencies feature.
> It contains multiple dependency patterns to verify correct scheduling behavior.

---

## Phase 1: Foundation (No Dependencies)

**Objective:** Independent tasks that can all run in parallel.

- [ ] 1.1 Create base configuration file
- [ ] 1.2 Set up test fixtures
- [ ] 1.3 Initialize test database
- [ ] 1.4 Create shared utility functions

**VERIFY Phase 1:**
- All Phase 1 tasks can run in parallel
- No dependencies blocking any Phase 1 task

---

## Phase 2: Simple Dependencies

**Objective:** Tasks with simple linear dependencies.

- [ ] 2.1 Extend configuration (depends: 1.1)
- [ ] 2.2 Create fixture helpers (depends: 1.2)
- [ ] 2.3 Add database migrations (depends: 1.3)
- [ ] 2.4 Build utility wrappers (depends: 1.4)

**VERIFY Phase 2:**
- Each Phase 2 task correctly waits for its dependency
- Phase 2 tasks can run in parallel with each other (different deps)

---

## Phase 3: Diamond Pattern

**Objective:** Test the classic diamond dependency pattern: A→B, A→C, B→D, C→D

```
     3.1 (root)
     /   \
   3.2   3.3
     \   /
      3.4 (join)
```

- [ ] 3.1 Create shared interface
- [ ] 3.2 Implement strategy A (depends: 3.1)
- [ ] 3.3 Implement strategy B (depends: 3.1)
- [ ] 3.4 Combine strategies (depends: 3.2, 3.3)

**VERIFY Phase 3:**
- Task 3.1 runs first
- Tasks 3.2 and 3.3 can run in parallel after 3.1
- Task 3.4 waits for both 3.2 and 3.3

---

## Phase 4: Cross-Phase Dependencies

**Objective:** Tasks that depend on tasks from non-adjacent phases.

- [ ] 4.1 Create integration module (depends: 1.1, 2.1)
- [ ] 4.2 Build end-to-end tests (depends: 1.2, 3.4)
- [ ] 4.3 Generate documentation (depends: 1.4, 2.4, 3.4)

**VERIFY Phase 4:**
- Task 4.1 can start before Phase 2-3 complete (only needs 1.1 and 2.1)
- Task 4.2 requires Phase 3 diamond to complete
- Task 4.3 requires multiple tasks from different phases

---

## Phase 5: Long Chain

**Objective:** Test handling of long sequential dependency chains.

- [ ] 5.1 Step 1 of pipeline
- [ ] 5.2 Step 2 of pipeline (depends: 5.1)
- [ ] 5.3 Step 3 of pipeline (depends: 5.2)
- [ ] 5.4 Step 4 of pipeline (depends: 5.3)
- [ ] 5.5 Step 5 of pipeline (depends: 5.4)
- [ ] 5.6 Step 6 of pipeline (depends: 5.5)

**VERIFY Phase 5:**
- Tasks execute strictly in order: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6
- Critical path length equals 6

---

## Phase 6: Fan-Out Pattern

**Objective:** Many tasks depending on a single task.

```
      6.1
    /  |  \
  6.2 6.3 6.4
  |   |   |
 6.5 6.6 6.7
```

- [ ] 6.1 Create base service
- [ ] 6.2 Feature A module (depends: 6.1)
- [ ] 6.3 Feature B module (depends: 6.1)
- [ ] 6.4 Feature C module (depends: 6.1)
- [ ] 6.5 Feature A tests (depends: 6.2)
- [ ] 6.6 Feature B tests (depends: 6.3)
- [ ] 6.7 Feature C tests (depends: 6.4)

**VERIFY Phase 6:**
- After 6.1 completes, 6.2/6.3/6.4 can run in parallel
- Tasks 6.5/6.6/6.7 run in parallel after their respective dependencies

---

## Phase 7: Fan-In Pattern

**Objective:** Single task depending on many tasks.

- [ ] 7.1 Component A (depends: 6.5)
- [ ] 7.2 Component B (depends: 6.6)
- [ ] 7.3 Component C (depends: 6.7)
- [ ] 7.4 Final integration (depends: 7.1, 7.2, 7.3)

**VERIFY Phase 7:**
- Tasks 7.1/7.2/7.3 can run in parallel
- Task 7.4 waits for all three components

---

## Phase 8: Mixed Complex Pattern

**Objective:** Combination of all patterns in one phase.

- [ ] 8.1 Initialize complex module (depends: 4.3)
- [ ] 8.2 Build feature X (depends: 8.1, 5.6)
- [ ] 8.3 Build feature Y (depends: 8.1, 7.4)
- [ ] 8.4 Combine features (depends: 8.2, 8.3)
- [ ] 8.5 Final validation (depends: 8.4)

**VERIFY Phase 8:**
- Task 8.1 can start as soon as 4.3 completes
- Task 8.2 requires both 8.1 and the long chain (5.6)
- Task 8.3 requires both 8.1 and the fan-in (7.4)
- Task 8.4 waits for both 8.2 and 8.3
- Task 8.5 is the final task

---

## Success Criteria

### Dependency Validation
- [ ] All dependencies correctly parsed from task descriptions
- [ ] No cycles detected (plan should initialize successfully)
- [ ] Cross-phase dependencies properly tracked

### Scheduling Behavior
- [ ] DAG-aware `next` returns correct ready tasks
- [ ] Blocked tasks show their blockers
- [ ] Critical path correctly identified

### Execution Order
- [ ] Independent tasks can run in parallel
- [ ] Dependencies are respected
- [ ] Cross-phase execution happens when dependencies allow

---

## Expected Critical Path Analysis

The critical path through this plan is:
`1.1 → 2.1 → ... → 6.1 → 6.2 → 6.5 → 7.1 → 7.4 → 8.3 → 8.4 → 8.5`

Or through the long chain path:
`5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 8.2 → 8.4 → 8.5`

The actual critical path depends on which branch is longer.

---

## Parallelism Metrics

Expected parallelism characteristics:
- **Total tasks:** 43 (including VERIFY tasks)
- **Tasks with no dependencies:** ~8 (Phase 1 + 5.1 + 6.1)
- **Maximum parallel width:** ~6 (after 6.1 completes)
- **Estimated speedup factor:** ~3-4x over sequential execution
