# Implementation Plan: Output Separation Implementation

## Overview
- **Objective:** Implement the 28-task design from plan-system-analysis to separate plan outputs from plan files
- **Scope:** .claude/commands/, scripts/lib/, docs/
- **Created:** 2025-12-18
- **Source:** Extracted from docs/plans/plan-system-analysis.md (Draft Structure)

## Phase 0: Foundation (No dependencies)
- [x] 0.1 Create `docs/plan-outputs/` directory
- [x] 0.2 Define `status.json` schema in `scripts/lib/schemas/plan-status.json`
- [x] 0.3 Create `scripts/lib/plan-output-utils.js` (depends on 0.2)
- [x] 0.4 Update `.gitignore` for output artifacts
- [x] **VERIFY 0**: Run `node scripts/scan-plans.js` - should not error

## Phase 1: Status Tracking (Depends on Phase 0)
- [x] 1.1 Create `scripts/lib/status-manager.js` (depends on 0.2, 0.3)
- [x] 1.2 Add `.claude/current-plan-output.txt` pointer
- [x] 1.3 Update `scripts/scan-plans.js` to read status.json (depends on 1.1)
- [x] 1.4 Update `/plan:status` command (depends on 1.1)
- [x] **VERIFY 1**: Create test status.json, verify `/plan:status` reads it correctly

## Phase 2: Output Separation (Depends on Phase 1)
- [x] 2.1 Update `/plan:create` to create output directory (depends on 0.3)
- [x] 2.2 Define findings output format (markdown in `findings/`)
- [x] 2.3 Update templates - remove inline placeholders, add output refs
- [x] 2.4 Add `timestamps/` subdirectory structure
- [x] **VERIFY 2**: Run `/plan:create`, verify output directory created with correct structure

## Phase 3: Command Updates (Depends on Phases 1 & 2)
- [x] 3.1 Update `/plan:implement` (depends on 1.1, 2.2)
- [x] 3.2 Update `/plan:batch` (depends on 1.1, 2.2)
- [x] 3.3 Update `/plan:verify` (depends on 1.1)
- [x] 3.4 Update `/plan:set` (depends on 1.2)
- [x] 3.5 Update `/plan:explain` (depends on 0.3)
- [x] **VERIFY 3**: Execute a simple task, verify status.json updated and findings written

## Phase 4: Migration & Compatibility (Depends on Phase 3)
- [ ] 4.1 Create `/plan:migrate` command (depends on all Phase 3)
- [ ] 4.2 Add fallback logic for backwards compatibility
- [ ] 4.3 Handle existing `docs/completed plans/`
- [ ] 4.4 Document migration process
- [ ] **VERIFY 4**: Migrate existing plan with inline results, verify extraction works

## Phase 5: Verification (Depends on Phase 4)
- [ ] 5.1 Test plan creation with output directory
- [ ] 5.2 Test status tracking across sessions
- [ ] 5.3 Test plan reuse (run same plan twice, verify separate outputs)
- [ ] 5.4 Verify backwards compatibility (old plans still work)
- [ ] **VERIFY 5**: Full end-to-end test - create plan, execute, verify outputs, rerun

## Dependency Graph
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   ↓         ↓         ↓
 0.2 → 0.3  1.1 → 1.3  2.1 requires 0.3
             ↓    ↓
            1.4   scan-plans
```

## Success Criteria
- [ ] **Output Directory Created** - `/plan:create` generates `docs/plan-outputs/{plan-name}/` with `status.json`, `findings/`, `timestamps/`
- [ ] **Status Tracking Works** - `/plan:status` reads from `status.json` and displays correct progress
- [ ] **Plan Files Unchanged** - Plan markdown files are NOT modified during execution (no checkbox changes)
- [ ] **Findings Separated** - Analysis/validation results written to `findings/` folder, not inline
- [ ] **Reusability Proven** - Same plan can be executed twice, creating separate timestamped outputs
- [ ] **Backwards Compatible** - Existing plans without output directories still function
- [ ] **All Commands Updated** - `/plan:implement`, `/plan:batch`, `/plan:verify`, `/plan:status`, `/plan:set` work with new system
