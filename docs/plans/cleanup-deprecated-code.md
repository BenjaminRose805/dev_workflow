# Implementation Plan: Cleanup Deprecated Code

## Overview

- **Goal:** Remove deprecated scripts, unused library modules, and stale references to improve codebase maintainability
- **Priority:** P2 (enhancement)
- **Created:** 2025-12-23
- **Output:** `docs/plan-outputs/cleanup-deprecated-code/`

## Description

The codebase contains ~1,900 lines of dead code across deprecated scripts, unused library modules, and legacy Python wrappers. This plan systematically removes deprecated code in priority order, starting with zero-dependency items and progressing to items requiring verification. Each removal includes updating all references and documentation.

---

## Dependencies

### Upstream
- Analysis report: Deprecated Code Analysis (completed 2025-12-23)
- `scripts/status-cli.js` - Replacement for deprecated `scan-results.js`
- `scripts/parallel-research-pipeline.js` - Replacement for speculative-research.js

### Downstream
- `scripts/index.js` - Script registry (requires updates)
- `scripts/benchmark.js` - Performance benchmarks (requires updates)
- `scripts/cache-clear.js` - Cache management (requires updates)
- `scripts/cache-stats.js` - Cache statistics (requires updates)

### External Tools
- None required

---

## Phase 0: Pre-Cleanup Verification

**Objective:** Verify current state and create backups before any removals.

**Tasks:**
- [ ] 0.1 Run all existing tests to establish baseline
  - Execute any test suites in `scripts/tests/`
  - Document current pass/fail state
- [ ] 0.2 Verify zero imports for target files
  - Grep for imports of each file to be removed
  - Document any unexpected dependencies found
- [ ] 0.3 Create git commit with current state
  - Commit any uncommitted changes
  - Tag as `pre-deprecated-cleanup` for easy rollback

**VERIFY Phase 0:**
- [ ] Baseline test results documented
- [ ] Import analysis confirms zero dependencies for Phase 1 targets
- [ ] Git state is clean with recovery tag

---

## Phase 1: Remove Unused Library Modules

**Objective:** Remove library modules that are never imported anywhere in the codebase.

**Tasks:**
- [ ] 1.1 Remove `scripts/lib/result-aggregator.js`
  - Delete file (~400 lines)
  - Verify no build errors
- [ ] 1.2 Remove `scripts/lib/performance-tracker.js`
  - Delete file (~500 lines)
  - Verify no build errors
- [ ] 1.3 Remove `scripts/lib/speculative-research.js`
  - Delete file (~700 lines)
  - Verify no build errors
- [ ] 1.4 Update cache management for removed speculative module
  - Edit `scripts/cache-clear.js`: Remove 'speculative' from CACHE_DIRS
  - Edit `scripts/cache-stats.js`: Remove 'speculative' cache handling
  - Test cache commands still work

**VERIFY Phase 1:**
- [ ] All three library files deleted
- [ ] `node scripts/cache-clear.js --help` works
- [ ] `node scripts/cache-stats.js` works
- [ ] No JavaScript errors when running remaining scripts

---

## Phase 2: Remove Deprecated scan-results.js

**Objective:** Remove the explicitly deprecated scan-results.js script and all references.

**Tasks:**
- [ ] 2.1 Remove script file
  - Delete `scripts/scan-results.js` (~300 lines)
- [ ] 2.2 Update `scripts/index.js`
  - Remove 'scan-results' from COMMANDS object (line ~40)
  - Remove 'scan-results' from DESCRIPTIONS object (line ~54)
  - Update help text if it references scan-results
- [ ] 2.3 Update `scripts/benchmark.js`
  - Remove 'scan-results' from benchmark list (line ~52)
  - Verify benchmark script still runs
- [ ] 2.4 Update documentation
  - Edit `docs/claude-commands/SCRIPTS.md`: Remove scan-results section
  - Edit any other docs referencing scan-results

**VERIFY Phase 2:**
- [ ] `scripts/scan-results.js` deleted
- [ ] `node scripts/index.js --help` works and doesn't list scan-results
- [ ] `node scripts/benchmark.js --help` works
- [ ] No documentation references to scan-results remain

---

## Phase 3: Audit Python Wrapper System

**Objective:** Determine if Python wrapper scripts are actively used before removal.

**Tasks:**
- [ ] 3.1 Analyze `scripts/create-plans.py` usage
  - Check git log for recent usage: `git log --oneline -20 -- scripts/create-plans.py`
  - Search for references in .claude/ commands
  - Document if actively used or can be removed
- [ ] 3.2 Analyze `scripts/test_wrapper.py` usage
  - Check if referenced in any test configuration
  - Check if called by any scripts or commands
  - Document if actively used or can be removed
- [ ] 3.3 Analyze `scripts/claude_wrapper.py` dependencies
  - List all files that import it
  - Determine if importers are themselves deprecated
  - Create dependency graph
- [ ] 3.4 Document findings for Python system
  - Write findings to `docs/plan-outputs/cleanup-deprecated-code/findings/3-python-audit.md`
  - Recommend: Remove, Keep, or Migrate

**VERIFY Phase 3:**
- [ ] Usage analysis complete for all three Python files
- [ ] Clear recommendation documented for each file
- [ ] No ambiguity about Python system status

---

## Phase 4: Remove Python Wrapper System (Conditional)

**Objective:** Remove Python wrapper system if Phase 3 confirms it's unused.

**Precondition:** Phase 3 findings recommend removal.

**Tasks:**
- [ ] 4.1 Remove `scripts/test_wrapper.py` (if unused)
  - Delete file
  - Verify no test failures
- [ ] 4.2 Remove `scripts/create-plans.py` (if unused)
  - Delete file
  - Verify no command failures
- [ ] 4.3 Remove `scripts/claude_wrapper.py` (if no remaining importers)
  - Delete file
  - Verify plan_orchestrator.py still works independently
- [ ] 4.4 Clean up `scripts/__pycache__/` directory
  - Remove Python cache files for deleted modules

**VERIFY Phase 4:**
- [ ] Python files removed per Phase 3 recommendations
- [ ] `python scripts/plan_orchestrator.py --help` still works
- [ ] No import errors in remaining Python code

---

## Phase 5: Clean Up Stale References

**Objective:** Remove references to non-existent `.claude/prompt-results/` system.

**Tasks:**
- [ ] 5.1 Search for all prompt-results references
  - `grep -r "prompt-results" .claude/ docs/ scripts/`
  - Document all locations
- [ ] 5.2 Update documentation files
  - Edit files with stale references
  - Replace with references to new `docs/plan-outputs/` system
  - Or remove references if no longer relevant
- [ ] 5.3 Update any remaining architecture docs
  - `docs/claude-commands/ARCHITECTURE.md`
  - Any other architectural documentation
- [ ] 5.4 Verify no code references remain
  - After file removals, grep should return no results
  - Only historical/analysis documents may reference it

**VERIFY Phase 5:**
- [ ] No active code references `.claude/prompt-results/`
- [ ] Documentation updated to reference current system
- [ ] Architecture docs are accurate

---

## Phase 6: Final Verification & Documentation

**Objective:** Verify all removals are complete and document changes.

**Tasks:**
- [ ] 6.1 Run full test suite
  - Execute all tests in `scripts/tests/`
  - Compare results to Phase 0 baseline
  - All tests should still pass
- [ ] 6.2 Verify all scripts still work
  - `node scripts/index.js --help`
  - `node scripts/status-cli.js status`
  - `node scripts/scan-plans.js`
  - `python scripts/plan_orchestrator.py --help`
- [ ] 6.3 Update CHANGELOG or release notes
  - Document removed files
  - Note migration paths for any removed functionality
- [ ] 6.4 Create final commit
  - Commit all changes with descriptive message
  - Reference this plan in commit message

**VERIFY Phase 6:**
- [ ] All tests pass
- [ ] All remaining scripts functional
- [ ] Changes documented
- [ ] Clean git commit created

---

## Success Criteria

### Functional Requirements
- [ ] All deprecated files removed per plan
- [ ] No broken imports or require statements
- [ ] All remaining scripts execute without errors
- [ ] Test suite passes (same or better than baseline)

### Quality Requirements
- [ ] ~1,900 lines of dead code removed
- [ ] No new functionality broken
- [ ] Documentation updated to reflect changes
- [ ] Git history preserves removed code for recovery if needed

### Documentation Requirements
- [ ] Removed files documented in commit message
- [ ] Migration guidance provided if applicable
- [ ] Architecture docs updated

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Removing file that has hidden dependency | Medium | Low | Phase 0 import verification; git recovery |
| Python wrapper needed by undiscovered script | Medium | Low | Phase 3 thorough audit before removal |
| Breaking change for external users | Low | Very Low | This is internal tooling; no external API |
| Test coverage gaps hide breakage | Medium | Low | Manual verification of key scripts |

---

## Notes

- All removed code remains recoverable via git history
- The `pre-deprecated-cleanup` tag enables easy rollback
- Phase 4 is conditional on Phase 3 findings - may be skipped if Python system is actively used
- This cleanup aligns with the completed "Fix Orchestrator Bugs" plan which modernized status management

---

## Files to Remove (Summary)

| File | Phase | Lines | Status |
|------|-------|-------|--------|
| `scripts/lib/result-aggregator.js` | 1 | ~400 | Zero imports |
| `scripts/lib/performance-tracker.js` | 1 | ~500 | Zero imports |
| `scripts/lib/speculative-research.js` | 1 | ~700 | Zero imports |
| `scripts/scan-results.js` | 2 | ~300 | Explicitly deprecated |
| `scripts/test_wrapper.py` | 4 | ~100 | Pending audit |
| `scripts/create-plans.py` | 4 | ~150 | Pending audit |
| `scripts/claude_wrapper.py` | 4 | ~200 | Pending audit |

**Total potential removal: ~2,350 lines**
