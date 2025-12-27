# Deferred Items from Documentation Cleanup

**Created:** 2025-12-25
**Source Plan:** docs/plans/documentation-cleanup.md

This document records items identified during the documentation cleanup that were deferred to future work.

---

## 1. Template Consolidation (Future Enhancement)

**Status:** Deferred - Low Priority

**Finding:** 38 `implement-*-command.md` templates have 95%+ structural similarity, representing ~10,000 lines of duplicate boilerplate.

**Current State:**
- docs/plan-templates/CANONICAL-COMMAND-TEMPLATE.md exists as the master template
- Each implement-* template includes the full structure rather than inheriting from the canonical

**Recommendation:**
- Update CANONICAL-COMMAND-TEMPLATE.md to be the sole source of boilerplate
- Reduce individual templates to contain only command-specific content (the "core" sections)
- Individual templates would reference the canonical template for structure

**Why Deferred:** This is a maintenance improvement, not urgent. The current templates work correctly, they're just verbose. A dedicated plan should be created to handle the refactoring carefully.

**Priority:** Low - maintenance improvement

---

## 2. Orchestration Code Changes (Future Enhancement)

**Status:** Deferred - Medium Priority

**Finding:** The documentation cleanup plan implemented the **minimum viable fix** (documentation updates only). Complete implementation requires code changes.

### Deferred Code Changes

| Component | Change Required | Priority |
|-----------|-----------------|----------|
| `scripts/status-cli.js` | Add `[SEQUENTIAL]` parsing to `cmdNext()` | Medium |
| `scripts/status-cli.js` | Return constraint metadata with tasks | Medium |
| `scripts/lib/schemas/plan-status.json` | Add optional `executionConstraints` field | Low |
| Plan initialization | Populate constraints during `init` | Low |

### Current State

The **documentation** now describes `[SEQUENTIAL]` handling:
- `.claude/commands/plan/implement.md` - Describes how to detect and respect `[SEQUENTIAL]` annotations
- Plans can include `**Execution Note:** Tasks X.Y-Z.W are [SEQUENTIAL] - reason`

The **code** does not yet parse these annotations:
- Claude must read the plan file directly to see constraints
- The status-cli.js `next` command does not include constraint metadata
- No validation that `[SEQUENTIAL]` annotations are syntactically correct

### Why Deferred

1. **Current approach works:** Claude reads plans and sees the `[SEQUENTIAL]` annotations directly
2. **Code changes require testing:** Modifying status-cli.js needs unit tests
3. **Schema changes have ripple effects:** Adding fields to plan-status.json affects all consumers
4. **Low ROI:** The documentation-based approach achieves 80% of the benefit with 20% of the effort

**Priority:** Medium - improves robustness but not blocking

---

## 3. Template-Based Constraint Definition (Future Consideration)

**Status:** Not Started - Low Priority

**Observation:** Templates could pre-define common execution constraints:

```markdown
<!-- In template -->
**Execution Note:** Tasks {{phase}}.1-{{phase}}.4 are [SEQUENTIAL] - config changes
```

This would ensure consistency across plans using the same template.

**Why Deferred:** This depends on template consolidation (Item 1). Should be addressed together.

**Priority:** Low - enhancement to deferred item

---

## References

- Source analysis: `docs/plan-outputs/documentation-standards-analysis/findings/`
- Orchestration gap analysis: `docs/plan-outputs/documentation-standards-analysis/findings/orchestration-flow-analysis.md`
- Template analysis: `docs/plan-outputs/documentation-standards-analysis/findings/1.3-templates.md`
