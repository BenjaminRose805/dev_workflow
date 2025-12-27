# Analysis Plan: TUI Workflow Expansion Analysis

## Overview
- **Objective:** Identify how the TUI integration can be expanded to leverage current workflow implementations (git workflow, parallel execution, orchestration)
- **Target:** `scripts/tui/`, `scripts/lib/tui.py`, workflow implementations
- **Focus:** TUI expansion opportunities based on completed git workflow, parallel execution, and orchestration features
- **Created:** 2025-12-25
- **Output:** `docs/plan-outputs/tui-expansion-analysis/`

> This analysis examines the completed workflow features and identifies concrete TUI enhancements that would expose these capabilities to users.

---

## Dependencies

### Upstream (Reference Plans)
- `tui-integration-implementation.md` - Current TUI plan (24 pending tasks)
- `git-workflow-phase1-core-branching.md` - Completed
- `git-workflow-phase2-completion.md` - Completed (35/35 tasks)
- `parallel-execution-foundation.md` - Completed
- `parallel-execution-architecture.md` - Completed (analysis)

### Key Implementation Files
- `scripts/lib/tui.py` - Current TUI implementation
- `scripts/status-cli.js` - Status tracking with `--plan` arg
- `scripts/plan_orchestrator.py` - Orchestrator with git integration
- `.claude/commands/plan/*.md` - Plan commands

---

## Phase 1: Git Workflow Feature Inventory

**Objective:** Catalog all git workflow features that could be surfaced in TUI

- [ ] 1.1 Review git-workflow-phase1 findings for branch operations
  - Document: branch creation, switching, stash handling
  - File: `docs/plan-outputs/git-workflow-phase1-core-branching/findings/`

- [ ] 1.2 Review git-workflow-phase2 findings for completion workflow
  - Document: archive tags, squash merge, merge commit metadata
  - File: `docs/plan-outputs/git-workflow-phase2-completion/findings/`

- [ ] 1.3 Identify git operations currently available via CLI
  - Scan: `scripts/status-cli.js` for git-related commands
  - Scan: `.claude/commands/plan/complete.md` for completion workflow

- [ ] 1.4 Map git features to potential TUI panels/actions
  - Output: Feature-to-panel mapping table
  - Consider: branch status, uncommitted changes, archive history

- [ ] **VERIFY 1:** Git feature inventory complete with TUI mapping

---

## Phase 2: Parallel/Sequential Annotation System Analysis

**Objective:** Deep analysis of the [SEQUENTIAL] and [PARALLEL] annotation system

- [ ] 2.1 Analyze `[SEQUENTIAL]` annotation parsing
  - Scan: `scripts/status-cli.js` for SEQUENTIAL pattern matching
  - Scan: `scripts/lib/plan-status.js` for annotation extraction
  - Document: Regex patterns, task range parsing (e.g., "3.1-3.4")
  - Output: Complete annotation syntax specification

- [ ] 2.2 Analyze `[PARALLEL]` phase annotation parsing
  - Scan: `scripts/status-cli.js` for PARALLEL pattern matching
  - Document: Phase grouping logic, range vs list format (1-3 vs 1,3,5)
  - File: `docs/plan-outputs/parallel-execution-foundation/findings/`
  - Output: Parallel phase detection algorithm

- [ ] 2.3 Trace annotation flow through orchestration pipeline
  - Trace: Plan file → status-cli.js → plan_orchestrator.py → implement.md
  - Document: Where annotations are parsed, stored, and acted upon
  - Identify: Gaps where annotations are lost or ignored

- [ ] 2.4 Analyze execution note block parsing
  - Pattern: `**Execution Note:** Tasks X.X-X.X are [SEQUENTIAL]...`
  - Document: How execution notes propagate to task selection
  - Compare: Annotation in phase header vs execution note block

- [ ] 2.5 Map annotation system to TUI display opportunities
  - Consider: Visual indicators for sequential vs parallel tasks
  - Consider: Execution constraint warnings in task panels
  - Consider: Annotation editing/override controls

- [ ] **VERIFY 2:** Annotation system fully documented with TUI mapping

---

## Phase 3: File Conflict Detection Analysis

**Objective:** Deep analysis of automatic file conflict detection system

- [ ] 3.1 Analyze file reference extraction algorithm
  - File: `scripts/lib/plan-status.js` - `extractFileReferences()` function
  - Document: All regex patterns for file path detection
  - Patterns: backtick-quoted, src/tests/docs prefixes, "modify X.ts" pattern

- [ ] 3.2 Analyze conflict detection algorithm
  - File: `scripts/lib/plan-status.js` - `detectFileConflicts()` function
  - Document: File-to-task mapping, conflict identification logic
  - Output: Algorithm specification with examples

- [ ] 3.3 Test conflict detection edge cases
  - Test: Partial path matches (e.g., `src/lib/` vs `src/lib/tui.py`)
  - Test: Case sensitivity behavior
  - Test: Glob patterns in task descriptions
  - Output: Edge case behavior documentation

- [ ] 3.4 Analyze conflict data in `next` command output
  - Scan: `scripts/status-cli.js` cmdNext() function
  - Document: `hasConflicts`, `conflictsWith` fields in task objects
  - Document: How conflicts affect task batching

- [ ] 3.5 Map conflict detection to TUI visualization
  - Consider: Conflict warning badges on tasks
  - Consider: Conflict graph showing file→task relationships
  - Consider: "Why can't these run together?" explainer panel
  - Consider: Manual conflict override controls

- [ ] **VERIFY 3:** Conflict detection fully documented with TUI mapping

---

## Phase 4: Task Dependency Graph Analysis

**Objective:** Analyze task dependency system (current and planned)

- [ ] 4.1 Analyze current phase-based ordering
  - Document: Phase completion threshold (80% default)
  - Document: How phase ordering affects task selection
  - File: `scripts/status-cli.js` cmdNext() phase logic

- [ ] 4.2 Analyze planned `depends:` syntax
  - File: `docs/plan-outputs/parallel-execution-architecture/findings/6-recommendations.md`
  - Document: Proposed syntax `(depends: 1.1, 1.2)`
  - Document: DAG construction algorithm (if implemented)

- [ ] 4.3 Analyze implicit dependency detection
  - Pattern: "Task B mentions task A" detection
  - Document: How implement.md instructs agents to detect dependencies
  - File: `.claude/commands/plan/implement.md` - Parallel Execution Rules

- [ ] 4.4 Compare phase-based vs DAG-based scheduling
  - Document: Pros/cons of each approach
  - Document: Current system limitations
  - Document: Planned enhancements from architecture analysis

- [ ] 4.5 Map dependency system to TUI visualization
  - Consider: Dependency tree/graph panel (already in TUI plan)
  - Consider: "Blocked by" and "Blocking" indicators
  - Consider: Critical path highlighting
  - Consider: Dependency cycle detection warnings

- [ ] **VERIFY 4:** Dependency system fully documented with TUI mapping

---

## Phase 5: Git Commit Queue & Serialization Analysis

**Objective:** Analyze git operation serialization for parallel safety

- [ ] 5.1 Analyze git commit queue implementation
  - File: `scripts/lib/git-queue.js` (if exists) or equivalent
  - Document: Queue data structure, FIFO processing
  - Document: Lock mechanism, timeout handling

- [ ] 5.2 Analyze queue status reporting
  - Scan: `scripts/status-cli.js` for queue status commands
  - Document: `getQueueStatus()` output format
  - Document: pendingCount, processing state, queue contents

- [ ] 5.3 Analyze race condition prevention patterns
  - Document: Read-only agent pattern (agents return content, main writes)
  - Document: Atomic file writes (temp + rename)
  - Document: Optimistic locking in status.json updates
  - File: `docs/plan-outputs/parallel-execution-architecture/findings/6-recommendations.md`

- [ ] 5.4 Analyze commit serialization in parallel execution
  - Document: How concurrent tasks queue their commits
  - Document: Commit message preservation, author attribution
  - Document: Error handling for failed commits

- [ ] 5.5 Map serialization system to TUI visualization
  - Consider: Commit queue panel showing pending commits
  - Consider: "Waiting for git" indicator on tasks
  - Consider: Commit history stream in real-time
  - Consider: Manual queue management controls (reorder, cancel)

- [ ] **VERIFY 5:** Serialization system fully documented with TUI mapping

---

## Phase 6: Multi-Plan Concurrent Execution Analysis

**Objective:** Analyze concurrent plan execution capabilities

- [ ] 6.1 Analyze `--plan` argument implementation
  - File: `scripts/status-cli.js` - getPlanPath() function
  - Document: Argument parsing (--plan path vs --plan=path)
  - Document: Fallback to current-plan.txt behavior

- [ ] 6.2 Analyze plan isolation mechanisms
  - Document: Separate status.json per plan
  - Document: Separate output directories per plan
  - Document: How plans share vs isolate git state

- [ ] 6.3 Analyze planned git worktree integration
  - File: `docs/plans/git-workflow-phase5-worktrees.md`
  - Document: Worktree-per-plan architecture
  - Document: Path resolution in worktree context
  - Document: Implementation status (pending: 84 tasks)

- [ ] 6.4 Analyze multi-session orchestration
  - Document: Can multiple orchestrators run simultaneously?
  - Document: Cross-plan coordination (or lack thereof)
  - Document: Resource contention risks

- [ ] 6.5 Map multi-plan execution to TUI visualization
  - Consider: Multi-plan dashboard (all active plans)
  - Consider: Plan switcher with status preview
  - Consider: Cross-plan progress comparison
  - Consider: Unified event stream across plans
  - Consider: Plan priority/resource allocation controls

- [ ] **VERIFY 6:** Multi-plan execution fully documented with TUI mapping

---

## Phase 7: Batch Execution & Parallelism Limits Analysis

**Objective:** Analyze task batching and concurrency controls

- [ ] 7.1 Analyze batch size configuration
  - File: `scripts/plan_orchestrator.py` - batch_size parameter
  - Document: Default batch size, configuration options
  - Document: How batch size affects parallel execution

- [ ] 7.2 Analyze task selection for batches
  - Document: Which tasks are eligible for same batch
  - Document: Phase constraints, dependency constraints, file constraints
  - Document: Selection algorithm in cmdNext()

- [ ] 7.3 Analyze parallel agent spawning
  - File: `.claude/commands/plan/implement.md` - parallel execution rules
  - Document: When agents run in parallel vs sequential
  - Document: Agent spawn limits, resource considerations

- [ ] 7.4 Analyze batch progress tracking
  - Document: How batch completion is tracked
  - Document: Partial batch completion handling
  - Document: Batch retry behavior

- [ ] 7.5 Map batching system to TUI visualization
  - Consider: Current batch panel showing grouped tasks
  - Consider: Batch size adjustment slider/control
  - Consider: Parallelism indicator (N tasks running)
  - Consider: Batch history with timing stats
  - Consider: "Why was this batched this way?" explainer

- [ ] **VERIFY 7:** Batching system fully documented with TUI mapping

---

## Phase 8: Orchestrator Control & Events Analysis

**Objective:** Catalog orchestrator features for TUI integration

- [ ] 8.1 Review current orchestrator capabilities
  - Scan: `scripts/plan_orchestrator.py` for exposed features
  - Document: batch execution, progress tracking, stuck detection

- [ ] 8.2 Review orchestration gap analysis
  - File: `docs/plan-outputs/documentation-standards-analysis/findings/orchestration-flow-analysis.md`
  - Document: `[SEQUENTIAL]` handling, dependency constraints

- [ ] 8.3 Identify orchestrator events suitable for TUI streaming
  - Consider: task start/complete, retry attempts, phase transitions
  - Consider: agent spawn/complete events

- [ ] 8.4 Analyze stuck detection and recovery
  - Document: 30-minute stuck threshold
  - Document: Recovery options (retry, skip, manual)
  - Document: Event notifications for stuck tasks

- [ ] 8.5 Map orchestrator features to TUI control opportunities
  - Consider: pause/resume, skip task, manual intervention
  - Consider: batch size adjustment, retry controls
  - Consider: Stuck task intervention panel

- [ ] **VERIFY 8:** Orchestrator features fully documented with TUI mapping

---

## Phase 9: Gap Analysis vs Current TUI Plan

**Objective:** Compare inventoried features against tui-integration-implementation.md

- [ ] 9.1 Review current TUI plan phases and panels
  - File: `docs/plans/tui-integration-implementation.md`
  - Extract: All planned panels and features

- [ ] 9.2 Identify git workflow features NOT in current TUI plan
  - Compare: Phase 1 inventory vs current plan
  - Output: Missing git features list

- [ ] 9.3 Identify parallel/sequential features NOT in current TUI plan
  - Compare: Phases 2-7 inventory vs current plan
  - Output: Missing parallel/sequential features list

- [ ] 9.4 Identify orchestrator features NOT in current TUI plan
  - Compare: Phase 8 inventory vs current plan
  - Output: Missing orchestrator features list

- [ ] 9.5 Categorize gaps by implementation complexity
  - Categories: Quick win, Medium effort, Architectural change
  - Output: Categorized gap matrix

- [ ] **VERIFY 9:** Gap analysis complete with categorized missing features

---

## Phase 10: Expansion Opportunity Design

**Objective:** Design concrete TUI expansions for identified gaps

- [ ] 10.1 Design Git Status Panel expansion
  - Include: Current branch, uncommitted changes, archive tag history
  - Include: Branch switch controls, stash management
  - Estimate: Effort and priority

- [ ] 10.2 Design Parallel Execution Dashboard
  - Include: Active sessions indicator, file conflict warnings
  - Include: Commit queue status, concurrent plan display
  - Include: [SEQUENTIAL]/[PARALLEL] constraint visualization
  - Estimate: Effort and priority

- [ ] 10.3 Design Task Constraint Panel
  - Include: Why tasks are sequential (file conflicts, annotations)
  - Include: Dependency chain visualization
  - Include: Constraint override controls
  - Estimate: Effort and priority

- [ ] 10.4 Design Orchestrator Control Panel
  - Include: Pause/resume controls, batch size adjustment
  - Include: Retry controls, manual task selection
  - Include: Stuck task intervention
  - Estimate: Effort and priority

- [ ] 10.5 Design Multi-Plan View
  - Include: Side-by-side plan progress
  - Include: Cross-plan dependency visualization
  - Include: Resource allocation across plans
  - Estimate: Effort and priority

- [ ] 10.6 Design Real-time Event Stream panel
  - Include: Git commits, agent spawns, phase transitions
  - Include: Constraint violations, conflict detections
  - Include: Filterable event types
  - Estimate: Effort and priority

- [ ] 10.7 Design Batch Execution Panel
  - Include: Current batch composition
  - Include: "Why batched this way" explainer
  - Include: Batch size controls
  - Estimate: Effort and priority

- [ ] **VERIFY 10:** Expansion designs complete with effort estimates

---

## Phase 11: Synthesis and Recommendations

**Objective:** Prioritize expansions and create implementation roadmap

- [ ] 11.1 Prioritize expansions by value/effort ratio
  - Create: Priority matrix (value vs effort)
  - Consider: Dependencies between expansions

- [ ] 11.2 Identify quick wins (high value, low effort)
  - Target: Features implementable in 1-2 days
  - Output: Quick wins list with implementation notes

- [ ] 11.3 Identify integration points with existing TUI plan
  - Map: Where expansions fit into tui-integration-implementation.md phases
  - Decision criteria for Amend vs New Plan:
    - **AMEND** if ALL of: ≤15 new tasks, ≤2 new phases, no architectural changes
    - **NEW PLAN** if ANY of: >15 new tasks, >2 new phases, requires new infrastructure (e.g., event streaming, new data layer)
    - **HYBRID** option: Amend for quick wins, new plan for architectural features

- [ ] 11.4 Create expansion implementation roadmap
  - Phase expansions by dependency order
  - Estimate total effort
  - Output: Recommended implementation sequence

- [ ] 11.5 Document architectural considerations
  - Consider: Performance impact of new panels
  - Consider: Data refresh strategies for parallel state
  - Consider: Terminal size constraints
  - Consider: Real-time event streaming architecture

- [ ] 11.6 Create implementation plan or plan amendment
  - Apply decision from 11.3:
    - **If AMEND:** Add new tasks to existing phases in tui-integration-implementation.md, update task counts
    - **If NEW PLAN:** Create tui-workflow-expansion.md with phases for architectural features
    - **If HYBRID:** Amend tui-integration-implementation.md with quick wins, create tui-workflow-expansion.md for infrastructure
  - Output: Ready-to-execute implementation plan(s) with clear phase boundaries

- [ ] **VERIFY 11:** Recommendations complete with actionable roadmap

---

## Success Criteria

- [ ] All git workflow features cataloged with TUI mapping
- [ ] [SEQUENTIAL]/[PARALLEL] annotation system fully documented
- [ ] File conflict detection algorithm fully documented with edge cases
- [ ] Task dependency system (phase-based and DAG) fully documented
- [ ] Git commit queue and serialization mechanisms documented
- [ ] Multi-plan concurrent execution capabilities documented
- [ ] Batch execution and parallelism limits documented
- [ ] Orchestrator control features cataloged
- [ ] Gap analysis identifies features not in current TUI plan
- [ ] 7+ concrete expansion designs with effort estimates
- [ ] Prioritized roadmap for TUI expansion implementation
- [ ] Ready-to-execute implementation plan or plan amendment

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep from too many expansion ideas | HIGH | Strict prioritization by value/effort |
| Duplicate work with existing TUI plan | MEDIUM | Explicit gap analysis in Phase 9 |
| Technical infeasibility of some expansions | MEDIUM | Validate against Rich library capabilities |
| Analysis without implementation value | MEDIUM | Focus on actionable, concrete designs |
| Parallel state complexity in TUI | HIGH | Document refresh strategies, avoid polling overhead |
| Real-time event streaming overhead | MEDIUM | Consider buffering, throttling strategies |
