# Implementation Plan: {{command_name}}

## Overview

- **Goal:** {{goal_description}}
- **Priority:** {{priority}} <!-- P0 (critical path) | P1 (important) | P2 (enhancement) -->
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/implement-{{command_name_kebab}}/`

## Description

{{detailed_description}}

---

## Dependencies

### Upstream
<!-- Commands/artifacts this plan consumes -->
- None | List upstream dependencies

### Downstream
<!-- Commands/artifacts that consume this plan's outputs -->
- None | List downstream consumers

### External Tools
<!-- External tools required (with versions if applicable) -->
- None | List tools (e.g., `redocly >= 1.0`, `ajv >= 8.0`)

---

## Phase 1: {{phase_1_title}}

**Objective:** {{phase_1_objective}}

**Tasks:**
- [ ] 1.1 {{task_description}}
- [ ] 1.2 {{task_description}}
- [ ] 1.3 {{task_description}}

**VERIFY Phase 1:**
- [ ] {{verification_criterion}}
- [ ] {{verification_criterion}}

---

## Phase 2: {{phase_2_title}}

**Objective:** {{phase_2_objective}}

**Tasks:**
- [ ] 2.1 {{task_description}}
- [ ] 2.2 {{task_description}}

**VERIFY Phase 2:**
- [ ] {{verification_criterion}}
- [ ] {{verification_criterion}}

---

## Phase 3: Sub-Command Implementation

**Objective:** Implement all sub-commands for the {{command_name}} command group.

### 3.1 {{command_name}}:{{subcommand_1}} - {{subcommand_description}}

**Tasks:**
- [ ] 3.1.1 Create command file at `.claude/commands/{{command_name}}/{{subcommand_1}}.md`
- [ ] 3.1.2 Implement core logic: {{core_logic_description}}
- [ ] 3.1.3 Add error handling and edge cases
- [ ] 3.1.4 Write help text and examples

**VERIFY 3.1:**
- [ ] Command executes successfully with valid input
- [ ] Error messages are clear and actionable
- [ ] Help text is complete

### 3.2 {{command_name}}:{{subcommand_2}} - {{subcommand_description}}

**Tasks:**
- [ ] 3.2.1 Create command file at `.claude/commands/{{command_name}}/{{subcommand_2}}.md`
- [ ] 3.2.2 Implement core logic: {{core_logic_description}}
- [ ] 3.2.3 Add error handling and edge cases

**VERIFY 3.2:**
- [ ] Command executes successfully
- [ ] Output artifacts match expected schema

---

## Phase 4: Artifact Generation

**Objective:** Implement artifact schemas and generation logic.

**Tasks:**
- [ ] 4.1 Define artifact schema for `{{artifact_type}}`
  ```yaml
  artifact_type: {{artifact_type}}
  version: "1.0"
  fields:
    - name: required
    - description: required
    # Add schema fields
  ```
- [ ] 4.2 Implement artifact generator
- [ ] 4.3 Add artifact validation

**VERIFY Phase 4:**
- [ ] Artifacts validate against defined schemas
- [ ] Generated artifacts are well-formed and complete

---

## Phase 5: Testing & Validation

**Objective:** Ensure all functionality is tested and validated.

**Tasks:**
- [ ] 5.1 Create unit tests for core functions
- [ ] 5.2 Create integration tests for command workflows
- [ ] 5.3 Test with real-world project scenarios
- [ ] 5.4 Validate error handling paths

**VERIFY Phase 5:**
- [ ] Test coverage > 85%
- [ ] All tests pass
- [ ] Edge cases are covered

---

## Phase 6: Documentation & Integration

**Objective:** Complete documentation and integrate with existing workflows.

**Tasks:**
- [ ] 6.1 Write user-facing documentation
- [ ] 6.2 Add command to help system
- [ ] 6.3 Update related commands to reference this one
- [ ] 6.4 Create usage examples

**VERIFY Phase 6:**
- [ ] Documentation is complete and accurate
- [ ] Help text displays correctly
- [ ] Integration points work as expected

---

## Success Criteria

### Functional Requirements
- [ ] All sub-commands execute correctly
- [ ] Artifacts are generated with correct schemas
- [ ] Error handling covers all expected failure modes
- [ ] Integration with upstream/downstream commands works

### Quality Requirements
- [ ] Code follows project conventions
- [ ] Test coverage > 85%
- [ ] No critical or high severity issues
- [ ] Performance meets targets (< {{performance_target}})

### Documentation Requirements
- [ ] User documentation complete
- [ ] Help text for all commands
- [ ] Examples provided for common use cases

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {{risk_description}} | High/Medium/Low | High/Medium/Low | {{mitigation_strategy}} |
| {{risk_description}} | High/Medium/Low | High/Medium/Low | {{mitigation_strategy}} |

---

## Notes

<!-- Optional section for additional context, decisions, or references -->

- {{note}}
- Related ADR: {{adr_reference}}

---

## Template Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{command_name}}` | Command group name | `explore`, `analyze` |
| `{{command_name_kebab}}` | Kebab-case version | `explore-command` |
| `{{priority}}` | P0, P1, or P2 | `P1` |
| `{{date}}` | Creation date (YYYY-MM-DD) | `2025-12-23` |
| `{{goal_description}}` | One-line goal | `Implement code exploration commands` |
| `{{phase_N_title}}` | Phase title | `Command Infrastructure` |
| `{{subcommand_N}}` | Sub-command name | `quick`, `deep` |
| `{{artifact_type}}` | Artifact type (kebab-case) | `exploration-report` |
| `{{performance_target}}` | Performance target | `30s for quick mode` |
