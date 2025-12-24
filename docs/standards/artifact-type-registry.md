# Artifact Type Registry

## Overview

This registry defines all standardized artifact types used across the development workflow. All artifact types use **kebab-case** naming convention, and the YAML frontmatter field name is **`artifact_type`** (with underscore).

**Last Updated:** 2025-12-23

---

## Naming Standards

### Field Name Convention
- YAML frontmatter field: `artifact_type` (snake_case)
- JSON field: `artifact_type` (snake_case)

### Value Convention
- All artifact type values: **kebab-case**
- Examples: `architecture-document`, `debug-log`, `validation-report`

---

## Artifact Types by Category

### Architecture & Design

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `architecture-document` | System-level architecture documentation | `.md` | `/architect` |
| `architecture-decision-record` | ADR documenting architectural decisions | `.md` | `/architect:adr` |
| `design-spec` | Component-level detailed design specification | `.md` | `/design` |
| `interface-definitions` | TypeScript/language interface definitions | `.md` | `/design:api`, `/design:component` |
| `interaction-diagrams` | Mermaid sequence and state diagrams | `.md` | `/design:interactions` |
| `component-spec` | Component specification document | `.md` | `/design:component` |
| `api-spec` | API specification document | `.md` | `/design:api`, `/spec:api` |
| `ui-spec` | UI component specification | `.md` | `/design:ui` |

### Requirements & Planning

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `requirements` | Functional and non-functional requirements | `.json` | `/clarify` |
| `constraints` | Project constraints and limitations | `.json` | `/clarify` |
| `acceptance-criteria` | User story acceptance criteria | `.md` | `/clarify` |
| `scope` | Project scope definition | `.md` | `/clarify` |
| `research-notes` | Technology research findings | `.md` | `/research` |
| `options-analysis` | Analysis of technology/approach options | `.md` | `/brainstorm` |
| `comparison-matrix` | Side-by-side comparison of options | `.md` | `/research` |
| `alternatives` | Alternative solutions and approaches | `.md` | `/brainstorm` |

### Analysis & Reports

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `analysis-report` | Comprehensive codebase analysis | `.md` | `/analyze` |
| `exploration-report` | Codebase exploration findings | `.md` | `/explore` |
| `validation-report` | Validation results and findings | `.md` | `/validate` |
| `quality-report` | Code quality assessment | `.md` | `/analyze`, `/validate` |
| `performance-report` | Performance analysis findings | `.md` | `/analyze:performance` |
| `security-report` | Security analysis findings | `.md` | `/analyze:security` |
| `complexity-report` | Code complexity metrics | `.json` | `/analyze` |
| `dependency-report` | Dependency analysis | `.json` | `/analyze` |
| `tech-debt-assessment` | Technical debt analysis | `.md` | `/analyze` |
| `code-smells` | Identified code smells | `.md` | `/analyze` |

### Audit & Compliance

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `security-audit-report` | Security audit findings | `.md` | `/audit:security` |
| `compliance-audit-report` | Compliance audit results | `.md` | `/audit:compliance` |
| `access-audit-report` | Access control audit | `.md` | `/audit:access` |
| `privacy-audit-report` | Privacy compliance audit | `.md` | `/audit:privacy` |
| `infrastructure-audit-report` | Infrastructure security audit | `.md` | `/audit:infrastructure` |
| `license-audit-report` | License compliance audit | `.md` | `/audit:licenses` |
| `dependency-audit-report` | Dependency vulnerability audit | `.md` | `/audit:dependencies` |
| `secrets-audit-report` | Secrets detection audit | `.md` | `/audit:secrets` |

### Debug & Troubleshooting

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `debug-log` | Debugging session log with timeline | `.md` | `/debug` |
| `hypothesis` | Debugging hypotheses and ranking | `.md` | `/debug` |
| `root-cause` | Root cause analysis findings | `.md` | `/debug` |
| `fix-suggestion` | Suggested fixes with risk assessment | `.md` | `/debug` |

### Review & Feedback

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `review-comments` | Code review comments and suggestions | `.md` | `/review` |
| `review-summary` | Review summary and assessment | `.md` | `/review` |
| `blockers` | Critical blockers preventing merge | `.md` | `/review` |
| `suggestions` | Machine-readable review suggestions | `.json` | `/review` |

### Documentation

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `readme-documentation` | README.md documentation | `.md` | `/document:developer` |
| `api-reference-documentation` | API reference documentation | `.md` | `/document:api` |
| `user-guide` | User-facing documentation | `.md` | `/document:user` |
| `developer-guide` | Developer documentation | `.md` | `/document:developer` |
| `architecture-guide` | Architecture documentation | `.md` | `/document:architecture` |
| `changelog` | Project changelog | `.md` | `/document:changelog` |

### Testing

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `test-analysis` | Test coverage and quality analysis | `.md` | `/test`, `/analyze` |
| `test-improvement-plan` | Test improvement recommendations | `.md` | `/test` |
| `coverage-gaps` | Test coverage gaps | `.json` | `/test` |
| `flaky-tests` | Flaky test identification | `.json` | `/test` |

### Data & Models

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `data-model` | Data model specification | `.md` | `/model`, `/design:data` |
| `entity-relationship-diagram` | ERD documentation | `.md` | `/model:erd` |
| `schema-definitions` | Database schema definitions | `.json` | `/model` |
| `migration-plan` | Database migration plan | `.md` | `/migrate` |

### Deployment & Operations

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `deployment-config` | Deployment configuration | `.json` | `/deploy` |
| `deploy-notes` | Deployment notes and checklist | `.md` | `/deploy` |
| `health-check-report` | Health check results | `.md` | `/deploy` |
| `rollback-plan` | Rollback procedure | `.md` | `/deploy` |

### Workflow & Registry

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `codebase-map` | Codebase structure map | `.json` | `/explore` |
| `dependency-graph` | Dependency graph visualization | `.json` | `/analyze` |
| `artifact-registry` | Artifact registry metadata | `.json` | System |
| `workflow-definition` | Workflow configuration | `.yaml` | `/workflow` |

### Specifications

| Artifact Type | Description | File Extension | Commands |
|--------------|-------------|----------------|----------|
| `openapi-spec` | OpenAPI specification | `.yaml` | `/spec:api` |
| `graphql-schema` | GraphQL schema definition | `.graphql` | `/spec:graphql` |
| `json-schema` | JSON schema definitions | `.json` | `/spec` |

---

## Usage Guidelines

### In YAML Frontmatter

```yaml
---
artifact_type: architecture-document
version: "1.0"
created_at: 2025-12-23T10:00:00Z
status: active
---
```

### In JSON Metadata

```json
{
  "artifact_type": "requirements",
  "version": "1.0",
  "created_at": "2025-12-23T10:00:00Z",
  "status": "active"
}
```

### Adding New Artifact Types

When adding a new artifact type:

1. Use **kebab-case** for the type name
2. Add it to the appropriate category in this registry
3. Document the producing command(s)
4. Specify the file extension
5. Update implementation plans to reference the new type

### Deprecated Naming Patterns

❌ **DO NOT USE:**
- `artifact-type:` (field name with hyphen) - Use `artifact_type:` instead
- `validationReport` (camelCase) - Use `validation-report` instead
- `validation_report` (snake_case for values) - Use `validation-report` instead
- `ValidationReport` (PascalCase) - Use `validation-report` instead

✅ **CORRECT:**
- Field name: `artifact_type:` (snake_case)
- Value: `validation-report` (kebab-case)

---

## Validation Rules

### Field Name
- Must be `artifact_type` (lowercase with underscore)
- Required in all artifact metadata
- Type: string

### Value Format
- Must match pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- Must be lowercase
- Words separated by hyphens
- No leading/trailing hyphens
- Must be registered in this document

---

## Related Standards

- [Naming Conventions](./naming-conventions.md) - General naming standards
- [Artifact Schema Standards](./artifact-schema-standards.md) - Artifact structure requirements
- [YAML Frontmatter Standards](./yaml-frontmatter-standards.md) - Frontmatter requirements

---

## Changelog

### 2025-12-23
- Initial artifact type registry created
- Standardized all field names to `artifact_type` (snake_case)
- Standardized all type values to kebab-case
- Documented 80+ artifact types across all categories
- Added validation rules and usage guidelines
