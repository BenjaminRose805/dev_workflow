# Plan Cleanup

Identify and manage stale plan branches.

## Usage

```bash
/plan:cleanup                    # List stale plan branches and expired archive tags
/plan:cleanup --delete           # Delete stale branches and archives (with confirmation)
/plan:cleanup --delete --yes     # Delete without confirmation
/plan:cleanup --archive          # Archive before deleting branches
/plan:cleanup --keep-archives    # Skip archive tag cleanup
/plan:cleanup --days 60          # Custom age threshold (default: 30 days)
```

## Instructions

### 1. Parse Arguments

**Supported flags:**

| Flag | Description |
|------|-------------|
| `--delete` | Delete listed stale branches (local and remote) |
| `--archive` | Create archive tag before deletion |
| `--yes` | Skip confirmation prompts |
| `--days N` | Custom age threshold in days (default: 30) |
| `--keep-archives` | Skip cleanup of expired archive tags |

**Parsing logic:**
```
args = skill arguments
delete_mode = args contains "--delete"
archive_mode = args contains "--archive"
skip_confirm = args contains "--yes"
keep_archives = args contains "--keep-archives"
age_days = extract number after "--days" or use default 30
```

### 2. Load Configuration

Read cleanup settings from `.claude/git-workflow.json`:

```bash
# Check for config file
CONFIG_FILE=".claude/git-workflow.json"

if [ -f "$CONFIG_FILE" ]; then
  # Read cleanup_age_days (default: 30)
  CLEANUP_AGE=$(cat "$CONFIG_FILE" | grep -o '"cleanup_age_days":\s*[0-9]*' | grep -o '[0-9]*')
  CLEANUP_AGE=${CLEANUP_AGE:-30}

  # Read archive_branches (default: true)
  ARCHIVE_BRANCHES=$(cat "$CONFIG_FILE" | grep -o '"archive_branches":\s*true' || echo "")

  # Read archive_retention_days (default: 90)
  ARCHIVE_RETENTION=$(cat "$CONFIG_FILE" | grep -o '"archive_retention_days":\s*[0-9]*' | grep -o '[0-9]*')
  ARCHIVE_RETENTION=${ARCHIVE_RETENTION:-90}
else
  CLEANUP_AGE=30
  ARCHIVE_BRANCHES=""
  ARCHIVE_RETENTION=90
fi

# Command-line --days flag overrides config
if [ -n "$DAYS_ARG" ]; then
  CLEANUP_AGE="$DAYS_ARG"
fi
```

### 3. Identify Stale Plan Branches

Find all plan branches and check their age:

```bash
# Get current date in seconds since epoch
NOW=$(date +%s)

# Calculate age threshold in seconds
THRESHOLD=$((CLEANUP_AGE * 24 * 60 * 60))

# List all plan branches (local)
git branch --list 'plan/*' | while read branch; do
  # Remove leading whitespace and asterisk
  branch=$(echo "$branch" | sed 's/^[* ]*//')

  # Get last commit date for this branch
  LAST_COMMIT=$(git log -1 --format="%ct" "$branch" 2>/dev/null)

  if [ -n "$LAST_COMMIT" ]; then
    AGE=$((NOW - LAST_COMMIT))
    AGE_DAYS=$((AGE / 86400))

    if [ $AGE -gt $THRESHOLD ]; then
      echo "$branch|$AGE_DAYS|$LAST_COMMIT"
    fi
  fi
done
```

**Include remote-only branches:**
```bash
# List remote plan branches not present locally
git branch -r --list 'origin/plan/*' | while read remote_branch; do
  remote_branch=$(echo "$remote_branch" | sed 's/^[* ]*//')
  local_branch=$(echo "$remote_branch" | sed 's|origin/||')

  # Skip if local branch exists
  if ! git rev-parse --verify "$local_branch" >/dev/null 2>&1; then
    LAST_COMMIT=$(git log -1 --format="%ct" "$remote_branch" 2>/dev/null)

    if [ -n "$LAST_COMMIT" ]; then
      AGE=$((NOW - LAST_COMMIT))
      AGE_DAYS=$((AGE / 86400))

      if [ $AGE -gt $THRESHOLD ]; then
        echo "$remote_branch|$AGE_DAYS|$LAST_COMMIT|remote-only"
      fi
    fi
  fi
done
```

### 4. Display Stale Branches

Show a formatted list of stale branches with age and last commit info:

```
Stale Plan Branches (older than 30 days)

Branch                              Age    Last Commit
─────────────────────────────────────────────────────────
plan/old-feature                    45d    abc1234 Add feature X
plan/abandoned-refactor             92d    def5678 WIP: refactor auth
plan/test-coverage (remote-only)    38d    ghi9012 Add tests

Found 3 stale branches.
```

**Format for each branch:**
```bash
# Get last commit info
LAST_COMMIT_HASH=$(git log -1 --format="%h" "$branch")
LAST_COMMIT_MSG=$(git log -1 --format="%s" "$branch" | head -c 40)

printf "%-35s %4dd   %s %s\n" "$branch" "$AGE_DAYS" "$LAST_COMMIT_HASH" "$LAST_COMMIT_MSG"
```

**If no stale branches found:**
```
No stale plan branches found (threshold: 30 days).
```

### 5. Handle Delete Mode

If `--delete` flag is passed:

**Step 1: Show branches to delete**
```
The following branches will be deleted:

  plan/old-feature (local + remote)
  plan/abandoned-refactor (local + remote)
  plan/test-coverage (remote-only)

This action cannot be undone.
```

**Step 2: Confirm deletion (unless --yes)**

If `--yes` flag is passed, skip directly to Step 3.

Otherwise, use AskUserQuestion to confirm deletion:

```
question: "Delete N stale plan branches?"
header: "Confirm"
options:
  - label: "Delete branches"
    description: "Permanently delete all listed stale branches"
  - label: "Cancel"
    description: "Abort cleanup - no changes will be made"
multiSelect: false
```

**Warning text to display before confirmation:**
```
⚠ Warning: Branch deletion cannot be undone.

The following branches will be permanently deleted:
  • plan/old-feature (local + remote)
  • plan/abandoned-refactor (local only)
  • plan/test-coverage (remote only)

Total: 3 branches
```

If user selects "Cancel", exit gracefully:
```
Cleanup cancelled. No branches were deleted.
```

If `--archive` flag was provided, note that archive tags will be created:
```
Note: Archive tags will be created before deletion (--archive specified).
```

**Step 3: Delete branches**

Handle all three branch type scenarios:

| Branch Type | Detection | Deletion Action |
|-------------|-----------|-----------------|
| Local + Remote | Has local ref AND remote tracking | Delete local first, then remote |
| Local only | Has local ref, no remote tracking | Delete local only |
| Remote only | No local ref, has `origin/plan/*` | Delete remote only |

```bash
for branch in $STALE_BRANCHES; do
  LOCAL_EXISTS=false
  REMOTE_EXISTS=false

  # Determine branch type
  if git rev-parse --verify "$branch" >/dev/null 2>&1; then
    LOCAL_EXISTS=true
  fi
  if git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
    REMOTE_EXISTS=true
  fi

  # Handle remote-only branches (stored with origin/ prefix in stale list)
  if [[ "$branch" == origin/* ]]; then
    REMOTE_BRANCH="${branch#origin/}"
    if git push origin --delete "$REMOTE_BRANCH" 2>/dev/null; then
      echo "✓ Deleted remote-only: $branch"
    else
      echo "⚠ Failed to delete remote: $branch"
    fi
    continue
  fi

  # Delete local branch if exists
  if [ "$LOCAL_EXISTS" = true ]; then
    if git branch -D "$branch" 2>/dev/null; then
      echo "✓ Deleted local: $branch"
    else
      echo "✗ Failed to delete local: $branch (may be current branch)"
    fi
  fi

  # Delete remote branch if exists
  if [ "$REMOTE_EXISTS" = true ]; then
    if git push origin --delete "$branch" 2>/dev/null; then
      echo "✓ Deleted remote: origin/$branch"
    else
      echo "⚠ Failed to delete remote: origin/$branch (may require permissions)"
    fi
  fi
done
```

**Output for different scenarios:**
```
# Local + Remote branch:
✓ Deleted local: plan/old-feature
✓ Deleted remote: origin/plan/old-feature

# Local only branch:
✓ Deleted local: plan/local-only-branch

# Remote only branch:
✓ Deleted remote-only: origin/plan/remote-only-branch
```

### 6. Handle Archive Mode

If `--archive` flag is passed, create archive tags before deletion.

**Run BEFORE Step 3 (deletion)** to preserve branch history.

```bash
ARCHIVE_PREFIX="archive/plan"

for branch in $STALE_BRANCHES; do
  # Normalize branch name (handle both local and remote-only)
  if [[ "$branch" == origin/* ]]; then
    # Remote-only branch: origin/plan/name -> plan/name
    NORMALIZED="${branch#origin/}"
    REF="$branch"  # Use origin/plan/name as ref for tagging
  else
    # Local branch: plan/name
    NORMALIZED="$branch"
    REF="$branch"
  fi

  # Get branch name without plan/ prefix
  BRANCH_NAME=$(echo "$NORMALIZED" | sed 's|^plan/||')

  # Create archive tag
  ARCHIVE_TAG="$ARCHIVE_PREFIX/$BRANCH_NAME"

  # Check if tag already exists
  if git rev-parse --verify "$ARCHIVE_TAG" >/dev/null 2>&1; then
    echo "⚠ Archive tag already exists: $ARCHIVE_TAG (skipping)"
    continue
  fi

  # Tag the branch head with annotation
  git tag -a "$ARCHIVE_TAG" "$REF" -m "$(cat <<EOF
Archived plan branch: $NORMALIZED

Archived at: $(date -Iseconds)
Original branch: $NORMALIZED
Branch type: $([ "$NORMALIZED" != "$branch" ] && echo "remote-only" || echo "local")
Last commit: $(git log -1 --format="%h %s" "$REF")
EOF
)"

  echo "✓ Created archive tag: $ARCHIVE_TAG"
done
```

**Archive tag format:** `archive/plan/{branch-name}`

**Examples:**
| Original Branch | Archive Tag |
|-----------------|-------------|
| `plan/old-feature` | `archive/plan/old-feature` |
| `origin/plan/remote-only` | `archive/plan/remote-only` |

**Duplicate handling:** If archive tag already exists (from previous cleanup attempt), skip with warning.

### 7. Identify Expired Archive Tags

**Skip this section if `--keep-archives` flag is present.** Show message:
```
Archive tag cleanup skipped (--keep-archives specified).
```

After handling branches, identify archive tags that have exceeded the retention period.

**Get archive tag creation dates:**
```bash
# Get current date in seconds since epoch
NOW=$(date +%s)

# Calculate retention threshold in seconds
RETENTION_THRESHOLD=$((ARCHIVE_RETENTION * 24 * 60 * 60))

# List all archive tags matching archive/plan/* pattern
EXPIRED_TAGS=""
git tag -l 'archive/plan/*' | while read tag; do
  # Get tag creation date from the tag object
  # For annotated tags, this is the tagger date
  TAG_DATE=$(git for-each-ref --format='%(creatordate:unix)' "refs/tags/$tag" 2>/dev/null)

  # Fallback: if no tagger date, use the commit date
  if [ -z "$TAG_DATE" ] || [ "$TAG_DATE" = "0" ]; then
    TAG_DATE=$(git log -1 --format="%ct" "$tag" 2>/dev/null)
  fi

  if [ -n "$TAG_DATE" ] && [ "$TAG_DATE" != "0" ]; then
    AGE=$((NOW - TAG_DATE))
    AGE_DAYS=$((AGE / 86400))

    if [ $AGE -gt $RETENTION_THRESHOLD ]; then
      # Format: tag|age_days|creation_date
      echo "$tag|$AGE_DAYS|$TAG_DATE"
    fi
  fi
done
```

**Display expired archive tags:**
```
Expired Archive Tags (older than 90 days)

Tag                                     Age    Created
──────────────────────────────────────────────────────────
archive/plan/old-feature                120d   2024-08-15
archive/plan/abandoned-refactor         95d    2024-09-20
archive/plan/completed-migration        180d   2024-06-01

Found 3 expired archive tags.
```

**Handle edge cases:**
- Tags without dates: Skip with warning `⚠ Could not determine age for tag: $tag`
- Lightweight tags (no tagger date): Use commit date as fallback
- Malformed tags: Skip with warning `⚠ Malformed archive tag: $tag`

**If no expired tags found:**
```
No expired archive tags found (retention: 90 days).
```

### 8. Delete Expired Archive Tags

If `--delete` flag is passed and expired archive tags were found, delete them.

**Step 1: Show tags to delete**
```
The following archive tags will be deleted:

  archive/plan/old-feature (120 days old)
  archive/plan/abandoned-refactor (95 days old)
  archive/plan/completed-migration (180 days old)

This action cannot be undone. Archived history will be lost.
```

**Step 2: Confirm deletion (unless --yes)**

If `--yes` flag is passed, skip directly to Step 3.

Otherwise, use AskUserQuestion to confirm:
```
question: "Delete N expired archive tags?"
header: "Confirm"
options:
  - label: "Delete expired archives"
    description: "Permanently remove archive tags older than retention period"
  - label: "Cancel"
    description: "Keep archive tags - no changes will be made"
multiSelect: false
```

If user selects "Cancel":
```
Archive cleanup cancelled. No tags were deleted.
```

**Step 3: Delete archive tags**

```bash
for tag in $EXPIRED_TAGS; do
  # Delete local tag
  if git tag -d "$tag" 2>/dev/null; then
    echo "✓ Deleted local tag: $tag"
  else
    echo "⚠ Failed to delete local tag: $tag"
  fi

  # Delete remote tag if it exists
  if git ls-remote --tags origin "refs/tags/$tag" | grep -q "$tag"; then
    if git push origin --delete "$tag" 2>/dev/null; then
      echo "✓ Deleted remote tag: $tag"
    else
      echo "⚠ Failed to delete remote tag: $tag (may require permissions)"
    fi
  fi
done
```

**Output:**
```
Deleting expired archive tags...
✓ Deleted local tag: archive/plan/old-feature
✓ Deleted remote tag: archive/plan/old-feature
✓ Deleted local tag: archive/plan/abandoned-refactor
✓ Deleted remote tag: archive/plan/abandoned-refactor
✓ Deleted local tag: archive/plan/completed-migration
  (no remote tag found)

Deleted 3 archive tags.
```

### 9. Report Summary

After operations complete:

**List mode (no --delete):**
```
Stale Plan Branches Summary
──────────────────────────────

Found 3 stale branches (older than 30 days).
Found 2 expired archive tags (older than 90 days).

To delete these branches and archives:
  /plan:cleanup --delete

To archive branches before deleting:
  /plan:cleanup --delete --archive

To skip archive cleanup:
  /plan:cleanup --delete --keep-archives

To skip confirmation:
  /plan:cleanup --delete --yes
```

**Delete mode:**
```
Cleanup Complete
────────────────

Branch Types Processed:
  - Local + Remote: 2 branches
  - Local only: 1 branch
  - Remote only: 1 branch

Deleted: 4 branches total
  - 3 local branches removed
  - 3 remote branches removed

Archived: 4 branches (--archive was specified)

Archive Tags Cleaned:
  - 2 expired archive tags deleted
```

**Delete mode with failures:**
```
Cleanup Complete (with warnings)
────────────────────────────────

Deleted: 3 branches
  - 2 local branches removed
  - 2 remote branches removed

Archive Tags Cleaned:
  - 2 expired archive tags deleted

Warnings:
  ⚠ Could not delete remote: origin/plan/protected-branch (permission denied)
  ✗ Could not delete local: plan/current-branch (checked out)

Archived: 4 branches (--archive was specified)
```

## Configuration

Settings in `.claude/git-workflow.json`:

| Option | Default | Description |
|--------|---------|-------------|
| `cleanup_age_days` | 30 | Days before a branch is considered stale |
| `archive_branches` | true | Whether to suggest archiving before deletion |
| `archive_retention_days` | 90 | Days before archive tags are considered expired |

**Example configuration:**
```json
{
  "cleanup_age_days": 60,
  "archive_branches": true,
  "archive_retention_days": 90
}
```

## Archive Retention Policy

The archive retention system provides a two-phase cleanup approach:

### Phase 1: Branch Archiving (Immediate)
When `--archive` is used with `--delete`, stale branches are preserved as archive tags before deletion:
- **Tag format:** `archive/plan/{branch-name}`
- **Contains:** Full branch history at time of archival
- **Metadata:** Annotated tag with archive date, original branch name, and last commit

### Phase 2: Archive Cleanup (After Retention Period)
After the retention period (default 90 days), archive tags are considered expired:
- **Retention period:** Configured via `archive_retention_days` (default: 90 days)
- **Automatic detection:** Expired archives are listed during `/plan:cleanup`
- **Deletion:** Removed when `--delete` is used (unless `--keep-archives` specified)

### Recommended Retention Periods

| Team Size | Suggested `archive_retention_days` | Rationale |
|-----------|-----------------------------------|-----------|
| Solo/Small | 30-60 days | Quick iteration, less history needed |
| Medium | 90 days (default) | Balance between history and cleanup |
| Enterprise | 180-365 days | Compliance and audit requirements |

### Preserving Archives Indefinitely

To keep archive tags forever:
1. Set `archive_retention_days` to a very high value (e.g., 36500 = 100 years)
2. Always use `--keep-archives` flag when running cleanup
3. Store critical archives as regular tags: `git tag important-v1.0 archive/plan/name`

## Safety Notes

- **Current branch protection:** Never deletes the currently checked-out branch
- **Active plan protection:** Never deletes the branch for the currently active plan
- **Confirmation required:** Deletion requires explicit confirmation (unless `--yes`)
- **Archive option:** Use `--archive` to preserve branch history as tags
- **Graceful failures:** Individual branch deletion failures don't stop the process

## Examples

```bash
# Just see what's stale (branches and archive tags)
/plan:cleanup

# Delete with confirmation (branches and archives)
/plan:cleanup --delete

# Archive first, then delete branches
/plan:cleanup --delete --archive

# Delete branches only, keep archive tags
/plan:cleanup --delete --keep-archives

# Non-interactive deletion (for scripts)
/plan:cleanup --delete --yes

# Custom age threshold for branches
/plan:cleanup --days 60

# Combine options
/plan:cleanup --delete --archive --days 14 --yes

# Delete branches but preserve all archive history
/plan:cleanup --delete --archive --keep-archives --yes
```
