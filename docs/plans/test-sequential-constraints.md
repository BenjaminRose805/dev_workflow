# Test Plan: Sequential Constraints Integration Test

## Overview

- **Goal:** Verify that [SEQUENTIAL] constraint annotations flow correctly through the entire pipeline
- **Priority:** Test
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/test-sequential-constraints/`

> This is a test plan used to verify the constraint parsing implementation. It will be deleted after verification.

---

## Phase 1: Parallel Tasks (No Conflicts)

**Objective:** Verify that tasks without constraints can run in parallel.

**Tasks:**
- [ ] 1.1 Create test file A: `tests/fixtures/test-a.txt`
- [ ] 1.2 Create test file B: `tests/fixtures/test-b.txt`
- [ ] 1.3 Create test file C: `tests/fixtures/test-c.txt`

**VERIFY Phase 1:**
- [ ] 1.4 All three files exist

---

## Phase 2: Sequential Tasks

**Objective:** Verify that [SEQUENTIAL] annotated tasks are properly detected and filtered.

**Execution Note:** Tasks 2.1-2.4 are [SEQUENTIAL] - all modify same shared-state.txt file

**Tasks:**
- [ ] 2.1 Initialize shared state file: Create `tests/fixtures/shared-state.txt` with "state=init"
- [ ] 2.2 Update state to processing: Modify `tests/fixtures/shared-state.txt` to "state=processing"
- [ ] 2.3 Update state to complete: Modify `tests/fixtures/shared-state.txt` to "state=complete"
- [ ] 2.4 Validate final state: Read `tests/fixtures/shared-state.txt` and verify "state=complete"

**VERIFY Phase 2:**
- [ ] 2.5 Tasks were batched one at a time (verify from orchestrator logs)

---

## Phase 3: Mixed Tasks

**Objective:** Verify that a phase can have both parallel and sequential tasks.

**Execution Note:** Tasks 3.3-3.4 are [SEQUENTIAL] - both modify config file

**Tasks:**
- [ ] 3.1 Create independent file: `tests/fixtures/independent.txt`
- [ ] 3.2 Create another independent file: `tests/fixtures/another-independent.txt`
- [ ] 3.3 Create config file: `tests/fixtures/config.json` with initial settings
- [ ] 3.4 Update config file: Modify `tests/fixtures/config.json` to add new settings

**VERIFY Phase 3:**
- [ ] 3.5 Independent tasks ran in parallel
- [ ] 3.6 Config tasks ran sequentially

---

## Success Criteria

- [ ] Phase 1 tasks show `sequential: false` in next command output
- [ ] Phase 2 tasks show `sequential: true` and `sequentialGroup: "2.1-2.4"` in next command output
- [ ] Phase 3 mixed tasks correctly show their respective constraint status
- [ ] Orchestrator correctly filters out sequential tasks when batching
