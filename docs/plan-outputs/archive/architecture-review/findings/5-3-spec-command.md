# /spec Command Design Specification

**Task:** 5.3 Design `/spec` command (formal specifications)
**Category:** Design & Architecture
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/spec` command creates formal, machine-readable specifications for APIs, data schemas, protocols, and system interfaces. It focuses on contract-first development by generating validatable specification artifacts (OpenAPI, JSON Schema, AsyncAPI, GraphQL SDL) that serve as the source of truth for implementation, testing, and documentation.

**Key Differentiator:** This is formal specification writing - machine-readable, validatable, contract-first. It contrasts with `/design` (human-readable design docs) and `/document:api` (documentation generated from code).

---

## Command Structure

### Primary Command: `/spec`

**Base invocation** (without sub-command):
```
/spec [optional-target]
```

Analyzes context and routes to appropriate specification type based on:
- Existing design docs (design-spec.md, interfaces.md)
- Project type (REST API, GraphQL, event-driven)
- Technology stack (detected from package.json, imports)

### Sub-Commands

| Sub-command | Purpose | Output Artifact | Priority |
|-------------|---------|-----------------|----------|
| `spec:api` | OpenAPI/REST API specifications | `api-spec.yaml` | P0 |
| `spec:schema` | JSON Schema definitions | `schema.json` | P0 |
| `spec:graphql` | GraphQL SDL schemas | `schema.graphql` | P1 |
| `spec:events` | AsyncAPI/event specifications | `events-spec.yaml` | P1 |
| `spec:data` | Data model specifications | `data-model.json` | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/spec.md`

```yaml
---
name: spec
description: Create formal, machine-readable specifications (OpenAPI, JSON Schema, AsyncAPI). Use for contract-first API design and interface definitions.
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [api-name|schema-name]
output-artifacts:
  - api-spec.yaml
  - schema.json
  - events-spec.yaml
---
```

### Sub-Commands

#### `.claude/commands/spec/api.md`

```yaml
---
name: spec:api
description: Generate OpenAPI 3.1 specifications for REST APIs
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [api-name]
output-artifacts:
  - api-spec.yaml
  - openapi.json
---
```

#### `.claude/commands/spec/schema.md`

```yaml
---
name: spec:schema
description: Generate JSON Schema (draft 2020-12) definitions for data structures
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [schema-name]
output-artifacts:
  - schema.json
  - types.json
---
```

#### `.claude/commands/spec/graphql.md`

```yaml
---
name: spec:graphql
description: Generate GraphQL SDL schemas with types, queries, mutations
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [schema-name]
output-artifacts:
  - schema.graphql
  - resolvers-spec.json
---
```

#### `.claude/commands/spec/events.md`

```yaml
---
name: spec:events
description: Generate AsyncAPI specifications for event-driven architectures
model: sonnet
allowed-tools: Read, Grep, Glob, Write, WebSearch
argument-hint: [service-name]
output-artifacts:
  - events-spec.yaml
  - channels.yaml
---
```

---

## Output Location

All specifications go to `docs/specs/` with versioning:

```
docs/specs/
├── api/
│   ├── v1/
│   │   ├── openapi.yaml
│   │   ├── users-api.yaml
│   │   └── auth-api.yaml
│   └── v2/
│       └── openapi.yaml
├── schemas/
│   ├── user.json
│   ├── product.json
│   └── order.json
├── graphql/
│   ├── schema.graphql
│   └── types/
│       ├── user.graphql
│       └── product.graphql
├── events/
│   ├── asyncapi.yaml
│   └── channels/
│       ├── user-events.yaml
│       └── order-events.yaml
└── data/
    ├── erd.json
    └── models/
        ├── user-model.json
        └── product-model.json
```

---

## Specification Standards

### OpenAPI 3.1 Best Practices

**Structure:**
- Use OpenAPI 3.1 (aligned with JSON Schema 2020-12)
- Recommended filename: `openapi.yaml` or `api-spec.yaml`
- Include all required fields: openapi, info, paths

**Organization:**
- Use tags to group related operations
- Define reusable components (schemas, responses, parameters, security)
- Use `$ref` to avoid duplication
- Keep paths organized (by resource or feature)

**Example Template:**

```yaml
openapi: 3.1.0
info:
  title: Example API
  version: 1.0.0
  description: Comprehensive API specification
  contact:
    name: API Team
    email: api@example.com
  license:
    name: MIT

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging
  - url: http://localhost:3000/v1
    description: Development

tags:
  - name: users
    description: User management operations
  - name: auth
    description: Authentication operations

paths:
  /users:
    get:
      tags: [users]
      summary: List users
      description: Retrieve a paginated list of users
      operationId: listUsers
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '429':
          $ref: '#/components/responses/RateLimitError'
      security:
        - bearerAuth: []

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - username
      properties:
        id:
          type: string
          format: uuid
          description: Unique user identifier
        email:
          type: string
          format: email
          description: User email address
        username:
          type: string
          pattern: '^[a-zA-Z0-9_-]{3,20}$'
          description: Unique username
        createdAt:
          type: string
          format: date-time

    Error:
      type: object
      required:
        - type
        - title
        - status
      properties:
        type:
          type: string
          format: uri
          description: URI reference for error type
        title:
          type: string
          description: Short, human-readable summary
        status:
          type: integer
          description: HTTP status code
        detail:
          type: string
          description: Human-readable explanation

  responses:
    UnauthorizedError:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    RateLimitError:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per time window
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Requests remaining in current window

  parameters:
    PageParam:
      name: page
      in: query
      description: Page number for pagination
      schema:
        type: integer
        minimum: 1
        default: 1

    LimitParam:
      name: limit
      in: query
      description: Items per page
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT-based authentication
```

### JSON Schema (Draft 2020-12) Best Practices

**Declaration:**
- Always include `$schema: https://json-schema.org/draft/2020-12/schema`
- Define unique `$id` for schema URI
- Use `$defs` for internal reusable definitions

**Template:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/user.json",
  "title": "User",
  "description": "User entity schema",
  "type": "object",
  "required": ["id", "email", "username"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique user identifier"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "User email address"
    },
    "username": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]{3,20}$",
      "minLength": 3,
      "maxLength": 20,
      "description": "Unique username"
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["admin", "user", "moderator"]
      },
      "minItems": 1,
      "uniqueItems": true,
      "description": "User roles"
    }
  },
  "additionalProperties": false,
  "examples": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "john_doe",
      "roles": ["user"]
    }
  ]
}
```

---

## Validation Integration

### Post-Generation Validation

After generating specs, validate using standard tools:

**OpenAPI:**
```bash
# Using Swagger CLI
swagger-cli validate docs/specs/api/v1/openapi.yaml

# Using Redocly
redocly lint docs/specs/api/v1/openapi.yaml
```

**JSON Schema:**
```bash
# Using AJV CLI
ajv validate -s docs/specs/schemas/user.json -d data/sample-user.json
```

**GraphQL:**
```bash
# Using GraphQL CLI
graphql-schema-linter docs/specs/graphql/schema.graphql
```

---

## Workflow Integration

### Input Artifacts

The `/spec` command can consume:

| Artifact | From Command | Usage |
|----------|-------------|-------|
| `requirements.json` | `/clarify:requirements` | Extract entities and operations |
| `design-spec.md` | `/design` | Parse interface definitions |
| `architecture.md` | `/architect` | Understand system boundaries |
| `research-notes.md` | `/research:technology` | Technology constraints |
| `data-model.json` | `/spec:data` | Data structure definitions |

### Output Usage

Specifications can be consumed by:

| Artifact | By Command | Purpose |
|----------|-----------|---------|
| `openapi.yaml` | `/implement` | Implementation guidance |
| `schema.json` | `/test` | Generate test data |
| `openapi.yaml` | `/document:api` | Generate documentation |
| `schema.json` | `/validate` | Runtime validation |
| `events-spec.yaml` | `/implement` | Event handler implementation |

### Workflow Sequences

**Contract-First API Development:**
```
/clarify:requirements -> /design -> /spec:api -> /implement -> /test
```

**Data Modeling Flow:**
```
/architect -> /spec:data -> /spec:schema -> /implement -> /validate
```

**Event-Driven Architecture:**
```
/design -> /spec:events -> /implement -> /test -> /deploy
```

---

## Integration with Other Commands

| Command | Relationship | Flow |
|---------|--------------|------|
| `/clarify` | Upstream | Clarify requirements -> Generate specs |
| `/design` | Upstream | Design interfaces -> Formalize specs |
| `/architect` | Upstream | Architecture -> API contracts |
| `/implement` | Downstream | Specs -> Implementation |
| `/test` | Downstream | Specs -> Contract tests |
| `/document:api` | Downstream | Specs -> Documentation |
| `/validate` | Downstream | Specs -> Runtime validation |

---

## Example Usage

### Example 1: REST API Specification

```
User: /spec:api user-management

Claude: I'll create an OpenAPI specification for the user management API.

First, let me check for existing design documents...
[Searches for design-spec.md, requirements.json]

Found:
- docs/design/user-api-design.md
- docs/requirements/user-requirements.json

Analyzing design and requirements...

Generated: docs/specs/api/v1/user-api.yaml

Key features:
- 12 endpoints defined (CRUD + custom operations)
- Authentication: JWT Bearer tokens
- Rate limiting: 100 req/min per user
- Pagination: Cursor-based
- Error handling: RFC 7807 format
- Examples included for all operations
- Validation: All schemas defined

Next steps:
1. Validate: `redocly lint docs/specs/api/v1/user-api.yaml`
2. Generate docs: `/document:api`
3. Generate server: `openapi-generator generate ...`
4. Implement: `/implement` with spec as reference
```

### Example 2: JSON Schema Generation

```
User: /spec:schema product

Claude: I'll create a JSON Schema for the Product entity.

Searching for existing data models...

Found:
- Product type in src/types/product.ts
- Database schema in prisma/schema.prisma

Generating comprehensive JSON Schema (draft 2020-12)...

Generated: docs/specs/schemas/product.json

Schema includes:
- Required fields: id, name, price, sku
- Validation: price (decimal, min 0), sku (pattern)
- Optional fields: description, images, metadata
- Nested schemas: Category, Inventory
- Format validations: uuid, uri, date-time
- Examples provided

Validation:
- Schema syntax valid
- All $refs resolved

Next steps:
1. Validate data: `ajv validate -s product.json -d sample-product.json`
2. Generate types: Use with json-schema-to-typescript
3. Runtime validation: Integrate with Ajv in application
```

---

## Success Criteria

- [ ] Specification is syntactically valid (passes linting)
- [ ] All references are resolved
- [ ] Examples are provided and valid
- [ ] Security is defined (for APIs)
- [ ] Error handling is comprehensive (for APIs)
- [ ] Versioning strategy is clear
- [ ] Specification aligns with latest standard (OpenAPI 3.1, JSON Schema 2020-12)
- [ ] Reusable components are used to avoid duplication
- [ ] Documentation is clear and complete
- [ ] Specification can drive implementation and testing

---

## Quality Checklist

### OpenAPI Specifications
- [ ] OpenAPI version is 3.1.0 or higher
- [ ] All paths have operationId
- [ ] Security schemes are defined and applied
- [ ] Common responses are in components
- [ ] Request/response examples are valid
- [ ] Tags organize related operations
- [ ] Error responses cover common cases (4xx, 5xx)
- [ ] Parameters use $ref where applicable
- [ ] Servers are defined (dev, staging, prod)
- [ ] Version number follows semver

### JSON Schemas
- [ ] $schema declares draft/2020-12
- [ ] $id provides unique schema URI
- [ ] Required fields are explicit
- [ ] Types use appropriate formats
- [ ] Constraints are defined (min/max, pattern, enum)
- [ ] additionalProperties behavior is explicit
- [ ] Examples are provided
- [ ] Descriptions explain field purposes
- [ ] Nested schemas use $ref
- [ ] Schema can be validated with standard tools

---

## References

- **OpenAPI Specification 3.1:** https://spec.openapis.org/oas/v3.1.0.html
- **JSON Schema 2020-12:** https://json-schema.org/draft/2020-12/json-schema-core.html
- **AsyncAPI:** https://www.asyncapi.com/docs/reference/specification/latest
- **GraphQL SDL:** https://graphql.org/learn/schema/
