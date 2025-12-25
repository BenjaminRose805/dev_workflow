# /document Command Design Specification

**Task:** 7.4 Design `/document` command (documentation generation)
**Category:** Documentation & Communication
**Priority:** HIGH
**Date:** 2025-12-20

---

## Executive Summary

The `/document` command provides comprehensive documentation generation capabilities across multiple documentation types and audiences. It transforms code, design artifacts, and architectural decisions into clear, well-structured documentation.

**Key Differentiator:** `/document` is a **documentation synthesizer** that consumes outputs from other commands (architecture, design, implementation) and produces audience-specific documentation. Unlike `/explain` which clarifies code concepts interactively, `/document` creates comprehensive, publishable documentation artifacts.

**Core Philosophy:**
- **Multi-audience:** Different docs for different stakeholders
- **Artifact-aware:** Leverages existing design docs, specs, and code
- **Format-flexible:** Supports Markdown, OpenAPI, JSDoc, MDX
- **Living documentation:** Updates existing docs rather than replacing
- **Standards-compliant:** Follows Diátaxis documentation framework

---

## Sub-Command Specifications

| Sub-command | Purpose | Output | Priority |
|-------------|---------|--------|----------|
| `document:api` | API reference documentation | `api-reference.md`, JSDoc | P0 |
| `document:user` | End-user guides and tutorials | `user-guide.md`, tutorials | P0 |
| `document:developer` | Developer onboarding and contribution | `README.md`, `CONTRIBUTING.md` | P0 |
| `document:architecture` | Architecture docs and ADRs | `ARCHITECTURE.md` | P1 |
| `document:changelog` | Changelog from commit history | `CHANGELOG.md` | P1 |
| `document:inline` | Inline code comments/docstrings | Updated source files | P1 |
| `document:diagrams` | Visual documentation (Mermaid) | Diagrams in docs | P2 |
| `document:runbook` | Operational runbooks | `docs/runbooks/*.md` | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/document.md`

```yaml
---
name: document
description: Generate comprehensive documentation for APIs, users, developers, and architecture. Synthesizes code, designs, and artifacts into audience-specific docs.
model: sonnet
allowed-tools: Read, Write, Grep, Glob, Bash, AskUserQuestion
argument-hint: [scope-or-type]
category: documentation
output_artifacts:
  - README.md
  - API documentation
  - User guides
  - Architecture docs
---
```

---

## Output Location

```
docs/
├── README.md                    # Project overview
├── ARCHITECTURE.md              # High-level architecture
├── CHANGELOG.md                 # Version history
├── CONTRIBUTING.md              # Contribution guidelines
├── api/
│   ├── reference.md            # API reference
│   └── examples.md             # API usage examples
├── guides/
│   ├── getting-started.md      # Quick start guide
│   ├── user-guide.md           # Comprehensive user guide
│   └── tutorials/              # Step-by-step tutorials
├── development/
│   ├── setup.md                # Development environment
│   └── testing.md              # Testing guide
├── architecture/
│   ├── overview.md             # Architecture overview
│   └── decisions/              # ADRs
└── runbooks/
    └── deployment.md           # Operational runbooks
```

---

## Artifact Schemas

### README.md Template

```markdown
---
artifact_type: readme-documentation
command: document:developer
---

# [Project Name]

> [One-line description]

## Overview
[2-3 paragraph project description]

## Quick Start
```bash
npm install [package-name]
```

## Features
- **[Feature 1]**: Description
- **[Feature 2]**: Description

## Documentation
- [Getting Started](docs/guides/getting-started.md)
- [API Reference](docs/api/reference.md)
- [Architecture](ARCHITECTURE.md)

## Development
See [Development Guide](docs/development/setup.md)

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md)

## License
[License] - see [LICENSE](LICENSE)
```

### api-reference.md Template

```markdown
---
artifact_type: api-reference-documentation
command: document:api
---

# API Reference

## Overview
**Base URL:** `https://api.example.com/v1`
**Authentication:** Bearer token (JWT)

## Endpoints

### Resource: Users

#### List Users
```http
GET /users
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |

**Response:** `200 OK`
```json
{
  "data": [...],
  "pagination": { ... }
}
```

## Error Handling
All errors follow RFC 7807 format.
```

### CHANGELOG.md Template (Keep-a-Changelog)

```markdown
# Changelog

All notable changes documented per [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- [New features]

### Changed
- [Changes to existing functionality]

### Fixed
- [Bug fixes]

## [1.2.0] - 2025-12-20

### Added
- New `/document` command
```

---

## Workflow Integration

### Upstream Commands (Inputs)

| Artifact | Source Command | Purpose |
|----------|---------------|---------|
| `architecture.md` | `/architect` | Architecture docs source |
| `design-spec.md` | `/design` | Component design docs |
| `openapi.yaml` | `/spec:api` | API specification |
| Source code | `/implement` | Code for inline docs |
| Git history | Repository | Changelog generation |

### Downstream Commands (Outputs)

| Artifact | Consumed By | Purpose |
|----------|-------------|---------|
| `README.md` | GitHub, developers | Project overview |
| `api-reference.md` | `/test`, developers | API testing reference |
| `user-guide.md` | End users | User assistance |
| `CHANGELOG.md` | `/release` | Version tracking |

### Documentation Workflow Chains

**API-First Documentation:**
```
/design:api -> /spec:api -> /document:api -> /test
```

**Feature Documentation:**
```
/clarify -> /design -> /implement -> /document:user
                                  -> /document:developer
```

---

## Documentation Frameworks

### Diátaxis Framework

| Type | Purpose | Command Mapping |
|------|---------|-----------------|
| **Tutorials** | Learning-oriented | `document:user` |
| **How-to Guides** | Problem-oriented | `document:user` |
| **Reference** | Information-oriented | `document:api` |
| **Explanation** | Understanding-oriented | `document:architecture` |

---

## Example Usage Scenarios

### Example 1: Generate Project Documentation

```
User: /document

Claude: Generating comprehensive documentation...

Analyzing codebase:
- Node.js project with Express API
- Existing architecture.md
- Git history: 234 commits

Generated:
✓ README.md (project overview)
✓ docs/api/reference.md (from Express routes)
✓ docs/development/setup.md
✓ ARCHITECTURE.md
✓ CHANGELOG.md (from conventional commits)
```

### Example 2: Generate API Documentation

```
User: /document:api payment-api

Claude: Generating API reference from OpenAPI spec...

Found: docs/specs/api/v1/openapi.yaml

Created:
→ docs/api/payment-reference.md
  - Authentication section
  - 12 endpoints documented
  - Request/response examples
  - Error codes

→ docs/api/payment-examples.md
  - Common workflows
  - Integration examples
```

### Example 3: Generate Changelog

```
User: /document:changelog v2.0.0

Claude: Analyzing git history since v1.5.0...

47 commits found:
- 12 feat: (features)
- 23 fix: (bug fixes)
- 1 BREAKING CHANGE

## [2.0.0] - 2025-12-20

### ⚠️ BREAKING CHANGES
- Authentication now requires API key v2 format

### Added
- Payment refund functionality (#234)
- Webhook signature verification (#245)

### Fixed
- Race condition in payment processing (#243)
```

---

## Differentiation from Related Commands

### `/document` vs `/explain`
| Aspect | `/document` | `/explain` |
|--------|-------------|------------|
| **Purpose** | Create publishable docs | Clarify code interactively |
| **Output** | Markdown files | Conversational explanation |
| **Audience** | Multiple (users, devs) | Current developer |
| **Persistence** | Committed to repo | Conversational only |

### `/document` vs `/architect`
| Aspect | `/document` | `/architect` |
|--------|-------------|------------|
| **Phase** | After design/implementation | Before implementation |
| **Purpose** | Explain existing architecture | Create architecture |
| **Output** | ARCHITECTURE.md (explanatory) | architecture.md (prescriptive) |

---

## Quality Gates

### Completeness
- ✅ All public APIs documented
- ✅ Installation instructions present
- ✅ Quick start guide available
- ✅ Examples for common use cases

### Accuracy
- ✅ Code examples tested and working
- ✅ Version numbers current
- ✅ Links not broken

### Quality
- ✅ Clear writing for target audience
- ✅ Consistent terminology
- ✅ Proper markdown formatting
- ✅ Metadata frontmatter present

---

**Phase 7 Task 7.4 Status: COMPLETE**
