# Implementation Plan Standards

This document defines the authoritative standards for all implementation plans in `docs/plans/implement-*.md`. These standards ensure consistency, enable automation, and improve maintainability across the command library.

**Version:** 1.0
**Last Updated:** 2025-12-23
**Applies To:** All files in `docs/plans/implement-*.md`

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Priority Levels](#priority-levels)
3. [Quality Targets](#quality-targets)
4. [Plan Structure](#plan-structure)
5. [VERIFY Section Format](#verify-section-format)
6. [Artifact Standards](#artifact-standards)
7. [Severity Classifications](#severity-classifications)
8. [Model Selection Guidelines](#model-selection-guidelines)
9. [Performance Targets](#performance-targets)
10. [Decision Log (ADR) Template](#decision-log-adr-template)

---

## Naming Conventions

### Sub-Command Notation

**Standard:** Use colon notation for all sub-commands.

| Correct | Incorrect |
|---------|-----------|
| `/explore:quick` | `/explore quick` |
| `/analyze:security` | `/analyze-security` |
| `/test:unit` | `/test unit` |
| `/plan:implement` | `/plan implement` |

**Pattern:** `/{command}:{subcommand}`

**Examples:**
```
/explore:quick       # Quick codebase exploration
/explore:deep        # Deep exploration with analysis
/analyze:security    # Security-focused analysis
/analyze:performance # Performance analysis
/test:unit           # Run unit tests
/test:e2e            # Run end-to-end tests
/validate:types      # Type checking
/validate:lint       # Linting
```

### Model Identifiers

**Standard:** Use short-form model names only.

| Short Form | Full Model ID (Do Not Use) |
|------------|---------------------------|
| `opus` | `claude-opus-4-5-20251101` |
| `sonnet` | `claude-sonnet-4-20250514` |
| `haiku` | `claude-haiku-3-5-20241022` |

**Usage in plans:**
```markdown
**Model:** sonnet (default)
**Model:** opus (for complex reasoning tasks)
**Model:** haiku (for simple formatting tasks)
```

### Artifact Type Names

**Standard:** Use kebab-case for all artifact types.

| Correct (kebab-case) | Incorrect |
|---------------------|-----------|
| `validation-report` | `validation_report`, `validationReport` |
| `architecture-document` | `architecture_document` |
| `codebase-map` | `codebaseMap`, `codebase_map` |
| `requirements-spec` | `RequirementsSpec` |
| `test-results` | `test_results` |
| `exploration-report` | `ExplorationReport` |

**Artifact type registry:**
```
analysis-report       # Output from /analyze
architecture-document # Output from /architect
audit-report          # Output from /audit
codebase-map          # Output from /explore
component-spec        # Output from /design
exploration-report    # Output from /explore
implementation-plan   # Output from /plan
requirements-spec     # Output from /clarify
review-report         # Output from /review
test-results          # Output from /test
validation-report     # Output from /validate
```

### File and Directory Names

**Standard:** Use kebab-case for files and directories.

| Type | Pattern | Example |
|------|---------|---------|
| Plan files | `implement-{command}-command.md` | `implement-explore-command.md` |
| Output directories | `docs/plan-outputs/{plan-name}/` | `docs/plan-outputs/implement-explore-command/` |
| Artifact files | `{artifact-type}.{format}` | `validation-report.json` |
| Finding files | `{task-id}-{description}.md` | `1.1-analysis-results.md` |

### Command Group Names

**Standard:** Use lowercase, single-word names when possible.

| Correct | Incorrect |
|---------|-----------|
| `explore` | `Explore`, `EXPLORE` |
| `analyze` | `Analyze`, `code-analyze` |
| `validate` | `Validate`, `run-validation` |

---

## Priority Levels

### Definitions

| Priority | Name | Description | Implementation Order |
|----------|------|-------------|---------------------|
| **P0** | Critical Path | Foundation commands that other commands depend on. Must be implemented first. | Wave 1 |
| **P1** | Important | Core functionality commands. Required for primary workflows. | Wave 2-3 |
| **P2** | Enhancement | Nice-to-have features. Can be deferred without blocking other work. | Wave 4+ |

### Assignment Criteria

**P0 (Critical Path):**
- Commands that provide infrastructure used by other commands
- Artifact registry, error recovery, core hooks
- Commands with no upstream dependencies but many downstream consumers

**P1 (Important):**
- Core workflow commands (explore, analyze, test, validate)
- Commands that are frequently used in standard workflows
- Commands that produce artifacts consumed by P0 commands

**P2 (Enhancement):**
- Advanced features and optimizations
- Workflow automation and composition
- Specialized commands for niche use cases

### Priority Dependency Rules

1. A command's priority must be less than or equal to its dependencies
2. P0 commands cannot depend on P1 or P2 commands
3. P1 commands cannot depend on P2 commands
4. Document exceptions with rationale if rules must be broken

**Validation check:**
```
For each command C with dependencies D1, D2, ...:
  priority(C) >= max(priority(D1), priority(D2), ...)
```

---

## Quality Targets

### Test Coverage

| Target Type | Threshold | Notes |
|-------------|-----------|-------|
| **Standard** | > 85% | Default for all commands |
| **Critical** | > 95% | For P0 commands, security-related code |
| **Minimum** | > 70% | Acceptable only with documented rationale |

**Coverage reporting:**
```bash
# Unit test coverage
npm test -- --coverage

# Expected output format
File                   | % Stmts | % Branch | % Funcs | % Lines
-----------------------|---------|----------|---------|--------
websocket-connection   |   92.5  |   88.2   |   95.0  |   91.8
```

### Code Quality Gates

**Standard gate schema:**
```yaml
gates:
  critical: 0      # Zero critical issues allowed
  high: 5          # Maximum 5 high severity issues
  medium: 20       # Maximum 20 medium severity issues
  low: unlimited   # No limit on low severity issues
  coverage: 85     # Minimum test coverage percentage
```

**Gate enforcement:**
- All gates must pass before merging
- Document exceptions with ADR reference
- Review and tighten gates quarterly

### Performance Baselines

See [Performance Targets](#performance-targets) section for detailed categories.

---

## Plan Structure

### Required Sections

Every implementation plan MUST include these sections:

```markdown
# Implementation Plan: [Command Name]

## Overview
- **Goal:** [One-sentence goal]
- **Priority:** P0 | P1 | P2
- **Created:** YYYY-MM-DD
- **Output:** `docs/plan-outputs/implement-{command-name}/`

## Dependencies
### Upstream
- [Commands/artifacts this plan consumes]
### Downstream
- [Commands/artifacts that consume this plan's outputs]
### External Tools
- [External tools with versions]

## Phase 1: [Title]
**Objective:** [Phase objective]
- [ ] 1.1 [Task]
**VERIFY Phase 1:**
- [ ] [Verification criterion]

[Additional phases...]

## Success Criteria
### Functional Requirements
- [ ] [Criterion]
### Quality Requirements
- [ ] [Criterion]

## Risks
| Risk | Impact | Likelihood | Mitigation |
```

### Common Sections (Include When Relevant)

```markdown
## Description
[Detailed description beyond the one-line goal]

## Notes
- [Additional context]
- Related ADR: [ADR reference]
```

### Phase Structure

**Format:**
```markdown
## Phase N: [Descriptive Title]

**Objective:** [What this phase accomplishes]

**Tasks:**
- [ ] N.1 [Task description]
- [ ] N.2 [Task description]
  - [ ] N.2.1 [Subtask if needed]
  - [ ] N.2.2 [Subtask if needed]

**VERIFY Phase N:**
- [ ] [Specific, measurable verification criterion]
- [ ] [Another verification criterion]
```

**Numbering rules:**
- Phases: 0, 1, 2, 3... (Phase 0 for prerequisites)
- Tasks: N.1, N.2, N.3...
- Subtasks: N.M.1, N.M.2, N.M.3...

### Output Directory Convention

**Standard path:** `docs/plan-outputs/{plan-name}/`

**Directory structure:**
```
docs/plan-outputs/implement-{command-name}/
├── artifacts/           # Generated artifacts
│   ├── {artifact-type}.json
│   └── {artifact-type}.md
├── findings/            # Task findings and analysis
│   ├── {task-id}.md
│   └── {task-id}-{description}.md
├── verification/        # Verification results
│   └── phase-{n}-results.md
└── status.json          # Task status tracking
```

---

## VERIFY Section Format

### Standard Format

**Placement:** After each phase's tasks

**Format:**
```markdown
**VERIFY Phase N:**
- [ ] [Specific, testable criterion]
- [ ] [Another criterion with metric]
- [ ] [Third criterion]
```

### Writing Good Verification Criteria

**Do:**
- Make criteria specific and measurable
- Include success metrics where applicable
- Reference specific files or commands to verify

**Don't:**
- Use vague language ("works correctly")
- Skip verification for any phase
- Use inline verification (embed in tasks)

**Good examples:**
```markdown
**VERIFY Phase 1:**
- [ ] Registry file exists at `docs/.artifact-registry.json`
- [ ] Schema validates against JSON Schema Draft-07
- [ ] Query returns results in < 100ms for 1000 artifacts
- [ ] All CRUD operations have unit tests with > 90% coverage
```

**Bad examples:**
```markdown
**VERIFY:** Works correctly  ❌ (too vague)
**VERIFY 1:** Command runs   ❌ (not measurable)
```

---

## Artifact Standards

### Artifact Schema Reference

All artifacts MUST include these metadata fields:

```yaml
# Required metadata (in YAML frontmatter or JSON header)
artifact_type: string      # From artifact type registry
version: string            # Semantic version (1.0.0)
created_at: string         # ISO-8601 timestamp
created_by: string         # Model identifier (sonnet, opus)
command: string            # Producing command (/explore)
subcommand: string         # Producing sub-command (quick)
status: string             # draft | active | superseded | archived
```

### Optional Metadata

```yaml
# Optional fields
updated_at: string         # Last update timestamp
tags: string[]             # Classification tags
depends_on: string[]       # Upstream artifact IDs
consumed_by: string[]      # Downstream commands
project_context:
  project: string          # Project identifier
  feature: string          # Feature scope
  component: string        # Component scope
```

### Common Artifact Schemas

#### requirements-spec (from /clarify)
```json
{
  "artifact_type": "requirements-spec",
  "version": "1.0.0",
  "requirements": [
    {
      "id": "REQ-001",
      "type": "functional | non-functional | constraint",
      "priority": "must | should | could | wont",
      "description": "string",
      "acceptance_criteria": ["string"]
    }
  ]
}
```

#### validation-report (from /validate)
```json
{
  "artifact_type": "validation-report",
  "version": "1.0.0",
  "summary": {
    "passed": true,
    "total_checks": 10,
    "passed_checks": 10,
    "failed_checks": 0
  },
  "checks": [
    {
      "name": "type-check",
      "status": "passed | failed | skipped",
      "duration_ms": 1234,
      "details": {}
    }
  ]
}
```

#### analysis-report (from /analyze)
```json
{
  "artifact_type": "analysis-report",
  "version": "1.0.0",
  "analysis_type": "security | performance | quality | dependency",
  "findings": [
    {
      "id": "FIND-001",
      "severity": "critical | high | medium | low | info",
      "category": "string",
      "location": {
        "file": "string",
        "line": 0
      },
      "message": "string",
      "recommendation": "string"
    }
  ]
}
```

---

## Severity Classifications

### Standard Severity Levels

| Level | Name | Description | Response Time |
|-------|------|-------------|---------------|
| **critical** | Critical | System breaking issues, security vulnerabilities, data loss risk. Immediate action required to prevent catastrophic failure or security breach. | Immediate |
| **high** | High | Major functionality issues, significant performance problems. Blocks key features or causes severe degradation. | Same day |
| **medium** | Medium | Moderate issues, code quality concerns. Should be addressed soon but has workaround or limited impact. | Within sprint |
| **low** | Low | Minor issues, style/formatting concerns, suggestions. Cosmetic issues or minor inconveniences. | Backlog |
| **info** | Informational | Informational findings, no action required. Observations, suggestions, or context that may be useful. | Optional |

### Usage Guidelines

**Always use lowercase:** `critical`, not `Critical` or `CRITICAL`

**Severity assignment criteria:**

| Criteria | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security impact | Yes | Possible | No | No |
| Data loss risk | Yes | Possible | No | No |
| Blocks user | Yes | Yes | No | No |
| Workaround exists | No | No | Yes | Yes |
| Affects core flow | Yes | Yes | Maybe | No |

### Severity in Quality Gates

```yaml
gates:
  critical: 0      # Must be zero
  high: 5          # Maximum allowed
  medium: 20       # Maximum allowed
  low: unlimited   # No limit
```

---

## Model Selection Guidelines

### Default Model

**Use `sonnet` as the default model** for most tasks. It provides the best balance of capability, speed, and cost.

### When to Use Each Model

| Model | Use For | Examples |
|-------|---------|----------|
| **haiku** | Simple, fast tasks | Formatting, listing, simple parsing |
| **sonnet** | Standard tasks (default) | Code generation, analysis, documentation |
| **opus** | Complex reasoning | Architecture decisions, complex debugging, creative design |

### Selection Decision Tree

```
Is the task simple formatting or listing?
  → Yes: haiku
  → No: Continue

Does the task require complex multi-step reasoning?
  → Yes: opus
  → No: Continue

Does the task involve creative or architectural decisions?
  → Yes: opus
  → No: sonnet (default)
```

### Documenting Non-Default Choices

When using `opus` or `haiku`, add a brief inline rationale if the reason isn't obvious:

```markdown
**Model:** opus (complex architectural reasoning required)
**Model:** haiku (simple listing task)
```

For standard patterns, no rationale is needed:
```markdown
**Model:** sonnet  # Default - no comment needed
```

### Common Model Selection Patterns

| Task Type | Model | Examples |
|-----------|-------|----------|
| **Simple, Fast Tasks** | `haiku` | Listing files, simple parsing, status checks, basic formatting |
| **Standard Development** | `sonnet` | Code generation, documentation, analysis, testing, validation |
| **Complex Reasoning** | `opus` | Memory debugging, concurrency analysis, architectural design, creative brainstorming |
| **Data Integrity** | `opus` | Database migrations, data transformations, security fixes |
| **Performance Critical** | `haiku` | Context loading, artifact processing, notification hooks |

### Model Selection by Command Type

**Analysis & Quality:**
- `/analyze`, `/audit`, `/validate`, `/review` → `sonnet`
- `/debug` → `sonnet` (default), `opus` for memory/concurrency
- `/test` → `sonnet`

**Design & Architecture:**
- `/architect`, `/design`, `/spec`, `/model` → `sonnet`
- `/brainstorm` → `opus` (creative ideation)

**Implementation:**
- `/implement`, `/fix`, `/refactor` → `sonnet`
- `/fix:security` → `opus` (critical security fixes)
- `/fix:lint` → `haiku` (simple style fixes)

**Operations:**
- `/deploy`, `/release` → `sonnet`
- `/deploy:canary`, `/deploy:blue-green` → `opus` (complex strategies)
- `/deploy:status` → `haiku` (simple checks)

**Migration:**
- `/migrate:schema`, `/migrate:data` → `opus` (data integrity critical)
- `/migrate:config` → `sonnet`

**Documentation:**
- `/document`, `/explain` → `sonnet`

**Infrastructure & Hooks:**
- Context loading, artifact storage, notifications → `haiku`
- Error recovery → `sonnet`

### Best Practices

1. **Default to sonnet** - Handles 80% of tasks effectively
2. **Use haiku for speed** - Simple operations needing fast execution
3. **Reserve opus for critical/complex tasks** - Where advanced reasoning is necessary
4. **Don't over-specify** - No rationale needed for standard patterns
5. **Consider cost/performance** - Use smallest model that does the job well

---

## Performance Targets

### Performance Categories

| Category | Target | Description |
|----------|--------|-------------|
| **Quick** | < 30 seconds | Simple operations, single-file analysis |
| **Standard** | < 2 minutes | Typical operations, multi-file work |
| **Deep** | < 10 minutes | Comprehensive analysis, full codebase |
| **Extended** | < 30 minutes | Large-scale operations, batch processing |

### Sub-Command Performance Mapping

| Sub-Command Pattern | Category | Example |
|---------------------|----------|---------|
| `:quick`, `:fast` | Quick | `/explore:quick` |
| `:default`, `:standard` | Standard | `/analyze:default` |
| `:deep`, `:full`, `:comprehensive` | Deep | `/explore:deep` |
| `:batch`, `:all` | Extended | `/test:all` |

### Performance Documentation

Document performance targets in plans:

```markdown
### Performance Targets
| Sub-Command | Category | Target |
|-------------|----------|--------|
| explore:quick | Quick | < 30s |
| explore:deep | Deep | < 5min |
| explore:targeted | Standard | < 2min |
```

---

## Decision Log (ADR) Template

### When to Create an ADR

Create an Architectural Decision Record when:
- Choosing between multiple valid approaches
- Making decisions that affect multiple commands
- Establishing patterns for future development
- Overriding standards with documented exceptions

### ADR Template

```markdown
# ADR-NNN: [Decision Title]

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
[What is the issue that we're seeing that motivates this decision?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Drawback 1]
- [Drawback 2]

### Neutral
- [Observation 1]

## Alternatives Considered
1. [Alternative 1]: [Why rejected]
2. [Alternative 2]: [Why rejected]

## References
- [Related ADRs, issues, documents]
```

### ADR Naming Convention

**File path:** `docs/decisions/ADR-{NNN}-{short-title}.md`

**Examples:**
```
docs/decisions/ADR-001-use-json-for-artifacts.md
docs/decisions/ADR-002-colon-notation-for-subcommands.md
docs/decisions/ADR-003-severity-level-definitions.md
```

---

## Appendix: Quick Reference Card

### Naming At-a-Glance

| Element | Convention | Example |
|---------|------------|---------|
| Sub-commands | Colon notation | `/explore:quick` |
| Models | Short form | `sonnet`, `opus`, `haiku` |
| Artifacts | kebab-case | `validation-report` |
| Severity | lowercase | `critical`, `high` |
| Files | kebab-case | `implement-explore-command.md` |
| Directories | kebab-case | `plan-outputs/` |

### Priority Quick Guide

| P0 | P1 | P2 |
|----|----|----|
| Foundation | Core | Enhancement |
| No dependencies | Depends on P0 | Depends on P0/P1 |
| Implement first | Implement second | Implement last |

### Quality Quick Guide

| Metric | Standard | Critical |
|--------|----------|----------|
| Coverage | > 85% | > 95% |
| Critical issues | 0 | 0 |
| High issues | ≤ 5 | 0 |
| Performance | Standard | Quick |
