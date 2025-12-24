# Task 3.4: Workflow Pattern Support in TUI

## Overview

This document designs TUI support for workflow patterns used in implement-* plans, addressing gaps B1 (Task Dependencies), B2 (Parallel Agent Tracking), G6 (Subtask Grouping), G7 (Artifact Tracking), and G10 (Nested Workflow Support).

---

## Workflow Patterns to Support

From Task 2.2 analysis:

| Pattern | Current Support | Target Support |
|---------|-----------------|----------------|
| Sequential (Phase-Gated) | Phase name only | Full phase visualization |
| Parallel (Fan-Out) | Agent count only | Agent-task mapping |
| Branching (Conditional) | None | Decision tree view |
| Looping (Iteration) | Iteration counter | Per-loop tracking |
| Composition (Nested) | None | Parent-child tracking |

---

## 1. Fan-Out Visualization (Parallel Agents)

### Problem Statement

When `/plan:batch` or parallel Task agents run, users cannot see:
- Which tasks are running in parallel
- Which agent is working on which task
- How to correlate outputs from parallel agents

### Current State

```
Footer: 🤖 Agents: 3
Activity Panel: Shows interleaved tool calls (no grouping)
```

### Proposed Design

#### Agent Tracking Panel

```
┌ Parallel Execution ──────────────────────────────────────┐
│ Batch: 3 agents active (fan-out mode)                    │
│                                                          │
│ ┌─ Agent 1 ──────────┐ ┌─ Agent 2 ──────────┐           │
│ │ Task: 2.1          │ │ Task: 2.2          │           │
│ │ Status: Working    │ │ Status: Working    │           │
│ │ Tools: 12          │ │ Tools: 8           │           │
│ │ [████████░░] 80%   │ │ [██████░░░░] 60%   │           │
│ └────────────────────┘ └────────────────────┘           │
│                                                          │
│ ┌─ Agent 3 ──────────┐                                  │
│ │ Task: 2.3          │                                  │
│ │ Status: Complete ✓ │                                  │
│ │ Tools: 15          │                                  │
│ │ [██████████] 100%  │                                  │
│ └────────────────────┘                                  │
│                                                          │
│ Fan-in: Waiting for 2/3 agents                          │
└──────────────────────────────────────────────────────────┘
```

#### Data Requirements

```typescript
interface ParallelExecutionState {
  mode: 'sequential' | 'fan-out' | 'fan-in';
  batchId: string;

  agents: AgentInfo[];

  fanOut: {
    startedAt: string;
    totalAgents: number;
    completedAgents: number;
  };

  fanIn: {
    waitingFor: string[];  // Agent IDs
    collectorStatus: 'pending' | 'running' | 'complete';
  };
}

interface AgentInfo {
  agentId: string;
  taskId: string;
  taskDescription: string;
  status: 'starting' | 'working' | 'complete' | 'failed';
  toolCalls: number;
  progress: number;  // 0-100 estimated
  startedAt: string;
  completedAt?: string;
  output?: string;
}
```

#### Agent Correlation

Track agent↔task mapping from Claude streaming:

```python
class AgentTracker:
    """Track parallel agent execution."""

    def __init__(self):
        self.agents: Dict[str, AgentInfo] = {}
        self.current_batch_id: Optional[str] = None

    def on_task_tool_start(self, tool_id: str, details: dict):
        """Called when Task tool starts (agent spawned)."""
        agent_id = tool_id
        task_match = re.search(r'task[:\s]+(\d+\.\d+)', details.get('prompt', ''))

        self.agents[agent_id] = AgentInfo(
            agentId=agent_id,
            taskId=task_match.group(1) if task_match else 'unknown',
            status='starting',
            toolCalls=0,
            startedAt=datetime.now().isoformat()
        )

    def on_tool_call(self, agent_id: str, tool_name: str):
        """Called on any tool call within agent."""
        if agent_id in self.agents:
            self.agents[agent_id].toolCalls += 1
            self.agents[agent_id].status = 'working'
```

---

## 2. Branching Decision Points

### Problem Statement

When tasks are split or conditional paths are taken, users cannot see:
- The decision that led to a branch
- The relationship between parent and subtasks
- Which branch is active

### Current State

Split tasks appear as flat list:
```
1.1 Original task
1.1.1 Subtask 1
1.1.2 Subtask 2
1.1.3 Subtask 3
```

### Proposed Design

#### Tree View for Split Tasks

```
┌ Task Hierarchy ──────────────────────────────────────────┐
│                                                          │
│ Phase 2: Analysis                                        │
│ ├─ 2.1 ✓ Analyze command outputs                        │
│ ├─ 2.2 ● Analyze workflow requirements                  │
│ │   ├─ 2.2.1 ✓ Sequential patterns                      │
│ │   ├─ 2.2.2 ● Parallel patterns                        │
│ │   └─ 2.2.3 ◯ Branching patterns                       │
│ ├─ 2.3 ◯ Analyze missing features                       │
│ └─ 2.4 ◯ Analyze command invocation                     │
│                                                          │
│ Legend: ✓ complete ● in_progress ◯ pending ✗ failed     │
└──────────────────────────────────────────────────────────┘
```

#### Decision Point Indicator

Show when a split occurred:

```
┌ Split History ───────────────────────────────────────────┐
│                                                          │
│ 2.2 was split into 3 subtasks at 14:32                   │
│ Reason: Task too large for single implementation         │
│                                                          │
│ Before: "Analyze workflow requirements vs TUI"           │
│ After:                                                   │
│   2.2.1 "Analyze sequential patterns"                   │
│   2.2.2 "Analyze parallel patterns"                     │
│   2.2.3 "Analyze branching patterns"                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Data Requirements

```typescript
interface TaskHierarchy {
  taskId: string;
  parentId?: string;
  children: string[];
  depth: number;

  splitInfo?: {
    splitAt: string;
    reason: string;
    originalDescription: string;
  };
}

interface HierarchyView {
  roots: TaskHierarchy[];  // Top-level tasks
  byId: Map<string, TaskHierarchy>;
  maxDepth: number;
}
```

---

## 3. Loop Iteration Tracking

### Problem Statement

When workflows use iteration patterns:
- Cannot see which iteration is running
- Cannot see iteration history
- Retry loops look like regular iterations

### Current State

```
Header: Iteration 3/50
```

### Proposed Design

#### Iteration Detail Panel

```
┌ Iteration History ───────────────────────────────────────┐
│ Current: Iteration 4 of 50 (max)                         │
│                                                          │
│ Iter │ Started  │ Tasks │ Result                        │
│ ─────┼──────────┼───────┼──────────────────────────────│
│ #1   │ 14:00    │ +5 ✓  │ Completed 5 tasks             │
│ #2   │ 14:15    │ +3 ✓  │ Completed 3 tasks             │
│ #3   │ 14:25    │ +0 ✗  │ Blocked - 2.3 failed          │
│ #4   │ 14:30    │ ...   │ Retrying 2.3                  │
│ ─────┴──────────┴───────┴──────────────────────────────│
│                                                          │
│ Avg iteration: 12m    Tasks/iter: 3.2                   │
└──────────────────────────────────────────────────────────┘
```

#### Retry vs Iteration Distinction

```
┌ Loop Analysis ───────────────────────────────────────────┐
│                                                          │
│ Execution Pattern: Sequential with Recovery              │
│                                                          │
│ Progress Loops (normal):     12                          │
│ Recovery Loops (after fail): 2                           │
│ Empty Loops (blocked):       1                           │
│                                                          │
│ Current state: Recovery loop - retrying 2.3              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Data Requirements

```typescript
interface IterationTracker {
  currentIteration: number;
  maxIterations: number;

  iterations: IterationRecord[];
}

interface IterationRecord {
  number: number;
  startedAt: string;
  completedAt?: string;

  tasksCompleted: string[];
  tasksFailed: string[];

  type: 'progress' | 'recovery' | 'blocked';
  result: string;

  durationSeconds: number;
}
```

---

## 4. Dependency Visualization

### Problem Statement

From Task 2.3 (BLOCKER): Users cannot see task dependencies, blocking relationships, or parallel execution groups.

### Current State

Dependencies calculated in `plan-orchestrator.js:278-289` but not exposed.

### Proposed Design

#### ASCII Dependency Graph

```
┌ Dependencies ────────────────────────────────────────────┐
│                                                          │
│ Phase 2 Dependency Chain:                                │
│                                                          │
│ 2.1 ✓ ─┬─► 2.5 ● ─► 2.6 ◯ (VERIFY)                      │
│        │                                                 │
│ 2.2 ✓ ─┤                                                │
│        │                                                 │
│ 2.3 ✓ ─┤                                                │
│        │                                                 │
│ 2.4 ✓ ─┘                                                │
│                                                          │
│ Critical Path: 2.1 → 2.5 → 2.6 (estimated: 45m)         │
│ Parallel Group: [2.2, 2.3, 2.4] (can run together)      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Compact Dependencies (Inline)

Show in task list:

```
┌ In Progress ─────────────────────────────────────────────┐
│ ► 2.5 Categorize findings...    ◄── [2.1, 2.2, 2.3, 2.4]│
│       └─ 4 blockers resolved ✓                          │
└──────────────────────────────────────────────────────────┘
```

#### Blocked Task Indicator

```
┌ Upcoming ────────────────────────────────────────────────┐
│   2.6 VERIFY: All gaps documented   [BLOCKED]           │
│       └─ Waiting for: 2.5                               │
│   2.7 Design TUI panels                                 │
│       └─ Ready (no blockers)                            │
└──────────────────────────────────────────────────────────┘
```

#### Graph Rendering Algorithm

```python
def render_dependency_graph(tasks: List[Task], deps: Dict[str, List[str]]) -> str:
    """Render ASCII dependency graph."""

    # Build layers (topological sort)
    layers = topological_layers(tasks, deps)

    # Render each layer
    lines = []
    for layer in layers:
        for task in layer:
            status_icon = get_status_icon(task.status)
            dependents = deps.get(task.id, [])

            if dependents:
                arrow = " ─┬─► " if len(dependents) > 1 else " ──► "
                lines.append(f"{task.id} {status_icon}{arrow}{dependents[0]}")
                for dep in dependents[1:]:
                    lines.append(f"      │")
                    lines.append(f"      └─► {dep}")
            else:
                lines.append(f"{task.id} {status_icon}")

    return "\n".join(lines)
```

---

## 5. Artifact Lifecycle Visualization

### Problem Statement

From Task 2.2 (GAP): No visibility into artifact creation, storage, or indexing.

### Current State

Artifacts written to disk but invisible to TUI.

### Proposed Design

#### Artifact Browser Panel

```
┌ Artifacts ───────────────────────────────────────────────┐
│ findings/                                    12 files    │
│ ├─ 1-1-plan-commands-documentation.md       12KB ✓      │
│ ├─ 1-2-tui-panel-data-sources.md            8KB  ✓      │
│ ├─ 2-1-command-output-vs-tui-display.md     5KB  ✓      │
│ ├─ 2-2-workflow-requirements.md             6KB  ●      │  <- New
│ └─ ...                                                   │
│                                                          │
│ Total: 48KB across 12 findings                          │
│ [f View] [↑/↓ Navigate] [Enter Preview]                 │
└──────────────────────────────────────────────────────────┘
```

#### Artifact Creation Indicator

Real-time notification when artifact is created:

```
┌ Activity ────────────────────────────────────────────────┐
│ ...                                                      │
│ 14:32:15 Write docs/plan-outputs/.../2-2-workflow.md    │
│          └─ ✨ New finding: 2-2-workflow-requirements.md │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

#### Data Requirements

```typescript
interface ArtifactRegistry {
  planName: string;
  outputPath: string;

  artifacts: ArtifactInfo[];
  totalSize: number;
  lastUpdated: string;
}

interface ArtifactInfo {
  filename: string;
  path: string;
  type: 'finding' | 'diagram' | 'report' | 'config';
  taskId?: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  preview?: string;  // First 100 chars
}
```

---

## 6. Nested Workflow Support

### Problem Statement

From Task 2.2 (GAP): No support for tracking parent-child workflow relationships.

### Current State

Each plan runs independently; no hierarchy tracking.

### Future Design (Not for Initial Implementation)

#### Workflow Tree

```
┌ Workflow Hierarchy ──────────────────────────────────────┐
│                                                          │
│ main-project                                 [Active]    │
│ ├─ implement-core-feature                    [Complete]  │
│ │   ├─ implement-database-schema             [Complete]  │
│ │   └─ implement-api-endpoints               [Complete]  │
│ ├─ implement-testing                         [Active]    │
│ │   └─ implement-unit-tests                  [Running]   │
│ └─ implement-deployment                      [Pending]   │
│                                                          │
│ Depth: 3    Active workflows: 2    Total tasks: 145     │
└──────────────────────────────────────────────────────────┘
```

#### Data Requirements

```typescript
interface WorkflowHierarchy {
  rootPlan: string;

  nodes: WorkflowNode[];
  depth: number;
}

interface WorkflowNode {
  planPath: string;
  planName: string;
  parentPlan?: string;
  childPlans: string[];

  status: 'pending' | 'active' | 'complete' | 'failed';
  progress: number;

  invokedBy?: {
    parentPlan: string;
    taskId: string;
  };
}
```

**Note:** This is a future capability. Initial implementation should focus on single-plan patterns.

---

## Implementation Priority

| Feature | Addresses | Complexity | Priority |
|---------|-----------|------------|----------|
| Subtask Tree View | G6 | MEDIUM | 1 |
| Inline Blockers | B1 | LOW | 1 |
| Parallel Agent Panel | B2 | HIGH | 2 |
| Iteration History | Enhancement | LOW | 3 |
| Dependency Graph | B1 | HIGH | 3 |
| Artifact Browser | G7 | MEDIUM | 4 |
| Nested Workflows | G10 | HIGH | 5 (future) |

---

## Summary

| Workflow Pattern | TUI Feature | Gap Addressed |
|------------------|-------------|---------------|
| Sequential | Phase visualization | G1 (from 3.1) |
| Parallel/Fan-Out | Agent tracking panel | B2 |
| Branching | Subtask tree view | G6 |
| Looping | Iteration history | Enhancement |
| Dependencies | Graph + inline blockers | B1 |
| Artifacts | Browser panel | G7 |
| Nested | Workflow hierarchy | G10 (future) |

Total new features: 6 (5 for initial, 1 for future)
