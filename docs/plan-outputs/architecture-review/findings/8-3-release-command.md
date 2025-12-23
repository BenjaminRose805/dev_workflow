# /release Command Design Specification

**Task:** 8.3 Design `/release` command (release preparation)
**Category:** Operations & Meta
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/release` command suite provides comprehensive release preparation, version management, changelog generation, and release validation capabilities. It automates the complex workflow of preparing software releases while ensuring quality, consistency, and traceability.

**Core Purpose:**
- Automate semantic versioning and version bumping
- Generate release notes from commits, PRs, and issues
- Create and manage release tags across Git and registries
- Maintain CHANGELOG.md with conventional commit integration
- Validate release readiness (tests, docs, breaking changes)
- Orchestrate multi-package releases (monorepos)

**Design Philosophy:**
- **Convention-based:** Leverage semantic versioning and conventional commits
- **Safety-first:** Validate before releasing, prevent breaking changes
- **Flexible:** Support multiple release strategies (major, minor, patch, hotfix)
- **Traceable:** Link releases to commits, PRs, and issues
- **Automated:** Minimize manual steps while maintaining control

---

## Command Structure

### Sub-Commands Table

| Sub-Command | Purpose | Primary Output | Priority |
|-------------|---------|----------------|----------|
| `release:prepare` | Prepare a new release (version bump, changelog) | `release-prep.json` | P0 |
| `release:notes` | Generate release notes from commits/PRs | `release-notes.md` | P0 |
| `release:tag` | Create and push release tags | Git tags | P0 |
| `release:changelog` | Update CHANGELOG.md | `CHANGELOG.md` | P0 |
| `release:validate` | Validate release readiness | `release-validation.md` | P0 |
| `release:version` | Bump version across package files | `package.json`, etc. | P0 |
| `release:compare` | Compare releases/versions | `release-comparison.md` | P1 |
| `release:publish` | Publish to registries (npm, PyPI, etc.) | Registry URLs | P1 |
| `release:rollback` | Rollback failed release | Rollback report | P1 |
| `release:schedule` | Schedule future releases | `release-schedule.md` | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/release.md`

```yaml
---
name: release
description: Release preparation and version management
category: operations
model: claude-sonnet-4-5
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash]
---
```

---

## Model Configuration Rationale

**Why Sonnet (not Opus):**
- Release preparation is high-volume, structured work
- Conventional commit parsing is pattern-based
- Version bumping requires precision but not deep reasoning
- Changelog generation benefits from speed
- Cost-effective for frequent release operations

**When to Use Opus:**
- Complex breaking change analysis
- Generating migration guides for major versions
- Resolving version conflicts in monorepos

---

## Release Strategy

### Semantic Versioning Integration

**Version Scheme:** MAJOR.MINOR.PATCH-PRERELEASE+BUILD

**Bump Rules:**
1. **MAJOR:** Breaking changes (conventional commit `BREAKING CHANGE:`)
2. **MINOR:** New features (`feat:` commits)
3. **PATCH:** Bug fixes (`fix:` commits)

### Conventional Commits Integration

**Commit Types:**
- `feat:` - New feature (minor bump)
- `fix:` - Bug fix (patch bump)
- `docs:` - Documentation only
- `BREAKING CHANGE:` - (major bump, any type)

### Release Workflows

**Workflow 1: Automated Patch Release**
```
/test:run → /release:validate → /release:prepare → /release:tag → /release:publish
```

**Workflow 2: Major Release with Breaking Changes**
```
/release:compare → /release:prepare --type major → /release:validate --strict → /release:tag → /release:publish
```

---

## Output Artifacts

### release-notes.md Template
Includes highlights, breaking changes, features, bug fixes, performance improvements, dependencies, and contributors.

### CHANGELOG.md Format
Following [Keep a Changelog](https://keepachangelog.com/) v1.1.0 with Added, Changed, Fixed, and Breaking Changes sections.

### release-validation.md Template
Five validation phases: Git/Version Control, Code Quality, Documentation, Security & Dependencies, Release Artifacts.

---

## Workflow Integration

### Upstream Dependencies
- `/test:run --all` - Ensure all tests pass
- `/validate:build` - Verify clean build
- `/analyze:security` - Security audit
- `/document:api` - Update API documentation

### Downstream Dependencies
- `/deploy:staging` - Deploy to staging environment
- `/deploy:production` - Deploy to production

---

## Example Usage Scenarios

### Scenario 1: Major Release (v2.0.0)
Breaking changes, migration guide generation, strict validation, signed tag.

### Scenario 2: Patch Release (v1.5.3) - Hotfix
Fast turnaround, minimal validation, immediate publish.

### Scenario 3: Pre-Release Beta (v2.0.0-beta.1)
Beta tag, early adopter testing, gradual promotion to stable.

---

## Differentiation from Related Commands

| Aspect | `/release` | `/deploy` | `/ci` |
|--------|-----------|----------|-------|
| **Purpose** | Version management | Deploy to environments | Configure CI/CD |
| **Scope** | Version bumping, changelog | Infrastructure | Pipeline setup |
| **Artifacts** | release-notes.md, tags | Deployment logs | Workflow files |

---

## Priority Classification

### P0 - Critical (Must Have)
- `release:prepare`, `release:notes`, `release:tag`, `release:changelog`, `release:validate`, `release:version`

### P1 - High Value (Should Have)
- `release:compare`, `release:publish`, `release:rollback`

### P2 - Nice to Have
- `release:schedule`

---

**Phase 8 Task 8.3 Status: COMPLETE**
