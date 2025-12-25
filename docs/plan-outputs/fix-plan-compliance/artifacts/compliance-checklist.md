# Plan Compliance Checklist

Use this checklist when fixing plans to ensure PLAN-STANDARDS.md compliance.

## Plan: `{{plan_path}}`

---

## Section 1: Required Sections (Structure Validation)

### 1.1 Title
- [ ] Title follows format: `# Implementation Plan: [Name]` or `# Analysis Plan: [Name]`

### 1.2 Overview
- [ ] `## Overview` section exists
- [ ] Contains: `- **Goal:** [statement]`
- [ ] Contains: `- **Priority:** P0 | P1 | P2`
- [ ] Contains: `- **Created:** YYYY-MM-DD`
- [ ] Contains: `- **Output:** docs/plan-outputs/{plan-name}/`

### 1.3 Dependencies
- [ ] `## Dependencies` section exists
- [ ] Has `### Upstream` subsection
- [ ] Has `### Downstream` subsection
- [ ] Has `### External Tools` subsection

### 1.4 Phases
- [ ] At least one `## Phase N: [Title]` exists
- [ ] Each phase has `**Objective:**` statement
- [ ] Each phase has checklist tasks with proper ID format (N.M or N.M.K)
- [ ] Each phase has `**VERIFY Phase N:**` section

### 1.5 Success Criteria
- [ ] `## Success Criteria` section exists
- [ ] Has Functional Requirements subsection with checkboxes
- [ ] Has Quality Requirements subsection with checkboxes

### 1.6 Risks
- [ ] `## Risks` section exists
- [ ] Contains table with columns: Risk, Impact, Likelihood, Mitigation

---

## Section 2: Phase Requirements

### For each Phase N:

**Phase ____:**
- [ ] Header format: `## Phase N: [Descriptive Title]`
- [ ] `**Objective:**` statement (one clear sentence)
- [ ] Tasks use checklist format: `- [ ] N.M Description`
- [ ] Task IDs follow N.M or N.M.K format
- [ ] Subtasks (if any) are indented and use N.M.K format
- [ ] `**VERIFY Phase N:**` section exists after all tasks
- [ ] VERIFY criteria are specific and measurable
- [ ] VERIFY criteria reference concrete outputs (files, tests, commands)

---

## Section 3: Orchestration Readiness

### 3.1 Task Self-Containment
- [ ] All tasks have explicit file paths (no "the file from task X")
- [ ] Each task has complete context to execute independently
- [ ] No tasks reference output from previous tasks without specifying location
- [ ] No vague file references (e.g., "update the module" → "update src/module.ts")

### 3.2 File Conflict Detection
- [ ] Tasks in same phase checked for file conflicts
- [ ] `[SEQUENTIAL]` annotations added where multiple tasks modify same file
- [ ] `**Execution Note:**` format used: `Tasks N.M-N.K are [SEQUENTIAL] - reason`

### 3.3 Autonomous Execution
- [ ] No tasks contain "ask user" or interactive prompts
- [ ] No tasks require user decisions during execution
- [ ] Decision logic documented within task or in plan notes
- [ ] Each task has clear success/failure criteria

### 3.4 VERIFY Automatable Criteria
- [ ] VERIFY criteria are commands or checks (not subjective)
- [ ] Good: `npm test passes`, `grep -c "pattern" file returns N`
- [ ] Bad: "code is complete", "works correctly"
- [ ] Each VERIFY has at least 2 measurable criteria

### 3.5 Task Complexity
- [ ] Complex multi-file tasks broken into subtasks
- [ ] Maximum task nesting: 2 levels (N.M.K)
- [ ] Tasks estimated to run in reasonable batch sizes (1-10)

---

## Quick Validation Commands

```bash
# Check for Dependencies section
grep -c "## Dependencies" {{plan_path}}  # Should return 1

# Check for VERIFY sections
grep -c "VERIFY Phase" {{plan_path}}  # Should return >= number of phases

# Check for interactive prompts (should return 0)
grep -ci "ask user\|user input\|prompt.*user" {{plan_path}}

# Check for [SEQUENTIAL] annotations (if file conflicts exist)
grep -c "SEQUENTIAL" {{plan_path}}

# Check for Overview fields
grep -E "\*\*(Goal|Priority|Created|Output):\*\*" {{plan_path}}
```

---

## Common Fixes Needed

| Issue | Fix Pattern |
|-------|-------------|
| Missing Dependencies | Add `## Dependencies` with Upstream, Downstream, External Tools subsections |
| Missing VERIFY | Add `**VERIFY Phase N:**` after each phase's tasks |
| Vague file refs | Replace "the config file" with "src/config.ts" |
| Interactive prompts | Replace "ask user" with decision criteria/defaults |
| File conflicts | Add `**Execution Note:** Tasks X.Y-X.Z are [SEQUENTIAL] - reason` |
| Missing Priority | Add `- **Priority:** P0 | P1 | P2` to Overview |
| Missing Output | Add `- **Output:** docs/plan-outputs/{plan-name}/` to Overview |
| Subjective VERIFY | Change "works correctly" to specific test command |

---

## Checklist Completion

**Plan reviewed by:** ________________
**Date:** ________________

**Section 1 (Structure):** ___/6 complete
**Section 2 (Phases):** ___/___ phases verified
**Section 3 (Orchestration):** ___/5 categories complete

**Overall Status:** [ ] Compliant [ ] Needs fixes

**Notes:**
