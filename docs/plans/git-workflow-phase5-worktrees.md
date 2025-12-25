# Implementation Plan: Git Workflow Phase 5 - Worktrees & Parallel Execution

## Overview
- **Objective:** Enable parallel plan execution using git worktrees
- **Dependencies:** Phases 1-4 must be complete
- **Created:** 2024-12-25
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

## Phase 1: Worktree Management Command

- [ ] 1.1 Create `.claude/commands/plan/worktree.md` command file
- [ ] 1.2 Implement `create` subcommand: creates worktree + plan branch
- [ ] 1.3 Implement `list` subcommand: shows active worktrees with plan status
- [ ] 1.4 Implement `remove` subcommand: cleans up worktree after merge
- [ ] 1.5 Implement `switch` subcommand: changes active worktree context
- [ ] 1.6 Define worktree directory structure (`worktrees/plan-{name}/`)
- [ ] 1.7 Document command usage and workflow
- [ ] **VERIFY 1**: Worktree command creates and manages worktrees

## Phase 2: Worktree Creation Workflow

- [ ] 2.1 Create worktree directory: `git worktree add worktrees/plan-{name} -b plan/{name}`
- [ ] 2.2 Initialize plan context in worktree (`.claude-context/` directory)
- [ ] 2.3 Copy necessary config files to worktree context
- [ ] 2.4 Set current plan pointer in worktree context
- [ ] 2.5 Initialize status.json for the plan
- [ ] 2.6 Handle existing branch (attach to existing vs error)
- [ ] 2.7 Validate worktree creation succeeded
- [ ] **VERIFY 2**: Worktree creation works end-to-end

## Phase 3: Per-Worktree Context

- [ ] 3.1 Create `.claude-context/` directory structure for worktrees
- [ ] 3.2 Move `current-plan.txt` to per-worktree context
- [ ] 3.3 Add `CLAUDE_WORKTREE` environment variable support
- [ ] 3.4 Update status-cli.js to detect worktree context
- [ ] 3.5 Update plan commands to use worktree-aware paths
- [ ] 3.6 Fallback to repo root when not in worktree
- [ ] **VERIFY 3**: Commands work correctly in worktree context

## Phase 4: Orchestrator Worktree Support

- [ ] 4.1 Add `--worktree` flag to plan_orchestrator.py
- [ ] 4.2 Auto-detect worktree from current directory
- [ ] 4.3 Set working directory to worktree path
- [ ] 4.4 Use worktree-specific log file: `orchestrator-{plan-name}.log`
- [ ] 4.5 Pass worktree context to Claude sessions
- [ ] 4.6 Handle worktree path in status monitoring
- [ ] **VERIFY 4**: Orchestrator runs correctly in worktree

## Phase 5: Parallel Orchestrator Instances

- [ ] 5.1 Design process management for multiple orchestrators
- [ ] 5.2 Implement orchestrator registry (track running instances)
- [ ] 5.3 Add `--daemon` mode for background execution
- [ ] 5.4 Implement IPC for orchestrator communication
- [ ] 5.5 Handle graceful shutdown of multiple instances
- [ ] 5.6 Prevent duplicate orchestrators for same plan
- [ ] **VERIFY 5**: Multiple orchestrators run without conflicts

## Phase 6: Aggregate Status View

- [ ] 6.1 Add `status --all-plans` to status-cli.js
- [ ] 6.2 Scan all worktrees for active plans
- [ ] 6.3 Aggregate progress across all plans
- [ ] 6.4 Show per-plan summary in table format
- [ ] 6.5 Add `--json` output for programmatic access
- [ ] 6.6 Include worktree path in status output
- [ ] **VERIFY 6**: Aggregate status shows all active plans

## Phase 7: TUI Multi-Plan Support

- [ ] 7.1 Design multi-pane TUI layout for parallel plans
- [ ] 7.2 Add plan selector/switcher panel
- [ ] 7.3 Show activity feed per plan
- [ ] 7.4 Aggregate progress bar across all plans
- [ ] 7.5 Handle keyboard navigation between plan panes
- [ ] 7.6 Support launching new plan from TUI
- [ ] 7.7 Support stopping individual plans from TUI
- [ ] **VERIFY 7**: TUI displays multiple plans simultaneously

## Phase 8: Worktree Completion & Cleanup

- [ ] 8.1 Extend `/plan:complete` for worktree context
- [ ] 8.2 Merge from worktree branch to main
- [ ] 8.3 Remove worktree after successful merge: `git worktree remove`
- [ ] 8.4 Clean up `.claude-context/` directory
- [ ] 8.5 Update aggregate status after removal
- [ ] 8.6 Handle completion when other worktrees depend on changes
- [ ] **VERIFY 8**: Worktree cleanup works after plan completion

## Phase 9: Conflict Management

- [ ] 9.1 Detect conflicts between parallel plan branches
- [ ] 9.2 Warn when plans modify same files
- [ ] 9.3 Implement merge order recommendation
- [ ] 9.4 Support rebasing worktree on updated main
- [ ] 9.5 Handle merge conflicts in worktree context
- [ ] 9.6 Document conflict resolution workflow
- [ ] **VERIFY 9**: Conflict detection and resolution works

## Phase 10: Resource Management

- [ ] 10.1 Implement concurrent plan limit (default: 3)
- [ ] 10.2 Add disk space monitoring for worktrees
- [ ] 10.3 Implement worktree age warnings (stale detection)
- [ ] 10.4 Add cleanup command for abandoned worktrees
- [ ] 10.5 Configure resource limits in git-workflow.json
- [ ] 10.6 Handle resource exhaustion gracefully
- [ ] **VERIFY 10**: Resource management prevents issues

## Phase 11: API for External Integration

- [ ] 11.1 Design REST API endpoints for plan management
- [ ] 11.2 Implement `/api/plans` - list all plans with status
- [ ] 11.3 Implement `/api/plans/:name/start` - start orchestrator
- [ ] 11.4 Implement `/api/plans/:name/stop` - stop orchestrator
- [ ] 11.5 Implement `/api/plans/:name/status` - get plan status
- [ ] 11.6 Implement `/api/plans/:name/logs` - stream logs
- [ ] 11.7 Add WebSocket support for real-time updates
- [ ] 11.8 Document API for NextJS frontend integration
- [ ] **VERIFY 11**: API endpoints work correctly

## Phase 12: NextJS Frontend Preparation

- [ ] 12.1 Document frontend requirements and architecture
- [ ] 12.2 Define WebSocket message format for updates
- [ ] 12.3 Create OpenAPI spec for plan management API
- [ ] 12.4 Design component structure for plan dashboard
- [ ] 12.5 Implement server-side plan status fetching
- [ ] 12.6 Create mock data for frontend development
- [ ] **VERIFY 12**: Frontend integration ready

## Phase 13: Integration Testing

- [ ] 13.1 Test creating multiple worktrees simultaneously
- [ ] 13.2 Test running 3 orchestrators in parallel
- [ ] 13.3 Test completing plans in different orders
- [ ] 13.4 Test conflict detection between plans
- [ ] 13.5 Test TUI with multiple active plans
- [ ] 13.6 Test API endpoints under load
- [ ] 13.7 Test cleanup after failures
- [ ] **VERIFY 13**: All parallel execution scenarios work

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

- Phases 1-4 complete (core git workflow working)
- Git version 2.5+ (worktree support)
- Understanding of process management
- (Optional) Node.js for API server

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
