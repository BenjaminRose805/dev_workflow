# Task 4.4: /brainstorm Command Design

**Design Date:** 2025-12-20
**Category:** Discovery & Ideation
**Priority:** MEDIUM

---

## Executive Summary

The `/brainstorm` command is designed to generate creative ideas and explore solution spaces before committing to an approach. It encourages divergent thinking through specialized sub-commands, creative prompting techniques, and structured output artifacts. This command fills a critical gap in early-stage development workflows where multiple approaches should be considered.

**Key Capabilities:**
- Generate multiple solution alternatives with pros/cons analysis
- Explore architectural patterns and technology options
- Creative naming and API design ideation
- Facilitate design decision-making through comparison matrices
- Integration with `/architect`, `/design`, and `/implement` commands

---

## Command Specification

### YAML Frontmatter

```yaml
---
name: brainstorm
description: Generate ideas and alternatives for creative problem-solving
category: discovery-ideation
model: claude-opus-4-5-20251101
temperature: 0.9
allowed_tools:
  - Read
  - Grep
  - Glob
  - WebSearch
  - WebFetch
interaction_mode: interactive
output_artifacts:
  - ideas.md
  - alternatives.md
  - comparison-matrix.md
  - decision-record.md
sub_commands:
  - solutions
  - architecture
  - names
  - features
  - apis
  - approaches
---
```

### Model Configuration Rationale

**Model:** `claude-opus-4-5-20251101`
- Reasoning: Creative ideation benefits from the most capable model
- Opus excels at exploring solution spaces and generating diverse alternatives

**Temperature:** `0.9`
- Higher temperature encourages more creative, diverse outputs
- Reduces convergence on "obvious" solutions
- Generates unexpected but viable alternatives

**Allowed Tools:**
- `Read/Grep/Glob`: Understand existing codebase patterns
- `WebSearch/WebFetch`: Research current best practices and technologies
- NO Write/Edit tools: Brainstorming is read-only, outputs are artifacts

---

## Sub-Commands

| Sub-command | Purpose | Key Output |
|-------------|---------|------------|
| `brainstorm:solutions` | Generate multiple solution approaches | ideas.md, comparison-matrix.md |
| `brainstorm:architecture` | Explore architectural patterns | architecture-options.md |
| `brainstorm:names` | Generate creative names | naming-options.md |
| `brainstorm:features` | Ideate feature sets | feature-ideas.md |
| `brainstorm:apis` | Design API interfaces | api-designs.md |
| `brainstorm:approaches` | Compare implementation strategies | approaches.md |

---

## Creative Prompting Techniques

The brainstorm command uses specialized techniques to encourage divergent thinking:

### 1. Constraint Relaxation
```
First, let's set aside practical constraints and think freely.
Don't worry about:
- Current tech stack limitations
- Time or budget constraints
- Team expertise gaps

What would the ideal solution look like?
```

### 2. Perspective Shifting
```
Let's look at this problem from multiple perspectives:
- User perspective: What do users truly need?
- Developer perspective: What would be maintainable?
- Business perspective: What drives value?
- Security perspective: What keeps us safe?
```

### 3. Analogical Thinking
```
How have similar problems been solved in other domains?
- E-commerce → your domain
- Real-time systems → your use case
- Game development → your challenge
```

### 4. Reverse Thinking
```
What if we did the opposite?
- Instead of X, what about NOT-X?
- What would the worst solution look like? (then invert it)
```

### 5. SCAMPER Framework
```
How could we:
- Substitute: Replace components/approaches?
- Combine: Merge existing solutions?
- Adapt: Borrow from other contexts?
- Modify: Alter existing patterns?
- Put to other use: Repurpose existing code?
- Eliminate: Remove constraints/features?
- Reverse: Flip the approach?
```

---

## Command Prompt Structure

### Main Command: `/brainstorm`

When invoked without sub-command, presents interactive selection:

```markdown
# Brainstorming Session

I'll help you explore creative solutions and generate alternatives.

What would you like to brainstorm?

○ Solutions - Generate multiple approaches to solve a problem
○ Architecture - Explore architectural patterns and system designs
○ Names - Generate creative names for projects, functions, or variables
○ Features - Ideate feature sets and product capabilities
○ APIs - Design API interfaces and contract options
○ Approaches - Compare different implementation strategies

Or describe what you'd like to brainstorm in your own words.
```

---

## Sub-Command Details

### /brainstorm:solutions

Generate multiple solution approaches for a specific problem.

**Output Structure:**
```markdown
# Solution Brainstorming

## Problem Statement
{User describes the problem}

## Solutions Generated

### 1. The Conservative Approach
Minimal change, proven patterns
- Core concept: [Description]
- Pros: [List]
- Cons: [List]
- Effort: S/M/L/XL
- Risk: Low/Medium/High

### 2. The Innovative Approach
Novel techniques, cutting-edge
[Same structure]

### 3. The Pragmatic Approach
Balanced trade-offs
[Same structure]

### 4. The Simple Approach
Radical simplification
[Same structure]

### 5. The Scalable Approach
Built for growth
[Same structure]

## Comparison Matrix
| Aspect | Solution 1 | Solution 2 | Solution 3 |
|--------|------------|------------|------------|
| Complexity | Low | High | Medium |
| Performance | Good | Excellent | Good |

## Hybrid Approaches
Can we combine the best aspects of multiple solutions?

## Recommendation
Based on your context, I recommend exploring: [1-2 solutions]
```

### /brainstorm:architecture

Explore architectural patterns for system design.

**Output Structure:**
```markdown
# Architecture Brainstorming

## Current Context
[Analysis of existing architecture]

## Architectural Options

### Option 1: Monolithic
[Description, pros, cons, when to use]

### Option 2: Microservices
[Description, pros, cons, when to use]

### Option 3: Modular Monolith
[Description, pros, cons, when to use]

### Option 4: Event-Driven
[Description, pros, cons, when to use]

## Trade-off Analysis
[Comparison of options against key criteria]

## Evolutionary Path
How to evolve from current to target architecture
```

### /brainstorm:names

Generate creative names for various purposes.

**Output Structure:**
```markdown
# Naming Brainstorm

## Context
What are we naming? [Project/Function/Variable/Component]

## Naming Options

### Category 1: Descriptive Names
- [name1] - Clear, describes function
- [name2] - Technical accuracy
- [name3] - Self-documenting

### Category 2: Creative/Memorable Names
- [name1] - Unique, memorable
- [name2] - Metaphorical
- [name3] - Playful

### Category 3: Convention-Following Names
- [name1] - Follows team conventions
- [name2] - Industry standard
- [name3] - Framework conventions

## Recommendations
Top 3 with reasoning
```

---

## Output Artifacts

### ideas.md

```markdown
---
type: brainstorm-ideas
topic: [topic]
date: [ISO date]
approach: [technique used]
---

# Ideas: [Topic]

## Context
[Problem/opportunity description]

## Ideas Generated

### Idea 1: [Name]
**Description:** [What it is]
**Why it could work:** [Reasoning]
**Challenges:** [Potential issues]
**Next step:** [How to explore further]

[Repeat for each idea]

## Synthesis
[Patterns across ideas, hybrid possibilities]
```

### alternatives.md

```markdown
---
type: alternatives-analysis
topic: [topic]
options-count: [number]
---

# Alternatives Analysis: [Topic]

## Options Evaluated

| Option | Pros | Cons | Effort | Risk |
|--------|------|------|--------|------|
| [Opt 1] | [+] | [-] | M | Low |
| [Opt 2] | [+] | [-] | L | Med |

## Detailed Analysis
[Per-option breakdown]

## Decision Factors
What criteria matter most for choosing?

## Recommendation
[If requested, provide guidance]
```

---

## Integration with Other Commands

| Command | Relationship | Flow |
|---------|--------------|------|
| `/clarify` | Upstream | Clarify requirements → Brainstorm solutions |
| `/research` | Parallel | Research while brainstorming |
| `/architect` | Downstream | Brainstorm → Formalize architecture |
| `/design` | Downstream | Brainstorm → Detailed design |
| `/implement` | Downstream | Brainstorm → Implementation |

---

## Example Usage

### Example 1: Solution Brainstorming
```
User: /brainstorm:solutions for handling websocket reconnection with message queuing

Output:
Generated 6 solution approaches ranging from simple retry logic
to sophisticated distributed queue systems.

Recommended exploring: Pragmatic approach (local queue + exponential backoff)
because it balances complexity and reliability.

Artifacts:
→ docs/brainstorm/solutions-websocket-reconnection.md
→ docs/brainstorm/comparison-matrix.md
```

### Example 2: Architecture Brainstorming
```
User: /brainstorm:architecture for a multi-tenant SaaS platform

Output:
Explored 4 architectural patterns with trade-off analysis.
Recommended modular monolith with tenant isolation for initial phase.

Artifacts:
→ docs/brainstorm/architecture-multi-tenant.md
```

---

## Success Criteria

- ✅ Generates diverse, non-obvious options
- ✅ Avoids premature convergence on one solution
- ✅ Provides clear comparison framework
- ✅ Links ideas to implementation paths
- ✅ Encourages creative thinking
- ✅ Respects read-only constraint
