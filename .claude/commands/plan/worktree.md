# Plan Worktree

Manage git worktrees for parallel plan execution.

## Usage

```bash
/plan:worktree <subcommand> [options]

# Subcommands:
/plan:worktree create <plan-name>   # Create worktree for a plan
/plan:worktree list                 # List active worktrees with plan status
/plan:worktree remove <plan-name>   # Remove worktree after merge
/plan:worktree switch <plan-name>   # Change to different worktree
```

## Options

| Flag | Description |
|------|-------------|
| `--force` | Force creation/removal even if issues exist |
| `--attach` | Attach to existing branch instead of creating new |
| `--auto-attach` | Same as `--attach`, for scripting (no confirmation) |
| `--no-init` | Skip status.json initialization |
| `--json` | Output in JSON format |

## Prerequisites

- Git version 2.5+ (worktree support required)
- Repository must be a git repository

---

## Subcommand: create

Create a new worktree for parallel plan execution.

### Usage

```bash
/plan:worktree create <plan-name>
/plan:worktree create my-feature --attach       # Attach to existing branch
/plan:worktree create my-feature --auto-attach  # Same, for scripting
/plan:worktree create my-feature --json         # JSON output with validation info
```

### Instructions

#### 1. Validate Prerequisites

**Check git version:**
```bash
GIT_VERSION=$(git --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+')
if [ -z "$GIT_VERSION" ]; then
  echo "Error: Git is not installed or not available"
  exit 1
fi

# Check if version >= 2.5 (worktree support)
MAJOR=$(echo "$GIT_VERSION" | cut -d. -f1)
MINOR=$(echo "$GIT_VERSION" | cut -d. -f2)

if [ "$MAJOR" -lt 2 ] || ([ "$MAJOR" -eq 2 ] && [ "$MINOR" -lt 5 ]); then
  echo "Error: Git version 2.5+ required for worktree support"
  echo "Current version: $GIT_VERSION"
  exit 1
fi
```

**Check we're in a git repository:**
```bash
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Error: Not in a git repository"
  exit 1
fi
```

**Get repository root:**
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
```

#### 2. Parse Arguments

```
args = skill arguments
plan_name = first argument after "create"
attach_mode = args contains "--attach" OR args contains "--auto-attach"
force_mode = args contains "--force"
no_init = args contains "--no-init"
json_output = args contains "--json"

if plan_name is empty:
    → ERROR: "Usage: /plan:worktree create <plan-name>"
    → Stop execution
```

**Validate plan name:**
```bash
# Check for valid plan name (alphanumeric, hyphens, underscores)
if [[ ! "$PLAN_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "Error: Invalid plan name. Use only alphanumeric characters, hyphens, and underscores."
  exit 1
fi
```

#### 3. Check for Plan File

Verify the plan file exists in `docs/plans/`:

```bash
PLAN_FILE="docs/plans/${PLAN_NAME}.md"

if [ ! -f "$PLAN_FILE" ]; then
  echo "Warning: Plan file not found: $PLAN_FILE"
  echo ""
  echo "Available plans:"
  ls docs/plans/*.md 2>/dev/null | xargs -I {} basename {} .md | sed 's/^/  /'
  echo ""
  echo "Create plan first with /plan:create, or proceed anyway?"

  # If not --force, ask for confirmation
  if [ "$FORCE_MODE" != true ]; then
    # Use AskUserQuestion to confirm
    # Options: "Create worktree anyway", "Cancel"
  fi
fi
```

#### 4. Check for Existing Worktree

```bash
WORKTREE_DIR="${REPO_ROOT}/worktrees/plan-${PLAN_NAME}"
BRANCH_NAME="plan/${PLAN_NAME}"

# Check if worktree already exists
if git worktree list | grep -q "$WORKTREE_DIR"; then
  echo "Error: Worktree already exists: $WORKTREE_DIR"
  echo ""
  echo "To switch to it: /plan:worktree switch $PLAN_NAME"
  echo "To remove it:    /plan:worktree remove $PLAN_NAME"
  exit 1
fi
```

#### 5. Check Branch Existence

```bash
BRANCH_EXISTS=false
if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  BRANCH_EXISTS=true
fi

if [ "$BRANCH_EXISTS" = true ]; then
  # Check if branch is already checked out in another worktree
  BRANCH_WORKTREE=$(git worktree list --porcelain | grep -B1 "branch refs/heads/$BRANCH_NAME" | grep "worktree " | cut -d' ' -f2)

  if [ -n "$BRANCH_WORKTREE" ]; then
    echo "Error: Branch '$BRANCH_NAME' is already checked out in another worktree"
    echo "  Worktree at: $BRANCH_WORKTREE"
    echo ""
    echo "To continue work: cd $BRANCH_WORKTREE"
    echo "To remove first:  /plan:worktree remove $PLAN_NAME"
    exit 1
  fi

  if [ "$ATTACH_MODE" = true ]; then
    echo "Attaching to existing branch: $BRANCH_NAME"
    CREATE_BRANCH=""
  else
    echo "Error: Branch already exists: $BRANCH_NAME"
    echo ""
    echo "Hint:"
    echo "  Options:"
    echo "    --attach      Attach worktree to existing branch (continue previous work)"
    echo "    --auto-attach Same as --attach, for scripting"
    echo "    --force       Create new branch from current HEAD (loses existing branch)"
    exit 1
  fi
else
  CREATE_BRANCH="-b $BRANCH_NAME"
fi
```

#### 6. Create Worktree Directory

```bash
# Ensure worktrees directory exists
mkdir -p "${REPO_ROOT}/worktrees"

# Create the worktree
if [ -n "$CREATE_BRANCH" ]; then
  # Create new branch with worktree
  if git worktree add "$WORKTREE_DIR" $CREATE_BRANCH 2>&1; then
    echo "Created worktree: $WORKTREE_DIR"
    echo "Created branch: $BRANCH_NAME"
  else
    echo "Error: Failed to create worktree"
    exit 1
  fi
else
  # Attach to existing branch
  if git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>&1; then
    echo "Created worktree: $WORKTREE_DIR"
    echo "Attached to branch: $BRANCH_NAME"
  else
    echo "Error: Failed to create worktree"
    exit 1
  fi
fi
```

#### 7. Initialize Worktree Context

Create `.claude-context/` directory for worktree-specific context:

```bash
CONTEXT_DIR="$WORKTREE_DIR/.claude-context"
mkdir -p "$CONTEXT_DIR"

# Set current plan pointer
echo "docs/plans/${PLAN_NAME}.md" > "$CONTEXT_DIR/current-plan.txt"

# Copy essential config files if they exist in main repo
if [ -f "${REPO_ROOT}/.claude/git-workflow.json" ]; then
  cp "${REPO_ROOT}/.claude/git-workflow.json" "$CONTEXT_DIR/"
fi

echo "Initialized context: $CONTEXT_DIR"
```

#### 8. Initialize Status Tracking

Unless `--no-init` flag is present:

```bash
if [ "$NO_INIT" != true ]; then
  # Change to worktree directory to run status init
  cd "$WORKTREE_DIR"

  # Initialize status.json for the plan
  if node scripts/status-cli.js init 2>/dev/null; then
    echo "Initialized status tracking"
  else
    echo "Warning: Could not initialize status tracking"
    echo "  Run manually: node scripts/status-cli.js init"
  fi

  cd "$REPO_ROOT"
fi
```

#### 9. Validate Worktree Creation

After creating the worktree, validate it was set up correctly:

```bash
# Validate worktree creation succeeded
VALIDATION_PASSED=true

# Check 1: Directory exists
if [ ! -d "$WORKTREE_DIR" ]; then
  echo "⚠ Validation: Directory does not exist"
  VALIDATION_PASSED=false
fi

# Check 2: Git index is valid (.git file points to main repo)
if [ -f "$WORKTREE_DIR/.git" ]; then
  if ! grep -q "^gitdir:" "$WORKTREE_DIR/.git"; then
    echo "⚠ Validation: .git file does not contain valid gitdir reference"
    VALIDATION_PASSED=false
  fi
else
  echo "⚠ Validation: .git file not found in worktree"
  VALIDATION_PASSED=false
fi

# Check 3: Branch is correctly checked out
CURRENT_BRANCH=$(cd "$WORKTREE_DIR" && git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
  echo "⚠ Validation: Expected branch '$BRANCH_NAME' but found '$CURRENT_BRANCH'"
  VALIDATION_PASSED=false
fi

# Check 4: Worktree appears in git worktree list
if ! git worktree list | grep -q "$WORKTREE_DIR"; then
  echo "⚠ Validation: Worktree not found in git worktree list"
  VALIDATION_PASSED=false
fi

# Check 5: Core git files present (HEAD is readable)
if ! cd "$WORKTREE_DIR" && git rev-parse HEAD >/dev/null 2>&1; then
  echo "⚠ Validation: Git HEAD is not valid"
  VALIDATION_PASSED=false
fi

if [ "$VALIDATION_PASSED" = true ]; then
  echo "Validated:  ✓ All checks passed"
else
  echo "Validated:  ⚠ Some checks failed"
fi
```

#### 10. Output Summary

```
Worktree Created Successfully
─────────────────────────────

Plan:       $PLAN_NAME
Worktree:   $WORKTREE_DIR
Branch:     $BRANCH_NAME
Context:    $CONTEXT_DIR
Mode:       New branch created | Attached to existing branch
Validated:  ✓ All checks passed

To work in this worktree:
  cd $WORKTREE_DIR

To switch context:
  /plan:worktree switch $PLAN_NAME

To run orchestrator in this worktree:
  python scripts/plan_orchestrator.py --worktree $WORKTREE_DIR
```

---

## Subcommand: list

Show all active worktrees with their plan status.

### Usage

```bash
/plan:worktree list
/plan:worktree list --json    # JSON output for scripting
```

### Instructions

#### 1. List All Worktrees

```bash
# Get list of worktrees
WORKTREES=$(git worktree list --porcelain)

# Parse worktree information
# Format:
# worktree /path/to/worktree
# HEAD abc1234
# branch refs/heads/plan/my-plan
```

#### 2. Filter Plan Worktrees

Only show worktrees that are plan-related (in `worktrees/` directory or on plan branches):

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)

git worktree list --porcelain | while IFS= read -r line; do
  if [[ "$line" == worktree* ]]; then
    WORKTREE_PATH="${line#worktree }"
  elif [[ "$line" == branch* ]]; then
    BRANCH="${line#branch refs/heads/}"

    # Check if this is a plan worktree
    if [[ "$BRANCH" == plan/* ]] || [[ "$WORKTREE_PATH" == */worktrees/plan-* ]]; then
      echo "$WORKTREE_PATH|$BRANCH"
    fi
  elif [[ -z "$line" ]]; then
    # Reset for next worktree entry
    WORKTREE_PATH=""
    BRANCH=""
  fi
done
```

#### 3. Get Plan Status for Each Worktree

For each plan worktree, gather status information:

```bash
for WORKTREE_INFO in $PLAN_WORKTREES; do
  WORKTREE_PATH=$(echo "$WORKTREE_INFO" | cut -d'|' -f1)
  BRANCH=$(echo "$WORKTREE_INFO" | cut -d'|' -f2)
  PLAN_NAME="${BRANCH#plan/}"

  # Check for status.json
  STATUS_FILE="$WORKTREE_PATH/docs/plan-outputs/$PLAN_NAME/status.json"

  if [ -f "$STATUS_FILE" ]; then
    # Parse status.json for progress
    COMPLETED=$(cat "$STATUS_FILE" | grep -o '"completed":\s*[0-9]*' | grep -o '[0-9]*')
    TOTAL=$(cat "$STATUS_FILE" | grep -o '"totalTasks":\s*[0-9]*' | grep -o '[0-9]*')
    PROGRESS="$COMPLETED/$TOTAL"
  else
    # Check context file
    CONTEXT_FILE="$WORKTREE_PATH/.claude-context/current-plan.txt"
    if [ -f "$CONTEXT_FILE" ]; then
      PROGRESS="initialized"
    else
      PROGRESS="no status"
    fi
  fi

  # Get last commit info
  cd "$WORKTREE_PATH"
  LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null | head -c 50)
  cd "$REPO_ROOT"

  echo "$PLAN_NAME|$BRANCH|$PROGRESS|$LAST_COMMIT|$WORKTREE_PATH"
done
```

#### 4. Display Formatted Output

```
Active Plan Worktrees
─────────────────────────────────────────────────────────────────────

Plan Name              Branch                Progress    Last Commit
──────────────────────────────────────────────────────────────────────
feature-auth           plan/feature-auth     12/20       abc1234 Add login
api-refactor           plan/api-refactor     5/15        def5678 WIP: refactor
perf-optimization      plan/perf-optim...    0/8         (no commits)

Paths:
  feature-auth:        /path/to/repo/worktrees/plan-feature-auth
  api-refactor:        /path/to/repo/worktrees/plan-api-refactor
  perf-optimization:   /path/to/repo/worktrees/plan-perf-optimization

Total: 3 active plan worktrees
```

**If no plan worktrees found:**
```
No active plan worktrees found.

To create a worktree:
  /plan:worktree create <plan-name>
```

#### 5. JSON Output (if --json)

```json
{
  "worktrees": [
    {
      "name": "feature-auth",
      "branch": "plan/feature-auth",
      "path": "/path/to/repo/worktrees/plan-feature-auth",
      "progress": {
        "completed": 12,
        "total": 20
      },
      "lastCommit": {
        "hash": "abc1234",
        "message": "Add login component"
      }
    }
  ],
  "count": 1
}
```

---

## Subcommand: remove

Remove a worktree after plan completion or abandonment.

### Usage

```bash
/plan:worktree remove <plan-name>
/plan:worktree remove my-feature --force   # Remove even with uncommitted changes
```

### Instructions

#### 1. Parse Arguments

```
args = skill arguments
plan_name = first argument after "remove"
force_mode = args contains "--force"

if plan_name is empty:
    → List available worktrees for selection
    → Use AskUserQuestion to let user pick one
```

#### 2. Validate Worktree Exists

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="${REPO_ROOT}/worktrees/plan-${PLAN_NAME}"
BRANCH_NAME="plan/${PLAN_NAME}"

# Check if worktree exists
if ! git worktree list | grep -q "$WORKTREE_DIR"; then
  echo "Error: Worktree not found: $WORKTREE_DIR"
  echo ""
  echo "Available worktrees:"
  git worktree list | grep "worktrees/plan-" | awk '{print "  " $1}'
  exit 1
fi
```

#### 3. Check for Uncommitted Changes

```bash
cd "$WORKTREE_DIR"

UNCOMMITTED=$(git status --porcelain | wc -l)

if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "Warning: Worktree has $UNCOMMITTED uncommitted changes"
  git status --short
  echo ""

  if [ "$FORCE_MODE" != true ]; then
    # Use AskUserQuestion
    # Options:
    #   "Commit changes" - Commit with WIP message, then remove
    #   "Discard changes" - Force remove, losing changes
    #   "Cancel" - Abort removal
  fi
fi

cd "$REPO_ROOT"
```

#### 4. Check Branch Merge Status

Warn if branch hasn't been merged to main:

```bash
# Check if branch is merged to master/main
MERGED=false
if git branch --merged master 2>/dev/null | grep -q "$BRANCH_NAME"; then
  MERGED=true
elif git branch --merged main 2>/dev/null | grep -q "$BRANCH_NAME"; then
  MERGED=true
fi

if [ "$MERGED" = false ]; then
  echo "Warning: Branch $BRANCH_NAME has not been merged"
  echo ""

  # Get commits ahead of main
  AHEAD=$(git rev-list --count HEAD ^master 2>/dev/null || git rev-list --count HEAD ^main 2>/dev/null)
  echo "Branch is $AHEAD commits ahead of base branch"
  echo ""

  if [ "$FORCE_MODE" != true ]; then
    # Use AskUserQuestion
    # Options:
    #   "Merge first" - Run /plan:complete to merge, then remove
    #   "Remove anyway" - Remove without merging (branch preserved)
    #   "Cancel" - Abort removal
  fi
fi
```

#### 5. Remove Worktree

```bash
# Remove the worktree
if git worktree remove "$WORKTREE_DIR" ${FORCE_MODE:+--force} 2>&1; then
  echo "Removed worktree: $WORKTREE_DIR"
else
  echo "Error: Failed to remove worktree"
  echo "Try: git worktree remove --force $WORKTREE_DIR"
  exit 1
fi
```

#### 6. Clean Up Context (Optional)

The `.claude-context/` directory is inside the worktree, so it's removed automatically.

#### 7. Optionally Delete Branch

```bash
# Ask about branch deletion (unless --force)
if [ "$FORCE_MODE" = true ]; then
  # Keep branch by default with --force
  echo "Branch preserved: $BRANCH_NAME"
else
  # Use AskUserQuestion
  # "Delete branch $BRANCH_NAME?"
  # Options:
  #   "Delete branch" - git branch -D $BRANCH_NAME
  #   "Keep branch" - Leave branch for later use
fi
```

#### 8. Prune Worktree References

```bash
# Clean up any stale worktree references
git worktree prune
```

#### 9. Output Summary

```
Worktree Removed
────────────────

Plan:       $PLAN_NAME
Worktree:   $WORKTREE_DIR (removed)
Branch:     $BRANCH_NAME (kept|deleted)

Remaining worktrees:
  [list other active worktrees]
```

---

## Subcommand: switch

Change the active worktree context.

### Usage

```bash
/plan:worktree switch <plan-name>
```

### Instructions

#### 1. Parse Arguments

```
args = skill arguments
plan_name = first argument after "switch"

if plan_name is empty:
    → List available worktrees
    → Use AskUserQuestion to let user pick one
```

#### 2. Validate Worktree Exists

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="${REPO_ROOT}/worktrees/plan-${PLAN_NAME}"

# Check if worktree exists
if ! git worktree list | grep -q "$WORKTREE_DIR"; then
  echo "Error: Worktree not found: $WORKTREE_DIR"
  echo ""
  echo "Available worktrees:"
  git worktree list | grep "worktrees/plan-" | awk '{print "  " $1}'
  echo ""
  echo "To create a new worktree:"
  echo "  /plan:worktree create $PLAN_NAME"
  exit 1
fi
```

#### 3. Detect Current Context

Determine if we're currently in a worktree:

```bash
CURRENT_DIR=$(pwd)
CURRENT_WORKTREE=""

# Check if we're inside a worktree
if [[ "$CURRENT_DIR" == */worktrees/plan-* ]]; then
  CURRENT_WORKTREE=$(echo "$CURRENT_DIR" | grep -oE 'worktrees/plan-[^/]+')
  CURRENT_PLAN=$(echo "$CURRENT_WORKTREE" | sed 's|worktrees/plan-||')
  echo "Currently in worktree: $CURRENT_PLAN"
fi
```

#### 4. Provide Switch Instructions

Since Claude Code runs in a terminal, we can't actually change the shell's directory. Instead, provide the user with the command to switch:

```
Switch to Worktree
──────────────────

Target Plan:  $PLAN_NAME
Target Path:  $WORKTREE_DIR

To switch to this worktree, run:

  cd $WORKTREE_DIR

Or in a new terminal:

  cd $WORKTREE_DIR && claude

Worktree Status:
  Branch:   $BRANCH_NAME
  Progress: $PROGRESS
```

#### 5. Optionally Set Environment

If `CLAUDE_WORKTREE` environment variable is supported:

```bash
# Set environment variable for worktree context
export CLAUDE_WORKTREE="$WORKTREE_DIR"
echo ""
echo "Environment variable set:"
echo "  CLAUDE_WORKTREE=$WORKTREE_DIR"
```

#### 6. Show Worktree Info

```bash
cd "$WORKTREE_DIR"

# Get current branch
BRANCH=$(git branch --show-current)

# Get status
if [ -f ".claude-context/current-plan.txt" ]; then
  PLAN_PATH=$(cat ".claude-context/current-plan.txt")
  echo "Current plan: $PLAN_PATH"
fi

# Get progress if available
STATUS_FILE="docs/plan-outputs/$PLAN_NAME/status.json"
if [ -f "$STATUS_FILE" ]; then
  node -e "
    const status = require('./$STATUS_FILE');
    const s = status.summary || {};
    console.log('Progress: ' + (s.completed || 0) + '/' + (s.totalTasks || '?') + ' tasks');
  " 2>/dev/null
fi

cd "$REPO_ROOT"
```

---

## Worktree Directory Structure

The worktree system uses a standard directory structure for parallel plan execution:

```
{directory}/plan-{name}/
```

Where:
- `{directory}` - Configured in `worktrees.directory` (default: `worktrees`)
- `{name}` - Plan name (derived from plan file basename without `.md`)

**Examples:**
- Plan `feature-auth.md` → `worktrees/plan-feature-auth/`
- Plan `api-refactor.md` → `worktrees/plan-api-refactor/`
- Plan `perf-optimization.md` → `worktrees/plan-perf-optimization/`

### Full Repository Structure

The worktree system creates isolated working directories for parallel plan execution:

```
repo/
├── .git/                              # Shared git data
├── .claude/                           # Main repo Claude config
│   ├── current-plan.txt               # Active plan for main worktree
│   └── commands/                      # Skill definitions
├── docs/
│   └── plans/                         # Plan files (shared)
├── scripts/                           # Utility scripts (shared)
└── worktrees/
    ├── plan-feature-auth/             # Worktree for plan/feature-auth
    │   ├── .claude-context/           # Worktree-specific context
    │   │   ├── current-plan.txt       # This worktree's active plan
    │   │   └── git-workflow.json      # Config copy
    │   ├── docs/                      # Shared docs (via worktree)
    │   ├── scripts/                   # Shared scripts (via worktree)
    │   └── src/                       # Working source code
    └── plan-api-refactor/             # Another worktree
        └── ...
```

## Context Resolution

When running in a worktree, context is resolved in order:

1. `.claude-context/current-plan.txt` (worktree-specific)
2. `.claude/current-plan.txt` (main repo fallback)

This allows each worktree to have its own active plan while sharing the main configuration.

## Integration with Other Commands

### /plan:set
- Detects worktree context and updates `.claude-context/current-plan.txt`
- Falls back to `.claude/current-plan.txt` in main worktree

### /plan:implement
- Works normally within worktree context
- Uses worktree's current plan

### /plan:orchestrate
- Accepts `--worktree <path>` to specify worktree directory
- Creates worktree-specific log files

### /plan:complete
- Detects worktree context
- Merges worktree branch to main
- Optionally removes worktree after merge

## Configuration

Worktree settings are configured in `.claude/git-workflow.json`:

```json
{
  "worktrees": {
    "enabled": true,
    "directory": "worktrees",
    "max_concurrent": 3,
    "auto_cleanup": true,
    "stale_days": 14
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable worktree-based parallel plan execution |
| `directory` | string | `"worktrees"` | Directory for worktrees relative to repo root |
| `max_concurrent` | integer | `3` | Maximum number of concurrent worktrees allowed |
| `auto_cleanup` | boolean | `true` | Automatically clean up worktrees after plan completion |
| `stale_days` | integer | `14` | Days of inactivity before a worktree is considered stale |

**Directory naming convention:**
- Worktrees are created as `{directory}/plan-{name}/`
- Branch is named `plan/{name}` (using configured `branch_prefix`)
- Context directory is `.claude-context/` inside the worktree

## Error Handling

**Git not available:**
```
Error: Git is not available
  Worktree commands require git 2.5+
```

**Worktree directory exists but not registered:**
```
Error: Directory exists but is not a git worktree: worktrees/plan-my-plan
  Remove the directory manually or use a different name
```

**Branch in use by another worktree:**
```
Error: Branch 'plan/my-plan' is already checked out in another worktree
  Path: /path/to/other/worktree

  Use --attach flag to create a second worktree on the same branch
  Or remove the other worktree first
```

**Disk space issues:**
```
Warning: Low disk space detected
  Available: 1.2 GB
  Each worktree uses approximately the size of your working files

  Consider removing unused worktrees:
    /plan:worktree list
    /plan:worktree remove <name>
```

## Typical Workflows

### Starting a New Plan in Parallel

When you want to work on a new plan while another is in progress:

```bash
# 1. Create worktree for the new plan
/plan:worktree create my-new-feature

# 2. Change to the worktree directory
cd worktrees/plan-my-new-feature

# 3. Start Claude Code in the new worktree
claude

# 4. Work on the plan normally - it's isolated from your main work
/plan:implement 1.1 1.2 --autonomous
```

### Running Multiple Orchestrators in Parallel

Execute multiple plans simultaneously:

```bash
# Terminal 1: Run orchestrator for plan A
cd worktrees/plan-feature-auth
python scripts/plan_orchestrator.py

# Terminal 2: Run orchestrator for plan B
cd worktrees/plan-api-refactor
python scripts/plan_orchestrator.py

# Terminal 3: Monitor all plans
/plan:worktree list
```

### Completing a Plan and Cleaning Up

After finishing a plan in a worktree:

```bash
# 1. Complete the plan (creates PR, merges)
/plan:complete

# 2. Remove the worktree
/plan:worktree remove my-feature

# Or with force to skip confirmation
/plan:worktree remove my-feature --force
```

### Checking Status Across All Worktrees

View progress of all active plans:

```bash
# List all worktrees with status
/plan:worktree list

# JSON output for scripting
/plan:worktree list --json
```

### Switching Between Plans

When you need to switch context between plans:

```bash
# See available worktrees
/plan:worktree list

# Get the path for a specific plan
/plan:worktree switch feature-auth

# Then switch in your terminal
cd worktrees/plan-feature-auth
```

## Quick Reference

| Task | Command |
|------|---------|
| Create new worktree | `/plan:worktree create <name>` |
| Attach to existing branch | `/plan:worktree create <name> --attach` |
| Auto-attach for scripting | `/plan:worktree create <name> --auto-attach` |
| List all worktrees | `/plan:worktree list` |
| Get JSON output | `/plan:worktree list --json` |
| Switch to worktree | `cd worktrees/plan-<name>` |
| Remove worktree | `/plan:worktree remove <name>` |
| Force remove | `/plan:worktree remove <name> --force` |

## See Also

- `/plan:set` - Set active plan
- `/plan:create` - Create new plan from template
- `/plan:complete` - Complete and merge plan
- `/plan:orchestrate` - Run automated task execution
