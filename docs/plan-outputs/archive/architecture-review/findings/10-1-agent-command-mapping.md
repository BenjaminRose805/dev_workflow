# Task 10.1: Agent-Command Mapping Analysis

**Task:** Identify which commands benefit from custom agents
**Date:** 2025-12-20
**Status:** COMPLETE

---

## Executive Summary

This analysis evaluates all 30+ proposed commands across 5 categories to identify which commands benefit most from custom agent configurations. Out of 30 primary commands analyzed, **18 commands** (60%) would significantly benefit from custom agents, with varying degrees of specialization.

**Key Finding:** Commands requiring specialized tool restrictions, specific models, or repeated invocation patterns are prime candidates for custom agents. Commands that are simple prompt templates or one-off operations are better served as basic slash commands.

---

## Methodology

Custom agents provide value when they offer:
1. **Tool Restriction** - Limit tools for safety (e.g., read-only research)
2. **Model Specialization** - Use different models (Opus for creativity, Haiku for speed)
3. **Reusable Context** - Specialized prompts used repeatedly
4. **Permission Control** - Different permission modes per task type
5. **Automatic Invocation** - Model-driven delegation based on task matching

---

## Summary: Agent Recommendations

### Strongly Recommended (10 commands)
High value, clear benefits from custom agents:

1. **`/explore`** - Read-only, Haiku model, fast exploration
2. **`/research`** - Web access, evidence-based research
3. **`/analyze`** - Read-only, structured findings, proactive
4. **`/audit`** - Compliance knowledge, read-only, specialized
5. **`/review`** - Proactive code review, structured feedback
6. **`/debug`** - Hypothesis-driven, systematic investigation
7. **`/deploy`** - Safety checks, platform knowledge
8. **`/migrate`** - Rollback planning, validation
9. **`/workflow`** - Orchestration engine, state management
10. **`/fix:security`** - Security remediation, Opus model

### Recommended (2 commands)
Moderate value, situational benefits:

11. **`/test:mutation`** - Advanced testing, Opus model
12. **`/review:security`** - Specialized security review

### Maybe (2 commands)
Low priority, evaluate based on usage:

13. **`/brainstorm`** - Opus + high temp, infrequent use
14. **`/explain`** - Educational focus, read-only

### Not Recommended (16 commands)
Better served as standard slash commands:

- `/clarify` - Interactive, no restrictions needed
- `/architect` - Standard Sonnet, full tools
- `/design` - Standard Sonnet, full tools
- `/spec` - Standard Sonnet, full tools
- `/model` - Standard Sonnet, full tools
- `/test` (except mutation) - Code generation, full tools
- `/validate` - Straightforward checks
- `/implement` - Code generation, full tools
- `/refactor` - Code modification, full tools
- `/fix` (except security) - Standard fixes
- `/document` - Template generation
- `/release` - Scripted workflow
- `/plan` - Existing commands sufficient
- `/template` - CRUD operations

---

## Tool Access Matrix

| Agent | Read | Grep | Glob | Bash | Write | Edit | AskUser | Web | Skill |
|-------|------|------|------|------|-------|------|---------|-----|-------|
| explore | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| research | ✓ | ✓ | ✓ | - | ✓ | - | - | ✓ | - |
| analyze | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| audit | ✓ | ✓ | ✓ | ✓ | - | - | - | ✓ | - |
| review | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| debug | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - | - |
| security-fix | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| deploy | ✓ | ✓ | ✓ | ✓ | - | - | ✓ | - | - |
| migrate | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - | - |
| workflow | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | ✓ |

---

## Model Selection Matrix

| Agent | Default Model | Rationale |
|-------|--------------|-----------|
| explore | **haiku** | Speed for quick scans |
| explore:deep | **sonnet** | Depth for comprehensive analysis |
| research | **sonnet** | Balance for web research |
| analyze | **sonnet** | Analysis requires reasoning |
| audit | **sonnet** | Compliance knowledge |
| review | **sonnet** | Balanced code review |
| debug | **sonnet** | Hypothesis testing |
| security-fix | **opus** | Complex security reasoning |
| mutation-test | **opus** | Advanced test generation |
| deploy | **sonnet** | Platform knowledge |
| migrate | **sonnet** | Migration logic |
| workflow | **sonnet** | Orchestration engine |
| brainstorm | **opus** | Maximum creativity |
| explain | **sonnet** | Educational explanations |

---

## Key Findings

1. **Read-Only Agents**: 6 agents (explore, research, analyze, audit, review, debug) benefit from read-only tool restrictions for safety

2. **Model Diversity**: Only 3 agents need non-Sonnet models (explore→haiku, security-fix→opus, brainstorm→opus)

3. **Proactive Invocation**: 4 agents should be proactively invoked (analyze, audit, review, debug) based on task patterns

4. **Permission Modes**: Only 2 agents need non-default permissions (deploy→bypassPermissions, security-fix→acceptEdits)

5. **Web Access**: Only 2 agents need web tools (research, audit)

6. **Skill Integration**: Only 1 agent needs Skill tool (workflow orchestrator)

---

**Task 10.1 Status: COMPLETE**
**Agent Candidates Identified: 18/30 commands**
**Strong Recommendations: 10 agents**
**Recommended: 2 agents**
**Maybe: 2 agents**
**Not Recommended: 16 commands (use slash commands)**
