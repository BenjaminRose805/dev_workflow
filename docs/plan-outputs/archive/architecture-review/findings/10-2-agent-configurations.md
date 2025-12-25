# Task 10.2: Agent Configurations for Priority Commands

**Task:** Design agent configurations for key commands
**Date:** 2025-12-20
**Status:** COMPLETE

---

## Executive Summary

This document provides comprehensive agent configurations for five critical Claude Code commands. Each agent is designed with specific tool restrictions, model selections, and system prompts optimized for their specialized tasks.

**Key Design Principles:**
- **Single Responsibility:** Each agent has one clear purpose
- **Tool Restriction:** Only grant necessary tools to improve focus and security
- **Model Optimization:** Select model based on task complexity
- **Structured Output:** Generate consistent, machine-readable artifacts
- **Context Awareness:** Understand project patterns and conventions

---

## Agent Configurations Summary

### 1. Clarify Agent
- **Model:** Sonnet
- **Tools:** Read, Grep, Glob, Write, Bash
- **Purpose:** Requirements gathering through Socratic questioning
- **Output:** requirements.json, scope.md, questions.md

### 2. Architect Agent
- **Model:** Sonnet
- **Tools:** Read, Grep, Glob, Write, Bash
- **Purpose:** System design with C4 diagrams and ADRs
- **Output:** architecture.md, components.json, ADRs

### 3. Review Agent
- **Model:** Sonnet
- **Tools:** Read, Grep, Glob, Bash (read-only)
- **Purpose:** Code quality analysis for PRs and diffs
- **Output:** review-comments.md, suggestions.json

### 4. Debug Agent
- **Model:** Opus
- **Tools:** Read, Grep, Glob, Bash
- **Purpose:** Hypothesis-driven root cause analysis
- **Output:** debug-log.md, root-cause.md, fix-suggestion.md

### 5. Explore Agent
- **Model:** Haiku
- **Tools:** Read, Grep, Glob, Bash (read-only)
- **Purpose:** Fast codebase exploration and understanding
- **Output:** exploration-report.md, codebase-map.json

---

## Implementation Checklist

### Agent Files to Create

```bash
mkdir -p .claude/agents
touch .claude/agents/clarify.md
touch .claude/agents/architect.md
touch .claude/agents/review.md
touch .claude/agents/debug.md
touch .claude/agents/explore.md
```

### Output Directories

```bash
mkdir -p docs/clarify/{requirements,scope,constraints}
mkdir -p docs/architecture/adr
mkdir -p docs/reviews
mkdir -p docs/debug
mkdir -p docs/artifacts/discovery/exploration
```

---

## Summary Comparison Matrix

| Agent | Model | Primary Use | Key Strength | Tool Focus |
|-------|-------|-------------|--------------|------------|
| **Clarify** | Sonnet | Requirements gathering | Socratic questioning | Read, Write |
| **Architect** | Sonnet | System design | C4 diagrams & ADRs | Read, Write |
| **Review** | Sonnet | Code quality | Security & bug detection | Read-only |
| **Debug** | Opus | Root cause analysis | Hypothesis testing | Read, Bash |
| **Explore** | Haiku | Codebase understanding | Fast pattern recognition | Read-only |

---

**Task 10.2 Status: COMPLETE**
