# Plan Archive

View and manage archived plans in `docs/completed plans/`.

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

## Instructions

### 1. Scan Archived Plans

Run the completed plans scanner:

```bash
node scripts/scan-completed-plans.js
```

This returns JSON with all archived plans.

### 2. Display Archive Summary

Show the user a summary of archived plans:

```
═══════════════════════════════════════════════════════
                  ARCHIVED PLANS
═══════════════════════════════════════════════════════

Location: docs/completed plans/

These are historical plans that have been completed.
They use the legacy inline checkbox format and are kept
for reference only.

═══ Archived Plans ({count}) ═══

1. {Plan Title}
   File: {filename}.md
   Status: {percentage}% complete ({complete}/{total} tasks)

...

═══ Migration ═══

These archived plans do NOT need to be migrated to the new
status tracking system, as they are already complete.

However, if you want unified querying or historical tracking,
you can migrate them using:

  /plan:migrate --include-completed

This will create output directories with status.json files
marking all tasks as complete, while preserving the original
plan files.

═══ Quick Actions ═══

→ /plan:migrate --include-completed - Migrate all archived plans
→ /plan:set - Switch to an active plan
→ /plan:create - Create a new plan

═══════════════════════════════════════════════════════
```

### 3. Handle User Actions

**If user wants to migrate:**
- Offer to migrate all archived plans or select specific ones
- Use `AskUserQuestion` to confirm before migration
- Run `scripts/migrate-completed-plan.js` for each selected plan
- Report results

**If user just wants to view:**
- Show the summary and exit
- These plans are read-only archives

## Migration Workflow

When user chooses to migrate archived plans:

### Step 1: Confirm Migration

```
You are about to migrate {count} archived plans to the new system.

This will:
  ✓ Create output directories in docs/plan-outputs/
  ✓ Generate status.json files with all tasks marked complete
  ✓ Preserve original plan files (no changes)
  ✓ Enable querying via /plan:status and other commands

The original files in docs/completed plans/ will NOT be modified.

Migrate all archived plans?
○ Yes, migrate all
○ Let me select which ones to migrate
○ No, cancel
```

### Step 2: Execute Migration

For each plan:

```bash
node scripts/migrate-completed-plan.js "docs/completed plans/{plan-name}.md"
```

Show progress:

```
⟳ Migrating archived plans...

✓ {plan-name-1}.md ({task-count} tasks)
✓ {plan-name-2}.md ({task-count} tasks)
...

Migration complete: {success}/{total} plans migrated
Total tasks: {total-tasks}
```

### Step 3: Summary

```
═══════════════════════════════════════════════════════
                MIGRATION COMPLETE
═══════════════════════════════════════════════════════

Migrated Plans: {count}
Total Tasks: {total-tasks}
All tasks marked as completed

Output directories created in:
  docs/plan-outputs/

You can now query these plans using:
  /plan:status
  /plan:set

Original files preserved in:
  docs/completed plans/

═══════════════════════════════════════════════════════
```

## Error Handling

**If archived directory doesn't exist:**
```
No archived plans found.

The directory docs/completed plans/ does not exist or is empty.
```

**If migration fails for a plan:**
```
⚠ Migration failed for {plan-name}.md
Error: {error-message}

Skipping...
```

## Notes

- Archived plans are READ-ONLY
- Migration is OPTIONAL and non-destructive
- Original files are NEVER modified
- Migration creates new output directories only
- Migrated plans will have `migrated: true` in status.json
