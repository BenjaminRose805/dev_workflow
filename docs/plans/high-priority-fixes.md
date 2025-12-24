# Implementation Plan: High Priority Fixes

## Overview

- **Goal:** Fix all high-severity bugs, complete DRY extractions, and resolve major inconsistencies
- **Priority:** P1 (important)
- **Created:** 2025-12-24
- **Output:** `docs/plan-outputs/high-priority-fixes/`
- **Source:** Codebase Quality Analysis findings

## Description

This plan addresses **57 high-severity items** identified in the codebase quality analysis. These issues significantly impact functionality, developer experience, or code maintainability but do not cause immediate system failures.

**High-Severity Items Summary:**
- 10 High Bugs (memory leaks, race conditions, resource management)
- 15 High DRY Violations (350+ LOC duplicated)
- 28 High Inconsistencies (naming, API patterns, schemas)
- 4 High Unused Code items

---

## Dependencies

### Upstream
- **critical-fixes.md** (MUST complete first)
- `scripts/lib/plan-pointer.js` (from critical-fixes)
- `scripts/lib/arg-parser.js` (from critical-fixes)

### Downstream
- medium-priority-fixes.md

### External Tools
- None

---

## Phase 1: Resource Management Fixes

**Objective:** Fix memory leaks, race conditions, and resource cleanup issues.

**Tasks:**
- [ ] 1.1 Fix memory leak in `scripts/parallel-research-pipeline.js:278-366` - add try-finally for AgentPool cleanup
- [ ] 1.2 Fix race condition in `scripts/lib/agent-pool.js:385-398` - add mutex for retry operations
- [ ] 1.3 Add lock release guards to all async lock operations - pattern: try-finally with releaseLock()
- [ ] 1.4 Fix unchecked lock release in `scripts/lib/plan-output-utils.js` - additional instances
- [ ] 1.5 Add lock timeout detection improvements

**VERIFY Phase 1:**
- [ ] 1.6 Run parallel-research-pipeline with monitoring - no memory growth
- [ ] 1.7 Test concurrent agent pool operations - no race conditions
- [ ] 1.8 Verify all lock operations have finally blocks

---

## Phase 2: High-Priority Documentation

**Objective:** Create missing standard documents and fix documentation gaps.

**Tasks:**
- [ ] 2.1 Create `docs/standards/plan-format-specification.md`
- [ ] 2.2 Create `docs/standards/agent-communication-protocol.md`
- [ ] 2.3 Create `docs/standards/error-handling-standards.md`
- [ ] 2.4 Add Dependencies section to `docs/plans/architecture-review.md`
- [ ] 2.5 Add Dependencies section to `docs/plans/create-implementation-templates.md`
- [ ] 2.6 Add Dependencies section to `docs/plans/output-separation-implementation.md`
- [ ] 2.7 Add Dependencies section to `docs/plans/plan-system-analysis.md`

**VERIFY Phase 2:**
- [ ] 2.8 All 3 standards documents exist and are complete
- [ ] 2.9 All 4 plans have Dependencies sections

---

## Phase 3: Template Variable Fixes

**Objective:** Fix template substitution issues and undefined function references.

**Tasks:**
- [ ] 3.1 Fix undefined function references - commands calling wrong function names
- [ ] 3.2 Add template variable validation in `.claude/commands/plan/implement.md:114-165`
- [ ] 3.3 Create validateTemplateSubstitution() utility function
- [ ] 3.4 Add unreplaced variable detection before plan execution
- [ ] 3.5 Fix template variable naming inconsistencies (camelCase vs snake_case)

**VERIFY Phase 3:**
- [ ] 3.6 All command files reference correct function names
- [ ] 3.7 Template substitution validates all variables replaced
- [ ] 3.8 Variable naming follows consistent convention

---

## Phase 4: Additional DRY Extractions

**Objective:** Extract remaining high-priority shared utilities.

### 4.1 Progress Formatting Module

**LOC Saved:** 150 lines across 6 files

**Tasks:**
- [ ] 4.1.1 Create `scripts/lib/progress-formatter.js` with progress bar rendering
- [ ] 4.1.2 Extract progress bar characters (█, ░) to shared constants
- [ ] 4.1.3 Migrate status-cli.js progress display
- [ ] 4.1.4 Migrate plan-orchestrator.js progress display
- [ ] 4.1.5 Update .claude command templates to use shared progress format

**VERIFY 4.1:**
- [ ] 4.1.6 Progress displays consistently across all tools

### 4.2 Phase/Task Parser Module

**LOC Saved:** 120 lines across 3 files

**Tasks:**
- [ ] 4.2.1 Create `scripts/lib/phase-task-parser.js`
- [ ] 4.2.2 Consolidate phase regex patterns to shared constants
- [ ] 4.2.3 Migrate markdown-parser.js to use shared parser
- [ ] 4.2.4 Migrate plan-output-utils.js to use shared parser

**VERIFY 4.2:**
- [ ] 4.2.5 Phase/task parsing produces identical results

### 4.3 Task Result Transformer

**LOC Saved:** 80 lines across 3 files

**Tasks:**
- [ ] 4.3.1 Create `scripts/lib/task-transformer.js`
- [ ] 4.3.2 Consolidate research output transformation logic
- [ ] 4.3.3 Migrate research-for-implement.js transformers
- [ ] 4.3.4 Migrate verify-with-agent.js transformers

**VERIFY 4.3:**
- [ ] 4.3.5 All transformed outputs match expected schema

---

## Phase 5: High-Priority Inconsistency Resolution

**Objective:** Standardize naming conventions, API patterns, and error handling.

**Tasks:**
- [ ] 5.1 Standardize exit codes - create `scripts/lib/exit-codes.js`
- [ ] 5.2 Standardize error message format across all scripts
- [ ] 5.3 Fix status.json field naming (camelCase convention)
- [ ] 5.4 Standardize API response format: `{ success, data, meta, error? }`
- [ ] 5.5 Fix research output format inconsistencies
- [ ] 5.6 Standardize artifact metadata schema
- [ ] 5.7 Fix broken references in ORCHESTRATOR.md

**VERIFY Phase 5:**
- [ ] 5.8 All scripts use standard exit codes
- [ ] 5.9 Error messages follow consistent format
- [ ] 5.10 All status.json files use camelCase

---

## Phase 6: High-Priority Cleanup

**Objective:** Remove confirmed dead code and broken references.

**Tasks:**
- [ ] 6.1 Remove undocumented status CLI commands or add documentation:
  - `cmdRetryable()` (lines 566-587)
  - `cmdExhausted()` (lines 591-602)
  - `cmdIncrementRetry()` (lines 607-616)
  - `cmdDetectStuck()` (lines 618-629)
- [ ] 6.2 Remove unused lock utility functions if confirmed unused:
  - `isLockStale()` (~15 lines)
  - `cleanStaleLock()` (~25 lines)
  - `isLocked()` (~10 lines)
- [ ] 6.3 Remove or document agent pool pause/resume:
  - `pause()` (lines 494-510)
  - `resume()` (lines 511-531)
- [ ] 6.4 Remove confirmed unused exports:
  - `mergePlanWithStatus()` in plan-orchestrator.js
  - `getOutputDir()` in plan-orchestrator.js (inline if needed)

**VERIFY Phase 6:**
- [ ] 6.5 No broken imports after removal
- [ ] 6.6 All remaining exports are documented or used

---

## Phase 7: Validation & Integration Testing

**Objective:** Ensure all high-priority fixes integrate correctly.

**Tasks:**
- [ ] 7.1 Run comprehensive script syntax check
- [ ] 7.2 Test all plan commands end-to-end
- [ ] 7.3 Test agent pool operations under load
- [ ] 7.4 Verify documentation accuracy
- [ ] 7.5 Run any existing tests

**VERIFY Phase 7:**
- [ ] 7.6 All scripts pass syntax check
- [ ] 7.7 Plan workflow executes correctly
- [ ] 7.8 No regressions from changes

---

## Success Criteria

### Functional Requirements
- [ ] Zero high-severity bugs remaining
- [ ] All high-priority extractions complete
- [ ] All missing documentation created
- [ ] All high inconsistencies resolved

### Quality Requirements
- [ ] No memory leaks in long-running operations
- [ ] No race conditions in concurrent operations
- [ ] Consistent naming and formatting throughout

### Metrics
- [ ] 350+ lines of duplicate code eliminated
- [ ] 82+ lines of dead code removed
- [ ] 10 high bugs fixed
- [ ] 28 high inconsistencies resolved

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking agent pool during refactoring | High | Medium | Extensive testing, feature flag if needed |
| Removing code that's actually used | Medium | Low | grep for usages, keep backup branch |
| Documentation becoming stale | Low | Medium | Link docs to implementation |

---

## Notes

- Depends on critical-fixes.md completion
- Can parallelize Phase 2 (docs) with Phase 1 (code fixes)
- Phase 4 extractions build on critical-fixes utilities
- Run validation between phases
