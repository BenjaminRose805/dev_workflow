# Task 11.3: Migration Plan

**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

This migration plan details the transition from the current 11-command `plan:*` namespace to the new 34-command action-based taxonomy.

**Key Metrics:**
- **Current System:** 11 commands, 6 templates, 30+ scripts
- **New System:** 34 commands across 8 categories
- **Migration Timeline:** 16 weeks (4 phases)
- **Parallel Running Period:** 8 weeks minimum

---

## 1. Command Mapping

### Commands That Stay
| Current | New | Action |
|---------|-----|--------|
| `plan:create` | `plan:create` | Enhanced, backward compatible |
| `plan:status` | `plan:status` | Add workflow state |
| `plan:set` | `plan:set` | Add workflow context |
| `plan:archive` | `plan:archive` | Add workflow support |
| `plan:split` | `plan:split` | No change |

### Commands That Get Renamed
| Current | New | Alias Period |
|---------|-----|--------------|
| `plan:implement` | `/implement` | 8 weeks |
| `plan:batch` | `/workflow:batch` | 8 weeks |
| `plan:verify` | `/validate` | 8 weeks |
| `plan:explain` | `/explain` | 8 weeks |
| `plan:templates` | `/template:list` | 8 weeks |

---

## 2. Deprecation Timeline

```
Week 0: Migration Start

Phase 1 (Weeks 1-4): Foundation
├─ New infrastructure deployed
├─ Data migration utilities ready
└─ New commands in beta (opt-in)

Phase 2 (Weeks 5-10): Rollout
├─ All new commands available
├─ Soft deprecation warnings begin
└─ Both systems fully functional

Phase 3 (Weeks 11-14): Parallel Operation
├─ Strong deprecation warnings
├─ Migration assistant active
└─ User migration support

Phase 4 (Weeks 15-16): Deprecation
├─ Old commands disabled (gracefully)
├─ Redirect to new commands
└─ Final data migration

Week 16: Migration Complete
```

---

## 3. Data Migration

### Status.json Migration
- **Current:** Schema v1.0
- **New:** Schema v2.0 (adds workflowState, task metadata)
- **Strategy:** Auto-migrate on first access

### Plan Files
- **No changes required** - Format remains compatible
- Status tracking enhanced via status.json

### Cache Strategy
- **Invalidate all** on major version upgrade
- Research cache cleared and rebuilt

---

## 4. Rollback Procedures

### Level 1: Config-Based (< 1 hour)
```json
{
  "features": {
    "newCommandStructure": false,
    "legacyCommands": true
  }
}
```

### Level 2: Command Restoration (< 4 hours)
- Restore old command files from git
- Clear new command directories
- Preserve all data

### Level 3: Full Rollback (< 8 hours)
- Complete git reversion
- Data downgrade scripts
- Full v1.0 restoration

---

## 5. User Communication

### Week 1: Announcement
"Upcoming CLI Enhancement - New Command Structure"

### Week 5: Launch
"New CLI Commands Now Available - Migration Guide"

### Week 11: Urgent Reminder
"URGENT: CLI Command Migration Deadline Approaching"

---

**Task 11.3 Status: COMPLETE**
