# Finding: Dead Code - Unused Functions and Classes

## Summary

Static analysis of the `/home/benjamin/tools/dev_workflow` codebase has identified one clearly unused async function exported from a utility module. The codebase is generally well-maintained with good comment documentation and proper usage of utility functions. No large commented-out code blocks (>10 lines) were found, and no stale TODO/FIXME markers indicating abandoned work were detected.

## Items for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| `scripts/lib/file-utils.js:writeFileAtomicAsync` | Function defined (line 91) and exported (line 252) but never called anywhere in codebase | Safe | Async version has no usages; synchronous `writeFileAtomic` is used in plan-status.js and plan-output-utils.js. Could be replaced with sync or removed if async writes not needed. |

## Commented-Out Code Blocks

| File | Lines | Description | Risk |
|------|-------|-------------|------|
| None found | - | No large commented-out code blocks (>10 lines) detected | N/A |

## Stale TODO/FIXME Comments

| File | Line | Comment | Age/Pattern |
|------|------|---------|-------------|
| None found | - | No TODO/FIXME/HACK/XXX/DEPRECATED markers detected in codebase | N/A |

## Detailed Analysis

### Unused Exports Found

**1. writeFileAtomicAsync in file-utils.js**
- **Location**: `scripts/lib/file-utils.js` (lines 91-116)
- **Type**: Exported async function
- **Definition**: Async version of atomic file writing
- **Usage**: No usages found anywhere in codebase
- **Related Function**: `writeFileAtomic` (sync version, lines 53-83) IS used in:
  - `scripts/lib/plan-status.js:434`
  - `scripts/lib/plan-output-utils.js:572`
  - `scripts/lib/plan-output-utils.js:598`
- **Assessment**: The synchronous version handles all current file-writing needs. The async version appears to be preemptive code that was never integrated.

### Well-Used Functions

The following utility functions and classes are properly used throughout the codebase:

**File utilities (file-utils.js)**:
- `readFile` - used by multiple modules
- `writeFile` - used by agent-launcher, plan-status, etc.
- `writeFileAtomic` - actively used for status file writes
- `glob` / `globSync` - used in glob operations
- `getCached` / `setCached` - used in scan-plans.js for caching
- `resolvePath` - used throughout

**Agent-related modules**:
- All functions in agent-cache.js are properly exported and used
- All methods in agent-pool.js are used for task management
- agent-launcher.js functions are actively used in parallel-agents.js and agent-pool.js

**Conflict detection (conflict-detector.js)**:
- All exported functions are properly used or exposed for external tools
- `calculateMergePriority` - used in `recommendMergeOrder()`
- `getBranchCreationDate` - used in `calculateMergePriority()`
- Helper functions like `createProgressStatus` and `updateStatus` in parallel-agents.js are properly used

**API Server (api-server.js)**:
- All handler functions (`handleListPlans`, `handleGetPlan`, etc.) are called from the router (`handleRequest`)
- WebSocket functions are all invoked in upgrade and client management
- Helper functions like `loadConfig`, `parseBody`, `parseQuery` are all used

## Recommendations

### Priority 1 - Safe Removal
1. **Remove `writeFileAtomicAsync` from file-utils.js**
   - This function is completely unused and has no callers
   - The synchronous version (`writeFileAtomic`) handles all requirements
   - Risk: **SAFE** - No other modules import or depend on it
   - Action: Remove function definition (lines 91-116) and export (line 252)

### Priority 2 - Keep (False Positives)
1. All other exported functions and classes are actively used
2. Utility modules are well-designed with comprehensive functionality

### Priority 3 - Code Quality Notes
- Code quality is generally high with good documentation
- No abandoned code blocks or TODO markers found
- Good separation of concerns across modules

## Conclusion

The codebase is in good condition with minimal dead code. Only one unused async helper function was identified (`writeFileAtomicAsync`), which can be safely removed as it has no callers and its synchronous counterpart handles all current needs. All other code is actively used and well-maintained.
