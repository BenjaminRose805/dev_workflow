# Implementation Plan: Git Workflow Phase 5 - Worktrees & Parallel Execution

## Overview
- **Objective:** Enable parallel plan execution using git worktrees
- **Priority:** P2
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (for orchestrator isolation - each task self-contained)
- **Output:** `docs/plan-outputs/git-workflow-phase5-worktrees/`

> Task findings are written to the `findings/` subdirectory. Use `/plan:status` to view progress.

## Architecture

```
repo/
├── .git/                              # Shared git data
├── main/                              # Primary worktree (main branch)
└── worktrees/
    ├── plan-feature-auth/             # Worktree for plan/feature-auth
    ├── plan-api-refactor/             # Worktree for plan/api-refactor
    └── plan-perf-optimization/        # Worktree for plan/perf-optimization
```

## Dependencies

### Upstream
- **git-workflow-phase1-core-branching.md** - Core branching commands must be working
- **git-workflow-phase2-completion.md** - Plan completion workflow must be complete
- **git-workflow-phase3-safety.md** - Safety checks must be in place
- **git-workflow-phase4-advanced.md** - Advanced features (stashing, history) must be complete

### Downstream
- Multi-plan TUI and frontend integration depend on worktree infrastructure
- REST API endpoints depend on worktree context system

### External Tools
- Git version 2.5+ (worktree support required)
- Node.js (for API server, optional)

---

## Phase 1: Worktree Management Command

- [ ] 1.1 Create `/plan:worktree` command with all subcommands
  - Check if `.claude/commands/plan/worktree.md` exists first
  - Create new file with command header and usage: `/plan:worktree <create|list|remove|switch> [options]`
  - Document all subcommands with examples
  - Implement `create`: `git worktree add worktrees/plan-{name} -b plan/{name}`, initialize `.claude-context/`, copy config files, set current plan pointer, initialize status.json
  - Implement `list`: show all active worktrees with plan status
  - Implement `remove`: `git worktree remove worktrees/plan-{name}`, cleanup context
  - Implement `switch`: change to different worktree directory
  - Handle existing branches (attach vs create new), validate creation success

---

## Phase 2: Worktree Context System

**Execution Note:** Phase 2 is foundational - Phases 3-5 depend on the context system.

- [ ] 2.1 Implement worktree-aware context system in `scripts/status-cli.js`
  - Read `scripts/status-cli.js` to see current state
  - Create `.claude-context/` directory structure for worktrees (alternative to `.claude/`)
  - Move `current-plan.txt` to per-worktree context location
  - Add `CLAUDE_WORKTREE` environment variable support
  - Update status-cli.js to detect worktree context (check for `.claude-context/` first)
  - Update all plan commands to use worktree-aware paths
  - Implement fallback to repo root when not in worktree

---

## Phase 3: Orchestrator Worktree Integration

- [ ] 3.1 Extend `scripts/plan_orchestrator.py` with worktree support
  - Read `scripts/plan_orchestrator.py` to see current state
  - Add `--worktree <path>` flag to specify worktree directory
  - Implement auto-detection from current working directory
  - Set working directory to worktree path for Claude sessions
  - Use worktree-specific log files: `orchestrator-{plan-name}.log`
  - Pass worktree context to Claude sessions via environment
  - Handle worktree paths in status monitoring

---

## Phase 4: Multi-Orchestrator Process Management

- [ ] 4.1 Implement parallel orchestrator infrastructure
  - Read `scripts/plan_orchestrator.py` to see current state
  - Design process management for multiple orchestrators (one per worktree)
  - Create orchestrator registry to track running instances (file-based or in-memory)
  - Add `--daemon` mode for background execution
  - Implement IPC mechanism for orchestrator communication (signals or file-based)
  - Handle graceful shutdown of multiple instances
  - Prevent duplicate orchestrators for the same plan

---

## Phase 5: Aggregate Status View

- [ ] 5.1 Add aggregate status view to `scripts/status-cli.js`
  - Read `scripts/status-cli.js` to see current state
  - Add `--all-plans` flag to progress command
  - Scan all worktrees for active plans
  - Aggregate progress across plans
  - Display per-plan summary in table format
  - Support `--json` output for programmatic access
  - Include worktree paths in status output

---

## Phase 6: Multi-Plan TUI Interface

- [ ] 6.1 Implement multi-plan TUI display
  - Design multi-pane layout showing parallel plans
  - Add plan selector/switcher panel
  - Create per-plan activity feeds
  - Implement aggregate progress bar across all plans
  - Add keyboard navigation between plan panes (Tab, arrow keys)
  - Support launching new plans from TUI
  - Support stopping individual plans from TUI

---

## Phase 7: Worktree Completion Workflow

- [ ] 7.1 Extend `/plan:complete` for worktree context
  - Read `.claude/commands/plan/complete.md` to see current state
  - Detect if running in worktree context
  - Merge worktree branch to main
  - Remove worktree with `git worktree remove worktrees/plan-{name}`
  - Clean up `.claude-context/` directory
  - Update aggregate status after removal
  - Handle completion when other worktrees depend on changes

---

## Phase 8: Conflict Detection Between Worktrees

- [ ] 8.1 Implement conflict management system
  - Detect conflicts between parallel plan branches
  - Warn when plans modify same files (compare file lists from status.json)
  - Implement merge order recommendation algorithm
  - Support rebasing worktree on updated main
  - Handle merge conflicts in worktree context
  - Document conflict resolution workflow

---

## Phase 9: Resource Management

- [ ] 9.1 Implement resource management system
  - Add concurrent plan limit configuration (default: 3) to git-workflow.json
  - Implement disk space monitoring for worktrees
  - Create worktree age warnings for stale detection (default: 14 days)
  - Add cleanup command for abandoned worktrees
  - Handle resource exhaustion gracefully with clear error messages
  - Enforce limits when creating new worktrees

---

## Phase 10: REST API Implementation

- [ ] 10.1 Create REST API for plan management
  - Design API endpoints: `/api/plans` (list), `/api/plans/:name/start` (start), `/api/plans/:name/stop` (stop), `/api/plans/:name/status` (status), `/api/plans/:name/logs` (logs)
  - Implement Express/Fastify server in `scripts/api-server.js`
  - Add WebSocket support for real-time updates (`/ws/plans/:name`)
  - Create comprehensive API documentation
  - Handle authentication (optional, configurable)
  - Support CORS for NextJS frontend integration

---

## Phase 11: Frontend Integration Preparation

- [ ] 11.1 Create frontend integration package
  - Create OpenAPI specification at `docs/api/openapi.yaml`
  - Define WebSocket message format for real-time updates
  - Design component structure for plan dashboard
  - Implement server-side plan status fetching examples
  - Create mock data files for frontend development and testing
  - Validate OpenAPI spec with `npx @redocly/cli lint`

---

## Phase 12: Integration Testing

- [ ] 12.1 Execute comprehensive worktree integration tests
  - Create test document at `docs/plan-outputs/git-workflow-phase5-worktrees/findings/12.1.md`
  - Test creating multiple worktrees simultaneously
  - Test running 3+ orchestrators in parallel
  - Test completing plans in different orders
  - Test conflict detection between plans
  - Test TUI with multiple active plans
  - Test API endpoints under concurrent load
  - Test cleanup procedures after various failure scenarios
  - Create summary checklist with PASS/FAIL for each test case

---

## Success Criteria

- Multiple plans execute simultaneously in separate worktrees
- Each orchestrator instance is isolated
- TUI shows all active plans with real-time updates
- Plans can be started/stopped independently
- Completion merges correctly from any worktree
- Conflicts detected before they cause issues
- API ready for NextJS frontend integration
- Resource usage stays within configured limits

## Risks

| Risk | Mitigation |
|------|------------|
| Worktree disk usage | Cleanup commands, monitoring, limits |
| Process management complexity | Registry pattern, graceful shutdown |
| Merge conflicts between plans | Detection, ordering recommendations |
| Context confusion | Clear worktree indicators in TUI/CLI |
| API security | Authentication layer for web access |

## Configuration

```json
{
  "worktrees": {
    "enabled": true,
    "directory": "worktrees",
    "max_concurrent": 3,
    "auto_cleanup": true,
    "stale_days": 14
  },
  "api": {
    "enabled": false,
    "port": 3100,
    "auth_required": true
  }
}
```
