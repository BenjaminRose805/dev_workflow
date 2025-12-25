# Implementation Plan: Git Workflow Phase 5 - Worktrees & Parallel Execution

## Overview
- **Objective:** Enable parallel plan execution using git worktrees
- **Created:** 2024-12-25
- **Restructured:** 2024-12-25 (consolidated for orchestrator isolation)
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

## Phase 1: Worktree Management Foundation

- [ ] 1.1 Implement complete worktree management command in `.claude/commands/plan/worktree.md` with all subcommands (create, list, remove, switch), worktree directory structure (`worktrees/plan-{name}/`), branch naming (`plan/{name}`), and comprehensive documentation of usage and workflow

## Phase 2: Worktree Creation & Initialization

- [ ] 2.1 Implement complete worktree creation workflow: create directory with `git worktree add worktrees/plan-{name} -b plan/{name}`, initialize `.claude-context/` directory, copy config files, set current plan pointer, initialize status.json, handle existing branches (attach vs error), and validate creation success

## Phase 3: Worktree Context System

- [ ] 3.1 Implement worktree-aware context system: create `.claude-context/` directory structure for worktrees, move `current-plan.txt` to per-worktree context, add `CLAUDE_WORKTREE` environment variable support, update status-cli.js to detect worktree context, update all plan commands to use worktree-aware paths, and implement fallback to repo root when not in worktree

## Phase 4: Orchestrator Worktree Integration

- [ ] 4.1 Extend plan_orchestrator.py with worktree support: add `--worktree` flag, implement auto-detection from current directory, set working directory to worktree path, use worktree-specific log files (`orchestrator-{plan-name}.log`), pass worktree context to Claude sessions, and handle worktree paths in status monitoring

## Phase 5: Multi-Orchestrator Process Management

- [ ] 5.1 Implement parallel orchestrator infrastructure: design and implement process management for multiple orchestrators, create orchestrator registry to track running instances, add `--daemon` mode for background execution, implement IPC for orchestrator communication, handle graceful shutdown of multiple instances, and prevent duplicate orchestrators for the same plan

## Phase 6: Aggregate Status System

- [ ] 6.1 Implement aggregate status view in status-cli.js: add `--all-plans` flag, scan all worktrees for active plans, aggregate progress across plans, display per-plan summary in table format, support `--json` output for programmatic access, and include worktree paths in status output

## Phase 7: Multi-Plan TUI Interface

- [ ] 7.1 Implement complete multi-plan TUI: design and implement multi-pane layout showing parallel plans, add plan selector/switcher panel, create per-plan activity feeds, implement aggregate progress bar across all plans, add keyboard navigation between plan panes, support launching new plans from TUI, and support stopping individual plans from TUI

## Phase 8: Worktree Completion & Cleanup

- [ ] 8.1 Implement complete worktree completion workflow: extend `/plan:complete` for worktree context, merge worktree branch to main, remove worktree with `git worktree remove`, clean up `.claude-context/` directory, update aggregate status after removal, and handle completion when other worktrees depend on changes

## Phase 9: Conflict Detection & Resolution

- [ ] 9.1 Implement conflict management system: detect conflicts between parallel plan branches, warn when plans modify same files, implement merge order recommendation algorithm, support rebasing worktree on updated main, handle merge conflicts in worktree context, and document complete conflict resolution workflow

## Phase 10: Resource Management System

- [ ] 10.1 Implement complete resource management: add concurrent plan limit configuration (default: 3), implement disk space monitoring for worktrees, create worktree age warnings for stale detection, add cleanup command for abandoned worktrees, configure resource limits in git-workflow.json, and handle resource exhaustion gracefully with clear error messages

## Phase 11: REST API Implementation

- [ ] 11.1 Implement complete REST API for plan management: design and implement endpoints (`/api/plans` for listing, `/api/plans/:name/start` for starting orchestrator, `/api/plans/:name/stop` for stopping, `/api/plans/:name/status` for status, `/api/plans/:name/logs` for log streaming), add WebSocket support for real-time updates, and create comprehensive API documentation for NextJS frontend integration

## Phase 12: Frontend Integration Preparation

- [ ] 12.1 Prepare complete frontend integration package: document frontend requirements and architecture, define WebSocket message format for real-time updates, create OpenAPI specification for plan management API, design component structure for plan dashboard, implement server-side plan status fetching, and create mock data for frontend development and testing

## Phase 13: End-to-End Integration Testing

- [ ] 13.1 Execute comprehensive integration test suite: test creating multiple worktrees simultaneously, test running 3+ orchestrators in parallel, test completing plans in different orders, test conflict detection between plans, test TUI with multiple active plans, test API endpoints under load, and test cleanup procedures after various failure scenarios

## Success Criteria

- [ ] Multiple plans execute simultaneously in separate worktrees
- [ ] Each orchestrator instance is isolated
- [ ] TUI shows all active plans with real-time updates
- [ ] Plans can be started/stopped independently
- [ ] Completion merges correctly from any worktree
- [ ] Conflicts detected before they cause issues
- [ ] API ready for NextJS frontend integration
- [ ] Resource usage stays within configured limits

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

## Future Considerations

- Remote worktree support (separate machines)
- Distributed orchestration (multiple hosts)
- Plan dependencies (Plan B waits for Plan A)
- Shared artifact caching across worktrees
- Cloud-based worktree storage
