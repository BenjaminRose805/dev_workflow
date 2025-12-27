# Set Active Plan

Set the current working plan file for subsequent `/plan:*` commands.

## Options

| Flag | Description |
|------|-------------|
| `--push` | Push the plan branch to remote after creation/switch |
| `--autonomous` | Skip interactive prompts (auto-stash uncommitted changes) |

**Examples:**
```bash
# Interactive plan selection
/plan:set

# Set plan and push branch to remote
/plan:set --push

# Autonomous mode for orchestrator usage
/plan:set my-plan --autonomous
```

## Instructions

1. **Scan for plan files**: Execute `node scripts/scan-plans.js` to get plan data in JSON format
   - Parse the output to extract plan metadata, titles, and task counts
   - Identify the currently active plan from `currentPlan` field
   - **On script error**: Fall back to manual scanning (see Error Handling section)

2. **Present options using AskUserQuestion**:
   - Show each plan with its title and task counts
   - Format: `{filename} - {title} ({incomplete} remaining, {complete} done)`
   - If a plan is currently active, indicate it with "(current)"

3. **After user selection**:
   - **Detect worktree context:**
     - Check if `.claude-context/` directory exists in current directory
     - If in worktree: Write to `.claude-context/current-plan.txt`
     - If in main repo: Write to `.claude/current-plan.txt`
   - Confirm the selection to the user
   - Show a brief summary of the plan's contents (phases/sections and task counts)

**Worktree-aware plan pointer:**
```bash
# Detect worktree context
if [ -d ".claude-context" ]; then
  # In a worktree - use worktree-specific context
  PLAN_POINTER=".claude-context/current-plan.txt"
  echo "Setting plan in worktree context"
else
  # In main repo - use standard location
  PLAN_POINTER=".claude/current-plan.txt"
fi

# Write the plan path
echo "$SELECTED_PLAN_PATH" > "$PLAN_POINTER"
```

### 3.0.1 Check for Uncommitted Changes (Before Branch Switch)

**See:** `.claude/commands/plan/_common/uncommitted-changes-protection.md` for complete uncommitted changes protection patterns.

Before switching branches (when git is available), check for uncommitted changes:

```bash
# Check if git is available
git --version 2>/dev/null

# If git available, check for uncommitted changes
git status --porcelain
```

**Detection logic:**
1. Run `git status --porcelain` to get list of uncommitted changes
2. Count the number of modified/untracked files
3. Store the result for the branch switching step (3.0.2)

**When uncommitted changes are detected:**
- If switching to a different plan branch, the branch switch step (3.0.2) will handle this
- The detection step only identifies changes; subsequent steps determine what to do

**Output format:**
```
Detected N uncommitted changes in working directory.
```

**Skip this check if:**
- Git is not available (not a git repository or git not installed)
- The selected plan is the same as the current plan (no branch switch needed)

### 3.0.2 Git Branch Check and Switch

After detecting uncommitted changes, check if the plan branch exists and switch to it.

**Load branching configuration:**
```bash
# Check for config file and load branching settings
CONFIG_FILE=".claude/git-workflow.json"

if [ -f "$CONFIG_FILE" ]; then
  # Read strategy (default: branch-per-plan)
  STRATEGY=$(cat "$CONFIG_FILE" | grep -o '"strategy":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  STRATEGY=${STRATEGY:-branch-per-plan}

  # Read branch_prefix (default: plan/)
  BRANCH_PREFIX=$(cat "$CONFIG_FILE" | grep -o '"branch_prefix":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  BRANCH_PREFIX=${BRANCH_PREFIX:-plan/}
else
  STRATEGY="branch-per-plan"
  BRANCH_PREFIX="plan/"
fi
```

**Derive branch name based on strategy:**
```bash
PLAN_NAME=$(basename "$PLAN_PATH" .md)

if [ "$STRATEGY" = "branch-per-phase" ]; then
  # For branch-per-phase, start with phase-0 (or phase-1 if no phase 0)
  # This creates branches like plan/my-feature/phase-1
  INITIAL_PHASE=$(node -e "
    const fs = require('fs');
    const plan = fs.readFileSync('$PLAN_PATH', 'utf8');
    const match = plan.match(/## Phase (\d+):/);
    console.log(match ? match[1] : '1');
  " 2>/dev/null || echo "1")
  BRANCH_NAME="${BRANCH_PREFIX}${PLAN_NAME}/phase-${INITIAL_PHASE}"
else
  # branch-per-plan: single branch for entire plan
  BRANCH_NAME="${BRANCH_PREFIX}${PLAN_NAME}"
fi

# Check if branch exists
git rev-parse --verify "$BRANCH_NAME" 2>/dev/null
```

**Branch existence check:**
1. Run `git rev-parse --verify plan/{plan-name} 2>/dev/null`
2. Exit code 0 = branch exists, non-zero = branch does not exist

**If branch does NOT exist:**
1. Create new branch: `git checkout -b plan/{plan-name}`
2. Log: `Created new plan branch: plan/{plan-name}`

**If branch exists:**
1. Switch to branch: `git checkout plan/{plan-name}`
2. Log: `Switched to existing plan branch: plan/{plan-name}`

**Handling uncommitted changes during switch:**
- If uncommitted changes were detected in step 3.0.1, see step 3.0.3 for options
- Branch operations may fail if changes conflict with the target branch

**Skip branch operations if:**
- Git is not available (set `GIT_AVAILABLE=false` flag at start)
- Already on the correct branch (`git branch --show-current` equals `plan/{plan-name}`)

**Example output:**
```
Git branch: plan/my-feature-plan
  ✓ Branch exists, switching...
  Switched to branch 'plan/my-feature-plan'
```

or:

```
Git branch: plan/my-feature-plan
  ○ Branch does not exist, creating...
  Created new branch 'plan/my-feature-plan'
```

### 3.0.3 Handle Uncommitted Changes (User Options)

When uncommitted changes are detected (from step 3.0.1) and a branch switch is needed, present the user with options:

**Use AskUserQuestion to present options:**

```
Uncommitted changes detected (N files). Choose how to proceed:

○ Commit changes - Commit all changes to current branch before switching
○ Stash changes - Stash changes (can be restored later with `git stash pop`)
○ Cancel - Abort plan switch, keep working on current branch
```

**Option behaviors:**

**1. Commit changes:**
```bash
git add -A
git commit -m "WIP: Save changes before switching to plan/{new-plan-name}"
```
- Commits all changes with a descriptive WIP message
- Then proceed with branch switch (step 3.0.2)
- Log: `Committed N changes to {current-branch}`

**2. Stash changes:**
```bash
git stash push -m "plan-switch: {old-plan} -> {new-plan}"
```
- Stashes changes with descriptive message for later retrieval
- Then proceed with branch switch (step 3.0.2)
- Log: `Stashed N changes. Restore with: git stash pop`

**3. Cancel:**
- Abort the plan switch operation
- Keep the current plan active
- Log: `Plan switch cancelled. Staying on {current-plan}`
- Exit the command gracefully

**Skip this step if:**
- No uncommitted changes detected
- Git is not available
- Already on the target branch (no switch needed)
- Running in autonomous mode (`--autonomous` flag) - auto-stash in this case

**Autonomous mode behavior:**
When `--autonomous` flag is present, skip the interactive prompt and automatically stash:
```bash
git stash push -m "auto-stash: plan-switch to {new-plan}"
```
Log: `Auto-stashed N changes for autonomous plan switch`

**Example interaction:**
```
Uncommitted changes detected (3 files):
  M src/lib/auth.ts
  M tests/auth.test.ts
  ? src/lib/new-file.ts

Choose how to proceed:
○ Commit changes (Recommended)
○ Stash changes
○ Cancel
```

### 3.0.4 Push Branch to Remote (if sync_remote enabled)

After creating or switching to the plan branch, optionally push to remote:

**Check sync_remote configuration:**
```bash
# Check if .claude/git-workflow.json exists and has sync_remote: true
SYNC_REMOTE=$(cat .claude/git-workflow.json 2>/dev/null | grep -o '"sync_remote":\s*true' || echo "")
```

**If sync_remote is enabled OR `--push` flag was passed:**

1. **Check if remote exists:**
   ```bash
   git remote get-url origin 2>/dev/null
   ```
   - If no remote configured, log warning and skip push
   - If remote exists, continue with push

2. **Push the branch:**
   ```bash
   git push -u origin plan/{plan-name} 2>&1
   ```

3. **Handle push result:**
   - **Success:** Log `Pushed branch to remote: origin/plan/{plan-name}`
   - **Failure:** Log warning but DON'T fail the command (graceful degradation)
     ```
     ⚠ Failed to push branch to remote: {error message}
       Continuing with local-only branch...
     ```

**Example output (success):**
```
Git branch: plan/my-feature-plan
  ○ Branch does not exist, creating...
  Created new branch 'plan/my-feature-plan'
  Pushed branch to remote: origin/plan/my-feature-plan
```

**Example output (push failed - graceful):**
```
Git branch: plan/my-feature-plan
  ○ Branch does not exist, creating...
  Created new branch 'plan/my-feature-plan'
  ⚠ Failed to push branch to remote: Permission denied
    Continuing with local-only branch...
```

**Skip push if:**
- `sync_remote` is false/not set AND `--push` flag not passed
- Git is not available
- No remote repository configured
- Already on an existing branch that was just switched to (not newly created)

### 3.0.5 Record Branch Name in Status Metadata

After successfully switching to the plan branch (or confirming we're on it), record the branch name in the status.json metadata:

**Update status.json with branch information:**

The branch name should be stored in the status.json file's top-level metadata:

```json
{
  "planPath": "docs/plans/my-plan.md",
  "planName": "My Plan Title",
  "branch": "plan/my-plan",
  "branchCreatedAt": "2024-12-25T10:30:00.000Z",
  ...
}
```

**Implementation:**
1. After successful branch switch/creation (step 3.0.2), get current branch name:
   ```bash
   git branch --show-current
   ```

2. Update status.json to include branch metadata:
   - `branch`: The current git branch name (e.g., `plan/my-plan`)
   - `branchCreatedAt`: Timestamp when branch was first associated (only set on creation)

3. If updating an existing status.json where branch already exists, preserve `branchCreatedAt`

**Example status.json update:**
```javascript
// Read existing status.json
const status = JSON.parse(fs.readFileSync(statusPath));

// Add/update branch info
status.branch = branchName;
if (!status.branchCreatedAt) {
  status.branchCreatedAt = new Date().toISOString();
}

// Write back
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
```

**Skip this step if:**
- Git is not available
- Status tracking is not initialized yet (will be set in 3.1)

**Integration with step 3.1:**
When `node scripts/status-cli.js init` is called, if git is available:
- Automatically detect and record the current branch
- Include branch info in the initial status.json creation

**Verification:**
After plan set, the status.json should contain:
```
Branch: plan/my-plan (recorded in status.json)
```

### 3.1. Initialize Status Tracking

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

After setting the plan path, initialize status tracking:

```bash
# Initialize output directory and status.json
node scripts/status-cli.js init
```

This creates `docs/plan-outputs/{plan-name}/` with:
- `status.json` - Task status tracking (the authoritative source of truth)
- `findings/` - Task findings/outputs
- `timestamps/` - Execution timestamps

The output directory path is derived from the plan name - no separate pointer needed.

**Error handling:**
- If status cannot be loaded, check `.claude/current-plan.txt` is set correctly
- Status tracking is optional, plan can be used without it

## Script Output Format

The script returns JSON:
```json
{
  "currentPlan": "docs/plans/example.md",
  "plans": [
    {
      "path": "/absolute/path/to/plan.md",
      "title": "Plan Title",
      "incomplete": 42,
      "complete": 13,
      "phases": [
        { "id": "1", "name": "Phase Name", "taskCount": 15, "completeCount": 3, "incompleteCount": 12 }
      ]
    }
  ]
}
```

## Example Output

After setting the plan, confirm like:

```
Active plan set to: docs/plans/test-suite-implementation.md
Output directory: docs/plan-outputs/test-suite-implementation/

Plan Summary:
- Phase 1: Critical Unit Tests (5 tasks, 2 completed)
- Phase 2: Mock CLI & Integration (3 tasks, 0 completed)
- Phase 3: E2E Tests (4 tasks, 0 completed)

Total: 12 tasks (10 remaining)

Progress: [████████░░░░░░░░░░░░] 40%
  ✓ Completed: 4
  ◯ Pending: 6
  ✗ Failed: 0
  ⊘ Skipped: 0

Use /plan:implement to work on tasks.
```

**If status tracking is available:**
- Show the progress bar with completion percentages
- Display task counts by status (completed, pending, failed, skipped)

**If status tracking is not available:**
- Skip the progress display
- Show only the plan summary from markdown parsing

## Error Handling

### Script Errors

If `node scripts/scan-plans.js` fails (non-zero exit code or invalid JSON):

1. **Log the error**: Append error details to `.claude/logs/script-errors.log`
   ```
   [timestamp] scan-plans.js: <error message>
   ```

2. **Show user message**:
   ```
   ⚠ Script scan failed, using manual scanning...
   ```

3. **Fall back to manual scanning**:
   - Use Glob to find `docs/plans/*.md`
   - Read each file to extract title (first `#` heading)
   - Parse task IDs from `- [ ] ID Description` patterns
   - Note: Markdown checkbox state is for display only; status.json is authoritative
   - Read `.claude/current-plan.txt` for current plan
   - Continue with step 2 as normal

### Status Initialization Errors

If status initialization fails:

1. **Show warning message**:
   ```
   ⚠ Status tracking unavailable: <error message>
   ```

2. **Continue with plan activation**:
   - The plan is still set as active in `.claude/current-plan.txt`
   - Status tracking is optional, plan can be used without it
   - User can manually retry status init later if needed

3. **Common errors**:
   - Output directory creation fails: Check permissions on `docs/plan-outputs/`
   - Plan file not found: Verify the plan path is correct
   - Invalid plan format: Plan markdown may be malformed
