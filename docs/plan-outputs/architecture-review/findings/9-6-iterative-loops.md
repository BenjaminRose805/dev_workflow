# 9.6 Iterative/Loop Patterns

**Task:** Analyze iterative/loop patterns (validate → fix → validate)
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Iterative loops are essential for workflows where success isn't guaranteed on first attempt. This analysis identifies five core loop patterns, termination strategies, infinite loop prevention, and convergence mechanisms.

---

## 1. Common Loop Patterns

### Pattern 1: TDD Cycle
```
write_test → run_test → fail → fix_code → run_test → pass → done
```

### Pattern 2: Validation & Fix
```
validate → identify_issues → fix → revalidate → done
```

### Pattern 3: Coverage Improvement
```
test → measure → insufficient? → add_tests → test (loop)
```

### Pattern 4: Refinement Loop
```
generate → review → low_quality? → refine → review (loop)
```

### Pattern 5: Convergence Loop
```
experiment → analyze → promising? → iterate → experiment (loop)
```

---

## 2. Loop Termination Conditions

### Exit Code-Based
```yaml
loop:
  while: ${steps.validate.exit_code != 0}
  until: ${steps.validate.exit_code == 0}
```

### Metric-Based
```yaml
loop:
  while: ${steps.test.coverage < 80}
  until: ${steps.test.coverage >= 80}
```

### Time-Based
```yaml
loop:
  timeout_seconds: 300
  max_iterations: 20
```

### Compound Conditions
```yaml
loop:
  while: |
    ${steps.test.coverage < 80 &&
     steps.test.failed_tests > 0 &&
     workflow.iteration < 5}
```

---

## 3. Infinite Loop Prevention

### Strategy 1: Iteration Budgets
```yaml
loop:
  max_iterations: 5
  timeout_seconds: 600
  force_exit_on_budget_exceeded: true
```

### Strategy 2: Progress Metrics
```yaml
loop:
  progress_metric: ${steps.current.coverage}
  progress_threshold: 1.0  # Must improve by >= 1%
  allow_plateau_iterations: 1
  on_stalled: "exit_with_error"
```

### Strategy 3: Circuit Breaker
```yaml
loop:
  circuit_breaker:
    enabled: true
    failure_threshold: 3
  on_circuit_break: "exit_with_error"
```

### Strategy 4: Change Detection
```yaml
loop:
  change_detection:
    enabled: true
    methods: [artifact_checksum, output_diff]
  on_no_change: "exit_with_warning"
```

---

## 4. Progress Tracking

### Iteration State
```json
{
  "loop": {
    "iteration": 3,
    "max_iterations": 5,
    "started_at": "2025-12-20T14:30:22Z",
    "metrics_history": [
      {"iteration": 1, "coverage": 45.0},
      {"iteration": 2, "coverage": 58.0},
      {"iteration": 3, "coverage": 72.0}
    ]
  }
}
```

### Checkpoint per Iteration
```json
{
  "checkpoints": [
    {
      "iteration": 1,
      "marker": "LOOP_ITERATION_1_COMPLETE",
      "step_outputs": {...},
      "condition_result": true
    }
  ]
}
```

---

## 5. Convergence Patterns

### Monotonic Improvement
Each iteration must produce measurable progress:
```yaml
convergence:
  strategy: monotonic_improvement
  metric: ${steps.test.coverage}
  improvement_threshold: 1.0
```

### Early Exit
Exit immediately when condition satisfied:
```yaml
loop:
  until: ${steps.test.coverage >= 80}
  early_exit:
    enabled: true
    exit_immediately_on_condition: true
```

### Diminishing Returns
Exit when improvement becomes negligible:
```yaml
convergence:
  strategy: diminishing_returns
  improvement_floor: 0.5
  window_size: 3
```

### Fallback to Manual Gate
Escalate when automatic convergence stalls:
```yaml
fallback:
  on_max_iterations_exceeded: "escalate_to_approval_gate"
```

---

## 6. Example: TDD Workflow Loop

```yaml
steps:
  - id: tdd_cycle
    command: /test:run
    loop:
      while: ${steps.tdd_cycle.failed_tests > 0}
      max_iterations: 10
      timeout_seconds: 600

      convergence:
        strategy: monotonic_improvement
        metric: ${steps.tdd_cycle.passed_tests}

      circuit_breaker:
        enabled: true
        failure_threshold: 3
```

---

## 7. Implementation Priority

### P0 (Core)
- Loop definition syntax (while/until/max_iterations)
- Iteration execution and counting
- Condition evaluation per iteration
- Max iterations hard limit

### P1 (Safety)
- Timeout-based termination
- Progress metrics tracking
- Circuit breaker pattern
- Convergence detection

### P2 (Advanced)
- Diminishing returns detection
- Multi-constraint convergence
- Fallback to approval gates
- Loop composition
