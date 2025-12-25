# Documentation Standards Analysis Plan

## Objective
Analyze existing documentation to:
1. Catalog all docs and their purposes
2. Identify removable/obsolete documentation
3. Establish which documents define the authoritative standards for plans, phases, and tasks

## Metadata
- **Created**: 2025-12-25
- **Restructured**: 2025-12-25 (consolidated for orchestrator isolation)
- **Status**: Active
- **Priority**: P1
- **Output Directory**: `docs/plan-outputs/documentation-standards-analysis/`

---

## Phase 1: Documentation Inventory

- [ ] 1.1 Catalog and assess core documentation files
  - Review `docs/VISION.md` - document its purpose and assess relevance
  - Review `docs/ARCHITECTURE.md` - document its purpose and assess relevance
  - Review `docs/ORCHESTRATOR.md` - document its purpose and assess relevance
  - Review `docs/PLAN-EXECUTION-TRACKER.md` - document its purpose and assess relevance
  - For each file, categorize as: KEEP (essential), CONSOLIDATE (merge with another), or ARCHIVE (obsolete)
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/1.1-core-docs.md`

- [ ] 1.2 Catalog and assess standards documentation
  - Review `docs/standards/implementation-plan-standards.md` and document its purpose
  - Review `docs/standards/artifact-type-registry.md` and document its purpose
  - Review `docs/standards/artifact-type-naming-reference.md` and document its purpose
  - Review `docs/standards/priority-assignment-matrix.md` and document its purpose
  - Review `docs/standards/subcommand-naming-reference.md` and document its purpose
  - List all remaining `docs/standards/*.md` files with brief purpose descriptions
  - For each, identify if it's actively used by current implementation or purely theoretical
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/1.2-standards-docs.md`

- [ ] 1.3 Catalog and assess plan templates
  - Review `docs/plan-templates/TEMPLATE.md` - document its purpose and structure
  - Review `docs/plan-templates/CANONICAL-COMMAND-TEMPLATE.md` - document its purpose
  - List all `docs/plan-templates/implement-*.md` files (expected 45+)
  - Identify templates that are duplicative (similar content)
  - Identify templates that appear unused (no matching plans or commands)
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/1.3-templates.md`

- [ ] 1.4 Catalog and assess schema files
  - Review all `docs/schemas/*.json` files - document purpose of each schema
  - Review all `scripts/lib/schemas/*.json` files - document purpose of each schema
  - Identify schema overlaps (same concept defined in multiple places)
  - Identify schema inconsistencies (conflicting definitions)
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/1.4-schemas.md`

---

## Phase 2: Obsolescence Analysis

- [ ] 2.1 Analyze archive directories and identify cleanup candidates
  - Review `docs/plans/archive/` - list contents and confirm archival is appropriate
  - Review `docs/completed plans/` if it exists - assess if contents should be deleted or properly archived
  - Review `docs/plan-outputs/archive/` - list contents and assess retention value
  - For each archived item, recommend: RETAIN (has historical value), DELETE (no value), or MOVE (wrong location)
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/2.1-archive-analysis.md`

- [ ] 2.2 Identify duplicate and overlapping documentation
  - Compare `docs/plan-system/` contents with `docs/standards/` contents for overlap
  - Search for files covering the same topic in different locations
  - Identify template files with nearly identical content
  - For each duplicate pair, recommend which to keep as authoritative and which to remove/merge
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/2.2-duplicates.md`

- [ ] 2.3 Identify outdated documentation requiring update or removal
  - Search for docs referencing patterns no longer used (check against current scripts/*.js)
  - Search for docs that contradict current implementation behavior
  - Search for docs describing features that were never implemented
  - For each outdated doc, recommend: UPDATE (fix content), ARCHIVE (historical only), or DELETE (misleading)
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/2.3-outdated.md`

---

## Phase 3: Standards Authority Analysis

- [ ] 3.1 Map plan standards and identify gaps
  - Search all documentation for files that define plan structure requirements
  - Identify THE authoritative document for plan structure (or note if multiple compete)
  - Document what required sections a plan must have according to current standards
  - Document naming conventions for plans according to current standards
  - Identify any aspects of plans that lack clear documented standards
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/3.1-plan-standards.md`

- [ ] 3.2 Map phase standards and identify gaps
  - Search all documentation for files that define phase structure requirements
  - Identify THE authoritative document for phase structure (or note if multiple compete)
  - Document required elements for a phase according to current standards
  - Document phase numbering and naming conventions
  - Identify any aspects of phases that lack clear documented standards
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/3.2-phase-standards.md`

- [ ] 3.3 Map task standards and identify gaps
  - Search all documentation for files that define task structure requirements
  - Identify THE authoritative document for task structure (or note if multiple compete)
  - Document required elements for a task according to current standards
  - Document task ID format conventions (e.g., 1.1, 2.3)
  - Document valid task status states (pending, in_progress, completed, etc.)
  - Identify any aspects of tasks that lack clear documented standards
  - Write findings to `docs/plan-outputs/documentation-standards-analysis/findings/3.3-task-standards.md`

---

## Phase 4: Consolidation Recommendations

- [ ] 4.1 Produce comprehensive documentation cleanup action plan
  - Read all findings from `docs/plan-outputs/documentation-standards-analysis/findings/` directory
  - Compile list of files to DELETE (truly obsolete, no value)
  - Compile list of files to ARCHIVE (historical value only, move to archive)
  - Compile list of files to MERGE (consolidate duplicates into single authoritative file)
  - Compile list of files to UPDATE (fix inconsistencies or outdated content)
  - For MERGE items, specify which file survives and what content to incorporate
  - Write complete action plan to `docs/plan-outputs/documentation-standards-analysis/cleanup-plan.md`

- [ ] 4.2 Propose authoritative standards document and hierarchy
  - Read findings from Phase 3 tasks (3.1, 3.2, 3.3) in the findings directory
  - Draft structure for unified `PLAN-STANDARDS.md` covering plans, phases, and tasks
  - Define clear requirements and rules for each (plan requirements, phase requirements, task requirements)
  - Create standards hierarchy defining which document is authoritative for what aspect
  - Document how templates should inherit from and reference the authoritative standards
  - Write proposed standards specification to `docs/plan-outputs/documentation-standards-analysis/proposed-standards.md`
  - Write hierarchy diagram/documentation to `docs/plan-outputs/documentation-standards-analysis/standards-hierarchy.md`

---

## Success Criteria

- [ ] All documentation files cataloged with clear purpose descriptions
- [ ] Each file has actionable recommendation (KEEP/CONSOLIDATE/ARCHIVE/DELETE/UPDATE)
- [ ] Duplicate documentation identified with specific merge recommendations
- [ ] Clear answer documented: "What document defines plan standards?"
- [ ] Clear answer documented: "What document defines phase standards?"
- [ ] Clear answer documented: "What document defines task standards?"
- [ ] Actionable cleanup plan with specific file-by-file actions
- [ ] Proposed authoritative standards structure ready for implementation

---

## Expected Outputs

| Output | Location | Description |
|--------|----------|-------------|
| Core Docs Inventory | `findings/1.1-core-docs.md` | Assessment of VISION, ARCHITECTURE, etc. |
| Standards Inventory | `findings/1.2-standards-docs.md` | Assessment of docs/standards/ |
| Templates Inventory | `findings/1.3-templates.md` | Assessment of plan templates |
| Schemas Inventory | `findings/1.4-schemas.md` | Assessment of JSON schemas |
| Archive Analysis | `findings/2.1-archive-analysis.md` | Archive retention recommendations |
| Duplicates Report | `findings/2.2-duplicates.md` | Duplicate files and merge targets |
| Outdated Report | `findings/2.3-outdated.md` | Outdated docs and resolutions |
| Plan Standards Map | `findings/3.1-plan-standards.md` | Plan authority and gaps |
| Phase Standards Map | `findings/3.2-phase-standards.md` | Phase authority and gaps |
| Task Standards Map | `findings/3.3-task-standards.md` | Task authority and gaps |
| Cleanup Plan | `cleanup-plan.md` | Complete action plan |
| Proposed Standards | `proposed-standards.md` | New unified specification |
| Standards Hierarchy | `standards-hierarchy.md` | Authority chain documentation |

---

## Notes

This analysis will establish clarity on:
1. **Single Source of Truth**: Which document is authoritative for each aspect
2. **Removal Candidates**: What can be safely deleted or archived
3. **Consistency Rules**: What patterns must all plans/phases/tasks follow
