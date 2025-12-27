# Finding: Dead Code - Unused Python Files

## Summary

After thoroughly scanning the Python codebase in `/home/benjamin/tools/dev_workflow/scripts/`, **ALL Python files are actively used and imported** by the orchestration system. The codebase shows a well-organized module structure with clear dependencies and active usage patterns.

## Items for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| **NONE FOUND** | All Python files are actively imported and used | N/A | See recommendations below |

## Import Graph

The dependency graph shows healthy utilization:

```
plan_orchestrator.py (MAIN ORCHESTRATOR)
├── lib/tui.py (RichTUIManager)
├── lib/claude_runner.py (StreamingClaudeRunner)
├── lib/status_monitor.py (StatusMonitor)
├── lib/orchestrator_registry.py (OrchestratorRegistry, OrchestratorInstance)
├── lib/orchestrator_ipc.py (IPCServer, IPCClient)
└── lib/event_bus.py (EventBus)

orchestrator_server.py (API SERVER)
├── lib/event_bus.py (EventBus, EventType, Event)
├── lib/orchestrator_registry.py (OrchestratorRegistry, OrchestratorInstance)
└── lib/orchestrator_ipc.py (IPCClient, IPCError, get_socket_path)

multi_plan_monitor.py (MULTI-PLAN MONITOR)
└── lib/multi_plan_tui.py (MultiPlanTUI, MultiPlanStatusMonitor)

run_api_server.py (API RUNNER)
└── orchestrator_server.py (FastAPI app)

RichTUIManager (lib/tui.py) - DYNAMICALLY ATTACHES:
├── tui/keyboard.py (KeyboardHandler)
├── tui/overlays.py (OverlayManager)
├── tui/panels.py (PhaseProgressPanel, etc.)
├── tui/task_actions.py (TaskActionHandler)
├── tui/config.py (ConfigManager, TUIConfig)
├── tui/error_handler.py (ErrorHandler)
└── Implicitly supports all TUI submodules

overlays.py
├── tui/command_palette.py (CommandPaletteModal)
├── tui/task_picker.py (TaskPickerModal)
└── tui/findings_browser.py (FindingsBrowserModal)

command_runner.py
└── lib/claude_runner.py (StreamingClaudeRunner)
```

## Test Files Status

The test files are present and reference the main orchestrator:
- **test-orchestrator-e2e.py**: End-to-end testing module - has associated source (plan_orchestrator.py)
- **test-orchestrator-constraints.py**: Unit test for constraint handling - references plan_orchestrator.py

Both test files have corresponding source code and are not orphaned.

## Recommendations

### Priority 1: No Action Required
**All Python files are actively used.** The codebase follows good modularity practices:
- Core orchestration logic in `plan_orchestrator.py`
- Extracted, reusable components in `lib/` for separation of concerns
- Rich TUI infrastructure in `tui/` for interactive features
- Clear import hierarchy with no circular dependencies detected
- Tests exist for major orchestrator functionality

### Priority 2: Items to Monitor
None identified. However, the following should be kept for future reference:
- **lib/multi_plan_tui.py**: Currently used only by multi_plan_monitor.py. Monitor for usage patterns.
- **orchestrator_server.py**: API server for web dashboard integration. Ensure it's actively used.

### Priority 3: False Positives to Ignore
None. All files serve clear purposes within the orchestration system.

## Codebase Health Assessment

- **Code Organization**: Excellent - clear separation of concerns with lib/ and tui/ packages
- **Module Utilization**: 100% - all files are actively imported and used
- **Test Coverage**: Good - dedicated test files for orchestrator functionality
- **Import Practices**: Clean - no unused imports detected in main files
- **Circular Dependencies**: None detected
- **Python-JavaScript Duplication**: No evidence of Python files superseded by JavaScript equivalents

The codebase is well-maintained with no dead code identified.
