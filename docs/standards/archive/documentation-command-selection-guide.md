# Documentation Command Selection Guide

This guide helps users select the appropriate documentation/explanation command for their needs.

## Command Overview

| Command | Purpose | Output Type | Audience |
|---------|---------|-------------|----------|
| `/document` | Generate reference docs | Persistent files (README, API docs) | External consumers |
| `/explain` | Educational understanding | Learning artifacts | Team members |
| `/explore` | Codebase discovery | Ephemeral insights | Developers |
| `plan:explain` | Task clarification | Conversational | Plan implementers |

## Quick Decision Matrix

### "I want to..."

| Goal | Command | Rationale |
|------|---------|-----------|
| Create API reference | `/document:api` | Reference documentation |
| Generate README | `/document:developer` | Persistent project documentation |
| Create user guide | `/document:user` | Tutorial documentation |
| Generate changelog | `/document:changelog` | Release documentation |
| Add JSDoc comments | `/document:inline` | Code-level documentation |
| Understand how code works | `/explain:code` | Educational explanation |
| Learn architecture | `/explain:architecture` | System understanding |
| Understand patterns | `/explain:pattern` | Pattern education |
| Understand a decision | `/explain:decision` | Decision rationale |
| Trace execution flow | `/explain:flow` | Flow understanding |
| Understand a PR | `/explain:diff` | Change explanation |
| Find files quickly | `/explore` | Codebase navigation |
| Understand plan task | `plan:explain` | Task clarification |

## Framework Alignment

### Diátaxis Framework (/document)

The `/document` command follows the Diátaxis documentation framework:

| Category | Focus | Sub-Command |
|----------|-------|-------------|
| **Tutorials** | Learning-oriented | `/document:user` |
| **How-to Guides** | Problem-oriented | `/document:user` |
| **Reference** | Information-oriented | `/document:api`, `/document:developer` |
| **Explanation** | Understanding-oriented | _Use /explain instead_ |

### Explanation Structure (/explain)

The `/explain` command follows a consistent educational structure:

```
1. Why    → Purpose and motivation
2. What   → Responsibilities and boundaries
3. How    → Implementation details
4. Context → History and dependencies
5. Gotchas → Pitfalls and best practices
```

## Key Differentiators

### Persistence

| Command | Persistence | Location |
|---------|-------------|----------|
| `/document` | Permanent | docs/, README.md, CHANGELOG.md |
| `/explain` | Semi-permanent | docs/explanations/ |
| `/explore` | Ephemeral | Conversation only |
| `plan:explain` | Ephemeral | Conversation only |

### Audience

| Command | Primary Audience | Secondary Audience |
|---------|------------------|-------------------|
| `/document` | External users, new developers | Everyone |
| `/explain` | Team members learning codebase | Onboarding devs |
| `/explore` | Active developers | - |
| `plan:explain` | Plan implementers | - |

### Content Focus

| Command | Content Focus |
|---------|---------------|
| `/document` | How to use, API contracts, installation |
| `/explain` | How it works, why it was built, patterns |
| `/explore` | Where is it, what exists, relationships |
| `plan:explain` | What to do, how to implement |

## Workflow Examples

### New Developer Onboarding

```
1. /explore           → Navigate codebase structure
2. /explain:architecture → Understand system design
3. /explain:pattern   → Learn common patterns
4. /explain:flow      → Understand key workflows
5. /document:developer → Reference development docs
```

### API Development

```
1. /design:api        → Design API contracts
2. /implement         → Implement endpoints
3. /document:api      → Generate API reference
4. /explain:api       → Explain API patterns (if complex)
```

### Code Review Learning

```
1. /explain:diff      → Understand PR changes
2. /explain:code      → Deep dive into changed files
3. /explain:decision  → Understand why changes were made
```

### Documentation Refresh

```
1. /explore           → Survey current docs state
2. /document:developer → Update README
3. /document:api      → Refresh API docs
4. /document:changelog → Generate changelog
```

### Investigating Unfamiliar Code

```
1. /explore           → Find relevant files
2. /explain:code      → Understand specific component
3. /explain:flow      → Trace execution path
4. /explain:pattern   → Identify design patterns
```

## Command Handoffs

### Explore → Explain
When `/explore` reveals interesting code, use `/explain` to understand it:
- `/explore` finds authentication module → `/explain:code src/auth/`

### Explain → Document
When explanations are valuable enough to persist:
- `/explain:architecture` → `/document:architecture` (promote to reference)
- `/explain:code` → `/document:inline` (add docstrings)

### Document → Implement
Documentation guides implementation:
- `/document:api` (API spec) → `/implement` (endpoint code)

## Summary Table

| Aspect | /document | /explain | /explore | plan:explain |
|--------|-----------|----------|----------|--------------|
| Purpose | Reference | Education | Discovery | Task clarity |
| Output | Files | Artifacts | Insights | Answers |
| Audience | External | Internal | Developer | Implementer |
| Persistence | Permanent | Semi-perm | Ephemeral | Ephemeral |
| Framework | Diátaxis | Why→What→How | - | - |
