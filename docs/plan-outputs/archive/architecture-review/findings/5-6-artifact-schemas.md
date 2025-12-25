# Task 5.6: Design & Architecture Artifact Schemas

**Phase:** 5 - Command Design - Design & Architecture
**Status:** Complete
**Date:** 2025-12-20

---

## Executive Summary

This document defines the artifact schemas for all Design & Architecture command outputs. Phase 5 produces **28 distinct artifact types** with standardized schemas ensuring consistency, machine-readability, and cross-command compatibility.

---

## Artifact Registry

### Summary by Command

| Command | Artifacts | Types |
|---------|-----------|-------|
| `/architect` | 10 | architecture.md, system-diagram.md, components.json, component-diagram.md, data-architecture.md, data-flow.md, deployment.md, infrastructure.md, security-architecture.md, adr/*.md |
| `/design` | 8 | design-spec.md, interfaces.md, api-spec.md, interactions.md, sequence-diagrams.md, state-model.md, state-machine.json, ui-spec.md |
| `/spec` | 6 | openapi.yaml, schema.json, types.json, schema.graphql, events-spec.yaml, data-model.json |
| `/model` | 8 | data-model.md, entities.json, erd-diagram.md, schema.sql, domain-model.md, aggregates.json, migrations/*.sql, schema.prisma |

---

## Common Metadata Schema

All markdown artifacts include standard YAML frontmatter:

```yaml
---
artifact_type: [type-identifier]
command: [generating-command]
version: 1.0.0
created_at: [ISO-8601 timestamp]
updated_at: [ISO-8601 timestamp]
status: draft | in-review | approved | deprecated
author: Claude [Model] [Version]
related_artifacts:
  - [path-to-related-artifact]
tags:
  - [relevant-tag]
---
```

All JSON artifacts include metadata object:

```json
{
  "metadata": {
    "artifact_type": "[type-identifier]",
    "command": "[generating-command]",
    "version": "1.0.0",
    "created_at": "[ISO-8601]",
    "updated_at": "[ISO-8601]",
    "status": "draft"
  }
}
```

---

## Architecture Artifacts

### architecture.md

**Type:** `architecture-document`
**Command:** `/architect`, `/architect:system`
**Location:** `docs/architecture/architecture.md`

```markdown
---
artifact_type: architecture-document
command: architect
system: [system-name]
version: 1.0.0
created_at: [ISO-8601]
status: draft
c4_levels: [context, container, component]
---

# Architecture: [System Name]

## 1. Context & Goals
## 2. System Overview
## 3. Container Architecture
## 4. Component Architecture
## 5. Data Architecture
## 6. Cross-Cutting Concerns
## 7. Deployment Architecture
## 8. Quality Attributes
## 9. Technology Choices
## 10. Constraints & Trade-offs
## 11. Risks & Mitigations
## 12. Future Considerations
```

### components.json

**Type:** `component-catalog`
**Command:** `/architect:components`
**Location:** `docs/architecture/components.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Component Catalog",
  "type": "object",
  "required": ["metadata", "containers", "relationships"],
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "artifact_type": { "const": "component-catalog" },
        "system": { "type": "string" },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "created_at": { "type": "string", "format": "date-time" }
      },
      "required": ["artifact_type", "system", "version"]
    },
    "containers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "technology", "type", "components"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "technology": { "type": "string" },
          "type": { "enum": ["application", "database", "cache", "queue", "storage"] },
          "responsibility": { "type": "string" },
          "components": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "name", "type", "responsibility"],
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "type": { "enum": ["service", "controller", "repository", "handler", "middleware"] },
                "responsibility": { "type": "string" },
                "interfaces": {
                  "type": "object",
                  "properties": {
                    "provides": { "type": "array" },
                    "consumes": { "type": "array" }
                  }
                },
                "dependencies": { "type": "array", "items": { "type": "string" } }
              }
            }
          }
        }
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["source", "target", "type"],
        "properties": {
          "source": { "type": "string" },
          "target": { "type": "string" },
          "type": { "enum": ["uses", "depends-on", "calls", "subscribes-to", "publishes-to"] },
          "protocol": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "external_dependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "type": { "enum": ["external-system", "third-party-api", "saas"] },
          "protocol": { "type": "string" }
        }
      }
    }
  }
}
```

### adr/NNNN-*.md (ADR Template)

**Type:** `architecture-decision-record`
**Command:** `/architect:adr`
**Location:** `docs/architecture/adr/NNNN-[decision-name].md`

```markdown
---
artifact_type: architecture-decision-record
command: architect:adr
adr_number: [NNNN]
title: [Decision Title]
status: proposed | accepted | deprecated | superseded
date: [YYYY-MM-DD]
deciders: [list]
supersedes: [NNNN] # optional
superseded_by: [NNNN] # optional
---

# ADR-[NNNN]: [Decision Title]

## Status
[proposed | accepted | deprecated | superseded]

## Context
[Problem statement and forces at play]

## Decision Drivers
- [Driver 1]
- [Driver 2]

## Options Considered
### Option 1: [Name]
### Option 2: [Name]
### Option 3: [Name]

## Decision
[Chosen option and rationale]

## Consequences
### Positive
### Negative
### Neutral

## Implementation Notes

## References
```

---

## Design Artifacts

### design-spec.md

**Type:** `design-specification`
**Command:** `/design`, `/design:component`
**Location:** `docs/design/[component]/design-spec.md`

```markdown
---
artifact_type: design-specification
command: design
component: [component-name]
version: 1.0.0
created_at: [ISO-8601]
status: draft
related_artifacts:
  - architecture.md
  - requirements.json
---

# Design Specification: [Component Name]

## Overview
### Purpose
### Scope
### Context

## Responsibilities
### Primary Responsibility
### Secondary Responsibilities
### Non-Responsibilities

## Public Interface
### Functions/Methods

## Internal Structure
### Data Structures
### Key Algorithms

## Dependencies
### External Dependencies
### Internal Dependencies

## Integration Points
### Upstream Components
### Downstream Components
### Events Published
### Events Subscribed

## Error Handling
### Error Types
### Error Handling Strategy
### Recovery Mechanisms

## State Management
### State Shape
### State Transitions
### State Persistence

## Performance Considerations
## Security Considerations
## Testing Strategy
## Implementation Guidance
```

### interfaces.md

**Type:** `interface-definitions`
**Command:** `/design:component`, `/design:api`
**Location:** `docs/design/[component]/interfaces.md`

```markdown
---
artifact_type: interface-definitions
command: design
component: [component-name]
version: 1.0.0
language: typescript
---

# Interface Definitions: [Component Name]

## Public Interfaces
```typescript
interface IComponentName {
  methodName(param: Type): Promise<ReturnType>
}
```

## Data Transfer Objects (DTOs)
### Request DTOs
### Response DTOs

## Error Types

## Events
### Published Events
### Consumed Events

## Configuration Interface
```

### state-machine.json

**Type:** `state-machine-definition`
**Command:** `/design:state`
**Location:** `docs/design/[component]/state-machine.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "State Machine Definition",
  "type": "object",
  "required": ["metadata", "states", "transitions", "initial_state"],
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "artifact_type": { "const": "state-machine-definition" },
        "component": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "initial_state": { "type": "string" },
    "states": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "type": { "enum": ["initial", "normal", "final", "error"] },
          "on_enter": { "type": "array", "items": { "type": "string" } },
          "on_exit": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "transitions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["from", "to", "event"],
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "event": { "type": "string" },
          "guard": { "type": "string" },
          "actions": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "payload": { "type": "object" }
        }
      }
    }
  }
}
```

---

## Specification Artifacts

### openapi.yaml (OpenAPI 3.1)

**Type:** `openapi-specification`
**Command:** `/spec:api`
**Location:** `docs/specs/api/v[N]/openapi.yaml`

```yaml
# OpenAPI 3.1 Specification
openapi: 3.1.0
info:
  title: [API Title]
  version: 1.0.0
  description: [API Description]
  contact:
    name: [Team Name]
    email: [email]
  license:
    name: [License]
  x-metadata:
    artifact_type: openapi-specification
    command: spec:api
    created_at: [ISO-8601]
    status: draft

servers:
  - url: https://api.example.com/v1
    description: Production

tags:
  - name: [resource]
    description: [Resource operations]

paths:
  /[resource]:
    get:
      tags: [[resource]]
      summary: [Operation summary]
      operationId: [operationId]
      parameters:
        - $ref: '#/components/parameters/...'
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/...'

components:
  schemas:
    [EntityName]:
      type: object
      required: [required-fields]
      properties: ...

  responses:
    [ErrorResponse]:
      description: [Error description]

  parameters:
    [ParameterName]:
      name: [name]
      in: query
      schema: ...

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### schema.json (JSON Schema 2020-12)

**Type:** `json-schema`
**Command:** `/spec:schema`
**Location:** `docs/specs/schemas/[entity].json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/[entity].json",
  "title": "[Entity Name]",
  "description": "[Entity description]",
  "type": "object",
  "x-metadata": {
    "artifact_type": "json-schema",
    "command": "spec:schema",
    "version": "1.0.0",
    "created_at": "[ISO-8601]"
  },
  "required": ["id", "field1"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier"
    },
    "field1": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255
    }
  },
  "additionalProperties": false,
  "examples": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "field1": "example value"
    }
  ]
}
```

### schema.graphql (GraphQL SDL)

**Type:** `graphql-schema`
**Command:** `/spec:graphql`
**Location:** `docs/specs/graphql/schema.graphql`

```graphql
# Generated by spec:graphql
# Version: 1.0.0
# Created: [ISO-8601]

"""
Schema description
"""
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

"""
Custom scalars
"""
scalar DateTime
scalar UUID
scalar Email

"""
Entity type
"""
type Entity {
  "Unique identifier"
  id: UUID!

  "Entity name"
  name: String!

  "Creation timestamp"
  createdAt: DateTime!
}

"""
Query operations
"""
type Query {
  "Get entity by ID"
  entity(id: UUID!): Entity

  "List entities with pagination"
  entities(
    first: Int
    after: String
  ): EntityConnection!
}

"""
Mutation operations
"""
type Mutation {
  "Create new entity"
  createEntity(input: CreateEntityInput!): Entity!
}

"""
Input types
"""
input CreateEntityInput {
  name: String!
}

"""
Connection types for pagination
"""
type EntityConnection {
  edges: [EntityEdge!]!
  pageInfo: PageInfo!
}

type EntityEdge {
  cursor: String!
  node: Entity!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

### events-spec.yaml (AsyncAPI)

**Type:** `asyncapi-specification`
**Command:** `/spec:events`
**Location:** `docs/specs/events/asyncapi.yaml`

```yaml
asyncapi: 2.6.0
info:
  title: [Service Name] Events
  version: 1.0.0
  description: Event-driven API specification
  x-metadata:
    artifact_type: asyncapi-specification
    command: spec:events

servers:
  production:
    url: kafka://kafka.example.com:9092
    protocol: kafka
    description: Production Kafka cluster

channels:
  user/created:
    description: User creation events
    subscribe:
      operationId: onUserCreated
      message:
        $ref: '#/components/messages/UserCreated'

  user/updated:
    description: User update events
    subscribe:
      operationId: onUserUpdated
      message:
        $ref: '#/components/messages/UserUpdated'

components:
  messages:
    UserCreated:
      name: UserCreated
      title: User Created Event
      contentType: application/json
      payload:
        type: object
        required:
          - eventId
          - timestamp
          - data
        properties:
          eventId:
            type: string
            format: uuid
          timestamp:
            type: string
            format: date-time
          data:
            $ref: '#/components/schemas/User'

  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
```

---

## Model Artifacts

### entities.json

**Type:** `entity-definitions`
**Command:** `/model`, `/model:erd`
**Location:** `docs/models/entities.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Entity Definitions",
  "type": "object",
  "required": ["metadata", "entities", "relationships"],
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "artifact_type": { "const": "entity-definitions" },
        "version": { "type": "string" },
        "database_type": { "enum": ["postgresql", "mysql", "sqlite", "mongodb"] },
        "orm_framework": { "enum": ["prisma", "drizzle", "typeorm", "none"] }
      }
    },
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type", "attributes"],
        "properties": {
          "name": { "type": "string" },
          "table_name": { "type": "string" },
          "type": { "enum": ["core", "lookup", "junction", "audit"] },
          "description": { "type": "string" },
          "attributes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "type"],
              "properties": {
                "name": { "type": "string" },
                "type": { "type": "string" },
                "primary_key": { "type": "boolean" },
                "foreign_key": {
                  "type": "object",
                  "properties": {
                    "references_table": { "type": "string" },
                    "references_column": { "type": "string" },
                    "on_delete": { "enum": ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"] },
                    "on_update": { "enum": ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"] }
                  }
                },
                "nullable": { "type": "boolean" },
                "unique": { "type": "boolean" },
                "default": {},
                "check_constraint": { "type": "string" }
              }
            }
          },
          "indexes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "columns": { "type": "array", "items": { "type": "string" } },
                "unique": { "type": "boolean" },
                "type": { "enum": ["btree", "hash", "gin", "gist"] }
              }
            }
          }
        }
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["from", "to", "type"],
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "type": { "enum": ["one-to-one", "one-to-many", "many-to-many"] },
          "through": { "type": "string" },
          "cardinality": { "type": "string" }
        }
      }
    }
  }
}
```

### aggregates.json (DDD)

**Type:** `aggregate-definitions`
**Command:** `/model:domain`
**Location:** `docs/models/aggregates.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Aggregate Definitions",
  "type": "object",
  "required": ["metadata", "aggregates"],
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "artifact_type": { "const": "aggregate-definitions" },
        "domain": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "aggregates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "root", "entities"],
        "properties": {
          "name": { "type": "string" },
          "root": { "type": "string" },
          "description": { "type": "string" },
          "entities": { "type": "array", "items": { "type": "string" } },
          "value_objects": { "type": "array", "items": { "type": "string" } },
          "domain_events": { "type": "array", "items": { "type": "string" } },
          "invariants": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "validation": { "type": "string" }
              }
            }
          },
          "commands": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "parameters": { "type": "object" },
                "emits": { "type": "array", "items": { "type": "string" } }
              }
            }
          }
        }
      }
    },
    "value_objects": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "properties": { "type": "object" },
          "validations": { "type": "array" }
        }
      }
    },
    "domain_events": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "payload": { "type": "object" },
          "produced_by": { "type": "string" }
        }
      }
    }
  }
}
```

---

## Artifact Versioning

### Version Format

All artifacts use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes to schema structure
- **MINOR:** New optional fields or capabilities
- **PATCH:** Bug fixes, documentation updates

### Version History

Artifacts MAY include version history:

```yaml
version: 1.2.0
version_history:
  - version: 1.2.0
    date: 2025-12-20
    changes:
      - Added security section
  - version: 1.1.0
    date: 2025-12-15
    changes:
      - Added state machine support
  - version: 1.0.0
    date: 2025-12-10
    changes:
      - Initial version
```

---

## Artifact Validation

### Validation Tools

| Artifact Type | Validation Tool |
|---------------|-----------------|
| OpenAPI | `redocly lint`, `swagger-cli validate` |
| JSON Schema | `ajv`, `jsonschema` |
| GraphQL | `graphql-schema-linter` |
| AsyncAPI | `asyncapi validate` |
| Mermaid | Mermaid live editor |

### Required Validations

1. **Syntax:** All artifacts must be syntactically valid
2. **References:** All `$ref` must resolve
3. **Examples:** All examples must validate against schemas
4. **Completeness:** Required sections must be present

---

## Cross-Artifact References

### Reference Format

Use relative paths for cross-artifact references:

```yaml
related_artifacts:
  - ../architecture/architecture.md
  - ../requirements/requirements.json
```

### Linking Pattern

```markdown
See [Architecture Document](../architecture/architecture.md) for system context.
See [Component Catalog](../architecture/components.json) for component details.
```

---

## Summary

| Category | Artifacts | Schemas Defined |
|----------|-----------|-----------------|
| Architecture | 10 | architecture.md, components.json, ADR template |
| Design | 8 | design-spec.md, interfaces.md, state-machine.json |
| Specification | 6 | openapi.yaml, schema.json, graphql, asyncapi |
| Model | 8 | entities.json, aggregates.json |
| **Total** | **32** | **12 formal schemas** |
