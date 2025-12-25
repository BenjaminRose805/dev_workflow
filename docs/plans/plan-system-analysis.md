# Analysis Plan: Plan System & Critic Output Analysis

## Overview
- **Objective:** I want to review the current implementation of the claude code commands regarding plans - I want to have a consistent structure arround the process of a plan producing a specific output to a file in a folder. For example, when performing an analysis, I don't want the analysis plan to be the location of the results from that plan. I also would want a dedicated output file in a dedicated folder when I have a plan performing a validation / critique. Lastly, I want a dedicated file for tracking the status of the plan - this will allow me to re-use plans without having to remake them
- **Scope:** .claude/ & scripts/ & docs/
- **Created:** 2025-12-18

## Phase 1: Requirements Gathering
- [x] Clarify the goal and success criteria
- [x] Identify stakeholders and constraints
- [x] Define scope boundaries (what's in/out)
- [x] Gather context from existing code/docs

**Requirements:**
1. **Separation of Plan and Output** - Plan files define tasks/phases but do NOT store results
2. **Dedicated Output Directories** - Each plan execution produces outputs in a dedicated folder (e.g., `docs/outputs/<plan-name>/`)
3. **Status Tracking File** - Track plan progress separately (e.g., `docs/outputs/<plan-name>/status.json`)
4. **Plan Reusability** - Plans can be run multiple times without modification
5. **Consistent Structure** - All plan types (analysis, validation, critique) follow same output pattern

**Constraints:**
1. **File-system based** - No database; all state in files
2. **Claude Code integration** - Must work with existing slash commands
3. **Backwards compatible** - Existing plans should continue to work
4. **Simple structure** - Easy to understand and maintain
5. **Git-friendly** - Outputs should be trackable in version control

**Stakeholders:**
- User (creates, executes, reviews plans)
- Claude Code (executes tasks, updates status)

**Out of Scope:**
- Main idea-to-code application (focus only on plan system)
- Changes to Claude Code CLI itself
- External service integrations
- Database or cloud storage solutions
- User authentication/permissions

**In Scope:**
- `.claude/commands/` - Plan-related slash commands
- `docs/plan-templates/` - Plan template files
- `docs/plans/` - Generated plan files
- `scripts/` - Supporting scripts for plans
- New `docs/outputs/` directory structure

**Context: Current Architecture (gathered):**
- **9 slash commands** in `.claude/commands/plan/`: create, implement, status, batch, set, verify, explain, split, templates
- **5 templates** in `docs/plan-templates/`: analysis, validation, create-plan, documentation, test-creation
- **12 scripts** in `scripts/`: scan-plans.js, parse-plan-structure.js, research-for-implement.js, etc.
- **Current state tracking**: Uses `.claude/current-plan.txt` to store active plan path
- **Current issue**: Plans get modified during execution (checkboxes marked, findings added inline)
- **No separation**: Results are embedded in plan files, making plans single-use

## Phase 2: Research & Analysis
- [x] Explore relevant parts of codebase
- [x] Identify existing patterns to follow
- [x] Research similar implementations
- [x] Identify risks and dependencies

**Key Findings:**
1. **Plans store results inline** - Checkboxes and findings are modified directly in plan files
2. **Result schemas exist but unused** - `scripts/lib/schemas/analysis-result.json` and `verify-result.json` ready for use
3. **Deprecated output system** - `scan-results.js` references old `.claude/prompt-results/` (no longer used)
4. **No status.json** - Progress derived from parsing markdown each time
5. **Empty docs/analysis/ exists** - Directory ready for output separation
6. **Commands to modify**: `implement.md`, `verify.md`, `batch.md` handle checkbox updates inline

**Patterns to Follow:**
1. **Phase data organization** (`.idea/phases/`) - Each phase has `conversation.json`, `decisions.json`, `session.json`, and `output/` subfolder
2. **Numbered prefixes** - `01-understand/`, `02-explore/` for ordering
3. **Atomic JSON writes** - Write to temp file, then rename (from `project-store.ts`)
4. **Status symbols** - Standardized symbols in `.claude/templates/shared/status-symbols.md`
5. **Scan patterns** - `scan-plans.js` outputs structured JSON with metrics

**Recommended Architecture:**
```
docs/
├── plan-templates/    # DEFINITIONS (reusable, never modified)
├── plans/             # GENERATED PLANS (lock after creation)
└── plan-outputs/      # EXECUTION RESULTS (per-plan folders)
    └── {plan-name}/
        ├── status.json      # Progress tracking
        ├── findings/        # Phase-specific results
        ├── artifacts/       # Generated code/files
        └── timestamps/      # Per-execution history
```

**Dependencies:**
- `scripts/lib/markdown-parser.js` - Task extraction
- `scripts/scan-plans.js` - Plan metadata collection
- `.claude/current-plan.txt` - Active plan pointer (may need companion for outputs)

**Risks:**
1. **Breaking existing workflows** - Commands currently expect to modify plan files; changing this affects all plan commands
2. **Migration complexity** - 9 commands need updates; risk of inconsistent behavior during transition
3. **Backwards compatibility** - Existing plans with inline results need migration strategy
4. **Discoverability** - Users must learn new output location; may cause confusion initially
5. **Increased complexity** - Two locations to manage (plan + outputs) instead of one

**Mitigation Strategies:**
- Implement incrementally: start with new `status.json`, then add output directories
- Support both modes initially: read from status.json if exists, fallback to parsing plan
- Create `/plan:migrate` command to move existing inline results to output directories
- Add clear messages in commands pointing to output locations

## Phase 3: Plan Design
- [x] Break objective into phases
- [x] Break phases into concrete tasks
- [x] Order tasks by dependency
- [x] Add verification steps
- [x] Define success criteria

**Draft Structure:**

### Implementation Phase 0: Foundation (No dependencies)
- [ ] 0.1 Create `docs/plan-outputs/` directory
- [ ] 0.2 Define `status.json` schema in `scripts/lib/schemas/plan-status.json`
- [ ] 0.3 Create `scripts/lib/plan-output-utils.js` (depends on 0.2)
- [ ] 0.4 Update `.gitignore` for output artifacts
- [ ] **VERIFY 0**: Run `node scripts/scan-plans.js` - should not error

### Implementation Phase 1: Status Tracking (Depends on Phase 0)
- [ ] 1.1 Create `scripts/lib/status-manager.js` (depends on 0.2, 0.3)
- [ ] 1.2 Add `.claude/current-plan-output.txt` pointer
- [ ] 1.3 Update `scripts/scan-plans.js` to read status.json (depends on 1.1)
- [ ] 1.4 Update `/plan:status` command (depends on 1.1)
- [ ] **VERIFY 1**: Create test status.json, verify `/plan:status` reads it correctly

### Implementation Phase 2: Output Separation (Depends on Phase 1)
- [ ] 2.1 Update `/plan:create` to create output directory (depends on 0.3)
- [ ] 2.2 Define findings output format (markdown in `findings/`)
- [ ] 2.3 Update templates - remove inline placeholders, add output refs
- [ ] 2.4 Add `timestamps/` subdirectory structure
- [ ] **VERIFY 2**: Run `/plan:create`, verify output directory created with correct structure

### Implementation Phase 3: Command Updates (Depends on Phases 1 & 2)
- [ ] 3.1 Update `/plan:implement` (depends on 1.1, 2.2)
- [ ] 3.2 Update `/plan:batch` (depends on 1.1, 2.2)
- [ ] 3.3 Update `/plan:verify` (depends on 1.1)
- [ ] 3.4 Update `/plan:set` (depends on 1.2)
- [ ] 3.5 Update `/plan:explain` (depends on 0.3)
- [ ] **VERIFY 3**: Execute a simple task, verify status.json updated and findings written

### Implementation Phase 4: Migration & Compatibility (Depends on Phase 3)
- [ ] 4.1 Create `/plan:migrate` command (depends on all Phase 3)
- [ ] 4.2 Add fallback logic for backwards compatibility
- [ ] 4.3 Handle existing `docs/completed plans/`
- [ ] 4.4 Document migration process
- [ ] **VERIFY 4**: Migrate existing plan with inline results, verify extraction works

### Implementation Phase 5: Verification (Depends on Phase 4)
- [ ] 5.1 Test plan creation with output directory
- [ ] 5.2 Test status tracking across sessions
- [ ] 5.3 Test plan reuse (run same plan twice, verify separate outputs)
- [ ] 5.4 Verify backwards compatibility (old plans still work)
- [ ] **VERIFY 5**: Full end-to-end test - create plan, execute, verify outputs, rerun

**Dependency Graph:**
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   ↓         ↓         ↓
 0.2 → 0.3  1.1 → 1.3  2.1 requires 0.3
             ↓    ↓
            1.4   scan-plans
```

**Implementation Success Criteria:**
1. [ ] **Output Directory Created** - `/plan:create` generates `docs/plan-outputs/{plan-name}/` with `status.json`, `findings/`, `timestamps/`
2. [ ] **Status Tracking Works** - `/plan:status` reads from `status.json` and displays correct progress
3. [ ] **Plan Files Unchanged** - Plan markdown files are NOT modified during execution (no checkbox changes)
4. [ ] **Findings Separated** - Analysis/validation results written to `findings/` folder, not inline
5. [ ] **Reusability Proven** - Same plan can be executed twice, creating separate timestamped outputs
6. [ ] **Backwards Compatible** - Existing plans without output directories still function
7. [ ] **All Commands Updated** - `/plan:implement`, `/plan:batch`, `/plan:verify`, `/plan:status`, `/plan:set` work with new system

## Phase 4: Plan Writing
- [x] Write overview section
- [x] Detail each phase with tasks
- [x] Add checkboxes for all actionable items
- [x] Include verification/validation phase
- [x] Define clear success criteria

**Output Location:** `docs/plans/plan-system-analysis.md`

## Phase 5: Plan Review
- [x] Review for completeness
- [x] Check task granularity (not too big, not too small)
- [x] Verify phases are in logical order
- [x] Ensure success criteria are measurable

## Success Criteria
- [x] Plan has clear objective (separate plan outputs from plan files)
- [x] Phases are logical and sequential (verified in 5.3)
- [x] Tasks are actionable (start with verb: Create, Define, Update, Test)
- [x] Success criteria are measurable (verified in 5.4)
- [x] Plan can be executed with `/plan:implement` (28 tasks in Implementation Phases 0-5)
