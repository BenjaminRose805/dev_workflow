# Implementation Plan: Orchestration Constraint Parsing

## Overview

- **Goal:** Make [SEQUENTIAL] annotation parsing machine-readable throughout the orchestration pipeline
- **Priority:** P1 (important)
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/implement-orchestration-constraints/`
- **Source:** documentation-cleanup.md Deferred Work section

> This plan implements the code changes deferred from the documentation-cleanup plan. The documentation updates (minimum viable fix) were completed in that plan; this plan implements the complete machine-readable constraint pipeline.

## Description

Currently, `[SEQUENTIAL]` annotations in plan files are only interpreted at runtime by Claude reading the plan. This creates a risk that the orchestrator may batch tasks together without knowing they must run sequentially.

This plan makes constraints **machine-readable** by:
1. Parsing `[SEQUENTIAL]` annotations in `status-cli.js`
2. Returning constraint metadata with task objects
3. Storing constraints in `status.json`
4. Using constraints in `plan_orchestrator.py` for intelligent batching

**Impact:** The orchestrator will automatically respect `[SEQUENTIAL]` annotations without relying on Claude to parse and interpret them each session.

---

## Dependencies

### Upstream
- **documentation-cleanup.md** (COMPLETED - Phase 0 implemented documentation updates to `/plan:implement`)
- **PLAN-STANDARDS.md** (defines `[SEQUENTIAL]` annotation format)

### Downstream
- Future plans using `[SEQUENTIAL]` will benefit from machine-readable constraints

### External Tools
- None

---

## Phase 0: Schema and Type Definitions

**Objective:** Define the constraint data structures before implementing parsing logic.

**Tasks:**
- [ ] 0.1 Add `executionConstraints` field to `scripts/lib/schemas/plan-status.json`:
  ```json
  "executionConstraints": {
    "type": "object",
    "properties": {
      "sequential": { "type": "boolean" },
      "sequentialGroup": { "type": "string" },
      "reason": { "type": "string" }
    }
  }
  ```
- [ ] 0.2 Create type definitions for constraint metadata in new file `scripts/lib/constraint-types.js`:
  - Define `SequentialConstraint` shape: `{ taskIds: string[], reason: string }`
  - Define `ExecutionConstraints` shape: `{ sequential: boolean, sequentialGroup: string, reason: string }`
  - Export parsing helper types

**VERIFY Phase 0:**
- [ ] 0.3 Verify: Schema validates with `ajv` (if schema validation is used)
- [ ] 0.4 Verify: Type definitions can be imported in status-cli.js

---

## Phase 1: Constraint Parsing in plan-status.js

**Objective:** Implement the core constraint parsing logic in the plan-status library.

**Execution Note:** Tasks 1.1, 1.3, 1.4 all modify scripts/lib/plan-status.js but add different functions at different locations (can run in parallel - merge conflicts unlikely)

**Tasks:**
- [ ] 1.1 Add `parseExecutionNotes(planContent)` function to `scripts/lib/plan-status.js`:
  - Parse `**Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL]...` patterns
  - Return array of constraint objects: `[{ taskRange: "3.1-3.4", taskIds: ["3.1","3.2","3.3","3.4"], reason: "..." }]`
  - Handle multiple execution notes in a single plan
- [ ] 1.2 Add `expandTaskRange(rangeStr)` helper function:
  - Input: "3.1-3.4" → Output: ["3.1", "3.2", "3.3", "3.4"]
  - Handle edge cases: single task ("3.1" → ["3.1"]), non-contiguous ("3.1,3.3" → ["3.1", "3.3"])
- [ ] 1.3 Add `getTaskConstraints(planPath, taskId)` function:
  - Read plan file and parse execution notes
  - Return constraint object for a specific task, or null if no constraints
- [ ] 1.4 Export new functions from plan-status.js module

**VERIFY Phase 1:**
- [ ] 1.5 Create test file `scripts/tests/test-constraint-parsing.js`:
  - Test parseExecutionNotes with various annotation formats
  - Test expandTaskRange with range, single, and list formats
  - Test getTaskConstraints returns correct constraint for task in sequential group
  - Test getTaskConstraints returns null for task not in any group
- [ ] 1.6 Run: `node scripts/tests/test-constraint-parsing.js` passes

---

## Phase 2: Update cmdNext() to Return Constraints

**Objective:** Modify the `next` command to include constraint metadata with task objects.

**Execution Note:** Tasks 2.1-2.3 are [SEQUENTIAL] - all modify cmdNext() in status-cli.js

**Tasks:**
- [ ] 2.1 Import constraint parsing functions in `scripts/status-cli.js`:
  - Add import for `parseExecutionNotes`, `getTaskConstraints` from plan-status.js
- [ ] 2.2 Update `cmdNext()` function (lines 373-473) to read plan file:
  - After loading status.json, also read the plan file content
  - Call `parseExecutionNotes(planContent)` to get all constraints
- [ ] 2.3 Update task object construction in `cmdNext()` to include constraint metadata:
  - For each task, check if it's in a sequential group
  - Add fields: `sequential: true/false`, `sequentialGroup: "3.1-3.4"` (if applicable)
  - Keep backward compatibility (new fields are optional)

**VERIFY Phase 2:**
- [ ] 2.4 Test: `node scripts/status-cli.js next 5` on a plan with [SEQUENTIAL] annotations returns constraint metadata
- [ ] 2.5 Test: `node scripts/status-cli.js next 5` on a plan without annotations still works (backward compatible)
- [ ] 2.6 Verify JSON output includes new fields: `grep "sequential" <<< $(node scripts/status-cli.js next)`

---

## Phase 3: Populate Constraints During Init

**Objective:** Store parsed constraints in status.json during plan initialization.

**Tasks:**
- [ ] 3.1 Update `initializePlanStatus()` in `scripts/lib/plan-status.js`:
  - After parsing tasks, also parse execution notes
  - For each task, attach `executionConstraints` field if in a sequential group
- [ ] 3.2 Update `saveStatus()` in `scripts/lib/plan-status.js` to include constraints:
  - Constraints are stored per-task in the tasks array (task.executionConstraints)
  - Also store plan-level constraints summary in top-level field (status.sequentialGroups)
- [ ] 3.3 Add `refreshConstraints(planPath)` function:
  - Re-read plan file and update constraints in status.json
  - Useful if plan is edited after initialization

**VERIFY Phase 3:**
- [ ] 3.4 Test: `node scripts/status-cli.js init` on a plan with [SEQUENTIAL] creates status.json with constraints
- [ ] 3.5 Verify: `cat status.json | jq '.tasks[].executionConstraints'` shows constraint objects
- [ ] 3.6 Verify: `cat status.json | jq '.sequentialGroups'` shows plan-level summary

---

## Phase 4: Update plan_orchestrator.py

**Objective:** Use constraint metadata when batching tasks to avoid batching sequential tasks together.

**Tasks:**
- [ ] 4.1 Update `get_next_tasks()` in `scripts/plan_orchestrator.py` to handle constraint metadata:
  - Parse the JSON response from status-cli.js
  - Extract `sequential` and `sequentialGroup` fields
- [ ] 4.2 Add `_filter_sequential_tasks(tasks)` method:
  - Input: list of task objects from `next` command
  - Output: filtered list respecting sequential constraints
  - Logic: If multiple tasks share same `sequentialGroup`, only include the first one
- [ ] 4.3 Update `_build_prompt()` to include constraint information:
  - Add section listing sequential constraints from task metadata
  - Format: `## Sequential Constraints\n- Tasks 3.1-3.4: [SEQUENTIAL] - all modify same file`
- [ ] 4.4 Add constraint awareness to batch logic:
  - Before sending batch to Claude, filter out tasks that would violate constraints
  - Log when tasks are held back due to constraints

**VERIFY Phase 4:**
- [ ] 4.5 Test: Run orchestrator on plan with [SEQUENTIAL] tasks, verify only one from group is batched at a time
- [ ] 4.6 Verify: Prompt includes "Sequential Constraints" section when constraints exist
- [ ] 4.7 Verify: Log shows "Task 3.2 held back (sequential with 3.1)" when applicable

---

## Phase 5: Integration Testing

**Objective:** Verify the complete constraint pipeline works end-to-end.

**Tasks:**
- [ ] 5.1 Create test plan with [SEQUENTIAL] annotations: `docs/plans/test-sequential-constraints.md`:
  - Phase 1 with 3 parallel tasks (no conflicts)
  - Phase 2 with 4 sequential tasks (marked [SEQUENTIAL])
  - Phase 3 with mixed tasks
- [ ] 5.2 Run integration test:
  - Initialize plan: `node scripts/status-cli.js init`
  - Verify constraints in status.json
  - Get next tasks: `node scripts/status-cli.js next 5`
  - Verify only appropriate tasks returned
- [ ] 5.3 Test orchestrator dry-run:
  - Run: `python scripts/plan_orchestrator.py --dry-run`
  - Verify prompts show constraint awareness
  - Verify batching respects constraints
- [ ] 5.4 Clean up test plan after verification

**VERIFY Phase 5:**
- [ ] 5.5 Integration test passes: constraints flow from plan → status.json → next → orchestrator
- [ ] 5.6 No regressions: existing plans without [SEQUENTIAL] work correctly
- [ ] 5.7 Delete test plan: `rm docs/plans/test-sequential-constraints.md`

---

## Phase 6: Documentation and Cleanup

**Objective:** Update documentation and finalize the implementation.

**Tasks:**
- [ ] 6.1 Update `docs/architecture/orchestrator-system.md` to document constraint pipeline:
  - Add section on "Execution Constraint Handling"
  - Document the data flow: plan → parsing → status.json → orchestrator
- [ ] 6.2 Update this plan's deferred work section in `docs/plans/documentation-cleanup.md`:
  - Mark orchestration code changes as completed
  - Reference this plan
- [ ] 6.3 Add JSDoc comments to new functions in plan-status.js
- [ ] 6.4 Add docstrings to new methods in plan_orchestrator.py

**VERIFY Phase 6:**
- [ ] 6.5 Verify: `grep "Execution Constraint" docs/architecture/orchestrator-system.md` returns matches
- [ ] 6.6 Verify: All new functions have documentation comments

---

## Success Criteria

### Functional Requirements
- [ ] `status-cli.js next` returns `sequential` and `sequentialGroup` fields for constrained tasks
- [ ] `status.json` stores `executionConstraints` for tasks in sequential groups
- [ ] `plan_orchestrator.py` filters batches to respect sequential constraints
- [ ] Orchestrator prompt includes constraint information

### Quality Requirements
- [ ] Backward compatible: plans without [SEQUENTIAL] work unchanged
- [ ] No performance regression: constraint parsing adds <100ms to init
- [ ] All new code has test coverage
- [ ] Documentation updated for new features

### Metrics
- [ ] 6 gaps from orchestration-flow-analysis.md addressed (Gaps 1, 2, 6 + integration)
- [ ] 0 sequential constraint violations in orchestrator (when annotations present)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Plan parsing edge cases | Medium | Medium | Comprehensive test coverage for annotation formats |
| Performance impact on large plans | Low | Low | Parse once during init, cache in status.json |
| Backward compatibility breaks | High | Low | New fields are optional, existing behavior preserved |
| Constraint conflicts with phase ordering | Medium | Low | Document that phase ordering takes precedence |

---

## Notes

1. **Phase 0-1 are foundation** - schema and parsing must be solid before integration
2. **Phase 2-3 are [SEQUENTIAL]** - they modify the same core files (status-cli.js, plan-status.js)
3. **Phase 4 is independent** - Python changes don't conflict with JavaScript changes
4. **Phase 5 integration testing** is critical - the value is in end-to-end functionality
5. **Annotation format** is already defined in PLAN-STANDARDS.md - no format changes needed

---

## Orchestration Readiness Checklist

- [x] All tasks have explicit file paths (status-cli.js, plan-status.js, etc.)
- [x] Tasks in same phase checked for file conflicts (Phase 2 marked [SEQUENTIAL])
- [x] [SEQUENTIAL] annotations added where needed (Phase 2)
- [x] Each task is self-contained with complete context
- [x] VERIFY sections have measurable, automatable criteria
- [x] No tasks require interactive user input
- [x] Complex multi-file tasks broken into subtasks
- [x] Batch-appropriate phase grouping
