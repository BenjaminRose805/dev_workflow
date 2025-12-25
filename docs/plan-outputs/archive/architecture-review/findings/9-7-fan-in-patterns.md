# 9.7 Fan-In Patterns (Multiple Inputs → Single Command)

**Task:** Analyze fan-in patterns (multiple inputs → single command)
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Fan-in patterns describe how to handle multiple independent data sources feeding into a single command. This analysis identifies when fan-in occurs, how to express synchronization requirements ("wait for all" vs "wait for any"), strategies for handling partial inputs, conflict resolution techniques, and aggregation approaches for different data types.

**Key Insight:** Fan-in is fundamentally different from sequential piping. Instead of output → input chaining, fan-in requires aggregation logic to merge multiple independent sources into a cohesive input state.

---

## 1. Common Fan-In Scenarios in Development Workflows

### Scenario 1: Multi-Source Research

**Context:** Designing a feature requires research from multiple domains.

```
Research: Backend Performance → \
Research: Frontend UX Patterns   → /architect command → Architecture Decision
Research: Security Considerations → \
```

**Real Workflow:**
```yaml
steps:
  - id: research_backend
    command: /research:performance
    inputs: [requirements.json]
    outputs: backend-research.md

  - id: research_frontend
    command: /research:ux
    inputs: [requirements.json, design-goals.md]
    outputs: frontend-research.md

  - id: research_security
    command: /research:security
    inputs: [requirements.json]
    outputs: security-research.md

  - id: architect
    command: /architect
    inputs:
      - requirements: requirements.json
      - backend_research: ${steps.research_backend.outputs.backend-research.md}
      - frontend_research: ${steps.research_frontend.outputs.frontend-research.md}
      - security_research: ${steps.research_security.outputs.security-research.md}
    depends_on: [research_backend, research_frontend, research_security]
```

### Scenario 2: Convergent Test Results

**Context:** Multiple test suites complete independently, then results feed into validation.

```
Unit Tests         → \
Integration Tests  → /validate command → Validation Report
E2E Tests         → /
Security Tests    →
```

### Scenario 3: Requirements + Specifications + Constraints

**Context:** Complete architecture decision requires all three inputs.

```
Requirements.json      → \
OpenAPI Spec.yaml      → /architect → architecture.json + decisions.json
Deployment Constraints → /
```

### Scenario 4: Multiple Design Artifacts

**Context:** Implementation requires consensus from multiple designers.

```
Backend Design       → \
Frontend Design      → /implement → Implementation Plan
Database Schema      → /
API Contract Spec    → \
```

### Scenario 5: Validation Report Aggregation

**Context:** Report across multiple validation checks.

```
Type Checking Results       → \
Security Scanning Results   → /validate → Consolidated Report
Performance Analysis        → /
Compliance Checks          → \
```

### Scenario 6: Pre-Implementation Consensus

**Context:** Three stakeholders provide design input before implementation starts.

```
Architect's Design Decisions → \
QA's Test Requirements        → /implement → Implementation
Security Team's Constraints   → /
```

---

## 2. "Wait for All" vs "Wait for Any" Semantics

### Pattern 1: Wait for All (AND Semantics)

**Use Case:** Command requires ALL inputs to be present and ready.

```yaml
# /architect requires all research inputs
steps:
  - id: research_backend
    command: /research:performance

  - id: research_frontend
    command: /research:ux

  - id: research_security
    command: /research:security

  - id: architect
    command: /architect
    depends_on: [research_backend, research_frontend, research_security]
    join_type: all  # Wait for ALL to complete
    join_condition: all_completed
```

**Implementation:**

```javascript
async function fanInAll(stepIds, executor) {
  // Wait for ALL steps to complete
  const results = await Promise.all(
    stepIds.map(id => executor.getStepResult(id))
  );

  // All results available - proceed
  return {
    success: results.every(r => r.status === 'completed'),
    results,
    missingInputs: results.filter(r => r.status !== 'completed')
  };
}
```

**When to use:**
- Consensus decisions (all opinions needed)
- Complete specifications (all sections required)
- Aggregate reports (all data sources needed)
- Validation gates (all checks must pass)

### Pattern 2: Wait for Any (OR Semantics)

**Use Case:** Command can proceed if ANY input becomes available.

```yaml
# /analyze:emergency uses first available diagnostic data
steps:
  - id: collect_metrics
    command: /analyze:metrics

  - id: collect_logs
    command: /analyze:logs

  - id: collect_traces
    command: /analyze:traces

  - id: emergency_response
    command: /analyze:emergency
    depends_on: [collect_metrics, collect_logs, collect_traces]
    join_type: any  # Proceed with FIRST available result
    join_condition: any_completed
```

**Implementation:**

```javascript
async function fanInAny(stepIds, executor) {
  // Race: return first completed step
  const result = await Promise.race(
    stepIds.map(id => executor.waitForCompletion(id))
  );

  return {
    success: true,
    primary: result,
    remaining: stepIds.filter(id => id !== result.stepId)
  };
}
```

**When to use:**
- Fallback chains (use first successful alternative)
- Emergency response (use any available data)
- Optimization (use fastest result)
- Polling for status (check any available service)

### Pattern 3: Wait for N of M (Threshold Semantics)

**Use Case:** Command proceeds when N out of M inputs are available.

```yaml
# /validate:consensus requires 2+ test results
steps:
  - id: test_unit
    command: /test:unit

  - id: test_integration
    command: /test:integration

  - id: test_e2e
    command: /test:e2e

  - id: validate
    command: /validate
    depends_on: [test_unit, test_integration, test_e2e]
    join_type: threshold
    join_threshold: 2  # Need at least 2 of 3
    join_condition: ${completed.length >= 2}
```

**Implementation:**

```javascript
async function fanInThreshold(stepIds, executor, threshold) {
  const results = [];
  const failed = [];

  for (const id of stepIds) {
    try {
      const result = await executor.getStepResult(id, timeout: 5000);
      results.push(result);
    } catch (error) {
      failed.push({ id, error });
    }

    if (results.length >= threshold) {
      return { success: true, results, partial: true, failed };
    }
  }

  if (results.length < threshold) {
    return {
      success: false,
      reason: `Need ${threshold}, got ${results.length}`,
      results,
      failed
    };
  }
}
```

**When to use:**
- Majority voting (need 2+ opinions)
- Degraded operation (N of M sources ok)
- Resilient collection (tolerate some failures)
- Staged rollout (proceed at N% confidence)

### Pattern 4: Priority-Based Join

**Use Case:** Prefer certain inputs, but accept alternatives.

```yaml
steps:
  - id: requirements_manual
    command: /clarify
    outputs: requirements.json

  - id: requirements_generated
    command: /research:infer
    outputs: inferred-requirements.json

  - id: architect
    command: /architect
    depends_on: [requirements_manual, requirements_generated]
    join_type: priority
    join_order: [requirements_manual, requirements_generated]
```

**Implementation:**

```javascript
async function fanInPriority(stepIds, executor, priorities) {
  const results = [];

  // Try in priority order
  for (const id of priorities) {
    try {
      const result = await executor.getStepResult(id, timeout: 3000);
      results.push(result);
      // Continue collecting all, but prioritize ordering
    } catch (error) {
      // Missing input, continue to next priority
    }
  }

  return {
    success: results.length > 0,
    results: results.sort((a, b) =>
      priorities.indexOf(a.stepId) - priorities.indexOf(b.stepId)
    )
  };
}
```

**When to use:**
- Fallback chains with ranking
- Best-effort aggregation
- Input prioritization
- Graceful degradation

---

## 3. Handling Partial Inputs (Some Available, Some Missing)

### Strategy 1: Require All Inputs

**Blocking approach - fail if any input missing.**

```javascript
async function validateAllInputsPresent(requiredInputs, availableInputs) {
  const missing = requiredInputs.filter(
    input => !availableInputs.includes(input)
  );

  if (missing.length > 0) {
    throw new Error(`Missing required inputs: ${missing.join(', ')}`);
  }

  return true;
}
```

**Configuration:**

```yaml
command: /architect
input_handling: required
required_inputs:
  - requirements.json
  - architecture-constraints.md
missing_input_action: fail
```

### Strategy 2: Provide Defaults/Inference

**Generate missing inputs from defaults or inference.**

```javascript
async function fillMissingInputs(inputs, schema) {
  const result = { ...inputs };

  for (const field of schema.required) {
    if (!result[field]) {
      // Generate default or infer
      result[field] = await inferOrDefault(field, inputs);
    }
  }

  return result;
}

async function inferOrDefault(field, context) {
  const defaults = {
    'target-audience': 'general-users',
    'priority-level': 'medium',
    'deployment-region': 'us-east-1'
  };

  if (defaults[field]) {
    return defaults[field];
  }

  // Or use AI to infer
  return await inferFromContext(field, context);
}
```

**Configuration:**

```yaml
command: /architect
input_handling: partial
required_inputs:
  - requirements.json
optional_inputs:
  - architecture-constraints.md
missing_input_action: infer
inference_strategy: context-based
```

### Strategy 3: Conditional Execution

**Execute different command version based on available inputs.**

```yaml
steps:
  - id: architect_full
    command: /architect:full
    condition: ${all_inputs_available}
    depends_on: [requirements, constraints, designs]

  - id: architect_quick
    command: /architect:quick
    condition: ${!all_inputs_available && has(requirements)}
    depends_on: [requirements]
```

**Implementation:**

```javascript
function selectCommandVariant(availableInputs) {
  if (has(availableInputs, ['requirements', 'constraints', 'designs'])) {
    return '/architect:full';
  }
  if (has(availableInputs, ['requirements', 'constraints'])) {
    return '/architect:standard';
  }
  if (has(availableInputs, ['requirements'])) {
    return '/architect:quick';
  }
  throw new Error('Insufficient inputs');
}
```

### Strategy 4: Staged Progression

**Process available inputs progressively, enhance as more arrive.**

```yaml
workflow:
  - id: architect_stage1
    command: /architect
    inputs:
      - requirements.json
    outputs: architecture-draft.md

  - id: architect_stage2
    command: /architect:enhance
    inputs:
      - architecture-draft.md
      - constraints.md  # If available
    depends_on: [architect_stage1]
    condition: ${inputs.has('constraints.md')}
    outputs: architecture-enhanced.md

  - id: architect_stage3
    command: /architect:finalize
    inputs:
      - architecture-enhanced.md
      - team-feedback.md  # If available
    depends_on: [architect_stage2]
    condition: ${inputs.has('team-feedback.md')}
    outputs: architecture-final.md
```

**Progression logic:**

```javascript
async function stagedProcessing(inputGroups, command) {
  let state = null;

  for (const [stage, inputs] of inputGroups) {
    if (!inputs.every(i => available(i))) {
      break; // Stop at first unavailable input group
    }

    state = await executeStage(stage, inputs, state);
  }

  return state;
}
```

### Strategy 5: Request Missing Inputs

**Prompt user or upstream tasks for missing inputs.**

```javascript
async function requestMissingInputs(missing) {
  for (const input of missing) {
    const response = await askUserQuestion(
      `Please provide ${input}`,
      { type: 'file', accept: inputMimes[input] }
    );

    if (!response) {
      throw new Error(`Cannot proceed without ${input}`);
    }
  }
}
```

---

## 4. Resolving Conflicts When Multiple Inputs Have Overlapping Data

### Conflict Type 1: Duplicate Values

**Same data provided in multiple inputs.**

```javascript
async function deduplicateInputs(inputs) {
  const merged = {};

  for (const [key, value] of Object.entries(inputs)) {
    for (const [field, fieldValue] of Object.entries(value)) {
      if (merged[field] && merged[field] !== fieldValue) {
        // Conflict!
        throw new ConflictError(`Field ${field} differs between inputs`);
      }
      merged[field] = fieldValue;
    }
  }

  return merged;
}
```

### Conflict Type 2: Contradicting Values

**Same field with different values from different sources.**

**Resolution Strategy 1: Explicit Merging Rules**

```javascript
const mergeRules = {
  'target-audience': 'union',      // Combine all audiences
  'priority': 'max',                // Take highest priority
  'deadline': 'min',                // Take earliest deadline
  'dependencies': 'union',          // Union all dependencies
  'description': 'first-non-empty'  // Use first defined
};

function mergeConflictingValues(conflictField, values) {
  const rule = mergeRules[conflictField];

  switch (rule) {
    case 'union':
      return [...new Set(values.flat())];
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'first-non-empty':
      return values.find(v => v !== null && v !== undefined);
    case 'manual':
      return requestUserResolution(conflictField, values);
    default:
      throw new Error(`No merge rule for ${conflictField}`);
  }
}
```

**Resolution Strategy 2: Source Priority**

```javascript
const sourcePriority = {
  'manual-input': 1,    // Highest priority
  'requirements.json': 2,
  'inferred': 3,
  'default': 4          // Lowest priority
};

function resolveBySourcePriority(conflicts) {
  const sorted = conflicts.sort((a, b) =>
    (sourcePriority[a.source] || 999) -
    (sourcePriority[b.source] || 999)
  );

  return sorted[0].value; // Return highest priority
}
```

**Resolution Strategy 3: Consensus Voting**

```javascript
function consensusResolve(conflictField, values) {
  const counts = {};

  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }

  // Need >50% agreement
  const majorityCount = Math.ceil(values.length / 2);

  for (const [value, count] of Object.entries(counts)) {
    if (count >= majorityCount) {
      return value;
    }
  }

  throw new Error(`No consensus on ${conflictField}`);
}
```

**Resolution Strategy 4: Explicit Declaration**

```yaml
steps:
  - id: gather_reqs_manual
    command: /clarify
    outputs: requirements-manual.json

  - id: gather_reqs_inferred
    command: /research:infer
    outputs: requirements-inferred.json

  - id: architect
    command: /architect
    inputs:
      requirements: ${steps.gather_reqs_manual.outputs.requirements-manual.json}  # Explicit priority
      inferred_requirements: ${steps.gather_reqs_inferred.outputs.requirements-inferred.json}
    depends_on: [gather_reqs_manual, gather_reqs_inferred]
```

### Conflict Type 3: Schema Mismatches

**Different versions or formats of same data.**

```javascript
async function normalizeInputs(inputs, schema) {
  for (const [key, value] of Object.entries(inputs)) {
    // Detect version
    const version = detectArtifactVersion(value);

    if (version !== schema.version) {
      // Migrate to target version
      inputs[key] = await migrateArtifact(value, version, schema.version);
    }
  }

  return inputs;
}
```

### Conflict Type 4: Temporal Conflicts

**Inputs created at different times, may be stale.**

```javascript
async function resolveTemporalConflicts(inputs) {
  const fresh = [];
  const stale = [];
  const ttl = 24 * 60 * 60 * 1000; // 24 hours

  for (const input of inputs) {
    const age = Date.now() - input.createdAt;

    if (age > ttl) {
      stale.push(input);
    } else {
      fresh.push(input);
    }
  }

  if (fresh.length > 0) {
    return fresh; // Use fresh inputs
  }

  // Warn about using stale inputs
  console.warn(`Using ${stale.length} stale inputs (age > ${ttl}ms)`);
  return stale;
}
```

---

## 5. Aggregation Strategies for Different Input Types

### Type 1: Structured Data (JSON, YAML)

**Aggregation Pattern: Deep Merge**

```javascript
function deepMergeStructured(inputs, mergeRules) {
  const result = {};

  // Shallow merge at top level
  for (const input of inputs) {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value; // Use last value
      }
    }
  }

  // Apply specific merge rules
  for (const [field, rule] of Object.entries(mergeRules)) {
    result[field] = applyMergeRule(field, inputs, rule);
  }

  return result;
}
```

**Example: Merge Requirements**

```javascript
const requirements = [
  {
    functional: ['auth', 'payment'],
    performance: { latency_ms: 100 }
  },
  {
    functional: ['notifications', 'analytics'],
    performance: { latency_ms: 200 }
  }
];

const merged = {
  functional: [...requirements[0].functional, ...requirements[1].functional],
  performance: { latency_ms: Math.min(100, 200) }  // Most strict
};
```

### Type 2: Collections (Arrays)

**Aggregation Pattern 1: Union**

```javascript
function unionAggregation(inputs) {
  const set = new Set();

  for (const array of inputs) {
    for (const item of array) {
      set.add(JSON.stringify(item));
    }
  }

  return [...set].map(s => JSON.parse(s));
}
```

**Aggregation Pattern 2: Intersection**

```javascript
function intersectionAggregation(inputs) {
  if (inputs.length === 0) return [];

  const [first, ...rest] = inputs;
  const firstSet = new Set(first.map(JSON.stringify));

  for (const array of rest) {
    const arraySet = new Set(array.map(JSON.stringify));
    for (const item of firstSet) {
      if (!arraySet.has(item)) {
        firstSet.delete(item);
      }
    }
  }

  return [...firstSet].map(s => JSON.parse(s));
}
```

**Aggregation Pattern 3: Frequency-Based**

```javascript
function frequencyAggregation(inputs, threshold = 0.5) {
  const frequencies = new Map();

  for (const array of inputs) {
    for (const item of array) {
      const key = JSON.stringify(item);
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
    }
  }

  const minFrequency = inputs.length * threshold;

  return [...frequencies.entries()]
    .filter(([_, count]) => count >= minFrequency)
    .map(([key]) => JSON.parse(key));
}
```

### Type 3: Key-Value Data (Dictionaries)

**Aggregation Pattern: Weighted Voting**

```javascript
function weightedVotingAggregation(inputs, weights) {
  const scores = new Map();

  for (let i = 0; i < inputs.length; i++) {
    const weight = weights[i] || 1;

    for (const [key, value] of Object.entries(inputs[i])) {
      if (!scores.has(key)) {
        scores.set(key, new Map());
      }

      const votes = scores.get(key);
      votes.set(value, (votes.get(value) || 0) + weight);
    }
  }

  // Select highest-scored value per key
  const result = {};
  for (const [key, votes] of scores) {
    const [bestValue] = [...votes.entries()]
      .sort((a, b) => b[1] - a[1])[0];
    result[key] = bestValue;
  }

  return result;
}
```

### Type 4: Unstructured Data (Markdown, Text)

**Aggregation Pattern 1: Concatenation**

```javascript
function concatenateText(inputs) {
  return inputs
    .map((input, idx) => `## Source ${idx + 1}\n${input}`)
    .join('\n\n');
}
```

**Aggregation Pattern 2: Semantic Extraction**

```javascript
async function semanticExtraction(inputs) {
  const summaries = [];

  for (const input of inputs) {
    const summary = await extractKeyPoints(input);
    summaries.push(summary);
  }

  return {
    sources: inputs.length,
    keyPoints: summaries,
    synthesized: await synthesizeFromSummaries(summaries)
  };
}
```

### Type 5: Numeric/Metrics Data

**Aggregation Pattern 1: Statistical**

```javascript
function statisticalAggregation(inputs) {
  const stats = {
    mean: inputs.reduce((a, b) => a + b) / inputs.length,
    median: calculateMedian(inputs),
    stdDev: calculateStdDev(inputs),
    min: Math.min(...inputs),
    max: Math.max(...inputs),
    all: inputs
  };

  return stats;
}
```

**Aggregation Pattern 2: Confidence-Based**

```javascript
function confidenceAggregation(inputs) {
  const values = inputs.map(i => i.value);
  const confidences = inputs.map(i => i.confidence);

  // Weighted average by confidence
  const weighted = values.reduce((sum, val, idx) =>
    sum + val * confidences[idx], 0
  );
  const totalConfidence = confidences.reduce((a, b) => a + b);

  return {
    value: weighted / totalConfidence,
    confidence: totalConfidence / inputs.length,
    components: inputs
  };
}
```

### Type 6: Temporal Data

**Aggregation Pattern 1: Timeline Merge**

```javascript
function mergeTimelines(inputs) {
  const events = [];

  for (const timeline of inputs) {
    events.push(...timeline.events);
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);

  return {
    events,
    start: events[0].timestamp,
    end: events[events.length - 1].timestamp,
    duration: events[events.length - 1].timestamp - events[0].timestamp
  };
}
```

**Aggregation Pattern 2: Interval Aggregation**

```javascript
function intervalAggregation(inputs, bucketSize) {
  const buckets = new Map();

  for (const timeline of inputs) {
    for (const event of timeline.events) {
      const bucket = Math.floor(event.timestamp / bucketSize);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket).push(event);
    }
  }

  return [...buckets.entries()]
    .map(([bucket, events]) => ({
      timeRange: [bucket * bucketSize, (bucket + 1) * bucketSize],
      count: events.length,
      events
    }));
}
```

---

## 6. Implementation Patterns for Fan-In

### Pattern 1: Explicit Fan-In in Workflow Definition

```yaml
name: complete-architecture-review
version: 1.0.0

steps:
  - id: backend_research
    command: /research:backend
    outputs: backend-research.md

  - id: frontend_research
    command: /research:frontend
    outputs: frontend-research.md

  - id: security_research
    command: /research:security
    outputs: security-research.md

  - id: architect
    command: /architect
    # Explicit fan-in declaration
    fan_in:
      type: all  # Wait for all
      timeout_ms: 600000
    depends_on:
      - backend_research
      - frontend_research
      - security_research
    inputs:
      backend_research: ${steps.backend_research.outputs.backend-research.md}
      frontend_research: ${steps.frontend_research.outputs.frontend-research.md}
      security_research: ${steps.security_research.outputs.security-research.md}
    outputs: architecture.json
```

### Pattern 2: Automatic Artifact Discovery

```javascript
async function discoverAndFanIn(command, stateManager) {
  // Get command input spec
  const spec = getCommandInputSpec(command);

  // Discover available artifacts
  const artifacts = await stateManager.listArtifacts();

  // Match artifacts to input slots
  const inputs = {};
  for (const [slot, required] of Object.entries(spec.inputs.required)) {
    const matching = artifacts.filter(a =>
      a.type === required.type &&
      semver.satisfies(a.version, required.version)
    );

    if (matching.length === 0) {
      throw new Error(`No artifact for ${slot}`);
    }

    inputs[slot] = mostRecent(matching);
  }

  return inputs;
}
```

### Pattern 3: Conditional Fan-In

```yaml
steps:
  - id: test_unit
    command: /test:unit
    outputs: test-results.json

  - id: test_integration
    command: /test:integration
    outputs: test-results.json
    condition: ${steps.test_unit.exit_code == 0}

  - id: test_e2e
    command: /test:e2e
    outputs: test-results.json
    condition: ${steps.test_integration.exit_code == 0}

  - id: validate
    command: /validate
    fan_in:
      type: threshold
      min_required: 2
    inputs:
      test_results_unit: ${steps.test_unit.outputs.test-results.json}
      test_results_integration: ${steps.test_integration.outputs.test-results.json}
      test_results_e2e: ${steps.test_e2e.outputs.test-results.json}
    depends_on:
      - test_unit
      - test_integration
      - test_e2e
```

### Pattern 4: Progressive Fan-In (Streaming Input)

```javascript
class StreamingFanIn {
  constructor(targetCount) {
    this.targetCount = targetCount;
    this.results = [];
    this.ready = false;
  }

  addResult(result) {
    this.results.push(result);

    if (this.results.length >= this.targetCount) {
      this.ready = true;
      this.notifyReady();
    }
  }

  notifyReady() {
    // Trigger command with available results
  }

  getAggregated() {
    return aggregateResults(this.results);
  }
}
```

---

## 7. Fan-In vs Fan-Out

### Fan-Out (Single Input → Multiple Outputs)

```
/architect
  ├→ /implement:backend
  ├→ /implement:frontend
  ├→ /implement:infra
  └→ /document
```

### Fan-In (Multiple Inputs → Single Output)

```
/research:backend
/research:frontend    ──→ /architect
/research:security
```

### Key Differences

| Aspect | Fan-In | Fan-Out |
|--------|--------|---------|
| **Direction** | Multiple sources converge | Single source diverges |
| **Coordination** | Synchronization required | Independent paths |
| **Failure Mode** | All must complete | Partial ok |
| **Performance** | Limited by slowest input | Parallel by default |
| **State Merge** | Required | Not required |

---

## 8. Recommendations

### When to Use Each Pattern

| Pattern | Best For | Example |
|---------|----------|---------|
| **Wait for All** | Consensus decisions | Requirements + Constraints → Architecture |
| **Wait for Any** | Fallback scenarios | Metric source 1/2/3 → Emergency response |
| **Threshold** | Majority decisions | Test results 2+ → Validation report |
| **Priority** | Ranked inputs | Manual input > Inferred input |
| **Conditional** | Optional inputs | Requirements (required) + Constraints (optional) |
| **Progressive** | Streaming data | Real-time metrics feed → Analysis |

### Input Handling Best Practices

1. **Be explicit** - Always declare which inputs are required vs optional
2. **Validate early** - Check input compatibility before processing
3. **Provide defaults** - Infer missing optional inputs rather than failing
4. **Handle conflicts** - Define merge rules for overlapping data
5. **Document aggregation** - Clearly specify how multiple inputs combine
6. **Version artifacts** - Use semantic versioning for compatibility checks
7. **Monitor staleness** - Track input age and regenerate if needed
8. **Trace provenance** - Record which inputs contributed to final output

### Implementation Priority

1. **P0 - Core Fan-In:**
   - "Wait for all" semantics with explicit dependencies
   - JSON/YAML merge for structured data
   - Artifact version validation

2. **P1 - Advanced Joins:**
   - "Wait for any/N" semantics
   - Conflict resolution strategies
   - Progressive aggregation

3. **P2 - Optimization:**
   - Automatic artifact discovery
   - Smart aggregation selection
   - Caching of merged inputs

---

## 9. Checklist for Fan-In Implementation

- [ ] Define input requirements (required vs optional)
- [ ] Choose join semantics (all/any/threshold)
- [ ] Implement artifact compatibility checking
- [ ] Define conflict resolution rules
- [ ] Choose aggregation strategy per data type
- [ ] Handle partial inputs gracefully
- [ ] Track input provenance
- [ ] Validate merged output
- [ ] Implement retry logic for slow inputs
- [ ] Add observability/monitoring
- [ ] Document aggregation logic
- [ ] Test with diverse input combinations

---

## 10. Fan-In in Context: Workflow Model

**Fan-in enables:**
- Consensus-based decisions (multiple reviewers → one decision)
- Data integration (multiple sources → single model)
- Validation aggregation (multiple checks → single report)
- Research synthesis (multiple studies → architecture)

**Fan-in transforms workflow from purely sequential to **network-based** where multiple parallel paths converge at critical decision points.**

---

**Phase 9 Task 9.7 Status: COMPLETE**
