# 9.8 Fan-Out Patterns

**Task:** Analyze fan-out patterns (single output → multiple commands)
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Fan-out patterns enable a single artifact or command output to trigger multiple downstream commands in parallel or sequence. Unlike sequential pipelines, fan-out patterns address the challenge of coordinating dependent tasks when one output feeds many consumers. This analysis identifies five core patterns, coordination mechanisms, failure handling strategies, and routing patterns for both broadcast and selective routing scenarios.

---

## 1. Fan-Out Decision Framework

### When to Use Fan-Out

**Explosive Growth Scenarios:**
- Architecture decision → parallel component implementations
- Requirements document → parallel design, test planning, documentation
- Code change → parallel validation (lint, test, security, performance)
- Release artifact → parallel deployments to multiple environments
- Feature specification → parallel API design, UI design, database schema

**Key Indicators:**
- Single output serves multiple independent consumers
- Downstream tasks are parallelizable (no inter-consumer dependencies)
- Timing optimization benefits (run analysis in parallel vs. sequence)
- Resource isolation (each task gets independent workspace)

### When NOT to Use Fan-Out

- **Sequential dependencies:** Output of task A required as input to task B
- **Resource constraints:** Limited concurrent execution capacity
- **High coordination overhead:** More than 7-8 parallel branches
- **Shared state mutation:** Tasks writing to same artifact or resource
- **Human review gates:** Initial approval before splitting downstream work

---

## 2. Core Fan-Out Patterns

### Pattern 1: Simple Broadcast (One-to-Many)

Simplest pattern: single output triggers identical or nearly-identical operations on different inputs.

```yaml
# Example: Code change → validate on multiple test frameworks
- id: code_change
  command: /implement:feature
  outputs:
    source: src/components/Button.ts

# Fan-out: Test against multiple frameworks
- id: test_vitest
  command: /test:unit
  inputs:
    source: ${steps.code_change.outputs.source}
    framework: vitest
  depends_on: [code_change]

- id: test_jest
  command: /test:unit
  inputs:
    source: ${steps.code_change.outputs.source}
    framework: jest
  depends_on: [code_change]

- id: test_mocha
  command: /test:unit
  inputs:
    source: ${steps.code_change.outputs.source}
    framework: mocha
  depends_on: [code_change]

# Synchronization point
- id: aggregate_test_results
  command: /analyze:aggregate
  inputs:
    results: [
      ${steps.test_vitest.outputs.report},
      ${steps.test_jest.outputs.report},
      ${steps.test_mocha.outputs.report}
    ]
  depends_on: [test_vitest, test_jest, test_mocha]
```

**Characteristics:**
- All branches execute same command type
- Each receives different input/parameter variation
- No inter-branch communication
- Trivial to coordinate (wait for all branches)

### Pattern 2: Specialized Analysis (Content-Based Routing)

Single artifact triggers different analysis commands based on its content or properties.

```yaml
- id: code_submission
  command: /implement:feature
  outputs:
    code: src/payment/processor.ts
    metadata:
      type: security-critical
      complexity: high

# Content-based routing: multiple analyses
- id: security_scan
  command: /analyze:security
  inputs:
    source: ${steps.code_submission.outputs.code}
  depends_on: [code_submission]
  condition: ${contains(steps.code_submission.outputs.metadata.type, 'security')}

- id: performance_profile
  command: /analyze:performance
  inputs:
    source: ${steps.code_submission.outputs.code}
  depends_on: [code_submission]
  condition: ${steps.code_submission.outputs.metadata.complexity == 'high'}

- id: complexity_analysis
  command: /analyze:complexity
  inputs:
    source: ${steps.code_submission.outputs.code}
  depends_on: [code_submission]

- id: code_review
  command: /review:quality
  inputs:
    source: ${steps.code_submission.outputs.code}
  depends_on: [code_submission]

# Merge results from conditional branches
- id: consolidated_analysis
  command: /analyze:aggregate
  inputs:
    reports: [
      ${steps.security_scan.outputs.report},
      ${steps.performance_profile.outputs.report},
      ${steps.complexity_analysis.outputs.report},
      ${steps.code_review.outputs.report}
    ]
  depends_on: [security_scan, performance_profile, complexity_analysis, code_review]
```

**Characteristics:**
- Different commands triggered by content/properties
- Some branches may be conditional (skipped based on metadata)
- Asymmetric outputs (different report types)
- Requires content analysis before fan-out

### Pattern 3: Parallel Stages (Pyramid Model)

Single output fans out to N parallel stages, each stage fans in results, then continues.

```yaml
# Stage 1: Single input
- id: requirements
  command: /clarify:gather
  outputs:
    spec: docs/requirements.md

# Stage 2: Fan-out to parallel design branches
- id: api_design
  command: /design:api
  depends_on: [requirements]
  inputs:
    spec: ${steps.requirements.outputs.spec}

- id: ui_design
  command: /design:ui
  depends_on: [requirements]
  inputs:
    spec: ${steps.requirements.outputs.spec}

- id: database_design
  command: /design:schema
  depends_on: [requirements]
  inputs:
    spec: ${steps.requirements.outputs.spec}

# Stage 3: Fan-in results, continue serial
- id: design_review
  command: /review:design
  depends_on: [api_design, ui_design, database_design]
  inputs:
    api_spec: ${steps.api_design.outputs.spec}
    ui_spec: ${steps.ui_design.outputs.spec}
    db_spec: ${steps.database_design.outputs.spec}

# Stage 4: Fan-out to implementations
- id: implement_api
  command: /implement:api
  depends_on: [design_review]
  inputs:
    spec: ${steps.api_design.outputs.spec}

- id: implement_ui
  command: /implement:ui
  depends_on: [design_review]
  inputs:
    spec: ${steps.ui_design.outputs.spec}

- id: implement_db
  command: /implement:migration
  depends_on: [design_review]
  inputs:
    spec: ${steps.database_design.outputs.spec}

# Stage 5: Final fan-in
- id: integration_test
  command: /test:integration
  depends_on: [implement_api, implement_ui, implement_db]
```

**Characteristics:**
- Alternating fan-out and fan-in stages
- Natural pyramid shape: 1 → N → 1 → N → 1
- Used for feature development, system design
- High synchronization overhead at fan-in points

### Pattern 4: Selective Routing (Conditional Fan-Out)

Route output to specific downstream commands based on predicates.

```yaml
- id: validate_submission
  command: /validate:schema
  outputs:
    is_valid: true/false
    submission_type: form/api/batch
    severity: low/medium/high

# Conditional routing based on validation result
- id: process_valid
  command: /implement:process
  depends_on: [validate_submission]
  condition: ${steps.validate_submission.outputs.is_valid == true}

- id: process_invalid_low
  command: /fix:schema
  depends_on: [validate_submission]
  condition: ${steps.validate_submission.outputs.is_valid == false && steps.validate_submission.outputs.severity == 'low'}

- id: process_invalid_critical
  type: gate
  depends_on: [validate_submission]
  gate_config:
    question: "Critical validation error. Approve manual review?"
    required_approvers: 1
  condition: ${steps.validate_submission.outputs.is_valid == false && steps.validate_submission.outputs.severity == 'high'}

- id: notify_rejection
  command: /document:report
  depends_on: [validate_submission]
  condition: ${steps.validate_submission.outputs.is_valid == false && steps.validate_submission.outputs.severity == 'high'}
```

**Characteristics:**
- Mutually exclusive branches (OR routing)
- Condition determines which branch executes
- Typically 2-5 branches (more = unclear logic)
- Used for error handling and classification

### Pattern 5: Multiplicative Fan-Out (Cartesian Product)

Single input produces multiple outputs, which cross-multiply to produce N² branches.

```yaml
- id: requirements
  command: /clarify:gather
  outputs:
    feature_spec: docs/spec.md
    frameworks: [react, vue, angular]
    browsers: [chrome, firefox, safari]

# Cross-multiplication: 3 frameworks × 3 browsers = 9 test matrices
# This is typically anti-pattern but documented for completeness

# Pattern: Instead use nested loops with dynamic task generation
- id: generate_test_matrix
  command: /analyze:matrix
  inputs:
    frameworks: ${steps.requirements.outputs.frameworks}
    browsers: ${steps.requirements.outputs.browsers}
  outputs:
    test_configs: configs/test-matrix.json

# Then fan-out to generated tasks (implicitly via matrix)
- id: run_tests
  type: matrix
  matrix:
    framework: ${steps.requirements.outputs.frameworks}
    browser: ${steps.requirements.outputs.browsers}
  command: /test:e2e
  inputs:
    framework: ${matrix.framework}
    browser: ${matrix.browser}
  depends_on: [requirements]

# Fan-in to aggregate
- id: aggregate_results
  command: /analyze:aggregate
  depends_on: [run_tests]
  inputs:
    results: ${steps.run_tests.outputs[*].report}
```

**Characteristics:**
- Combinatorial explosion (N × M tasks)
- Useful for test matrix configurations
- Typically generated dynamically, not static
- Requires matrix execution support in workflow engine

---

## 3. Output Coordination Mechanisms

### Single Source of Truth Pattern

All downstream tasks consume from same artifact location.

```yaml
- id: architecture_decision
  command: /architect
  outputs:
    design_doc: docs/architecture/decision.md
    design_metadata:
      version: 1.0
      modified_at: 2025-12-20T10:00:00Z
      hash: abc123def456

# All downstream tasks reference same location
- id: api_design
  command: /design:api
  inputs:
    arch_doc: ${steps.architecture_decision.outputs.design_doc}
  depends_on: [architecture_decision]

- id: security_design
  command: /design:security
  inputs:
    arch_doc: ${steps.architecture_decision.outputs.design_doc}
  depends_on: [architecture_decision]

- id: test_plan
  command: /test:plan
  inputs:
    arch_doc: ${steps.architecture_decision.outputs.design_doc}
  depends_on: [architecture_decision]
```

**Advantages:**
- No duplication
- Changes automatically propagate
- Single version of truth

**Disadvantages:**
- Mutation causes cascading updates
- No snapshot semantics
- Coordination complexity if output updates during fan-out

### Snapshot/Copy Pattern

Each downstream task receives immutable copy of source artifact.

```yaml
- id: release_artifact
  command: /release:prepare
  outputs:
    tarball: dist/app-v1.2.0.tar.gz
    manifest: dist/manifest.json

# Create snapshots for each deployment environment
- id: snapshot_staging
  command: /implement:copy
  inputs:
    source: ${steps.release_artifact.outputs.tarball}
    destination: staging/artifacts/app-v1.2.0.tar.gz
  depends_on: [release_artifact]

- id: snapshot_prod
  command: /implement:copy
  inputs:
    source: ${steps.release_artifact.outputs.tarball}
    destination: production/artifacts/app-v1.2.0.tar.gz
  depends_on: [release_artifact]

# Each deployment works with snapshot
- id: deploy_staging
  command: /deploy:app
  inputs:
    artifact: staging/artifacts/app-v1.2.0.tar.gz
  depends_on: [snapshot_staging]

- id: deploy_prod
  command: /deploy:app
  inputs:
    artifact: production/artifacts/app-v1.2.0.tar.gz
  depends_on: [snapshot_prod]
```

**Advantages:**
- Immutable from consumer perspective
- Isolates concurrent modifications
- Snapshot captures exact state at fan-out time

**Disadvantages:**
- Storage overhead
- Eventual consistency issues (updates don't propagate)

### Artifact Versioning Pattern

Track multiple versions, each downstream consumer picks specific version.

```yaml
- id: generate_docs
  command: /document:generate
  outputs:
    docs_v1: docs/v1/api.md
    version: 1
    timestamp: 2025-12-20T10:00:00Z

# Downstream consumers specify version they want
- id: publish_main_docs
  command: /deploy:docs
  inputs:
    docs: ${steps.generate_docs.outputs.docs_v1}
    version: v1
  depends_on: [generate_docs]

- id: archive_version
  command: /implement:copy
  inputs:
    source: ${steps.generate_docs.outputs.docs_v1}
    destination: archive/api-docs-v1.md
  depends_on: [generate_docs]

# Future: New version generated without affecting current deployments
- id: generate_docs_v2
  command: /document:generate
  outputs:
    docs_v2: docs/v2/api.md
    version: 2
```

**Advantages:**
- Multiple versions coexist
- Consumers can pin versions
- Backward compatibility maintained

**Disadvantages:**
- Version management complexity
- Storage overhead

---

## 4. Parallel Coordination Patterns

### Waiting Strategy: Promise.all Semantics

All branches must succeed before proceeding.

```yaml
config:
  fan_out_strategy: all_succeed
  timeout_minutes: 30

steps:
  - id: code_validation
    type: parallel
    depends_on: [implement]
    steps:
      - id: lint
        command: /validate:lint
      - id: type_check
        command: /validate:types
      - id: unit_tests
        command: /test:unit
      - id: security_scan
        command: /analyze:security

  - id: proceed_to_merge
    command: /implement:merge
    depends_on: [code_validation]
    condition: ${steps.code_validation.all_succeeded}
```

**State:**
- `all_succeeded`: All parallel tasks succeeded
- `any_failed`: At least one task failed
- `any_timeout`: At least one task timed out
- `partial`: Mix of success and skipped

### Waiting Strategy: Promise.allSettled Semantics

Continue regardless of individual failures, but track results.

```yaml
- id: multi_environment_deploy
  type: parallel
  strategy: allSettled
  depends_on: [release]
  steps:
    - id: deploy_us_east
      command: /deploy:region
      args:
        region: us-east-1

    - id: deploy_eu_west
      command: /deploy:region
      args:
        region: eu-west-1

    - id: deploy_ap_south
      command: /deploy:region
      args:
        region: ap-south-1

# Report on all results
- id: deployment_report
  command: /document:report
  depends_on: [multi_environment_deploy]
  inputs:
    us_east_status: ${steps.deploy_us_east.status}
    eu_west_status: ${steps.deploy_eu_west.status}
    ap_south_status: ${steps.deploy_ap_south.status}
```

**State Variables:**
- `${steps.{step_id}.status}` - success/failed/timeout
- `${steps.{step_id}.error}` - Error message (if failed)
- `${steps.{step_id}.duration_ms}` - Execution time
- `${steps.{step_id}.output}` - Command output (if succeeded)

### Waiting Strategy: Quorum/Majority

Proceed if minimum number of branches succeed.

```yaml
- id: distributed_tests
  type: parallel
  strategy: quorum
  quorum_size: 2  # At least 2 of 3 must succeed
  steps:
    - id: test_cluster_1
      command: /test:run
      args:
        suite: cluster-1

    - id: test_cluster_2
      command: /test:run
      args:
        suite: cluster-2

    - id: test_cluster_3
      command: /test:run
      args:
        suite: cluster-3

- id: release_if_quorum_met
  command: /release:publish
  depends_on: [distributed_tests]
  condition: ${steps.distributed_tests.quorum_met}
```

---

## 5. Partial Success & Failure Handling

### Strategy 1: Fail-Fast on Critical Task

Stop workflow if critical branch fails.

```yaml
- id: parallel_validation
  type: parallel
  depends_on: [code_change]
  steps:
    - id: critical_security_scan
      command: /analyze:security
      critical: true

    - id: optional_style_check
      command: /validate:style
      critical: false

- id: proceed
  command: /implement:merge
  depends_on: [parallel_validation]
  condition: ${!steps.critical_security_scan.failed}
```

**Configuration:**
```yaml
branch_config:
  critical_security_scan:
    critical: true
    on_failure: abort_workflow
  optional_style_check:
    critical: false
    on_failure: log_warning
```

### Strategy 2: Partial Results with Threshold

Require minimum success rate.

```yaml
- id: multi_agent_analysis
  type: parallel
  strategy: partial_success
  min_success_rate: 0.75  # 75% of branches must succeed
  steps:
    - id: agent_1
      command: /analyze:pattern
      args:
        agent_id: agent-1
    - id: agent_2
      command: /analyze:pattern
      args:
        agent_id: agent-2
    - id: agent_3
      command: /analyze:pattern
      args:
        agent_id: agent-3
    - id: agent_4
      command: /analyze:pattern
      args:
        agent_id: agent-4

- id: aggregate_if_threshold_met
  command: /analyze:aggregate
  depends_on: [multi_agent_analysis]
  condition: ${steps.multi_agent_analysis.success_rate >= 0.75}
  inputs:
    results: ${steps.multi_agent_analysis.outputs[*].result}
    failure_count: ${steps.multi_agent_analysis.failed_count}
```

### Strategy 3: Retry Failed Branches

Automatically retry failed branches before proceeding.

```yaml
- id: parallel_tests
  type: parallel
  strategy: retry_failed
  max_retries: 3
  backoff:
    strategy: exponential
    initial_delay_ms: 1000
    multiplier: 2.0
  depends_on: [code_change]
  steps:
    - id: test_suite_1
      command: /test:unit
    - id: test_suite_2
      command: /test:integration
    - id: test_suite_3
      command: /test:e2e

- id: proceed_if_all_pass
  command: /implement:merge
  depends_on: [parallel_tests]
  condition: ${steps.parallel_tests.all_succeeded}
```

**Retry State:**
```yaml
# For each branch:
${steps.parallel_tests.retry_count}    # Number of retries attempted
${steps.parallel_tests.final_status}   # success/failed/timeout
${steps.parallel_tests.failures}       # Array of failure reasons
```

### Strategy 4: Canary with Fallback

Run limited set of branches first, then full fan-out if successful.

```yaml
# Phase 1: Canary deployment to 1 region
- id: deploy_canary
  command: /deploy:region
  args:
    region: us-east-1
    canary_percentage: 10

# Check metrics before expanding
- id: check_canary_health
  type: gate
  gate_config:
    question: "Canary healthy? Proceed with full deployment?"
    timeout_minutes: 15

# Phase 2: Full fan-out to all regions
- id: deploy_all_regions
  type: parallel
  depends_on: [check_canary_health]
  condition: ${steps.check_canary_health.approved}
  steps:
    - id: deploy_us_west
      command: /deploy:region
      args:
        region: us-west-1
    - id: deploy_eu_west
      command: /deploy:region
      args:
        region: eu-west-1
    - id: deploy_ap_south
      command: /deploy:region
      args:
        region: ap-south-1
```

### Strategy 5: Aggregation with Error Collection

Collect all errors and proceed with partial results.

```yaml
- id: test_all_frameworks
  type: parallel
  strategy: collect_errors
  depends_on: [implement]
  steps:
    - id: test_react
      command: /test:unit
      args:
        framework: react
    - id: test_vue
      command: /test:unit
      args:
        framework: vue
    - id: test_angular
      command: /test:unit
      args:
        framework: angular

- id: report_with_failures
  command: /document:report
  depends_on: [test_all_frameworks]
  inputs:
    successful_tests: ${steps.test_all_frameworks.successful_outputs[*]}
    failed_tests: ${steps.test_all_frameworks.failed_outputs[*]}
    error_summary: ${steps.test_all_frameworks.error_summary}
    success_rate: ${steps.test_all_frameworks.success_rate}
```

---

## 6. Broadcast vs. Selective Routing

### Broadcast Pattern (One-to-All)

Single output triggers same operation on all instances/configurations.

**Use Cases:**
- Deploy to all servers in cluster
- Run tests on all supported frameworks
- Apply security patches to all dependencies

```yaml
# Configuration: Define targets once
available_targets:
  browsers: [chrome, firefox, safari, edge]
  servers: [web-1, web-2, web-3, web-4]
  python_versions: [3.8, 3.9, 3.10, 3.11]

- id: compile_app
  command: /implement:build

# Broadcast to all browsers
- id: test_all_browsers
  type: parallel
  broadcast:
    targets: ${config.available_targets.browsers}
  command: /test:e2e
  args:
    browser: ${broadcast.target}
  depends_on: [compile_app]

# Broadcast to all servers
- id: deploy_all_servers
  type: parallel
  broadcast:
    targets: ${config.available_targets.servers}
  command: /deploy:server
  args:
    server: ${broadcast.target}
  depends_on: [compile_app]
```

### Selective Routing Pattern (Conditional Distribution)

Route output to specific downstream commands based on conditions.

```yaml
- id: analyze_code
  command: /analyze:quality
  outputs:
    has_security_issues: true/false
    complexity_score: 0-100
    type: frontend/backend/shared

# Selective routing based on analysis results
- id: security_review
  command: /review:security
  depends_on: [analyze_code]
  condition: ${steps.analyze_code.outputs.has_security_issues}

- id: refactor_complex
  command: /refactor
  depends_on: [analyze_code]
  condition: ${steps.analyze_code.outputs.complexity_score > 75}

- id: deploy_frontend
  command: /deploy:frontend
  depends_on: [analyze_code]
  condition: ${contains(steps.analyze_code.outputs.type, 'frontend')}

- id: deploy_backend
  command: /deploy:backend
  depends_on: [analyze_code]
  condition: ${contains(steps.analyze_code.outputs.type, 'backend')}
```

**Routing Formula:**
```
For each downstream task:
  1. Evaluate condition expression
  2. If TRUE: execute task
  3. If FALSE: skip task (mark as skipped, not failed)
```

### Fan-Out Topology Patterns

**Star Topology (Hub-and-Spoke):**
- Single source fans out to multiple destinations
- Simple, common pattern
- Single point of failure at hub

```
        ├─→ Task 1
Source ─┼─→ Task 2
        ├─→ Task 3
        └─→ Task 4
```

**Tree Topology:**
- Hierarchical fan-out (stages of fan-out)
- Reduces coordination complexity
- Fan-in required at each level

```
         ├─→ Task 1.1 ─┐
Source ─┤─→ Task 1.2 ─┤─→ Aggregator 1
         │             ┘
         ├─→ Task 2.1 ─┐
         ├─→ Task 2.2 ─┤─→ Aggregator 2
         │             ┘
         └─→ Task 3
```

**Mesh Topology:**
- Multiple sources and destinations
- Complex routing logic
- Difficult to reason about
- Generally avoid

```
Source 1 ─┐  ┌─→ Dest 1
Source 2 ─┼→─┤─→ Dest 2
Source 3 ─┘  └─→ Dest 3
```

---

## 7. Artifact Propagation in Fan-Out

### Inheritance vs. Copying vs. Linking

**Option 1: Shared Reference (Inheritance)**
```yaml
# All branches reference same artifact
- id: source
  outputs:
    artifact: src/core.ts

- id: branch_1
  inputs:
    shared: ${steps.source.outputs.artifact}  # Points to same file

- id: branch_2
  inputs:
    shared: ${steps.source.outputs.artifact}  # Points to same file
```

**Option 2: Explicit Copy (Isolation)**
```yaml
- id: source
  outputs:
    artifact: src/core.ts

- id: branch_1_copy
  command: /implement:copy
  inputs:
    source: ${steps.source.outputs.artifact}
    destination: workspace/branch-1/core.ts

- id: branch_1_work
  inputs:
    artifact: workspace/branch-1/core.ts
```

**Option 3: Symlink/Reference (Hybrid)**
```yaml
# Create lightweight references
- id: create_references
  command: /implement:link
  inputs:
    source: ${steps.source.outputs.artifact}
    links:
      - workspace/branch-1/core.ts
      - workspace/branch-2/core.ts
      - workspace/branch-3/core.ts
```

**Comparison Table:**

| Approach | Memory | Isolation | Consistency | Complexity |
|----------|--------|-----------|-------------|-----------|
| Shared Reference | Low | None | High (mutations visible to all) | Low |
| Copy | High | High | None (stale copies) | High |
| Symlink | Low | Medium | Medium | Medium |

---

## 8. Fan-Out with Result Aggregation

### Pattern: Collect, Transform, Report

```yaml
- id: analyze_patterns
  type: parallel
  depends_on: [codebase_scan]
  steps:
    - id: pattern_agent_1
      command: /analyze:patterns
      args:
        agent: agent-1
        files: files[0:100]

    - id: pattern_agent_2
      command: /analyze:patterns
      args:
        agent: agent-2
        files: files[100:200]

    - id: pattern_agent_3
      command: /analyze:patterns
      args:
        agent: agent-3
        files: files[200:300]

# Aggregation step 1: Collect
- id: collect_results
  command: /analyze:merge
  depends_on: [analyze_patterns]
  inputs:
    result_1: ${steps.pattern_agent_1.outputs.patterns}
    result_2: ${steps.pattern_agent_2.outputs.patterns}
    result_3: ${steps.pattern_agent_3.outputs.patterns}
  outputs:
    merged: docs/merged-patterns.json

# Aggregation step 2: Transform
- id: deduplicate
  command: /analyze:deduplicate
  depends_on: [collect_results]
  inputs:
    patterns: ${steps.collect_results.outputs.merged}
  outputs:
    unique: docs/unique-patterns.json

# Aggregation step 3: Report
- id: generate_report
  command: /document:generate
  depends_on: [deduplicate]
  inputs:
    patterns: ${steps.deduplicate.outputs.unique}
    threshold: 0.4
  outputs:
    report: docs/pattern-report.md
```

### Aggregation Functions

```yaml
# Built-in aggregation functions
aggregation_functions:
  merge:           # Union of results
  intersect:       # Common results only
  deduplicate:     # Remove duplicates
  frequency:       # Count occurrences
  vote:            # Majority vote
  average:         # Calculate mean
  weighted_sum:    # Weighted sum
```

---

## 9. State Synchronization for Fan-In

### Checkpoint-Based Synchronization

```yaml
- id: parallel_work
  type: parallel
  steps:
    - id: feature_a
      command: /implement:feature
      outputs:
        checkpoint: checkpoints/feature-a.json

    - id: feature_b
      command: /implement:feature
      outputs:
        checkpoint: checkpoints/feature-b.json

# Synchronization point
- id: merge_checkpoints
  command: /implement:merge
  depends_on: [feature_a, feature_b]
  inputs:
    checkpoint_a: ${steps.feature_a.outputs.checkpoint}
    checkpoint_b: ${steps.feature_b.outputs.checkpoint}
  outputs:
    merged_checkpoint: checkpoints/merged.json
```

### State Machine Approach

```yaml
- id: parallel_analysis
  type: parallel
  depends_on: [validate]
  steps:
    - id: analyze_a
      command: /analyze
      args:
        scope: module-a
      outputs:
        state: {status: analyzed, timestamp, results}

    - id: analyze_b
      command: /analyze
      args:
        scope: module-b
      outputs:
        state: {status: analyzed, timestamp, results}

# Combine states
- id: combine_states
  command: /analyze:merge
  depends_on: [analyze_a, analyze_b]
  on_execute: |
    states = [analyze_a.state, analyze_b.state]
    combined = merge_states(states)
    return {
      status: combined.all_analyzed ? "ready" : "pending",
      timestamp: max(states.timestamp),
      results: union(states.results)
    }
```

---

## 10. Implementation Recommendations

### P0 (Must Have) - Core Fan-Out

| Feature | Complexity | Impact |
|---------|-----------|--------|
| Simple broadcast | Low | Critical (most common use case) |
| Parallel execution | Medium | Critical |
| Promise.all semantics | Low | Critical |
| Basic error handling | Medium | Critical |
| Result aggregation | Medium | High |

**Example Implementation:**
```yaml
config:
  max_parallel: 5
  timeout_minutes: 30

steps:
  - id: main
    command: /implementation
    outputs:
      result: output.json

  - id: fan_out
    type: parallel
    depends_on: [main]
    steps:
      - id: task_1
        command: /validate
        inputs:
          data: ${steps.main.outputs.result}
      - id: task_2
        command: /analyze
        inputs:
          data: ${steps.main.outputs.result}
      - id: task_3
        command: /test
        inputs:
          data: ${steps.main.outputs.result}

  - id: fan_in
    command: /aggregate
    depends_on: [fan_out]
```

### P1 (Should Have) - Advanced Fan-Out

| Feature | Complexity | Impact |
|---------|-----------|--------|
| Selective routing | Medium | High (flexible workflows) |
| Partial success strategies | High | High |
| Retry on failure | Medium | High |
| Quorum semantics | Medium | Medium |
| Conditional branches | Low | High |

### P2 (Nice to Have) - Enterprise Fan-Out

| Feature | Complexity | Impact |
|---------|-----------|--------|
| Matrix execution | High | Low (niche use case) |
| Weighted aggregation | High | Low |
| Dynamic fan-out | High | Low |
| Canary patterns | High | Medium |
| Circuit breaker | Medium | Medium |

---

## 11. Common Fan-Out Scenarios

### Scenario 1: Code Change → Multi-Framework Test

```yaml
- id: implement_feature
  command: /implement:feature
  outputs:
    code: src/core.ts

- id: test_all_frameworks
  type: parallel
  depends_on: [implement_feature]
  broadcast:
    frameworks: [jest, mocha, vitest]
  command: /test:unit
  args:
    framework: ${broadcast.framework}
  inputs:
    source: ${steps.implement_feature.outputs.code}

- id: collect_test_results
  command: /analyze:aggregate
  depends_on: [test_all_frameworks]
  inputs:
    results: ${steps.test_all_frameworks.outputs[*].report}
```

**Expected Execution Time:** Sequential (3 × T) vs. Parallel (T + overhead)
**Typical Speedup:** 2.5x-2.8x

### Scenario 2: Release → Parallel Environment Deployment

```yaml
- id: prepare_release
  command: /release:prepare
  outputs:
    artifact: dist/app-v1.2.0.tar.gz

- id: deploy_all_envs
  type: parallel
  depends_on: [prepare_release]
  broadcast:
    environments: [staging, qa, production]
  command: /deploy:environment
  args:
    environment: ${broadcast.environment}
  inputs:
    artifact: ${steps.prepare_release.outputs.artifact}

- id: verify_all_envs
  type: parallel
  depends_on: [deploy_all_envs]
  broadcast:
    environments: [staging, qa, production]
  command: /validate:deployment
  args:
    environment: ${broadcast.environment}
```

### Scenario 3: Architecture → Parallel Design Work

```yaml
- id: architecture_decision
  command: /architect
  outputs:
    design_doc: docs/architecture.md

- id: parallel_design
  type: parallel
  depends_on: [architecture_decision]
  steps:
    - id: api_design
      command: /design:api
      inputs:
        arch: ${steps.architecture_decision.outputs.design_doc}

    - id: ui_design
      command: /design:ui
      inputs:
        arch: ${steps.architecture_decision.outputs.design_doc}

    - id: db_design
      command: /design:database
      inputs:
        arch: ${steps.architecture_decision.outputs.design_doc}

    - id: test_strategy
      command: /test:plan
      inputs:
        arch: ${steps.architecture_decision.outputs.design_doc}

- id: consolidate_designs
  command: /review:design
  depends_on: [api_design, ui_design, db_design, test_strategy]
  inputs:
    api_spec: ${steps.api_design.outputs.spec}
    ui_spec: ${steps.ui_design.outputs.spec}
    db_spec: ${steps.db_design.outputs.spec}
    test_spec: ${steps.test_strategy.outputs.plan}
```

---

## 12. Implementation Checklist

### Core Capabilities
- [ ] Implement parallel step execution (max N concurrent)
- [ ] Add dependency resolution for fan-out steps
- [ ] Implement broadcast pattern (iterate over array)
- [ ] Add Promise.all semantics (all must succeed)
- [ ] Implement allSettled semantics (collect results)
- [ ] Add conditional step skipping
- [ ] Implement result aggregation mechanism

### Advanced Features
- [ ] Implement selective routing (if-then-else branches)
- [ ] Add quorum voting strategy
- [ ] Implement partial success with threshold
- [ ] Add retry for failed branches
- [ ] Implement matrix/cartesian product execution
- [ ] Add canary deployment patterns
- [ ] Implement circuit breaker

### State & Coordination
- [ ] Add checkpoint synchronization
- [ ] Implement state merging for fan-in
- [ ] Add artifact versioning support
- [ ] Implement transactional fan-out (all-or-nothing)
- [ ] Add progress reporting for parallel steps
- [ ] Implement timeout management for fan-out

### Observability
- [ ] Add fan-out execution metrics
- [ ] Implement branch-level monitoring
- [ ] Add aggregation statistics
- [ ] Create fan-out/fan-in diagrams
- [ ] Add execution timeline visualization
- [ ] Implement failure analysis reports

---

## 13. Summary Table

| Pattern | Use Case | Complexity | Performance | State Mgmt |
|---------|----------|-----------|-------------|-----------|
| Simple Broadcast | Same op, different inputs | Low | N parallel | Simple |
| Selective Routing | If-then branching | Medium | Variable | Medium |
| Pyramid (Fan-out/in) | Feature development | High | Sequential stages | Complex |
| Partial Success | Fault tolerance | High | Variable | Complex |
| Matrix Execution | Test combinations | High | N² parallel | Complex |

---

## 14. Related Patterns

**Complements:**
- Pattern 9.7: Fan-in patterns (multiple inputs → single command)
- Pattern 9.5: Conditional branching (if-then-else logic)
- Pattern 9.4: Parallel execution (concurrent tasks)

**Constrains:**
- Pattern 9.6: Iterative loops (incompatible with static fan-out)
- Pattern 9.3: State tracking (must preserve state through fan-out)

---

**Phase 9 Task 9.8 Status: COMPLETE**
