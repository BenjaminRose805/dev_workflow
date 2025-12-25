# Proposed Unified Plan Standards Specification

**Generated:** 2025-12-25
**Source:** Documentation Standards Analysis Plan - Phase 4, Task 4.2
**Based on:** Findings from Phase 3 (Standards Authority Analysis)
**Purpose:** Define a unified, authoritative specification for plans, phases, and tasks

---

## Overview

This document proposes a unified `PLAN-STANDARDS.md` document that consolidates all plan, phase, and task standards into a single authoritative source. It addresses the 35 gaps and 11 conflicts identified across the current documentation.

---

## Proposed Document Structure

### PLAN-STANDARDS.md (New Unified Document)

```
PLAN-STANDARDS.md
├── 1. Document Authority
│   ├── Purpose and Scope
│   ├── Version History
│   └── Related Documents
├── 2. Plan Standards
│   ├── Required Sections
│   ├── Naming Conventions
│   ├── Metadata Requirements
│   ├── Output Directory Structure
│   └── Quality Requirements
├── 3. Phase Standards
│   ├── Required Elements
│   ├── Numbering Conventions
│   ├── Phase 0 Guidelines
│   ├── Dependency Rules
│   └── VERIFY Section Format
├── 4. Task Standards
│   ├── Required Fields
│   ├── ID Format Conventions
│   ├── Status States
│   ├── Checklist Format
│   └── Findings File Format
├── 5. Execution Standards
│   ├── Status Tracking (status.json)
│   ├── Markdown vs. JSON Authority
│   ├── State Transitions
│   └── Error Handling
├── 6. Template Standards
│   ├── Template Variables
│   ├── Template Inheritance
│   └── Template-to-Standard Relationship
└── Appendices
    ├── A. Quick Reference Card
    ├── B. Validation Checklist
    └── C. Migration from Legacy Standards
```

---

## Section 1: Document Authority

### 1.1 Purpose and Scope

This document defines the authoritative standards for:
- **Implementation plans** in `docs/plans/implement-*.md`
- **Analysis plans** in `docs/plans/*.md`
- **Plan templates** in `docs/plan-templates/*.md`
- **Plan outputs** in `docs/plan-outputs/*/`
- **Status tracking** in `docs/plan-outputs/*/status.json`

### 1.2 Version Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-25 | Initial unified specification (consolidates implementation-plan-standards.md + plan-status.json schema) |

### 1.3 Related Documents

| Document | Relationship | Authority Level |
|----------|-------------|-----------------|
| **PLAN-STANDARDS.md** | This document | PRIMARY - defines all standards |
| scripts/lib/schemas/plan-status.json | JSON Schema for status.json | DERIVED - implements execution state schema |
| docs/plan-templates/CANONICAL-COMMAND-TEMPLATE.md | Template reference | DERIVED - demonstrates standard structure |
| docs/plan-templates/TEMPLATE.md | Template format guide | REFERENCE - explains template variables |

---

## Section 2: Plan Standards

### 2.1 Required Sections

Every plan MUST include these sections in order:

| Section | Header Format | Required | Description |
|---------|--------------|----------|-------------|
| Title | `# Implementation Plan: [Name]` | Yes | Top-level title with command/feature name |
| Overview | `## Overview` | Yes | Goal, Priority, Created date, Output directory |
| Dependencies | `## Dependencies` | Yes | Upstream, Downstream, External Tools subsections |
| Phase(s) | `## Phase N: [Title]` | Yes (1+) | One or more phases with tasks |
| Success Criteria | `## Success Criteria` | Yes | Functional and Quality requirements |
| Risks | `## Risks` | Yes | Risk table with Impact, Likelihood, Mitigation |

### 2.2 Overview Section Requirements

```yaml
## Overview

- **Goal:** [One-sentence goal statement]     # REQUIRED
- **Priority:** P0 | P1 | P2                  # REQUIRED
- **Created:** YYYY-MM-DD                      # REQUIRED
- **Output:** docs/plan-outputs/{plan-name}/   # REQUIRED
- **Status:** Draft | Active | Completed       # OPTIONAL (defaults to Active)
```

**Priority Definitions:**
| Priority | Label | Description | Test Coverage Target |
|----------|-------|-------------|---------------------|
| P0 | Critical Path | Foundation commands, blocks everything | ≥95% |
| P1 | Important | Core functionality | ≥85% |
| P2 | Enhancement | Nice-to-have features | ≥80% |

### 2.3 Naming Conventions

| Element | Convention | Example | Anti-Pattern |
|---------|------------|---------|-------------|
| Plan files | kebab-case | `implement-explore-command.md` | `implement_explore_command.md` |
| Output directories | kebab-case | `docs/plan-outputs/implement-explore-command/` | Mixed case |
| Sub-commands | colon notation | `/explore:quick` | `/explore quick` |
| Model identifiers | short-form | `opus`, `sonnet`, `haiku` | `claude-opus-4-5-20251101` |
| Artifact types | kebab-case | `validation-report` | `validation_report` |

### 2.4 Output Directory Structure

Every plan generates outputs in this structure:

```
docs/plan-outputs/{plan-name}/
├── status.json          # AUTHORITATIVE execution state
├── artifacts/           # Generated artifacts (optional)
│   ├── {artifact-type}.json
│   └── {artifact-type}.md
├── findings/            # Task findings and analysis
│   └── {task-id}.md     # Dots replaced with hyphens (1.1 → 1-1.md)
├── verification/        # Verification results (optional)
│   └── phase-{n}-results.md
└── timestamps/          # Execution timing (optional)
    └── tasks/{task-id}.json
```

**Key Principle:** `status.json` is the **authoritative source of truth** for execution state. Markdown checkboxes are read-only documentation.

---

## Section 3: Phase Standards

### 3.1 Required Elements

Every phase MUST have:

```markdown
## Phase N: [Descriptive Title]

**Objective:** [What this phase accomplishes - one clear sentence]

- [ ] N.1 [Task description]
- [ ] N.2 [Task description]
  - [ ] N.2.1 [Subtask description]
  - [ ] N.2.2 [Subtask description]
- [ ] N.3 [Task description]

**VERIFY Phase N:**
- [ ] [Specific, measurable verification criterion]
- [ ] [Another criterion]
```

### 3.2 Numbering Conventions

**Phase Numbers:**
- Phase 0: Optional, for prerequisites/foundation work
- Phase 1, 2, 3...: Sequential phases for main work

**Task Numbers:**
- Format: `N.M` for task M in phase N (e.g., 1.1, 1.2, 2.1)
- Subtasks: `N.M.K` (e.g., 1.2.1, 1.2.2)
- Maximum nesting depth: 2 levels (N.M.K) - deeper nesting indicates task should be split

**Examples:**
```
Phase 0: Prerequisites
  0.1, 0.2, 0.3

Phase 1: Core Implementation
  1.1, 1.2, 1.3
  1.2.1, 1.2.2 (subtasks of 1.2)

Phase 2: Testing
  2.1, 2.2
```

### 3.3 Phase 0 Guidelines

Use Phase 0 when:
- Prerequisites must be verified before main work begins
- Setup/configuration is required
- Dependencies must be installed or validated

Skip Phase 0 when:
- No prerequisites exist
- Work can begin directly with Phase 1

### 3.4 Phase Dependency Rules

1. **Sequential by default:** Phase N must complete before Phase N+1 begins
2. **Explicit exceptions:** Document if phases can run in parallel
3. **Priority constraints:**
   - P0 tasks cannot depend on P1 or P2 tasks
   - P1 tasks cannot depend on P2 tasks

### 3.5 VERIFY Section Requirements

**Placement:** Immediately after all tasks in a phase

**Format:**
```markdown
**VERIFY Phase N:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

**Criteria Guidelines:**
- MUST be specific and measurable
- MUST reference concrete outputs (files, tests, commands)
- SHOULD include at least 2 criteria per phase
- AVOID vague language ("works correctly", "is complete")

**Good Examples:**
- [ ] All 5 test files in tests/unit/ pass: `npm test`
- [ ] Coverage ≥85%: `npm run coverage`
- [ ] No TypeScript errors: `npx tsc --noEmit`

**Bad Examples:**
- [ ] Everything works ❌ (not measurable)
- [ ] Code is complete ❌ (vague)

---

## Section 4: Task Standards

### 4.1 Required Fields

**In status.json (execution tracking):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Task identifier (N.N or N.N.N format) |
| `description` | string | Yes | Task description from plan |
| `status` | enum | Yes | pending, in_progress, completed, failed, skipped |
| `phase` | string | No | Phase this task belongs to |
| `startedAt` | ISO-8601 | No | When task started (recommended) |
| `completedAt` | ISO-8601 | No | When task completed |
| `duration` | number | No | Duration in milliseconds |
| `findingsPath` | string | No | Path to findings file |
| `error` | string | No | Error message (for failed tasks) |
| `notes` | string | No | Implementation notes |
| `skipReason` | string | No | Reason (for skipped tasks) |

### 4.2 ID Format Conventions

**Regex Pattern:** `^\d+\.\d+(\.\d+)?$`

| Format | Usage | Example |
|--------|-------|---------|
| `N.M` | Standard tasks | 1.1, 1.2, 2.1 |
| `N.M.K` | Subtasks | 1.2.1, 1.2.2 |
| `VERIFY N` | Verification tasks | VERIFY 1, VERIFY 2 |

**Finding File Naming:** Replace dots with hyphens
- Task 1.1 → `1-1.md`
- Task 2.3.1 → `2-3-1.md`

### 4.3 Status States

| State | Description | Transitions From | Transitions To |
|-------|-------------|------------------|----------------|
| `pending` | Not started | (initial) | in_progress, skipped |
| `in_progress` | Currently executing | pending | completed, failed |
| `completed` | Successfully finished | in_progress | - |
| `failed` | Execution failed | in_progress | - |
| `skipped` | Deliberately bypassed | pending, in_progress | - |

**State Diagram:**
```
pending ─────────┬──→ in_progress ──→ completed
                 │         │
                 │         ├──→ failed
                 │         │
                 └────────────→ skipped
```

### 4.4 Checklist Format

**In markdown plans:**
```markdown
- [ ] 1.1 Task description           # Incomplete
- [x] 1.2 Completed task description # Complete (for reference only)
```

**Important:** Checkboxes are **read-only documentation**. Actual state lives in `status.json`.

### 4.5 Findings File Format

Every completed task SHOULD have a findings file at `findings/{task-id}.md`:

```markdown
# Task N.M: [Description]

**Status:** completed | failed | skipped
**Started:** YYYY-MM-DDTHH:MM:SSZ
**Completed:** YYYY-MM-DDTHH:MM:SSZ
**Duration:** Xm Ys

## Summary

[Brief summary of what was done]

## Details

[Detailed findings, analysis, or implementation notes]

## Files Modified

- path/to/file1.ts
- path/to/file2.ts

## Related Tasks

- Task N.M+1: [Description]
```

---

## Section 5: Execution Standards

### 5.1 Status Tracking

The `status.json` file is the **canonical source of truth** for execution state:

```json
{
  "planPath": "docs/plans/implement-explore-command.md",
  "planName": "Implementation Plan: Explore Command",
  "createdAt": "2025-12-25T00:00:00.000Z",
  "lastUpdatedAt": "2025-12-25T12:00:00.000Z",
  "currentPhase": "Phase 1: Core Implementation",
  "tasks": [
    {
      "id": "1.1",
      "description": "Create command entry point",
      "status": "completed",
      "phase": "Phase 1: Core Implementation",
      "startedAt": "2025-12-25T10:00:00.000Z",
      "completedAt": "2025-12-25T10:30:00.000Z",
      "duration": 1800000
    }
  ],
  "summary": {
    "totalTasks": 10,
    "completed": 5,
    "pending": 4,
    "in_progress": 1,
    "failed": 0,
    "skipped": 0
  }
}
```

### 5.2 Markdown vs. JSON Authority

| Aspect | Markdown Plan | status.json |
|--------|---------------|-------------|
| Task definitions | ✓ Authoritative | Derived |
| Task descriptions | ✓ Authoritative | Copied |
| Task status | Read-only reference | ✓ Authoritative |
| Phase structure | ✓ Authoritative | Derived |
| Completion state | Not tracked | ✓ Authoritative |
| Execution timestamps | Not tracked | ✓ Authoritative |

**Key Principle:** Plan files define WHAT to do. Status.json tracks WHAT HAS BEEN DONE.

### 5.3 Error Handling

**On task failure:**
1. Set task status to `failed`
2. Record error message in `error` field
3. Continue with next independent task (if any)
4. Report failure summary at end

**On phase failure:**
- If any task in phase fails, phase is considered incomplete
- Subsequent phases should not start until decision is made (retry, skip, or abort)

---

## Section 6: Template Standards

### 6.1 Template Variables

Standard variables available in all templates:

| Variable | Description | Auto-filled |
|----------|-------------|-------------|
| `{{date}}` | Current date (YYYY-MM-DD) | Yes |
| `{{command_name}}` | Command being implemented | No |
| `{{priority}}` | P0, P1, or P2 | No |
| `{{goal_description}}` | One-line goal | No |
| `{{target_path}}` | Target file/directory | No |

### 6.2 Template-to-Standard Relationship

Templates MUST inherit from standards:

```
PLAN-STANDARDS.md (authoritative)
        ↓ defines
CANONICAL-COMMAND-TEMPLATE.md (reference template)
        ↓ extends
implement-{command}-command.md (concrete templates)
        ↓ instantiates
docs/plans/implement-*.md (actual plans)
```

Templates MUST NOT:
- Override required sections
- Change naming conventions
- Skip VERIFY sections

Templates MAY:
- Add command-specific phases
- Define additional template variables
- Provide specialized success criteria

---

## Appendix A: Quick Reference Card

### Plan File Naming
```
docs/plans/implement-{command}-command.md
```

### Required Plan Sections
```
# Implementation Plan: [Name]
## Overview (Goal, Priority, Created, Output)
## Dependencies (Upstream, Downstream, External Tools)
## Phase N: [Title] (one or more)
## Success Criteria (Functional, Quality)
## Risks (table)
```

### Task Format
```
- [ ] N.M Task description
  - [ ] N.M.1 Subtask
```

### Status Values
```
pending → in_progress → completed
                     → failed
                     → skipped
```

### Output Structure
```
docs/plan-outputs/{plan-name}/
├── status.json (authoritative)
├── findings/
├── artifacts/
└── verification/
```

---

## Appendix B: Validation Checklist

Use this checklist to validate a plan:

- [ ] Title follows format: `# Implementation Plan: [Name]`
- [ ] Overview contains: Goal, Priority (P0/P1/P2), Created, Output
- [ ] Dependencies section has: Upstream, Downstream, External Tools
- [ ] At least one Phase section exists
- [ ] Each phase has: Header, Objective, Tasks, VERIFY
- [ ] Task IDs follow N.M or N.M.K format
- [ ] VERIFY sections are specific and measurable
- [ ] Success Criteria section exists with checkboxes
- [ ] Risks table exists with Impact, Likelihood, Mitigation columns

---

## Appendix C: Migration from Legacy Standards

### From implementation-plan-standards.md

The existing `docs/standards/implementation-plan-standards.md` (Version 1.0) remains valid but will be superseded by this unified document. Migration steps:

1. **No immediate action required** - existing plans remain valid
2. **New plans** should reference `PLAN-STANDARDS.md`
3. **Cross-reference** will be added to implementation-plan-standards.md pointing to new unified doc

### Addressing Identified Gaps

This unified document addresses the following gaps from the analysis:

| Gap | Resolution |
|-----|------------|
| Task complexity classification | Added maximum nesting depth (2 levels) |
| Inter-plan dependencies | Added phase dependency rules |
| Template variable validation | Defined standard variables |
| Task duration tracking | Included in status.json schema |
| Findings file organization | Defined findings format |
| Plan versioning | Added version history section |
| Phase-to-phase data flow | Defined sequential-by-default rule |
| Error handling | Added execution standards section |
| Status.json evolution | Defined canonical schema |
| Batch execution semantics | Documented in execution standards |

---

**End of Proposed Standards Specification**
