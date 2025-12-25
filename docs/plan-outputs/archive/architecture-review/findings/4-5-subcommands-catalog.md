# Discovery & Ideation Sub-Commands Catalog

**Date:** 2025-12-20
**Phase:** 4 - Discovery & Ideation Commands
**Purpose:** Consolidated catalog of all sub-commands across /clarify, /explore, /research, and /brainstorm

---

## Overview

The Discovery & Ideation phase includes **4 parent commands** with a total of **21 sub-commands**:

| Parent Command | Sub-Commands Count | Primary Use Case |
|----------------|-------------------|------------------|
| `/clarify` | 5 | Interactive requirements gathering |
| `/explore` | 6 | Codebase exploration and mapping |
| `/research` | 4 | Technology and pattern research |
| `/brainstorm` | 6 | Creative ideation and alternatives |
| **TOTAL** | **21** | |

---

## Sub-Command Naming Patterns

### Identified Patterns

1. **Domain-Based Naming** - Sub-commands named after the domain they operate on
   - `clarify:requirements`, `clarify:constraints`, `clarify:scope`
   - `explore:architecture`, `explore:patterns`, `explore:dependencies`

2. **Depth/Scope Modifiers** - Sub-commands that modify the depth of analysis
   - `explore:quick`, `explore:deep`

3. **Topic-Specific Specialization** - Sub-commands for specific specialized topics
   - `research:security`, `research:performance`
   - `brainstorm:names`, `brainstorm:apis`

### Naming Conventions

**Pattern:** `<parent>:<domain|modifier|topic>`

**Rules:**
- Use lowercase with hyphens for multi-word sub-commands
- Sub-command names should be nouns or noun phrases
- Keep names concise (1-2 words maximum)
- Use descriptive names that clearly indicate purpose

---

## Complete Sub-Command Registry

### /clarify Sub-Commands (5)

| Sub-Command | Priority | Purpose | Output Artifact |
|-------------|----------|---------|-----------------|
| `clarify:requirements` | P0 | Gather functional & non-functional requirements | `requirements.json` |
| `clarify:scope` | P0 | Define scope boundaries and out-of-scope items | `scope.md` |
| `clarify:constraints` | P1 | Identify technical, business, and resource constraints | `constraints.json` |
| `clarify:acceptance` | P1 | Define acceptance criteria and success metrics | `acceptance-criteria.md` |
| `clarify:stakeholders` | P2 | Identify stakeholders and their concerns | `stakeholders.md` |

### /explore Sub-Commands (6)

| Sub-Command | Depth | Purpose | Output Artifacts |
|-------------|-------|---------|------------------|
| `explore:architecture` | Deep | System architecture and component relationships | `architecture-map.json`, `component-graph.md` |
| `explore:patterns` | Standard | Code patterns, conventions, and idioms | `patterns-report.md`, `conventions.json` |
| `explore:dependencies` | Deep | Dependency analysis and impact mapping | `dependency-graph.json`, `impact-analysis.md` |
| `explore:flow` | Deep | Data/control flow through the system | `flow-diagram.md`, `execution-paths.json` |
| `explore:quick` | Shallow | Fast surface-level exploration | `quick-summary.md` |
| `explore:deep` | Deep | Comprehensive deep-dive analysis | `comprehensive-report.md`, `full-map.json` |

### /research Sub-Commands (4)

| Sub-Command | Purpose | Output Artifacts |
|-------------|---------|------------------|
| `research:technology` | Compare technologies, libraries, frameworks | `technology-research.md`, `comparison-matrix.md` |
| `research:patterns` | Research architectural patterns | `pattern-research.md`, `implementation-examples.md` |
| `research:security` | Security implications and best practices | `security-research.md`, `vulnerability-assessment.md` |
| `research:performance` | Performance optimization techniques | `performance-research.md`, `benchmarks.md` |

### /brainstorm Sub-Commands (6)

| Sub-Command | Purpose | Output Artifacts |
|-------------|---------|------------------|
| `brainstorm:solutions` | Generate multiple solution approaches | `ideas.md`, `comparison-matrix.md` |
| `brainstorm:architecture` | Explore architectural patterns | `architecture-options.md` |
| `brainstorm:names` | Generate creative names | `naming-options.md` |
| `brainstorm:features` | Ideate feature sets | `feature-ideas.md` |
| `brainstorm:apis` | Design API interfaces | `api-designs.md` |
| `brainstorm:approaches` | Compare implementation strategies | `approaches.md` |

---

## YAML Frontmatter Specifications

### /clarify Sub-Commands

```yaml
# clarify:requirements
---
name: clarify:requirements
description: Gather detailed functional and non-functional requirements
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [feature-or-component]
---

# clarify:scope
---
name: clarify:scope
description: Define project scope boundaries
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [project-or-feature]
---

# clarify:constraints
---
name: clarify:constraints
description: Identify technical, business, and resource constraints
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [constraint-type]
---

# clarify:acceptance
---
name: clarify:acceptance
description: Define testable acceptance criteria and success metrics
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [feature-or-requirement]
---

# clarify:stakeholders
---
name: clarify:stakeholders
description: Identify stakeholders and their concerns
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [project-name]
---
```

### /explore Sub-Commands

```yaml
# explore:architecture
---
name: explore:architecture
description: Map system architecture and component relationships
model: haiku
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [target-path]
depth: deep
---

# explore:patterns
---
name: explore:patterns
description: Identify code patterns, conventions, and idioms
model: haiku
allowed-tools: Read, Grep, Glob, Bash
depth: standard
---

# explore:dependencies
---
name: explore:dependencies
description: Analyze dependencies and impact mapping
model: haiku
allowed-tools: Read, Grep, Glob, Bash
depth: deep
---

# explore:flow
---
name: explore:flow
description: Trace data and control flow through the system
model: haiku
allowed-tools: Read, Grep, Glob, Bash
depth: deep
---

# explore:quick
---
name: explore:quick
description: Fast surface-level exploration
model: haiku
allowed-tools: Read, Grep, Glob, Bash
depth: shallow
---

# explore:deep
---
name: explore:deep
description: Comprehensive deep-dive analysis
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
depth: deep
---
```

### /research Sub-Commands

```yaml
# research:technology
---
name: research:technology
description: Compare technologies, libraries, or frameworks for adoption
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <technology-area> [--options lib1,lib2,lib3]
---

# research:patterns
---
name: research:patterns
description: Research architectural patterns and design approaches
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <pattern-name> [--context project-type]
---

# research:security
---
name: research:security
description: Research security implications, vulnerabilities, and best practices
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <topic> [--context technology]
---

# research:performance
---
name: research:performance
description: Research performance optimization techniques and benchmarks
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <area> [--context technology]
---
```

### /brainstorm Sub-Commands

```yaml
# brainstorm:solutions
---
name: brainstorm:solutions
description: Generate multiple solution approaches for a specific problem
model: claude-opus-4-5-20251101
temperature: 0.9
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
argument-hint: [problem-description]
---

# brainstorm:architecture
---
name: brainstorm:architecture
description: Explore architectural patterns for system design
model: claude-opus-4-5-20251101
temperature: 0.9
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# brainstorm:names
---
name: brainstorm:names
description: Generate creative names for various purposes
model: claude-opus-4-5-20251101
temperature: 0.9
allowed-tools: Read, Grep, Glob
---

# brainstorm:features
---
name: brainstorm:features
description: Ideate feature sets and product capabilities
model: claude-opus-4-5-20251101
temperature: 0.9
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# brainstorm:apis
---
name: brainstorm:apis
description: Design API interfaces and contract options
model: claude-opus-4-5-20251101
temperature: 0.9
allowed-tools: Read, Grep, Glob
---

# brainstorm:approaches
---
name: brainstorm:approaches
description: Compare implementation strategies
model: claude-opus-4-5-20251101
temperature: 0.9
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---
```

---

## Tool Overlap Analysis

| Tool | /clarify | /explore | /research | /brainstorm |
|------|----------|----------|-----------|-------------|
| Read | ✅ | ✅ | ✅ | ✅ |
| Grep | ✅ | ✅ | ✅ | ✅ |
| Glob | ✅ | ✅ | ✅ | ✅ |
| Write | ✅ | ❌ | ✅ | ❌ |
| Bash | ❌ | ✅ | ✅ | ❌ |
| WebSearch | ❌ | ❌ | ✅ | ✅ |
| WebFetch | ❌ | ❌ | ✅ | ✅ |
| AskUserQuestion | ✅ | ❌ | ❌ | ❌ |

---

## Model Selection Patterns

| Command | Model | Rationale |
|---------|-------|-----------|
| `/clarify` | inherit (Sonnet 4.5) | Balance of capability and speed for interactive sessions |
| `/explore` | haiku (fast) / sonnet (deep) | Fast exploration with upgrade for complexity |
| `/research` | sonnet-4-5 | Needs web search, analysis, synthesis |
| `/brainstorm` | opus-4-5 @ temp=0.9 | Creative ideation benefits from most capable model |

---

## Sub-Command Dependencies

### Intra-Command Dependencies

#### Within /clarify
```
clarify:requirements (foundational)
    ↓
clarify:scope (depends on understanding requirements)
    ↓
clarify:constraints (informed by scope)
    ↓
clarify:acceptance (derived from requirements)
```

#### Within /explore
```
explore:quick (fast overview)
    ↓
explore (standard exploration)
    ↓
explore:deep (comprehensive analysis)
```

### Inter-Command Dependencies

```
Phase 1: Requirements Gathering
/clarify → /clarify:requirements, /clarify:scope

Phase 2: Discovery
/explore → /explore:architecture
/research → /research:technology, /research:patterns

Phase 3: Ideation
/brainstorm → /brainstorm:solutions, /brainstorm:architecture

Phase 4: Design (downstream commands)
/architect, /design
```

---

## Summary Statistics

- **Total Sub-Commands:** 21
- **Interactive Sub-Commands:** 5 (all /clarify)
- **Web-Enabled Sub-Commands:** 10 (/research + /brainstorm)
- **Read-Only Sub-Commands:** 12 (/explore + /brainstorm)
- **Depth-Aware Sub-Commands:** 3 (explore:quick, explore, explore:deep)
