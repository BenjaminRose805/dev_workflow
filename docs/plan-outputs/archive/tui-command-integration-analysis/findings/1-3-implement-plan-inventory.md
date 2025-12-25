# Task 1.3: Implement-* Plan Inventory

## Overview

There are **38 implement-* plans** in `docs/plans/`. This document inventories their requirements, artifact schemas, and workflow patterns.

---

## Plan Categories

### Commands (20 plans)

| Plan | Task Count | Key Artifacts | Workflow Pattern |
|------|------------|---------------|------------------|
| implement-analyze-command.md | 99 | Metrics, Reports | Analysis → Reporting |
| implement-architect-command.md | 152 | Diagrams, ADRs | Design → Documentation |
| implement-audit-command.md | 118 | Compliance Reports | Scan → Remediate |
| implement-brainstorm-command.md | 127 | Idea Lists, Mind Maps | Creative → Organize |
| implement-clarify-command.md | ~80 | Questions, Answers | Interactive Dialog |
| implement-debug-command.md | ~100 | Stack Traces, Fixes | Investigate → Fix |
| implement-deploy-command.md | ~90 | Manifests, Scripts | Build → Deploy |
| implement-design-command.md | ~120 | Specs, Mockups | Design → Validate |
| implement-document-command.md | ~80 | Docs, READMEs | Generate → Verify |
| implement-explain-command.md | ~60 | Explanations | Analyze → Explain |
| implement-explore-command.md | ~70 | Summaries | Search → Summarize |
| implement-fix-command.md | ~85 | Patches, Commits | Diagnose → Fix |
| implement-implement-command.md | ~150 | Code, Tests | Plan → Code → Test |
| implement-migrate-command.md | ~100 | Migration Scripts | Analyze → Transform |
| implement-model-command.md | ~80 | Schemas, ERDs | Design → Validate |
| implement-refactor-command.md | ~90 | Refactored Code | Analyze → Transform |
| implement-release-command.md | ~100 | Changelogs, Tags | Prepare → Release |
| implement-research-command.md | ~70 | Findings, Reports | Search → Synthesize |
| implement-review-command.md | ~80 | Review Comments | Analyze → Report |
| implement-spec-command.md | ~90 | Specifications | Requirements → Spec |
| implement-template-command.md | ~60 | Templates | Create → Validate |
| implement-test-command.md | ~100 | Test Files, Reports | Generate → Run |
| implement-validate-command.md | ~80 | Validation Reports | Check → Report |
| implement-workflow-command.md | ~120 | Workflow Defs | Define → Execute |

### Agents (5 plans)

| Plan | Task Count | Key Artifacts | Invocation Pattern |
|------|------------|---------------|-------------------|
| implement-analyze-agent.md | 119 | Findings, Metrics | Proactive on code changes |
| implement-debug-agent.md | ~100 | Debug Logs | Proactive on errors |
| implement-deploy-agent.md | ~90 | Deployment Logs | Triggered by release |
| implement-explore-agent.md | ~80 | Navigation Hints | Proactive for search |
| implement-review-agent.md | ~90 | Review Results | Proactive on PR/commit |

### Hooks (4 plans)

| Plan | Task Count | Key Artifacts | Trigger Pattern |
|------|------------|---------------|-----------------|
| implement-artifact-storage-hook.md | 164 | Stored Artifacts | On artifact generation |
| implement-context-loading-hook.md | ~80 | Context Data | On session start |
| implement-error-recovery-hooks.md | ~100 | Recovery Logs | On tool failure |
| implement-notification-hooks.md | ~70 | Notifications | On task events |

### Infrastructure (5 plans)

| Plan | Task Count | Key Artifacts | Pattern |
|------|------------|---------------|---------|
| implement-artifact-registry.md | 135 | Registry Index | Discovery → Index |
| implement-fan-in-fan-out.md | ~100 | Parallel Results | Spawn → Collect |
| implement-workflow-branching.md | ~90 | Branch Results | Decide → Branch |
| implement-workflow-composition.md | ~100 | Composed Workflows | Compose → Execute |
| implement-workflow-loops.md | ~80 | Loop State | Iterate → Collect |

---

## Artifact Schema Summary

### Common Artifact Types

| Type | Schema Location | Used By |
|------|-----------------|---------|
| Findings | Markdown with severity | analyze, audit, review |
| Metrics | JSON with thresholds | analyze, test, validate |
| Reports | Markdown/HTML | all commands |
| Diagrams | Mermaid | architect, model, design |
| Code | Language-specific | implement, refactor, fix |
| Tests | Test framework format | test, implement |
| Configs | JSON/YAML | deploy, workflow |
| ADRs | Markdown template | architect |

### Artifact Lifecycle States

1. **Generated** - Created by command/agent
2. **Stored** - Persisted by artifact-storage-hook
3. **Indexed** - Registered in artifact registry
4. **Versioned** - Tracked across runs
5. **Archived** - Moved to completed plans

---

## Workflow Composition Patterns

### 1. Sequential (Most Common)

```
Phase 1 → Phase 2 → Phase 3 → ... → Final
```
**Used by:** Most implement-* plans

### 2. Parallel (Fan-Out)

```
Dispatch →┬→ Agent 1 ─┬→ Collect → Report
          ├→ Agent 2 ─┤
          └→ Agent 3 ─┘
```
**Used by:** implement-fan-in-fan-out, batch execution

### 3. Branching (Conditional)

```
Analyze →┬→ [if large] → Split → Parallel
         └→ [if small] → Direct → Complete
```
**Used by:** implement-workflow-branching

### 4. Looping (Iteration)

```
while (not_done) {
  Execute → Check → [continue/break]
}
```
**Used by:** implement-workflow-loops, retry logic

### 5. Composition (Nested Workflows)

```
Parent Workflow
├→ Child Workflow 1 (reusable)
├→ Child Workflow 2 (reusable)
└→ Custom Steps
```
**Used by:** implement-workflow-composition

---

## Phase Structure Analysis

### Typical Phase Sequence

| Phase | Purpose | Common Tasks |
|-------|---------|--------------|
| 0 | Setup | Create directories, initialize configs |
| 1 | Core Implementation | Main functionality |
| 2-N | Feature Phases | Additional features |
| N-1 | Testing | Unit, integration, E2E tests |
| N | Documentation | Docs, examples, cleanup |

### Phase Dependencies

Most plans follow strict phase ordering:
- Phase N+1 depends on Phase N completion
- Some plans allow 80% completion to start next phase
- VERIFY tasks gate phase transitions

---

## Task ID Patterns

| Pattern | Meaning | Example |
|---------|---------|---------|
| `N.M` | Phase N, Task M | `1.1`, `2.3` |
| `N.M.K` | Subtask | `1.1.1`, `1.1.2` |
| `VERIFY N` | Phase verification | `VERIFY 1` |
| `0.N` | Setup/initialization | `0.1`, `0.2` |

---

## Common Task Types

### Implementation Tasks
- Create file
- Add function/class
- Modify existing code
- Configure settings

### Testing Tasks
- Write unit tests
- Run test suite
- Check coverage
- Fix failing tests

### Documentation Tasks
- Write README section
- Add code comments
- Create examples
- Update changelog

### Verification Tasks
- Run all tests
- Check build
- Validate artifacts
- Review changes

---

## Artifact Output Locations

```
docs/plan-outputs/{plan-name}/
├── status.json           # Task execution state
├── findings/             # Per-task analysis results
│   ├── 1-1.md
│   ├── 1-2.md
│   └── ...
├── timestamps/           # Execution timing
└── artifacts/            # Generated artifacts (future)
    ├── reports/
    ├── diagrams/
    └── ...
```

---

## Integration Requirements Summary

For TUI to support implement-* plans:

1. **Must Display:**
   - Current phase and phase progress
   - Active tasks (in_progress)
   - Recent completions
   - Failed tasks with retry counts
   - Artifact generation status

2. **Should Support:**
   - Parallel execution visualization
   - Dependency graph display
   - Phase transition notifications
   - VERIFY task highlighting

3. **Nice to Have:**
   - Workflow pattern indicator
   - Artifact browser
   - Run history across sessions
   - Task duration estimates

---

## Statistics

- **Total Plans:** 38
- **Total Estimated Tasks:** ~3,500+
- **Average Tasks/Plan:** ~92
- **Most Complex:** implement-architect-command.md (152 tasks)
- **Least Complex:** implement-explain-command.md (~60 tasks)
