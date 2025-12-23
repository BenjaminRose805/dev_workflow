# 9.10 Workflow Composition Patterns

**Task:** Analyze workflow composition (combining templates)
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Workflow composition enables building complex workflows from simpler building blocks. This analysis covers composition models, artifact handoff, scoping rules, and error handling across composition boundaries.

---

## 1. Composition Models

### Sequential Composition (Pipelines)
```yaml
steps:
  - id: discover
    type: workflow_ref
    workflow: discovery-clarification

  - id: design
    type: workflow_ref
    depends_on: [discover]
    workflow: design-architecture
    inputs:
      requirements: ${steps.discover.outputs.requirements}

  - id: implement
    type: workflow_ref
    depends_on: [design]
    workflow: tdd-implementation
    inputs:
      architecture: ${steps.design.outputs.architecture}
```

### Parallel Composition (Fan-Out)
```yaml
steps:
  - id: build
    command: /implement:build

  - id: parallel_validation
    type: parallel
    depends_on: [build]
    steps:
      - id: validate_types
        workflow: type-checking
      - id: validate_security
        workflow: security-scan
      - id: validate_performance
        workflow: performance-test
```

### Conditional Composition
```yaml
steps:
  - id: assess
    command: /analyze:scope

  - id: simple_path
    workflow: simple-release
    condition: ${steps.assess.scope == 'minor'}

  - id: full_path
    workflow: comprehensive-release
    condition: ${steps.assess.scope == 'major'}
```

### Loop Composition
```yaml
steps:
  - id: refinement_loop
    type: loop
    workflow: refinement-iteration
    loop_config:
      max_iterations: 5
      exit_condition: ${loop.quality_score >= 0.85}
```

### Nested Composition
```yaml
steps:
  - id: phase_1
    type: workflow_ref
    workflow: preparation

  - id: phase_2
    type: parallel
    depends_on: [phase_1]
    steps:
      - workflow: sub-workflow-a
      - workflow: sub-workflow-b
```

---

## 2. Artifact Handoff

### Explicit Binding
```yaml
# Producer workflow
outputs:
  - name: architecture
    type: architecture-design
    path: docs/artifacts/architecture.json

# Consumer step
inputs:
  architecture: ${steps.design.outputs.architecture}
```

### Artifact Transformation
```yaml
inputs:
  test_cases: ${transformations.requirements_to_test_cases(
    steps.clarify.outputs.requirements
  )}
```

### Shared Read-Only Artifacts
```yaml
# Multiple parallel branches read same artifact
steps:
  - id: parallel_validation
    type: parallel
    steps:
      - inputs:
          source: ${steps.build.outputs.source}  # Read-only
      - inputs:
          source: ${steps.build.outputs.source}  # Same reference
```

---

## 3. Scoping Rules

### Variable Scope Chain
```
Global Scope
  ├─ inputs, env, config
  │
  └─ Workflow Scope (Level 1)
      ├─ steps[*], outputs[*]
      │
      └─ Sub-workflow Scope (Level 2)
          ├─ Own inputs, steps, outputs
          └─ Can reference parent's outputs
```

### Scope Isolation
- Parallel workflows cannot reference each other's steps
- Only explicitly declared outputs cross boundaries
- Inner scope can shadow outer scope names

### Variable Shadowing
```yaml
# Global: version = "1.0.0"
steps:
  - id: phase1
    workflow: sub-workflow
    inputs:
      version: "1.1.0"  # Shadows global
      # Inside sub-workflow: ${inputs.version} = "1.1.0"
```

---

## 4. Error Handling

### Error Propagation
```
Sub-workflow error
    ↓
Captured by parent's depends_on
    ↓
Parent decides: stop, skip, or continue
    ↓
Error bubbles up to next level
```

### Error Boundaries

**Catch and Continue:**
```yaml
- id: optional_step
  workflow: optional-validation
  on_error: continue
```

**Catch and Fallback:**
```yaml
- id: primary
  workflow: primary-solution
  on_error: fallback

- id: fallback
  workflow: fallback-solution
  condition: ${steps.primary.failed}
```

**Catch and Recover:**
```yaml
- id: try_operation
  workflow: main-operation
  on_error: recover

- id: recovery
  workflow: recovery-steps
  condition: ${steps.try_operation.failed}
```

### Error Configuration
```yaml
error_handling:
  on_error_in_parallel: fail_fast | wait_for_all | partial
  on_error_in_sequential: stop | skip | continue
  on_error_in_loop: break | skip_iteration | retry
```

---

## 5. Example: Feature Development

```yaml
name: feature-complete

steps:
  - id: discovery
    workflow: feature-discovery

  - id: design
    workflow: feature-design
    depends_on: [discovery]
    inputs:
      requirements: ${steps.discovery.outputs.requirements}

  - id: implementation
    type: parallel
    depends_on: [design]
    steps:
      - id: implement
        workflow: tdd-implementation
      - id: document
        workflow: documentation-generation
      - id: prepare_deploy
        workflow: deployment-preparation

  - id: validation
    workflow: comprehensive-validation
    depends_on: [implementation]

  - id: release
    workflow: release-to-production
    depends_on: [validation]
    condition: ${steps.validation.outputs.all_passed}
```

---

## 6. Anti-Patterns

### Deep Nesting Without Structure
```yaml
# BAD: Unclear boundaries
workflow: level1 → level2 → level3 → level4

# GOOD: Grouped phases
workflow: feature-complete
  ├─ preparation-phase
  ├─ execution-phase
  └─ finalization-phase
```

### Implicit Dependencies
```yaml
# BAD: Unclear order
steps:
  - id: step_a
  - id: step_b
  - id: step_c

# GOOD: Explicit
steps:
  - id: step_a
  - id: step_b
    depends_on: [step_a]
  - id: step_c
    depends_on: [step_b]
```

### Crossing Scope Boundaries
```yaml
# BAD: Accessing inner workflow's step
inputs:
  data: ${steps.outer.steps.inner.outputs}

# GOOD: Use declared outputs
inputs:
  data: ${steps.outer.outputs.final_result}
```

---

## 7. Implementation Priority

### P0 (Foundation)
- Sequential composition
- Basic parallel execution
- Explicit input/output binding
- Simple error propagation

### P1 (Control Flow)
- Conditional branching
- Loop constructs
- Nested workflows
- Error recovery patterns

### P2 (Safety)
- Scope isolation enforcement
- Artifact compatibility checking
- Composition visualization
- Cross-boundary error handling

### P3 (Production)
- Resume from checkpoints
- Branch-aware state tracking
- Monitoring and alerting
