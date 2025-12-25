# Completed Plans Archive

> **See also:** [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) for step-by-step migration commands

## Overview

The `docs/plans/archive/` directory contains historical plans that have been fully completed. These use the legacy inline checkbox format and are preserved for reference.

## Directory Contents

Located at: `docs/plans/archive/`

Current archived plans:
1. **claude-commands-enhancement.md** - Enhanced Claude Commands system with agents and templates
2. **plan-commands.md** - Plan management slash commands implementation
3. **stdin-lifecycle-tests.md** - Automated tests for stdin lifecycle refactoring
4. **test-reorganization-plan.md** - Consolidation of tests into dedicated directory
5. **test-suite-implementation.md** - Comprehensive test suite with real services

## Status

- **All plans:** 100% complete
- **Format:** Legacy inline checkbox format (`- [x]` in plan file)
- **Purpose:** Historical reference and documentation
- **Active:** No (archived)

## Migration

### Do I Need to Migrate?

**Short answer: No.**

These plans are complete and archived. They don't need migration for normal use.

### When to Migrate

Consider migrating if you want:
- Unified querying across all plans (active + archived)
- Historical execution tracking
- Consistent data format for analytics
- To use `/plan:status` on archived plans

### How to Migrate

See [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) for complete commands.

### What Migration Does

1. Creates `docs/plan-outputs/{plan-name}/` directory
2. Generates `status.json` with all tasks marked complete
3. Sets `migrated: true` flag with timestamp
4. Preserves original file in `docs/plans/archive/` (no changes)

### What Migration Does NOT Do

- Modify original plan files
- Move files out of `docs/plans/archive/`
- Create findings files (completed tasks have no new findings)
- Change any active plans

## Querying Archived Plans

### Before Migration

Use the completed plans scanner:
```bash
node scripts/scan-completed-plans.js
```

Returns JSON:
```json
{
  "completedPlans": [
    {
      "path": "/path/to/plan.md",
      "title": "Plan Title",
      "totalTasks": 50,
      "complete": 50,
      "completionPercentage": 100,
      "archived": true
    }
  ],
  "count": 5
}
```

### After Migration

Use standard plan commands:
```bash
/plan:set          # Archived plans appear in list
/plan:status       # Shows 100% complete with migration info
```

## Best Practices

### Keep as Archive (Recommended)

**Pros:**
- Simple - no extra files
- Clear separation between active and done
- Original format preserved
- No maintenance needed

**When to use:**
- You don't need to query old plans often
- Historical reference is sufficient
- Prefer simplicity

### Migrate to New System

**Pros:**
- Unified querying across all plans
- Consistent data format
- Can generate analytics/reports
- Future-proof for new features

**When to use:**
- You query old plans frequently
- Building dashboards or reports
- Want consistent tooling
- Plan to analyze historical data

## File Organization

```
docs/
├── plans/                          # Active plans (new system)
│   └── *.md
├── plan-outputs/                   # Execution outputs
│   └── {plan-name}/
│       └── status.json
└── plans/archive/                # Archived plans (legacy)
    ├── claude-commands-enhancement.md
    ├── plan-commands.md
    ├── stdin-lifecycle-tests.md
    ├── test-reorganization-plan.md
    └── test-suite-implementation.md
```

After migration:
```
docs/
├── plans/                          # Active plans
├── plan-outputs/                   # Execution outputs
│   ├── active-plan-1/              # Active plan outputs
│   │   └── status.json
│   ├── claude-commands-enhancement/  # Migrated archived plan
│   │   └── status.json             # All tasks marked complete
│   └── test-suite-implementation/  # Migrated archived plan
│       └── status.json
└── plans/archive/                # Archived plans (unchanged)
    └── *.md                        # Original files preserved
```

## See Also

- `/plan:archive` - View and manage archived plans
- `/plan:migrate` - Migrate plans to new system
- `scripts/scan-completed-plans.js` - Query archived plans
- `scripts/migrate-completed-plan.js` - Migrate individual plan
