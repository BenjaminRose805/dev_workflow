# Artifact Schemas

This directory contains formal JSON Schema definitions for artifacts produced and consumed by the dev workflow command system.

## Overview

All schemas follow [JSON Schema Draft-07](http://json-schema.org/draft-07/schema#) specification.

## Available Schemas

| Schema File | Artifact Type | Producing Command | Description |
|-------------|---------------|-------------------|-------------|
| `artifact-metadata.json` | (base) | All | Common metadata fields for all artifacts |
| `requirements-spec.json` | requirements-spec | /clarify | Requirements specifications |
| `components-catalog.json` | components-catalog | /architect | Architectural component catalogs |
| `validation-report.json` | validation-report | /validate | Validation and quality gate results |
| `analysis-report.json` | analysis-report | /analyze | Static analysis findings |

## Usage

### Validating Artifacts

Use AJV or any JSON Schema validator:

```bash
# Using ajv-cli
npx ajv validate -s docs/schemas/validation-report.json -d artifact.json

# Using Node.js
const Ajv = require('ajv');
const ajv = new Ajv();
const schema = require('./docs/schemas/validation-report.json');
const validate = ajv.compile(schema);
const valid = validate(artifact);
```

### Creating New Artifacts

All artifacts must include the required metadata fields from `artifact-metadata.json`:

```json
{
  "artifact_type": "analysis-report",
  "version": "1.0.0",
  "created_at": "2025-12-24T00:00:00Z",
  "created_by": "sonnet",
  "command": "/analyze",
  "subcommand": "security",
  "status": "active"
}
```

## Schema Conventions

### Required Fields

All artifact schemas require these base fields:
- `artifact_type` - From the artifact type registry
- `version` - Semantic version (X.Y.Z)
- `created_at` - ISO-8601 timestamp
- `created_by` - Model identifier (sonnet, opus, haiku)
- `command` - Producing command
- `status` - Lifecycle status (draft, active, superseded, archived)

### Naming Conventions

- Schema files: kebab-case (e.g., `validation-report.json`)
- Field names: snake_case (e.g., `artifact_type`, `created_at`)
- IDs: UPPER-CASE with prefix (e.g., `REQ-001`, `COMP-AUTH`, `FIND-SEC-001`)

### Severity Levels

Standard severity levels used across all schemas:
- `critical` - Immediate action required
- `high` - Same day resolution
- `medium` - Within sprint
- `low` - Backlog
- `info` - Informational only

## Adding New Schemas

1. Create schema file in `docs/schemas/` with kebab-case name
2. Include `$schema`, `$id`, `title`, and `description`
3. Inherit required fields from `artifact-metadata.json`
4. Add artifact-specific fields
5. Update this README
6. Reference schema in the producing command's implementation plan

## References

- [Implementation Plan Standards](../standards/implementation-plan-standards.md#artifact-standards)
- [Artifact Type Registry](../standards/implementation-plan-standards.md#artifact-type-names)
- [JSON Schema Draft-07](http://json-schema.org/draft-07/schema)
