# Analysis Plan: Dashboard-Only Migration Analysis

## Overview
- **Target:** /home/benjamin/tools/orchestrator-dashboard + /home/benjamin/tools/dev_workflow
- **Focus:** Identifying CLI/TUI dependencies and dashboard gaps
- **Created:** 2025-12-27
- **Output:** `docs/plan-outputs/dashboard-only-migration-analysis/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: Dashboard Inventory
- [ ] 1.1 Analyze orchestrator-dashboard structure and components
- [ ] 1.2 Document current dashboard features and capabilities
- [ ] 1.3 Identify API endpoints the dashboard depends on
- [ ] 1.4 Map dashboard UI components to functionality
- [ ] **VERIFY 1**: Dashboard capabilities fully documented

## Phase 2: CLI/TUI Inventory
- [ ] 2.1 Catalog all CLI commands in dev_workflow
- [ ] 2.2 Document TUI components and their functions
- [ ] 2.3 Map CLI/TUI features to their implementation files
- [ ] 2.4 Identify shared utilities between CLI/TUI and dashboard
- [ ] **VERIFY 2**: CLI/TUI components fully catalogued

## Phase 3: Gap Analysis
- [ ] 3.1 Compare dashboard features vs CLI capabilities
- [ ] 3.2 Compare dashboard features vs TUI capabilities
- [ ] 3.3 Identify features only available in CLI/TUI (missing from dashboard)
- [ ] 3.4 Categorize gaps by importance (CRITICAL > HIGH > MEDIUM > LOW)
- [ ] **VERIFY 3**: Feature gaps identified and prioritized

## Phase 4: Dependency Analysis
- [ ] 4.1 Identify dev_workflow components the dashboard requires
- [ ] 4.2 Identify dev_workflow components only used by CLI/TUI
- [ ] 4.3 Map data flow between dashboard and backend services
- [ ] 4.4 Document API contracts dashboard relies on
- [ ] **VERIFY 4**: Dependencies mapped

## Phase 5: Cleanup Recommendations
- [ ] 5.1 List CLI files/modules that can be removed
- [ ] 5.2 List TUI files/modules that can be removed
- [ ] 5.3 Identify shared code that must be preserved
- [ ] 5.4 Estimate cleanup effort and risks
- [ ] **VERIFY 5**: Cleanup plan documented

## Phase 6: Addition Recommendations
- [ ] 6.1 Prioritize missing features to add to dashboard
- [ ] 6.2 Design approach for critical missing features
- [ ] 6.3 Identify backend changes needed to support dashboard-only
- [ ] 6.4 Document migration path from CLI/TUI to dashboard
- [ ] **VERIFY 6**: Addition roadmap complete

## Phase 7: Final Synthesis
- [ ] 7.1 Create summary of all findings
- [ ] 7.2 Prioritize cleanup and additions by effort vs impact
- [ ] 7.3 Document recommended implementation order
- [ ] 7.4 Identify risks and mitigation strategies
- [ ] **VERIFY 7**: Final recommendations complete

## Success Criteria
- [ ] All phases completed
- [ ] Dashboard capabilities fully understood
- [ ] CLI/TUI components catalogued
- [ ] Feature gaps identified and prioritized
- [ ] Cleanup recommendations documented
- [ ] Addition roadmap created
- [ ] Findings documented with evidence in `findings/`
