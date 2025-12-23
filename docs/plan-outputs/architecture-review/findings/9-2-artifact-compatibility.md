# 9.2 Artifact Compatibility Patterns

**Task:** Define mechanisms for artifact compatibility
**Date:** 2025-12-20
**Status:** Complete

---

## Executive Summary

Artifact compatibility defines which commands can consume which artifacts as inputs and how to validate, transform, and compose them. This analysis identifies type systems, schema validation, transformation pipelines, and compatibility matrices.

---

## 1. Compatibility Matrix

### Feed-Forward Compatibility

```
DISCOVERY → DESIGN → IMPLEMENTATION → QUALITY → OPERATIONS

/clarify → requirements.json
    ├─→ /architect (direct)
    ├─→ /design (direct)
    └─→ /test (via transformation)

/architect → architecture.md, components.json
    ├─→ /implement (direct)
    ├─→ /test (direct)
    └─→ /deploy (direct)

/design → design-spec.md
    └─→ /implement (direct)

/implement → code files
    └─→ /test (direct)

/test → test-results.md
    └─→ /validate (direct)

/validate → validation-report.md
    └─→ /release (direct)
```

### Compatibility Types

| Type | Definition | Example |
|------|------------|---------|
| **Direct** | No transformation needed | requirements → /architect |
| **Partial** | Subset of fields used | architecture → /test (only structure) |
| **Transformable** | Requires mapping | requirements → test-cases |
| **Derived** | Informs but doesn't feed | exploration → /architect decisions |
| **Reference** | Looked up for validation | openapi → /validate checks |

---

## 2. Type System

### Artifact Type Hierarchy

```typescript
interface Artifact {
  metadata: ArtifactMetadata;
  content: unknown;
  version: SemanticVersion;
}

interface RequirementsArtifact extends Artifact {
  content: {
    functional_requirements: Requirement[];
    non_functional_requirements: NFRequirement[];
    constraints: string[];
    assumptions: string[];
  }
}

interface SpecificationArtifact extends Artifact {
  content: {
    version: string;
    api_version?: string;
    schema?: object;
  }
}
```

### Consumer Contracts

```typescript
interface CommandContract {
  command: string;
  inputs: {
    required: ArtifactSpec[];
    optional: ArtifactSpec[];
  };
  outputs: ArtifactSpec[];
}

// Example: /test command
{
  command: "/test",
  inputs: {
    required: [
      { type: "design-spec", version: "1.0+", fields: ["public_interface"] }
    ],
    optional: [
      { type: "requirements", usage: "auto-generate acceptance tests" }
    ]
  },
  outputs: [
    { type: "test-matrix", version: "1.0" },
    { type: "test-results", version: "1.0" }
  ]
}
```

---

## 3. Schema Validation

### Validation Layers

```json
{
  "layers": [
    {
      "name": "syntax",
      "type": "parser",
      "fatal": true,
      "example": "JSON.parse()"
    },
    {
      "name": "schema",
      "type": "json-schema",
      "fatal": true,
      "example": "ajv.validate(schema, data)"
    },
    {
      "name": "semantic",
      "type": "domain-rules",
      "fatal": false,
      "example": "referenced entities exist"
    },
    {
      "name": "compatibility",
      "type": "consumer-check",
      "fatal": true,
      "example": "command supports this version"
    }
  ]
}
```

### Validation Implementation

```javascript
async function validateForConsumption(artifact, command) {
  const contract = getCommandContract(command);
  const errors = [];

  // Check type compatibility
  if (!contract.inputs.some(i => i.type === artifact.type)) {
    errors.push({
      type: 'incompatible',
      message: `${command} cannot consume ${artifact.type}`
    });
  }

  // Check version compatibility
  const spec = contract.inputs.find(i => i.type === artifact.type);
  if (!semver.satisfies(artifact.version, spec.version)) {
    errors.push({
      type: 'version',
      message: `Requires ${spec.version}, got ${artifact.version}`
    });
  }

  // Check required fields
  for (const field of spec.fields || []) {
    if (!hasField(artifact.content, field)) {
      errors.push({
        type: 'missing_field',
        message: `Required field missing: ${field}`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 4. Transformation Pipelines

### Transformation Definition

```typescript
interface Transformation {
  source: string;        // artifact type
  target: string;        // artifact type
  command: string;       // target command
  rules: TransformRule[];
  validation: ValidationRule[];
}

interface TransformRule {
  type: "map" | "expand" | "filter" | "derive";
  source_path: string;
  target_path: string;
  transformer?: string;
}
```

### Example: Requirements → Test Cases

```json
{
  "source": "requirements",
  "target": "test-cases",
  "command": "/test",
  "rules": [
    {
      "type": "expand",
      "source_path": "functional_requirements[*]",
      "target_path": "testCases[*]",
      "mapping": {
        "id": "TC-{id}",
        "title": "{description}",
        "steps": "acceptance_criteria[*]"
      }
    },
    {
      "type": "derive",
      "source_path": "priority",
      "target_path": "priority",
      "lookup": {
        "must-have": "high",
        "should-have": "medium",
        "nice-to-have": "low"
      }
    }
  ]
}
```

### Transformation Registry

```javascript
const transformations = new Map([
  ['requirements→test-cases', requirementsToTestCases],
  ['architecture→component-catalog', architectureToComponents],
  ['openapi→mock-server', openapiToMock],
  ['design-spec→interfaces', designToInterfaces]
]);

function getTransformation(source, target) {
  return transformations.get(`${source}→${target}`);
}
```

---

## 5. Error Handling

### Error Categories

```json
{
  "schema_violation": {
    "detection": "static",
    "response": "block + suggest correction"
  },
  "missing_transformation": {
    "detection": "static",
    "response": "list compatible types + suggest upstream command"
  },
  "transformation_failure": {
    "detection": "runtime",
    "response": "show failed rule + diagnostic output"
  },
  "version_incompatibility": {
    "detection": "static",
    "response": "show versions + migration path"
  },
  "consistency_violation": {
    "detection": "runtime",
    "response": "identify mismatches + suggest regeneration"
  }
}
```

### Recovery Strategies

```javascript
const recoveryStrategies = {
  schema_violation: {
    strategy: 'fail',
    action: () => { throw new SchemaError(); }
  },
  missing_field: {
    strategy: 'suggest',
    action: () => console.log('Run /clarify to add field')
  },
  version_mismatch: {
    strategy: 'transform',
    action: (artifact) => migrateArtifact(artifact)
  },
  stale_artifact: {
    strategy: 'warn',
    action: () => console.warn('Artifact may be outdated')
  }
};
```

---

## 6. Version Compatibility

### Breaking Change Tracking

```json
{
  "artifact_type": "requirements",
  "breaking_changes": [
    {
      "version": "2.0.0",
      "description": "Moved acceptance_criteria to requirements array",
      "migration": "requirements_v1_to_v2"
    }
  ],
  "deprecations": [
    {
      "field": "priority",
      "deprecated_in": "1.5.0",
      "removed_in": "2.0.0",
      "replacement": "functional_requirements[].priority"
    }
  ]
}
```

---

## 7. Recommendations

| Aspect | Recommendation |
|--------|----------------|
| Type System | Explicit artifact registry with JSON schemas |
| Validation | 4-layer validation (syntax → schema → semantic → compatibility) |
| Transformations | Explicit transformation catalog with rules |
| Error Handling | Recovery strategies per error type |
| Versioning | Strict semver with breaking change tracking |
| Documentation | Embed compatibility metadata in artifacts |

---

## 8. Implementation Priority

1. **Phase 1:** Artifact type registry + JSON schemas
2. **Phase 2:** Compatibility matrix + documentation
3. **Phase 3:** Schema validation + error handling
4. **Phase 4:** Transformation pipelines
5. **Phase 5:** Runtime consistency checking
6. **Phase 6:** Recovery strategies + tooling
