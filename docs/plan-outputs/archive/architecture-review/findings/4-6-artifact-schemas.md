# Artifact Schema Catalog - Discovery & Ideation Commands

**Date:** 2025-12-20
**Version:** 1.0.0
**Category:** Discovery & Ideation
**Commands Covered:** `/clarify`, `/explore`, `/research`, `/brainstorm`

---

## Overview

This document consolidates all artifact schemas for Discovery & Ideation commands. These schemas enable machine-parseable outputs that support workflow automation, artifact validation, and cross-command integration.

**Design Principles:**
- **Machine-readable:** JSON for structured data, Markdown with YAML frontmatter for documents
- **Version-tracked:** All artifacts include version and timestamp metadata
- **Self-describing:** Metadata includes type, context, and generation parameters
- **Interoperable:** Artifacts can be consumed by downstream commands
- **Validatable:** JSON schemas enable validation and tooling

---

## Common Metadata Schema

All artifacts include standardized metadata:

```json
{
  "metadata": {
    "artifact_type": "string",        // REQUIRED
    "command": "string",              // REQUIRED
    "version": "string",              // REQUIRED: Semantic version
    "created_at": "ISO-8601",         // REQUIRED
    "updated_at": "ISO-8601",         // OPTIONAL
    "status": "enum",                 // REQUIRED: draft | in-review | approved | deprecated
    "generated_by": "string",         // REQUIRED: Model identifier
    "context": {                      // OPTIONAL
      "project": "string",
      "feature": "string",
      "component": "string"
    },
    "related_artifacts": [],          // OPTIONAL
    "tags": ["string"],               // OPTIONAL
    "confidence": "float"             // OPTIONAL: 0.0-1.0
  }
}
```

---

## Artifact Storage Structure

```
docs/
├── clarify/
│   ├── requirements/
│   │   └── {feature-name}-{date}.json
│   ├── scope/
│   │   └── {project-name}-{date}.md
│   ├── constraints/
│   │   └── {component-name}-{date}.json
│   ├── acceptance-criteria/
│   │   └── {feature-name}-{date}.md
│   └── stakeholders/
│       └── {project-name}-{date}.md
│
├── artifacts/discovery/exploration/
│   ├── exploration-report.md
│   ├── codebase-map.json
│   ├── architecture-map.json
│   ├── patterns-report.md
│   ├── conventions.json
│   ├── dependency-graph.json
│   └── execution-paths.json
│
├── research/
│   ├── notes/
│   ├── technology/
│   ├── patterns/
│   ├── security/
│   └── performance/
│
└── brainstorm/
    ├── solutions/
    ├── architecture/
    ├── names/
    ├── features/
    └── apis/
```

---

## /clarify Artifacts

### requirements.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metadata", "functional_requirements"],
  "properties": {
    "metadata": { "type": "object" },
    "functional_requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "description", "priority"],
        "properties": {
          "id": { "type": "string", "pattern": "^FR-\\d+$" },
          "description": { "type": "string" },
          "priority": { "enum": ["must-have", "should-have", "nice-to-have"] },
          "acceptance_criteria": { "type": "array" }
        }
      }
    },
    "non_functional_requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "pattern": "^NFR-\\d+$" },
          "category": { "enum": ["performance", "security", "scalability", "reliability", "usability", "maintainability", "compliance"] },
          "description": { "type": "string" },
          "metric": { "type": "string" },
          "target_value": { "type": "string" }
        }
      }
    },
    "constraints": { "type": "array" },
    "assumptions": { "type": "array" },
    "open_questions": { "type": "array" }
  }
}
```

### constraints.json

```json
{
  "type": "object",
  "required": ["metadata", "constraints"],
  "properties": {
    "constraints": {
      "type": "object",
      "properties": {
        "technical": { "type": "array" },
        "business": { "type": "array" },
        "resource": { "type": "array" },
        "regulatory": { "type": "array" }
      }
    }
  }
}
```

### scope.md Template

```markdown
---
artifact_type: scope-definition
command: /clarify:scope
version: 1.0.0
created_at: [ISO-8601]
status: draft
---

# Scope Definition: [Name]

## In Scope
### Must Have (P0)
### Should Have (P1)
### Could Have (P2)

## Out of Scope

## Boundaries

| Boundary Type | Inside | Outside |
|---------------|--------|---------|

## Scope Creep Risks

## Success Criteria
```

### acceptance-criteria.md Template

```markdown
---
artifact_type: acceptance-criteria
command: /clarify:acceptance
version: 1.0.0
---

# Acceptance Criteria: [Feature]

## Functional Acceptance Criteria

### AC-001: [Name]
**Given:** [Context]
**When:** [Action]
**Then:** [Expected outcome]

## Non-Functional Acceptance Criteria

### Performance
### Security
### Usability

## Definition of Done
```

---

## /explore Artifacts

### codebase-map.json

```json
{
  "type": "object",
  "required": ["metadata", "overview", "structure"],
  "properties": {
    "metadata": {
      "properties": {
        "artifact_type": { "const": "codebase-map" },
        "target": { "type": "string" },
        "depth": { "enum": ["quick", "standard", "deep"] },
        "confidence": { "type": "number" },
        "coverage": { "type": "number" }
      }
    },
    "overview": {
      "properties": {
        "total_files": { "type": "integer" },
        "total_lines": { "type": "integer" },
        "languages": { "type": "object" },
        "primary_language": { "type": "string" },
        "framework": { "type": "string" }
      }
    },
    "structure": {
      "properties": {
        "entry_points": { "type": "array" },
        "directories": { "type": "array" }
      }
    },
    "components": {
      "type": "array",
      "items": {
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "path": { "type": "string" },
          "type": { "enum": ["service", "component", "utility", "store", "controller", "model"] },
          "complexity": { "enum": ["low", "medium", "high"] }
        }
      }
    },
    "patterns": { "type": "object" },
    "dependencies": { "type": "object" },
    "technical_debt": { "type": "array" }
  }
}
```

### architecture-map.json

```json
{
  "type": "object",
  "required": ["metadata", "components", "relationships"],
  "properties": {
    "architecture_style": {
      "enum": ["monolithic", "microservices", "layered", "hexagonal", "event-driven", "serverless"]
    },
    "layers": { "type": "array" },
    "components": {
      "type": "array",
      "items": {
        "properties": {
          "id": { "type": "string" },
          "type": { "enum": ["service", "module", "library", "database", "external-api"] },
          "layer": { "type": "string" },
          "responsibilities": { "type": "array" }
        }
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "type": { "enum": ["depends-on", "calls", "publishes", "subscribes", "extends"] },
          "async": { "type": "boolean" }
        }
      }
    }
  }
}
```

### dependency-graph.json

```json
{
  "type": "object",
  "properties": {
    "nodes": {
      "type": "array",
      "items": {
        "properties": {
          "id": { "type": "string" },
          "type": { "enum": ["internal-module", "external-package", "system"] },
          "version": { "type": "string" }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "type": { "enum": ["import", "require", "dynamic-import"] }
        }
      }
    },
    "circular_dependencies": { "type": "array" },
    "impact_analysis": { "type": "object" }
  }
}
```

### exploration-report.md Template

```markdown
---
artifact_type: exploration-report
command: /explore
version: 1.0.0
exploration_depth: standard
target_path: /path
confidence: 0.85
coverage: 0.60
---

# Codebase Exploration Report

## Executive Summary

## Architecture Overview
### Technology Stack
### Directory Structure
### Entry Points

## Key Components

## Code Patterns & Conventions

## Data Flow

## Dependencies Analysis

## Technical Debt & Opportunities

## Recommendations
### For New Developers
### For Refactoring

## Confidence & Completeness
```

---

## /research Artifacts

### research-notes.md Template

```markdown
---
artifact_type: research-notes
command: /research
topic: [topic]
scope: standard
sources_count: 12
---

# Research Notes: [Topic]

## Summary

## Key Findings
### Finding 1
### Finding 2

## Sources
### Primary Sources
### Secondary Sources
### Community Sources

## Case Studies

## Data & Benchmarks

## Synthesis & Analysis

## Open Questions

## Next Steps
```

### options-analysis.md Template

```markdown
---
artifact_type: options-analysis
command: /research:technology
options_evaluated: [list]
recommendation: [choice]
confidence: high
---

# Options Analysis: [Topic]

## Context
### Problem Statement
### Decision Criteria

## Options Evaluated

### Option 1: [Name]
**Pros:**
**Cons:**
**Key Metrics:**

## Comparison Matrix

| Feature | Option 1 | Option 2 | Option 3 |
|---------|----------|----------|----------|

## Score Card

## Recommendation

## Implementation Guidance
```

---

## /brainstorm Artifacts

### ideas.md Template

```markdown
---
artifact_type: brainstorm-ideas
command: /brainstorm
topic: [topic]
approach: [technique]
ideas_count: 8
temperature: 0.9
---

# Brainstorming Ideas: [Topic]

## Context
### Problem/Opportunity
### Constraints Considered
### Constraints Relaxed

## Ideas Generated

### Idea 1: [Name]
**Category:** [Conservative/Innovative/Pragmatic/Simple/Scalable]
**Description:**
**Why It Could Work:**
**Challenges:**
**Effort Estimate:** S/M/L/XL
**Risk Level:** Low/Medium/High

## Idea Clustering

## Hybrid Possibilities

## Synthesis

## Evaluation
### Most Promising Ideas
### Dark Horses
### Quick Wins

## Next Steps
```

### alternatives.md Template

```markdown
---
artifact_type: alternatives-analysis
command: /brainstorm:solutions
options_count: 6
---

# Alternatives Analysis: [Topic]

## Problem Statement

## Alternative Solutions

### Alternative 1: The Conservative Approach
### Alternative 2: The Innovative Approach
### Alternative 3: The Pragmatic Approach
### Alternative 4: The Simple Approach
### Alternative 5: The Scalable Approach

## Comparison Matrix

## Decision Factors

## Recommendation

## Hybrid Approaches

## Implementation Guidance
```

---

## Artifact Relationships

### Feed-Forward Relationships

| Upstream Artifact | Downstream Command | Purpose |
|-------------------|-------------------|---------|
| `requirements.json` | `/architect`, `/design` | Requirements input |
| `scope.md` | `/plan:create` | Scope definition |
| `constraints.json` | `/architect`, `/design` | Design constraints |
| `acceptance-criteria.md` | `/test`, `/validate` | Test generation |
| `codebase-map.json` | `/refactor`, `/optimize` | Refactoring input |
| `exploration-report.md` | `/document` | Documentation base |
| `research-notes.md` | `/architect`, `/design` | Decision evidence |
| `options-analysis.md` | `/architect`, `/implement` | Technology choice |
| `ideas.md` | `/architect`, `/design` | Solution candidates |
| `alternatives.md` | `/design`, `/implement` | Approach selection |

---

## Versioning Conventions

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes to artifact structure
- **MINOR:** Backward-compatible additions
- **PATCH:** Clarifications and fixes

---

## Complete Artifact Type Registry

| Artifact Type | Extension | Command | Priority |
|---------------|-----------|---------|----------|
| `requirements` | .json | /clarify:requirements | P0 |
| `constraints` | .json | /clarify:constraints | P1 |
| `scope-definition` | .md | /clarify:scope | P0 |
| `acceptance-criteria` | .md | /clarify:acceptance | P1 |
| `stakeholders` | .md | /clarify:stakeholders | P2 |
| `exploration-report` | .md | /explore | P0 |
| `codebase-map` | .json | /explore | P0 |
| `architecture-map` | .json | /explore:architecture | P1 |
| `patterns-report` | .md | /explore:patterns | P1 |
| `conventions` | .json | /explore:patterns | P1 |
| `dependency-graph` | .json | /explore:dependencies | P1 |
| `execution-paths` | .json | /explore:flow | P1 |
| `research-notes` | .md | /research | P0 |
| `options-analysis` | .md | /research | P0 |
| `technology-research` | .md | /research:technology | P1 |
| `pattern-research` | .md | /research:patterns | P1 |
| `security-research` | .md | /research:security | P1 |
| `performance-research` | .md | /research:performance | P1 |
| `brainstorm-ideas` | .md | /brainstorm | P0 |
| `alternatives-analysis` | .md | /brainstorm | P0 |
| `architecture-brainstorm` | .md | /brainstorm:architecture | P1 |
| `naming-brainstorm` | .md | /brainstorm:names | P2 |

---

**Total Artifact Types Defined:** 22
**JSON Schemas:** 8
**Markdown Templates:** 14
