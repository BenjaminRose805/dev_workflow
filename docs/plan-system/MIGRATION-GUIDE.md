# Plan System Migration Guide

## Overview

This guide explains how to migrate plans between different formats and systems.

## Migration Scenarios

### 1. Active Plan with Inline Results → Output Separation

**When:** You have an active plan in `docs/plans/` with inline checkboxes and results.

**Command:**
```bash
/plan:migrate
```

**What it does:**
1. Creates `docs/plan-outputs/{plan-name}/` directory
2. Extracts inline results to `findings/` files
3. Creates `status.json` from checkbox states
4. Optionally cleans plan file (removes inline results, keeps structure)
5. Links tasks to findings files

**Result:** Clean plan file + separate output tracking.

---

### 2. Completed Plan → New System

**When:** You have a plan in `docs/completed plans/` you want to query with new tools.

**Command:**
```bash
/plan:archive
# Then select "Migrate all" or choose specific plans
```

**Or directly:**
```bash
node scripts/migrate-completed-plan.js "docs/completed plans/plan-name.md"
```

**What it does:**
1. Creates `docs/plan-outputs/{plan-name}/` directory
2. Generates `status.json` with all tasks marked complete
3. Sets `migrated: true` flag
4. Preserves original in `docs/completed plans/` (no changes)

**Result:** Archived plan queryable via `/plan:status`, original preserved.

---

### 3. Legacy Plan → Active Plan

**When:** You want to reuse an old completed plan for new work.

**Steps:**
1. Copy plan from `docs/completed plans/` to `docs/plans/`
2. Reset checkboxes: `- [x]` → `- [ ]`
3. Initialize output tracking:
   ```bash
   /plan:set
   ```
4. Set as active plan

**Result:** Fresh plan ready for new execution run.

---

## Migration Options

### Include Completed Plans

By default, `/plan:migrate` only migrates active plans. To include archived plans:

```bash
/plan:migrate --include-completed
```

This will:
1. Migrate all plans in `docs/plans/`
2. Migrate all plans in `docs/completed plans/`
3. Create output directories for all
4. Preserve all original files

### Dry Run

Preview migration without creating files:

```bash
node scripts/migrate-completed-plan.js "docs/completed plans/plan.md" --dry-run
```

Output shows what would be created without actually creating it.

### Selective Migration

Migrate specific plans only:

```bash
/plan:archive
# Then use checkboxes to select which plans to migrate
```

---

## Migration Safety

### Non-Destructive

All migrations are non-destructive:
- Original files are NEVER modified (unless explicitly cleaned)
- New files created in separate directory
- Rollback is simple (delete output directory)

### Verification

After migration, verify:

```bash
# Check status tracking works
/plan:status

# Check output directory exists
ls docs/plan-outputs/{plan-name}/

# Check status.json is valid
cat docs/plan-outputs/{plan-name}/status.json | jq
```

### Rollback

To undo migration:

```bash
# Remove output directory
rm -rf docs/plan-outputs/{plan-name}/

# Original plan file is unchanged
```

---

## Common Issues

### "Output directory already exists"

**Cause:** Plan has already been migrated.

**Solutions:**
- If you want to re-migrate, delete the output directory first
- If migration was successful, no action needed

### "No tasks found in plan"

**Cause:** Plan file has no checkbox tasks or uses non-standard format.

**Solutions:**
- Check plan uses `- [ ]` or `- [x]` format
- Verify tasks are present in the file
- May need manual status.json creation

### "Plan file not found"

**Cause:** Path is incorrect or file moved.

**Solutions:**
- Verify path: `ls "docs/completed plans/"`
- Use tab completion for paths
- Check for typos in filename

---

## Best Practices

### When to Migrate

**Migrate active plans when:**
- You want clean plan files
- You want execution tracking
- You'll reuse the plan multiple times
- You want findings separated

**Migrate completed plans when:**
- You need unified querying
- Building reports/dashboards
- Want consistent data format
- Frequently reference old plans

### When NOT to Migrate

**Don't migrate if:**
- Plan is truly one-off and done
- You prefer inline results for simplicity
- Plan is just notes/brainstorming
- Historical reference is sufficient

### Organization Strategy

Recommended structure:

```
docs/
├── plans/                    # Active work
│   ├── current-feature.md
│   └── next-sprint.md
├── plan-outputs/             # Execution tracking
│   ├── current-feature/
│   └── next-sprint/
└── completed plans/          # Historical archive
    └── old-work.md
```

Migration flow:
1. Create plan in `docs/plans/`
2. Execute with output separation
3. When complete, move to `docs/completed plans/`
4. Output stays in `docs/plan-outputs/` for history

---

## See Also

- `/plan:migrate` - Migrate active plans
- `/plan:archive` - View and migrate archived plans
- `COMPLETED-PLANS.md` - Archived plans documentation
