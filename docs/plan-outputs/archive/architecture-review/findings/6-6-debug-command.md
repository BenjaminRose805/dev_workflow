# Phase 6: Analysis & Quality - `/debug` Command Design

## Command Overview

The `/debug` command suite provides systematic debugging assistance across multiple domains: error analysis, performance optimization, behavioral issues, test failures, memory problems, network debugging, concurrency, and data issues.

**Core Philosophy:**
- **Hypothesis-driven:** Generate and test specific hypotheses
- **Context-aware:** Leverage codebase knowledge
- **Reproducible:** Document debugging steps
- **Multi-layered:** Address immediate fixes + systemic issues

**Common Workflow:**
1. Gather context (errors, traces, symptoms)
2. Generate debugging hypotheses
3. Systematic investigation
4. Root cause identification
5. Propose fixes with risk assessment
6. Document findings

---

## Sub-Command Specifications

### 1. `debug:error` - Error & Exception Analysis

```yaml
---
name: debug:error
description: Analyze errors and stack traces to identify root causes
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, root-cause.md, fix-suggestion.md]
interactive: true
---
```

**Process:**
1. Parse error context from stack trace
2. Read files mentioned in trace
3. Generate 3-5 hypotheses ranked by likelihood
4. Test each hypothesis systematically
5. Document confirmed root cause with fix

---

### 2. `debug:performance` - Performance Debugging

```yaml
---
name: debug:performance
description: Debug bottlenecks and performance issues
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, performance-analysis.md, optimization-plan.md]
interactive: true
---
```

**Analysis Focus:**
- Profiling data interpretation
- Algorithmic complexity (Big O)
- N+1 queries
- Blocking I/O
- Memory allocation patterns

---

### 3. `debug:behavior` - Unexpected Behavior

```yaml
---
name: debug:behavior
description: Investigate logic errors and state inconsistencies
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, hypothesis.md, behavior-analysis.md, fix-suggestion.md]
interactive: true
---
```

**Analysis Focus:**
- Expected vs actual behavior
- Control flow tracing
- State change tracking
- Edge case identification

---

### 4. `debug:test` - Test Failure Debugging

```yaml
---
name: debug:test
description: Debug failing tests and flakiness
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, test-analysis.md, fix-suggestion.md]
interactive: true
---
```

**Failure Classification:**
- Assertion failure
- Exception during test
- Timeout/hang
- Flaky/intermittent

---

### 5. `debug:memory` - Memory Debugging

```yaml
---
name: debug:memory
description: Debug memory leaks and allocation issues
model: claude-opus-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, memory-analysis.md, leak-report.md, fix-suggestion.md]
interactive: true
---
```

**Common Leak Patterns:**
- Event listeners not removed
- Timers not cleared
- Caches without eviction
- Closures capturing large contexts
- Unclosed resources

---

### 6. `debug:network` - Network/API Debugging

```yaml
---
name: debug:network
description: Debug API calls, timeouts, integration issues
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, network-analysis.md, fix-suggestion.md]
interactive: true
---
```

**Issue Categories:**
- Connectivity
- Timeout
- Error response
- Data format

---

### 7. `debug:concurrency` - Race Condition Debugging

```yaml
---
name: debug:concurrency
description: Debug race conditions, deadlocks, thread safety
model: claude-opus-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, concurrency-analysis.md, fix-suggestion.md]
interactive: true
---
```

**Issue Types:**
- Race condition
- Deadlock
- Livelock
- Thread starvation

---

### 8. `debug:data` - Data Corruption Debugging

```yaml
---
name: debug:data
description: Debug data corruption, validation errors, database issues
model: claude-sonnet-4-5
allowed-tools: [Read, Glob, Grep, Bash]
outputs: [debug-log.md, data-analysis.md, fix-suggestion.md]
interactive: true
---
```

---

## Artifact Schemas

### debug-log.md

```markdown
---
artifact-type: debug-log
session-id: [unique-id]
command: [debug:error]
timestamp: [ISO-8601]
---

# Debugging Session Log

## Problem Statement
[Issue description]

## Initial Context
- **Symptoms:** [...]
- **Environment:** [...]
- **Reproducibility:** [Always, intermittent, specific conditions]

## Investigation Timeline

### [HH:MM] Hypothesis 1: [Description]
**Evidence for:** [...]
**Testing approach:** [...]
**Actions taken:**
- [Action 1]
**Findings:** [...]
**Result:** ✓ Confirmed | ✗ Eliminated | ⊙ Partial
```

### root-cause.md

```markdown
---
artifact-type: root-cause
severity: [critical | high | medium | low]
confirmed: [yes | no | partial]
---

# Root Cause Analysis

## Root Cause
[Definitive statement]

## Supporting Evidence
1. **[Evidence type]**
   - Source: [Stack trace, log, code]
   - Finding: [...]

## Why This Happened
[Underlying factors]

## Prevention Insights
[Future prevention strategies]
```

### fix-suggestion.md

```markdown
---
artifact-type: fix-suggestion
confidence: [high | medium | low]
---

# Fix Suggestion

## Root Cause Summary
[Brief recap]

## Proposed Fix

**Code Changes:**
\`\`\`language
// File: /path/to/file.ext
[Fix code]
\`\`\`

**Why This Works:** [Explanation]

## Risk Assessment
**Risk Level:** [Low | Medium | High]
**Potential Risks:** [...]

## Testing Strategy
1. [Test case 1]
2. [Test case 2]
```

### hypothesis.md

```markdown
---
artifact-type: hypothesis
hypothesis-count: [number]
---

# Debugging Hypotheses

## Hypotheses (Ranked by Likelihood)

### 1. [Hypothesis] - [High | Medium | Low] Probability
**Supporting Evidence:** [...]
**Testing Approach:**
- [ ] [Step 1]
- [ ] [Step 2]
**Files to Examine:**
- `/path/to/file.js` - [Why relevant]
```

---

## Model Selection

**Sonnet 4.5 (Default):**
- debug:error, debug:performance, debug:behavior
- debug:test, debug:network, debug:data

**Opus 4.5 (Complex Reasoning):**
- debug:memory - Object lifecycle reasoning
- debug:concurrency - Thread interaction analysis

---

## Statistics

| Metric | Count |
|--------|-------|
| Sub-Commands | 8 |
| Unique Artifacts | 12 |
| Model Types | 2 (Sonnet, Opus) |

**Phase 6 Task 6.6 Status: COMPLETE**
