# Plan Orchestrator Agent

Autonomously execute a plan from start to finish. This command runs continuously until the plan is complete or blocked.

## CRITICAL: Autonomous Execution Rules

**DO NOT STOP** until one of these conditions is met:
1. Plan is 100% complete
2. All remaining tasks are blocked/failed with no retry options
3. User explicitly interrupts

**DO NOT** ask for confirmation between tasks - just keep executing.
**DO NOT** use Skill() invocations - implement directly using Task agents.
**DO** batch multiple tasks together for efficiency.
**DO** report progress after each batch, then immediately continue.

---

## Instructions

### 1. Initialize

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Load current state:**
```bash
node scripts/status-cli.js status
```

Parse the JSON response for:
- `planPath` - Active plan file
- `percentage` - Completion percentage
- `completed`, `pending`, `inProgress`, `failed` - Task counts
- `total` - Total task count

**If no active plan or percentage is 100:**
- If no plan: Output "No active plan. Use /plan:set to choose a plan first." and STOP.
- If 100% complete: Output completion summary and STOP.

**Read the plan file** to understand task details and context.

### 2. Main Execution Loop

**REPEAT THE FOLLOWING UNTIL COMPLETE:**

#### Step 2.1: Get Next Tasks (DAG-Aware)

```bash
node scripts/status-cli.js next 5
```

This returns the next recommended tasks (up to 5) **using dependency-graph-aware selection**.

**DAG-aware behavior (Task 7.1):**
- Tasks are selected based on their dependencies, not just phase order
- A task is "ready" when all its dependencies are completed or skipped
- Cross-phase execution is enabled: task 3.1 can start before Phase 2 completes if its dependencies are met
- The output includes dependency metadata for each task

**Parse the JSON response:**
```json
{
  "count": 3,
  "tasks": [
    {
      "id": "2.1",
      "description": "Create auth middleware",
      "phase": 2,
      "dependencies": ["1.1", "1.2"],
      "dependents": ["2.2", "2.3"],
      "reason": "pending - ready to implement"
    }
  ],
  "crossPhaseExecution": true,
  "activePhases": [2, 3]
}
```

**If no tasks returned:**
- Check for failed tasks that need retry
- Check `blockedTaskCount` in response - tasks may be blocked by dependencies
- If truly blocked, output status and STOP
- Otherwise, continue

#### Step 2.2: Execute Tasks in Parallel

For each batch of tasks (up to 3-5 at a time), launch **parallel Task agents**:

```
Use the Task tool with subagent_type="general-purpose" for each task.

Launch them IN PARALLEL by including multiple Task tool calls in a single response.
```

**Task agent prompt template:**
```
You are implementing task {task_id} from plan: {plan_path}

## Task Details
- ID: {task_id}
- Description: {task_description}
- Phase: {phase_name}

## Instructions
1. Read the full plan file to understand context
2. Read the task's detailed instructions in the plan
3. Mark the task as started:
   ```bash
   node scripts/status-cli.js mark-started {task_id}
   ```
4. Implement the task completely
5. When done, mark the task complete with notes:
   ```bash
   node scripts/status-cli.js mark-complete {task_id} --notes "Brief summary of what was done"
   ```
6. If the task fails, mark it failed:
   ```bash
   node scripts/status-cli.js mark-failed {task_id} --error "Description of what went wrong"
   ```

## Output
Summarize what you implemented and any issues encountered.
```

#### Step 2.3: Collect Results

Wait for all parallel agents to complete using TaskOutput.

For each result:
- If successful: Note completion
- If failed: Log error, may retry later

#### Step 2.4: Report Progress

Output a brief status update:
```
═══════════════════════════════════════════════════════════════
PROGRESS: {completed}/{total} ({percentage}%)
═══════════════════════════════════════════════════════════════
Completed: {task_ids_just_done}
Remaining: {pending_count} tasks
Next: {next_task_ids}
═══════════════════════════════════════════════════════════════
```

#### Step 2.5: Loop Back

**IMMEDIATELY** go back to Step 2.1. Do not wait for user input.

Continue until:
- `percentage == 100` → Output completion summary and STOP
- All tasks blocked/failed → Output blocker summary and STOP

---

### 3. Completion

When plan reaches 100%:

```
═══════════════════════════════════════════════════════════════
PLAN COMPLETE
═══════════════════════════════════════════════════════════════

Plan: {plan_name}
Total Tasks: {total}
Completed: {completed}
Failed: {failed}
Skipped: {skipped}

Output Directory: {output_dir}
═══════════════════════════════════════════════════════════════
```

---

## Execution Strategy

### Parallelization Rules (DAG-Aware)

The orchestrator uses dependency-graph-aware scheduling:

1. **Dependency-first**: Tasks run when their dependencies are complete (not phase-order)
2. **Cross-phase execution**: Tasks from different phases can run together if dependencies allow
3. **File conflicts**: Tasks modifying the same file are serialized automatically
4. **[SEQUENTIAL] tasks**: Tasks marked `[SEQUENTIAL]` in the plan run one at a time

**Example DAG execution:**
```
Phase 1: [1.1, 1.2]  ─┬─► Both complete
                      │
Phase 2: [2.1 (deps: 1.1)]  ─► 2.1 ready when 1.1 completes (not waiting for 1.2)
Phase 3: [3.1 (deps: 1.1)]  ─► 3.1 ready when 1.1 completes (cross-phase parallelism!)
```

**Command options:**
- `node scripts/status-cli.js next 5 --phase-priority` - Prefer tasks from earlier phases
- `node scripts/status-cli.js next 5 --ignore-deps` - Bypass dependency checking (use with caution)

### Batch Sizes

| Plan Size | Batch Size | Rationale |
|-----------|------------|-----------|
| < 10 tasks | 2-3 | Small plan, quick iteration |
| 10-30 tasks | 3-4 | Medium plan, balanced |
| > 30 tasks | 4-5 | Large plan, maximize throughput |

### Error Handling

**Task fails:**
1. Mark as failed in status.json
2. Check if blocker for other tasks (tasks with this task as a dependency)
3. Continue with non-dependent tasks
4. Retry failed tasks at end (max 2 retries)

**Blocked tasks (dependency-related):**
1. If `next` returns `blockedTaskCount > 0`, tasks are waiting on dependencies
2. Check dependency graph: `node scripts/status-cli.js deps --graph`
3. A task is blocked if any of its dependencies are pending/in_progress/failed
4. Blocked tasks become ready automatically when blockers complete

**Agent timeout:**
1. Default timeout: 10 minutes per task
2. If timeout, mark task as failed
3. Continue with other tasks (dependents become blocked)

---

## Arguments

| Argument | Description |
|----------|-------------|
| (none) | Run full orchestration until complete |
| `--phase:N` | Only execute tasks in phase N |
| `--max-tasks:N` | Stop after N tasks completed |
| `--dry-run` | Show execution plan without running |

---

## Example Execution Flow

```
1. Initialize
   └── Status: 11/39 (28%), Phase 3 in progress

2. Get next tasks
   └── Tasks: 3.3, 3.4, 4.1

3. Launch parallel agents
   ├── Agent 1: Task 3.3 (background)
   ├── Agent 2: Task 3.4 (background)
   └── Agent 3: Task 4.1 (background)

4. Collect results
   ├── 3.3: Completed
   ├── 3.4: Completed
   └── 4.1: Completed

5. Report progress
   └── PROGRESS: 14/39 (36%)

6. Loop back to step 2
   └── Get next tasks: 4.2, 4.3, 4.4

... continue until 100% ...
```

---

## Important Notes

- **Autonomous execution** - Do not stop for confirmations
- **DAG-aware scheduling** - Tasks run based on dependencies, not just phase order
- **Cross-phase parallelism** - Tasks from different phases can execute together
- **Parallel agents** - Always batch tasks for efficiency
- **Direct implementation** - Do not use Skill() invocations
- **Progress visibility** - Report after each batch
- **Graceful failures** - Continue despite individual task failures (dependents become blocked)
- **Dependency metadata** - Each task includes `dependencies` and `dependents` arrays
