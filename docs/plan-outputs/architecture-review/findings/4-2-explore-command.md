# Task 4.2: `/explore` Command Design

**Command Category:** Discovery & Ideation
**Priority:** CRITICAL
**Status:** Design Complete
**Date:** 2025-12-20

---

## Executive Summary

The `/explore` command is a specialized codebase exploration tool that helps developers understand unfamiliar code, navigate complex architectures, and build mental models of how systems work. It leverages Claude Code's built-in Explore agent while providing structured workflows, artifact generation, and progressive depth exploration.

**Key Features:**
- Multi-level exploration (quick, standard, deep)
- Specialized sub-commands for different exploration types
- Structured artifact generation (exploration-report.md, codebase-map.json)
- Integration with existing Explore agent
- Read-only operation (safe for any codebase)

---

## Command Specification

### YAML Frontmatter

```yaml
---
name: explore
description: Explore and understand codebases through automated analysis and mapping. Use when navigating unfamiliar code, onboarding to projects, or planning refactoring work.
category: discovery
model: haiku  # Fast exploration with Haiku, upgrade to Sonnet for complex analysis
allowed-tools: Read, Grep, Glob, Bash
permission_mode: default
---
```

### Command Variants

| Command | Purpose | Depth | Output Artifacts |
|---------|---------|-------|------------------|
| `/explore` | General exploration (auto-detect scope) | Standard | exploration-report.md, codebase-map.json |
| `/explore:architecture` | System architecture and component relationships | Deep | architecture-map.json, component-graph.md |
| `/explore:patterns` | Code patterns, conventions, and idioms | Standard | patterns-report.md, conventions.json |
| `/explore:dependencies` | Dependency analysis and impact mapping | Deep | dependency-graph.json, impact-analysis.md |
| `/explore:flow` | Data/control flow through the system | Deep | flow-diagram.md, execution-paths.json |
| `/explore:quick` | Fast surface-level exploration | Shallow | quick-summary.md |
| `/explore:deep` | Comprehensive deep-dive analysis | Deep | comprehensive-report.md, full-map.json |

---

## Command Prompt Structure

### Main `/explore` Command

```markdown
# Explore Codebase

You are a codebase exploration specialist helping developers understand unfamiliar code.

## Your Task

Explore the specified codebase area and generate structured findings.

### Target Scope
{{target_path}}  # Default: current directory or user-specified path

### Exploration Depth
{{depth}}  # quick | standard | deep (default: standard)

### Focus Areas (Optional)
{{focus_areas}}  # e.g., "authentication, data flow, error handling"

## Instructions

### 1. Initial Assessment (5 seconds)

Run quick scans to understand the scope:
- Count files by type
- Identify primary languages
- Find configuration files
- Detect framework indicators

### 2. Structure Analysis

**Directory Layout:**
- Map the high-level directory structure
- Identify organizational patterns (by feature, by layer, hybrid)
- Note special directories (tests, docs, config, scripts)

**Entry Points:**
- Identify main entry files
- Find server/application bootstrapping
- Locate routing/handler registration

### 3. Code Exploration (Depth-Dependent)

**Quick Depth (30 seconds max):**
- Read 5-10 key files
- Scan file headers and exports
- Identify major components

**Standard Depth (2 minutes max):**
- Read 15-25 representative files
- Analyze module interfaces
- Map major data flows
- Identify architectural patterns

**Deep Depth (5 minutes max):**
- Read 30-50+ files
- Trace execution paths
- Analyze dependencies
- Document design decisions
- Identify technical debt

### 4. Generate Artifacts

Create two artifacts in `docs/artifacts/discovery/exploration/`:
- exploration-report.md
- codebase-map.json
```

---

## Output Artifact Schemas

### exploration-report.md

```markdown
# Codebase Exploration Report

**Target:** {{target_path}}
**Date:** {{date}}
**Depth:** {{depth}}

---

## Summary

[2-3 paragraph overview of what this codebase does and how it's organized]

---

## Architecture Overview

### Technology Stack
- **Languages:** TypeScript, JavaScript
- **Frameworks:** React, Express
- **Key Libraries:** Zod, Zustand, Socket.IO

### Directory Structure
```
src/
├── components/     # React UI components
├── lib/           # Core business logic
├── stores/        # State management
└── types/         # TypeScript type definitions
```

---

## Key Components

### 1. [Component Name]
- **Location:** `src/path/to/component`
- **Purpose:** What it does
- **Dependencies:** What it depends on
- **Complexity:** Low | Medium | High

---

## Code Patterns & Conventions

### Naming Conventions
- Files: kebab-case
- Components: PascalCase
- Functions: camelCase

### Error Handling
- Custom error classes
- Try/catch at boundaries

---

## Recommendations

### For New Developers
1. Start by reading key entry files
2. Understand the Store architecture
3. Review component structure

### For Refactoring
1. Consider extracting shared utilities
2. Standardize error handling
3. Add integration tests

---

## Confidence & Completeness

**Confidence:** 85%
**Coverage:** ~60% of codebase analyzed
```

### codebase-map.json

```json
{
  "metadata": {
    "target": "src/",
    "generated_at": "2025-12-20T19:30:00Z",
    "depth": "standard",
    "version": "1.0.0"
  },
  "overview": {
    "total_files": 127,
    "total_lines": 15430,
    "languages": {
      "TypeScript": 89,
      "JavaScript": 23
    },
    "primary_language": "TypeScript",
    "framework": "React + Express"
  },
  "structure": {
    "entry_points": ["src/index.ts"],
    "directories": [
      {
        "path": "src/components",
        "purpose": "React UI components",
        "file_count": 34
      }
    ]
  },
  "components": [
    {
      "id": "orchestrator",
      "name": "Orchestrator",
      "path": "src/lib/orchestrator.ts",
      "type": "service",
      "complexity": "high"
    }
  ],
  "patterns": {
    "naming": {
      "files": "kebab-case",
      "components": "PascalCase"
    },
    "state_management": "Zustand"
  }
}
```

---

## Integration with Existing Explore Agent

Claude Code has a built-in **Explore agent** with these characteristics:
- **Model:** Haiku (fast)
- **Tools:** Glob, Grep, Read, Bash (read-only)
- **Purpose:** Fast codebase searching and analysis

The `/explore` command **wraps and extends** this agent:

```
User: /explore src/lib
  ↓
Main Thread: Parse arguments, determine scope
  ↓
Explore Agent: Scan files, gather data
  ↓
Main Thread: Structure findings, generate artifacts
  ↓
Output: exploration-report.md + codebase-map.json
```

---

## Sub-Command Details

### `/explore:architecture`

Maps system architecture and component relationships.

**Specialized Analysis:**
- Component identification and classification
- Dependency graph construction
- Layer/tier identification
- Communication patterns

**Artifacts:**
- `architecture-map.json`
- `component-graph.md` (with Mermaid diagrams)

### `/explore:patterns`

Identifies code patterns, conventions, and idioms.

**Analysis:**
- Naming conventions
- Design pattern usage
- Anti-patterns and code smells
- Framework-specific conventions

**Artifacts:**
- `patterns-report.md`
- `conventions.json`

### `/explore:dependencies`

Analyzes dependencies and impact mapping.

**Analysis:**
- External package dependencies
- Internal module dependencies
- Circular dependency detection
- Impact analysis (what breaks if X changes)

**Artifacts:**
- `dependency-graph.json`
- `impact-analysis.md`

### `/explore:flow`

Traces data and control flow through the system.

**Analysis:**
- Request/response flows
- Event propagation
- State transitions
- Data transformation pipelines

**Artifacts:**
- `flow-diagram.md` (Mermaid sequence diagrams)
- `execution-paths.json`

---

## Example Usage

### General Exploration
```
User: /explore src/lib

Output:
Exploring src/lib...

Exploration Complete!
Analyzed: src/lib/ (18 files, 2,340 lines)
Primary Language: TypeScript

Artifacts:
→ docs/artifacts/discovery/exploration/exploration-report.md
→ docs/artifacts/discovery/exploration/codebase-map.json
```

### Quick Check
```
User: /explore:quick

Output:
Quick Exploration (28 seconds)

Project Type: Full-stack TypeScript application
Framework: React + Express
Files: 127 total

Recommendation: Run /explore for detailed analysis
```

---

## Integration with Other Commands

| Command | Relationship | Flow |
|---------|--------------|------|
| `/clarify` | Upstream | Clarify → Explore relevant code |
| `/analyze` | Downstream | Explore → Analyze specific areas |
| `/refactor` | Downstream | Explore → Plan refactoring |
| `/document` | Downstream | Explore → Generate docs |

---

## Success Criteria

- ✅ Generates valid artifacts within time limits
- ✅ Provides actionable insights
- ✅ Builds accurate mental models
- ✅ Identifies areas for deeper investigation
- ✅ Confidence score > 70% for standard depth
