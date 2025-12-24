# Create Plan from Template

Create a new plan file from a template with variable substitution.

## Instructions

### 1. Scan Available Templates

Read files from `docs/plan-templates/` directory (excluding `TEMPLATE.md`):

```bash
ls docs/plan-templates/*.md | grep -v TEMPLATE.md
```

For each template file, extract:
- **Filename**: e.g., `analysis.md`
- **Title**: First `#` heading in the file
- **Variables**: Find all `{{variable_name}}` patterns

### 2. Present Template Selection

Use AskUserQuestion to show available templates:

```
Select a template:

○ analysis.md - Analysis Plan
  Variables: analysis_name, target_path, focus_area, analysis_type, date

○ validation.md - Validation Plan
  Variables: validation_name, target_path, validation_type, date

○ create-plan.md - Create Plan (Meta-Plan)
  Variables: plan_name, objective, scope, plan_filename, date

○ documentation.md - Documentation Plan
  Variables: doc_name, target_path, doc_type, date

○ test-creation.md - Test Creation Plan
  Variables: test_name, target_path, test_type, test_framework, date
```

### 3. Gather Variable Values

After template selection, use AskUserQuestion to gather required variables.

**Auto-fill `{{date}}`** with current date in YYYY-MM-DD format.

**For other variables**, ask user for values:

```
Template: analysis.md

Please provide values for template variables:

1. analysis_name: [text input]
   Description: Name of this analysis (e.g., "Security Audit", "Performance Review")

2. target_path: [text input]
   Description: Path to analyze (e.g., "src/lib/", "src/components/")

3. focus_area: [text input]
   Description: What aspect to focus on (e.g., "security", "performance", "code quality")

4. analysis_type: [text input]
   Description: Type of analysis (e.g., "security", "performance", "architecture")
```

**For filename**, derive from the plan name if not specified:
- Convert to lowercase
- Replace spaces with hyphens
- Add `.md` extension
- Example: "Security Audit" → `security-audit.md`

### 4. Generate Plan File

1. Read the template file
2. Replace all `{{variable}}` placeholders with user-provided values
3. Determine output path: `docs/plans/{filename}.md`

**Check for existing file:**
- If file exists, ask user: "File already exists. Overwrite?"
- Options: Overwrite, Choose different name, Cancel

### 5. Write Plan File

Write the generated plan to `docs/plans/{filename}.md`

### 6. Set as Active Plan

Write the plan path to `.claude/current-plan.txt`:
```
docs/plans/{filename}.md
```

### 7. Initialize Output Directory (Output Separation)

**See:** `.claude/commands/plan/_common/status-tracking.md` for complete status tracking reference.

Create the output directory structure for status tracking:

**Directory:** `docs/plan-outputs/{plan-name}/` (where `{plan-name}` is the filename without `.md` extension)

**Initialize status.json:**
```bash
# After setting current-plan.txt, run any status command to trigger initialization
node scripts/status-cli.js status
```

This will:
1. Parse the newly created plan file
2. Extract all tasks from phases
3. Create initial status.json with all tasks as "pending"
4. Set the output pointer (`.claude/current-plan-output.txt`)

### 8. Confirm to User

```
Plan created successfully!

  File: docs/plans/security-audit.md
  Template: analysis.md
  Output: docs/plan-outputs/security-audit/

  Variables applied:
  - analysis_name: Security Audit
  - target_path: src/lib/
  - focus_area: security vulnerabilities
  - analysis_type: security
  - date: 2024-01-15

  Plan set as active.
  Status tracking initialized (38 tasks).

Use /plan:implement to start working on tasks.
Use /plan:status to view progress.
```

## Example Usage

**User runs:** `/plan:create`

**Flow:**
1. Shows template options → User selects "analysis.md"
2. Asks for variables → User provides values
3. Generates plan → Writes to `docs/plans/security-audit.md`
4. Sets active → Updates `.claude/current-plan.txt`
5. Confirms → Shows summary with next steps

## Error Handling

**If no templates found:**
```
No templates found in docs/plan-templates/

Create templates first, or use /plan:templates to see expected structure.
```

**If template read fails:**
```
Could not read template: {template_name}
Error: {error_message}
```

**If variable substitution fails:**
```
Missing required variable: {{variable_name}}

Please provide a value for this variable.
```

## Template Variable Reference

See `docs/plan-templates/TEMPLATE.md` for:
- Complete list of variables per template
- Variable descriptions and examples
- Template structure documentation
