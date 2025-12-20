# Plan Status

Show progress summary for the active plan.

## Instructions

### 1. Load Active Plan

Read `.claude/current-plan.txt` to get the active plan path.

**If no active plan:**
```
No active plan set.

Use /plan:set to choose a plan, or /plan:create to create one from a template.
```

### 2. Check for Status Tracking (Output Separation)

First, check if the plan has status tracking enabled by looking for:
- Output directory: `docs/plan-outputs/{plan-name}/`
- Status file: `docs/plan-outputs/{plan-name}/status.json`

**If status.json exists:**
- Use it as the primary source of task status
- This provides more accurate timing, run history, and task state
- Skip step 3 (parsing plan file) - use status.json data instead
- Show additional info: run count, last updated time, execution history

**If status.json does NOT exist:**
- Fall back to parsing the plan file markdown (step 3)
- Suggest running `/plan:init` to enable status tracking

### 3. Parse Plan File (Fallback)

If no status.json, read the plan file and extract:

**Metadata:**
- Plan title (first `#` heading)
- Template source (if present in Overview section)
- Creation date (if present)

**Phases:**
- Count total phases (`## Phase N:` or `### Phase N:`)
- Track phase names

**Tasks:**
- Count complete tasks: `- [x]`
- Count incomplete tasks: `- [ ]`
- Group by phase

**Success Criteria (if present):**
- Count complete criteria
- Count incomplete criteria

### 3. Calculate Progress

**Overall progress:**
```
completed_tasks / total_tasks * 100 = progress_percentage
```

**Phase progress:**
```
For each phase:
  phase_complete = phase_completed_tasks / phase_total_tasks * 100
```

**Estimated remaining work:**
- Count incomplete tasks
- Note blocked tasks if detectable

### 4. Display Status Summary

```
═══════════════════════════════════════════════════════
                     PLAN STATUS
═══════════════════════════════════════════════════════

Plan: Test Suite Implementation Plan
File: docs/plans/test-suite-implementation.md
Template: test-creation.md (if applicable)

═══ Overall Progress ═══

████████████░░░░░░░░ 60% complete

Tasks: 18/30 complete (12 remaining)
Phases: 3/5 complete

═══ Phase Breakdown ═══

Phase 0: Test Directory Restructure
████████████████████ 100% (5/5 tasks)
✓ Complete

Phase 1: Critical Unit Tests
████████████████░░░░ 80% (4/5 tasks)
⟳ In progress - 1 task remaining

Phase 2: Mock CLI & Integration
████████░░░░░░░░░░░░ 40% (2/5 tasks)
⟳ In progress - 3 tasks remaining

Phase 3: Integration Tests
░░░░░░░░░░░░░░░░░░░░ 0% (0/5 tasks)
◯ Not started

Phase 4: E2E Tests
░░░░░░░░░░░░░░░░░░░░ 0% (0/10 tasks)
◯ Not started

═══ Success Criteria ═══

2/5 criteria met (40%)

✓ Target coverage achieved
✓ All tests pass
◯ No false positives
◯ Tests are maintainable
◯ Documentation complete

═══ Quick Actions ═══

→ /plan:implement - Work on next task
→ /plan:batch - Execute multiple tasks
→ /plan:verify - Check task completion status

═══════════════════════════════════════════════════════
```

### 4b. Display Status Summary (With status.json)

When status.json exists, show enhanced information:

```
═══════════════════════════════════════════════════════
                     PLAN STATUS
═══════════════════════════════════════════════════════

Plan: Test Suite Implementation Plan
File: docs/plans/test-suite-implementation.md
Output: docs/plan-outputs/test-suite-implementation/

═══ Overall Progress ═══

████████████░░░░░░░░ 60% complete

Tasks: 18/30 complete (12 remaining)
Phases: 3/5 complete

═══ Status Tracking ═══

Status Source: status.json ✓
Last Updated: 2025-12-18 15:30:45
Execution Runs: 3

═══ Current Run ═══

Run ID: run-1734567890123
Started: 2025-12-18 15:00:00
Tasks Completed: 5
Tasks Failed: 0

═══ Phase Breakdown ═══

(same as markdown-based display)

═══ Recent Activity ═══

✓ 1.4 websocket-connection.test.ts (2m 34s)
✓ 1.3 api-utils.test.ts (1m 12s)
⟳ 1.5 advance/route.test.ts (in progress)

═══ Quick Actions ═══

→ /plan:implement - Work on next task
→ /plan:batch - Execute multiple tasks
→ /plan:verify - Check task completion status

═══════════════════════════════════════════════════════
```

### 5. Identify Next Actions

**Suggest next steps based on status:**

```
Recommended next action:

Phase 1 has 1 remaining task:
  ◯ 1.5 advance/route.test.ts

Run: /plan:implement to continue
```

**If plan is complete:**
```
🎉 All tasks complete!

Success Criteria: 5/5 met

This plan is ready to be archived.
Run /plan:set to switch to another plan.
```

**If blocked:**
```
⚠️ Progress blocked

Task 2.2 is blocked by:
  - Task 2.1 (mock-claude-cli.ts) not complete

Recommendation: Complete task 2.1 first
```

## Compact Mode

If called with `--compact` or `-c`, show minimal output:

```
Plan: Test Suite Implementation Plan
Progress: 60% (18/30 tasks)
Current Phase: Phase 1 - Critical Unit Tests (4/5)
Next Task: 1.5 advance/route.test.ts
```

## Output Formatting

**Progress bar characters:**
- Filled: `█` (U+2588)
- Empty: `░` (U+2591)
- Width: 20 characters = 100%

**Status indicators:**
- `✓` Complete
- `⟳` In progress
- `◯` Not started
- `⚠️` Blocked/Warning

**Colors (if terminal supports):**
- Green: Complete items
- Yellow: In progress
- Gray: Not started
- Red: Blocked/Failed

## Error Handling

**If plan file not found:**
```
Error: Plan file not found: docs/plans/example.md

The file may have been moved or deleted.
Run /plan:set to choose a different plan.
```

**If plan file is empty or malformed:**
```
Warning: Could not parse plan file

No phases or tasks detected in: docs/plans/example.md

The plan may be empty or use a non-standard format.
```

## Integration

**Works with scan-plans.js:**
```bash
node scripts/scan-plans.js | jq '.plans[] | select(.path | endswith("current-plan.md"))'
```

This provides the same data in JSON format for programmatic access.

## See Also

- `/plan:set` - Change active plan
- `/plan:implement` - Work on tasks
- `/plan:verify` - Detailed task verification
- `/plan:batch` - Execute multiple tasks
