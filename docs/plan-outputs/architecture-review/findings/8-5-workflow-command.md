# /workflow Command Design Specification

**Task:** 8.5 Design `/workflow` command (workflow orchestration)
**Category:** Operations & Meta
**Priority:** CRITICAL
**Date:** 2025-12-20

---

## Executive Summary

The `/workflow` command enables **dynamic workflow orchestration** - chaining commands together into reusable, executable workflows. Unlike `/plan` which requires manual task execution, `/workflow` provides automated command sequencing with conditional branching, parallel execution, error handling, and artifact-based dependencies.

**Key Differentiator:** `/workflow` is a **meta-command** that orchestrates other slash commands, transforming static command sequences into intelligent, adaptive execution graphs. It's the automation layer that sits above individual commands.

**Core Philosophy:**
- **Dynamic graphs, not static pipelines:** Any artifact can feed any compatible command
- **Declarative definitions:** Define workflows in YAML, execute repeatedly
- **Artifact-driven:** Commands discover and consume artifacts automatically
- **Adaptive execution:** Conditional branching based on runtime results
- **Composition:** Workflows can include other workflows

**Relationship to /plan:**
- **Plan:** Manual, interactive task management with human-in-the-loop execution
- **Workflow:** Automated, unattended command orchestration with programmatic control

---

## Command Structure

### Primary Command: `/workflow`

**Base invocation** (without sub-command):
```
/workflow [workflow-name]
```

Discovers and executes a workflow definition from `.workflows/` directory.

### Sub-Commands

| Sub-command | Purpose | Output Artifact | Priority |
|-------------|---------|-----------------|----------|
| `workflow:create` | Create new workflow definition | `workflow.yaml` | P0 |
| `workflow:run` | Execute a workflow | `execution-log.md`, `workflow-state.json` | P0 |
| `workflow:list` | List available workflows | Console output | P0 |
| `workflow:status` | Check workflow execution status | `execution-status.md` | P0 |
| `workflow:visualize` | Generate workflow diagram | `workflow-diagram.md` (Mermaid) | P1 |
| `workflow:validate` | Validate workflow definition | Validation report | P1 |
| `workflow:resume` | Resume interrupted workflow | Updated execution logs | P2 |
| `workflow:template` | Create workflow from template | `workflow.yaml` | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/workflow.md`

```yaml
---
name: workflow
description: Orchestrate multi-command workflows with conditional logic, parallel execution, and artifact dependencies. Use for automating complex development sequences.
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion, Skill
argument-hint: [workflow-name]
category: meta
output_artifacts:
  - workflow.yaml
  - execution-log.md
  - workflow-state.json
---
```

---

## Model Configuration Rationale

**Model:** `sonnet` (Claude Sonnet 4.5)
- Sufficient for workflow orchestration logic
- Handles YAML parsing and validation
- Manages state tracking and decision-making
- Cost-effective for meta-command operations

**Consider Upgrade to Opus for:**
- Complex multi-branched workflows with intricate logic
- Large-scale workflows with 20+ steps
- Workflows requiring sophisticated error recovery strategies

**Allowed Tools:**
- `Read/Grep/Glob`: Discover workflow definitions, artifacts, and dependencies
- `Write`: Create workflow definitions and execution logs
- `Bash`: Execute verification commands
- `Skill`: **Critical** - Execute other slash commands as workflow steps
- `AskUserQuestion`: Resolve ambiguities in workflow definitions

---

## Workflow Definition Format

### workflow.yaml Schema

```yaml
name: feature-development-tdd
version: 1.0.0
description: TDD workflow for feature development

config:
  max_retries: 3
  timeout_minutes: 60
  parallel_limit: 5

inputs:
  - name: feature_name
    type: string
    required: true
  - name: test_framework
    type: string
    default: vitest

steps:
  - id: clarify
    name: Gather Requirements
    command: /clarify
    args: ${inputs.feature_name}
    outputs:
      requirements: docs/requirements/${inputs.feature_name}/requirements.json

  - id: test_design
    name: Design Test Cases
    command: /test:plan
    depends_on: [clarify]
    inputs:
      requirements: ${steps.clarify.outputs.requirements}

  - id: implement
    name: Implement Feature
    command: /implement:feature
    depends_on: [test_design]

  - id: review_and_docs
    type: parallel
    depends_on: [implement]
    steps:
      - id: code_review
        command: /review
      - id: generate_docs
        command: /document:feature

outputs:
  feature_code: ${steps.implement.outputs.source_code}
  documentation: ${steps.generate_docs.outputs.documentation}
```

### Workflow Patterns

#### 1. Sequential Pipeline
```yaml
steps:
  - id: step1
    command: /clarify
  - id: step2
    command: /design
    depends_on: [step1]
```

#### 2. Conditional Branching
```yaml
steps:
  - id: validate
    command: /validate
  - id: fix_on_error
    command: /fix
    depends_on: [validate]
    condition: ${steps.validate.exit_code != 0}
```

#### 3. Parallel Execution
```yaml
steps:
  - id: parallel_analysis
    type: parallel
    steps:
      - id: security_scan
        command: /analyze:security
      - id: performance_test
        command: /analyze:performance
```

#### 4. Loop/Retry Pattern
```yaml
steps:
  - id: improve_coverage
    command: /test:unit
    loop:
      while: ${steps.improve_coverage.outputs.coverage < 80}
      max_iterations: 5
```

---

## Output Artifacts

### execution-log.md Template

Includes execution summary, step timeline, workflow outputs, artifacts created, execution graph (Mermaid), and performance metrics.

### workflow-state.json Template

Contains workflow metadata, status, timing, inputs, step states, outputs, and metrics.

---

## Workflow Integration

### Workflow as Meta-Command

The `/workflow` command orchestrates other commands through the **Skill** tool:

```
For each step in workflow:
  1. Resolve dependencies (wait for depends_on steps)
  2. Evaluate conditions (skip if condition=false)
  3. Resolve input artifacts
  4. Execute command via Skill tool
  5. Capture outputs and update state
  6. Handle errors according to on_error policy
```

### Artifact Discovery Mechanism

Workflows use **path templates** for artifact discovery:
- Parse `${}` placeholders
- Substitute workflow inputs
- Substitute step outputs from state
- Verify artifact exists

---

## Example Usage Scenarios

### Example 1: TDD Workflow

```bash
$ /workflow:create tdd-feature
$ /workflow:run tdd-feature --input feature_name=payment-gateway

✅ clarify: Gathered requirements
✅ test_design: Created test plan
✅ implement:feature: Implemented payment-gateway
⚠️ test:run: 3 tests failed
🔄 fix: Fixed test failures
✅ test:run: All tests passed

Workflow completed in 34m 30s
```

### Example 2: Release Workflow

```bash
$ /workflow:run release-pipeline --input version=1.2.0

✅ test:run: All tests passed
✅ validate:security: No vulnerabilities
✅ release:prepare: Created release notes
✅ deploy:staging: Deployed to staging
⏸️ deploy:production: Waiting for manual approval...

$ /workflow:resume release-pipeline --approve

✅ deploy:production: Deployed v1.2.0 to production
```

---

## Differentiation from Related Commands

### vs `/plan`

| Aspect | /plan | /workflow |
|--------|-------|-----------|
| **Execution** | Manual, human-driven | Automated, unattended |
| **Control Flow** | Linear, sequential | Dynamic graph with branching |
| **State** | Task completion status | Full execution state + outputs |
| **Resumability** | Resume from any task | Resume from checkpoint |
| **Use Case** | Complex analysis projects | Repeatable automation |
| **Interactivity** | High | Low |

**When to use /plan:**
- Exploratory work with unknown scope
- Research requiring judgment
- Projects needing frequent human review

**When to use /workflow:**
- Repeatable processes (TDD, release, validation)
- CI/CD-like automation
- Parallel execution scenarios
- Conditional logic

---

## Workflow Templates

### Built-in Templates
1. **tdd-feature** - Test-driven development
2. **traditional-feature** - Design → implement → test
3. **exploratory-analysis** - Research and exploration
4. **release-pipeline** - Validation and deployment
5. **refactoring-workflow** - Safe refactoring with validation

---

## Priority Classification

### P0 (Must Have) - Core Workflow Engine
- `workflow:create`, `workflow:run`, `workflow:list`, `workflow:status`
- Basic YAML schema, sequential execution, dependencies, state persistence

### P1 (Should Have) - Advanced Control Flow
- `workflow:visualize`, `workflow:validate`
- Conditional branching, parallel execution, retry patterns

### P2 (Nice to Have) - Enterprise Features
- `workflow:resume`, `workflow:template`
- Manual approval gates, webhook integrations

---

**Phase 8 Task 8.5 Status: COMPLETE**
