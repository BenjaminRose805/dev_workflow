# Implementation Plan: Split Orchestrator Modules

## Overview
- **Objective:** Split plan_orchestrator.py into focused, maintainable modules
- **Current State:** Single 1400-line file with multiple distinct components
- **Target State:** 4 files with clear separation of concerns
- **Created:** 2024-12-24
- **Output:** `docs/plan-outputs/split-orchestrator-modules/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## File Mapping

| Component | Source Lines | Target File |
|-----------|--------------|-------------|
| Activity, ActivityTracker | 67-184 | scripts/lib/tui.py |
| RichTUIManager | 453-736 | scripts/lib/tui.py |
| StreamingClaudeRunner | 190-349 | scripts/lib/claude_runner.py |
| StatusMonitor | 355-447 | scripts/lib/status_monitor.py |
| PlanStatus, PlanOrchestrator, main | remainder | scripts/plan_orchestrator.py |

## Phase 0: Preparation

- [ ] 0.1 Verify plan_orchestrator.py runs correctly before changes (baseline)
- [ ] 0.2 Identify all imports needed by each component
- [ ] **VERIFY 0**: Baseline test passes

## Phase 1: Create TUI Module

- [ ] 1.1 Create `scripts/lib/tui.py` with file header and imports
- [ ] 1.2 Move `Activity` dataclass to tui.py
- [ ] 1.3 Move `ActivityTracker` class to tui.py
- [ ] 1.4 Move `RichTUIManager` class to tui.py
- [ ] 1.5 Add `__all__` export list to tui.py
- [ ] **VERIFY 1**: tui.py imports without errors (`python3 -c "from scripts.lib.tui import *"`)

## Phase 2: Create Claude Runner Module

- [ ] 2.1 Create `scripts/lib/claude_runner.py` with file header and imports
- [ ] 2.2 Move `StreamingClaudeRunner` class to claude_runner.py
- [ ] 2.3 Add `__all__` export list to claude_runner.py
- [ ] **VERIFY 2**: claude_runner.py imports without errors

## Phase 3: Create Status Monitor Module

- [ ] 3.1 Create `scripts/lib/status_monitor.py` with file header and imports
- [ ] 3.2 Move `StatusMonitor` class to status_monitor.py
- [ ] 3.3 Add `__all__` export list to status_monitor.py
- [ ] **VERIFY 3**: status_monitor.py imports without errors

## Phase 4: Update Main Orchestrator

- [ ] 4.1 Remove moved classes from plan_orchestrator.py
- [ ] 4.2 Add imports from new modules to plan_orchestrator.py
- [ ] 4.3 Ensure `PlanStatus`, `PlanOrchestrator`, and `main()` remain in plan_orchestrator.py
- [ ] 4.4 Update any internal references if needed
- [ ] **VERIFY 4**: plan_orchestrator.py imports without errors

## Phase 5: Integration Testing

- [ ] 5.1 Run `python3 scripts/plan_orchestrator.py --help` to verify CLI works
- [ ] 5.2 Run `python3 scripts/plan_orchestrator.py --dry-run` to verify orchestrator initializes
- [ ] 5.3 Run `python3 scripts/plan_orchestrator.py --no-tui --dry-run` to verify non-TUI mode
- [ ] **VERIFY 5**: All integration tests pass

## Phase 6: Cleanup

- [ ] 6.1 Remove any duplicate imports from plan_orchestrator.py
- [ ] 6.2 Verify no unused imports in any module
- [ ] 6.3 Add module docstrings to each new file
- [ ] **VERIFY 6**: Final line counts match expectations (orchestrator ~550, tui ~350, runner ~150, monitor ~100)

## Success Criteria

- [ ] plan_orchestrator.py reduced from ~1400 to ~550 lines
- [ ] Each new module is independently importable
- [ ] All existing functionality preserved
- [ ] `--dry-run` mode works correctly
- [ ] TUI mode initializes without errors
- [ ] No circular imports between modules
