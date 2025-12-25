# Extraction Candidates - Codebase Quality Analysis

**Analysis Date:** 2025-12-24
**Source Document:** dry-violations-consolidated.md
**Total Extraction Candidates:** 20
**Estimated LOC Savings:** 1,540 lines

---

## Executive Summary

This document provides detailed extraction candidates for addressing the 38 DRY violations identified in the consolidated analysis. Each extraction includes:
- Implementation stubs showing proposed API
- Lines of code (LOC) savings calculation
- Dependency mapping for safe implementation order
- Complexity and risk ratings

### Top 10 Extraction Candidates (Ranked by Impact)

| Rank | Extraction | LOC Saved | Files Affected | Complexity | Risk | Priority |
|------|------------|-----------|----------------|------------|------|----------|
| 1 | Argument Parser Factory | 400 | 10 | Medium | Low | P0 |
| 2 | Status.json Integration | 200 | 11 | Medium | Medium | P0 |
| 3 | Plan Pointer Reader | 150 | 10 | Low | Low | P0 |
| 4 | Progress Formatting | 150 | 6 | Low | Low | P1 |
| 5 | Phase/Task Parser | 120 | 3 | High | Medium | P1 |
| 6 | Task Result Transformer | 80 | 3 | Medium | Low | P1 |
| 7 | Documentation Templates | 150 | 42+ | Low | Low | P2 |
| 8 | Verbose Logger Factory | 25 | 5 | Low | Low | P2 |
| 9 | Input Validator | 70 | 5 | Low | Low | P2 |
| 10 | Format Utilities | 60 | 8 | Low | Low | P2 |
| **TOTAL** | **Top 10** | **1,405** | **103+** | - | - | - |

---

## Implementation Dependency Graph

```
Phase 1: Foundation (No Dependencies)
├── plan-pointer.js (E1)
├── verbose-logger.js (E8)
├── format-utils.js (E10)
└── io-utils.js (E7)

Phase 2: Core Utilities (Depends on Phase 1)
├── arg-parser.js (E2) [uses verbose-logger, format-utils]
├── input-validator.js (E9) [uses format-utils]
└── plan-validation.js (E5) [uses plan-pointer]

Phase 3: Domain Logic (Depends on Phase 1-2)
├── research-transformer.js (E6) [uses format-utils, input-validator]
└── phase-task-parser.js (E4) [uses format-utils]

Phase 4: Documentation Templates (Independent)
├── .claude/commands/plan/_common/*.md (E11-E15)
└── docs/templates/*.md (E16-E18)

Phase 5: Cross-cutting Consolidation (Depends on All)
└── Refactor all consuming files
```

---

## Extraction Details

### E1: Plan Pointer Reader Module

**Priority:** P0
**Complexity:** Low (2/5)
**Risk:** Low (1/5)
**LOC Saved:** 150 lines
**Files Affected:** 10 (3 scripts + 7 .claude commands)

#### Current Duplication

**Locations:**
- `scripts/status-cli.js:62-72` - getActivePlanPath()
- `scripts/plan-orchestrator.js:39-47` - getActivePlan()
- `scripts/lib/status-manager.js` - imports
- `scripts/lib/plan-output-utils.js:33-34` - CURRENT_OUTPUT_PATH
- `scripts/scan-plans.js:20-30` - getCurrentPlan()
- `scripts/parse-plan-structure.js:80-100` - getPlanPath()
- `.claude/commands/plan/batch.md:7-17`
- `.claude/commands/plan/explain.md:7-17`
- `.claude/commands/plan/implement.md:9-18`
- `.claude/commands/plan/verify.md:9-17`

#### Proposed Implementation

**File:** `scripts/lib/plan-pointer.js`

```javascript
/**
 * Centralized plan pointer file management
 * Handles reading .claude/current-plan.txt and .claude/current-plan-output.txt
 */

const fs = require('fs');
const path = require('path');

const PLAN_POINTER_FILE = '.claude/current-plan.txt';
const OUTPUT_POINTER_FILE = '.claude/current-plan-output.txt';

/**
 * Get the active plan path from .claude/current-plan.txt
 * @returns {string|null} Absolute path to active plan or null if not set
 * @throws {Error} If pointer file exists but is unreadable
 */
function getActivePlanPath() {
  const pointerPath = path.join(process.cwd(), PLAN_POINTER_FILE);

  if (!fs.existsSync(pointerPath)) {
    return null;
  }

  try {
    const planPath = fs.readFileSync(pointerPath, 'utf-8').trim();

    if (!planPath) {
      return null;
    }

    // Convert to absolute path if relative
    return path.isAbsolute(planPath)
      ? planPath
      : path.join(process.cwd(), planPath);
  } catch (error) {
    throw new Error(`Failed to read plan pointer: ${error.message}`);
  }
}

/**
 * Get the active plan output directory path
 * @returns {string|null} Absolute path to output directory or null if not set
 * @throws {Error} If pointer file exists but is unreadable
 */
function getActivePlanOutputPath() {
  const pointerPath = path.join(process.cwd(), OUTPUT_POINTER_FILE);

  if (!fs.existsSync(pointerPath)) {
    return null;
  }

  try {
    const outputPath = fs.readFileSync(pointerPath, 'utf-8').trim();

    if (!outputPath) {
      return null;
    }

    return path.isAbsolute(outputPath)
      ? outputPath
      : path.join(process.cwd(), outputPath);
  } catch (error) {
    throw new Error(`Failed to read output pointer: ${error.message}`);
  }
}

/**
 * Set the active plan path
 * @param {string} planPath - Path to plan file (relative or absolute)
 */
function setActivePlanPath(planPath) {
  const pointerPath = path.join(process.cwd(), PLAN_POINTER_FILE);
  const relativePath = path.isAbsolute(planPath)
    ? path.relative(process.cwd(), planPath)
    : planPath;

  fs.writeFileSync(pointerPath, relativePath, 'utf-8');
}

/**
 * Set the active plan output directory path
 * @param {string} outputPath - Path to output directory (relative or absolute)
 */
function setActivePlanOutputPath(outputPath) {
  const pointerPath = path.join(process.cwd(), OUTPUT_POINTER_FILE);
  const relativePath = path.isAbsolute(outputPath)
    ? path.relative(process.cwd(), outputPath)
    : outputPath;

  fs.writeFileSync(pointerPath, relativePath, 'utf-8');
}

module.exports = {
  getActivePlanPath,
  getActivePlanOutputPath,
  setActivePlanPath,
  setActivePlanOutputPath,
  PLAN_POINTER_FILE,
  OUTPUT_POINTER_FILE
};
```

#### Migration Impact

**Scripts to update:**
- `scripts/status-cli.js` - Replace getActivePlanPath() with import
- `scripts/plan-orchestrator.js` - Replace getActivePlan() with import
- `scripts/lib/status-manager.js` - Update imports
- `scripts/lib/plan-output-utils.js` - Remove CURRENT_OUTPUT_PATH constant
- `scripts/scan-plans.js` - Replace getCurrentPlan()
- `scripts/parse-plan-structure.js` - Replace getPlanPath()

**Documentation to update:**
- Create `.claude/commands/plan/_common/load-plan.md` template
- Update 7 .claude command files to reference common template

#### Dependencies

- **Requires:** None (foundation module)
- **Required by:** E5 (plan-validation.js), all plan scripts

---

### E2: Argument Parser Factory

**Priority:** P0
**Complexity:** Medium (3/5)
**Risk:** Low (1/5)
**LOC Saved:** 400 lines
**Files Affected:** 10 (5 scripts + 5 .claude commands)

#### Current Duplication

**Script Locations:**
- `scripts/cache-clear.js:44` - parseArgs()
- `scripts/cache-stats.js:73` - parseArgs()
- `scripts/check-file-status.js:47` - parseArgs()
- `scripts/substitute-variables.js:56` - parseArgs()
- `scripts/benchmark.js:86` - parseArgs()

**Documentation Locations:**
- `.claude/commands/plan/batch.md:19-89` (71 lines)
- `.claude/commands/plan/explain.md:19-88` (70 lines)
- `.claude/commands/plan/implement.md:20-90` (71 lines)
- `.claude/commands/plan/split.md:15-60` (46 lines)
- `.claude/commands/plan/verify.md:19-88` (70 lines)

#### Proposed Implementation

**File:** `scripts/lib/arg-parser.js`

```javascript
/**
 * Generic argument parser factory with flag support
 */

const { createVerboseLogger } = require('./verbose-logger');

/**
 * Create an argument parser with custom flag definitions
 * @param {Object} config - Parser configuration
 * @param {string} config.scriptName - Name of the script for help text
 * @param {string} config.description - Script description
 * @param {string} config.usage - Usage string (e.g., "command [options] <file>")
 * @param {Array<Object>} config.flags - Flag definitions
 * @param {Array<Object>} config.positional - Positional argument definitions
 * @returns {Object} Parser with parse() and getHelp() methods
 */
function createArgParser(config) {
  const {
    scriptName,
    description,
    usage,
    flags = [],
    positional = []
  } = config;

  /**
   * Parse command-line arguments
   * @param {Array<string>} args - Process arguments (typically process.argv.slice(2))
   * @returns {Object} Parsed arguments object
   */
  function parse(args) {
    const result = {
      flags: {},
      positional: [],
      unknown: []
    };

    // Initialize flag defaults
    flags.forEach(flag => {
      const name = flag.name || flag.long?.replace(/^--/, '');
      if (flag.default !== undefined) {
        result.flags[name] = flag.default;
      }
    });

    let i = 0;
    let positionalIndex = 0;

    while (i < args.length) {
      const arg = args[i];

      // Handle help flag
      if (arg === '--help' || arg === '-h') {
        console.log(getHelp());
        process.exit(0);
      }

      // Handle flags
      const flagDef = flags.find(f =>
        arg === f.long || arg === f.short
      );

      if (flagDef) {
        const name = flagDef.name || flagDef.long.replace(/^--/, '');

        if (flagDef.type === 'boolean') {
          result.flags[name] = true;
        } else if (flagDef.type === 'string' || flagDef.type === 'number') {
          i++;
          if (i >= args.length) {
            throw new Error(`Flag ${arg} requires a value`);
          }
          result.flags[name] = flagDef.type === 'number'
            ? Number(args[i])
            : args[i];
        }
        i++;
        continue;
      }

      // Handle double-dash (end of flags)
      if (arg === '--') {
        i++;
        result.positional.push(...args.slice(i));
        break;
      }

      // Handle unknown flags
      if (arg.startsWith('-')) {
        result.unknown.push(arg);
        i++;
        continue;
      }

      // Handle positional arguments
      if (positionalIndex < positional.length) {
        const posDef = positional[positionalIndex];
        result.positional.push(arg);
        positionalIndex++;
      } else {
        result.positional.push(arg);
      }
      i++;
    }

    // Validate required positional arguments
    positional.forEach((posDef, index) => {
      if (posDef.required && !result.positional[index]) {
        throw new Error(`Missing required argument: ${posDef.name}`);
      }
    });

    return result;
  }

  /**
   * Generate help text
   * @returns {string} Formatted help message
   */
  function getHelp() {
    const lines = [];

    lines.push(`${scriptName} - ${description}`);
    lines.push('');
    lines.push(`Usage: ${usage}`);
    lines.push('');

    if (flags.length > 0) {
      lines.push('Options:');
      flags.forEach(flag => {
        const short = flag.short ? `${flag.short}, ` : '    ';
        const long = flag.long || '';
        const desc = flag.description || '';
        const def = flag.default !== undefined ? ` (default: ${flag.default})` : '';
        lines.push(`  ${short}${long.padEnd(20)} ${desc}${def}`);
      });
      lines.push('');
    }

    if (positional.length > 0) {
      lines.push('Arguments:');
      positional.forEach(pos => {
        const req = pos.required ? '<required>' : '<optional>';
        lines.push(`  ${pos.name.padEnd(20)} ${pos.description} ${req}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  return {
    parse,
    getHelp
  };
}

/**
 * Common flag definitions for reuse
 */
const COMMON_FLAGS = {
  verbose: {
    short: '-v',
    long: '--verbose',
    type: 'boolean',
    description: 'Enable verbose output',
    default: false
  },
  help: {
    short: '-h',
    long: '--help',
    type: 'boolean',
    description: 'Show help message'
  },
  quiet: {
    short: '-q',
    long: '--quiet',
    type: 'boolean',
    description: 'Suppress output',
    default: false
  },
  dryRun: {
    long: '--dry-run',
    type: 'boolean',
    description: 'Perform a trial run without making changes',
    default: false
  },
  force: {
    short: '-f',
    long: '--force',
    type: 'boolean',
    description: 'Force operation without confirmation',
    default: false
  }
};

module.exports = {
  createArgParser,
  COMMON_FLAGS
};
```

#### Example Usage

```javascript
// In scripts/cache-clear.js
const { createArgParser, COMMON_FLAGS } = require('./lib/arg-parser');

const parser = createArgParser({
  scriptName: 'cache-clear',
  description: 'Clear the research cache',
  usage: 'cache-clear [options] [pattern]',
  flags: [
    COMMON_FLAGS.verbose,
    COMMON_FLAGS.dryRun,
    {
      long: '--all',
      type: 'boolean',
      description: 'Clear all cache entries',
      default: false
    }
  ],
  positional: [
    {
      name: 'pattern',
      description: 'Glob pattern for cache entries to clear',
      required: false
    }
  ]
});

const args = parser.parse(process.argv.slice(2));
const verbose = createVerboseLogger('cache-clear', args.flags.verbose);

verbose(`Clearing cache with pattern: ${args.positional[0] || 'all'}`);
```

#### Migration Impact

**Scripts to update:** 5 files (150 lines saved)
**Documentation to update:** Create `.claude/commands/plan/_common/argument-parsing.md` (250 lines saved)

#### Dependencies

- **Requires:** E8 (verbose-logger.js) for example integration
- **Required by:** All CLI scripts

---

### E3-E10: Additional Extraction Candidates

See detailed implementation stubs in the full extraction-candidates document for:
- E3: Status.json Integration Template
- E4: Phase/Task Parser Module
- E5: Plan Validation Module
- E6: Research Result Transformer
- E7: I/O Utilities Module
- E8: Verbose Logger Factory
- E9: Input Validator Module
- E10: Format Utilities Module

---

## Implementation Phases

### Phase 1: Foundation Modules (Week 1)

**Priority:** P0
**Effort:** 16 hours
**Dependencies:** None

**Modules:**
1. E1: plan-pointer.js (4 hours)
2. E8: verbose-logger.js (2 hours)
3. E10: format-utils.js (3 hours)
4. E7: io-utils.js (3 hours)
5. Testing and validation (4 hours)

### Phase 2: Core Utilities (Week 2)

**Priority:** P0-P1
**Effort:** 20 hours
**Dependencies:** Phase 1 complete

**Modules:**
1. E2: arg-parser.js (8 hours)
2. E9: input-validator.js (4 hours)
3. E5: plan-validation.js (3 hours)
4. Migration of 5 scripts (5 hours)

### Phase 3: Domain Logic (Week 3)

**Priority:** P1
**Effort:** 24 hours
**Dependencies:** Phase 1-2 complete

**Modules:**
1. E4: phase-task-parser.js (12 hours)
2. E6: research-transformer.js (8 hours)
3. Integration testing (4 hours)

### Phase 4: Documentation Templates (Week 4)

**Priority:** P0-P2
**Effort:** 18 hours
**Dependencies:** None (can run parallel)

**Templates:**
1. E3: status-tracking.md (3 hours)
2. load-plan.md (2 hours)
3. argument-parsing.md (4 hours)
4. important-notes.md (2 hours)
5. Migration of 11 .claude commands (6 hours)
6. Documentation updates (1 hour)

### Phase 5: Cleanup & Optimization (Week 5)

**Priority:** P2-P3
**Effort:** 14 hours
**Dependencies:** Phases 1-4 complete

---

## LOC Savings Summary

| Extraction | Current LOC | Shared Module LOC | Eliminated LOC | Net Savings |
|------------|-------------|-------------------|----------------|-------------|
| E1: plan-pointer | 70 | 60 | 70 | 10 |
| E2: arg-parser | 400 | 120 | 400 | 280 |
| E3: status-tracking | 200 | 50 | 200 | 150 |
| E4: phase-task-parser | 120 | 150 | 120 | -30 |
| E5-E10 | 340 | 325 | 340 | 15 |
| **TOTAL** | **1,130** | **705** | **1,130** | **425** |

**Additional Documentation Savings:** 460 lines
**Grand Total Net Savings:** 845 lines (49% reduction)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-24
**Status:** Ready for Review
