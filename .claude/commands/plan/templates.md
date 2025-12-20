# List Plan Templates

Display available plan templates with their purpose and required variables.

## Instructions

### 1. Scan Template Directory

Read all `.md` files from `docs/plan-templates/` directory:

```bash
ls docs/plan-templates/*.md
```

### 2. Parse Each Template

For each template file (excluding `TEMPLATE.md` which is documentation):

**Extract:**
- **Filename**: e.g., `analysis.md`
- **Title**: First `#` heading (e.g., "# Analysis Plan: {{analysis_name}}")
- **Purpose**: Text following "**Purpose:**" if present, or first paragraph after title
- **Variables**: All `{{variable_name}}` patterns found in the file
- **Phases**: Count of `## Phase` headers

### 3. Display Template List

Present templates in a formatted table:

```
═══════════════════════════════════════════════════════
                  AVAILABLE PLAN TEMPLATES
═══════════════════════════════════════════════════════

┌─────────────────────┬─────────────────────────────────────────┐
│ Template            │ Purpose                                 │
├─────────────────────┼─────────────────────────────────────────┤
│ analysis.md         │ Structured analysis workflow that       │
│                     │ produces categorized findings           │
│                     │                                         │
│                     │ Phases: 4                               │
│                     │ Variables: analysis_name, target_path,  │
│                     │   focus_area, analysis_type, date       │
├─────────────────────┼─────────────────────────────────────────┤
│ validation.md       │ Systematic verification workflow with   │
│                     │ pass/fail tracking                      │
│                     │                                         │
│                     │ Phases: 4                               │
│                     │ Variables: validation_name, target_path,│
│                     │   validation_type, date                 │
├─────────────────────┼─────────────────────────────────────────┤
│ create-plan.md      │ Guide for creating well-structured      │
│                     │ plans (meta-plan)                       │
│                     │                                         │
│                     │ Phases: 5                               │
│                     │ Variables: plan_name, objective, scope, │
│                     │   plan_filename, date                   │
├─────────────────────┼─────────────────────────────────────────┤
│ documentation.md    │ Structured documentation workflow       │
│                     │                                         │
│                     │ Phases: 4                               │
│                     │ Variables: doc_name, target_path,       │
│                     │   doc_type, date                        │
├─────────────────────┼─────────────────────────────────────────┤
│ test-creation.md    │ Systematic test coverage improvement    │
│                     │                                         │
│                     │ Phases: 4                               │
│                     │ Variables: test_name, target_path,      │
│                     │   test_type, test_framework, date       │
└─────────────────────┴─────────────────────────────────────────┘

Total: 5 templates available

Use /plan:create to create a new plan from a template.
```

### 4. Optional: Show Template Details

If user requests details for a specific template (e.g., `/plan:templates analysis`):

```
═══════════════════════════════════════════════════════
              TEMPLATE: analysis.md
═══════════════════════════════════════════════════════

Purpose: Structured analysis workflow that produces categorized findings

Phases:
  1. Discovery - Scan and understand structure
  2. Deep Analysis - Analyze and categorize findings
  3. Synthesis - Prioritize and propose solutions
  4. Verification - Review for accuracy

Variables:
  ┌──────────────────┬───────────────────────────────────┐
  │ Variable         │ Description                       │
  ├──────────────────┼───────────────────────────────────┤
  │ analysis_name    │ Name of the analysis              │
  │ target_path      │ Path to analyze                   │
  │ focus_area       │ What aspect to focus on           │
  │ analysis_type    │ Type of analysis (security, etc.) │
  │ date             │ Auto-filled with current date     │
  └──────────────────┴───────────────────────────────────┘

Example Usage:
  /plan:create → Select "analysis.md" → Provide values

Sample Plan Names:
  - "Security Audit" → security-audit.md
  - "Performance Review" → performance-review.md
  - "Code Quality Check" → code-quality-check.md
```

## Output Format Options

**Default (no arguments):** Show summary table of all templates

**With template name:** Show detailed view of specific template

## Error Handling

**If template directory doesn't exist:**
```
Template directory not found: docs/plan-templates/

Create the directory and add templates, or run Phase 1 of the
Prompt-to-Plan Transition plan to set up the template system.
```

**If no templates found:**
```
No templates found in docs/plan-templates/

Expected template files:
- analysis.md
- validation.md
- create-plan.md
- documentation.md
- test-creation.md

See docs/plan-templates/TEMPLATE.md for format documentation.
```

## See Also

- `/plan:create` - Create a new plan from a template
- `/plan:set` - Set the active plan
- `docs/plan-templates/TEMPLATE.md` - Template format documentation
