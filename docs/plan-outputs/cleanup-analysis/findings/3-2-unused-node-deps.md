# Finding: Node.js Dependencies Audit

## Summary

Audit of Node.js dependencies in `package.json` versus actual usage in the codebase. Found 1 declared dependency, 3 undeclared but used dependencies, 1 unused module file, and a mismatch between declared and required packages.

## Current State

**package.json dependencies:**
```json
{
  "dependencies": {
    "proper-lockfile": "^4.1.2"
  }
}
```

**Transitive dependencies installed (via proper-lockfile):**
- `graceful-fs`
- `retry`
- `signal-exit`

## Third-Party Dependencies Analysis

### Declared and Used

| Package | Declared in package.json | Actually Used | Files Using It |
|---------|-------------------------|---------------|----------------|
| `proper-lockfile` | Yes | Yes | `scripts/lib/plan-output-utils.js` |

### Undeclared but Required (Missing from package.json)

| Package | Declared | Used | Files Using It | Status |
|---------|----------|------|----------------|--------|
| `fast-glob` | No | Yes | `scripts/lib/file-utils.js` | **Works** (installed globally?) |
| `execa` | No | Yes | `scripts/lib/agent-launcher.js`, `scripts/check-file-status.js` | **BROKEN** (not installed) |
| `gray-matter` | No | Yes | `scripts/lib/frontmatter-parser.js` | **BROKEN** (not installed) |

## Items for Removal

| File/Item | Reason | Risk | Notes |
|-----------|--------|------|-------|
| `scripts/lib/frontmatter-parser.js` | Dead code - never imported by any other file | Safe | Uses `gray-matter` which isn't installed |
| `scripts/check-file-status.js` | Uses `execa` which isn't installed, file not required by others | Review | May be deprecated testing utility |

## Items to Add (Missing Dependencies)

| Package | Reason | Priority |
|---------|--------|----------|
| `fast-glob` | Required by `file-utils.js` - currently working via unknown install | High |
| `execa` | Required by `agent-launcher.js` which is used by 3 scripts | High |

## Package Analysis Detail

### `proper-lockfile` - KEEP
- **Status:** Correctly declared and used
- **Used by:** `plan-output-utils.js` for atomic file locking
- **Critical for:** Concurrent status.json updates

### `fast-glob` - ADD TO package.json
- **Status:** Used but not declared
- **Used by:** `file-utils.js:globSync()` function
- **Note:** Works currently (possibly installed globally or via another tool)
- **Action:** Add to dependencies to ensure reproducible installs

### `execa` - ADD TO package.json
- **Status:** Used but not installed
- **Used by:**
  - `agent-launcher.js` - launches Claude CLI processes
  - `check-file-status.js` - runs vitest
- **Impact:** Core agent functionality is broken without this
- **Action:** Add to dependencies

### `gray-matter` - REMOVE USAGE OR ADD
- **Status:** Used by dead code
- **Used by:** `frontmatter-parser.js` only
- **Impact:** `frontmatter-parser.js` is never imported anywhere
- **Action:** Either remove `frontmatter-parser.js` or add dependency if planning to use

## Recommended package.json Updates

```json
{
  "dependencies": {
    "proper-lockfile": "^4.1.2",
    "fast-glob": "^3.3.0",
    "execa": "^5.1.1"
  }
}
```

Note: `execa` version 5.x is CommonJS compatible. Version 6+ is ESM-only.

## DevDependencies Analysis

No devDependencies are declared, but the following would be useful:

| Package | Purpose |
|---------|---------|
| `eslint` | Code linting |
| `prettier` | Code formatting |

## Recommendations

### Priority 1: Add Missing Critical Dependency
- **Action:** Run `npm install execa@5`
- **Rationale:** `agent-launcher.js` is core functionality and currently broken

### Priority 2: Add fast-glob to Dependencies
- **Action:** Run `npm install fast-glob`
- **Rationale:** Ensure reproducible installs, currently relies on unknown install

### Priority 3: Remove Dead Code
- **Action:** Delete `scripts/lib/frontmatter-parser.js`
- **Rationale:** Never imported, uses uninstalled dependency

### Priority 4: Review check-file-status.js
- **Action:** Evaluate if this file is still needed
- **Rationale:** Uses uninstalled execa, not required by any other file

## Summary Statistics

| Category | Count |
|----------|-------|
| Declared dependencies | 1 |
| Undeclared but used | 3 |
| Broken (uninstalled deps) | 2 |
| Dead code files | 1 |
| Candidate for removal | 2 files |
