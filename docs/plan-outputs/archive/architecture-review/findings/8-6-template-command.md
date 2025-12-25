# /template Command Design Specification

**Task:** 8.6 Design `/template` command (template management)
**Category:** Operations & Meta
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/template` command provides comprehensive template management for reusable artifacts across plans, commands, workflows, and documentation. It enables teams to create, apply, validate, and share standardized templates that accelerate development while maintaining consistency.

**Key Differentiator:** `/template` focuses on **template lifecycle management** (create, apply, validate, version), whereas `/plan:create` uses templates and `/scaffold` generates code from patterns. Templates use YAML frontmatter + content with variable substitution.

**Core Philosophy:**
- **Reusability:** Capture proven patterns once, reuse everywhere
- **Consistency:** Standardize structure, format, and best practices
- **Flexibility:** Support variable substitution and conditional content
- **Discoverability:** Categorized, searchable, with metadata
- **Shareability:** Import/export for team collaboration

---

## Command Structure

### Primary Command: `/template`

**Base invocation** (without sub-command):
```
/template [optional-name]
```

Shows template management dashboard with quick actions.

### Sub-Commands

| Sub-command | Purpose | Input Artifacts | Output | Priority |
|-------------|---------|-----------------|--------|----------|
| `template:list` | List available templates by category | None | Template catalog display | P0 |
| `template:create` | Create new template from existing artifact | Artifact file | Template file | P0 |
| `template:apply` | Apply template to generate new artifact | Template + variables | Generated artifact | P0 |
| `template:edit` | Edit existing template | Template name | Updated template | P1 |
| `template:validate` | Validate template structure and variables | Template file | Validation report | P1 |
| `template:import` | Import template from external source | URL or file path | Imported template | P2 |
| `template:export` | Export template for sharing | Template name | Exportable bundle | P2 |
| `template:delete` | Remove template from library | Template name | Confirmation | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/template.md`

```yaml
---
name: template
description: Manage reusable templates for plans, commands, artifacts, and workflows
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Edit, AskUserQuestion
argument-hint: [template-name]
category: meta
output_artifacts:
  - template-files
  - template-manifest.json
---
```

---

## Model Configuration Rationale

**Model:** `sonnet` (Claude Sonnet 4.5)
- Template operations are primarily structural/textual
- Pattern recognition for variable extraction
- Cost-effective for frequent template operations
- Sufficient for validation and substitution logic

---

## Template System Design

### Template Directory Structure

```
.claude/
├── templates/
│   ├── plans/                    # Plan templates
│   │   └── analysis.template.md
│   ├── commands/                 # Command templates
│   │   └── api-command.template.md
│   ├── artifacts/                # Artifact templates
│   │   └── design-spec.template.md
│   ├── workflows/                # Workflow templates
│   │   └── tdd-workflow.template.md
│   ├── documentation/            # Documentation templates
│   │   └── api-docs.template.md
│   └── custom/                   # User-created templates
├── template-manifest.json        # Global template registry
└── template-config.json          # Template system configuration
```

### Template File Format

Templates use **YAML frontmatter + content** with **variable substitution**:

```markdown
---
template_type: artifact
template_name: API Design Specification
template_version: 1.2.0

variables:
  - name: api_name
    type: string
    required: true
    example: User Management API

  - name: api_version
    type: string
    required: true
    default: "1.0.0"

  - name: authentication_type
    type: enum
    default: jwt
    options: [jwt, oauth2, api-key, none]

output:
  default_path: docs/design/api-specs/
  filename_pattern: "{{api_name | slugify}}-api-spec.md"
---

# API Design Specification: {{api_name}}

**Version:** {{api_version}}
**Authentication:** {{authentication_type}}
...
```

### Variable Substitution Syntax

**Basic:** `{{variable_name}}`

**Filters:**
- `{{api_name | slugify}}` - "User API" → "user-api"
- `{{text | uppercase}}` - "api" → "API"
- `{{date | format: "YYYY-MM-DD"}}`

**Conditionals:**
```
{{#if variable}}
  Content when truthy
{{else}}
  Content when falsy
{{/if}}
```

**System Variables (auto-populated):**
- `{{git.user.name}}`, `{{date}}`, `{{timestamp}}`, `{{project.name}}`

### Template Categories

1. **Plans** - Structured workflows for development tasks
2. **Commands** - Custom slash command definitions
3. **Artifacts** - Reusable document structures (specs, requirements)
4. **Workflows** - Multi-command sequences
5. **Documentation** - API docs, architecture docs, user guides

---

## Output Artifacts

### template-manifest.json Schema

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-20T10:30:00Z",
  "templates": [
    {
      "id": "api-design-spec-v1",
      "name": "API Design Specification",
      "category": "artifacts",
      "version": "1.2.0",
      "path": ".claude/templates/artifacts/api-spec.template.md",
      "tags": ["api", "design", "specification"],
      "variables": [...],
      "usage_count": 45,
      "status": "stable"
    }
  ],
  "categories": [
    {"name": "plans", "count": 6},
    {"name": "artifacts", "count": 12}
  ]
}
```

### validation-report.md Template

Includes validation summary, variable validation table, issues found, and recommendations.

---

## Workflow Integration

### Upstream Commands (Template Sources)
- `/plan:create` - Convert plan to template
- `/design`, `/spec` - Convert spec to template
- `/workflow` - Template for workflows

### Downstream Commands (Template Consumers)
- `/plan:create` - Generate new plans from templates
- `/workflow:create` - Generate new workflows
- `/scaffold` - Generate code scaffolding
- `/document` - Generate docs from templates

---

## Example Usage Scenarios

### Example 1: Create Template from Design Spec

```
User: /template:create docs/design/shopping-cart/design-spec.md

Claude: Analyzing document...

Identified structure:
- Title: Shopping Cart Design Specification
- Sections: Overview, Components, Data Model, API

Variable extraction:
1. component_name: "Shopping Cart" → {{component_name}}
2. framework: "React" → {{framework}}

Created template:
→ .claude/templates/artifacts/component-design-spec.template.md
```

### Example 2: Apply Template to Generate Artifact

```
User: /template:apply api-design-spec

Claude: Template: API Design Specification (v1.2.0)

Please provide values:
1. api_name (required): User Management API
2. api_version (default: 1.0.0): 2.0.0
3. authentication_type (default: jwt): oauth2

Generated: docs/design/api-specs/user-management-api-spec.md

✅ All required variables substituted
✅ No syntax errors
```

### Example 3: Validate Template

```
User: /template:validate api-design-spec

Claude: Validating template...

✅ YAML frontmatter syntax: Valid
✅ Variable definitions: 13 variables, all typed
✅ Variable usage: All template variables defined
⚠️ Dependencies: 1 not found (requirements.template.json)

Overall Status: VALID (with 1 warning)
```

---

## Differentiation from Related Commands

| Command | Focus | Relationship |
|---------|-------|--------------|
| `/template` | Manage templates (producer) | Manages all template types |
| `/plan:create` | Uses templates (consumer) | Consumes plan templates |
| `/scaffold` | Generates code from patterns | Different scope (code vs docs) |
| `/workflow:create` | Uses workflow templates | Consumes workflow templates |

---

## Template Library Best Practices

### Template Design Guidelines

1. **Single Responsibility** - Each template serves one clear purpose
2. **Variable Naming** - Use descriptive, snake_case names
3. **Default Values** - Provide sensible defaults for optional variables
4. **Validation** - Define required vs optional, use patterns for format
5. **Documentation** - Include usage instructions in template

### Template Versioning

Use semantic versioning:
- **Major:** Breaking changes to variables or structure
- **Minor:** New optional variables or sections
- **Patch:** Fixes, typo corrections

---

## Priority Classification

### P0 (Must Have) - Core Template Operations
- `/template` - Template dashboard
- `/template:list` - Browse templates
- `/template:create` - Create from artifact
- `/template:apply` - Generate from template

### P1 (Should Have) - Template Quality
- `/template:edit` - Modify templates
- `/template:validate` - Quality assurance

### P2 (Nice to Have) - Sharing & Cleanup
- `/template:import` - Import from external sources
- `/template:export` - Share templates
- `/template:delete` - Remove templates

---

**Phase 8 Task 8.6 Status: COMPLETE**
