# VERIFY 3: Architecture Proposal Complete with Diagrams

## Verification Status: ✅ COMPLETE

This document verifies that all Phase 3 synthesis work is complete and provides a comprehensive architecture proposal for TUI-Command integration.

---

## Verification Checklist

| Task | Description | Status | Finding Document |
|------|-------------|--------|------------------|
| 3.1 | TUI Panel Extensions Design | ✅ Complete | 3-1-tui-panel-extensions-design.md |
| 3.2 | Command-to-TUI Data Contracts | ✅ Complete | 3-2-command-tui-data-contracts.md |
| 3.3 | Keyboard Navigation & Command Palette | ✅ Complete | 3-3-keyboard-navigation-command-palette.md |
| 3.4 | Workflow Pattern Support | ✅ Complete | 3-4-workflow-pattern-support.md |
| 3.5 | Integration Priority Matrix | ✅ Complete | 3-5-integration-priority-matrix.md |

**All Phase 3 tasks completed with detailed findings.**

---

## Architecture Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TUI-COMMAND INTEGRATION ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────────────────────────────────────────┐
│   User       │     │                    Rich TUI Manager                   │
│  Terminal    │◄────►                                                        │
│              │     │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
└──────────────┘     │  │   Panels    │  │  Keyboard   │  │   Modals    │   │
       ▲             │  │   Renderer  │  │  Handler    │  │   System    │   │
       │             │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
       │             │         │                │                │          │
       │             │         ▼                ▼                ▼          │
       │             │  ┌─────────────────────────────────────────────────┐ │
       │             │  │              Selection State Manager             │ │
       │             │  │  (current_panel, cursor, multi-select, mode)    │ │
       │             │  └───────────────────────┬─────────────────────────┘ │
       │             └──────────────────────────┼──────────────────────────┘
       │                                        │
       │                                        ▼
       │             ┌──────────────────────────────────────────────────────┐
       │             │                  Command Dispatcher                   │
       │             │                                                       │
       │             │   ┌─────────────┐  ┌─────────────┐  ┌────────────┐   │
       │             │   │  Slash Cmd  │  │   TUI Cmd   │  │  Status    │   │
       │             │   │  Executor   │  │  Handler    │  │  Cmd       │   │
       │             │   └──────┬──────┘  └──────┬──────┘  └──────┬─────┘   │
       │             └──────────┼────────────────┼───────────────┼─────────┘
       │                        │                │               │
       │                        ▼                ▼               ▼
┌──────┴──────┐     ┌──────────────────┐  ┌───────────┐  ┌─────────────────┐
│   Claude    │◄────│  Claude Session  │  │  TUI      │  │  status.json    │
│   Session   │     │    Manager       │  │  State    │  │  (Data Store)   │
└─────────────┘     └──────────────────┘  └───────────┘  └────────┬────────┘
                                                                   │
                           ┌───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                       │
│                                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ StatusMonitor │  │ PhasesCache  │  │ DepsResolver │  │ FindingsIndex  │  │
│  │ (file watch)  │  │ (periodic)   │  │ (on-demand)  │  │ (on-demand)    │  │
│  └───────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT HIERARCHY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

RichTUIManager
│
├── KeyboardController
│   ├── KeyboardHandler (input thread)
│   ├── SelectionState
│   └── ModeController (normal/command/search)
│
├── PanelManager
│   ├── HeaderPanel
│   ├── PhaseDetailPanel          ◄── NEW (Task 3.1)
│   ├── ProgressPanel
│   ├── ActivityPanel
│   ├── DependencyGraphPanel      ◄── NEW (Task 3.1)
│   ├── InProgressPanel
│   ├── UpcomingPanel             ◄── NEW (Task 3.1)
│   ├── CompletionsPanel
│   ├── RunHistoryPanel           ◄── NEW (Task 3.1)
│   └── FooterPanel
│
├── ModalManager
│   ├── CommandPalette            ◄── NEW (Task 3.3)
│   ├── TaskPicker                ◄── NEW (Task 3.3)
│   ├── FindingsBrowser           ◄── NEW (Task 3.1)
│   ├── HelpOverlay               ◄── NEW (Task 3.3)
│   └── SearchModal               ◄── NEW (Task 3.3)
│
├── CommandDispatcher
│   ├── SlashCommandExecutor      ◄── NEW (Task 3.3)
│   ├── TUICommandHandler
│   └── StatusCommandHandler
│
├── DataProvider
│   ├── StatusMonitor (real-time)
│   ├── PhasesProvider (cached)
│   ├── DependencyResolver        ◄── NEW (Task 3.2)
│   ├── FindingsProvider          ◄── NEW (Task 3.2)
│   ├── RunsProvider              ◄── NEW (Task 3.2)
│   └── AgentTracker              ◄── NEW (Task 3.4)
│
└── WorkflowVisualizer
    ├── ParallelAgentView         ◄── NEW (Task 3.4)
    ├── SubtaskTreeView           ◄── NEW (Task 3.4)
    └── IterationTracker          ◄── NEW (Task 3.4)
```

---

## Panel Layout Diagram

### Current Layout (Baseline)

```
┌─────────────────────────────────────────────────────────┐
│ header (5 rows)                                         │
├─────────────────────────────────────────────────────────┤
│ progress (3 rows)                                       │
├─────────────────────────────────────────────────────────┤
│ activity (10 rows)                                      │
├───────────────────────────┬─────────────────────────────┤
│ in_progress (8 rows)      │ completions (8 rows)        │
├───────────────────────────┴─────────────────────────────┤
│ footer (2 rows)                                         │
└─────────────────────────────────────────────────────────┘
Total: ~38 rows
```

### Proposed Extended Layout

```
┌─────────────────────────────────────────────────────────┐
│ header (4 rows) [condensed]                             │
├─────────────────────────────────────────────────────────┤
│ progress + phase_detail (4 rows) [NEW]                  │
├─────────────────────────────────────────────────────────┤
│ ┌─ activity (8 rows) ─────┐┌─ dep_graph (8 rows) [NEW] ─┐│
│ │ Tool calls & events     ││ Task dependency arrows     ││
│ └─────────────────────────┘└────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ ┌─ in_progress (6 rows) ──┐┌─ upcoming (6 rows) [NEW] ──┐│
│ │ ► Current tasks         ││ [1] Next tasks             ││
│ │   Retry indicators      ││ [2] Selection hints        ││
│ └─────────────────────────┘└────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ ┌─ completions (5 rows) ──┐┌─ run_history (5 rows) [NEW]┐│
│ │ Recent completions      ││ Run #3: +8 tasks           ││
│ └─────────────────────────┘└────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ footer (2 rows)                                         │
└─────────────────────────────────────────────────────────┘
Total: ~38 rows (fits 40+ row terminal)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │  Claude Agent   │
                                    │   (Streaming)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │ Stream Parser   │
                                    │ (tool calls,    │
                                    │  task updates)  │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
    │  status.json    │            │  Activity Log   │            │  Agent Tracker  │
    │  (persistent)   │            │  (in-memory)    │            │  (in-memory)    │
    └────────┬────────┘            └────────┬────────┘            └────────┬────────┘
             │                              │                              │
             ▼                              ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
    │  File Watcher   │            │  Activity Panel │            │  Agent Panel    │
    │  (inotify/poll) │            │                 │            │  (parallel vis) │
    └────────┬────────┘            └─────────────────┘            └─────────────────┘
             │
    ┌────────┴────────────────────────────────────────────────────────────────────┐
    │                                                                              │
    ▼                    ▼                    ▼                    ▼               ▼
┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐      ┌────────┐
│Progress│          │In Prog │          │Upcoming│          │Complet │      │Run Hist│
│ Panel  │          │ Panel  │          │ Panel  │          │ Panel  │      │ Panel  │
└────────┘          └────────┘          └────────┘          └────────┘      └────────┘

                                         │
                              ┌──────────┘
                              ▼
                    ┌─────────────────┐
                    │ Deps Resolver   │──────► ┌─────────────────┐
                    │ (lazy compute)  │        │ Dependency      │
                    └─────────────────┘        │ Graph Panel     │
                                               └─────────────────┘
```

---

## Keyboard Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KEYBOARD FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────┐
                    │  Key Press    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Mode Router   │
                    └───────┬───────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ NORMAL MODE   │ │ COMMAND MODE  │ │ SEARCH MODE   │
    │               │ │               │ │               │
    │ j/k: Navigate │ │ Type: Filter  │ │ Type: Query   │
    │ Tab: Panel    │ │ Tab: Complete │ │ n/N: Navigate │
    │ e: Explain    │ │ Enter: Run    │ │ Enter: Jump   │
    │ i: Implement  │ │ Esc: Cancel   │ │ Esc: Cancel   │
    │ v: Verify     │ │               │ │               │
    │ :: Command    │ │               │ │               │
    │ /: Search     │ │               │ │               │
    └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Action        │
                    │ Dispatcher    │
                    └───────┬───────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Update State  │ │ Invoke Slash  │ │ Refresh Panel │
    │ (selection)   │ │ Command       │ │               │
    └───────────────┘ └───────────────┘ └───────────────┘
```

---

## Command Palette Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMMAND PALETTE FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

User types ":"
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║ : impl█                                                   ║  │
│ ╟───────────────────────────────────────────────────────────╢  │
│ ║ ► plan:implement  Implement task(s)                       ║  │
│ ║   plan:import     Import external plan                    ║  │
│ ║   plan:inspect    Inspect plan structure                  ║  │
│ ╟───────────────────────────────────────────────────────────╢  │
│ ║ [↑/↓ Select] [Enter Execute] [Tab Complete] [Esc Cancel]  ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
      │
      │ User selects "plan:implement"
      ▼
┌──────────────────┐
│ Task Context?    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────────────────┐
│Selected│  │No task selected    │
│ task   │  │→ Open Task Picker  │
└───┬────┘  └─────────┬──────────┘
    │                 │
    │                 ▼
    │         ┌─────────────────────────────────────────┐
    │         │ ╔═══════════════════════════════════════╗│
    │         │ ║ Select Task                           ║│
    │         │ ╟───────────────────────────────────────╢│
    │         │ ║ ► [ ] 2.1 Analyze output formats      ║│
    │         │ ║   [✓] 2.2 Analyze workflows           ║│
    │         │ ║   [ ] 2.3 Analyze missing features    ║│
    │         │ ╚═══════════════════════════════════════╝│
    │         └─────────────────┬───────────────────────┘
    │                           │
    └───────────┬───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Build Prompt  │
        │ with task ID  │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Spawn Claude  │
        │ Session       │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Stream Output │
        │ to Activity   │
        └───────────────┘
```

---

## Data Contract Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA CONTRACTS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ status-cli.js   │     │ plan-orch.js    │     │ TUI Python      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ├──► StatusResponse ◄───┤                       │
         │    {summary, tasks,   │                       │
         │     phases, run}      │                       │
         │                       │                       │
         ├──► TasksResponse      │                       │
         │    {tasks[], retry    │                       │
         │     info, deps}       │                       │
         │                       │                       │
         │                       ├──► NextTasksResponse  │
         │                       │    {tasks[],          │
         │                       │     parallelGroups}   │
         │                       │                       │
         │                       ├──► PhasesResponse     │
         │                       │    {phases[],         │
         │                       │     verifyStatus}     │
         │                       │                       │
         │                       ├──► DependenciesResp ◄─┤
         │                       │    {nodes[], edges[], │
         │                       │     criticalPath}     │
         │                       │                       │
         ├──► FindingsResponse ◄─┼──────────────────────┤
         │    {findings[],       │                       │
         │     content}          │                       │
         │                       │                       │
         ├──► RunsResponse       │                       │
         │    {runs[],           │                       │
         │     currentRun}       │                       │
         │                       │                       │
         └───────────────────────┴───────────────────────┘

Update Patterns:
  Real-time (file watch): Status, Tasks, Phases
  Polling (10-30s):       Stuck detection, Run stats
  On-demand (user):       Findings, Dependencies, Explain
```

---

## Workflow Visualization Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WORKFLOW PATTERN SUPPORT                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. SEQUENTIAL (Phase-Gated)
   ┌────────────────────────────────────────────────────────────────────┐
   │ P1 ██████████ 100%  P2 ██████░░░░ 60%  P3 ░░░░░░░░░░ 0%  P4 ░░░░ │
   │ Discovery           Analysis           Synthesis        Verify    │
   └────────────────────────────────────────────────────────────────────┘

2. PARALLEL (Fan-Out)
   ┌────────────────────────────────────────────────────────────────────┐
   │ Batch: 3 agents active                                             │
   │                                                                    │
   │ ┌─ Agent 1 ────┐  ┌─ Agent 2 ────┐  ┌─ Agent 3 ────┐              │
   │ │ Task: 2.1    │  │ Task: 2.2    │  │ Task: 2.3    │              │
   │ │ [████░░] 66% │  │ [██████] 100%│  │ [██░░░░] 33% │              │
   │ └──────────────┘  └──────────────┘  └──────────────┘              │
   │                                                                    │
   │ Fan-in: Waiting for 2/3                                            │
   └────────────────────────────────────────────────────────────────────┘

3. BRANCHING (Subtasks)
   ┌────────────────────────────────────────────────────────────────────┐
   │ Task Hierarchy                                                      │
   │ ├─ 2.1 ✓ Analyze outputs                                           │
   │ ├─ 2.2 ● Analyze workflows                                         │
   │ │   ├─ 2.2.1 ✓ Sequential patterns                                 │
   │ │   ├─ 2.2.2 ● Parallel patterns                                   │
   │ │   └─ 2.2.3 ◯ Branching patterns                                  │
   │ └─ 2.3 ◯ Analyze missing features                                  │
   └────────────────────────────────────────────────────────────────────┘

4. DEPENDENCIES
   ┌────────────────────────────────────────────────────────────────────┐
   │ 2.1 ✓ ─┬─► 2.5 ● ─► 2.6 ◯ (VERIFY)                                │
   │        │                                                           │
   │ 2.2 ✓ ─┤                                                          │
   │        │                                                           │
   │ 2.3 ✓ ─┤                                                           │
   │        │                                                           │
   │ 2.4 ✓ ─┘                                                          │
   │                                                                    │
   │ Critical Path: 2.1 → 2.5 → 2.6                                     │
   └────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION PHASES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Week 1                Week 2                Week 3+
│                     │                     │
▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  PHASE A    │───►│  PHASE B    │───►│  PHASE C    │───►│  PHASE D    │  │
│  │  Foundation │    │  Quick Wins │    │  Commands   │    │  Advanced   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Keyboard    │    │ Phase Bars  │    │ Command     │    │ Dep Graph   │  │
│  │ Handler     │    │ Upcoming    │    │ Palette     │    │ Agent Track │  │
│  │ Navigation  │    │ Retry Info  │    │ Task Picker │    │ Subtask Tree│  │
│  │ Help        │    │ Run History │    │ Action Keys │    │ Findings    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│       30%                60%                80%                95%          │
│      VALUE              VALUE              VALUE              VALUE         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Gap Resolution Summary

| Gap ID | Description | Resolution | Finding |
|--------|-------------|------------|---------|
| B1 | Task Dependencies | Dep Graph Panel + Inline Blockers | 3.1, 3.4 |
| B2 | Parallel Agent Tracking | Agent Tracking Panel | 3.4 |
| B3 | Slash Command Invocation | Command Palette + Hotkeys | 3.3 |
| B4 | Keyboard Navigation | KeyboardHandler + Navigation | 3.3 |
| G1 | Phase Progress Details | Phase Detail Panel | 3.1 |
| G2 | Findings Browser | Findings Browser Modal | 3.1 |
| G3 | Retry History Display | Retry Indicator in Panels | 3.1 |
| G4 | Explain/Verify Display | Command Output Streaming | 3.3 |
| G5 | Upcoming Tasks Panel | Upcoming Panel | 3.1 |
| G6 | Subtask Grouping | Subtask Tree View | 3.4 |
| G7 | Artifact Lifecycle | Artifact Browser Panel | 3.4 |
| G8 | Command Palette | Command Palette Modal | 3.3 |
| G9 | Hotkey Actions | Task Action Keys | 3.3 |
| G10 | Nested Workflows | Future Implementation | 3.4 |
| E1-E6 | Enhancements | Various (see 3.5) | 3.5 |

**Resolution Rate: 19/20 (95%) - G10 deferred to future**

---

## Verification Summary

### Deliverables Produced

1. **3-1-tui-panel-extensions-design.md** (407 lines)
   - 6 new panel designs with ASCII mockups
   - Layout specifications
   - Implementation priority

2. **3-2-command-tui-data-contracts.md** (604 lines)
   - 8 data contracts with TypeScript schemas
   - Update frequency requirements
   - Real-time vs polling patterns

3. **3-3-keyboard-navigation-command-palette.md** (545 lines)
   - Complete keybinding reference
   - Command palette design
   - Task picker modal
   - Search mode

4. **3-4-workflow-pattern-support.md** (532 lines)
   - 5 workflow pattern visualizations
   - Data requirements for each
   - Implementation approach

5. **3-5-integration-priority-matrix.md** (249 lines)
   - Impact/effort quadrants
   - 5 implementation phases
   - Dependency graph
   - Resource estimates

6. **3-6-architecture-proposal-complete.md** (this document)
   - Architecture diagrams
   - Component hierarchy
   - Data flow
   - Gap resolution summary

### Architecture Proposal Status

| Criterion | Status |
|-----------|--------|
| All panel extensions designed | ✅ |
| All data contracts defined | ✅ |
| Keyboard navigation designed | ✅ |
| Command palette designed | ✅ |
| Workflow patterns supported | ✅ |
| Priority matrix created | ✅ |
| Architecture diagrams included | ✅ |

**VERIFY 3: ✅ COMPLETE**

---

## Next Steps

1. **Phase 4: Feasibility Verification**
   - Review Rich library capabilities for proposed panels
   - Validate command outputs can provide required data
   - Check performance implications
   - Ensure backward compatibility

2. **Implementation**
   - Start with Phase A (Keyboard Foundation)
   - Follow priority matrix from Task 3.5
   - Implement data contracts incrementally
