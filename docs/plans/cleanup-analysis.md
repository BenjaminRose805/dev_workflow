# Analysis Plan: Codebase Cleanup

## Overview

- **Objective:** Identify extra files, outdated documentation, dead code, and unused dependencies for removal
- **Type:** Analysis → Generates `cleanup-implementation.md` plan
- **Created:** 2025-12-27
- **Output:** `docs/plan-outputs/cleanup-analysis/`

> **Scope Boundary:** This plan focuses ONLY on things to REMOVE. It does not cover:
> - Code quality improvements (see: optimization-analysis)
> - Bug fixes (see: fix-issues-analysis)
> - Missing features (see: missing-features-analysis)

---

## Phase 1: Dead Code Detection

**Objective:** Find code that is never executed or referenced.

- [ ] 1.1 Identify unused Python files and modules
  - Scan all `.py` files in `scripts/`
  - Check import graph to find files never imported
  - Check for orphaned test files with no corresponding source
  - Document in finding: `findings/1-1-unused-python-files.md`

- [ ] 1.2 Identify unused JavaScript/Node files
  - Scan all `.js` files in `scripts/`
  - Check require/import statements to find unreferenced files
  - Look for duplicate functionality between JS and Python
  - Document in finding: `findings/1-2-unused-js-files.md`

- [ ] 1.3 Identify unused functions and classes
  - Use static analysis to find unexported/uncalled functions
  - Check for commented-out code blocks
  - Look for TODO/FIXME markers on abandoned code
  - Document in finding: `findings/1-3-unused-code.md`

**VERIFY 1:** All dead code findings documented with file paths and line numbers

---

## Phase 2: Outdated Documentation

**Objective:** Find documentation that no longer matches reality.

- [ ] 2.1 Audit README files for accuracy
  - Check all README.md files against current functionality
  - Verify command examples still work
  - Check for references to renamed/removed files
  - Document in finding: `findings/2-1-outdated-readmes.md`

- [ ] 2.2 Audit inline documentation and comments
  - Find docstrings describing removed parameters
  - Find comments referencing old architecture
  - Check for stale TODO comments (>6 months old pattern)
  - Document in finding: `findings/2-2-stale-comments.md`

- [ ] 2.3 Audit plan and analysis documents
  - Check `docs/plans/` for completed/abandoned plans
  - Check `docs/plan-outputs/` for orphaned output directories
  - Identify analysis docs that are no longer relevant
  - Document in finding: `findings/2-3-outdated-docs.md`

**VERIFY 2:** All outdated documentation catalogued with specific inaccuracies noted

---

## Phase 3: Unused Dependencies

**Objective:** Find package dependencies that are no longer needed.

- [ ] 3.1 Audit Python dependencies
  - Check `requirements.txt` or `pyproject.toml` against actual imports
  - Identify packages imported but never used
  - Check for duplicate packages serving same purpose
  - Document in finding: `findings/3-1-unused-python-deps.md`

- [ ] 3.2 Audit Node.js dependencies
  - Check `package.json` against actual requires/imports
  - Identify devDependencies that could be removed
  - Check for outdated packages with security issues
  - Document in finding: `findings/3-2-unused-node-deps.md`

**VERIFY 3:** Dependency audit complete with removal recommendations

---

## Phase 4: Orphaned Files and Directories

**Objective:** Find files that serve no purpose.

- [ ] 4.1 Find orphaned configuration files
  - Check for config files of removed tools
  - Find duplicate/conflicting configs
  - Check for empty or placeholder files
  - Document in finding: `findings/4-1-orphaned-configs.md`

- [ ] 4.2 Find orphaned output and cache directories
  - Check for stale build outputs
  - Find old log files that can be cleaned
  - Check for temporary files that weren't cleaned up
  - Document in finding: `findings/4-2-orphaned-directories.md`

- [ ] 4.3 Find orphaned assets and resources
  - Check for unused images, templates, or data files
  - Find test fixtures for removed tests
  - Check for backup files (*.bak, *.orig, etc.)
  - Document in finding: `findings/4-3-orphaned-assets.md`

**VERIFY 4:** All orphaned files catalogued with safe-to-delete assessment

---

## Phase 5: Generate Cleanup Plan

**Objective:** Create implementation plan from analysis findings.

- [ ] 5.1 Generate `cleanup-implementation.md` plan
  - Read all findings from Phase 1-4
  - Group removals by risk level (safe, review-needed, risky)
  - Create tasks for each removal category
  - Include verification steps (tests still pass, no import errors)
  - Write to `docs/plans/cleanup-implementation.md`
  - Initialize status tracking for the new plan

**VERIFY 5:** Cleanup implementation plan is valid and can be run by orchestrator

---

## Success Criteria

- [ ] All analysis phases complete with documented findings
- [ ] Each finding includes: file path, reason for removal, risk level
- [ ] Generated plan has clear, safe removal tasks
- [ ] No overlap with other analysis plans (optimization, issues, features)

---

## Findings Template

Each finding document should follow this structure:

```markdown
# Finding: [Category] - [Title]

## Summary
Brief description of what was found.

## Items for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| path/to/file.py | Never imported | Safe | |
| OldClass | No references | Review | May be used dynamically |

## Recommendations
- Priority items to remove first
- Items needing human review
- Items to keep (false positives)
```
