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

- [ ] 1.2 Implement task navigation in TUI panels
  - [ ] 1.2.1 Add selection state to `InProgressPanel` and `CompletionsPanel`
  - [ ] 1.2.2 Implement cursor rendering (highlight selected row)
  - [ ] 1.2.3 Add j/k and arrow key handlers for vertical navigation
  - [ ] 1.2.4 Implement Tab key for panel switching

- [ ] 1.3 Create help overlay system
  - [ ] 1.3.1 Design help overlay panel with keybinding reference
  - [ ] 1.3.2 Implement `?` key toggle for help display
  - [ ] 1.3.3 Add context-sensitive help (different per panel)

- [ ] 1.4 Integrate keyboard handler with main TUI loop
  - [ ] 1.4.1 Add keyboard polling to refresh cycle
  - [ ] 1.4.2 Implement action dispatcher for key events
  - [ ] 1.4.3 Add escape key handling for mode exit

**VERIFY 1:** Keyboard navigation works, help displays with `?`, no input lag

---

## Phase 2: Quick Win Panels

**Objective:** Add high-value, low-effort information panels.

**Effort:** ~3 days | **Value:** 60% (cumulative)

- [ ] 2.1 Implement Phase Progress Bars (Gap G1)
  - [ ] 2.1.1 Parse phases from `plan-orchestrator.js phases` output
  - [ ] 2.1.2 Create mini progress bars for each phase
  - [ ] 2.1.3 Highlight current phase with color
  - [ ] 2.1.4 Update layout to include phase detail row

- [ ] 2.2 Implement Upcoming Tasks Panel (Gap G5)
  - [ ] 2.2.1 Create `UpcomingPanel` using `get_next_tasks()` data
  - [ ] 2.2.2 Show numbered list with task IDs and truncated descriptions
  - [ ] 2.2.3 Highlight VERIFY tasks with different color
  - [ ] 2.2.4 Add to right side of `in_progress` panel in layout

- [ ] 2.3 Implement Retry History Indicator (Gap G3)
  - [ ] 2.3.1 Read `retryCount` from task objects in status.json
  - [ ] 2.3.2 Display `[Retry N/3]` suffix for retried tasks
  - [ ] 2.3.3 Color-code based on retry count (yellow→orange→red)
  - [ ] 2.3.4 Show last error message on selection (expandable)

- [ ] 2.4 Implement Inline Blockers Display (Gap B1 partial)
  - [ ] 2.4.1 Query `plan-orchestrator.js check TASK_ID` for blockers
  - [ ] 2.4.2 Display `[Blocked by: X.Y]` indicator on tasks
  - [ ] 2.4.3 Dim tasks that cannot start due to dependencies

- [ ] 2.5 Implement Run History Panel (Enhancement E5)
  - [ ] 2.5.1 Read `runs` array from status.json
  - [ ] 2.5.2 Create `RunHistoryPanel` showing run #, start time, duration
  - [ ] 2.5.3 Show tasks completed/failed per run
  - [ ] 2.5.4 Add to right side of `completions` panel in layout

- [ ] 2.6 Implement Panel Toggle Keys
  - [ ] 2.6.1 Add 1-5 number keys to toggle panel visibility
  - [ ] 2.6.2 Store panel visibility state in memory
  - [ ] 2.6.3 Update layout dynamically based on visible panels

**VERIFY 2:** All panels display correct data, toggles work, layout adapts

---

## Phase 3: Command Integration

**Objective:** Enable slash command execution from TUI without leaving.

**Effort:** ~1 week | **Value:** 80% (cumulative)

- [ ] 3.1 Implement Command Palette (Gaps G8, B3)
  - [ ] 3.1.1 Create modal overlay class using Rich Panel
  - [ ] 3.1.2 Implement `:` key to open command palette
  - [ ] 3.1.3 Add fuzzy filter as user types command name
  - [ ] 3.1.4 List available plan commands with descriptions
  - [ ] 3.1.5 Implement Tab completion for command names
  - [ ] 3.1.6 Handle Enter to execute selected command
  - [ ] 3.1.7 Handle Escape to close palette

- [ ] 3.2 Implement Task Picker Modal (Gap B3)
  - [ ] 3.2.1 Create task picker modal for commands needing task context
  - [ ] 3.2.2 Show pending/in_progress tasks with selection
  - [ ] 3.2.3 Support multi-select with Space key for batch commands
  - [ ] 3.2.4 Filter tasks by typing (search mode)
  - [ ] 3.2.5 Return selected task(s) to command executor

- [ ] 3.3 Implement Task Action Keys (Gap G9)
  - [ ] 3.3.1 Add `e` key to run `plan:explain` on selected task
  - [ ] 3.3.2 Add `i` key to run `plan:implement` on selected task
  - [ ] 3.3.3 Add `v` key to run `plan:verify` on selected task
  - [ ] 3.3.4 Add `s` key to skip selected task
  - [ ] 3.3.5 Add `f` key to open findings for selected task
  - [ ] 3.3.6 Add `d` key to show task dependencies

- [ ] 3.4 Implement Command Output Streaming
  - [ ] 3.4.1 Spawn Claude session as subprocess for commands
  - [ ] 3.4.2 Stream output to activity panel in real-time
  - [ ] 3.4.3 Parse tool calls and status updates from stream
  - [ ] 3.4.4 Handle command completion and error states

**VERIFY 3:** Commands execute from TUI, output streams to activity, tasks update

---

## Phase 4: Advanced Visualization

**Objective:** Rich workflow visualization for complex plans.

**Effort:** ~1-2 weeks | **Value:** 95% (cumulative)

- [ ] 4.1 Implement Dependency Graph Panel (Gap B1)
  - [ ] 4.1.1 Create `DependencyGraphPanel` with box-drawing characters
  - [ ] 4.1.2 Implement vertical tree layout (not horizontal DAG)
  - [ ] 4.1.3 Show current phase tasks with dependency arrows
  - [ ] 4.1.4 Color-code by status (green=complete, yellow=in_progress, dim=pending)
  - [ ] 4.1.5 Highlight selected task's dependencies
  - [ ] 4.1.6 Add to right side of activity panel in layout

- [ ] 4.2 Implement Parallel Agent Tracking (Gap B2)
  - [ ] 4.2.1 Parse Claude stream for parallel agent spawn events
  - [ ] 4.2.2 Create agent tracker state for active agents
  - [ ] 4.2.3 Show mini progress bars for each parallel agent
  - [ ] 4.2.4 Display fan-in status (waiting for N/M agents)

- [ ] 4.3 Implement Subtask Tree View (Gap G6)
  - [ ] 4.3.1 Parse subtask notation (X.Y.Z format) from task IDs
  - [ ] 4.3.2 Create indented tree view for nested tasks
  - [ ] 4.3.3 Collapse/expand subtask groups with +/- keys
  - [ ] 4.3.4 Show subtask progress (2/5 complete)

- [ ] 4.4 Implement Findings Browser Modal (Gap G2)
  - [ ] 4.4.1 Create full-screen modal overlay
  - [ ] 4.4.2 Read findings from `findings/{task-id}*.md` files
  - [ ] 4.4.3 Render markdown using Rich Markdown component
  - [ ] 4.4.4 Add scroll with arrow keys
  - [ ] 4.4.5 Navigate between findings with n/p keys
  - [ ] 4.4.6 Close with q or Escape

- [ ] 4.5 Implement Artifact Browser Panel (Gap G7)
  - [ ] 4.5.1 Scan `findings/` directory for all artifacts
  - [ ] 4.5.2 Show artifact list with task association
  - [ ] 4.5.3 Preview artifact content on selection
  - [ ] 4.5.4 Open artifact in external editor with Enter

**VERIFY 4:** Dependency graph renders correctly, agents tracked, findings browsable

---

## Phase 5: Polish and Enhancement

**Objective:** Production quality with edge case handling.

**Effort:** Varies | **Value:** 100%

- [ ] 5.1 Implement Search Mode
  - [ ] 5.1.1 Add `/` key to enter search mode
  - [ ] 5.1.2 Search across task descriptions
  - [ ] 5.1.3 Highlight matches in panels
  - [ ] 5.1.4 Navigate matches with n/N keys

- [ ] 5.2 Implement Responsive Layouts
  - [ ] 5.2.1 Detect terminal size on startup and resize
  - [ ] 5.2.2 Create compact layout for small terminals (<24 rows)
  - [ ] 5.2.3 Create standard layout for normal terminals (40+ rows)
  - [ ] 5.2.4 Auto-hide low-priority panels when space limited

- [ ] 5.3 Implement Configuration Persistence
  - [ ] 5.3.1 Create config file at `~/.config/claude-code/tui-panels.json`
  - [ ] 5.3.2 Persist panel visibility preferences
  - [ ] 5.3.3 Persist keybinding customizations
  - [ ] 5.3.4 Load configuration on TUI startup

- [ ] 5.4 Implement Focus Mode
  - [ ] 5.4.1 Add `F` key to toggle focus mode
  - [ ] 5.4.2 Maximize selected panel, hide others
  - [ ] 5.4.3 Useful for dependency graph or findings browser

- [ ] 5.5 Add Error Handling and Recovery
  - [ ] 5.5.1 Handle status.json parse errors gracefully
  - [ ] 5.5.2 Handle command execution failures
  - [ ] 5.5.3 Show user-friendly error messages in footer
  - [ ] 5.5.4 Add retry prompts for transient errors

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
