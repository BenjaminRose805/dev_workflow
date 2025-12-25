# Analysis Plan: TUI and Command Integration Compatibility

## Overview
- **Target:** Plan commands, orchestrator TUI, and implement-* plans
- **Focus:** Compatibility gaps and integration requirements for expanded TUI
- **Created:** 2025-12-24
- **Output:** `docs/plan-outputs/tui-command-integration-analysis/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Discovery - Current State Mapping

- [ ] 1.1 Document all 13 plan commands and their CLI interfaces (arguments, outputs, exit codes)
- [ ] 1.2 Map TUI panels to data sources (status.json fields, script outputs)
- [ ] 1.3 Inventory implement-* plan requirements (38 plans, artifact schemas, workflow patterns)
- [ ] 1.4 Document current TUI-to-command integration points (plan-orchestrator.js ↔ status-cli.js)
- [ ] **VERIFY 1**: Current state fully documented in findings/

## Phase 2: Deep Analysis - Gap Identification

- [ ] 2.1 Analyze command output formats vs TUI display capabilities
  - Which commands produce output TUI can't display?
  - Which TUI panels have no command to populate them?
- [ ] 2.2 Analyze implement-* workflow requirements vs TUI support
  - Workflow composition patterns (sequential, parallel, branching, loops)
  - Artifact lifecycle tracking
  - Dependency visualization
- [ ] 2.3 Analyze missing TUI features identified in orchestrator exploration
  - Task dependencies visualization
  - Phase progress details
  - Findings directory browser
  - Retry history display
  - Run statistics across sessions
  - Task execution timeline
- [ ] 2.4 Analyze command invocation from TUI
  - Can TUI invoke /plan:split, /plan:verify, /plan:batch directly?
  - Keyboard shortcuts mapping
  - Interactive task selection
- [ ] 2.5 Categorize findings by severity (BREAKING > BLOCKER > GAP > ENHANCEMENT)
- [ ] **VERIFY 2**: All gaps documented with evidence

## Phase 3: Synthesis - Integration Architecture

- [ ] 3.1 Design TUI panel extensions for new capabilities
  - Dependency graph panel
  - Artifact browser panel
  - Run history panel
  - Phase detail view
- [ ] 3.2 Define command-to-TUI data contracts
  - JSON output schemas commands must provide
  - Update frequency requirements
  - Real-time vs polling data
- [ ] 3.3 Design keyboard navigation and command palette
  - Hotkeys for common operations
  - Command selection interface
  - Task picker modal
- [ ] 3.4 Plan workflow pattern support in TUI
  - Fan-out visualization (parallel agents)
  - Branching decision points
  - Loop iteration tracking
- [ ] 3.5 Prioritize integration work by impact/effort
- [ ] **VERIFY 3**: Architecture proposal complete with diagrams

## Phase 4: Verification - Feasibility Check

- [ ] 4.1 Review Rich library capabilities for proposed panels
- [ ] 4.2 Validate command outputs can provide required data
- [ ] 4.3 Check performance implications (refresh rates, data volume)
- [ ] 4.4 Ensure backward compatibility with existing TUI usage
- [ ] **VERIFY 4**: All proposals validated as feasible

## Success Criteria
- [ ] All 13 commands analyzed for TUI integration potential
- [ ] All 38 implement-* plans reviewed for workflow requirements
- [ ] Gap analysis complete with severity ratings
- [ ] Architecture proposal for expanded TUI documented
- [ ] Implementation priority matrix created
- [ ] Findings documented with evidence in `findings/`
