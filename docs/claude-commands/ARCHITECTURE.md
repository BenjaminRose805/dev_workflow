# Claude Commands Enhancement - System Architecture

## Overview

The Claude Commands Enhancement is an advanced automation system built on top of Claude Code CLI. It provides a comprehensive framework for managing AI-powered development workflows through scripts, templates, and caching mechanisms.

## System Components

### 1. Script Layer (`scripts/`)

The script layer provides executable commands for various development tasks.

#### Core Scripts

**Entry Point:**
- `index.js` - Unified router for all script commands

**Scanning & Analysis:**
- `scan-plans.js` - Scans plan files and generates JSON summaries
- `scan-prompts.js` - Scans prompt templates and extracts metadata
- `scan-results.js` - Analyzes execution results from .claude/
- `parse-plan-structure.js` - Deep parsing of plan file structure

**AI Agent Operations:**
- `research-for-implement.js` - Pre-implementation research using AI agents
- `verify-with-agent.js` - Verification of task completion using AI agents
- `parallel-research-pipeline.js` - Parallel task research with dependency analysis

**Utility Scripts:**
- `check-file-status.js` - File existence, size, mtime checking with optional test running
- `substitute-variables.js` - Template variable substitution
- `cache-clear.js` - Cache management and cleanup
- `cache-stats.js` - Cache statistics and health monitoring

### 2. Template System (`.claude/templates/`)

Templates define AI agent behavior and output formats.

#### Agent Templates

- **Research Agent** (`agents/research-agent.md`) - Read-only codebase exploration
- **Verify Agent** (`agents/verify-agent.md`) - Task completion verification
- **Analysis Agent** (`agents/analysis-agent.md`) - Architectural decision analysis

### 3. Library Layer (`scripts/lib/`)

Reusable modules supporting script functionality:

- `agent-launcher.js` - Spawns Claude CLI processes
- `agent-pool.js` - Priority queue with concurrent agent management
- `agent-cache.js` - Result caching with TTL support
- `file-utils.js` - File operations and caching
- `markdown-parser.js` - Plan file parsing

### 4. Cache System (`.claude/cache/`)

Three-tier caching for performance optimization:

- **scripts/** - Script execution results (5-minute TTL)
- **research/** - AI agent research results (1-hour TTL)
- **speculative/** - Speculative execution results (30-minute TTL)

## Data Flow

```
User Request
    ↓
parse-plan-structure.js
    ↓
Task List → parallel-research-pipeline.js
    ↓
    ├→ PHASE 1: analysis-agent (dependency graph)
    ├→ PHASE 2: agent-pool (parallel research)
    └→ PHASE 3: aggregation
    ↓
Structured Results → Implementation
```

## Configuration

Most scripts support these common flags:
- `--verbose, -v` - Detailed logging
- `--help, -h` - Usage information
- `--json` - JSON output format

## Security

- All agents are READ-ONLY by design
- Cannot execute bash commands or modify files
- Limited to Read, Grep, Glob tools
- All executions have timeout protection

## Performance

- Cache hit: ~50ms
- Cache miss: ~12,000ms (full agent execution)
- Typical hit rate: 40-60% during development
- Parallel research: 2-3x speedup for 10 tasks

## Integration

The system integrates with the main Idea-to-Code workflow through:
1. Plan management from `docs/plans/`
2. Phase execution with research agents
3. Task verification
4. Result caching

## Extension Points

### Adding New Scripts

1. Create script in `scripts/`
2. Add to `COMMANDS` in `scripts/index.js`
3. Add description to `DESCRIPTIONS`
4. Return JSON output

### Adding New Agents

1. Create template in `.claude/templates/agents/`
2. Define JSON schema in `scripts/lib/schemas/`
3. Document output format
