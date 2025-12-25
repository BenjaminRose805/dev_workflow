# Review of docs/plans/ - Existing Plan Patterns

**Analysis Date:** 2025-12-20
**Plans Reviewed:** 3 active plans
**Templates Reviewed:** 5 plan templates

---

## Executive Summary

The `docs/plans/` directory contains 3 active plans representing different stages of evolution from inline plan execution to a separated output architecture. The system demonstrates mature, well-structured planning with consistent patterns across all plans.

---

## Plans Reviewed

### 1. architecture-review.md

**Type:** Strategic analysis plan
**Status:** Active (Phase 1 - Discovery)
**Total Phases:** 12
**Total Tasks:** 72+

**Purpose:** Command structure and workflow optimization - exploring restructuring from `plan:*` namespace to action-based commands.

**Key Patterns:**
- Extensive upfront taxonomy definition
- Hypothesis-driven analysis
- Multi-dimensional command organization
- 30+ commands proposed across 8 categories

---

### 2. output-separation-implementation.md

**Type:** Implementation plan
**Status:** Phase 3 complete (27/28 tasks)
**Total Phases:** 6 (0-5)
**Total Tasks:** 28

**Purpose:** Implement the design to separate plan outputs from plan files.

**Key Patterns:**
- Zero-indexed phases for foundation work
- Explicit dependency declarations
- Incremental migration support
- ASCII dependency graph

---

### 3. plan-system-analysis.md

**Type:** Create-plan workflow (meta-plan)
**Status:** Complete (100%)
**Total Phases:** 5

**Purpose:** Meta-plan for analyzing and designing the plan system itself.

**Key Patterns:**
- Requirements-first approach
- Inline research (legacy format)
- Nested planning (generates sub-plan)
- Risk analysis sections

---

## Common Patterns Across All Plans

### Standard Header Format
```markdown
# [Type] Plan: [Name]

## Overview
- **Target/Objective:** [What]
- **Focus/Scope:** [Boundaries]
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/[plan-name]/`
```

### Phase Organization
- Sequential phases with clear names
- `**VERIFY N**` checkpoint at end of each phase
- Task IDs: `{phase}.{task}` format

### Output Separation Architecture
```
docs/plans/           # Plan definitions (immutable)
docs/plan-outputs/    # Execution outputs
    {plan-name}/
        status.json
        findings/
        timestamps/
```

### Task Types
- **Creation:** "Create X", "Add Y"
- **Modification:** "Update X", "Refactor Y"
- **Analysis:** "Identify X", "Review Y"
- **Verification:** "Verify X", "Test Y"

### Success Criteria
```markdown
## Success Criteria
- [ ] Measurable outcome 1
- [ ] Observable behavior 2
- [ ] Artifact existence 3
```

---

## Template Variables

| Variable | Usage |
|----------|-------|
| `{{date}}` | Creation date |
| `{{target_path}}` | What to analyze |
| `{{plan_name}}` | Plan identifier |
| `{{plan_filename}}` | Output folder name |
| `{{analysis_type}}` | Analysis variant |

---

## Evolution of Plan System

### Legacy Format
- Inline checkboxes modified during execution
- Results embedded in plan files
- Single-use plans

### Current Format
- Plan files as immutable templates
- Separate output directories
- Reusable plans with timestamped runs
- JSON-based status tracking

### Future Direction (from architecture-review.md)
- Action-based command taxonomy
- Dynamic workflow graphs
- Custom agents per command type
- Hook integration (pre/post command)

---

## Recommendations

### For Plan Creation
1. Use templates - start with closest match
2. Explicit dependencies in task descriptions
3. End each phase with VERIFY checkpoint
4. Define observable success criteria

### For Task Organization
1. Atomic tasks - one clear action each
2. 4-6 tasks per phase
3. Action verbs at start
4. `{phase}.{task}` numbering

### For Workflow Design
1. Verification-driven phase progression
2. Declare dependencies explicitly
3. Group independent tasks for parallelism
4. Design for reusability (multiple runs)
