# Task 11.4: Backward Compatibility Strategy

**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

This document defines the backward compatibility strategy for migrating from the current 11-command `plan:*` system to the proposed 34-command action-based architecture.

**Key Principles:**
1. All existing commands continue to work - No removal without 12+ month deprecation
2. Existing artifacts remain valid - Plan files, status.json forward-compatible
3. API stability guaranteed - Status manager functions maintain signatures
4. Migration is optional - Users can continue current workflows indefinitely

---

## 1. Compatibility Levels

### Full Compatibility (Identical Behavior)
| Feature | Status |
|---------|--------|
| `/plan:create` | FULL - Command unchanged |
| `/plan:status` | FULL - Status display unchanged |
| `/plan:set` | FULL - Pointer management unchanged |
| Plan file format | FULL - Phase-based markdown valid |
| `status.json` schema | FULL - All fields backward compatible |
| `.claude/current-plan.txt` | FULL - Pointer file unchanged |
| Template variables `{{var}}` | FULL - Syntax unchanged |
| Phase/task ID format | FULL - "1.1", "2.3" preserved |

### API Compatibility (Signatures Preserved)
```javascript
// GUARANTEED STABLE through v2.0.0
markTaskCompleted(planPath, taskId, findingsContent?)
markTaskFailed(planPath, taskId, errorMessage)
markTaskSkipped(planPath, taskId, reason)
markTaskStarted(planPath, taskId)
loadStatus(planPath)
saveStatus(planPath, statusObj)
getProgress(planPath)
```

---

## 2. Deprecation Policy

### Timeline
```
v0.2.0 (Month 3): New Commands Released
├─ New commands available
├─ Old commands still work
└─ No warnings yet

v0.3.0 (Month 6): Deprecation Warnings
├─ Deprecation warnings added
├─ Migration guide published
└─ Both systems supported

v0.9.0 (Month 9): Final Warnings
├─ Prominent final warnings
├─ Auto-migration tool released
└─ LTS branch created

v1.0.0 (Month 12): Breaking Release
├─ plan:* commands removed
├─ Aliases remain (redirect)
└─ LTS v0.9.x supported 6 months
```

### Warning Format
```
DEPRECATION WARNING: /plan:implement

This command is deprecated and will be removed in v1.0.0.
Please use: /implement --plan=architecture-review
Migration guide: docs/migration/plan-implement.md
```

---

## 3. Compatibility Shims

### Command Aliases
Old commands redirect to new ones with argument translation:

| Old Command | New Command | Translation |
|------------|-------------|-------------|
| `/plan:implement` | `/implement` | Add `--plan=$CURRENT_PLAN` |
| `/plan:batch` | `/workflow:batch` | Add `--source=plan` |
| `/plan:verify` | `/validate` | Add `--plan=$CURRENT_PLAN` |
| `/plan:explain` | `/explain` | Add `--context=plan` |

### API Wrappers
```javascript
// Old signature (deprecated but supported)
function markTaskCompleted(planPath, taskId, findingsContent) {
  return markTaskCompletedV2(planPath, taskId, findingsContent, {});
}

// New signature (recommended)
function markTaskCompletedV2(planPath, taskId, findingsContent, metadata) {
  // Enhanced implementation
}
```

### Data Format Converters
- Auto-migrate status.json v1 -> v2 on read
- Write in latest format
- Preserve unknown fields

---

## 4. Version Policy

### Semantic Versioning
```
v0.2.3
│ │ │
│ │ └─► PATCH: Bug fixes, no API changes
│ └───► MINOR: New features, backward compatible
└─────► MAJOR: Breaking changes
```

### Breaking Change Definition
| Change Type | Breaking? |
|------------|-----------|
| Remove command | YES |
| Rename parameter | YES |
| Remove API function | YES |
| Add command | NO |
| Add optional parameter | NO |
| Add new field to status.json | NO |

---

## 5. Testing Strategy

### Compatibility Test Suite
```
tests/compatibility/
├── command-aliases.test.js
├── api-signatures.test.js
├── data-migration.test.js
├── template-variables.test.js
├── plan-format.test.js
└── integration/
    ├── plan-create-flow.test.js
    └── status-tracking.test.js
```

### Coverage Requirements
| Area | Target |
|------|--------|
| Command aliases | 100% |
| API signatures | 100% |
| Data migration | 100% |
| Integration flows | 90% |

---

## 6. LTS Support

### v0.9.x LTS (6 months after v1.0.0)
- Last version before v1.0.0
- Supports all plan:* commands
- Security fixes only
- No new features

### When to Use LTS
- Large organizations with slow upgrade cycles
- Production systems requiring stability
- Complex custom integrations not yet migrated

---

## Success Criteria

- **Zero breaking changes** in v0.2.0 release
- **100% of old workflows** continue to function
- **All API functions** maintain signatures
- **Data migration** success rate > 99.9%
- **User complaints** < 1% of users

---

**Task 11.4 Status: COMPLETE**
