# /clarify Command Design Specification

**Task:** 4.1 Design `/clarify` command (interactive requirements gathering)
**Category:** Discovery & Ideation
**Priority:** CRITICAL
**Date:** 2025-12-20

---

## Executive Summary

The `/clarify` command provides interactive discovery and requirements gathering through Socratic questioning. It helps developers refine vague ideas into structured requirements, scope definitions, and constraints documentation. This command bridges the gap between initial concept and formal specification/design phases.

**Key Differentiator:** Unlike other commands that analyze existing code, `/clarify` operates early in the workflow when requirements are unclear or incomplete.

---

## Command Structure

### Primary Command: `/clarify`

**Base invocation** (without sub-command):
```
/clarify [optional-description]
```

Starts interactive requirements gathering session with intelligent sub-command routing based on context.

### Sub-Commands

| Sub-command | Purpose | Output Artifact | Priority |
|-------------|---------|-----------------|----------|
| `clarify:requirements` | Gather functional & non-functional requirements | `requirements.json` | P0 |
| `clarify:scope` | Define scope boundaries and out-of-scope items | `scope.md` | P0 |
| `clarify:constraints` | Identify technical, business, and resource constraints | `constraints.json` | P1 |
| `clarify:acceptance` | Define acceptance criteria and success metrics | `acceptance-criteria.md` | P1 |
| `clarify:stakeholders` | Identify stakeholders and their concerns | `stakeholders.md` | P2 |

---

## YAML Frontmatter Specification

### Primary Command: `.claude/commands/clarify.md`

```yaml
---
name: clarify
description: Interactive requirements gathering through Socratic questioning. Use PROACTIVELY when user describes vague idea or incomplete requirements.
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [optional-description]
---
```

### Sub-Commands

#### `.claude/commands/clarify/requirements.md`

```yaml
---
name: clarify:requirements
description: Gather detailed functional and non-functional requirements through structured questioning
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [feature-or-component]
---
```

#### `.claude/commands/clarify/scope.md`

```yaml
---
name: clarify:scope
description: Define project scope boundaries, in-scope and out-of-scope items
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [project-or-feature]
---
```

#### `.claude/commands/clarify/constraints.md`

```yaml
---
name: clarify:constraints
description: Identify and document technical, business, and resource constraints
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [constraint-type]
---
```

#### `.claude/commands/clarify/acceptance.md`

```yaml
---
name: clarify:acceptance
description: Define testable acceptance criteria and success metrics
model: inherit
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion
argument-hint: [feature-or-requirement]
---
```

---

## Command Prompt Structure

### Primary Command Prompt

```markdown
# Clarify Requirements

You are an expert requirements analyst helping to refine vague ideas into structured specifications.

## Context Detection

First, analyze the user's input and current project state:

1. **Check for existing artifacts:**
   - Look for existing `docs/requirements/`, `docs/specs/`, or similar
   - Check if project has README, architecture docs
   - Search for related features or components

2. **Determine clarification needs:**
   - Is this a new project, feature, or bug fix?
   - What artifacts are missing?
   - Which sub-command would be most valuable?

3. **Intelligent routing:**
   - If user mentions "what should this do": suggest `clarify:requirements`
   - If user asks "is X in scope": suggest `clarify:scope`
   - If user mentions limitations: suggest `clarify:constraints`
   - If user asks "how to know it's done": suggest `clarify:acceptance`

## Interactive Discovery Process

### Phase 1: Understanding Context (2-3 questions)

Ask broad questions to understand the domain:
- What problem are you trying to solve?
- Who will use this?
- What currently exists (if anything)?

**Questioning Technique:**
- Open-ended questions first
- Follow up with specifics
- Use examples to clarify ambiguity
- Paraphrase to confirm understanding

### Phase 2: Deep Dive (4-6 questions)

Based on the sub-command context, ask targeted questions:

**For requirements:**
- What must the system do? (functional)
- How should it perform? (non-functional)
- What edge cases exist?
- What data is involved?

**For scope:**
- What is explicitly included?
- What is explicitly excluded?
- What are the boundaries?
- What might creep in later?

**For constraints:**
- What technical limitations exist? (platform, language, frameworks)
- What business constraints apply? (budget, timeline, compliance)
- What resource constraints exist? (team size, expertise, infrastructure)

**For acceptance:**
- How will we know it's done?
- What metrics define success?
- What are the quality gates?
- What tests must pass?

### Phase 3: Synthesis (output generation)

After gathering information, generate structured output.
```

## Output Location

All artifacts go to `docs/clarify/` with timestamp:
```
docs/clarify/
├── requirements/
│   └── feature-name-2025-12-20.json
├── scope/
│   └── project-name-2025-12-20.md
├── constraints/
│   └── component-name-2025-12-20.json
├── acceptance-criteria/
│   └── feature-name-2025-12-20.md
└── questions.md  # Log of Q&A sessions
```

---

## Artifact Schemas

### requirements.json Schema

```json
{
  "metadata": {
    "feature": "feature-name",
    "created_at": "2025-12-20T00:00:00Z",
    "version": "1.0.0",
    "status": "draft"
  },
  "functional_requirements": [
    {
      "id": "FR-001",
      "description": "The system shall...",
      "priority": "must-have",
      "acceptance_criteria": ["AC-001", "AC-002"]
    }
  ],
  "non_functional_requirements": [
    {
      "id": "NFR-001",
      "category": "performance",
      "description": "Response time under 200ms",
      "metric": "p95 latency < 200ms"
    }
  ],
  "constraints": [
    {
      "type": "technical",
      "description": "Must use existing PostgreSQL database"
    }
  ],
  "assumptions": [
    "User has authenticated before reaching this feature"
  ],
  "open_questions": [
    "What is the expected data volume?"
  ]
}
```

### scope.md Template

```markdown
# Scope Definition: [Project/Feature Name]

**Date:** [Date]
**Version:** 1.0

## In Scope

### Must Have
- [Item 1]
- [Item 2]

### Should Have
- [Item 1]
- [Item 2]

## Out of Scope

- [Explicitly excluded item 1]
- [Explicitly excluded item 2]

## Boundaries

| Boundary | Inside | Outside |
|----------|--------|---------|
| Users | Authenticated users | Anonymous visitors |
| Data | User preferences | Financial data |
| Features | View/Edit | Delete/Archive |

## Scope Creep Risks

- [Potential scope creep 1]
- [Potential scope creep 2]
```

---

## Workflow Integration

After completion, suggest next steps:
- `requirements.json` exists → suggest `/design` or `/architect`
- `scope.md` exists → suggest `/plan:create` with scoping template
- `constraints.json` exists → suggest `/analyze:architecture` for validation
- `acceptance-criteria.md` exists → suggest `/test` or `/validate`

---

## Example Usage

### Example 1: General Clarification
```
User: /clarify I want to add authentication

Claude: Let me help you clarify the authentication requirements.

First, some context questions:
1. What type of authentication are you considering? (username/password, OAuth, SSO, etc.)
2. Who needs to authenticate? (end users, admins, API clients)
3. Is there an existing user system we're integrating with?

[Interactive Q&A follows...]

Artifacts created:
→ docs/clarify/requirements/authentication-2025-12-20.json
→ docs/clarify/scope/authentication-2025-12-20.md
```

### Example 2: Scope Clarification
```
User: /clarify:scope user dashboard feature

Claude: Let me help define the scope boundaries for the user dashboard.

Questions:
1. What data should the dashboard display?
2. Should users be able to customize their dashboard?
3. What's explicitly NOT part of this feature?

[Scope definition follows...]
```

---

## Integration with Other Commands

| Command | Relationship | Flow |
|---------|--------------|------|
| `/explore` | Upstream | Explore codebase → Clarify new feature |
| `/research` | Parallel | Research options while clarifying |
| `/architect` | Downstream | Clarify → Architecture design |
| `/design` | Downstream | Clarify → Detailed design |
| `/plan:create` | Downstream | Clarify scope → Create plan |

---

## Success Criteria

- ✅ User has clear, structured requirements
- ✅ Scope boundaries are documented
- ✅ Constraints are identified
- ✅ Next steps are clear
- ✅ Artifacts are machine-readable where applicable
