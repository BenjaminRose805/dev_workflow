# Verify Plan Task(s)

Check if task(s) are still needed, already done, blocked, or obsolete.

## Instructions

### 1. Load Active Plan and Initialize Status

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

**Quick reference:**
1. Read `.claude/current-plan.txt` to get the active plan path
2. If no active plan: inform user "No active plan set. Use /plan:set to choose a plan first." and stop
3. Initialize status tracking if needed: `initializePlanStatus(planPath)`
4. Load current status: `getStatus(planPath, true)`

### 1.5. Parse Arguments (if provided)

If arguments are passed to this skill, parse them to determine which tasks to verify:

**Argument formats supported:**

| Format | Example | Behavior |
|--------|---------|----------|
| Single task ID | `1.1` | Verify task 1.1 only |
| Multiple task IDs | `1.1 1.2 1.3` | Verify listed tasks |
| Phase selector | `phase:1` or `p:1` | All tasks in Phase 1 |
| All tasks | `all` | All tasks (pending and completed) |
| No arguments | (empty) | Interactive selection (step 3) |

**Parsing logic:**

```
args = skill arguments (may be empty)

if args is empty:
    → Continue to step 3 (interactive selection)

if args == "all":
    → Select all tasks (pending and completed)
    → Skip to step 4

if args matches /^p(hase)?:\d+$/i:
    → Extract phase number
    → Select all tasks in that phase
    → Skip to step 4

if args matches /^[\d.]+([\s,]+[\d.]+)*$/:
    → Split on spaces or commas
    → Treat each as a task ID (e.g., "1.1", "2.3", "0.1")
    → Validate each task ID exists in the plan
    → If any invalid, report: "Task ID 'X.X' not found in plan"
    → Skip to step 4 with validated tasks

otherwise:
    → Treat as search string
    → Find tasks whose description contains the string
    → If multiple matches, show them and ask user to select
    → If single match, proceed with that task
```

**Validation:**
- For each task ID, verify it exists in the parsed plan
- Include both pending and completed tasks (verification can re-check completed tasks)
- Report any invalid IDs before proceeding

**Examples:**

```bash
# Verify specific task
/plan:verify 1.1

# Verify multiple tasks
/plan:verify 1.1 1.2 1.3
/plan:verify 1.1, 1.2, 1.3

# Verify entire phase
/plan:verify phase:2
/plan:verify p:1

# Verify all tasks
/plan:verify all

# Search by description
/plan:verify websocket
```

### 2. Parse Plan File

Read task information from status.json (the authoritative source of truth).

**Use status.json as primary source:**
- Use `getTasksByPhase(planPath)` to get organized task data with status
- status.json contains the actual completion status for all tasks
- Markdown checkboxes (`- [ ]` / `- [x]`) are reference documentation only and are NOT modified

**Fallback to markdown only if status.json is missing:**
- Parse task IDs and descriptions from `- [ ] ID Description` patterns
- Note: checkbox state may not reflect actual completion

**Task data structure from status.json:**
```json
{
  "id": "1.1",
  "phase": "Phase 1: Critical Unit Tests",
  "description": "websocket-connection.test.ts",
  "status": "pending",
  "startedAt": null,
  "completedAt": null,
  "findingsPath": null
}
```

### 3. Present Tasks for Selection (Interactive Mode)

**Skip this step if arguments were provided in step 1.5.**

Use the **task-selection template** (`.claude/templates/questions/task-selection.md`) with these configuration parameters:

```
action: "verify"
multiSelect: true
showBulkOptions: true
groupBy: "phase"
showPriority: false
showCounts: false
dividerStyle: "simple"
limitPerGroup: 0
```

This generates a multi-select question in the format:

```
Select task(s) to verify:

Quick Select:
☐ All incomplete tasks
☐ All tasks in Phase 0
☐ All tasks in Phase 1
...

Phase 0: Test Directory Restructure
☐ 0.1 Move e2e/ → tests/e2e/
☐ 0.2 Move fixtures to tests/fixtures/
...

Phase 1: Critical Unit Tests
☐ 1.1 websocket-connection.test.ts
☐ 1.2 preferences-store.test.ts
...
```

**Note:** The example format above is generated from the template configuration. See the template file for other available options and examples.

### 4. Verify Each Selected Task

For each task, investigate the codebase to determine its status using the `check-file-status.js` script for efficient verification.

**Check existing status first:**
- Use `getTaskStatus(planPath, taskId)` to get current status from status.json
- Use `readFindings(planPath, taskId)` to check for existing findings

**If status.json shows "completed":**
- Verify the completion is still valid (files still exist, tests still pass)
- Check existing findings to see what was verified previously
- Re-verify if significant time has passed or codebase has changed

**Note:** Verification uses semantic status indicators (✅, ⏳, 🚫, 🗑️) which differ from execution status symbols. For execution status symbols, see `.claude/templates/shared/status-symbols.md`.

#### Using the check-file-status.js Script

For tasks involving file creation or modification, use the batch file checker:

**Step 1: Extract expected file paths from tasks**

Parse each task to determine what files should exist. For example:
- "1.1 websocket-connection.test.ts" → `tests/unit/lib/websocket-connection.test.ts`
- "0.1 Move e2e/ → tests/e2e/" → check destination `tests/e2e/` exists
- "2.1 mock-claude-cli.ts" → `tests/helpers/mocks/mock-claude-cli.ts`

**Step 2: Run the batch checker**

```bash
# For simple file existence checks:
echo '["tests/unit/lib/websocket-connection.test.ts", "tests/unit/stores/preferences-store.test.ts"]' | node scripts/check-file-status.js --verbose

# For test file tasks with test execution:
node scripts/check-file-status.js --files tests/unit/lib/websocket-connection.test.ts tests/unit/stores/preferences-store.test.ts --run-tests --verbose
```

**Output format:**
```json
{
  "checks": [
    {
      "file": "tests/unit/lib/websocket-connection.test.ts",
      "exists": true,
      "size": 4231,
      "mtime": 1702857600000,
      "tests_pass": true,
      "coverage": 92.5
    },
    {
      "file": "tests/unit/stores/preferences-store.test.ts",
      "exists": false,
      "size": null,
      "mtime": null,
      "tests_pass": null,
      "coverage": null
    }
  ]
}
```

**Step 3: Interpret results and assign status**

Use the script output to quickly determine task status:
- `exists: true` + `tests_pass: true` → ✅ ALREADY DONE
- `exists: false` → ⏳ NEEDED
- `exists: true` + `tests_pass: false` → Investigate further (may be NEEDED or BLOCKED)
- Check for dependencies if task appears needed

**Performance Benefits:**
- Batch checking is significantly faster than individual file checks
- Test execution consolidated into single vitest run
- Minimal I/O operations compared to manual verification

#### Status: ✅ ALREADY DONE
The task has been completed but not marked in status.json.

**How to detect:**
- Script shows `exists: true` and file has content (`size > 0`)
- For test files: `tests_pass: true`
- Configuration change is already in place (verify by reading file)
- For move operations: destination exists, source is gone

**Example:**
```
✅ ALREADY DONE: 1.1 websocket-connection.test.ts
   File exists: tests/unit/lib/websocket-connection.test.ts
   Size: 4,231 bytes
   Tests pass: true (12/12 passing)
   Coverage: 92.5%
   Last modified: 2024-12-17 10:23 AM
   Recommendation: Mark as complete in status.json
```

#### Status: ⏳ NEEDED
The task still needs to be done.

**How to detect:**
- Script shows `exists: false` for expected file
- Feature is not implemented (code search shows no evidence)
- Test coverage is missing for source file
- No evidence of completion

**Example:**
```
⏳ NEEDED: 1.2 preferences-store.test.ts
   File missing: tests/unit/stores/preferences-store.test.ts
   Source file exists: src/stores/preferences-store.ts (untested)
   Recommendation: Implement this task
```

#### Status: 🚫 BLOCKED
The task cannot be done yet due to missing prerequisites.

**How to detect:**
- Script shows `tests_pass: false` with errors indicating missing dependencies
- Depends on another incomplete task (check earlier tasks in plan)
- Required file/module doesn't exist yet (check related task status)
- External blocker (API not available, package not installed)

**Example:**
```
🚫 BLOCKED: 2.2 orchestrator.integration.test.ts
   File exists: tests/unit/lib/orchestrator.integration.test.ts
   Tests fail: Cannot find module '../helpers/mocks/mock-claude-cli'
   Blocked by: 2.1 mock-claude-cli.ts (not yet created)
   Recommendation: Complete task 2.1 first
```

#### Status: 🗑️ OBSOLETE
The task is no longer relevant or needed.

**How to detect:**
- The file/feature it targets has been removed from codebase
- The approach has changed making this unnecessary
- A different solution was implemented instead (search for alternative)
- The requirement was dropped (check recent commits with `git log`)

**Example:**
```
🗑️ OBSOLETE: 3.5 Add legacy API support
   Source file removed: src/lib/legacy-api.ts not found
   Reason: Legacy API was removed in commit abc123 (Dec 15)
   Recommendation: Mark as skipped in status.json
```

### 4.1. Verify Template Success Criteria

If the plan was created from a template, it includes a "Success Criteria" section with specific completion conditions.

**Detect Success Criteria section:**
```regex
## Success Criteria
```

**For each criterion (checklist item under Success Criteria):**

1. **Parse the criterion:**
   - Extract the requirement (e.g., "All 5 plan templates created and documented")
   - Identify verification method (file existence, test passing, feature working)

2. **Verify based on criterion type:**

   | Criterion Pattern | Verification Method |
   |------------------|---------------------|
   | "All X files created" | Count files matching pattern |
   | "Tests pass" | Run test suite, check exit code |
   | "Coverage > N%" | Run coverage, parse output |
   | "No broken links" | Use link checker if available |
   | "Command working" | Try running command, verify output |
   | "Documented" | Check for documentation file/section |

3. **Report criterion status:**
   ```
   Success Criteria Verification:

   ✅ All 5 plan templates created and documented
      └── Found: analysis.md, validation.md, create-plan.md,
          documentation.md, test-creation.md (5/5)

   ✅ /plan:create command working with template selection
      └── Command exists: .claude/commands/plan/create.md
      └── Tested: Successfully creates plan from template

   ⏳ At least 3 prompts successfully migrated to plan-based workflows
      └── Found: 0/3 prompts migrated
      └── Remaining: analyze-coverage.md, identify-code-smells.md,
          suggest-improvements.md

   ⏳ Documentation updated to recommend plan-based approach
      └── Not found in README.md or docs/

   ⏳ Existing plan commands enhanced for template support
      └── Partial: /plan:implement updated, /plan:verify pending
   ```

4. **Calculate overall success:**
   ```
   Success Criteria: 2/5 complete (40%)

   Plan cannot be marked as fully complete until all success
   criteria are met.
   ```

**Integration with task verification:**
- Run success criteria check AFTER individual task verification
- Success criteria may pass even if some tasks are incomplete (criteria often aggregate)
- Success criteria failing may indicate blocked or needed tasks

### 5. Compile Verification Report

Present a summary grouped by status:

```
## Verification Report

Checked 9 tasks in 3.2 seconds (using check-file-status.js for batch verification)

### ✅ Already Done (3 tasks)
- 1.1 websocket-connection.test.ts - File exists (4.2KB), tests pass, 92.5% coverage
- 1.4 phases.test.ts - File exists (3.8KB), tests pass, 88.0% coverage
- 0.3 Update playwright.config.ts - Already configured correctly

### ⏳ Still Needed (5 tasks)
- 1.2 preferences-store.test.ts - No test file exists
- 1.3 api-utils.test.ts - No test file exists
- 1.5 advance/route.test.ts - No test file exists
- 2.1 mock-claude-cli.ts - Fixture not created
- 2.2 orchestrator.integration.test.ts - Test not created

### 🚫 Blocked (1 task)
- 2.2 orchestrator.integration.test.ts - Tests fail: missing mock-claude-cli.ts (task 2.1)

### 🗑️ Obsolete (0 tasks)
None found.

---
Summary: 3 done, 5 needed, 1 blocked, 0 obsolete
Verification completed in 3.2s
```

### 6. Offer Auto-Mark Options

If any tasks are ALREADY DONE or OBSOLETE, offer to update status tracking:

```
Would you like to update the task status?
☐ Mark 3 completed tasks as done (update status.json)
☐ Mark 0 obsolete tasks as skipped (update status.json)
☐ Add blocking notes to blocked tasks
☐ Skip - don't modify status tracking
```

**Note:** The plan markdown file is NOT modified. Status is tracked separately in status.json, preserving the original plan as a reference document.

### 7. Apply Updates (if requested)

Use the status-manager functions to update task status:

**For ALREADY DONE tasks:**
- Call `markTaskCompleted(planPath, taskId)` to mark as completed in status.json

**For OBSOLETE tasks:**
- Call `markTaskSkipped(planPath, taskId, "Obsolete: " + reason)` to mark as skipped

**For BLOCKED tasks (optional):**
- Add blocking information to the task's status entry
- Update can include blocker details in task metadata

**Important:**
- DO NOT use Edit tool on plan markdown files
- All status updates go to status.json via status-manager
- Plan markdown file is preserved as reference documentation
- Status.json location: `docs/plan-outputs/<plan-name>/status.json`

### 8. Confirm Changes

```
Status updated:
- Marked 3 tasks as complete in status.json
- Marked 0 tasks as skipped in status.json
- Added blocking notes to 1 task

Plan markdown file preserved for reference.
Run /plan:implement to work on remaining tasks.
```

## Verification Techniques

### Batch Verification (Recommended)

**For multiple file-based tasks:**
1. Extract all expected file paths from selected tasks
2. Run `check-file-status.js` with all paths at once:
   ```bash
   echo '["path1", "path2", "path3"]' | node scripts/check-file-status.js --verbose
   ```
3. Parse JSON output to determine status for each task
4. Only manually investigate ambiguous cases

**For test file tasks:**
1. Use `--run-tests` flag to execute tests during verification:
   ```bash
   node scripts/check-file-status.js --files test1.test.ts test2.test.ts --run-tests --verbose
   ```
2. Script output includes `tests_pass` and `coverage` fields
3. Passing tests (`tests_pass: true`) indicates DONE status
4. Failing tests may indicate NEEDED or BLOCKED status

**Speed comparison:**
- Manual checking: ~2-3 seconds per task
- Batch script: ~0.2-0.5 seconds per task
- Test execution: ~1-2 seconds per test file (vs 3-4 seconds manual)

### Manual Verification (When Needed)

Use manual checks for complex tasks that can't be verified by file existence alone:

**For configuration tasks:**
1. Read the config file
2. Check if expected changes are present
3. Validate configuration values are correct

**For file move/restructure tasks:**
1. Use script to check destination exists
2. Manually verify source no longer exists
3. Check git log if needed: `git log --all --full-history -- path/to/file`

**For feature implementation tasks:**
1. Use Grep to search for feature implementation
2. Check for related tests
3. Look for usage of the feature in codebase

**For tasks requiring deep analysis:**
- Check git history: `git log --oneline --all -- path/`
- Search for related code: use Grep tool with feature keywords
- Review recent commits: `git log --since="1 week ago" --oneline`

## Important Notes

- **Use batch verification** - Always prefer `check-file-status.js` for file-based tasks
- **Investigate thoroughly** - Don't just check file existence; verify actual completion
- **Run tests via script** - Use `--run-tests` flag for test file verification
- **Check git history** - Recent commits may reveal if work was done
- **Be conservative** - When uncertain, mark as NEEDED rather than DONE
- **Track performance** - Report verification time in summary (helps justify script usage)
- **Status tracking** - All task completion status tracked in status.json, not markdown
- **Preserve plan** - Plan markdown file is never modified, only status.json is updated
