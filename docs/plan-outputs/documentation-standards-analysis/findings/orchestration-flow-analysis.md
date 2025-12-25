# Orchestration Flow Analysis

**Date:** 2025-12-25
**Source:** Documentation Standards Analysis - Extended Analysis
**Purpose:** Identify gaps in the orchestration system that prevent reliable autonomous execution

---

## Executive Summary

Analysis of the complete orchestration flow reveals **6 critical gaps** where orchestration concerns are not addressed. The system currently relies on implicit agent judgment for task ordering, rather than explicit machine-readable constraints. This creates a risk of parallel execution conflicts when tasks should run sequentially.

---

## Orchestration Flow Trace

### Component Chain

```
plan_orchestrator.py
    │
    ├─► get_next_tasks(batch_size)
    │   └─► node scripts/status-cli.js next N
    │       └─► cmdNext() in status-cli.js:373-473
    │
    ├─► _build_prompt()
    │   └─► Lines 601-638 in plan_orchestrator.py
    │
    └─► subprocess.run(["claude", "-p", prompt])
        │
        └─► Claude Code Session
            │
            └─► /plan:implement task1 task2 ... --autonomous
                └─► .claude/commands/plan/implement.md
```

### Data Flow

| Step | Component | Input | Output | Gap? |
|------|-----------|-------|--------|------|
| 1 | `status-cli.js next` | batch_size | `[{id, description, phase, status}]` | **YES** - no ordering metadata |
| 2 | `_build_prompt()` | task list | prompt string | **YES** - no execution notes |
| 3 | Claude session | prompt | executes command | - |
| 4 | `/plan:implement` | task IDs | parsed tasks | **YES** - no constraint parsing |
| 5 | Step 4: Grouping | tasks | execution groups | **YES** - assumes parallel OK |
| 6 | Step 5: Execution | groups | completed tasks | Relies on agent judgment |

---

## Identified Gaps

### Gap 1: status-cli.js `next` Command

**Location:** `scripts/status-cli.js:373-473`

**Issue:** The `next` command returns tasks without any ordering or constraint metadata.

**Current behavior:**
```javascript
next.push({
  id: task.id,
  description: task.description,
  phase: phase.number,
  status: task.status,
  reason: 'pending - ready to implement'
});
```

**Missing:**
- No check for `[SEQUENTIAL]` annotations in plan file
- No file conflict detection between tasks
- No constraint metadata in returned objects

**Risk:** Orchestrator may batch tasks 3.1, 3.2, 3.3, 3.4 together without knowing they must be sequential.

**Recommendation:** Add `sequential` field to task objects when constraint detected:
```javascript
{
  id: "3.1",
  description: "...",
  sequential: true,
  sequentialGroup: "3.1-3.4",
  reason: "Tasks modify same file"
}
```

---

### Gap 2: Prompt Building (_build_prompt)

**Location:** `scripts/plan_orchestrator.py:601-638`

**Issue:** The prompt sent to Claude only includes task ID and description.

**Current prompt:**
```python
return f"""Execute these tasks from the plan:

{task_list}  # Only: "- 1.1: description"

Plan: {status.plan_path}
Progress: {status.percentage}% ...

Run: /plan:implement {task_ids} --autonomous

## Rules
- Execute autonomously...
```

**Missing:**
- No execution notes from plan phases
- No `[SEQUENTIAL]` hints
- No file conflict warnings

**Risk:** Claude has no context about execution constraints unless it reads and parses the plan file itself.

**Recommendation:** Include execution constraints in prompt:
```python
## Execution Constraints
- Tasks 3.1-3.4: [SEQUENTIAL] - all modify orchestrator-system.md
```

---

### Gap 3: /plan:implement Task Parsing (Step 2)

**Location:** `.claude/commands/plan/implement.md` - Section 2

**Issue:** Step 2 instructs to parse tasks but doesn't mention execution notes.

**Current instruction:**
```markdown
**Phases:** Look for headers matching these patterns:
- `## Phase N: Title`

**Tasks:** Within each phase, identify tasks from:
- Checklist items: `- [ ] ID Description`
```

**Missing:**
- No instruction to look for `**Execution Note:**` blocks
- No instruction to parse `[SEQUENTIAL]` annotation
- No structured extraction of constraints

**Recommendation:** Add to Step 2:
```markdown
**Execution Notes:** After phase header, look for constraint blocks:
- `**Execution Note:** Tasks X.X-X.X are [SEQUENTIAL]...`
- Extract task ranges and constraint type
- Store for use in Step 4 (Execution Strategy)
```

---

### Gap 4: /plan:implement Execution Strategy (Step 4)

**Location:** `.claude/commands/plan/implement.md` - Section 4

**Issue:** Current instruction assumes same-phase tasks can parallelize.

**Current instruction:**
```markdown
**Group by phase for execution:**
- Tasks within the SAME phase can run in parallel
- Tasks in DIFFERENT phases must run sequentially
```

**Missing:**
- Check for `[SEQUENTIAL]` before assuming parallel
- File conflict detection logic
- Structured decision tree

**Recommendation:** Update to:
```markdown
**BEFORE grouping, check for constraints:**
1. Parse [SEQUENTIAL] annotations from phase
2. Detect file conflicts in task descriptions
3. Only parallelize if NO constraints apply
```

---

### Gap 5: Parallel Execution Rules Section

**Location:** `.claude/commands/plan/implement.md` - "Parallel Execution Rules"

**Issue:** Rules don't mention `[SEQUENTIAL]` annotation.

**Current rules:**
```markdown
1. Same phase = parallel OK
2. Different phases = sequential
3. Explicit dependencies - If task B mentions task A, run A first
4. Shared files - If two tasks modify the same file, run sequentially
```

**Missing:**
- `[SEQUENTIAL]` annotation takes precedence
- Structured detection logic

**Recommendation:** Add as rule #1:
```markdown
1. [SEQUENTIAL] annotation = ALWAYS sequential (highest priority)
2. Same file = sequential (auto-detect)
...
```

---

### Gap 6: status.json Schema

**Location:** `scripts/lib/schemas/plan-status.json`

**Issue:** No field for task execution ordering or constraints.

**Current task schema:**
```json
{
  "id": "string",
  "description": "string",
  "status": "enum",
  "phase": "string",
  ...
}
```

**Missing:**
- `sequential: boolean`
- `sequentialGroup: string`
- `dependsOn: string[]`

**Recommendation:** Extend schema (optional fields):
```json
{
  "executionConstraints": {
    "sequential": true,
    "sequentialGroup": "3.1-3.4",
    "conflictsWith": ["3.2", "3.3"]
  }
}
```

---

## Impact Assessment

| Gap | Severity | Impact Description |
|-----|----------|-------------------|
| Gap 1 | HIGH | Orchestrator batches tasks without knowing constraints |
| Gap 2 | HIGH | Claude session lacks constraint context |
| Gap 3 | MEDIUM | Constraint parsing is implicit, not explicit |
| Gap 4 | HIGH | Default assumption is "parallel OK" |
| Gap 5 | MEDIUM | Rules don't prioritize [SEQUENTIAL] |
| Gap 6 | LOW | No structured storage for constraints |

---

## Resolution Matrix

| Gap | Resolution Location | Type |
|-----|---------------------|------|
| Gap 1 | status-cli.js | Code change |
| Gap 2 | plan_orchestrator.py | Code change |
| Gap 3 | implement.md | Documentation |
| Gap 4 | implement.md | Documentation |
| Gap 5 | implement.md | Documentation |
| Gap 6 | plan-status.json schema | Schema change |

**Minimum Viable Fix:** Update implement.md (Gaps 3, 4, 5) - ensures Claude respects constraints when reading plan.

**Complete Fix:** All gaps addressed - constraints are machine-readable throughout the pipeline.

---

## Recommended Implementation Order

### Phase A: Documentation Updates (Quick Win)
1. Update `/plan:implement` Step 2 to parse execution notes
2. Update `/plan:implement` Step 4 to check constraints before grouping
3. Update Parallel Execution Rules to prioritize [SEQUENTIAL]

### Phase B: Orchestrator Updates (Code Change)
1. Update `_build_prompt()` to include execution constraints
2. Add [SEQUENTIAL] rules to prompt

### Phase C: Status CLI Updates (Code Change)
1. Update `cmdNext()` to read plan file for constraints
2. Add constraint metadata to returned task objects

### Phase D: Schema Updates (Optional)
1. Extend plan-status.json schema for constraints
2. Populate during plan initialization

---

## Verification Criteria

After implementing fixes:

1. **Documentation test:** Create a plan with `[SEQUENTIAL]` annotation, verify `/plan:implement` respects it
2. **Orchestrator test:** Run orchestrator on plan with sequential tasks, verify they don't parallelize
3. **Status CLI test:** Call `next` on plan with constraints, verify metadata returned

---

## Files Requiring Updates

| File | Gap(s) | Change Type |
|------|--------|-------------|
| `.claude/commands/plan/implement.md` | 3, 4, 5 | Add constraint parsing instructions |
| `scripts/plan_orchestrator.py` | 2 | Add constraints to prompt |
| `scripts/status-cli.js` | 1 | Add constraint detection to cmdNext |
| `scripts/lib/schemas/plan-status.json` | 6 | Add optional constraint fields |
| `docs/plan-outputs/.../proposed-standards.md` | - | Already updated with Section 7 |

---

**End of Analysis**
