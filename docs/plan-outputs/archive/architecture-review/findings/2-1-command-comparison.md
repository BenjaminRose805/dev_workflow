# Task 2.1: Command-by-Command Comparison Analysis

**Analysis Date:** 2025-12-20
**Context:** Phase 2 Gap Analysis - Detailed comparison of 11 current commands vs 34 proposed commands

---

## Executive Summary

This analysis provides a granular comparison of each current `plan:*` command against the proposed action-based taxonomy. The current system demonstrates **exceptional depth in plan management** (meta category) but **minimal coverage of action commands** needed for actual development work.

**Key Findings:**
- 7 of 11 current commands belong to Meta/Management category
- Only 1 true implementation command exists (plan:implement)
- Current commands exhibit "accidental coverage" - single commands spanning multiple proposed categories
- Several commands need restructuring rather than simple renaming
- Plan management infrastructure is production-ready; action commands are MVP or missing

---

## Comparison Matrix

| Current Command | Proposed Category | Proposed Command(s) | Mapping Quality | Restructuring Need |
|-----------------|-------------------|---------------------|-----------------|-------------------|
| plan:create | Meta/Management | /plan:create | Direct Match | None |
| plan:set | Meta/Management | /plan:set | Direct Match | None |
| plan:status | Meta/Management | /plan:status | Direct Match | None |
| plan:split | Meta/Management | /plan:split | Direct Match | None |
| plan:archive | Meta/Management | /plan:archive | Direct Match | None |
| plan:templates | Meta/Management | /template:list | Rename Only | Extract to /template |
| plan:migrate | Operations | /migrate | Move Category | Extract from plan namespace |
| plan:batch | Meta/Management | /workflow:batch | Move Category | Extract to /workflow |
| plan:implement | Implementation | /implement | Move Category | Extract from plan namespace |
| plan:explain | Documentation | /explain | Semantic Overlap | Split: task vs code |
| plan:verify | Quality/Testing | /validate | Semantic Overlap | Split: plan vs code |

---

## Detailed Command Analysis

### 1. plan:create → /plan:create

**Mapping Quality:** ✓ Direct Match (100%)

**Current Capabilities:**
- Scans `docs/plan-templates/` for available templates
- Interactive template selection with metadata display
- Variable substitution with auto-fill support
- Auto-activation as current plan via plan:set
- Output directory initialization

**Recommendation:** Keep as-is. Production-ready.

---

### 2. plan:set → /plan:set

**Mapping Quality:** ✓ Direct Match (100%)

**Current Capabilities:**
- Scans available plans in `docs/plans/`
- Writes selection to `.claude/current-plan.txt`
- Initializes status.json structure automatically
- Shows plan summary with phases and progress

**Recommendation:** Keep as-is. Production-ready.

---

### 3. plan:status → /plan:status

**Mapping Quality:** ✓ Direct Match (100%)

**Current Capabilities:**
- Progress visualization with progress bars
- Phase-by-phase breakdown with percentages
- Success criteria tracking
- Recent activity log
- Next action suggestions

**Recommendation:** Keep as-is. Production-ready.

---

### 4. plan:implement → /implement

**Mapping Quality:** → Move Category + Specialize (70%)

**Current Capabilities:**
- Multi-select task interface with phase grouping
- Template variable detection and substitution
- Read-only agent pattern for safe execution
- Error handling with markTaskFailed, markTaskSkipped

**Feature Gaps:**
- Generic implementation only - No specialized modes for refactoring, bug fixing, optimization
- Plan-bound - Cannot implement ad-hoc code changes

**Recommendation:**
- Rename to `/implement` (drop plan: prefix)
- Add mode parameter: `--mode=implement|refactor|fix|optimize`
- Support ad-hoc implementation without active plan

---

### 5. plan:batch → /workflow:batch

**Mapping Quality:** → Move Category + Expand (85%)

**Current Capabilities:**
- Multi-select with quick-select options
- Intelligent execution planning (groups by phase, detects dependencies)
- Execution preview with visual diagram
- Real-time progress tracking
- Parallelization support (up to 5 concurrent agents)

**Feature Gaps:**
- Plan-specific only - Cannot orchestrate non-plan workflows
- No conditional logic - Cannot branch based on task results
- No cross-plan workflows

**Recommendation:**
- Rename to `/workflow:batch`
- Expand to support non-plan workflows
- Add conditional branching

---

### 6. plan:verify → /plan:verify + /validate

**Mapping Quality:** ≈ Semantic Overlap + Split (55%)

**Current Capabilities:**
- Batch file verification
- Four verification statuses: ALREADY DONE, NEEDED, BLOCKED, OBSOLETE
- Test execution integration (--run-tests flag)

**Semantic Confusion:**
- Current: Verifies **task completion status**
- Proposed: Validates **code/feature correctness**

**Recommendation:**
- Keep `/plan:verify` for task completion verification
- Create new `/validate` for code/feature validation
- Create separate `/test` for test workflows

---

### 7. plan:explain → /plan:explain + /explain

**Mapping Quality:** ≈ Semantic Overlap + Split (50%)

**Current Capabilities:**
- Explains plan tasks with context, scope, approach
- Integrates with status-manager for enhanced explanations
- Offers to implement tasks after explanation

**Semantic Confusion:**
- Current: Explains **what needs to be done** (plan tasks)
- Proposed: Explains **what code does** (existing implementation)

**Recommendation:**
- Keep `/plan:explain` for task/plan explanations
- Create new `/explain` for code/concept explanations

---

## Gap Analysis by Category

| Category | Current Coverage | Gap |
|----------|------------------|-----|
| Discovery & Ideation | 0% | /clarify, /explore, /research, /brainstorm |
| Design & Architecture | 0% | /architect, /design, /spec, /model |
| Analysis | 10% | /analyze, /audit, /review, /profile |
| Implementation | 20% | /refactor, /fix, /optimize, /scaffold |
| Quality & Testing | 25% | /test, /validate, /debug, /coverage |
| Documentation | 12.5% | /document, /explain, /diagram, /changelog |
| Operations | 6% | /deploy, /migrate, /release, /ci |
| Meta/Management | 87.5% | /workflow, /template CRUD, /config |

---

## Key Insight

The current system is a **plan execution engine**. The proposed taxonomy envisions a **development workflow assistant**. The gap is not in quality but in scope - current commands excel at what they do but cover only 20% of proposed functionality.
