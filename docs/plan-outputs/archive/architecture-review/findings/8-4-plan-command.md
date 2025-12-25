# /plan Command Design Specification

**Task:** 8.4 Design `/plan` command (plan management - existing)
**Category:** Operations & Meta
**Priority:** CRITICAL
**Date:** 2025-12-20

---

## Executive Summary

**Purpose:** Manage structured plans for analysis, implementation, and testing workflows. The `/plan` command ecosystem provides a complete lifecycle for plan-based development, from creation to execution to completion, with robust status tracking and output separation.

**Key Innovation:** Output separation pattern - plans are immutable reference documents while execution state and findings are tracked separately in dedicated output directories. This enables plan reusability and maintains clean separation between plan definitions and execution results.

**Status:** Existing and functional. This document captures the current implementation pattern as a reference for other command designs.

---

## Command Structure

### Primary Command

`/plan` serves as a namespace for plan management operations. All functionality is accessed through sub-commands.

### Sub-Commands Overview

| Sub-Command | Purpose | Primary Use Case | Model |
|-------------|---------|------------------|-------|
| `plan:create` | Create plan from template | Start new structured work | Default |
| `plan:status` | View plan progress | Check completion status | Default |
| `plan:implement` | Implement plan tasks | Execute plan tasks | Default |
| `plan:verify` | Verify task completion | Check if tasks are done | Default |
| `plan:batch` | Batch execute tasks | Parallel/sequential execution | Default |
| `plan:set` | Set active plan | Switch between plans | Default |
| `plan:archive` | Archive completed plans | Clean up finished work | Default |
| `plan:templates` | List available templates | Discover plan templates | Default |
| `plan:explain` | Explain plan tasks | Get task clarification | Default |
| `plan:split` | Split task into subtasks | Break down complex tasks | Default |
| `plan:migrate` | Migrate old plans | Convert to output-separated format | Default |

---

## Sub-Commands: Detailed Specifications

### `plan:create` - Create New Plan from Template

**Purpose:** Generate a new plan file from a template with variable substitution and automatic status tracking initialization.

**Workflow:**
1. Scan `docs/plan-templates/` for available templates
2. Present template selection (using AskUserQuestion)
3. Gather template variables from user
4. Auto-fill common variables (`{{date}}`, infer framework from package.json)
5. Generate plan file in `docs/plans/`
6. Initialize output directory structure in `docs/plan-outputs/{plan-name}/`
7. Create `status.json` with all tasks marked as pending
8. Set as active plan (update `.claude/current-plan.txt` and `.claude/current-plan-output.txt`)

**Input:** None (interactive)

**Output:**
- Plan file: `docs/plans/{plan-name}.md`
- Output directory: `docs/plan-outputs/{plan-name}/`
  - `status.json` - Task tracking
  - `findings/` - Task outputs
  - `timestamps/` - Execution timing

---

### `plan:status` - View Plan Progress

**Purpose:** Display current plan progress with task completion status, phase summaries, and execution statistics.

**Features:**
- Progress bar visualization
- Task status breakdown (completed, pending, failed, skipped)
- Phase-level completion percentages
- Recent execution history
- Time tracking statistics

---

### `plan:implement` - Implement Plan Tasks

**Purpose:** Execute one or more plan tasks with guided implementation and automatic status updates.

**Workflow:**
1. Read current plan and status.json
2. Present task selection or continue from last pending
3. Execute task with appropriate tooling
4. Write findings to `findings/` directory
5. Update status.json with completion status
6. Suggest next tasks

---

### `plan:verify` - Verify Task Completion

**Purpose:** Validate that completed tasks meet acceptance criteria and produce expected outputs.

**Verification Checks:**
- Output artifacts exist
- Content meets requirements
- No regressions introduced
- Dependencies satisfied

---

### `plan:batch` - Batch Execute Tasks

**Purpose:** Execute multiple tasks in parallel or sequential groups with dependency awareness.

**Features:**
- Parallel execution for independent tasks
- Sequential execution for dependent tasks
- Progress tracking across all tasks
- Rollback on critical failures
- Resume from interruption

---

### `plan:set` - Set Active Plan

**Purpose:** Switch between multiple plans, updating the active plan reference files.

**Updates:**
- `.claude/current-plan.txt`
- `.claude/current-plan-output.txt`

---

## YAML Frontmatter Specification

### Sub-Command Example: `.claude/commands/plan/create.md`

```yaml
---
name: plan:create
description: Create a new plan from a template with variable substitution
model: sonnet
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [template-name]
category: meta
---
```

---

## Model Configuration Rationale

**Default Model:** Inherits from system default (typically Sonnet 4.5)
- Plan management is structured and procedural
- No complex reasoning required for status tracking
- Cost-effective for frequent operations

**Consider Opus for:**
- Complex task decomposition (plan:split)
- Verification of sophisticated implementations
- Cross-plan dependency analysis

---

## Plan Management Strategy

### Status Tracking Architecture

```
docs/plan-outputs/{plan-name}/
├── status.json           # Task states, timestamps, run history
├── findings/             # Task output artifacts
│   ├── 1-1-findings.md   # Task 1.1 output
│   └── 1-2-findings.md   # Task 1.2 output
└── timestamps/           # Execution timing logs
```

### status.json Schema

```json
{
  "planPath": "docs/plans/example.md",
  "planName": "Example Plan",
  "createdAt": "2025-12-20T00:00:00Z",
  "lastUpdatedAt": "2025-12-20T12:00:00Z",
  "currentPhase": "Phase 1: Setup",
  "tasks": [
    {
      "id": "1.1",
      "phase": "Phase 1: Setup",
      "description": "Task description",
      "status": "completed|pending|failed|skipped",
      "completedAt": "2025-12-20T01:00:00Z",
      "findingsPath": "findings/1-1-findings.md"
    }
  ],
  "runs": [
    {
      "runId": "run-2025-12-20-001",
      "startedAt": "2025-12-20T00:00:00Z",
      "completedAt": "2025-12-20T01:00:00Z",
      "tasksCompleted": 5,
      "tasksFailed": 0
    }
  ],
  "summary": {
    "totalTasks": 20,
    "completed": 10,
    "pending": 8,
    "failed": 1,
    "skipped": 1
  }
}
```

---

## Output Artifacts

### Plan File Structure

```markdown
# Plan Title

## Overview
- **Target:** [description]
- **Focus:** [focus area]
- **Created:** [date]
- **Output:** [output directory]

## Phase 1: [Phase Name]
- [ ] 1.1 Task description
- [ ] 1.2 Task description
- [ ] **VERIFY 1**: Verification checkpoint

## Phase 2: [Phase Name]
...

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## Workflow Integration

### How Plans Integrate with Other Commands

Plans serve as the coordination layer for complex workflows:

1. **Plan Creation:** `/plan:create` uses templates from `/template:list`
2. **Task Execution:** `/plan:implement` invokes other commands as needed
3. **Verification:** `/plan:verify` uses `/validate`, `/test` commands
4. **Documentation:** Task findings feed into `/document` workflows

### Workflow Sequences

**Analysis Workflow:**
```
/plan:create analysis → /plan:implement → /plan:verify → /plan:archive
```

**Implementation Workflow:**
```
/plan:create implementation → /plan:batch → /plan:status → /plan:verify
```

---

## Example Usage Scenarios

### Example 1: Create New Analysis Plan

```
User: /plan:create

Claude: Scanning available templates...

Templates found:
1. analysis.md - Code/architecture analysis
2. validation.md - Test coverage improvement
3. implementation.md - Feature implementation

Select template (1-3): 1

Gathering variables for Analysis Plan:
- Target: What should I analyze? [user input]
- Focus: What aspect? [user input]

Created:
→ docs/plans/my-analysis.md
→ docs/plan-outputs/my-analysis/status.json

Set as active plan. Use /plan:status to view progress.
```

### Example 2: Batch Execute Tasks

```
User: /plan:batch

Claude: Loading active plan: architecture-review

Available tasks by phase:
[x] Phase 1 (7/7 complete)
[ ] Phase 2 (0/6 complete)

Select tasks to execute:
☐ All Phase 2 tasks (6 tasks)
☐ Individual selection

Executing batch...
✓ Task 2.1 complete
✓ Task 2.2 complete
...
```

---

## Potential Improvements

### Near-term Enhancements
1. **Parallel verification:** Run multiple verify checks simultaneously
2. **Dependency graphs:** Visualize task dependencies
3. **Time estimation:** Predict task completion times based on history
4. **Cross-plan linking:** Reference tasks across plans

### Long-term Vision
1. **AI-assisted task breakdown:** Automatically split complex tasks
2. **Plan templates from history:** Generate templates from completed plans
3. **Team collaboration:** Multi-user plan execution tracking
4. **Integration with project management:** Sync with Jira, Linear, etc.

---

## Priority Classification

### P0 - Core Operations (Existing)
- `plan:create` - Plan initialization
- `plan:status` - Progress tracking
- `plan:implement` - Task execution
- `plan:verify` - Completion verification
- `plan:batch` - Parallel execution
- `plan:set` - Plan switching

### P1 - Enhanced Management (Existing)
- `plan:templates` - Template discovery
- `plan:explain` - Task clarification
- `plan:split` - Task decomposition
- `plan:archive` - Cleanup
- `plan:migrate` - Legacy conversion

---

**Phase 8 Task 8.4 Status: COMPLETE**
