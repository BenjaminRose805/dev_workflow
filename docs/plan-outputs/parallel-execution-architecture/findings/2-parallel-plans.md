# Phase 2: Parallel Plans Analysis Findings

**Analysis Plan:** Parallel Execution Architecture
**Tasks Covered:** 2.1, 2.2, 2.3, 2.4, 2.5
**Date:** 2025-12-25

---

## 2.1 Can Multiple Plans Run Concurrently?

### Current State: NO (by design)

The current implementation uses a **single-pointer architecture** that fundamentally prevents concurrent plan execution:

#### The `current-plan.txt` Constraint

From `plan-status.js`:
```javascript
const CURRENT_PLAN_FILE = '.claude/current-plan.txt';

function getActivePlanPath() {
  const pointerPath = resolvePath(CURRENT_PLAN_FILE);
  const content = fs.readFileSync(pointerPath, 'utf8').trim();
  return content || null;
}
```

**Key constraints:**
1. All `plan:*` commands read from the same pointer file
2. Pointer contains exactly one plan path at a time
3. Changing the active plan affects all concurrent sessions
4. No mechanism to pass plan path as an argument (except via pointer)

#### Evidence from status-cli.js

```javascript
function main() {
  // Get active plan path
  const planPath = getActivePlanPath();
  if (!planPath) {
    exitWithError('No active plan set. Use /plan:set to choose a plan first.');
  }
  // All commands operate on this single plan
  ...
}
```

### What Would Happen If You Tried

| Scenario | Result |
|----------|--------|
| Two terminals run `/plan:orchestrate` | Both operate on same plan (as defined by current-plan.txt) |
| User switches plan mid-execution | Active orchestrator suddenly operates on different plan |
| Parallel orchestrators, different plans | Would require manual editing of pointer, still broken |

---

## 2.2 Shared State/Resources Between Plans

### Resource Classification

| Resource | Scope | Shared? | Write Conflict Risk |
|----------|-------|---------|---------------------|
| `.claude/current-plan.txt` | Global (singleton) | **YES** | **HIGH** - single pointer |
| `docs/plans/*.md` | Per-plan | No (read-only during execution) | None |
| `docs/plan-outputs/{plan}/status.json` | Per-plan | **NO** (isolated) | LOW |
| `docs/plan-outputs/{plan}/findings/` | Per-plan | **NO** (isolated) | LOW |
| Git working directory | Global | **YES** | **HIGH** - concurrent commits |
| Filesystem (source files) | Global | **YES** | **MEDIUM** - depends on task overlap |

### Shared State Details

#### 1. Active Plan Pointer (`current-plan.txt`)

**Type:** Global singleton
**Updated by:** `plan:set`, `plan:create`
**Read by:** All other plan commands

```
.claude/current-plan.txt
  └── "docs/plans/active-plan.md"  ← Single value
```

**Problem:** No locking mechanism. If two processes read at the same time, both get same path. If one writes while another reads, race condition.

#### 2. Git Repository State

**Type:** Global, shared across all plans
**Updated by:** Task completion commits (per-task)
**Read by:** Pre-execution validation

Concurrent commits from different plans would create:
- Merge conflicts on shared files
- Interleaved commit history
- Potential branch divergence

#### 3. Source Files in Working Directory

**Type:** Global, varies by plan overlap
**Risk Level:** Depends on whether plans modify same files

| Plan A modifies | Plan B modifies | Risk |
|-----------------|-----------------|------|
| `src/auth.ts` | `tests/auth.test.ts` | LOW (different files) |
| `src/api.ts` | `src/api.ts` | **HIGH** (same file) |
| `docs/*.md` | `src/*.ts` | LOW (different domains) |

### Isolated Resources

The output directory structure provides plan-level isolation:

```
docs/plan-outputs/
├── plan-a/
│   ├── status.json       ← Isolated per plan
│   ├── findings/         ← Isolated per plan
│   └── timestamps/       ← Isolated per plan
├── plan-b/
│   ├── status.json       ← Isolated per plan
│   └── ...
```

This isolation is intentional and well-designed.

---

## 2.3 Potential Conflicts

### Conflict Matrix

| Resource | Conflict Type | Severity | When It Occurs |
|----------|---------------|----------|----------------|
| `current-plan.txt` | Pointer overwrite | **CRITICAL** | Any `/plan:set` during execution |
| `status.json` | None (if isolated) | N/A | Isolated per plan |
| Git commits | History interleaving | HIGH | Tasks complete in both plans |
| Git working tree | File modification race | **CRITICAL** | Same file modified |
| Claude context | Session confusion | MEDIUM | Switching plans mid-conversation |

### Conflict Scenarios

#### Scenario 1: Pointer Overwrite

```
Time T0: User A runs /plan:orchestrate (plan: auth-impl)
         → Reads current-plan.txt = "auth-impl"
Time T1: User B runs /plan:set api-refactor
         → Writes current-plan.txt = "api-refactor"
Time T2: User A's task completes, gets next tasks
         → Reads current-plan.txt = "api-refactor" (WRONG!)
         → Operates on wrong plan's status.json
```

**Result:** Task marked complete in wrong plan, potential data corruption.

#### Scenario 2: Git Conflict

```
Time T0: Plan A task 1.1 modifies src/utils.ts
Time T0: Plan B task 2.1 modifies src/utils.ts
Time T1: Plan A commits: "task 1.1: Add helper function"
Time T2: Plan B commits: "task 2.1: Refactor utils"
         → CONFLICT: divergent changes
```

**Result:** Git commit fails, task marked failed, manual resolution needed.

#### Scenario 3: File Lock (Theoretical)

Current implementation has NO file locking. This is both a feature (simplicity) and a risk.

```javascript
// From plan-status.js - writeFileAtomic uses temp + rename
function writeFileAtomic(filePath, content) {
  const tempPath = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);  // Atomic on POSIX
}
```

This prevents partial writes but doesn't prevent logical race conditions.

### Status Tracking Conflicts (Unlikely)

Since status.json is per-plan and path-isolated, direct conflicts are unlikely IF:
1. Each plan has its own output directory (current design)
2. Tasks don't cross-reference other plans' state

However, summary recalculation could drift if:
- Two processes update same plan's status.json simultaneously
- This shouldn't happen with single-plan constraint, but would be a risk if removed

---

## 2.4 Plan Isolation Requirements

### Current Isolation Level: PARTIAL

| Dimension | Current State | Required for Full Isolation |
|-----------|---------------|----------------------------|
| Status tracking | ✅ Isolated | Already achieved |
| Findings output | ✅ Isolated | Already achieved |
| Plan definition | ✅ Read-only | Already achieved |
| Active pointer | ❌ Shared | Needs per-session or per-plan |
| Git operations | ❌ Shared | Needs branch-per-plan or queuing |
| File system | ❌ Shared | Needs conflict detection |

### Requirements for Full Parallel Plan Execution

#### R1: Plan Context Isolation

**Problem:** `current-plan.txt` is a singleton
**Requirement:** Each execution context needs its own plan reference

**Options:**

| Approach | Complexity | Pros | Cons |
|----------|------------|------|------|
| Environment variable | LOW | Simple, no file changes | Easy to forget |
| Command-line argument | MEDIUM | Explicit, clear | Changes all commands |
| Session-scoped pointer | HIGH | Transparent | Requires session tracking |
| Per-worktree pointer | MEDIUM | Natural with git worktrees | Requires worktree setup |

**Recommended:** Command-line argument with fallback to `current-plan.txt`

```bash
# Proposed interface
node scripts/status-cli.js --plan docs/plans/my-plan.md status
```

#### R2: Git Operation Isolation

**Problem:** Tasks commit to same branch/working directory
**Requirement:** Parallel plans need separate git contexts or serialized commits

**Options:**

| Approach | Complexity | Pros | Cons |
|----------|------------|------|------|
| Serial commits (queue) | LOW | Works today | Eliminates parallelism benefit |
| Branch per plan | MEDIUM | Clean isolation | Merge complexity |
| Git worktrees | MEDIUM | Full isolation | Setup overhead |
| Stacked commits (rebase) | HIGH | Clean history | Complex automation |

**Recommended:** Git worktrees for true parallelism, serial queue for quick wins

#### R3: File System Conflict Detection

**Problem:** Multiple plans may modify same files
**Requirement:** Detect and prevent concurrent file modifications

**Options:**

| Approach | Complexity | Pros | Cons |
|----------|------------|------|------|
| Plan dependency declaration | LOW | Explicit, plan-level | Manual, may miss files |
| Pre-execution file analysis | MEDIUM | Automatic detection | Adds latency |
| Lock files (.lock) | MEDIUM | Standard pattern | Lock cleanup issues |
| File modification events | HIGH | Real-time detection | OS-specific, complex |

**Recommended:** Pre-execution file analysis + plan dependency hints

### Minimum Viable Isolation

For **basic parallel plan support**, these are the must-haves:

1. **Plan path passed explicitly** (not just via pointer)
2. **Conflict detection before execution** (file overlap check)
3. **Git operation queue** (prevent concurrent commits)

For **full parallel plan support**, add:

4. **Git worktrees** (per-plan working directory)
5. **Lock manager** (prevent file modification races)
6. **Resource scheduler** (coordinate shared resource access)

---

## 2.5 Patterns for Inter-Plan Coordination

### Pattern 1: Independent Plans (No Coordination)

**When to use:** Plans modify completely disjoint file sets

```
Plan A: docs/api-documentation/
Plan B: src/cli/

No overlap → Run independently
```

**Implementation:** Add file manifest to plan, check overlap before parallel execution

### Pattern 2: Sequential Plans (Queue)

**When to use:** Plans overlap significantly or share critical resources

```
Plan A: Core refactoring
Plan B: Test updates (depends on A)

Queue: A → B
```

**Implementation:** Plan dependency declaration in metadata

```yaml
# In plan header
dependencies:
  - plan: core-refactoring
    status: completed
```

### Pattern 3: Resource-Based Coordination

**When to use:** Plans need same resources at different times

```
Plan A: Phase 1 modifies src/api.ts
Plan A: Phase 2 modifies docs/
Plan B: Phase 1 modifies tests/
Plan B: Phase 2 modifies src/api.ts

Coordination: A.Phase1 → B.Phase2 wait
              B.Phase1 runs in parallel with A.Phase1
```

**Implementation:** Resource lock table

```json
{
  "locks": [
    {"resource": "src/api.ts", "plan": "plan-a", "until": "phase-1-complete"}
  ]
}
```

### Pattern 4: Worktree Isolation

**When to use:** Full parallelism needed, plans modify overlapping files

```
/project/
├── .git/                    ← Shared repo
├── worktrees/
│   ├── plan-a/              ← Full checkout for plan A
│   │   └── .claude/current-plan.txt → plan-a
│   └── plan-b/              ← Full checkout for plan B
│       └── .claude/current-plan.txt → plan-b
```

**Implementation:** Each plan gets git worktree, Claude sessions bound to worktree

### Pattern 5: Plan Orchestration Layer

**When to use:** Complex multi-plan projects with dependencies

```
Meta-Orchestrator
├── Plan A (priority: high, branch: feature/auth)
├── Plan B (priority: low, depends: A.phase2)
└── Plan C (priority: medium, no-deps)

Execution:
1. Start A, C in parallel (different branches)
2. Wait for A.phase2
3. Start B
4. Merge all when complete
```

**Implementation:** New `/plan:orchestrate-multi` command or enhancement to existing

### Coordination Pattern Comparison

| Pattern | Parallelism | Complexity | Use Case |
|---------|-------------|------------|----------|
| Independent | Full | Low | Disjoint file sets |
| Sequential Queue | None | Low | High overlap |
| Resource Locks | Partial | Medium | Occasional overlap |
| Worktrees | Full | Medium | Same files, different branches |
| Meta-Orchestrator | Full | High | Enterprise/multi-team |

### Recommended Implementation Priority

1. **Quick Win:** Independent plan detection (file manifest comparison)
2. **Medium Term:** Plan dependency declaration + sequential queue
3. **Long Term:** Git worktree integration with per-worktree pointers
4. **Future:** Meta-orchestrator for complex project coordination

---

## Summary

### Key Findings

| Finding | Impact | Recommendation |
|---------|--------|----------------|
| Single `current-plan.txt` pointer | **BLOCKING** | Add `--plan` argument to all commands |
| Git operations share working dir | HIGH | Implement commit queue or worktrees |
| Status.json already isolated | ✅ GOOD | No changes needed |
| No file conflict detection | MEDIUM | Add pre-execution overlap check |
| No plan dependency system | MEDIUM | Add metadata-based dependencies |

### Conflict Prevention Matrix

| Conflict Type | Prevention Strategy | Implementation Effort |
|---------------|--------------------|-----------------------|
| Pointer overwrite | Explicit plan argument | LOW |
| Git commit race | Serial commit queue | LOW |
| File modification race | Pre-execution detection + block | MEDIUM |
| Session confusion | Plan-scoped context | MEDIUM |

### Architecture Evolution Path

```
Current State:
  Single plan → Single pointer → Single execution

Phase 1 (Quick Wins):
  Single plan → Explicit argument → Multiple sessions possible
  + Serial git commit queue

Phase 2 (Medium Term):
  Multiple plans → Resource locks → Controlled parallelism
  + Dependency declarations
  + Conflict detection

Phase 3 (Full Parallelism):
  Multiple plans → Worktrees → Full isolation
  + Meta-orchestrator
  + Branch management
```
