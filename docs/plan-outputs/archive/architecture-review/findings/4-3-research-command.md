# /research Command Design

**Task:** 4.3 Design `/research` command (technology/approach research)
**Category:** Discovery & Ideation
**Priority:** HIGH
**Date:** 2025-12-20

---

## Overview

The `/research` command is a Discovery & Ideation tool for systematically researching technologies, patterns, architectures, and best practices. It helps developers make informed decisions by gathering information, comparing options, and evaluating tradeoffs before implementation.

---

## Command Purpose

**Primary use cases:**
1. **Technology evaluation** - Comparing libraries, frameworks, tools before adoption
2. **Pattern research** - Investigating architectural patterns and design approaches
3. **Best practices** - Gathering industry standards and recommendations
4. **Tradeoff analysis** - Understanding pros/cons of different options
5. **Security review** - Researching security implications of approaches
6. **Performance optimization** - Investigating performance patterns and techniques

**When to use `/research`:**
- Before making architectural decisions
- When evaluating new technologies or libraries
- When choosing between multiple implementation approaches
- Before refactoring significant portions of code
- When investigating security or performance concerns

**When NOT to use `/research`:**
- For analyzing existing code (use `/analyze` instead)
- For executing implementations (use `/plan:implement` instead)
- For quick lookups (use direct questions instead)

---

## Command Structure

### Base Command: /research

```yaml
---
name: research
description: Research technologies, patterns, and best practices - comparing options and gathering information for decision-making
category: discovery-ideation
model: claude-sonnet-4-5
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Grep
  - Glob
  - Bash
  - Write
output-artifacts:
  - research-notes.md
  - options-analysis.md
---
```

### Sub-commands

| Sub-command | Purpose | Output Artifacts |
|-------------|---------|------------------|
| `/research:technology` | Compare technologies, libraries, frameworks | technology-research.md, comparison-matrix.md |
| `/research:patterns` | Research architectural patterns | pattern-research.md, implementation-examples.md |
| `/research:security` | Security implications and best practices | security-research.md, vulnerability-assessment.md |
| `/research:performance` | Performance optimization techniques | performance-research.md, benchmarks.md |

---

## Sub-Command Specifications

### /research:technology

```yaml
---
name: research:technology
description: Compare technologies, libraries, or frameworks for adoption
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <technology-area> [--options lib1,lib2,lib3]
---
```

**Usage Examples:**
```
/research:technology state-management --options zustand,jotai,redux
/research:technology testing-frameworks
/research:technology bundlers --context nextjs-app
```

**Output Structure:**
```markdown
# Technology Research: [Area]

## Options Evaluated
- [Option 1]
- [Option 2]

## Comparison Matrix

| Feature | Option 1 | Option 2 |
|---------|----------|----------|
| Bundle Size | 3KB | 12KB |
| TypeScript Support | Excellent | Good |

## Detailed Analysis

### [Option 1]
**Pros:** [List]
**Cons:** [List]
**Best for:** [Use cases]

## Recommendation

**Top choice: [Option]**
**Reasoning:** [Justification]
```

### /research:patterns

```yaml
---
name: research:patterns
description: Research architectural patterns and design approaches
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <pattern-name> [--context project-type]
---
```

**Usage Examples:**
```
/research:patterns event-sourcing --context e-commerce
/research:patterns micro-frontends
/research:patterns repository-pattern --context typescript
```

### /research:security

```yaml
---
name: research:security
description: Research security implications, vulnerabilities, and best practices
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <topic> [--context technology]
---
```

**Usage Examples:**
```
/research:security jwt-authentication --context nextjs
/research:security dependency-vulnerabilities
/research:security api-rate-limiting
```

### /research:performance

```yaml
---
name: research:performance
description: Research performance optimization techniques and benchmarks
model: claude-sonnet-4-5
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash, Write
argument-hint: <area> [--context technology]
---
```

**Usage Examples:**
```
/research:performance bundle-optimization --context nextjs
/research:performance database-queries
/research:performance react-rendering
```

---

## Workflow

### 1. Gather Research Parameters

Use AskUserQuestion to gather:
- Topic
- Scope (quick/standard/deep)
- Context (project details)
- Options to compare (if applicable)
- Focus areas (performance, security, DX, etc.)

### 2. Analyze Project Context

Scan codebase for relevant context:
- Check package.json for existing dependencies
- Search for related code patterns
- Identify current architecture
- Note team conventions

### 3. Conduct Web Research

**Use WebSearch for:**
- Latest documentation (use year 2025 in queries)
- Comparison articles
- Benchmark data
- Community discussions
- Real-world case studies

**Use WebFetch for:**
- Reading official documentation
- Extracting key points from articles
- Gathering code examples

### 4. Structure Research Notes

Create `research-notes.md` with:
- Summary of findings
- Key findings with evidence
- Information sources (docs, articles, discussions)
- Case studies
- Benchmarks and data
- Open questions
- Next steps

### 5. Generate Options Analysis

If comparing multiple options:
- Comparison matrix with objective metrics
- Detailed analysis per option
- Context-specific assessment
- Clear recommendation with justification
- Implementation guidance

---

## Quality Standards

**Research must include:**
- ✅ At least 5 authoritative sources
- ✅ Publication dates noted (prefer 2024-2025)
- ✅ Quantitative data where available
- ✅ Real-world examples/case studies
- ✅ Balanced perspective (pros and cons)
- ✅ Context-specific assessment
- ✅ Clear recommendation with reasoning
- ✅ Actionable next steps

**Avoid:**
- ❌ Outdated information (pre-2023 for fast-moving tech)
- ❌ Unsubstantiated claims
- ❌ Bias toward specific vendors
- ❌ Missing tradeoffs
- ❌ Recommendations without justification

---

## Output Artifact Schemas

### research-notes.md

```markdown
---
type: research-notes
topic: [topic]
date: [ISO date]
researcher: Claude Sonnet 4.5
scope: [quick|standard|deep]
sources-count: [number]
---

# Research Notes: [Topic]

## Summary
[2-3 paragraph overview]

## Key Findings
1. **[Finding 1]** - Evidence: [Source]
2. **[Finding 2]** - Evidence: [Source]

## Sources
- [Source 1](URL)
- [Source 2](URL)

## Open Questions
- [Question 1]
- [Question 2]

## Next Steps
1. [Action 1]
2. [Action 2]
```

### options-analysis.md

```markdown
---
type: options-analysis
topic: [topic]
options-evaluated: [list]
recommendation: [choice]
confidence: [high|medium|low]
---

# Options Analysis: [Topic]

## Comparison Matrix
[Table comparing all options]

## Detailed Analysis
[Per-option breakdown]

## Recommendation
[Top choice with reasoning]
```

---

## Integration with Other Commands

| Command | Relationship | Flow |
|---------|--------------|------|
| `/clarify` | Upstream | Clarify requirements → Research solutions |
| `/explore` | Parallel | Explore existing code while researching |
| `/architect` | Downstream | Research → Architecture design |
| `/plan:create` | Downstream | Research → Implementation plan |

---

## Example Workflow

```
User: /research:technology state-management --options zustand,jotai,redux

Flow:
1. WebSearch: "zustand vs jotai vs redux 2025"
2. WebFetch: Official docs for each
3. WebSearch: Production experiences
4. Grep: Check if any already used in codebase
5. Create comparison matrix
6. Generate recommendation
7. Write research-notes.md and options-analysis.md

Output:
- Detailed comparison of bundle sizes, APIs, DX
- Performance benchmarks
- Migration complexity assessment
- Recommendation: Zustand for this project
```

---

## Success Criteria

- ✅ Decision-maker has clear recommendation
- ✅ All tradeoffs are understood
- ✅ Implementation path is clear
- ✅ Risks are identified
- ✅ Sources are authoritative and recent
- ✅ Recommendation is context-appropriate
