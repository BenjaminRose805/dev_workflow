# Task 1.6: Map Current Commands to Proposed Taxonomy Categories

**Analysis Date:** 2025-12-20
**Source:** Synthesized from tasks 1.1-1.5 and proposed taxonomy in architecture-review.md

---

## Executive Summary

The current system has **11 commands** in a single `plan:*` namespace. The proposed taxonomy defines **8 categories** with **30+ commands**. This mapping shows where current functionality fits and reveals significant gaps in coverage.

---

## Current Commands → Proposed Categories

### Mapping Table

| Current Command | Proposed Category | Proposed Command(s) | Coverage |
|-----------------|-------------------|---------------------|----------|
| `plan:create` | Meta/Management | `/plan:create` | ✓ Direct |
| `plan:set` | Meta/Management | `/plan:set` | ✓ Direct |
| `plan:status` | Meta/Management | `/plan:status` | ✓ Direct |
| `plan:templates` | Meta/Management | `/template:list` | ≈ Rename |
| `plan:archive` | Meta/Management | `/plan:archive` | ✓ Direct |
| `plan:migrate` | Operations | `/migrate` | → Move |
| `plan:explain` | Documentation | `/explain` | → Move |
| `plan:implement` | Implementation | `/implement` | → Move |
| `plan:batch` | Meta/Management | `/workflow:batch` | → Move |
| `plan:split` | Meta/Management | `/plan:split` | ✓ Direct |
| `plan:verify` | Quality/Testing | `/validate` | → Move |

---

## Detailed Category Analysis

### 1. Discovery & Ideation (Proposed)

**Current Coverage:** 0%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/clarify` | Interactive requirements gathering | ❌ None |
| `/explore` | Codebase exploration | ❌ None |
| `/research` | Technology/approach research | ❌ None |
| `/brainstorm` | Idea generation | ❌ None |

**Gap Analysis:** No discovery/ideation commands exist. Users must manually gather context before creating plans.

---

### 2. Design & Architecture (Proposed)

**Current Coverage:** 0%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/architect` | System architecture design | ❌ None |
| `/design` | Component design | ❌ None |
| `/spec` | Formal specifications | ❌ None |
| `/model` | Data modeling | ❌ None |

**Gap Analysis:** No design commands exist. Design work is done ad-hoc or through implementation.

---

### 3. Analysis (Proposed)

**Current Coverage:** ~10%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/analyze` | Code analysis | ❌ None (template only) |
| `/audit` | Compliance audit | ❌ None |
| `/review` | Code review | ❌ None |
| `/profile` | Performance profiling | ❌ None |
| `/compare` | Compare approaches | ❌ None |

**Partial Coverage:**
- The `analysis.md` template provides structured analysis workflow
- But no dedicated command orchestrates it beyond `/plan:implement`

**Gap Analysis:** Analysis is handled through templates + implement, not dedicated commands.

---

### 4. Implementation (Proposed)

**Current Coverage:** ~40%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/implement` | Code implementation | ✓ `plan:implement` |
| `/refactor` | Code refactoring | ❌ None |
| `/fix` | Bug fixing | ❌ None |
| `/optimize` | Performance optimization | ❌ None |
| `/scaffold` | Generate boilerplate | ❌ None |

**Current Coverage:**
- `plan:implement` handles task execution from plans
- Agents can be spawned for implementation

**Gap Analysis:** No specialized commands for refactoring, fixing, or optimization. All handled through generic implement.

---

### 5. Quality & Testing (Proposed)

**Current Coverage:** ~20%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/test` | Test creation | ❌ None (template only) |
| `/validate` | Verification | ≈ `plan:verify` |
| `/debug` | Debugging assistance | ❌ None |
| `/coverage` | Coverage analysis | ❌ None |

**Current Coverage:**
- `plan:verify` provides task verification (DONE/NEEDED/BLOCKED/OBSOLETE)
- `test-creation.md` template for test workflow
- `validation.md` template for validation workflow

**Gap Analysis:** Verification exists but is plan-focused. No dedicated testing or debugging commands.

---

### 6. Documentation (Proposed)

**Current Coverage:** ~15%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/document` | Documentation generation | ❌ None (template only) |
| `/explain` | Code explanation | ≈ `plan:explain` |
| `/diagram` | Generate diagrams | ❌ None |
| `/changelog` | Generate changelog | ❌ None |

**Current Coverage:**
- `plan:explain` explains plan tasks, not code
- `documentation.md` template for doc workflow

**Gap Analysis:** `plan:explain` focuses on tasks not code. No true code documentation or explanation commands.

---

### 7. Operations (Proposed)

**Current Coverage:** ~10%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/deploy` | Deployment workflows | ❌ None |
| `/migrate` | Migration tasks | ≈ `plan:migrate` |
| `/release` | Release preparation | ❌ None |
| `/ci` | CI/CD configuration | ❌ None |

**Current Coverage:**
- `plan:migrate` migrates plan formats, not application code

**Gap Analysis:** `plan:migrate` is meta-command for plan system. No operational commands for application deployment/release.

---

### 8. Meta/Management (Proposed)

**Current Coverage:** ~90%

| Proposed Command | Description | Current Equivalent |
|------------------|-------------|-------------------|
| `/plan` | Plan management | ✓ Multiple `plan:*` |
| `/workflow` | Workflow orchestration | ≈ `plan:batch` |
| `/template` | Template management | ≈ `plan:templates` |
| `/config` | Configuration | ❌ None |

**Current Coverage:**
- `plan:create`, `plan:set`, `plan:status`, `plan:split`, `plan:archive` - comprehensive
- `plan:batch` - parallel execution (could move to `/workflow:batch`)
- `plan:templates` - listing only (no create/edit/delete)

**Gap Analysis:** Plan management is well-covered. Template management is read-only. No configuration commands.

---

## Coverage Summary

| Category | Commands Proposed | Commands Covered | Coverage % |
|----------|------------------|------------------|------------|
| Discovery & Ideation | 4 | 0 | 0% |
| Design & Architecture | 4 | 0 | 0% |
| Analysis | 5 | 0.5 | 10% |
| Implementation | 5 | 1 | 20% |
| Quality & Testing | 4 | 1 | 25% |
| Documentation | 4 | 0.5 | 12.5% |
| Operations | 4 | 0.25 | 6% |
| Meta/Management | 4 | 3.5 | 87.5% |
| **Total** | **34** | **6.75** | **20%** |

---

## Command Distribution

### Current State (plan:* namespace)
```
Meta/Management ████████████████████████████████████░░░░░ 91%
Implementation  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  9%
```

### Proposed State (action-based)
```
Discovery       ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
Design          ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
Analysis        ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 15%
Implementation  ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 15%
Quality         ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
Documentation   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
Operations      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
Meta            ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12%
```

---

## Key Gaps Identified

### Critical Gaps (High Value)
1. **No discovery commands** - Can't explore codebase or gather requirements
2. **No design commands** - Can't create architecture/design artifacts
3. **No test commands** - Can only run tests via templates, not create
4. **No refactor/fix commands** - Generic implement only

### Moderate Gaps
5. **No dedicated code explanation** - `plan:explain` is task-focused
6. **No diagram generation** - No visual documentation support
7. **No CI/CD commands** - No deployment automation

### Minor Gaps
8. **Template management read-only** - Can list but not create/edit
9. **No configuration commands** - Settings managed via files only

---

## Recommended Priority for New Commands

### Tier 1 (Highest Impact)
| Command | Justification |
|---------|---------------|
| `/explore` | Pre-requisite for effective planning |
| `/clarify` | Reduces ambiguity before implementation |
| `/refactor` | Common development need |
| `/test` | Direct test creation/execution |

### Tier 2 (High Impact)
| Command | Justification |
|---------|---------------|
| `/analyze` | Structured code analysis |
| `/document` | Documentation generation |
| `/explain` | Code explanation (not task) |
| `/review` | Code review workflow |

### Tier 3 (Medium Impact)
| Command | Justification |
|---------|---------------|
| `/architect` | System design |
| `/design` | Component design |
| `/debug` | Debugging assistance |
| `/fix` | Bug fixing workflow |

### Tier 4 (Lower Priority)
| Command | Justification |
|---------|---------------|
| `/deploy`, `/release`, `/ci` | Ops commands |
| `/scaffold`, `/optimize` | Specialized implementation |
| `/brainstorm`, `/research` | Ideation support |

---

## Transition Strategy

### Phase 1: Rename & Restructure
- Keep `plan:*` namespace for plan management
- Move `plan:implement` → `/implement`
- Move `plan:verify` → `/validate`
- Move `plan:explain` → `/explain:task` (keep plan focus)

### Phase 2: Add Discovery Commands
- Create `/explore` for codebase navigation
- Create `/clarify` for requirements gathering
- Create `/research` for technology research

### Phase 3: Add Quality Commands
- Create `/test` with sub-commands (unit, integration, e2e)
- Create `/analyze` with sub-commands (security, performance, quality)
- Create `/review` for code review

### Phase 4: Add Design Commands
- Create `/architect` for system design
- Create `/design` for component design
- Create `/spec` for specifications

---

## Conclusion

The current command structure is heavily weighted toward **meta/management** (91% of commands). The proposed taxonomy would distribute commands more evenly across **8 categories**.

Key insight: The system has excellent **plan orchestration** but lacks **action-oriented commands** for the actual work (exploring, designing, testing, documenting).

The transition can be gradual, preserving backward compatibility while adding new action-based commands.
