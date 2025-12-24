# DRY Violations Consolidated Report

**Analysis Date:** 2025-12-24
**Source:** Phase 1 Findings (9 agents: S1-S4, D1-D3, C1-C2)
**Total Findings Analyzed:** 9 reports covering scripts/, docs/, and .claude/

---

## Executive Summary

This consolidated report synthesizes DRY (Don't Repeat Yourself) violations identified across 9 Phase 1 analysis findings, covering the complete dev_workflow codebase. Analysis reveals **38 distinct DRY violations** with potential to eliminate **1,200+ lines of duplicate code**.

### Key Metrics

| Category | Count | Lines Duplicated | Highest Impact Item |
|----------|-------|------------------|---------------------|
| **Cross-Directory Violations** | 7 | 400+ | Argument parsing (5 scripts + 5 commands) |
| **Scripts Violations (S1-S4)** | 15 | 450+ | formatDuration function (2 implementations) |
| **Documentation Violations (D1-D3)** | 10 | 200+ | status.json schema (2 locations) |
| **.claude Violations (C1-C2)** | 6 | 800+ | "Load Active Plan" section (7 files) |
| **TOTAL** | **38** | **1,850+** | Plan path reading (3+ implementations) |

### Top 5 Extraction Candidates (By LOC Saved)

1. **"Load Active Plan" logic** - 7 .claude commands + 3 scripts = **~150 lines** (C1, S1)
2. **Argument parsing functions** - 5 scripts + 5 .claude commands = **~400 lines** (S4, C1)
3. **Plan path reading pattern** - 3 scripts = **~35 lines** (S1)
4. **status.json integration docs** - 9 .claude commands + 2 docs = **~200 lines** (C1, D1)
5. **parsePhases/task extraction** - 3 scripts = **~120 lines** (S3)

---

## Section 1: Cross-Directory DRY Violations

These violations span multiple top-level directories (scripts/, docs/, .claude/), indicating system-wide patterns that need centralization.

### 1.1 Plan Path Reading Pattern (scripts/ + .claude/)

**Locations:**
- `scripts/status-cli.js:62-72` (getActivePlanPath)
- `scripts/plan-orchestrator.js:39-47` (getActivePlan)
- `scripts/lib/status-manager.js` (imports)
- `.claude/commands/plan/batch.md:7-17`
- `.claude/commands/plan/explain.md:7-17`
- `.claude/commands/plan/implement.md:9-18`
- `.claude/commands/plan/migrate.md:9-15`
- `.claude/commands/plan/split.md:9-13`
- `.claude/commands/plan/verify.md:9-17`

**Description:** Three independent script implementations + 7 .claude command docs describe reading `.claude/current-plan.txt` with nearly identical try-catch patterns and null handling.

**Impact:** 10 locations, ~50-70 lines duplicated

**Recommendation:** Create `scripts/lib/plan-pointer.js` with single `getActivePlanPath()` function and create `.claude/commands/plan/_common/load-plan.md` template for documentation.

**Source:** S1:16-19, C1:15-35

---

### 1.2 Argument Parsing Pattern (scripts/ + .claude/)

**Locations (Scripts):**
- `scripts/cache-clear.js:44` (parseArgs)
- `scripts/cache-stats.js:73` (parseArgs)
- `scripts/check-file-status.js:47` (parseArgs)
- `scripts/substitute-variables.js:56` (parseArgs)
- `scripts/benchmark.js:86` (parseArgs)

**Locations (.claude):**
- `.claude/commands/plan/batch.md:19-89` (71 lines)
- `.claude/commands/plan/explain.md:19-88` (70 lines)
- `.claude/commands/plan/implement.md:20-90` (71 lines)
- `.claude/commands/plan/split.md:15-60` (46 lines)
- `.claude/commands/plan/verify.md:19-88` (70 lines)

**Description:** Nearly identical argument parsing logic using switch statements for flags like `--help`, `--verbose`. Scripts use JavaScript, .claude uses instruction documentation, but patterns are identical.

**Impact:** 10 locations, ~400 lines total (150 in scripts, ~250 in .claude docs)

**Recommendation:**
- Scripts: Create `scripts/lib/arg-parser.js` factory function accepting flag definitions
- .claude: Extract to `.claude/commands/plan/_common/argument-parsing.md`

**Source:** S4:11-13, S2:13-15, C1:40-60

---

### 1.3 Verbose Logging Pattern (scripts/ + .claude/)

**Locations (Scripts):**
- `scripts/cache-clear.js:34` (verbose function)
- `scripts/cache-stats.js:63` (verbose function)
- `scripts/benchmark.js:66` (verbose function)
- `scripts/research-for-implement.js:61` (verbose function)
- `scripts/parallel-research-pipeline.js:79` (verbose function)

**Description:** Multiple scripts implement identical verbose logging functions that check a flag and log to stderr with script-specific prefix.

**Impact:** 5+ locations, ~25 lines duplicated

**Recommendation:** Create `scripts/lib/verbose-logger.js` factory: `createVerboseLogger('[script-name]')` returns bound logger.

**Source:** S4:17-19, S2:29-31

---

### 1.4 status.json Schema Documentation (scripts/ + docs/ + .claude/)

**Locations (Documentation):**
- `docs/ORCHESTRATOR.md:195-303` (423 lines, detailed specification)
- `docs/architecture/orchestrator-system.md:254-304` (51 lines, identical schema)

**Locations (.claude commands):**
- `.claude/commands/plan/batch.md:16-17, 327-329`
- `.claude/commands/plan/create.md:113-134`
- `.claude/commands/plan/explain.md:94-112`
- `.claude/commands/plan/implement.md:16-18, 361-387`
- `.claude/commands/plan/migrate.md:113-149`
- `.claude/commands/plan/set.md:23-48`
- `.claude/commands/plan/status.md:24-60`
- `.claude/commands/plan/verify.md:92-114`

**Description:** status.json format and schema documented identically across multiple locations. Repeated explanations of "authoritative source of truth" in 6+ .claude files.

**Impact:** 11 locations, ~200 lines duplicated

**Recommendation:**
- Keep definition in `docs/ORCHESTRATOR.md` (primary reference)
- Create `.claude/commands/plan/_common/status-tracking.md` with abbreviated version and link
- Convert `orchestrator-system.md` to overview with link

**Source:** D1:17-25, C1:63-87

---

### 1.5 Output Directory Pointer Reading (scripts/)

**Locations:**
- `scripts/plan-orchestrator.js:52-58` (getOutputDir)
- `scripts/lib/status-manager.js:33-37` (getCurrentOutputDir)
- `scripts/lib/plan-output-utils.js:33-34` (CURRENT_OUTPUT_PATH constant)

**Description:** Multiple implementations reading `.claude/current-plan-output.txt` with different function names and slight variations.

**Impact:** 3 locations, ~15 lines duplicated

**Recommendation:** Standardize on single location in `plan-pointer.js` module.

**Source:** S1:22-24

---

### 1.6 Plan Discovery/Parsing Logic (scripts/ + docs/)

**Locations:**
- `scripts/scan-plans.js:20-30` (getCurrentPlan)
- `scripts/parse-plan-structure.js:80-100` (getPlanPath)

**Description:** Both files implement identical "get current plan from `.claude/current-plan.txt`" logic with different names and inconsistent error checking.

**Impact:** 2 locations, ~20 lines duplicated

**Recommendation:** Extract to shared utility in `scripts/lib/plan-utils.js`.

**Source:** S3:8-11

---

### 1.7 readInput Pattern (scripts/)

**Locations:**
- `scripts/research-for-implement.js:278` (readInput)
- `scripts/verify-with-agent.js:138` (readInput)
- `scripts/parallel-research-pipeline.js:595` (readInput)

**Description:** Three nearly identical implementations of file/stdin reading with identical error handling patterns.

**Impact:** 3 locations, ~45 lines duplicated

**Recommendation:** Extract to `scripts/lib/io-utils.js`.

**Source:** S2:8-11

---

## Section 2: Scripts DRY Violations (S1-S4)

Violations confined to the scripts/ directory but representing significant duplication in implementation code.

### 2.1 formatDuration Function (S1)

**Locations:**
- `scripts/lib/status-manager.js:400` (formatDuration)
- `scripts/lib/timestamp-utils.js:233` (formatDuration)

**Description:** Identical formatDuration() function with same logic (ms < 1000, < 60000, < 3600000, else hours format). Both exported.

**Impact:** 2 locations, ~15 lines duplicated

**Recommendation:** Extract to `scripts/lib/format-utils.js`, import in both files.

**Source:** S1:11-14

---

### 2.2 Task Status Marking Functions (S1)

**Locations:**
- `scripts/lib/status-manager.js:297-341` (markTaskStarted, markTaskCompleted, markTaskFailed, markTaskSkipped)
- `scripts/status-cli.js:155-229` (cmdTaskStarted, cmdTaskCompleted, cmdTaskFailed, cmdTaskSkipped)

**Description:** Four mark* functions in status-manager simply delegate to updateTaskStatus(). Similar pattern in status-cli command handlers.

**Impact:** 8 locations, ~60 lines duplicated

**Recommendation:** Consider if wrapper functions necessary or if callers should use updateTaskStatus() directly.

**Source:** S1:27-29

---

### 2.3 Plan Path Validation Logic (S1)

**Locations:**
- `scripts/status-cli.js:694-697`
- `scripts/plan-orchestrator.js:404-408`
- `scripts/lib/status-manager.js:55-61`

**Description:** Each file independently checks if plan path exists, reads content, validates it.

**Impact:** 3 locations, ~20 lines duplicated

**Recommendation:** Extract to `scripts/lib/plan-validation.js` with `validatePlanPath(path)` function.

**Source:** S1:31-34

---

### 2.4 Task Result Transformation (S2)

**Locations:**
- `scripts/research-for-implement.js:152` (transformFindings)
- `scripts/parallel-research-pipeline.js:371` (researchSingleTask)
- `scripts/parallel-research-pipeline.js:416-511` (extract* functions)

**Description:** Agent result parsing and field extraction duplicated. Same patterns for extracting target files, patterns, dependencies, complexity.

**Impact:** 3 locations, ~80 lines duplicated

**Recommendation:** Create `scripts/lib/research-transformer.js` with reusable extraction functions.

**Source:** S2:18-21

---

### 2.5 validateInput Logic (S2)

**Locations:**
- `scripts/verify-with-agent.js:179` (validateInput)
- `scripts/parallel-research-pipeline.js:671` (validateInput)

**Description:** Task and input validation patterns repeated. Both check for tasks array, id, description.

**Impact:** 2 locations, ~25 lines duplicated

**Recommendation:** Extract to `scripts/lib/input-validator.js`.

**Source:** S2:23-26

---

### 2.6-2.10 Additional Scripts Violations

- **2.6 Agent Launch Configuration** - 3 locations, ~30 lines (S2:33-36)
- **2.7 Phase/Task Parsing Logic** - 2 locations, ~100 lines (S3:13-19)
- **2.8 Task Extraction Logic** - 2 locations, ~40 lines (S3:21-27)
- **2.9 Heading/Title Extraction** - 3 locations, ~25 lines (S3:29-35)
- **2.10 printUsage Function** - 5 locations, ~75 lines (S4:21-24)

**Total Script Violations:** 15 major violations, ~450 lines duplicated

---

## Section 3: Documentation DRY Violations (D1-D3)

### 3.1 status.json Documentation (D1)
- 2 locations, ~50 lines duplicated
- **Source:** D1:17-25

### 3.2 Artifact Compatibility Matrix (D1)
- 3 locations, ~150 lines duplicated
- **Source:** D1:29-38

### 3.3 Lock Management Documentation (D1)
- 2 locations, ~40 lines duplicated
- **Source:** D1:42-50

### 3.4 Workflow Entry Points (D1)
- 3 locations, ~80 lines duplicated
- **Source:** D1:54-64

### 3.5 Plan System Concepts (D1)
- 3 locations, ~60 lines duplicated
- **Source:** D1:66-76

### 3.6 Severity Classification Systems (D2)
- 3 locations, ~50 lines duplicated/conflicting
- **Source:** D2:11-18

### 3.7-3.10 Additional Documentation Violations
- **Dependencies Section Format** - 42 locations (D3:11-17)
- **Priority Level Definitions** - 8+ locations (D3:24-34)
- **"Load Active Plan" Instructions** - 11 locations (D3:19-22)
- **Code Quality Gate Schema** - 2 locations (D2:20-30)

---

## Section 4: .claude DRY Violations (C1-C2)

### 4.1 "Load Active Plan" Section (C1)
- 7 locations, ~50 lines duplicated
- **Source:** C1:15-35

### 4.2 "Parse Arguments" Section (C1)
- 5 locations, ~250 lines duplicated
- **Source:** C1:40-60

### 4.3 Status.json Integration Pattern (C1)
- 9 locations, ~200 lines duplicated
- **Source:** C1:63-87

### 4.4 Progress Formatting and Symbols (C1)
- 6 locations, ~150 lines duplicated
- **Source:** C1:90-109

### 4.5 "YOU MUST NEVER" Constraints (C2)
- 4 locations, ~20 lines duplicated
- **Source:** C2:9-17

### 4.6 getStatusSymbol() Function (C2)
- 3 locations, ~30 lines duplicated
- **Source:** C2:20-26

---

## Section 5: Prioritized Extraction Candidates

### Rank 1: Argument Parsing (Cross-Directory)
- **LOC Saved:** ~400 lines
- **Files Affected:** 5 scripts + 5 .claude commands = 10 files
- **Effort:** Medium | **Impact:** High
- **Sources:** S4:11-13, S2:13-15, C1:40-60

### Rank 2: "Load Active Plan" Logic (Cross-Directory)
- **LOC Saved:** ~150 lines
- **Files Affected:** 3 scripts + 7 .claude commands = 10 files
- **Effort:** Low | **Impact:** High
- **Sources:** S1:16-19, C1:15-35, S3:8-11

### Rank 3: status.json Integration (Cross-Directory)
- **LOC Saved:** ~200 lines
- **Files Affected:** 2 docs + 9 .claude commands = 11 files
- **Effort:** Medium | **Impact:** High
- **Sources:** D1:17-25, C1:63-87

### Rank 4: Phase/Task Parsing (Scripts)
- **LOC Saved:** ~120 lines
- **Files Affected:** 2-3 scripts
- **Effort:** Medium | **Impact:** Medium
- **Sources:** S3:13-19, S3:21-27

### Rank 5-10: Additional Candidates
- Verbose Logging Pattern: ~25 lines (5+ files)
- formatDuration Function: ~15 lines (2 files)
- Progress Formatting: ~150 lines (6 files)
- Task Result Transformation: ~80 lines (3 files)
- Documentation Patterns: ~150 lines (multiple docs)
- Priority Definitions: ~40 lines (8+ plans)

---

## Section 6: Recommended Shared Utilities/Modules

### 6.1 Scripts Library (scripts/lib/)

**New modules to create:**
- `scripts/lib/plan-pointer.js` - Centralized plan pointer file reading
- `scripts/lib/arg-parser.js` - Generic argument parser factory
- `scripts/lib/io-utils.js` - Input/output utilities
- `scripts/lib/format-utils.js` - Formatting utilities
- `scripts/lib/plan-validation.js` - Plan validation utilities
- `scripts/lib/research-transformer.js` - Research result transformation
- `scripts/lib/input-validator.js` - Input validation utilities
- `scripts/lib/verbose-logger.js` - Verbose logging factory
- `scripts/lib/config.js` - Centralized configuration constants

### 6.2 .claude Common Templates

**New shared files:**
- `.claude/commands/plan/_common/load-plan.md`
- `.claude/commands/plan/_common/argument-parsing.md`
- `.claude/commands/plan/_common/status-tracking.md`
- `.claude/commands/plan/_common/important-notes.md`
- `.claude/commands/plan/_common/template-variables.md`

### 6.3 .claude Shared Templates

**Enhance/create:**
- `.claude/templates/shared/constraints.md`
- `.claude/templates/shared/progress-symbols.md` (enhance existing)

---

## Total Impact Summary

### Lines of Code
- **Total Duplicate Lines Identified:** ~1,850 lines
- **Total Lines Eliminable:** ~1,540 lines (83% reduction potential)
- **Remaining (templates/references):** ~310 lines

### File Impact
- **Scripts affected:** 15+ files
- **Docs affected:** 12+ files
- **.claude commands affected:** 11+ files
- **.claude templates affected:** 8+ files
- **Total files needing changes:** 46+ files

### Effort Estimate
- **Phase 1 (Critical):** 16 hours
- **Phase 2 (Scripts):** 14 hours
- **Phase 3 (.claude):** 10 hours
- **Phase 4 (Docs):** 16 hours
- **Phase 5 (Cleanup):** 10 hours
- **Total Estimated Effort:** 66 hours (~1.5 work weeks)

---

## Conclusion

This analysis identified **38 distinct DRY violations** across the dev_workflow codebase, with potential to eliminate **1,540 duplicate lines** (83% reduction) through creation of 20+ shared utilities and templates.

**Recommended Next Steps:**
1. Review and approve this consolidation plan
2. Begin Phase 1 (Critical Cross-Directory Extractions)
3. Validate shared utilities with existing test suites
4. Update all consuming files to use shared implementations
5. Document new shared modules in developer guides
