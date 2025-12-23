# 9.5 Conditional Branching Patterns

**Task:** Analyze conditional branching patterns (if X fails, do Y)
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Conditional branching enables workflows to express logic, handle failures, and implement recovery paths. This analysis identifies five core patterns and supporting infrastructure for error handling and human intervention.

---

## 1. Condition Expression Syntax

### Basic Conditions

```yaml
condition: ${steps.validate.exit_code == 0}
condition: ${steps.build.success == true}
condition: ${steps.test.coverage >= 80}
```

### Compound Conditions

```yaml
# AND
condition: ${steps.build.success && steps.lint.exit_code == 0}

# OR
condition: ${steps.test.exit_code != 0 || steps.coverage < 50}

# Complex
condition: ${(steps.build.success && steps.test.coverage >= 80) || steps.manual_approval}
```

### Context Variables

- `${steps.{id}.exit_code}` - Exit code (0 = success)
- `${steps.{id}.duration_ms}` - Execution time
- `${artifact_exists('path')}` - Check artifact
- `${env.BRANCH}` - Environment variable
- `${workflow.attempt_count}` - Retry count

---

## 2. Core Branching Patterns

### Pattern 1: If-Then (Skip on Failure)

```yaml
steps:
  - id: validate
    command: /validate:types

  - id: fix_on_error
    command: /fix:types
    depends_on: [validate]
    condition: ${steps.validate.exit_code != 0}

  - id: proceed
    command: /compile
    depends_on: [validate]
    condition: ${steps.validate.exit_code == 0}
```

### Pattern 2: If-Then-Else (Branch)

```yaml
steps:
  - id: prepare
    command: /release:prepare

  - id: auto_deploy  # Branch A
    command: /deploy:app
    depends_on: [prepare]
    condition: ${env.BRANCH == 'main'}

  - id: request_approval  # Branch B
    type: gate
    depends_on: [prepare]
    condition: ${env.BRANCH != 'main'}
```

### Pattern 3: Try-Catch-Finally

```yaml
steps:
  # Try
  - id: test_attempt
    command: /test:run

  # Catch
  - id: fix_failures
    command: /fix:tests
    depends_on: [test_attempt]
    condition: ${steps.test_attempt.exit_code != 0}

  # Retry
  - id: test_retry
    command: /test:run
    depends_on: [fix_failures]
    condition: ${!steps.fix_failures.skipped}

  # Finally (always runs)
  - id: report
    command: /document:report
    depends_on: [test_attempt, test_retry]
    condition: true
```

### Pattern 4: Loop with Retry

```yaml
steps:
  - id: run_tests
    command: /test:run
    loop:
      max_iterations: 5
      condition: ${steps.run_tests.coverage < 80}
      backoff:
        initial_delay_ms: 1000
        multiplier: 2.0
```

### Pattern 5: Fallback Chain

```yaml
steps:
  - id: deploy_k8s
    command: /deploy:k8s
    condition: ${env.HAS_K8S == 'true'}

  - id: deploy_docker
    command: /deploy:docker
    condition: ${steps.deploy_k8s.skipped || steps.deploy_k8s.exit_code != 0}

  - id: deploy_server
    command: /deploy:server
    condition: ${steps.deploy_docker.skipped || steps.deploy_docker.exit_code != 0}

  - id: manual_deploy
    type: gate
    condition: ${steps.deploy_server.exit_code != 0}
```

---

## 3. Success/Failure Criteria

### Exit Codes

```yaml
command_config:
  /validate:types:
    exit_codes:
      0: success
      1: validation errors (recoverable)
      2: fatal error (not recoverable)
    success_exits: [0]
    recoverable_exits: [1]
    fatal_exits: [2]
```

### Output-Based Criteria

```yaml
steps:
  - id: build
    command: /implement:build
    on_success:
      - exit_code == 0
      - artifact_exists('dist/index.js')
    on_failure:
      - exit_code != 0
      - error_contains('compilation failed')
```

---

## 4. Error Recovery Strategies

### Recovery by Error Type

```yaml
error_recovery:
  validation:
    recovery_command: /fix:types
    retry: true
    max_retries: 3

  network:
    recovery_command: null
    retry: true
    backoff: exponential
    max_retries: 5

  resource:
    retry: false
    requires_approval: true
```

### Retry with Backoff

```yaml
retry:
  max_attempts: 5
  backoff:
    strategy: exponential
    initial_delay_ms: 1000
    max_delay_ms: 60000
    multiplier: 2.0
    jitter: true
```

---

## 5. Circuit Breaker Pattern

```yaml
circuit_breaker:
  enabled: true
  failure_threshold: 5
  success_threshold: 2
  timeout_ms: 30000

steps:
  - id: external_api
    command: /api:call
    circuit_breaker: true

  - id: fallback
    command: /api:fallback
    condition: ${steps.external_api.circuit_breaker_open}
```

**States:**
```
CLOSED → (failures > threshold) → OPEN
OPEN → (timeout expires) → HALF_OPEN
HALF_OPEN → (success) → CLOSED
HALF_OPEN → (failure) → OPEN
```

---

## 6. Human Intervention Points

### Approval Gates

```yaml
steps:
  - id: manual_review
    type: gate
    gate_config:
      required_approvers: 2
      timeout_minutes: 60
      options:
        - label: "Approve"
          value: approve
        - label: "Request Changes"
          value: changes
        - label: "Reject"
          value: reject
```

### Decision Points

```yaml
steps:
  - id: select_strategy
    type: decision
    decision_config:
      question: "Which deployment strategy?"
      options:
        - label: "Blue-Green"
          value: blue_green
        - label: "Canary"
          value: canary
        - label: "Rolling"
          value: rolling

  - id: deploy
    command: /deploy:app
    args:
      strategy: ${steps.select_strategy.selected_value}
```

---

## 7. Pattern Summary

| Pattern | Use Case | Key Feature |
|---------|----------|-------------|
| If-Then | Skip on error | Conditional execution |
| If-Then-Else | Branch paths | Dual execution paths |
| Try-Catch-Finally | Error recovery | Error handling + cleanup |
| Loop-Retry | Repeat until success | Automatic retry |
| Fallback Chain | Sequential attempts | Multiple alternatives |
| Circuit Breaker | Prevent cascade | Fast-fail pattern |
| Approval Gate | Human decision | Workflow pause |

---

## 8. Implementation Priority

### P0 (Immediate)
- Basic conditions with exit_code
- If-then-else branching
- Retry with exponential backoff
- Approval gates

### P1 (Short-Term)
- Loop constructs
- Try-catch-finally semantics
- Circuit breaker
- Fallback chains

### P2 (Medium-Term)
- Advanced error codes
- Jittered backoff
- Condition validation
- Pattern templates

---

## 9. Implementation Checklist

- [ ] Implement condition expression parser
- [ ] Add exit_code checking
- [ ] Implement if-then-else branching
- [ ] Add retry with backoff
- [ ] Implement loop constructs
- [ ] Add circuit breaker
- [ ] Implement approval gates
- [ ] Add decision points
- [ ] Create fallback chain support
- [ ] Add error recovery strategies
