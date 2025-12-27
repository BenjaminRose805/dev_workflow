# Finding: Dead Code - Unused JavaScript Files

## Summary

Analysis of the JavaScript codebase in `/home/benjamin/tools/dev_workflow/scripts/` reveals several unused files and modules. These scripts were created as part of the agent-based research and verification workflow but are not actively integrated into the main development pipeline. The primary issue is that these research tools depend on external Node.js packages (`execa`, `gray-matter`) that are not declared in `package.json`, making them non-functional without dependency installation.

## Items for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| `/scripts/benchmark.js` | Never called or tested | Safe | Comprehensive benchmark tool (437 lines) for measuring script performance, but has no tests and is not invoked by any automation. Documented in architecture but not used. |
| `/scripts/research-for-implement.js` | Never called or tested | Safe | Research agent for task analysis (414 lines). Listed in index.js COMMANDS but has zero actual usages/imports. No corresponding tests. |
| `/scripts/verify-with-agent.js` | Never called or tested | Safe | Agent-based task verification (434 lines). Listed in index.js COMMANDS but never invoked. No tests. Dependencies on unused lib modules. |
| `/scripts/parallel-research-pipeline.js` | Never called or tested | Safe | Three-phase parallel research pipeline (722 lines). Most substantial script but zero integration. No tests. |
| `/scripts/scan-completed-plans.js` | Never called or tested | Safe | Scans archived plans (113 lines). Not invoked, has no tests, archived plan scanning appears superseded. |
| `/scripts/lib/frontmatter-parser.js` | Unused library module, broken dependency | High | Only 59 lines. Requires `gray-matter` which is not in package.json. Not imported by any active code. |
| `/scripts/lib/constraint-types.js` | Only self-documented, never imported | Safe | Type definitions module (119 lines). Not required anywhere despite having export statements. Only references in its own JSDoc. |
| `/scripts/lib/parallel-agents.js` | Imported only by unused scripts | Safe | Async parallel execution utility (167 lines). Only used by verify-with-agent.js and research-for-implement.js which themselves are unused. |
| `/scripts/lib/server-fetch.js` | Task 12.5 incomplete, never imported | Medium | Server-side plan fetching utility (230+ lines) for NextJS. No active imports in JS code. Designed for frontend that hasn't been built. |

## Additional Findings

### External Dependencies Issue
- `execa` is required by:
  - `/scripts/check-file-status.js` (line 37) - ACTIVE, actually used
  - `/scripts/lib/agent-launcher.js` (line 30) - ACTIVE, used by research scripts
  - Not declared in `package.json` dependencies

- `gray-matter` is required by:
  - `/scripts/lib/frontmatter-parser.js` (line 6) - UNUSED module
  - Not declared in `package.json` dependencies

### Test Coverage Gaps
These scripts have **zero test coverage**:
- benchmark.js
- scan-completed-plans.js
- research-for-implement.js
- verify-with-agent.js
- parallel-research-pipeline.js

While there are 13 test files in `/scripts/tests/`, none test the above scripts.

### False Positives (Keep These)

| File | Status | Reason |
|------|--------|--------|
| `/scripts/lib/agent-cache.js` | ACTIVE | Used by agent-launcher.js which is used by verify-with-agent and research-for-implement |
| `/scripts/lib/agent-launcher.js` | ACTIVE | Used by check-file-status.js, research-for-implement.js, parallel-research-pipeline.js, verify-with-agent.js |
| `/scripts/lib/agent-pool.js` | ACTIVE | Used by parallel-research-pipeline.js |
| `/scripts/api-server.js` | ACTIVE | REST API server, modified in recent commits (8ed1cea, f10b709) |
| `/scripts/status-cli.js` | ACTIVE | Core CLI tool with extensive usage across tests and status management (3435+ lines) |
| `/scripts/worktree-cli.js` | ACTIVE | Worktree management, modified in recent commits |
| All `/scripts/tests/*.js` | ACTIVE | Test files with active test coverage for status-cli, dependencies, conflicts, parallel phases, etc. |
| All `/scripts/lib/*.js` except noted | MOSTLY ACTIVE | Core library modules heavily used by active scripts |

## Recommendations

### Priority 1: Remove Immediately (Lowest Risk)
1. **Remove `/scripts/scan-completed-plans.js`** - Smallest unused script (113 lines), no dependencies on it
2. **Remove `/scripts/lib/constraint-types.js`** - Self-contained type definitions, never imported

### Priority 2: Remove After Review (Medium Risk)
3. **Remove `/scripts/lib/frontmatter-parser.js`** - Broken dependency on undefined `gray-matter` package. Verify no hidden imports first.
4. **Remove `/scripts/benchmark.js`** - Useful for performance analysis but completely orphaned. Consider archiving to docs if performance metrics are valuable.
5. **Remove `/scripts/lib/server-fetch.js`** - Appears to be part of incomplete NextJS dashboard plan. Has no active imports.

### Priority 3: Conditional Removal (Needs Human Review)
6. **Evaluate `/scripts/research-for-implement.js`, `/scripts/verify-with-agent.js`, `/scripts/parallel-research-pipeline.js`** together as a suite. These appear to be agent-based research tools that were part of an earlier development phase. Determine:
   - Are they mentioned in any active plans?
   - Should they be archived to `/docs/plan-outputs/archive/`?
   - Are they intended for future use or truly obsolete?

### Action Items
- **Update package.json**: Add `execa` and `gray-matter` to dependencies if these scripts are kept, or remove the scripts and unused dependency.
- **Document intent**: Add comments to unused scripts clarifying whether they're archived, deprecated, or under active development.
- **Consider archiving**: Move unused research/verify scripts to `/docs/plan-outputs/archive/` with analysis of why they're not in use.
- **Test coverage**: If scripts are retained, add minimal smoke tests to `scripts/tests/run-all-tests.js`.

### Items Needing Investigation
- The **recent git history** shows Python scripts (`plan_orchestrator.py`, `orchestrator_server.py`) have become the primary orchestration mechanism, potentially replacing the JavaScript research/verify scripts entirely.
- Check `.claude/commands/` to see if any plan execution commands reference the research scripts.
- Review `/docs/plans/EXECUTION-ORDER.md` to see if these scripts are part of any active workflow.
