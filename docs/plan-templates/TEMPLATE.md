# Plan Template Format Documentation

This document describes the format and conventions for plan templates used with `/plan:create`.

> **Standards Reference:** See [PLAN-STANDARDS.md](../standards/PLAN-STANDARDS.md) for the authoritative specification of plan structure, phases, tasks, and orchestration requirements.

## Template Variables

Templates use `{{variable_name}}` syntax for substitution. Common variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{date}}` | Current date | 2024-01-15 |
| `{{target_path}}` | Path to analyze/document/test | src/lib/ |
| `{{plan_name}}` | Name of the plan | Authentication Refactor |

### Template-Specific Variables

**analysis.md:**
- `{{analysis_name}}` - Name of the analysis
- `{{focus_area}}` - What aspect to focus on
- `{{analysis_type}}` - Type of analysis (security, performance, etc.)

**validation.md:**
- `{{validation_name}}` - Name of the validation
- `{{validation_type}}` - Type of validation (pre-deploy, post-refactor, etc.)

**create-plan.md:**
- `{{plan_name}}` - Name of the plan being created
- `{{objective}}` - What the plan aims to achieve
- `{{scope}}` - Boundaries of the plan
- `{{plan_filename}}` - Output filename for the plan

**documentation.md:**
- `{{doc_name}}` - Name of the documentation
- `{{doc_type}}` - Type: API, Architecture, User Guide, Developer

**test-creation.md:**
- `{{test_name}}` - Name of the test plan
- `{{test_type}}` - Type: Unit, Integration, E2E
- `{{test_framework}}` - Framework: Vitest, Jest, Playwright

## Template Structure

All templates follow this structure:

```markdown
# [Type] Plan: {{name}}

## Overview
- **Key Field 1:** {{variable}}
- **Key Field 2:** {{variable}}
- **Created:** {{date}}
- **Output:** `docs/plan-outputs/{{plan_filename}}/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Phase 1: [First Phase Name]
- [ ] 1.1 Task 1
- [ ] 1.2 Task 2
- [ ] **VERIFY 1**: Phase verification

## Phase 2: [Second Phase Name]
...

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Findings documented in `findings/`
```

**Note:** Inline placeholders (like `<!-- findings here -->`) have been replaced with output directory references. All findings and task outputs are written to `docs/plan-outputs/{plan-name}/findings/` using the `writeFindings()` function or `node scripts/status-cli.js write-findings` command.

## Conventions

### Checkbox Format
- Incomplete: `- [ ] Task description`
- Complete: `- [x] Task description`

### Status Indicators
- ⬜ Not started
- ⟳ In progress
- ✓ Complete
- ✗ Failed

### Severity Levels (for Analysis)
1. **BREAKING** - Will cause failures
2. **BUG** - Logic errors
3. **SMELL** - Code quality issues
4. **NITPICK** - Minor improvements

### Tables for Tracking
Use markdown tables for structured tracking:

```markdown
| Item | Status | Notes |
|------|--------|-------|
| Component A | ⬜ | |
| Component B | ✓ | Done |
```

## Available Templates

| Template | Purpose | Key Phases |
|----------|---------|------------|
| analysis.md | Structured analysis workflow | Discovery → Deep Analysis → Synthesis → Verification |
| validation.md | Systematic verification | Static → Behavioral → Integration → Sign-off |
| create-plan.md | Creating new plans | Requirements → Research → Design → Writing → Review |
| documentation.md | Documentation workflow | Discovery → Information Gathering → Writing → Review |
| test-creation.md | Test coverage improvement | Coverage Analysis → Test Design → Implementation → Validation |

## Usage

Create a new plan from template:
```
/plan:create
```

This will:
1. Show available templates
2. Prompt for template selection
3. Ask for variable values
4. Generate plan in `docs/plans/`
5. Set as active plan

## Best Practices

1. **Start verbs** - Begin tasks with action verbs (Create, Update, Add, Fix)
2. **Atomic tasks** - Each checkbox should be completable in one session
3. **Verification** - Always include a verification/review phase
4. **Success criteria** - Make criteria measurable and specific
5. **Output refs** - Include output directory reference in Overview
6. **Findings note** - Add blockquote explaining where findings are stored
7. **Task IDs** - Use numbered task IDs (e.g., 1.1, 2.3) for status tracking
