# Documentation Standards Hierarchy

**Generated:** 2025-12-25
**Source:** Documentation Standards Analysis Plan - Phase 4, Task 4.2
**Purpose:** Define the authority chain and relationship between all standards documents

---

## Authority Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHORITY HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Level 1: PRIMARY AUTHORITY (Single Source of Truth)                        │
│  ════════════════════════════════════════════════════                        │
│                                                                              │
│      ┌───────────────────────────────────────────┐                          │
│      │  PLAN-STANDARDS.md (proposed)             │                          │
│      │  ─────────────────────────────            │                          │
│      │  Unified specification for:               │                          │
│      │  • Plan structure and naming              │                          │
│      │  • Phase requirements                     │                          │
│      │  • Task format and states                 │                          │
│      │  • Execution tracking                     │                          │
│      └───────────────────────────────────────────┘                          │
│                           │                                                  │
│                           ▼                                                  │
│  Level 2: SCHEMA AUTHORITY (Programmatic Validation)                        │
│  ════════════════════════════════════════════════════                        │
│                                                                              │
│      ┌───────────────────────────────────────────┐                          │
│      │  scripts/lib/schemas/plan-status.json     │                          │
│      │  ─────────────────────────────────────    │                          │
│      │  JSON Schema that:                        │                          │
│      │  • Validates status.json files            │                          │
│      │  • Enforces task ID format                │                          │
│      │  • Defines valid status enum              │                          │
│      └───────────────────────────────────────────┘                          │
│                           │                                                  │
│                           ▼                                                  │
│  Level 3: TEMPLATE AUTHORITY (Reference Implementations)                    │
│  ══════════════════════════════════════════════════════                      │
│                                                                              │
│      ┌───────────────────────────────────────────┐                          │
│      │  CANONICAL-COMMAND-TEMPLATE.md            │──┐                       │
│      │  ─────────────────────────────            │  │                       │
│      │  • Complete phase structure               │  │                       │
│      │  • Standard sections                      │  │                       │
│      │  • Template variable reference            │  ├──→ Template           │
│      └───────────────────────────────────────────┘  │     Inheritance       │
│                                                      │                       │
│      ┌───────────────────────────────────────────┐  │                       │
│      │  docs/plan-templates/TEMPLATE.md          │──┘                       │
│      │  ─────────────────────────────            │                          │
│      │  • Template format documentation          │                          │
│      │  • Variable syntax                        │                          │
│      │  • Usage instructions                     │                          │
│      └───────────────────────────────────────────┘                          │
│                           │                                                  │
│                           ▼                                                  │
│  Level 4: CONCRETE TEMPLATES (Reusable Patterns)                            │
│  ═══════════════════════════════════════════════                             │
│                                                                              │
│      ┌───────────────────────────────────────────┐                          │
│      │  docs/plan-templates/implement-*.md       │ (38 files)               │
│      │  docs/plan-templates/analysis.md          │                          │
│      │  docs/plan-templates/validation.md        │                          │
│      │  docs/plan-templates/documentation.md     │                          │
│      └───────────────────────────────────────────┘                          │
│                           │                                                  │
│                           ▼                                                  │
│  Level 5: INSTANTIATED PLANS (Actual Work Items)                            │
│  ═══════════════════════════════════════════════                             │
│                                                                              │
│      ┌───────────────────────────────────────────┐                          │
│      │  docs/plans/*.md                          │                          │
│      │  ─────────────────                        │                          │
│      │  Active plans ready for execution         │                          │
│      └───────────────────────────────────────────┘                          │
│                           │                                                  │
│                           ▼                                                  │
│  Level 6: EXECUTION STATE (Runtime Tracking)                                │
│  ═══════════════════════════════════════════                                 │
│                                                                              │
│      ┌───────────────────────────────────────────┐                          │
│      │  docs/plan-outputs/*/status.json          │                          │
│      │  ─────────────────────────────            │                          │
│      │  • Task completion state                  │                          │
│      │  • Timestamps and duration                │                          │
│      │  • Error messages and notes               │                          │
│      │  • Authoritative execution record         │                          │
│      └───────────────────────────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authority Matrix

### What Document Defines What

| Standard Aspect | Authoritative Document | Level |
|-----------------|----------------------|-------|
| **Plan Structure** | | |
| Required sections | PLAN-STANDARDS.md | 1 |
| Section order | PLAN-STANDARDS.md | 1 |
| Metadata fields | PLAN-STANDARDS.md | 1 |
| Output directory structure | PLAN-STANDARDS.md | 1 |
| **Phase Structure** | | |
| Required elements | PLAN-STANDARDS.md | 1 |
| Numbering conventions | PLAN-STANDARDS.md | 1 |
| Phase 0 usage | PLAN-STANDARDS.md | 1 |
| VERIFY section format | PLAN-STANDARDS.md | 1 |
| **Task Structure** | | |
| Required fields (execution) | plan-status.json schema | 2 |
| ID format regex | plan-status.json schema | 2 |
| Valid status values | plan-status.json schema | 2 |
| Checkbox format | PLAN-STANDARDS.md | 1 |
| Findings file format | PLAN-STANDARDS.md | 1 |
| **Templates** | | |
| Template variable syntax | TEMPLATE.md | 3 |
| Command template structure | CANONICAL-COMMAND-TEMPLATE.md | 3 |
| Standard phase patterns | CANONICAL-COMMAND-TEMPLATE.md | 3 |
| **Execution** | | |
| Current task state | status.json (per-plan) | 6 |
| Completion timestamps | status.json (per-plan) | 6 |
| Error messages | status.json (per-plan) | 6 |
| **Artifacts** | | |
| Artifact type names | artifact-type-registry.md | - |
| Artifact metadata fields | artifact-metadata.json schema | - |

---

## Current vs. Proposed Hierarchy

### Current State (Before Consolidation)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CURRENT STATE: Multiple competing authorities                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐    ┌─────────────────────────┐         │
│  │ implementation-plan-    │    │ plan-status.json        │         │
│  │ standards.md            │    │ (schema)                │         │
│  │                         │    │                         │         │
│  │ Defines: plan structure,│    │ Defines: task execution │         │
│  │ naming, quality         │    │ state, status values    │         │
│  └───────────┬─────────────┘    └───────────┬─────────────┘         │
│              │                               │                       │
│              │  ← GAP: No explicit link →   │                       │
│              │                               │                       │
│              ▼                               ▼                       │
│  ┌─────────────────────────┐    ┌─────────────────────────┐         │
│  │ ORCHESTRATOR.md         │    │ ARCHITECTURE.md         │         │
│  │                         │    │                         │         │
│  │ Defines: execution flow,│    │ Defines: system design, │         │
│  │ troubleshooting         │    │ component relationships │         │
│  └─────────────────────────┘    └─────────────────────────┘         │
│              │                               │                       │
│              └───────── OVERLAP ─────────────┘                       │
│                         │                                            │
│                         ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ architecture/orchestrator-system.md                      │        │
│  │                                                          │        │
│  │ Defines: Same content as above (85% duplicate)          │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│  PROBLEMS:                                                           │
│  • No single authority for plan standards                           │
│  • Execution standards scattered across 3 docs                      │
│  • Template standards separate from plan standards                  │
│  • 85% duplication in orchestrator docs                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Proposed State (After Consolidation)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROPOSED STATE: Clear authority chain                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                    PLAN-STANDARDS.md                     │        │
│  │                    (NEW - PRIMARY)                       │        │
│  │                                                          │        │
│  │  Unified authority for:                                  │        │
│  │  • Plan structure, naming, quality                      │        │
│  │  • Phase structure and requirements                     │        │
│  │  • Task format and status tracking                      │        │
│  │  • Execution standards and error handling               │        │
│  │  • Template inheritance rules                           │        │
│  └─────────────────────────┬───────────────────────────────┘        │
│                            │                                         │
│          ┌─────────────────┼─────────────────┐                      │
│          │                 │                 │                      │
│          ▼                 ▼                 ▼                      │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│  │ plan-status.  │ │ CANONICAL-    │ │ orchestrator- │              │
│  │ json schema   │ │ COMMAND-      │ │ system.md     │              │
│  │               │ │ TEMPLATE.md   │ │ (merged)      │              │
│  │ Validates:    │ │               │ │               │              │
│  │ status.json   │ │ Demonstrates: │ │ Explains:     │              │
│  │ structure     │ │ standard      │ │ execution     │              │
│  │               │ │ phases        │ │ system        │              │
│  └───────────────┘ └───────────────┘ └───────────────┘              │
│                                                                      │
│  BENEFITS:                                                           │
│  • Single source of truth for all plan standards                    │
│  • Clear inheritance from standards → templates → plans             │
│  • No duplicate documentation                                       │
│  • Explicit authority levels                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Supporting Document Roles

### Essential Supporting Documents (KEEP)

| Document | Role | Authority For |
|----------|------|---------------|
| `docs/ARCHITECTURE.md` | System overview | Component relationships, data flow |
| `docs/VISION.md` | Strategic direction | Product philosophy, command taxonomy |
| `docs/architecture/orchestrator-system.md` | Execution reference | Status CLI usage, troubleshooting |
| `docs/standards/artifact-type-registry.md` | Artifact catalog | Valid artifact type names |
| `docs/standards/priority-assignment-matrix.md` | Priority guidance | Command/feature priority decisions |

### Reference Documents (KEEP, lower authority)

| Document | Role | Notes |
|----------|------|-------|
| `docs/standards/subcommand-naming-reference.md` | Quick reference | Derived from plans, could be auto-generated |
| `docs/standards/command-configuration-guide.md` | Config reference | Infrastructure documentation |
| `docs/plan-system/MIGRATION-GUIDE.md` | Operational guide | How-to for plan migration |
| `docs/plan-system/COMPLETED-PLANS.md` | Conceptual guide | When/why to archive plans |

### Artifact Schemas (KEEP, validation authority)

| Schema | Validates | Used By |
|--------|-----------|---------|
| `docs/schemas/artifact-metadata.json` | Base artifact metadata | All artifacts |
| `docs/schemas/analysis-report.json` | /analyze outputs | /analyze command |
| `docs/schemas/validation-report.json` | /validate outputs | /validate command |
| `scripts/lib/schemas/plan-status.json` | status.json files | Plan execution system |
| `scripts/lib/schemas/verify-result.json` | Verification outputs | verify-with-agent.js |

---

## Conflict Resolution Rules

When documents conflict, apply these rules:

### Rule 1: Higher Authority Wins

```
PLAN-STANDARDS.md > schema files > templates > plans
```

If a template contradicts PLAN-STANDARDS.md, PLAN-STANDARDS.md is correct.

### Rule 2: Schema Enforces Standards

```
JSON Schema validates → what PLAN-STANDARDS.md specifies
```

Schemas implement programmatic validation of standards.

### Rule 3: Templates Demonstrate, Don't Define

```
Templates show how to apply standards, not what the standards are.
```

If a template omits a required section, the template is incomplete, not the standard wrong.

### Rule 4: Execution State is Authoritative

```
status.json > markdown checkboxes
```

For task completion state, status.json is always authoritative.

### Rule 5: Newer Version Supersedes

```
Document with later "Last Updated" date takes precedence
```

Both documents should reference each other to avoid conflicts.

---

## Document Relationships Diagram

```
                          PLAN-STANDARDS.md
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ PLAN STRUCTURE  │   │ PHASE STRUCTURE │   │ TASK STRUCTURE  │
│ Standards       │   │ Standards       │   │ Standards       │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ CANONICAL-      │   │ phase structure │   │ plan-status.json│
│ COMMAND-        │◄──┤ in templates    │   │ schema          │
│ TEMPLATE.md     │   │                 │   │                 │
└────────┬────────┘   └─────────────────┘   └────────┬────────┘
         │                                           │
         ▼                                           │
┌─────────────────┐                                 │
│ implement-*.md  │                                 │
│ templates       │                                 │
│ (38 files)      │                                 │
└────────┬────────┘                                 │
         │                                           │
         ▼                                           ▼
┌─────────────────┐                     ┌─────────────────┐
│ docs/plans/*.md │─────────────────────│ status.json     │
│ (active plans)  │  creates/validates  │ (per plan)      │
└─────────────────┘                     └─────────────────┘


LEGEND:
─────→  "defines/inherits from"
════►  "validates/enforces"
```

---

## Implementation Recommendations

### Phase 1: Create PLAN-STANDARDS.md

1. Create new `docs/standards/PLAN-STANDARDS.md` based on proposed-standards.md
2. Mark as Version 1.0
3. Add cross-reference to existing implementation-plan-standards.md

### Phase 2: Update References

1. Add header to implementation-plan-standards.md:
   ```markdown
   > **Note:** This document is being superseded by [PLAN-STANDARDS.md](PLAN-STANDARDS.md).
   > For the unified specification, see the new document.
   ```

2. Update TEMPLATE.md to reference PLAN-STANDARDS.md
3. Update CANONICAL-COMMAND-TEMPLATE.md header

### Phase 3: Consolidate Orchestrator Docs

1. Merge ORCHESTRATOR.md content into orchestrator-system.md
2. Replace ORCHESTRATOR.md with redirect file
3. Remove orchestrator section from ARCHITECTURE.md

### Phase 4: Validate Templates

1. Audit all 38 implement-*.md templates against PLAN-STANDARDS.md
2. Fix any non-compliant templates
3. Consider template consolidation to reduce boilerplate

---

## Quick Reference: "Which Document Do I Use?"

| If you need to know... | Look in... |
|------------------------|------------|
| What sections a plan needs | PLAN-STANDARDS.md (proposed) |
| How to format a phase | PLAN-STANDARDS.md (proposed) |
| Valid task status values | plan-status.json schema |
| How to use template variables | docs/plan-templates/TEMPLATE.md |
| What phases a command template has | CANONICAL-COMMAND-TEMPLATE.md |
| How to run the orchestrator | docs/architecture/orchestrator-system.md |
| What artifact types exist | docs/standards/artifact-type-registry.md |
| Command priorities | docs/standards/priority-assignment-matrix.md |
| System architecture | docs/ARCHITECTURE.md |
| Product vision | docs/VISION.md |

---

**End of Standards Hierarchy Document**
