# Success Criteria 4.6: All 13 Commands Analyzed for TUI Integration Potential

## Status: COMPLETE

This document summarizes the TUI integration analysis for all 13 plan commands.

---

## Commands Overview

| # | Command | Category | TUI Integration Potential |
|---|---------|----------|---------------------------|
| 1 | /plan:set | Setup | LOW - One-time setup, interactive selection |
| 2 | /plan:status | Display | HIGH - Core TUI data source |
| 3 | /plan:explain | Information | HIGH - Task context display |
| 4 | /plan:implement | Execution | CRITICAL - Primary action command |
| 5 | /plan:batch | Execution | CRITICAL - Parallel execution |
| 6 | /plan:verify | Validation | HIGH - Task state validation |
| 7 | /plan:split | Planning | MEDIUM - Task decomposition |
| 8 | /plan:orchestrate | Automation | CRITICAL - TUI orchestration mode |
| 9 | /plan:templates | Discovery | LOW - Template browsing |
| 10 | /plan:create | Setup | LOW - One-time creation |
| 11 | /plan:migrate | Maintenance | LOW - Legacy support |
| 12 | /plan:archive | Maintenance | LOW - Archive management |
| 13 | /plan:_common:status-tracking | Internal | N/A - Shared template |

---

## Detailed Integration Analysis

### Critical Integration (Must Have)

#### /plan:implement
- **Current State:** Runs via Claude session, no TUI invocation
- **Integration Need:** Invoke from TUI with task selection
- **Data Contract:** Task ID → Execution stream → Completion status
- **Recommendation:** Command palette + hotkey (i)

#### /plan:batch
- **Current State:** Parallel Task agent execution
- **Integration Need:** Visualize parallel execution in TUI
- **Data Contract:** Batch selection → Agent tracking → Fan-in display
- **Recommendation:** Multi-select + parallel visualization panel

#### /plan:orchestrate
- **Current State:** Drives TUI via plan-orchestrator.js
- **Integration Need:** Already integrated as TUI backend
- **Data Contract:** status.json + stream output
- **Recommendation:** Enhance with new panels (dependencies, history)

### High Integration (Should Have)

#### /plan:status
- **Current State:** CLI output, powers TUI panels
- **Integration Need:** All subcommands displayable in TUI
- **Data Contract:** StatusResponse with summary, tasks, phases
- **Recommendation:** Direct panel population

#### /plan:explain
- **Current State:** Claude generates explanation, text output
- **Integration Need:** Display explanations in TUI modal
- **Data Contract:** Task ID → Explanation text
- **Recommendation:** Modal view with hotkey (e)

#### /plan:verify
- **Current State:** Validates task completion
- **Integration Need:** Inline verification indicators
- **Data Contract:** Task ID → Verification status
- **Recommendation:** Visual indicators + hotkey (v)

### Medium Integration (Nice to Have)

#### /plan:split
- **Current State:** Modifies plan markdown
- **Integration Need:** Invoke from TUI for large tasks
- **Data Contract:** Task ID → Subtask list
- **Recommendation:** Command palette access

### Low Integration (Defer)

#### /plan:set, /plan:create, /plan:templates
- **Rationale:** Setup commands, used before TUI
- **Recommendation:** Keep as CLI-only

#### /plan:migrate, /plan:archive
- **Rationale:** Maintenance utilities, rare usage
- **Recommendation:** Keep as CLI-only

---

## Integration Requirements by Command

| Command | Keyboard | Palette | Panel | Modal | Stream |
|---------|----------|---------|-------|-------|--------|
| implement | `i` | Yes | Activity | - | Yes |
| batch | `b` | Yes | Agent Tracking | - | Yes |
| orchestrate | - | - | All | - | Yes |
| status | - | - | All | - | No |
| explain | `e` | Yes | - | Yes | No |
| verify | `v` | Yes | - | - | No |
| split | - | Yes | - | - | No |
| set | - | - | - | - | - |
| create | - | - | - | - | - |
| templates | - | - | - | - | - |
| migrate | - | - | - | - | - |
| archive | - | - | - | - | - |

---

## CLI Scripts Integration

### status-cli.js (18 subcommands)

| Subcommand | TUI Use | Integration |
|------------|---------|-------------|
| status | Data source | Already integrated |
| mark-started | Status update | Already integrated |
| mark-complete | Status update | Already integrated |
| mark-failed | Status update | Already integrated |
| mark-skipped | Status update | Already integrated |
| write-findings | Artifact storage | Already integrated |
| read-findings | Artifact display | NEW - Findings browser |
| start-run | Session tracking | Already integrated |
| complete-run | Session tracking | Already integrated |
| next | Task selection | Enhanced for upcoming panel |
| progress | Display | Already integrated |
| validate | Maintenance | Low priority display |
| sync-check | Maintenance | Low priority display |
| retryable | Retry handling | Enhanced retry panel |
| exhausted | Retry handling | Enhanced retry panel |
| increment-retry | Retry handling | Already integrated |
| detect-stuck | Health check | Already integrated |

### plan-orchestrator.js (5 subcommands)

| Subcommand | TUI Use | Integration |
|------------|---------|-------------|
| status | Core data | Already integrated |
| next | Task scheduling | Already integrated |
| run | Execution | Already integrated |
| phases | Phase display | Enhanced for phase bars |

---

## Gap Summary

| Gap Type | Count | Description |
|----------|-------|-------------|
| BLOCKER | 4 | Commands cannot be invoked from TUI |
| GAP | 6 | Output not displayable in TUI |
| ENHANCEMENT | 3 | Could improve UX |
| INTEGRATED | 6 | Already working |

---

## Recommendations

### Phase 1: Enable Command Invocation
1. Implement keyboard handler
2. Add command palette modal
3. Map hotkeys to commands (e, i, v, b)

### Phase 2: Enhance Data Display
1. Add findings browser modal
2. Add phase progress bars
3. Add retry history indicators

### Phase 3: Advanced Integration
1. Parallel agent tracking panel
2. Dependency visualization
3. Stream output display for long-running commands

---

## Verification

- [x] All 13 commands documented
- [x] Integration potential rated
- [x] Data contracts identified
- [x] Keyboard mappings proposed
- [x] CLI scripts analyzed
- [x] Gaps categorized
- [x] Recommendations provided

**All 13 commands have been analyzed for TUI integration potential.**
