# Implementation Plan: Fix Plan Standards Compliance

## Overview

- **Goal:** Update all non-compliant plans to follow PLAN-STANDARDS.md for orchestrator compatibility
- **Priority:** P1
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/fix-plan-compliance/`

> This plan addresses compliance issues found in 8 plans: 5 git-workflow plans (critical), and 3 others with minor issues.

## Dependencies

### Upstream
- **PLAN-STANDARDS.md** - Defines the standards to comply with
- **Plan compliance review** - Analysis identifying non-compliant plans (completed)

### Downstream
- All fixed plans will be orchestrator-ready
- git-workflow plans can be executed autonomously after fixes

### External Tools
- None

---

## Phase 0: Preparation

**Objective:** Establish the fix patterns and verify standards document is current.

- [ ] 0.1 Read `docs/standards/PLAN-STANDARDS.md` to confirm current requirements
- [ ] 0.2 Create a compliance checklist template for consistent fixes

**VERIFY Phase 0:**
- [ ] PLAN-STANDARDS.md has been reviewed
- [ ] Checklist template ready for use

---

## Phase 1: Fix Critical Plans - git-workflow-phase1

**Objective:** Fix git-workflow-phase1-core-branching.md to be fully compliant.

**Execution Note:** Tasks 1.1-1.5 are [SEQUENTIAL] - all modify `docs/plans/git-workflow-phase1-core-branching.md`

- [ ] 1.1 Add `## Dependencies` section with Upstream (none), Downstream (phase2-5), External Tools subsections to `docs/plans/git-workflow-phase1-core-branching.md`
- [ ] 1.2 Update `## Overview` section to include Priority (P2), and Output directory in standard format in `docs/plans/git-workflow-phase1-core-branching.md`
- [ ] 1.3 Add `**VERIFY Phase N:**` sections after each phase with measurable criteria in `docs/plans/git-workflow-phase1-core-branching.md`
- [ ] 1.4 Refactor interactive user prompts to be autonomous-friendly (remove "ask user", add decision logic) in `docs/plans/git-workflow-phase1-core-branching.md`
- [ ] 1.5 Add explicit file paths to all tasks (e.g., "Update `.claude/commands/git/...`") in `docs/plans/git-workflow-phase1-core-branching.md`

**VERIFY Phase 1:**
- [ ] `grep -c "## Dependencies" docs/plans/git-workflow-phase1-core-branching.md` returns 1
- [ ] `grep -c "VERIFY Phase" docs/plans/git-workflow-phase1-core-branching.md` returns >= 4
- [ ] `grep -c "ask user" docs/plans/git-workflow-phase1-core-branching.md` returns 0

---

## Phase 2: Fix Critical Plans - git-workflow-phase2

**Objective:** Fix git-workflow-phase2-completion.md to be fully compliant.

**Execution Note:** Tasks 2.1-2.4 are [SEQUENTIAL] - all modify `docs/plans/git-workflow-phase2-completion.md`

- [ ] 2.1 Add `## Dependencies` section referencing phase1 as upstream in `docs/plans/git-workflow-phase2-completion.md`
- [ ] 2.2 Update `## Overview` with Priority (P2), Output directory in `docs/plans/git-workflow-phase2-completion.md`
- [ ] 2.3 Add `**VERIFY Phase N:**` sections with specific test commands in `docs/plans/git-workflow-phase2-completion.md`
- [ ] 2.4 Add explicit file paths and break high-level tasks into subtasks in `docs/plans/git-workflow-phase2-completion.md`

**VERIFY Phase 2:**
- [ ] `grep -c "## Dependencies" docs/plans/git-workflow-phase2-completion.md` returns 1
- [ ] `grep -c "VERIFY Phase" docs/plans/git-workflow-phase2-completion.md` returns >= 4
- [ ] All tasks reference specific file paths

---

## Phase 3: Fix Critical Plans - git-workflow-phase3

**Objective:** Fix git-workflow-phase3-safety.md to be fully compliant.

**Execution Note:** Tasks 3.1-3.4 are [SEQUENTIAL] - all modify `docs/plans/git-workflow-phase3-safety.md`

- [ ] 3.1 Add `## Dependencies` section referencing phase1-2 as upstream in `docs/plans/git-workflow-phase3-safety.md`
- [ ] 3.2 Update `## Overview` with Priority (P2), Output directory in `docs/plans/git-workflow-phase3-safety.md`
- [ ] 3.3 Add `**VERIFY Phase N:**` sections for all 9 phases in `docs/plans/git-workflow-phase3-safety.md`
- [ ] 3.4 Add explicit file paths and remove interactive prompts in `docs/plans/git-workflow-phase3-safety.md`

**VERIFY Phase 3:**
- [ ] `grep -c "## Dependencies" docs/plans/git-workflow-phase3-safety.md` returns 1
- [ ] `grep -c "VERIFY Phase" docs/plans/git-workflow-phase3-safety.md` returns >= 8

---

## Phase 4: Fix Critical Plans - git-workflow-phase4

**Objective:** Fix git-workflow-phase4-advanced.md to be fully compliant.

**Execution Note:** Tasks 4.1-4.4 are [SEQUENTIAL] - all modify `docs/plans/git-workflow-phase4-advanced.md`

- [ ] 4.1 Add `## Dependencies` section referencing phase1-3 as upstream in `docs/plans/git-workflow-phase4-advanced.md`
- [ ] 4.2 Update `## Overview` with Priority (P2), Output directory in `docs/plans/git-workflow-phase4-advanced.md`
- [ ] 4.3 Add `**VERIFY Phase N:**` sections for all phases in `docs/plans/git-workflow-phase4-advanced.md`
- [ ] 4.4 Add `[SEQUENTIAL]` annotations where Phase 7 documentation conflicts with implementation phases in `docs/plans/git-workflow-phase4-advanced.md`

**VERIFY Phase 4:**
- [ ] `grep -c "## Dependencies" docs/plans/git-workflow-phase4-advanced.md` returns 1
- [ ] `grep -c "VERIFY Phase" docs/plans/git-workflow-phase4-advanced.md` returns >= 8
- [ ] `grep -c "SEQUENTIAL" docs/plans/git-workflow-phase4-advanced.md` returns >= 1

---

## Phase 5: Fix Critical Plans - git-workflow-phase5

**Objective:** Fix git-workflow-phase5-worktrees.md to be fully compliant.

**Execution Note:** Tasks 5.1-5.4 are [SEQUENTIAL] - all modify `docs/plans/git-workflow-phase5-worktrees.md`

- [ ] 5.1 Convert informal dependency note to formal `## Dependencies` section in `docs/plans/git-workflow-phase5-worktrees.md`
- [ ] 5.2 Update `## Overview` with Priority (P2), Output directory in `docs/plans/git-workflow-phase5-worktrees.md`
- [ ] 5.3 Add `**VERIFY Phase N:**` sections for all 13 phases in `docs/plans/git-workflow-phase5-worktrees.md`
- [ ] 5.4 Add `[SEQUENTIAL]` annotations for phases 3-6 that modify related orchestrator systems in `docs/plans/git-workflow-phase5-worktrees.md`

**VERIFY Phase 5:**
- [ ] `grep -c "## Dependencies" docs/plans/git-workflow-phase5-worktrees.md` returns 1
- [ ] `grep -c "VERIFY Phase" docs/plans/git-workflow-phase5-worktrees.md` returns >= 12
- [ ] `grep -c "SEQUENTIAL" docs/plans/git-workflow-phase5-worktrees.md` returns >= 1

---

## Phase 6: Fix Minor Issues - Other Plans

**Objective:** Fix minor compliance issues in remaining 3 plans.

- [ ] 6.1 Fix title format in `docs/plans/plan-system-analysis.md`: Change "Create Plan:" to "Analysis Plan:"
- [ ] 6.2 Add `## Dependencies` section to `docs/plans/plan-system-analysis.md`
- [ ] 6.3 Fix title format in `docs/plans/documentation-standards-analysis.md`: Ensure follows "Analysis Plan:" format
- [ ] 6.4 Add `## Dependencies` section to `docs/plans/documentation-standards-analysis.md`
- [ ] 6.5 Add `[SEQUENTIAL]` annotations to `docs/plans/tui-integration-implementation.md` for phases modifying TUI layout
- [ ] 6.6 Add explicit file paths to vague tasks in `docs/plans/tui-integration-implementation.md`

**VERIFY Phase 6:**
- [ ] `grep -c "## Dependencies" docs/plans/plan-system-analysis.md` returns 1
- [ ] `grep -c "## Dependencies" docs/plans/documentation-standards-analysis.md` returns 1
- [ ] `grep -c "SEQUENTIAL" docs/plans/tui-integration-implementation.md` returns >= 1

---

## Phase 7: Validation

**Objective:** Verify all plans now pass compliance checks.

- [ ] 7.1 Run compliance check on all 8 fixed plans
- [ ] 7.2 Verify each plan has: Title, Overview (Goal/Priority/Created/Output), Dependencies, Phases with VERIFY, Success Criteria, Risks
- [ ] 7.3 Verify orchestration readiness: explicit file paths, [SEQUENTIAL] annotations, no interactive prompts
- [ ] 7.4 Document any remaining issues in findings

**VERIFY Phase 7:**
- [ ] All 8 plans pass structure validation
- [ ] All 8 plans pass orchestration readiness checklist
- [ ] Findings documented in `docs/plan-outputs/fix-plan-compliance/findings/`

---

## Success Criteria

### Functional Requirements
- [ ] All 5 git-workflow plans have complete Dependencies sections
- [ ] All 5 git-workflow plans have VERIFY sections for every phase
- [ ] All 8 plans have proper Overview format (Goal, Priority, Created, Output)
- [ ] No plans contain interactive user prompts that block orchestration
- [ ] All file-conflict scenarios marked with [SEQUENTIAL] annotations

### Quality Requirements
- [ ] Plans follow consistent formatting per PLAN-STANDARDS.md
- [ ] All tasks have explicit file paths
- [ ] VERIFY criteria are automatable (commands, not subjective)
- [ ] Each plan passes the Orchestration Readiness Checklist

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing plan functionality | Medium | Low | Review changes carefully, preserve intent |
| Missing edge cases in git-workflow plans | Low | Medium | Focus on structure, don't rewrite content |
| Inconsistent fixes across plans | Medium | Medium | Use checklist template from Phase 0 |
| Over-engineering simple fixes | Low | Low | Make minimal changes to achieve compliance |

---

## Notes

1. **Phases 1-5 are independent** - Each fixes a different git-workflow plan file, can run in parallel
2. **Phase 6 tasks are independent** - Each fixes a different plan file
3. **Phase 7 depends on Phases 1-6** - Validation must wait for all fixes
4. **Preserve original intent** - Don't rewrite plan logic, only add missing structure
5. **Interactive prompts** - Replace with decision logic documentation, not removal of functionality

---

## Orchestration Readiness Checklist

- [x] All tasks have explicit file paths
- [x] Tasks in same phase checked for file conflicts
- [x] [SEQUENTIAL] annotations added where needed
- [x] Each task is self-contained with complete context
- [x] VERIFY sections have measurable, automatable criteria
- [x] No tasks require interactive user input
- [x] Complex multi-file tasks broken into subtasks
- [x] Batch-appropriate phase grouping
