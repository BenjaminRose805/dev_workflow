# Implementation Plan: Medium Priority Fixes

## Overview

- **Goal:** Fix remaining medium/low severity issues, complete code cleanup, and standardize conventions
- **Priority:** P2 (enhancement)
- **Created:** 2025-12-24
- **Output:** `docs/plan-outputs/medium-priority-fixes/`
- **Source:** Codebase Quality Analysis findings

## Description

This plan addresses **91 medium and low severity items** identified in the codebase quality analysis. These are quality improvements that enhance maintainability, consistency, and developer experience but are not blocking issues.

**Items Summary:**
- 18 Medium Bugs + 16 Low Bugs (34 total)
- Remaining DRY Violations (~465 LOC)
- Medium/Low Inconsistencies
- 13 Medium/Low Unused Code items (~384 LOC)

---

## Dependencies

### Upstream
- **critical-fixes.md** (MUST complete first)
- **high-priority-fixes.md** (MUST complete first)
- All shared utilities from previous plans

### Downstream
- None (final cleanup plan)

### External Tools
- None

---

## Phase 1: Remaining DRY Extractions

**Objective:** Complete all remaining shared utility extractions.

### 1.1 Documentation Templates

**LOC Saved:** 150 lines across 42+ files

**Tasks:**
- [ ] 1.1.1 Create `.claude/commands/plan/_common/load-plan.md` template
- [ ] 1.1.2 Create `.claude/commands/plan/_common/argument-parsing.md` template
- [ ] 1.1.3 Create `.claude/commands/plan/_common/important-notes.md` template
- [ ] 1.1.4 Update all 12 plan command files to use shared templates
- [ ] 1.1.5 Remove duplicated sections from individual commands

**VERIFY 1.1:**
- [ ] 1.1.6 All plan commands use shared templates
- [ ] 1.1.7 No duplicated "Load Active Plan" sections remain

### 1.2 Verbose Logger Factory

**LOC Saved:** 25 lines across 5 files

**Tasks:**
- [ ] 1.2.1 Create `scripts/lib/verbose-logger.js`
- [ ] 1.2.2 Migrate verbose logging from cache-clear.js
- [ ] 1.2.3 Migrate verbose logging from cache-stats.js
- [ ] 1.2.4 Migrate verbose logging from other scripts

**VERIFY 1.2:**
- [ ] 1.2.5 All scripts use consistent verbose logging

### 1.3 Input Validator Module

**LOC Saved:** 70 lines across 5 files

**Tasks:**
- [ ] 1.3.1 Create `scripts/lib/input-validator.js`
- [ ] 1.3.2 Consolidate path validation logic
- [ ] 1.3.3 Consolidate file existence checks
- [ ] 1.3.4 Migrate validators from existing scripts

**VERIFY 1.3:**
- [ ] 1.3.5 Input validation is consistent across scripts

### 1.4 Format Utilities Module

**LOC Saved:** 60 lines across 8 files

**Tasks:**
- [ ] 1.4.1 Create `scripts/lib/format-utils.js`
- [ ] 1.4.2 Extract date/time formatting
- [ ] 1.4.3 Extract duration formatting
- [ ] 1.4.4 Extract file size formatting

**VERIFY 1.4:**
- [ ] 1.4.5 All formatting uses shared utilities

### 1.5 I/O Utilities Module

**LOC Saved:** 60 lines across files

**Tasks:**
- [ ] 1.5.1 Create `scripts/lib/io-utils.js`
- [ ] 1.5.2 Consolidate JSON read/write with error handling
- [ ] 1.5.3 Consolidate file existence checks
- [ ] 1.5.4 Add atomic write support

**VERIFY 1.5:**
- [ ] 1.5.5 All file I/O uses shared utilities

---

## Phase 2: Medium Bug Fixes

**Objective:** Fix all medium-severity bugs.

### 2.1 Lock Management Issues

**Tasks:**
- [ ] 2.1.1 Fix additional unchecked lock release instances
- [ ] 2.1.2 Improve lock timeout detection
- [ ] 2.1.3 Add lock status logging for debugging

**VERIFY 2.1:**
- [ ] 2.1.4 All lock operations are properly guarded

### 2.2 Plan Management Issues

**Tasks:**
- [ ] 2.2.1 Fix summary drift auto-fix - add transactional guarantee
- [ ] 2.2.2 Fix task timeout detection
- [ ] 2.2.3 Add missing Risks sections to plans without them

**VERIFY 2.2:**
- [ ] 2.2.4 Summary updates are atomic
- [ ] 2.2.5 Task timeouts are detected correctly

### 2.3 Parsing & Validation Issues

**Tasks:**
- [ ] 2.3.1 Fix edge cases in regex patterns
- [ ] 2.3.2 Add missing path validation
- [ ] 2.3.3 Fix ADR references to non-existent directory
- [ ] 2.3.4 Handle malformed markdown gracefully

**VERIFY 2.3:**
- [ ] 2.3.5 Parsing handles edge cases without crashing

### 2.4 Error Handling Improvements

**Tasks:**
- [ ] 2.4.1 Fix silent error suppression in catch blocks
- [ ] 2.4.2 Standardize error message format
- [ ] 2.4.3 Add missing null checks
- [ ] 2.4.4 Improve error context in messages

**VERIFY 2.4:**
- [ ] 2.4.5 No silent error suppression remains
- [ ] 2.4.6 Error messages are actionable

---

## Phase 3: Low Bug Fixes

**Objective:** Fix all low-severity bugs and code quality issues.

**Tasks:**
- [ ] 3.1 Fix template variable naming inconsistency
- [ ] 3.2 Fix status symbol terminology inconsistency
- [ ] 3.3 Remove remaining duplicate code patterns
- [ ] 3.4 Fix minor regex inefficiencies
- [ ] 3.5 Add missing JSDoc comments to public functions
- [ ] 3.6 Fix inconsistent indentation/formatting

**VERIFY Phase 3:**
- [ ] 3.7 Code follows consistent style
- [ ] 3.8 All public functions have documentation

---

## Phase 4: Medium/Low Inconsistency Resolution

**Objective:** Standardize remaining conventions and patterns.

**Tasks:**
- [ ] 4.1 Complete naming convention standardization (26 remaining instances)
- [ ] 4.2 Standardize remaining API patterns (14 instances)
- [ ] 4.3 Complete schema standardization (11 instances)
- [ ] 4.4 Fix remaining documentation inconsistencies (8 instances)
- [ ] 4.5 Create terminology glossary for project
- [ ] 4.6 Update CLAUDE-CODE.md with current conventions

**VERIFY Phase 4:**
- [ ] 4.7 Naming follows documented conventions
- [ ] 4.8 All schemas validate against definitions

---

## Phase 5: Code Cleanup

**Objective:** Remove all confirmed unused code.

### 5.1 Safe Immediate Removals

**Tasks:**
- [ ] 5.1.1 Remove unused regex variables in `plan-output-utils.js:435-436`
- [ ] 5.1.2 Remove unused fs import in `benchmark.js:46`
- [ ] 5.1.3 Remove duplicate summary check in `plan-output-utils.js:395-401`
- [ ] 5.1.4 Fix broken documentation references in `artifact-type-registry.md`

**VERIFY 5.1:**
- [ ] 5.1.5 Scripts still execute correctly

### 5.2 Deprecation Candidates

**Tasks:**
- [ ] 5.2.1 Remove unused configuration options in agent-pool.js:
  - `minConcurrent`
  - `healthCheckInterval`
  - `errorRateThreshold`
- [ ] 5.2.2 Create output directories for orphaned plans or archive them:
  - `create-implementation-templates.md`
  - `output-separation-implementation.md`
  - `plan-system-analysis.md`

**VERIFY 5.2:**
- [ ] 5.2.3 No broken references after removal

### 5.3 Documentation Cleanup

**Tasks:**
- [ ] 5.3.1 Add missing plan metadata (status, dates, owner)
- [ ] 5.3.2 Generate template inventory
- [ ] 5.3.3 Mark deprecated templates
- [ ] 5.3.4 Remove orphaned documentation files

**VERIFY 5.3:**
- [ ] 5.3.5 All plans have required metadata
- [ ] 5.3.6 No orphaned docs remain

---

## Phase 6: Cross-Cutting Pattern Standardization

**Objective:** Establish and enforce consistent patterns across codebase.

**Tasks:**
- [ ] 6.1 Standardize file existence checking pattern
- [ ] 6.2 Establish async error handling pattern
- [ ] 6.3 Extract regex patterns to shared constants file
- [ ] 6.4 Create style guide document
- [ ] 6.5 Add ESLint rules for enforced patterns

**VERIFY Phase 6:**
- [ ] 6.6 All code follows documented patterns
- [ ] 6.7 ESLint passes without warnings

---

## Phase 7: Final Validation

**Objective:** Comprehensive validation of all changes.

**Tasks:**
- [ ] 7.1 Run full syntax check on all scripts
- [ ] 7.2 Run all existing tests
- [ ] 7.3 Manual testing of complete plan workflow
- [ ] 7.4 Review documentation for accuracy
- [ ] 7.5 Verify no regressions from any phase
- [ ] 7.6 Update CHANGELOG with all changes

**VERIFY Phase 7:**
- [ ] 7.7 All tests pass
- [ ] 7.8 No console errors during normal operation
- [ ] 7.9 Documentation matches implementation

---

## Success Criteria

### Functional Requirements
- [ ] Zero medium/low bugs remaining
- [ ] All DRY extractions complete (target: 1,540 LOC saved)
- [ ] All inconsistencies resolved
- [ ] All unused code removed (target: 1,364 LOC removed)

### Quality Requirements
- [ ] Code follows consistent style throughout
- [ ] All public APIs documented
- [ ] No silent error suppression
- [ ] All patterns follow documented standards

### Metrics
- [ ] 465+ additional lines of duplicate code eliminated
- [ ] 384+ lines of unused code removed
- [ ] 34 medium/low bugs fixed
- [ ] System Health Score: 62 → ≥85

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep during cleanup | Low | Medium | Strict adherence to documented items |
| Over-optimization | Low | Low | Focus on documented issues only |
| Missing undocumented usages | Medium | Low | grep verification before removal |

---

## Notes

- This is the final cleanup plan in the series
- Can be done incrementally over time
- Lower priority items can be deferred if needed
- Focus on completing phases 1-2 before moving to polish phases
- Consider adding automated checks to prevent regression
