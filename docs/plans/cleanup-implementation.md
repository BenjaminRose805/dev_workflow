# Implementation Plan: Codebase Cleanup

## Overview

- **Objective:** Remove dead code, orphaned files, and unused dependencies identified in cleanup-analysis
- **Priority:** P2
- **Created:** 2025-12-27
- **Source:** Generated from `cleanup-analysis.md` findings
- **Output:** `docs/plan-outputs/cleanup-implementation/`

> **Risk Levels:**
> - **Safe:** Can be removed without testing - no references in codebase
> - **Review:** Should verify no dynamic/runtime usage before removal
> - **Risky:** May break functionality - requires testing after removal

---

## Phase 1: Safe Removals (No Risk)

**Objective:** Remove files with zero references that can be deleted immediately.

- [ ] 1.1 Remove orphaned backup files
  - Delete `docs/plan-outputs/parallel-execution-foundation/backups/plan-status.js.backup`
  - Delete `docs/plan-outputs/parallel-execution-foundation/backups/status-cli.js.backup`
  - Remove empty `backups/` directory
  - Source: finding 4-3

- [ ] 1.2 Remove orphaned test fixture
  - Delete `tests/fixtures/shared-state.txt`
  - Remove empty `tests/fixtures/` directory
  - Source: finding 4-3

- [ ] 1.3 Remove orphaned output directories
  - Delete `docs/plan-outputs/keyboard-integration-orchestrator/`
  - Delete `docs/plan-outputs/test-plan/`
  - Source: finding 2-3

- [ ] 1.4 Clean stale Python bytecode
  - Delete `scripts/lib/__pycache__/events.cpython-312.pyc`
  - Delete `scripts/lib/__pycache__/orchestration_engine.cpython-312.pyc`
  - Delete `scripts/lib/__pycache__/ui_adapter.cpython-312.pyc`
  - Source: finding 4-2

**VERIFY 1:** Run `git status` to confirm only expected files removed

---

## Phase 2: Dead JavaScript Code

**Objective:** Remove unused JavaScript files and modules.

- [ ] 2.1 Remove unused library modules
  - Delete `scripts/lib/frontmatter-parser.js` (uses uninstalled gray-matter)
  - Delete `scripts/lib/constraint-types.js` (never imported)
  - Source: finding 1-2

- [ ] 2.2 Remove unused utility scripts
  - Delete `scripts/scan-completed-plans.js` (not invoked, no tests)
  - Delete `scripts/benchmark.js` (documented but never used)
  - Source: finding 1-2

- [ ] 2.3 Remove unused function from file-utils.js
  - Remove `writeFileAtomicAsync` function (lines 91-116)
  - Remove export for `writeFileAtomicAsync` (line 252)
  - Source: finding 1-3

**VERIFY 2:** Run `node scripts/status-cli.js progress` to confirm status-cli still works

---

## Phase 3: Review-Required JavaScript Removals

**Objective:** Remove JavaScript files that may have been part of earlier development phases.

- [ ] 3.1 Evaluate research/verification scripts [REVIEW]
  - Review `scripts/research-for-implement.js` (listed in index.js but never called)
  - Review `scripts/verify-with-agent.js` (listed in index.js but never called)
  - Review `scripts/parallel-research-pipeline.js` (never integrated)
  - If not needed: remove all three files
  - If needed: add to documentation and fix missing dependencies
  - Source: finding 1-2

- [ ] 3.2 Evaluate agent support files [DEPENDS: 3.1]
  - If 3.1 removed scripts, review `scripts/lib/parallel-agents.js` (only used by removed scripts)
  - If 3.1 kept scripts, keep this file too
  - Source: finding 1-2

- [ ] 3.3 Review server-fetch utility [REVIEW]
  - Evaluate `scripts/lib/server-fetch.js` (designed for unbuilt NextJS frontend)
  - If dashboard plan is abandoned: delete file
  - If dashboard plan is active: keep and document
  - Source: finding 1-2

**VERIFY 3:** Run `npm test` or `node scripts/tests/run-all-tests.js` to confirm no breakage

---

## Phase 4: Configuration Cleanup

**Objective:** Remove orphaned configuration and clean up empty directories.

- [ ] 4.1 Remove orphaned config schema
  - Delete `.claude/config-schema.json` (references unimplemented features)
  - OR move to `docs/reference/future-config-schema.json` for roadmap reference
  - Source: finding 4-1

- [ ] 4.2 Remove stale lock file
  - Delete `.claude/orchestrator-registry.json.lock` if no orchestrator running
  - Command: `lsof .claude/orchestrator-registry.json.lock || rm .claude/orchestrator-registry.json.lock`
  - Source: finding 4-2

- [ ] 4.3 Clean empty cache directories [OPTIONAL]
  - If caching not planned: remove `.claude/cache/research/`, `.claude/cache/scripts/`, `.claude/cache/speculative/`
  - If caching planned: keep and document
  - Source: finding 4-2

- [ ] 4.4 Clean empty logs directory [OPTIONAL]
  - If logging not planned: remove `.claude/logs/`
  - If logging planned: keep and document
  - Source: finding 4-2

**VERIFY 4:** Confirm no config errors on next command run

---

## Phase 5: Documentation Fixes

**Objective:** Fix or remove outdated documentation.

- [ ] 5.1 Fix mock data README
  - Remove reference to non-existent `/api/conflicts` endpoint
  - OR add endpoint to `scripts/api-server.js`
  - File: `docs/plan-outputs/git-workflow-phase5-worktrees/mock-data/README.md`
  - Source: finding 2-1

- [ ] 5.2 Fix orchestrator API README
  - Remove React Query example OR add `@tanstack/react-query` to package.json
  - Remove Storybook example OR create `.storybook/` directory
  - File: `docs/plan-outputs/orchestrator-api-server/README.md`
  - Source: finding 2-1

- [ ] 5.3 Remove redundant inline comments
  - Consolidate "current-plan-output.txt no longer used" comments
  - Files: `test-orchestrator-e2e.py` (3x), `test-recovery.js` (2x), `test-status-cli.js` (3x)
  - Source: finding 2-2

- [ ] 5.4 Fix or remove incomplete TODO
  - Address `# TODO: Parse phases from plan file` in `scripts/orchestrator_server.py:357`
  - Either implement phase parsing or document why not needed
  - Source: finding 2-2

**VERIFY 5:** Documentation is accurate and no broken references remain

---

## Phase 6: Dependency Cleanup

**Objective:** Fix dependency declarations to match actual usage.

- [ ] 6.1 Add missing Node.js dependencies
  - Run `npm install fast-glob`
  - Run `npm install execa@5` (use v5 for CommonJS compatibility)
  - Source: finding 3-2

- [ ] 6.2 Create Python requirements.txt
  - Create `/requirements.txt` with: fastapi, pydantic, uvicorn, requests
  - Create `/requirements-dev.txt` for development tools
  - Source: finding 3-1

**VERIFY 6:** Run `npm test` and confirm all imports resolve

---

## Phase 7: Archive Completed Plans

**Objective:** Move completed plans to archive to reduce clutter.

- [ ] 7.1 Archive completed git-workflow plans
  - Archive `git-workflow-phase1-core-branching.md` (26/26 completed)
  - Archive `git-workflow-phase2-completion.md` (35/35 completed)
  - Archive `git-workflow-phase3-safety.md` (46/46 completed)
  - Archive `git-workflow-phase4-advanced.md` (63/63 completed)
  - Archive `git-workflow-phase5-worktrees.md` (84/84 completed)
  - Command: `/plan:archive <plan-name>`
  - Source: finding 2-3

- [ ] 7.2 Archive completed parallel-execution plans
  - Archive `parallel-execution-architecture.md` (29/29 completed)
  - Archive `parallel-execution-dependencies.md` (35/35 completed)
  - Archive `parallel-execution-foundation.md` (30/30 completed)
  - Source: finding 2-3

- [ ] 7.3 Archive completed TUI and orchestrator plans
  - Archive `tui-expansion-analysis.md` (57/57 completed)
  - Archive `tui-integration-implementation.md` (24/24 completed)
  - Archive `orchestrator-api-server.md` (12/12 completed)
  - Archive `orchestrator-dashboard-nextjs.md` (23/23 completed)
  - Source: finding 2-3

- [ ] 7.4 Archive completed documentation plans
  - Archive `documentation-cleanup.md` (47/47 completed)
  - Archive `documentation-standards-analysis.md` (12/12 completed)
  - Archive `fix-plan-compliance.md` (33/33 completed)
  - Source: finding 2-3

- [ ] 7.5 Archive miscellaneous completed plans
  - Archive `implement-orchestration-constraints.md` (42/42 completed)
  - Archive `test-dependency-patterns.md` (37/37 completed)
  - Source: finding 2-3

- [ ] 7.6 Review plans without status tracking
  - Evaluate `high-priority-fixes.md` - archive if superseded
  - Evaluate `medium-priority-fixes.md` - archive if superseded
  - Evaluate `plan-system-analysis.md` - archive (all inline checkboxes done)
  - Source: finding 2-3

**VERIFY 7:** Confirm archived plans moved to `docs/plans/archive/` with outputs

---

## Success Criteria

- [ ] All Phase 1 safe removals completed
- [ ] Dead JavaScript code removed (Phase 2)
- [ ] Review-required removals evaluated (Phase 3)
- [ ] Configuration cleaned up (Phase 4)
- [ ] Documentation fixed (Phase 5)
- [ ] Dependencies properly declared (Phase 6)
- [ ] Completed plans archived (Phase 7)
- [ ] No broken imports or missing files
- [ ] Tests still pass after cleanup

---

## Summary Statistics (From Analysis)

| Category | Items | Risk Level |
|----------|-------|------------|
| Orphaned files to remove | 7 | Safe |
| Stale bytecode to clean | 3 | Safe |
| Dead JS files to remove | 4-6 | Safe |
| JS files needing review | 4 | Review |
| Unused function to remove | 1 | Safe |
| Config files to review | 1 | Review |
| Empty directories | 6 | Safe |
| Documentation fixes | 4 | Safe |
| Missing dependencies to add | 2 Node + Python manifest | Safe |
| Plans to archive | 17 | Safe |

**Estimated Disk Space Saved:** ~200KB+ of dead code and files
