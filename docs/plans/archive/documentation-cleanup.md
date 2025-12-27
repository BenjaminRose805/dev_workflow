# Implementation Plan: Documentation Cleanup

## Overview

- **Goal:** Execute documentation cleanup actions identified in the standards analysis
- **Priority:** P1 (important)
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/documentation-cleanup/`
- **Source:** Documentation Standards Analysis Plan findings

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Description

This plan implements the cleanup actions identified in the documentation standards analysis. The analysis reviewed 100+ documentation files and identified:

- **49 backup files** to DELETE
- **1 empty directory** to DELETE
- **4 files** to ARCHIVE (theoretical command selection guides)
- **3 files** requiring content MERGE (orchestrator documentation)
- **3 files** requiring content UPDATE (outdated references - others already fixed)
- **1 new file** to CREATE (unified PLAN-STANDARDS.md)

**Estimated cleanup:** ~11,000 lines of duplicate/obsolete content removed

---

## Dependencies

### Upstream
- **documentation-standards-analysis.md** (COMPLETED - provides findings)

### Downstream
- None (cleanup plan)

### External Tools
- None

---

## Phase 0: Orchestration Prerequisites

**Objective:** Update orchestration components BEFORE cleanup tasks run, so `[SEQUENTIAL]` annotations are respected.

**CRITICAL:** This phase MUST complete before any other phases. It updates the `/plan:implement` command that executes subsequent tasks.

**Tasks:**
- [ ] 0.1 Update `.claude/commands/plan/implement.md` with [SEQUENTIAL] support:
  - Step 2 (Parse Plan File): Add instruction to look for `**Execution Note:**` blocks after phase headers, extract `[SEQUENTIAL]` annotations with task ranges
  - Step 4 (Execution Strategy): Add "CRITICAL: Check for Execution Constraints" section before grouping, add logic to detect `[SEQUENTIAL]` annotations and file conflicts, update grouping rules to respect constraints
  - Parallel Execution Rules: Add `[SEQUENTIAL]` as highest priority rule, add explicit check for file conflicts, add example showing sequential execution
- [ ] 0.2 Update `scripts/plan_orchestrator.py` `_build_prompt()`:
  - Add rules about checking `[SEQUENTIAL]` annotations
  - Add rules about detecting file conflicts

**VERIFY Phase 0:**
- [ ] 0.3 `/plan:implement` documentation includes constraint parsing instructions
- [ ] 0.4 Orchestrator prompt includes constraint rules

---

## Phase 1: Quick Wins - File Cleanup

**Objective:** Delete backup files, empty directories, and archive theoretical documentation.

**Execution Note:** Tasks 1.3-1.7 are [SEQUENTIAL] - 1.3 creates directory that 1.4-1.7 require

**Tasks:**
- [ ] 1.1 Delete 49 backup files: `find docs/plan-outputs/archive -name "status.json.bak" -delete`
- [ ] 1.2 Delete empty directory: `rmdir "docs/completed plans"`
- [ ] 1.3 Create archive directory: `mkdir -p docs/standards/archive`
- [ ] 1.4 Move docs/standards/analysis-command-selection-guide.md to docs/standards/archive/
- [ ] 1.5 Move docs/standards/architecture-command-selection-guide.md to docs/standards/archive/
- [ ] 1.6 Move docs/standards/documentation-command-selection-guide.md to docs/standards/archive/
- [ ] 1.7 Move docs/standards/quality-verification-command-selection-guide.md to docs/standards/archive/

**VERIFY Phase 1:**
- [ ] 1.8 Verify: `find docs/plan-outputs -name "*.bak"` returns empty
- [ ] 1.9 Verify: `ls "docs/completed plans"` returns error (directory removed)
- [ ] 1.10 Verify: `ls docs/standards/archive/` shows 4 archived guides

---

## Phase 2: Fix Outdated References

**Objective:** Update documentation that references deleted files or obsolete patterns.

**Tasks:**
- [ ] 2.1 Update docs/ORCHESTRATOR.md:
  - Remove plan-runner.sh from architecture diagram (search for ASCII diagram with "plan-runner.sh")
  - Update architecture to 2-layer: plan_orchestrator.py → status-cli.js → plan-status.js
  - Remove plan-orchestrator.js references
- [ ] 2.2 Verify docs/ARCHITECTURE.md already shows correct architecture (plan_orchestrator.py, no plan-runner.sh or plan-orchestrator.js)
- [ ] 2.3 Update docs/architecture/orchestrator-system.md:
  - Remove current-plan-output.txt from pointer files section (search for "Pointer Files" and remove current-plan-output.txt line)
  - Add note that output directory is derived from plan name
- [ ] 2.4 Update .claude/commands/plan/migrate.md:
  - Remove `cat .claude/current-plan-output.txt` verification step (search for this exact command)
  - Update getOutputDir import to use plan-status.js (search for "plan-output-utils" and update)
- [ ] 2.5 Verify docs/claude-commands/ARCHITECTURE.md already shows plan-status.js as unified API (no changes needed if already correct)

**VERIFY Phase 2:**
- [ ] 2.6 Verify no dead references: `grep -r "plan-runner.sh\|plan-orchestrator.js\|status-manager.js\|current-plan-output.txt" docs/` returns no matches
- [ ] 2.7 Verify: Both docs/ARCHITECTURE.md and docs/architecture/orchestrator-system.md contain "plan_orchestrator.py" and "status-cli.js"

---

## Phase 3: Orchestrator Documentation Consolidation

**Objective:** Merge 3 overlapping orchestrator docs into single authoritative source.

**Background:** Three files document the same system with 85% content overlap:
- docs/ORCHESTRATOR.md (~420 lines) - troubleshooting, quick commands
- docs/ARCHITECTURE.md orchestrator section (~40 lines) - design decisions
- docs/architecture/orchestrator-system.md (341 lines) - TARGET file

**Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify docs/architecture/orchestrator-system.md

**Tasks:**
- [ ] 3.1 Merge FROM docs/ORCHESTRATOR.md TO docs/architecture/orchestrator-system.md:
  - Troubleshooting section (search for "## Troubleshooting" or "### Common Issues")
  - Quick command reference (search for "Quick Commands" or command examples)
  - Common error patterns and solutions
- [ ] 3.2 Merge FROM docs/ARCHITECTURE.md TO docs/architecture/orchestrator-system.md:
  - Design decisions (search for "Design Decisions" or orchestrator-related design content)
  - Key principles (search for orchestrator principles/rationale)
- [ ] 3.3 Create redirect file at docs/ORCHESTRATOR.md:
  ```markdown
  # Orchestrator Documentation

  This documentation has been consolidated.

  See: [docs/architecture/orchestrator-system.md](architecture/orchestrator-system.md)
  ```
- [ ] 3.4 Remove orchestrator section from docs/ARCHITECTURE.md (keep file, remove duplicate section)

**VERIFY Phase 3:**
- [ ] 3.5 Verify: `grep -c "Troubleshooting\|Common Issues" docs/architecture/orchestrator-system.md` returns >0
- [ ] 3.6 Verify: `grep "has been consolidated" docs/ORCHESTRATOR.md` returns match
- [ ] 3.7 Verify: `grep -c "orchestrator" docs/ARCHITECTURE.md` returns <5 (only reference, not full section)

---

## Phase 4: Plan Migration Documentation Cross-References

**Objective:** Reduce duplication between migration docs by adding cross-references.

**Execution Note:** Tasks 4.1-4.4 are [SEQUENTIAL] - 4.1/4.3/4.4 modify COMPLETED-PLANS.md, 4.2/4.4 modify MIGRATION-GUIDE.md

**Tasks:**
- [ ] 4.1 Add to top of docs/plan-system/COMPLETED-PLANS.md:
  ```markdown
  > **See also:** [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) for step-by-step migration commands
  ```
- [ ] 4.2 Add to top of docs/plan-system/MIGRATION-GUIDE.md:
  ```markdown
  > **See also:** [COMPLETED-PLANS.md](COMPLETED-PLANS.md) for understanding when and why to archive plans
  ```
- [ ] 4.3 In docs/plan-system/COMPLETED-PLANS.md: Remove duplicate command examples (search for migration/archive command blocks) and replace with: "See MIGRATION-GUIDE.md for complete commands"
- [ ] 4.4 In docs/plan-system/COMPLETED-PLANS.md and docs/plan-system/MIGRATION-GUIDE.md: replace "docs/completed plans/" with "docs/plans/archive/"

**VERIFY Phase 4:**
- [ ] 4.5 Verify: `grep "See also" docs/plan-system/COMPLETED-PLANS.md docs/plan-system/MIGRATION-GUIDE.md` returns matches in both
- [ ] 4.6 Verify: `grep -c "MIGRATION-GUIDE.md for complete commands" docs/plan-system/COMPLETED-PLANS.md` returns >0

---

## Phase 5: Create Unified Standards Document

**Objective:** Create authoritative PLAN-STANDARDS.md and establish standards hierarchy.

**Tasks:**
- [ ] 5.1 Create docs/standards/PLAN-STANDARDS.md from docs/plan-outputs/documentation-standards-analysis/proposed-standards.md
- [ ] 5.2 Add deprecation notice to docs/standards/implementation-plan-standards.md:
  ```markdown
  > **Note:** This document is being superseded by [PLAN-STANDARDS.md](PLAN-STANDARDS.md).
  > For the unified specification, see the new document.
  ```
- [ ] 5.3 Update docs/plan-templates/TEMPLATE.md to reference PLAN-STANDARDS.md
- [ ] 5.4 Update docs/plan-templates/CANONICAL-COMMAND-TEMPLATE.md header to reference standards

**VERIFY Phase 5:**
- [ ] 5.5 Verify: `test -f docs/standards/PLAN-STANDARDS.md && wc -l docs/standards/PLAN-STANDARDS.md` shows file exists with >100 lines
- [ ] 5.6 Verify: `grep "superseded by" docs/standards/implementation-plan-standards.md` returns match
- [ ] 5.7 Verify: `grep "PLAN-STANDARDS" docs/plan-templates/TEMPLATE.md docs/plan-templates/CANONICAL-COMMAND-TEMPLATE.md` returns matches

---

## Phase 6: Final Verification

**Objective:** Confirm all cleanup and orchestration updates completed successfully.

**Tasks:**
- [ ] 6.1 Run comprehensive verification:
  - No .bak files in docs/plan-outputs/
  - No references to deleted files (plan-runner.sh, plan-orchestrator.js, etc.)
  - Single orchestrator source of truth
  - Cross-references in migration docs
  - Standards hierarchy established
  - Orchestration constraints documented in /plan:implement
- [ ] 6.2 Update documentation-standards-analysis status to reflect cleanup completion
- [ ] 6.3 Document any deferred items (e.g., template consolidation, status-cli.js code changes)

**VERIFY Phase 6:**
- [ ] 6.4 All verification criteria from cleanup-plan.md satisfied
- [ ] 6.5 No new documentation issues introduced
- [ ] 6.6 `/plan:implement` correctly describes `[SEQUENTIAL]` handling

---

## Success Criteria

### Functional Requirements
- [ ] 49 backup files deleted
- [ ] Empty directory removed
- [ ] 4 theoretical guides archived
- [ ] 3 files with outdated references updated (2 verified as already correct)
- [ ] Orchestrator documentation consolidated into single file
- [ ] Unified PLAN-STANDARDS.md created
- [ ] `/plan:implement` updated with `[SEQUENTIAL]` constraint handling
- [ ] Orchestrator prompt updated with constraint rules

### Quality Requirements
- [ ] No dead file references in documentation
- [ ] Single authoritative source for orchestrator docs
- [ ] Clear standards hierarchy established
- [ ] Cross-references between related documents
- [ ] Orchestration constraints are explicit, not implicit

### Metrics
- [ ] ~400 duplicate lines eliminated (orchestrator merge)
- [ ] ~80 duplicate lines eliminated (migration docs)
- [ ] 49 backup files removed
- [ ] Documentation authority chain documented
- [ ] 6 orchestration gaps addressed (4 documentation, 2 minimum viable)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking internal references | High | Medium | Search for file references before deleting; update references first |
| Losing historical context | Medium | Low | Archive rather than delete for theoretical docs |
| Incomplete merge | Medium | Medium | Verify all content transferred before removing sources |
| Standards document too rigid | Low | Low | Include flexibility guidelines, version for iteration |

---

## Notes

1. **Phase 0 is CRITICAL** - must complete first to enable `[SEQUENTIAL]` detection in later phases
2. **Phase 1 is safe** - deleting backups and archiving theoretical docs has no downstream impact
3. **Phase 2 before Phase 3** - fix references before consolidating files
4. **Phase 3 uses [SEQUENTIAL]** - tasks 3.1-3.4 modify same file, require Phase 0 completion
5. **Orchestrator merge is highest value** - eliminates most confusion
6. **Template consolidation deferred** - 38 templates with 95%+ similarity is a larger effort
7. **Verify after each phase** - run grep searches to confirm changes are complete

---

## Deferred Work

The following items from the analysis are deferred to a future plan:

### Template Consolidation (Future Enhancement)
- 38 implement-*-command.md templates have 95%+ structural similarity
- ~10,000 lines of duplicate boilerplate could be reduced
- Recommendation: Update CANONICAL-COMMAND-TEMPLATE.md, reduce individual templates to core-only content
- Priority: Low - maintenance improvement, not urgent

### Orchestration Code Changes (COMPLETED)

~~Phase 6 of this plan implements the **minimum viable fix** (documentation updates).~~
~~The following **code changes** are deferred for complete implementation:~~

**Status: COMPLETED** - Implemented in `docs/plans/implement-orchestration-constraints.md`

| Component | Change | Status |
|-----------|--------|--------|
| `scripts/lib/plan-status.js` | `parseExecutionNotes()`, `expandTaskRange()`, `getTaskConstraints()` | ✓ Complete |
| `scripts/status-cli.js` | `cmdNext()` returns constraint metadata | ✓ Complete |
| `scripts/lib/plan-status.js` | `initializePlanStatus()` populates `executionConstraints` | ✓ Complete |
| `scripts/plan_orchestrator.py` | `_filter_sequential_tasks()`, `_build_constraints_section()` | ✓ Complete |
| Documentation | `docs/architecture/orchestrator-system.md` - Execution Constraint Handling section | ✓ Complete |

See: `docs/plans/implement-orchestration-constraints.md` for the complete implementation plan.
