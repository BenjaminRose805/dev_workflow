# Migrate Plan to Output-Separated Format

Migrate an old plan with inline checkmarks to the new output-separated format with `status.json` tracking.

## Instructions

### 1. Load Active Plan

Read `.claude/current-plan.txt` to get the active plan path.

**If no active plan:**
```
No active plan set.

Use /plan:set to choose a plan first.
```

### 2. Check Current Status

Check if the plan already has status tracking:
- Look for output directory: `docs/plan-outputs/{plan-name}/`
- Look for status file: `docs/plan-outputs/{plan-name}/status.json`

**If status.json already exists:**
```
This plan already uses the output-separated format.

Status file: docs/plan-outputs/{plan-name}/status.json
Last updated: {timestamp}

No migration needed.
```

Stop execution - migration not needed.

### 3. Parse Plan File for Completed Tasks

Read the plan markdown file and extract all tasks with their completion state.

**Use `parsePhases(content)` from markdown-parser.js:**
```javascript
const { parsePhases, getTitle } = require('./scripts/lib/markdown-parser');
const { readFile } = require('./scripts/lib/file-utils');

const content = readFile(planPath);
const title = getTitle(content) || path.basename(planPath, '.md');
const phases = parsePhases(content);
```

**The parser automatically extracts:**
- Task IDs (e.g., "0.1", "1.2", "2.3")
- Task titles and descriptions
- Completion status (based on `[x]` vs `[ ]`)
- Phase grouping

**Count tasks by status:**
```javascript
let completedTasks = [];
let pendingTasks = [];

for (const phase of phases) {
  for (const task of phase.tasks) {
    if (task.complete) {
      completedTasks.push(task.id);
    } else {
      pendingTasks.push(task.id);
    }
  }
}
```

### 4. Show Migration Preview

Display what will be migrated:

```
═══════════════════════════════════════════════════════
                  MIGRATION PREVIEW
═══════════════════════════════════════════════════════

Plan: Test Suite Implementation Plan
File: docs/plans/test-suite-implementation.md

Found {total} tasks across {phaseCount} phases:
  ✓ {completedCount} completed tasks
  ◯ {pendingCount} pending tasks

Output will be created at:
  docs/plan-outputs/{plan-name}/
  ├── status.json
  ├── findings/
  └── timestamps/

Completed tasks detected:
  ✓ 0.1 Move e2e/ → tests/e2e/
  ✓ 0.2 Move e2e/fixtures/test-project.ts → tests/fixtures/
  ✓ 1.1 websocket-connection.test.ts
  ...

═══════════════════════════════════════════════════════

Proceed with migration? (y/n)
```

**Ask for user confirmation using AskUserQuestion.**

### 5. Perform Migration

If user confirms:

**Step 5.1: Initialize Status Tracking**

Use the status-manager to create the output structure:

```javascript
const { initializePlanStatus } = require('./scripts/lib/status-manager');

const result = initializePlanStatus(planPath);
if (!result.success) {
  console.error(`Failed to initialize status: ${result.error}`);
  return;
}

console.log('✓ Created output directory structure');
console.log('✓ Initialized status.json');
```

**Step 5.2: Mark Completed Tasks**

For each completed task found in the markdown:

```javascript
const { markTaskCompleted } = require('./scripts/lib/status-manager');

for (const taskId of completedTasks) {
  markTaskCompleted(planPath, taskId);
  console.log(`✓ Marked ${taskId} as completed`);
}
```

**Step 5.3: Extract Inline Findings (Optional)**

Look for inline findings or notes that should be moved to findings files.

**Common patterns to detect:**
- Code blocks after a completed task
- Nested bullet points under `[x]` items with analysis/results
- Sections with headers like "Results:", "Output:", "Analysis:"

**Note:** This is a best-effort extraction. Some manual review may be needed.

### 6. Update Plan File (Optional)

**Ask user if they want to clean up the plan file:**

```
Migration complete!

Do you want to clean up the plan markdown file?
This will:
  - Remove inline checkmarks (replace [x] and [ ] with -)
  - Keep all task descriptions and structure
  - Original file will be backed up

The plan will become reusable as a template.

Clean up? (y/n)
```

**If user confirms:**

1. **Create backup:**
```javascript
const fs = require('fs');
const backupPath = planPath.replace('.md', '.backup.md');
fs.copyFileSync(planPath, backupPath);
console.log(`✓ Backed up to ${backupPath}`);
```

2. **Remove checkmarks:**
```javascript
const cleanContent = content
  .replace(/^(\s*)-\s*\[x\]\s*/gmi, '$1- ')
  .replace(/^(\s*)-\s*\[\s*\]\s*/gmi, '$1- ');

writeFile(planPath, cleanContent);
console.log('✓ Removed inline checkmarks');
```

### 7. Display Migration Summary

```
═══════════════════════════════════════════════════════
                MIGRATION COMPLETE
═══════════════════════════════════════════════════════

Plan: Test Suite Implementation Plan

Output directory created:
  docs/plan-outputs/test-suite-implementation/

Status tracking initialized:
  ✓ status.json created
  ✓ {completedCount} tasks marked as completed
  ✓ {findingsCount} findings files created

Progress: {percentage}% ({completedCount}/{totalCount} tasks)

Next steps:
  → /plan:status - View current status
  → /plan:implement - Continue working on tasks

═══════════════════════════════════════════════════════
```

**Update the current plan output pointer:**

The `initializePlanStatus()` function already handles this, but verify:

```javascript
const { getCurrentOutputDir } = require('./scripts/lib/status-manager');
const outputDir = getCurrentOutputDir();
console.log(`Active output directory: ${outputDir}`);
```

## Migration Validation

After migration, verify the status.json structure:

**Required fields:**
```json
{
  "planPath": "docs/plans/example.md",
  "planName": "Plan Title",
  "createdAt": "2025-12-18T...",
  "lastUpdatedAt": "2025-12-18T...",
  "currentPhase": "Phase 0: ...",
  "tasks": [
    {
      "id": "0.1",
      "phase": "Phase 0: ...",
      "description": "Task description",
      "status": "completed",
      "completedAt": "2025-12-18T..."
    }
  ],
  "runs": [],
  "summary": {
    "totalTasks": 30,
    "completed": 5,
    "pending": 25,
    "failed": 0,
    "skipped": 0
  }
}
```

**If validation fails:**
```
⚠️ Warning: Generated status.json may be incomplete

Please verify: docs/plan-outputs/{plan-name}/status.json

Run /plan:status to check for issues.
```

## Error Handling

**If plan file cannot be read:**
```
Error: Cannot read plan file: {planPath}

The file may have been moved or deleted.
Run /plan:set to choose a valid plan.
```

**If output directory creation fails:**
```
Error: Failed to create output directory

Check permissions for: docs/plan-outputs/

Migration aborted.
```

**If no tasks found in plan:**
```
Warning: No tasks detected in plan file

This may be:
  - An empty plan
  - A plan with non-standard formatting
  - A plan without checkbox tasks

Migration aborted.
```

**If some tasks fail to migrate:**
- Log which tasks failed
- Continue with remaining tasks
- Report failures in summary
- Suggest manual review

```
⚠️ Migration completed with warnings

Successfully migrated: {successCount}/{totalCount} tasks

Failed to migrate:
  ✗ 2.5 - Could not parse task ID
  ✗ 3.1 - Invalid task structure

Manual review recommended for failed tasks.
```

## Batch Migration

**Optional: Migrate all plans in docs/plans/**

If user runs `/plan:migrate --all`:

1. Scan all `.md` files in `docs/plans/`
2. Filter out plans that already have status.json
3. Present list of plans to migrate
4. Confirm migration
5. Migrate each plan sequentially
6. Show summary for all migrations

**Example output:**
```
Found 5 plans eligible for migration:

  1. test-suite-implementation.md (18/30 tasks complete)
  2. websocket-migration.md (0/15 tasks complete)
  3. documentation-updates.md (12/12 tasks complete)
  4. performance-optimization.md (3/20 tasks complete)
  5. ui-improvements.md (5/25 tasks complete)

Migrate all? (y/n)
```

## Include Completed Plans

To also migrate plans from `docs/completed plans/`:

```
/plan:migrate --include-completed
```

This will include archived plans in the migration. See `/plan:archive` for details.

## See Also

- `/plan:set` - Switch to a different plan
- `/plan:status` - View migration results
- `/plan:implement` - Start working with migrated plan
- `/plan:verify` - Verify migration accuracy
- `/plan:archive` - Manage archived/completed plans
