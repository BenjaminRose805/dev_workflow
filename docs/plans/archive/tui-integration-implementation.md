# Implementation Plan: TUI Integration Enhancement

## Overview

- **Objective:** Implement enhanced TUI with keyboard navigation, new panels, command palette, and workflow visualization
- **Priority:** P0 (Critical Path)
- **Created:** 2025-12-24
- **Output:** `docs/plan-outputs/tui-integration-implementation/`
- **Analysis Reference:** `docs/plan-outputs/tui-command-integration-analysis/`

> This plan implements the architecture and features designed in the TUI-Command Integration Analysis. The analysis identified 20 gaps (4 BLOCKER, 10 GAP, 6 ENHANCEMENT) and proposed 6 new panels, keyboard navigation, and command integration.

---

## Dependencies

### Upstream (Already Complete)
- TUI Command Integration Analysis (28 tasks, 27 finding documents)
- Rich library feasibility validation (85% fully feasible)
- Data contracts defined (8 contracts)

### External Tools
- Python 3.8+
- Rich library (already in use)
- Textual (optional, for modal overlays)

---

## Phase 1: Keyboard Foundation

**Objective:** Enable keyboard-driven TUI interaction with navigation and help.

**Effort:** ~1 week | **Value:** 30%

- [ ] 1.1 Create `KeyboardHandler` class in `scripts/tui/keyboard.py`
  - [ ] 1.1.1 Implement threaded stdin reader for non-blocking input
  - [ ] 1.1.2 Add key mapping configuration (vim-style j/k, arrows)
  - [ ] 1.1.3 Implement mode system (NORMAL, COMMAND, SEARCH)
  - [ ] 1.1.4 Add key event queue with thread-safe access

- [ ] 1.2 Implement task navigation in TUI panels in `scripts/lib/tui.py`
  - [ ] 1.2.1 Add selection state to `InProgressPanel` and `CompletionsPanel` classes in `scripts/lib/tui.py`
  - [ ] 1.2.2 Implement cursor rendering (highlight selected row) in `scripts/lib/tui.py`
  - [ ] 1.2.3 Add j/k and arrow key handlers for vertical navigation in `scripts/tui/keyboard.py`
  - [ ] 1.2.4 Implement Tab key for panel switching in `scripts/tui/keyboard.py`

- [ ] 1.3 Create help overlay system in `scripts/tui/overlays.py`
  - [ ] 1.3.1 Design help overlay panel with keybinding reference in `scripts/tui/overlays.py`
  - [ ] 1.3.2 Implement `?` key toggle for help display in `scripts/tui/keyboard.py`
  - [ ] 1.3.3 Add context-sensitive help (different per panel) in `scripts/tui/overlays.py`

- [ ] 1.4 Integrate keyboard handler with main TUI loop in `scripts/lib/tui.py`
  - [ ] 1.4.1 Add keyboard polling to refresh cycle in `scripts/lib/tui.py` `RichTUIManager.update()` method
  - [ ] 1.4.2 Implement action dispatcher for key events in `scripts/tui/keyboard.py`
  - [ ] 1.4.3 Add escape key handling for mode exit in `scripts/tui/keyboard.py`

**VERIFY 1:** Keyboard navigation works, help displays with `?`, no input lag

---

## Phase 2: Quick Win Panels

**Objective:** Add high-value, low-effort information panels.

**Effort:** ~3 days | **Value:** 60% (cumulative)

**Execution Note:** Tasks 2.1-2.6 are [SEQUENTIAL] - all modify TUI layout in `scripts/tui/` and must be integrated one at a time to avoid layout conflicts

- [ ] 2.1 Implement Phase Progress Bars (Gap G1) in `scripts/tui/panels.py`
  - [ ] 2.1.1 Parse phases from `scripts/plan-orchestrator.js phases` output in `scripts/tui/panels.py`
  - [ ] 2.1.2 Create `PhaseProgressPanel` class with mini progress bars in `scripts/tui/panels.py`
  - [ ] 2.1.3 Highlight current phase with color in `PhaseProgressPanel` class
  - [ ] 2.1.4 Update layout to include phase detail row in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method

- [ ] 2.2 Implement Upcoming Tasks Panel (Gap G5) in `scripts/tui/panels.py`
  - [ ] 2.2.1 Create `UpcomingPanel` class using `get_next_tasks()` data in `scripts/tui/panels.py`
  - [ ] 2.2.2 Show numbered list with task IDs and truncated descriptions in `UpcomingPanel` class
  - [ ] 2.2.3 Highlight VERIFY tasks with different color in `UpcomingPanel` class
  - [ ] 2.2.4 Add `UpcomingPanel` to right side of `in_progress` panel in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method

- [ ] 2.3 Implement Retry History Indicator (Gap G3) in `scripts/lib/tui.py`
  - [ ] 2.3.1 Read `retryCount` from task objects in `docs/plan-outputs/{plan}/status.json` via `scripts/status-cli.js`
  - [ ] 2.3.2 Display `[Retry N/3]` suffix for retried tasks in `InProgressPanel` class in `scripts/lib/tui.py`
  - [ ] 2.3.3 Color-code based on retry count (yellow→orange→red) in `scripts/lib/tui.py`
  - [ ] 2.3.4 Show last error message on selection (expandable) in `scripts/lib/tui.py`

- [ ] 2.4 Implement Inline Blockers Display (Gap B1 partial) in `scripts/lib/tui.py`
  - [ ] 2.4.1 Query `scripts/plan-orchestrator.js check TASK_ID` for blockers in `scripts/lib/tui.py`
  - [ ] 2.4.2 Display `[Blocked by: X.Y]` indicator on tasks in `InProgressPanel` class in `scripts/lib/tui.py`
  - [ ] 2.4.3 Dim tasks that cannot start due to dependencies in `scripts/lib/tui.py`

- [ ] 2.5 Implement Run History Panel (Enhancement E5) in `scripts/tui/panels.py`
  - [ ] 2.5.1 Read `runs` array from `docs/plan-outputs/{plan}/status.json` via `scripts/status-cli.js`
  - [ ] 2.5.2 Create `RunHistoryPanel` class showing run #, start time, duration in `scripts/tui/panels.py`
  - [ ] 2.5.3 Show tasks completed/failed per run in `RunHistoryPanel` class
  - [ ] 2.5.4 Add `RunHistoryPanel` to right side of `completions` panel in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method

- [ ] 2.6 Implement Panel Toggle Keys in `scripts/tui/keyboard.py`
  - [ ] 2.6.1 Add 1-5 number keys to toggle panel visibility in `scripts/tui/keyboard.py`
  - [ ] 2.6.2 Store panel visibility state in `scripts/lib/tui.py` `RichTUIManager` class
  - [ ] 2.6.3 Update layout dynamically based on visible panels in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method

**VERIFY 2:** All panels display correct data, toggles work, layout adapts

---

## Phase 3: Command Integration

**Objective:** Enable slash command execution from TUI without leaving.

**Effort:** ~1 week | **Value:** 80% (cumulative)

- [ ] 3.1 Implement Command Palette (Gaps G8, B3) in `scripts/tui/command_palette.py`
  - [ ] 3.1.1 Create `CommandPaletteModal` class using Rich Panel in `scripts/tui/command_palette.py`
  - [ ] 3.1.2 Implement `:` key to open command palette in `scripts/tui/keyboard.py`
  - [ ] 3.1.3 Add fuzzy filter as user types command name in `scripts/tui/command_palette.py`
  - [ ] 3.1.4 List available plan commands from `.claude/commands/plan/` with descriptions in `scripts/tui/command_palette.py`
  - [ ] 3.1.5 Implement Tab completion for command names in `scripts/tui/command_palette.py`
  - [ ] 3.1.6 Handle Enter to execute selected command in `scripts/tui/command_palette.py`
  - [ ] 3.1.7 Handle Escape to close palette in `scripts/tui/command_palette.py`

- [ ] 3.2 Implement Task Picker Modal (Gap B3) in `scripts/tui/task_picker.py`
  - [ ] 3.2.1 Create `TaskPickerModal` class for commands needing task context in `scripts/tui/task_picker.py`
  - [ ] 3.2.2 Show pending/in_progress tasks with selection from `docs/plan-outputs/{plan}/status.json`
  - [ ] 3.2.3 Support multi-select with Space key for batch commands in `scripts/tui/task_picker.py`
  - [ ] 3.2.4 Filter tasks by typing (search mode) in `scripts/tui/task_picker.py`
  - [ ] 3.2.5 Return selected task(s) to command executor in `scripts/tui/task_picker.py`

- [ ] 3.3 Implement Task Action Keys (Gap G9) in `scripts/tui/keyboard.py`
  - [ ] 3.3.1 Add `e` key to run `.claude/commands/plan/explain.md` on selected task in `scripts/tui/keyboard.py`
  - [ ] 3.3.2 Add `i` key to run `.claude/commands/plan/implement.md` on selected task in `scripts/tui/keyboard.py`
  - [ ] 3.3.3 Add `v` key to run `.claude/commands/plan/verify.md` on selected task in `scripts/tui/keyboard.py`
  - [ ] 3.3.4 Add `s` key to skip selected task via `scripts/status-cli.js complete --skip` in `scripts/tui/keyboard.py`
  - [ ] 3.3.5 Add `f` key to open findings from `docs/plan-outputs/{plan}/findings/` for selected task in `scripts/tui/keyboard.py`
  - [ ] 3.3.6 Add `d` key to show task dependencies via `scripts/plan-orchestrator.js check` in `scripts/tui/keyboard.py`

- [ ] 3.4 Implement Command Output Streaming in `scripts/tui/command_runner.py`
  - [ ] 3.4.1 Spawn Claude session via `scripts/lib/claude_runner.py` as subprocess for commands
  - [ ] 3.4.2 Stream output to activity panel in `scripts/lib/tui.py` `ActivityTracker` in real-time
  - [ ] 3.4.3 Parse tool calls and status updates from stream in `scripts/tui/command_runner.py`
  - [ ] 3.4.4 Handle command completion and error states in `scripts/tui/command_runner.py`

**VERIFY 3:** Commands execute from TUI, output streams to activity, tasks update

---

## Phase 4: Advanced Visualization

**Objective:** Rich workflow visualization for complex plans.

**Effort:** ~1-2 weeks | **Value:** 95% (cumulative)

**Execution Note:** Tasks 4.1-4.5 are [SEQUENTIAL] - all add visualization panels to TUI layout and must be integrated one at a time

- [ ] 4.1 Implement Dependency Graph Panel (Gap B1) in `scripts/tui/panels.py`
  - [ ] 4.1.1 Create `DependencyGraphPanel` class with box-drawing characters in `scripts/tui/panels.py`
  - [ ] 4.1.2 Implement vertical tree layout (not horizontal DAG) in `DependencyGraphPanel` class
  - [ ] 4.1.3 Show current phase tasks with dependency arrows using data from `scripts/plan-orchestrator.js phases`
  - [ ] 4.1.4 Color-code by status (green=complete, yellow=in_progress, dim=pending) in `DependencyGraphPanel` class
  - [ ] 4.1.5 Highlight selected task's dependencies in `DependencyGraphPanel` class
  - [ ] 4.1.6 Add `DependencyGraphPanel` to right side of activity panel in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method

- [ ] 4.2 Implement Parallel Agent Tracking (Gap B2) in `scripts/tui/panels.py`
  - [ ] 4.2.1 Parse Claude stream for parallel agent spawn events in `scripts/tui/command_runner.py`
  - [ ] 4.2.2 Create `AgentTrackerPanel` class with agent tracker state in `scripts/tui/panels.py`
  - [ ] 4.2.3 Show mini progress bars for each parallel agent in `AgentTrackerPanel` class
  - [ ] 4.2.4 Display fan-in status (waiting for N/M agents) in `AgentTrackerPanel` class

- [ ] 4.3 Implement Subtask Tree View (Gap G6) in `scripts/tui/panels.py`
  - [ ] 4.3.1 Parse subtask notation (X.Y.Z format) from task IDs in `docs/plan-outputs/{plan}/status.json`
  - [ ] 4.3.2 Create `SubtaskTreePanel` class with indented tree view in `scripts/tui/panels.py`
  - [ ] 4.3.3 Collapse/expand subtask groups with +/- keys in `scripts/tui/keyboard.py`
  - [ ] 4.3.4 Show subtask progress (2/5 complete) in `SubtaskTreePanel` class

- [ ] 4.4 Implement Findings Browser Modal (Gap G2) in `scripts/tui/findings_browser.py`
  - [ ] 4.4.1 Create `FindingsBrowserModal` class as full-screen modal overlay in `scripts/tui/findings_browser.py`
  - [ ] 4.4.2 Read findings from `docs/plan-outputs/{plan}/findings/{task-id}*.md` files
  - [ ] 4.4.3 Render markdown using Rich Markdown component in `FindingsBrowserModal` class
  - [ ] 4.4.4 Add scroll with arrow keys in `scripts/tui/keyboard.py`
  - [ ] 4.4.5 Navigate between findings with n/p keys in `scripts/tui/keyboard.py`
  - [ ] 4.4.6 Close with q or Escape in `scripts/tui/keyboard.py`

- [ ] 4.5 Implement Artifact Browser Panel (Gap G7) in `scripts/tui/panels.py`
  - [ ] 4.5.1 Scan `docs/plan-outputs/{plan}/findings/` directory for all artifacts in `scripts/tui/panels.py`
  - [ ] 4.5.2 Create `ArtifactBrowserPanel` class showing artifact list with task association in `scripts/tui/panels.py`
  - [ ] 4.5.3 Preview artifact content on selection in `ArtifactBrowserPanel` class
  - [ ] 4.5.4 Open artifact in external editor with Enter via `$EDITOR` environment variable

**VERIFY 4:** Dependency graph renders correctly, agents tracked, findings browsable

---

## Phase 5: Polish and Enhancement

**Objective:** Production quality with edge case handling.

**Effort:** Varies | **Value:** 100%

**Execution Note:** Tasks 5.2 and 5.4 are [SEQUENTIAL] - both modify TUI layout handling in `scripts/tui/` and should not run in parallel

- [ ] 5.1 Implement Search Mode in `scripts/tui/keyboard.py`
  - [ ] 5.1.1 Add `/` key to enter search mode in `scripts/tui/keyboard.py`
  - [ ] 5.1.2 Search across task descriptions from `docs/plan-outputs/{plan}/status.json` in `scripts/tui/keyboard.py`
  - [ ] 5.1.3 Highlight matches in panels in `scripts/lib/tui.py`
  - [ ] 5.1.4 Navigate matches with n/N keys in `scripts/tui/keyboard.py`

- [ ] 5.2 Implement Responsive Layouts in `scripts/lib/tui.py`
  - [ ] 5.2.1 Detect terminal size on startup and resize in `scripts/lib/tui.py` `RichTUIManager.__init__()` method
  - [ ] 5.2.2 Create compact layout for small terminals (<24 rows) in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method
  - [ ] 5.2.3 Create standard layout for normal terminals (40+ rows) in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method
  - [ ] 5.2.4 Auto-hide low-priority panels when space limited in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method

- [ ] 5.3 Implement Configuration Persistence in `scripts/tui/config.py`
  - [ ] 5.3.1 Create config file at `~/.config/claude-code/tui-panels.json` via `scripts/tui/config.py`
  - [ ] 5.3.2 Persist panel visibility preferences in `scripts/tui/config.py`
  - [ ] 5.3.3 Persist keybinding customizations in `scripts/tui/config.py`
  - [ ] 5.3.4 Load configuration on TUI startup in `scripts/lib/tui.py` `RichTUIManager.__init__()` method

- [ ] 5.4 Implement Focus Mode in `scripts/lib/tui.py`
  - [ ] 5.4.1 Add `F` key to toggle focus mode in `scripts/tui/keyboard.py`
  - [ ] 5.4.2 Maximize selected panel, hide others in `scripts/lib/tui.py` `RichTUIManager._make_layout()` method
  - [ ] 5.4.3 Useful for dependency graph or findings browser - update `RichTUIManager` class

- [ ] 5.5 Add Error Handling and Recovery in `scripts/lib/tui.py`
  - [ ] 5.5.1 Handle `docs/plan-outputs/{plan}/status.json` parse errors gracefully in `scripts/lib/tui.py`
  - [ ] 5.5.2 Handle command execution failures in `scripts/tui/command_runner.py`
  - [ ] 5.5.3 Show user-friendly error messages in footer panel in `scripts/lib/tui.py`
  - [ ] 5.5.4 Add retry prompts for transient errors in `scripts/tui/command_runner.py`

**VERIFY 5:** TUI handles edge cases, config persists, responsive layout works

---

## Success Criteria

### Functional Requirements
- [ ] Keyboard navigation works without mouse
- [ ] All 6 new panels display correct data
- [ ] Command palette executes plan commands
- [ ] Task actions (e/i/v/s/f/d) work on selected tasks
- [ ] Findings browser renders markdown correctly
- [ ] Dependency graph shows task relationships

### Quality Requirements
- [ ] No input lag (keyboard response < 100ms)
- [ ] No visual glitches during updates
- [ ] Graceful handling of large plans (100+ tasks)
- [ ] Memory usage stable over long sessions

### Compatibility Requirements
- [ ] Works on Linux, macOS, WSL2
- [ ] Works in 80x24 minimum terminal size
- [ ] Backward compatible with existing TUI usage
- [ ] No breaking changes to CLI/JSON modes

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Terminal compatibility issues | HIGH | MEDIUM | Test on Linux, Mac, WSL early |
| Keyboard conflicts with terminal | MEDIUM | MEDIUM | Make keybindings configurable |
| Performance with large plans | MEDIUM | LOW | Lazy rendering, pagination |
| Rich library modal limitations | MEDIUM | LOW | Use Textual as fallback |
| Stream parsing errors | HIGH | MEDIUM | Robust error handling, fallbacks |

---

## Related Documents

- Analysis: `docs/plan-outputs/tui-command-integration-analysis/`
- Panel Designs: `findings/3-1-tui-panel-extensions-design.md`
- Data Contracts: `findings/3-2-command-tui-data-contracts.md`
- Keyboard Design: `findings/3-3-keyboard-navigation-command-palette.md`
- Architecture: `findings/3-6-architecture-proposal-complete.md`
- Priority Matrix: `findings/3-5-integration-priority-matrix.md`
