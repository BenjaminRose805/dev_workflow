# Task 9.3: Workflow State Tracking Approaches

**Analysis Date:** 2025-12-20
**Scope:** State persistence and recovery mechanisms for multi-session, multi-branch workflows

---

## Executive Summary

Workflow state tracking is critical for supporting resumable, long-running workflows that span multiple sessions and potentially multiple git branches. This analysis evaluates approaches for persisting workflow execution state, tracking artifact lineage, handling branch-aware workflows, and recovering incomplete workflows.

**Key Findings:**
- **Three-tier state model** (workflow → step → artifact) enables complete recovery
- **Git-integrated state** separates tracked (artifacts) from untracked (execution state)
- **Session resumption** requires explicit session IDs and checkpoint bookmarks
- **Branch awareness** demands metadata linking state to git commits
- **State migration** needs careful cleanup to prevent orphaned data

---

## Analysis Areas

### 1. State Persistence Approaches

#### Option A: Centralized State File (Current Pattern)

**Structure:**
```
.workflows/
├── {workflow-name}/
│   ├── workflow.yaml              # Immutable definition
│   ├── execution-state/
│   │   ├── {run-id}.json          # Complete execution snapshot
│   │   ├── checkpoint-{number}.json # Incremental checkpoints
│   │   └── current-state.json     # Latest working state
│   └── artifacts/
│       ├── {step-id}.output.json  # Step outputs
│       └── metadata.json          # Artifact lineage
```

**Workflow State Structure:**
```json
{
  "workflowId": "uuid",
  "workflowName": "feature-tdd",
  "runId": "run-20251220-143022",
  "status": "paused | running | completed | failed",
  "startedAt": "2025-12-20T14:30:22Z",
  "pausedAt": "2025-12-20T14:45:00Z",
  "completedAt": null,
  "sessionId": "session-xyz",
  "inputs": {
    "feature_name": "payment-gateway"
  },
  "steps": {
    "clarify": {
      "status": "completed",
      "startedAt": "2025-12-20T14:30:25Z",
      "completedAt": "2025-12-20T14:32:10Z",
      "outputs": {
        "requirements": "docs/requirements/payment-gateway/requirements.json"
      },
      "exitCode": 0
    },
    "test_design": {
      "status": "in_progress",
      "startedAt": "2025-12-20T14:32:15Z",
      "completedAt": null,
      "command": "/test:plan",
      "sessionId": "session-abc"
    },
    "implement": {
      "status": "pending",
      "depends_on": ["test_design"],
      "condition": "${steps.test_design.exit_code == 0}"
    }
  },
  "checkpoints": [
    {
      "number": 1,
      "stepId": "clarify",
      "timestamp": "2025-12-20T14:32:10Z",
      "state": "completed"
    }
  ],
  "gitContext": {
    "branch": "feature/payment-gateway",
    "commitAtStart": "abc123def456",
    "uncommittedChanges": false
  }
}
```

**Advantages:**
- Single source of truth
- Atomic updates with temp file + rename pattern
- Supports rollback via checkpoint history
- Natural integration with version control

**Disadvantages:**
- Potential contention for large workflows
- All state in one file (slower reads for large workflows)
- Requires careful merging if multiple sessions

**Best For:** Single-session workflows, small steps

---

#### Option B: Distributed Step State (Per-Step Files)

**Structure:**
```
.workflows/
├── {workflow-name}/
│   ├── workflow.yaml
│   ├── runs/
│   │   └── {run-id}/
│   │       ├── metadata.json       # Run metadata
│   │       ├── steps/
│   │       │   ├── clarify.json    # Per-step state
│   │       │   ├── test_design.json
│   │       │   └── implement.json
│   │       └── execution-log.md    # Human-readable log
│   └── current/                    # Symlink to latest run
│       └── {run-id}/
```

**Per-Step State:**
```json
{
  "stepId": "clarify",
  "runId": "run-20251220-143022",
  "status": "completed",
  "command": "/clarify",
  "args": ["payment-gateway"],
  "startedAt": "2025-12-20T14:30:25Z",
  "completedAt": "2025-12-20T14:32:10Z",
  "durationMs": 105000,
  "stdout": "...",
  "stderr": "",
  "exitCode": 0,
  "outputs": {
    "requirements": "docs/requirements/payment-gateway/requirements.json"
  },
  "retries": 0,
  "sessionId": "session-xyz"
}
```

**Advantages:**
- Parallel writes (steps complete independently)
- Better for large-scale workflows
- Natural concurrent step execution
- Easier to inspect individual step results

**Disadvantages:**
- More complex read operations (must aggregate)
- Harder to guarantee consistency
- Requires careful ordering for dependent steps

**Best For:** Large workflows with many parallel steps

---

#### Option C: Hybrid Model (State + Artifact Registry)

**Structure:**
```
.workflows/
├── {workflow-name}/
│   ├── workflow.yaml
│   ├── state.json                 # Current workflow state (compact)
│   ├── runs/
│   │   └── {run-id}.json          # Run summary + step list
│   └── artifact-registry.json     # Index of all artifacts
```

**Artifact Registry:**
```json
{
  "workflowName": "feature-tdd",
  "artifacts": [
    {
      "id": "req-payment-gateway",
      "name": "requirements.json",
      "type": "requirements",
      "producedBy": "clarify",
      "runId": "run-20251220-143022",
      "path": "docs/requirements/payment-gateway/requirements.json",
      "timestamp": "2025-12-20T14:32:10Z",
      "checksum": "sha256:abc123...",
      "version": 1,
      "tags": ["active", "latest"],
      "superseded_by": null,
      "git_commit": "abc123def456",
      "git_branch": "feature/payment-gateway"
    }
  ]
}
```

**Advantages:**
- Supports artifact discovery and dependencies
- Enables artifact versioning and lineage
- Tracks which branch/commit produced each artifact
- Efficient artifact lookups

**Disadvantages:**
- More bookkeeping
- Registry can become large
- Requires cleanup of old versions

**Best For:** Multi-session workflows with artifact dependencies

---

### 2. Artifact Tracking & Discovery

#### Artifact Lineage Model

Track parent-child relationships for artifact dependencies:

```json
{
  "artifact": {
    "id": "test-plan-123",
    "type": "test_plan",
    "path": "docs/artifacts/test-plans/payment-gateway.json",
    "producedBy": {
      "command": "/test:plan",
      "stepId": "test_design",
      "workflowId": "feature-tdd",
      "runId": "run-20251220-143022"
    },
    "consumedBy": [
      {
        "command": "/implement:feature",
        "stepId": "implement",
        "workflowId": "feature-tdd",
        "runId": "run-20251220-143022"
      }
    ],
    "dependencies": [
      {
        "id": "req-payment-gateway",
        "type": "requirements",
        "path": "docs/requirements/payment-gateway/requirements.json"
      }
    ],
    "metadata": {
      "version": "1.0.0",
      "checksum": "sha256:abc123...",
      "timestamp": "2025-12-20T14:32:10Z",
      "status": "active | deprecated | archived"
    }
  }
}
```

#### Artifact Discovery Patterns

**1. Path-Based Discovery**
```yaml
steps:
  - id: implement
    command: /implement:feature
    inputs:
      requirements: docs/requirements/${inputs.feature_name}/requirements.json
      test_plan: ${steps.test_design.outputs.test_plan}
```

**2. Registry-Based Discovery**
```yaml
steps:
  - id: review
    command: /review
    discover:
      - type: source_code
        filter: { status: "complete" }
      - type: test_plan
        filter: { feature: ${inputs.feature_name} }
```

**3. Glob Pattern Discovery**
```yaml
steps:
  - id: bundle_artifacts
    command: /release:package
    inputs:
      documentation: docs/artifacts/docs/**/*.md
      test_results: docs/artifacts/test-results/*.json
```

---

### 3. Git Branching & Workflow State

#### Challenge: Branch-Aware State

Workflows may span multiple branches:
- Feature branch: `feature/payment-gateway`
- Validation branch: `feature/payment-gateway-test`
- Staging branch: `staging`

**Problem:** Artifacts created on one branch shouldn't be consumed by incompatible branches.

#### Solution: Git Context Tracking

```json
{
  "workflow": {
    "runId": "run-20251220-143022",
    "gitContext": {
      "startBranch": "feature/payment-gateway",
      "startCommit": "abc123def456",
      "startTimestamp": "2025-12-20T14:30:22Z",

      "currentBranch": "feature/payment-gateway",
      "currentCommit": "def456ghi789",
      "uncommittedChanges": false
    },
    "steps": [
      {
        "stepId": "clarify",
        "branch": "feature/payment-gateway",
        "commit": "abc123def456",
        "artifacts": [
          {
            "path": "docs/requirements/...",
            "createdAt": "2025-12-20T14:32:10Z",
            "createdOn": "feature/payment-gateway (abc123def456)"
          }
        ]
      }
    ]
  }
}
```

#### Branch Strategy Patterns

**1. Linear Branch (Single Branch)**
```
feature/payment-gateway
  ├─ step: clarify (commit: abc123)
  ├─ step: test_design (commit: def456)
  ├─ step: implement (commit: ghi789)
  └─ step: review (commit: jkl012)
```

**2. Parallel Branches (Multiple Isolated Workflows)**
```
feature/payment-gateway-main
  ├─ clarify, test_design, implement

feature/payment-gateway-refactor
  ├─ clarify (shares with main)
  ├─ refactor (isolated)
  └─ test:run
```

**3. Convergence Pattern (Multi-branch)**
```
feature/payment-gateway
  ├─ step: clarify (branch: feature/payment-gateway)
  │
  feature/payment-gateway-experiment (branch from clarify)
  │  ├─ step: explore-alternative
  │  └─ step: analyze-alternative
  │
  feature/payment-gateway (merge back)
  ├─ step: synthesize-findings
  └─ step: implement
```

**Tracking Rules:**
- Record branch/commit for each step
- Fail if branch has uncommitted changes at step start
- Allow commits between steps
- Detect and warn on branch switches
- Support cross-branch artifact dependencies with explicit approval

---

### 4. Session Resumption Patterns

#### Session ID Management

```json
{
  "workflow": {
    "runId": "run-20251220-143022",
    "sessionHistory": [
      {
        "sessionNumber": 1,
        "sessionId": "session-xyz-001",
        "startedAt": "2025-12-20T14:30:22Z",
        "endedAt": "2025-12-20T14:45:00Z",
        "duration": "14m 38s",
        "stepsCompleted": ["clarify"],
        "reason": "user_paused"
      },
      {
        "sessionNumber": 2,
        "sessionId": "session-xyz-002",
        "startedAt": "2025-12-20T15:00:00Z",
        "endedAt": "2025-12-20T15:30:00Z",
        "duration": "30m",
        "stepsCompleted": ["clarify", "test_design"],
        "reason": "error_recovery"
      }
    ]
  }
}
```

#### Resume Semantics

**Option A: Resume from Checkpoint**
```bash
/workflow:resume run-20251220-143022
# Resumes from last completed step
# Skips: clarify (already done)
# Next: test_design
```

**Option B: Resume with Rerun**
```bash
/workflow:resume run-20251220-143022 --rerun-from test_design
# Reruns test_design even if completed
# Useful for: input changes, transient failures
```

**Option C: Resume with Override**
```bash
/workflow:resume run-20251220-143022 --skip-step test_design
# Skips a step entirely
# Useful for: broken dependencies, manual fixes
```

#### Session Crash Recovery

Track **checkpoint markers** at key points:

```json
{
  "checkpoints": [
    {
      "number": 1,
      "stepId": "clarify",
      "exitCode": 0,
      "timestamp": "2025-12-20T14:32:10Z",
      "artifacts": [
        "docs/requirements/payment-gateway/requirements.json"
      ],
      "marker": "WORKFLOW_CHECKPOINT_1"
    },
    {
      "number": 2,
      "stepId": "test_design",
      "partialOutputs": {
        "test_plan": "docs/artifacts/test-plans/payment-gateway.json"
      },
      "status": "in_progress",
      "lastHeartbeat": "2025-12-20T14:35:45Z"
    }
  ]
}
```

**Recovery Logic:**
```
On workflow resume:
  1. Check last checkpoint marker
  2. If marked: step completed, skip to next
  3. If in_progress: verify artifacts exist
     - If complete: treat as success
     - If partial: offer rerun or skip
  4. If no marker: treat as never started
```

---

### 5. State Relationship: Workflow ↔ Git Commits

#### Artifact Commit Linkage

Each artifact should track its git origin:

```json
{
  "artifact": {
    "id": "requirements-v1",
    "path": "docs/requirements/payment-gateway/requirements.json",
    "createdBy": {
      "command": "/clarify",
      "stepId": "clarify",
      "workflow": "feature-tdd"
    },
    "gitMetadata": {
      "createdOnCommit": "abc123def456",
      "createdOnBranch": "feature/payment-gateway",
      "createdOnTimestamp": "2025-12-20T14:32:10Z",
      "stagedAt": "2025-12-20T14:32:30Z",
      "commitedAt": null,
      "status": "untracked | staged | committed"
    }
  }
}
```

#### Commit ↔ Workflow Mapping

Store bidirectional mapping:

```json
{
  "commits": {
    "abc123def456": {
      "message": "clarify: payment gateway requirements",
      "timestamp": "2025-12-20T14:32:10Z",
      "artifactsCreated": [
        "docs/requirements/payment-gateway/requirements.json"
      ],
      "workflowRun": "run-20251220-143022",
      "stepId": "clarify"
    }
  }
}
```

#### Implications for Branching

**Scenario 1: Artifact Used Across Branches**
```
Commit abc123 (feature/payment-gateway):
  ├─ Create: requirements.json

Switch to feature/payment-gateway-refactor:
  ├─ Base: abc123 (includes requirements.json)
  ├─ Run: /refactor with requirements.json
  └─ Create: refactored-code.json on feature/payment-gateway-refactor
```

**Issue:** `requirements.json` from abc123 is used in different branch context.

**Solution:**
- Document artifact's origin branch
- Require explicit approval for cross-branch usage
- Consider artifact invalidation if source branch changes

---

### 6. State Migration & Cleanup

#### Completed Workflow Archive Pattern

```
.workflows/
├── {workflow-name}/
│   ├── current-state.json          # Latest run (working)
│   └── archive/
│       ├── runs/
│       │   ├── run-20251220-143022.json (completed)
│       │   ├── run-20251219-082015.json (completed)
│       │   └── ...
│       └── artifacts/
│           ├── run-20251220-143022/
│           │   ├── clarify.output.json
│           │   ├── test_design.output.json
│           │   └── ...
│           └── run-20251219-082015/
```

#### Cleanup Rules

**1. Old Run Retention**
```yaml
retention:
  keepRunsCount: 10          # Keep last 10 runs
  keepRunsDays: 30           # Keep runs from last 30 days
  archiveOlderThan: 90       # Archive runs older than 90 days
```

**2. Artifact Lifecycle**
```json
{
  "artifact": {
    "lifecycle": {
      "status": "active | superseded | deprecated | archived",
      "created": "2025-12-20T14:32:10Z",
      "supersededBy": "req-payment-gateway-v2",
      "deprecatedAt": "2025-12-22T10:00:00Z",
      "archivedAt": null,
      "retentionDays": 90
    }
  }
}
```

**3. Automatic Cleanup**
```
Monthly cleanup job:
  1. Archive runs > 90 days old
  2. Mark superseded artifacts as archived
  3. Clean up empty directories
  4. Consolidate run metadata
  5. Update artifact-registry.json indices
```

#### Migration Path

When migrating from one workflow system to another:

```json
{
  "migration": {
    "sourceSystem": "workflow-v1",
    "targetSystem": "workflow-v2",
    "mappings": {
      "run-20251220-143022": "legacy-run-001",
      "clarify": "discovery:clarify",
      "requirements.json": "artifact:requirements-v1"
    },
    "completedAt": "2025-12-20T16:00:00Z",
    "verified": true
  }
}
```

---

## Comparison Matrix

| Aspect | Centralized | Distributed | Hybrid |
|--------|------------|-------------|--------|
| **Write Pattern** | Single file | Per-step files | State + Registry |
| **Consistency** | Strong | Eventual | Strong + Index |
| **Large Workflows** | Slower | Faster | Medium |
| **Artifact Discovery** | Manual | Manual | Registry |
| **Checkpoint Support** | Native | Via aggregation | Native |
| **Concurrency** | Low | High | Medium |
| **Complexity** | Low | High | Medium |
| **Recommended Size** | < 20 steps | > 50 steps | Any |

---

## Recommended Approach

### Phase 1: MVP (Centralized State)

```
.workflows/
├── {workflow-name}/
│   ├── workflow.yaml              # Immutable
│   ├── state.json                 # Current execution state
│   ├── runs/
│   │   └── {run-id}.json          # Historical runs
│   └── artifacts/
│       └── {artifact-name}.json   # Artifact metadata
```

**Capabilities:**
- Simple session resumption
- Checkpoint recovery
- Basic artifact tracking
- Git context recording

**Implementation Priority:**
1. State.json with step tracking
2. Checkpoint markers
3. Git context metadata
4. Resume logic

### Phase 2: Enhanced (Add Artifact Registry)

```
+ artifact-registry.json           # Index for discovery
+ artifact-lineage.json            # Dependencies
```

**Additions:**
- Artifact discovery by type
- Lineage tracking
- Version management

### Phase 3: Scale (Distributed Per-Step)

For workflows > 30 steps:
```
+ runs/{run-id}/steps/
   └── {step-id}.json             # Per-step state
```

---

## Recommendations

### Short-Term (MVP)

1. **Implement centralized state.json** with:
   - Workflow metadata (name, version, inputs)
   - Step tracking (status, outputs, sessionId)
   - Checkpoint markers
   - Git context (branch, commit, uncommitted changes)

2. **Add session management**:
   - Generate unique sessionIds
   - Track session history
   - Implement basic resume logic

3. **Create artifact tracking**:
   - Per-artifact metadata JSON
   - Produced-by and consumed-by tracking
   - Version field

4. **Implement git integration**:
   - Validate branch consistency
   - Warn on uncommitted changes
   - Record commit hashes

### Medium-Term (Enhanced)

1. **Add artifact registry** for discovery
2. **Implement artifact versioning** (major.minor.patch)
3. **Add artifact deprecation** workflow
4. **Support cross-branch artifact usage** with approval gates

### Long-Term (Scale)

1. **Migrate to per-step state** for workflows > 30 steps
2. **Add distributed checkpoint system**
3. **Implement artifact server** for centralized discovery
4. **Add workflow composition** (workflows calling workflows)

---

## Edge Cases & Considerations

### Case 1: Branch Deleted While Workflow Running

**Problem:** Feature branch deleted mid-workflow
**Solution:**
- Detect at each step
- Cache git metadata at start
- Offer options: abort, merge to main, or continue on current commit

### Case 2: Artifact Modified by User

**Problem:** User manually edits artifact.json while workflow paused
**Solution:**
- Detect checksum mismatch on resume
- Warn user and ask: use modified version or revert
- Track manual edits in metadata

### Case 3: Step Produces Multiple Artifacts

**Problem:** `/test:run` produces many test result files
**Solution:**
- Support artifact collections in output
- Use glob patterns: `test-results/*.json`
- Track collection as single logical artifact

### Case 4: Resume After Environment Changes

**Problem:** Resume on different machine with different paths
**Solution:**
- Use relative paths from workflow root
- Store path templates, not absolute paths
- Validate artifact paths on resume

---

## Implementation Checklist

- [ ] Design state.json schema
- [ ] Implement state read/write functions
- [ ] Create checkpoint marking system
- [ ] Implement session ID generation
- [ ] Add git context detection
- [ ] Create resume logic
- [ ] Implement artifact tracking
- [ ] Add artifact metadata JSON
- [ ] Create cleanup/archive system
- [ ] Document recovery procedures
- [ ] Test multi-session workflows
- [ ] Test branch switching scenarios
- [ ] Test artifact discovery
- [ ] Load-test with large workflows

---

## Related Sections

See also:
- Task 9.1: Artifact Discovery Mechanisms
- Task 9.2: Artifact Compatibility Patterns
- Task 8.5: /workflow Command Design
- Phase 2: Workflow Limitations Analysis

---

**Analysis Status: COMPLETE**
