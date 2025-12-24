# Implementation Plan: Critical Fixes

## Overview

- **Goal:** Fix all critical-severity bugs, DRY violations, and inconsistencies
- **Priority:** P0 (critical path)
- **Created:** 2025-12-24
- **Output:** `docs/plan-outputs/critical-fixes/`
- **Source:** Codebase Quality Analysis findings

## Description

This plan addresses **19 critical items** identified in the codebase quality analysis that pose immediate risk to system stability, data integrity, or developer productivity. All items must be fixed before any other work proceeds.

**Critical Items Summary:**
- 3 Critical Bugs (runtime crashes, data corruption risk)
- 3 Critical DRY Extractions (750+ LOC duplicated across 31 files)
- 1 Critical Cleanup (wrong project documentation)
- 8 Critical Inconsistencies (function signature mismatches, schema conflicts)

---

## Dependencies

### Upstream
- Codebase Quality Analysis (completed)
- `docs/plan-outputs/codebase-quality-analysis/findings/`

### Downstream
- high-priority-fixes.md (blocked until critical fixes complete)
- medium-priority-fixes.md (blocked until critical fixes complete)

### External Tools
- None

---

## Phase 1: Runtime Stability Fixes

**Objective:** Eliminate all runtime crash risks and unhandled exceptions.

**Tasks:**
- [ ] 1.1 Fix unsafe regex match access in `scripts/lib/markdown-parser.js:76` - add null-safety with optional chaining
- [ ] 1.2 Fix missing promise error handling in `scripts/verify-with-agent.js:147-165` - add error listener before success paths
- [ ] 1.3 Fix race condition in lock cleanup `scripts/lib/plan-output-utils.js:282-316` - remove manual cleanup, trust proper-lockfile

**VERIFY Phase 1:**
- [ ] 1.4 Run `node -c scripts/lib/markdown-parser.js` - no syntax errors
- [ ] 1.5 Run `node -c scripts/verify-with-agent.js` - no syntax errors
- [ ] 1.6 Run `node -c scripts/lib/plan-output-utils.js` - no syntax errors

---

## Phase 2: Critical Documentation Fix

**Objective:** Remove incorrect project documentation that causes developer confusion.

**Tasks:**
- [ ] 2.1 Archive wrong ARCHITECTURE.md to `docs/archive/ARCHITECTURE-idea-to-code.md`
- [ ] 2.2 Create placeholder ARCHITECTURE.md with correct dev_workflow overview
- [ ] 2.3 Update any references to ARCHITECTURE.md in other docs

**VERIFY Phase 2:**
- [ ] 2.4 Verify `docs/ARCHITECTURE.md` describes dev_workflow system
- [ ] 2.5 Verify no broken links to old architecture content

---

## Phase 3: Foundation Utility Extraction

**Objective:** Extract critical shared utilities to eliminate highest-impact duplication.

### 3.1 Plan Pointer Reader Module

**LOC Saved:** 150 lines across 10 files

**Tasks:**
- [ ] 3.1.1 Create `scripts/lib/plan-pointer.js` with getActivePlanPath(), getActivePlanOutputPath()
- [ ] 3.1.2 Migrate `scripts/status-cli.js` to use plan-pointer
- [ ] 3.1.3 Migrate `scripts/plan-orchestrator.js` to use plan-pointer
- [ ] 3.1.4 Migrate `scripts/scan-plans.js` to use plan-pointer
- [ ] 3.1.5 Migrate `scripts/parse-plan-structure.js` to use plan-pointer
- [ ] 3.1.6 Update `scripts/lib/plan-output-utils.js` imports

**VERIFY 3.1:**
- [ ] 3.1.7 All migrated scripts execute without errors
- [ ] 3.1.8 `node scripts/status-cli.js status` works correctly

### 3.2 Argument Parser Factory

**LOC Saved:** 400 lines across 10 files

**Tasks:**
- [ ] 3.2.1 Create `scripts/lib/arg-parser.js` with createArgParser() and COMMON_FLAGS
- [ ] 3.2.2 Migrate `scripts/cache-clear.js` to use arg-parser
- [ ] 3.2.3 Migrate `scripts/cache-stats.js` to use arg-parser
- [ ] 3.2.4 Migrate `scripts/check-file-status.js` to use arg-parser
- [ ] 3.2.5 Migrate `scripts/substitute-variables.js` to use arg-parser
- [ ] 3.2.6 Migrate `scripts/benchmark.js` to use arg-parser

**VERIFY 3.2:**
- [ ] 3.2.7 All migrated scripts show correct --help output
- [ ] 3.2.8 Flag parsing works correctly (test -v, --verbose, --dry-run)

### 3.3 Status.json Integration Template

**LOC Saved:** 200 lines across 11 files

**Tasks:**
- [ ] 3.3.1 Create `.claude/commands/plan/_common/status-tracking.md` shared template
- [ ] 3.3.2 Update `implement.md` to use shared template
- [ ] 3.3.3 Update `batch.md` to use shared template
- [ ] 3.3.4 Update `verify.md` to use shared template
- [ ] 3.3.5 Update remaining 8 command files to use shared template

**VERIFY 3.3:**
- [ ] 3.3.6 All plan commands reference shared status tracking
- [ ] 3.3.7 No duplicated status.json integration sections remain

---

## Phase 4: Critical Inconsistency Resolution

**Objective:** Fix function signature mismatches and schema conflicts that cause runtime failures.

**Tasks:**
- [ ] 4.1 Fix `initializePlanStatus()` vs `initializeStatus()` mismatch - update all callers to correct signature
- [ ] 4.2 Standardize status.json schema - define canonical schema in `scripts/lib/schemas/`
- [ ] 4.3 Fix VERIFY section format conflict - standardize on `**VERIFY Phase N:**` format
- [ ] 4.4 Update `scripts/lib/status-manager.js` exports to match documentation
- [ ] 4.5 Fix task ID format inconsistency - standardize on `N.N` format

**VERIFY Phase 4:**
- [ ] 4.6 All command files use correct function signatures
- [ ] 4.7 Existing status.json files validate against canonical schema
- [ ] 4.8 All plan files use consistent VERIFY format

---

## Phase 5: Validation & Testing

**Objective:** Verify all critical fixes work correctly together.

**Tasks:**
- [ ] 5.1 Run full script syntax check: `for f in scripts/*.js; do node -c "$f"; done`
- [ ] 5.2 Test plan workflow: `/plan:set`, `/plan:status`, `/plan:implement`
- [ ] 5.3 Verify no regressions in existing functionality
- [ ] 5.4 Update any failing tests

**VERIFY Phase 5:**
- [ ] 5.5 All scripts pass syntax check
- [ ] 5.6 Plan workflow executes end-to-end
- [ ] 5.7 No new errors in console output

---

## Success Criteria

### Functional Requirements
- [ ] Zero critical bugs remaining
- [ ] All shared utilities extracted and working
- [ ] All function signature mismatches resolved
- [ ] ARCHITECTURE.md documents correct project

### Quality Requirements
- [ ] No runtime crashes in normal operation
- [ ] All migrated files maintain existing behavior
- [ ] Code follows project conventions

### Metrics
- [ ] 750+ lines of duplicate code eliminated
- [ ] 898 lines of wrong documentation removed
- [ ] 8 critical inconsistencies resolved

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing scripts during migration | High | Medium | Test each migration individually, keep backup |
| Missing edge cases in shared utilities | Medium | Low | Port existing tests, add new edge case tests |
| Incomplete function signature updates | High | Low | grep for old signatures, update all callers |

---

## Notes

- This plan MUST complete before high-priority-fixes.md begins
- All changes should be committed atomically per phase
- Run validation after each phase before proceeding
