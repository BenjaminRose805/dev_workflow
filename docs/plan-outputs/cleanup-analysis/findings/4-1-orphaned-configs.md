# Finding: Orphaned Configuration Files

## Summary

Audit of configuration files to identify orphaned, duplicate, or obsolete configuration. Found 1 unused configuration schema file, 3 empty cache directories, and several configuration items that reference unimplemented features.

## Configuration Files Analyzed

### Core Configuration Files

| File | Status | Used By | Notes |
|------|--------|---------|-------|
| `.claude/git-workflow.json` | Active | Plan commands, status-cli.js | Branch naming, auto-commit settings |
| `.claude/current-plan.txt` | Active | All plan commands | Current active plan pointer |
| `.claude/orchestrator-registry.json` | Active | Plan orchestrator | Running orchestrator instances |
| `.claude/settings.local.json` | Active | Claude Code | Permission allowlist |
| `package.json` | Active | Node.js | Minimal - only proper-lockfile |
| `package-lock.json` | Active | npm | Lock file for dependencies |
| `.gitignore` | Active | Git | Ignore patterns |

### Potentially Orphaned Files

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| `.claude/config-schema.json` | Never referenced in code | Safe | Schema for features not implemented |
| `.claude/orchestrator-registry.json.lock` | Lock file - may be stale | Safe | Created by proper-lockfile |

## Items for Removal

### Priority 1: Review for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| `.claude/config-schema.json` | Defines schema for unimplemented commands (explore, analyze, validate, test, review, deploy) | Review | Could be kept for future reference |

### Priority 2: Empty/Placeholder Directories

| Directory | Contents | Risk | Notes |
|-----------|----------|------|-------|
| `.claude/cache/research/` | Empty | Safe | Placeholder for research caching |
| `.claude/cache/scripts/` | Empty | Safe | Placeholder for script caching |
| `.claude/cache/speculative/` | Empty | Safe | Placeholder for speculative caching |
| `.claude/logs/` | Only `.gitkeep` | Safe | Logs directory never used |

### Priority 3: Stale References in config-schema.json

The `config-schema.json` file references features that don't exist:

| Feature | Referenced In | Actual Status |
|---------|--------------|---------------|
| `commands.explore` | config-schema.json | No `/explore` command exists |
| `commands.analyze` | config-schema.json | No `/analyze` command exists |
| `commands.validate` | config-schema.json | No `/validate` command exists |
| `commands.test` | config-schema.json | No `/test` command exists |
| `commands.review` | config-schema.json | No `/review` command exists |
| `commands.deploy` | config-schema.json | No `/deploy` command exists |
| `artifact_registry.path` | config-schema.json | `docs/.artifact-registry.json` doesn't exist |
| `hooks.context_loading` | config-schema.json | No hook implementation |
| `hooks.artifact_storage` | config-schema.json | No hook implementation |
| `hooks.notifications` | config-schema.json | No hook implementation |
| `hooks.error_recovery` | config-schema.json | No hook implementation |
| `quality_gates` | config-schema.json | No quality gate implementation |

## Duplicate/Conflicting Configurations

| Issue | Files | Notes |
|-------|-------|-------|
| None found | - | Configuration is well-organized |

## Recommendations

### Priority 1: Remove Orphaned Schema
- **Action:** Delete `.claude/config-schema.json`
- **Rationale:** Defines features that were never implemented; misleading documentation
- **Alternative:** Move to `docs/reference/` as future roadmap reference

### Priority 2: Clean Up Empty Directories
- **Action:** Remove empty cache subdirectories OR add proper caching implementation
- **Rationale:** Unused placeholder directories

### Priority 3: Remove Stale Lock File
- **Action:** Delete `.claude/orchestrator-registry.json.lock` if no orchestrator running
- **Rationale:** Stale lock files can cause issues

## Configuration That Should Exist But Doesn't

| Config File | Purpose | Priority |
|-------------|---------|----------|
| `requirements.txt` | Python dependencies | High |
| `.editorconfig` | Editor settings | Low |
| `tsconfig.json` | TypeScript (if using TS) | N/A |

## Summary Statistics

| Category | Count |
|----------|-------|
| Active config files | 7 |
| Orphaned config files | 1 |
| Empty directories | 4 |
| Stale lock files | 1 |
| Unimplemented features in schema | 12 |
