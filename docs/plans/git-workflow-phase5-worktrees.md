# Implementation Plan: Git Workflow Phase 5 - Worktrees & Parallel Execution

## Overview
- **Objective:** Enable parallel plan execution using git worktrees
- **Priority:** P2
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

**VERIFY Phase 1:**
- [ ] `test -f .claude/commands/plan/worktree.md` returns 0 (file exists)
- [ ] `grep -c "create" .claude/commands/plan/worktree.md` returns >= 1
- [ ] `grep -c "list" .claude/commands/plan/worktree.md` returns >= 1
- [ ] `grep -c "remove" .claude/commands/plan/worktree.md` returns >= 1

## Phase 2: Worktree Creation & Initialization

- [ ] 2.1 Implement complete worktree creation workflow: create directory with `git worktree add worktrees/plan-{name} -b plan/{name}`, initialize `.claude-context/` directory, copy config files, set current plan pointer, initialize status.json, handle existing branches (attach vs error), and validate creation success

**VERIFY Phase 2:**
- [ ] `git worktree add worktrees/plan-test -b plan/test` succeeds (test worktree creation)
- [ ] `test -d worktrees/plan-test/.claude-context` returns 0 (context dir exists)
- [ ] `git worktree remove worktrees/plan-test` succeeds (cleanup)

## Phase 3: Worktree Context System

**Execution Note:** Tasks 3.1-6.1 are [SEQUENTIAL] - all modify related orchestrator systems (`scripts/status-cli.js`, `scripts/plan_orchestrator.py`)

- [ ] 3.1 Implement worktree-aware context system: create `.claude-context/` directory structure for worktrees, move `current-plan.txt` to per-worktree context, add `CLAUDE_WORKTREE` environment variable support, update status-cli.js to detect worktree context, update all plan commands to use worktree-aware paths, and implement fallback to repo root when not in worktree

**VERIFY Phase 3:**
- [ ] `grep -c "CLAUDE_WORKTREE" scripts/status-cli.js` returns >= 1
- [ ] `grep -c ".claude-context" scripts/status-cli.js` returns >= 1
- [ ] status-cli.js detects worktree context when run from worktree directory

## Phase 4: Orchestrator Worktree Integration

- [ ] 4.1 Extend plan_orchestrator.py with worktree support: add `--worktree` flag, implement auto-detection from current directory, set working directory to worktree path, use worktree-specific log files (`orchestrator-{plan-name}.log`), pass worktree context to Claude sessions, and handle worktree paths in status monitoring

**VERIFY Phase 4:**
- [ ] `grep -c "\-\-worktree" scripts/plan_orchestrator.py` returns >= 1
- [ ] `grep -c "orchestrator-.*\.log" scripts/plan_orchestrator.py` returns >= 1
- [ ] Orchestrator runs correctly with `--worktree` flag pointing to test worktree

## Phase 5: Multi-Orchestrator Process Management

- [ ] 5.1 Implement parallel orchestrator infrastructure: design and implement process management for multiple orchestrators, create orchestrator registry to track running instances, add `--daemon` mode for background execution, implement IPC for orchestrator communication, handle graceful shutdown of multiple instances, and prevent duplicate orchestrators for the same plan

**VERIFY Phase 5:**
- [ ] `grep -c "\-\-daemon" scripts/plan_orchestrator.py` returns >= 1
- [ ] `grep -c "registry" scripts/plan_orchestrator.py` returns >= 1
- [ ] Running same plan twice shows "duplicate orchestrator" warning

## Phase 6: Aggregate Status System

- [ ] 6.1 Implement aggregate status view in status-cli.js: add `--all-plans` flag, scan all worktrees for active plans, aggregate progress across plans, display per-plan summary in table format, support `--json` output for programmatic access, and include worktree paths in status output

**VERIFY Phase 6:**
- [ ] `grep -c "\-\-all-plans" scripts/status-cli.js` returns >= 1
- [ ] `node scripts/status-cli.js progress --all-plans` returns aggregated progress
- [ ] `node scripts/status-cli.js progress --all-plans --json` returns valid JSON

## Phase 7: Multi-Plan TUI Interface

- [ ] 7.1 Implement complete multi-plan TUI: design and implement multi-pane layout showing parallel plans, add plan selector/switcher panel, create per-plan activity feeds, implement aggregate progress bar across all plans, add keyboard navigation between plan panes, support launching new plans from TUI, and support stopping individual plans from TUI

**VERIFY Phase 7:**
- [ ] TUI displays multiple plan panes when multiple worktrees are active
- [ ] Keyboard navigation (Tab/arrow keys) switches between plan panes
- [ ] Aggregate progress bar updates in real-time across all plans

## Phase 8: Worktree Completion & Cleanup

- [ ] 8.1 Implement complete worktree completion workflow: extend `/plan:complete` for worktree context, merge worktree branch to main, remove worktree with `git worktree remove`, clean up `.claude-context/` directory, update aggregate status after removal, and handle completion when other worktrees depend on changes

**VERIFY Phase 8:**
- [ ] `grep -c "worktree" .claude/commands/plan/complete.md` returns >= 1
- [ ] `/plan:complete` in worktree context merges branch and removes worktree
- [ ] `git worktree list` shows worktree removed after completion

## Phase 9: Conflict Detection & Resolution

- [ ] 9.1 Implement conflict management system: detect conflicts between parallel plan branches, warn when plans modify same files, implement merge order recommendation algorithm, support rebasing worktree on updated main, handle merge conflicts in worktree context, and document complete conflict resolution workflow

**VERIFY Phase 9:**
- [ ] Conflict detection warns when two worktrees modify same file
- [ ] `grep -c "conflict" scripts/plan_orchestrator.py` returns >= 1
- [ ] Merge order recommendations display when conflicts detected

## Phase 10: Resource Management System

- [ ] 10.1 Implement complete resource management: add concurrent plan limit configuration (default: 3), implement disk space monitoring for worktrees, create worktree age warnings for stale detection, add cleanup command for abandoned worktrees, configure resource limits in git-workflow.json, and handle resource exhaustion gracefully with clear error messages

**VERIFY Phase 10:**
- [ ] `grep -c "max_concurrent" git-workflow.json` returns >= 1 (if config file exists)
- [ ] Starting 4th concurrent worktree shows limit warning when max is 3
- [ ] Stale worktree (>14 days old) triggers warning message

## Phase 11: REST API Implementation

- [ ] 11.1 Implement complete REST API for plan management: design and implement endpoints (`/api/plans` for listing, `/api/plans/:name/start` for starting orchestrator, `/api/plans/:name/stop` for stopping, `/api/plans/:name/status` for status, `/api/plans/:name/logs` for log streaming), add WebSocket support for real-time updates, and create comprehensive API documentation for NextJS frontend integration

**VERIFY Phase 11:**
- [ ] `curl http://localhost:3100/api/plans` returns list of plans
- [ ] `curl http://localhost:3100/api/plans/:name/status` returns plan status
- [ ] WebSocket connection to `/api/plans/:name/logs` streams logs in real-time

## Phase 12: Frontend Integration Preparation

- [ ] 12.1 Prepare complete frontend integration package: document frontend requirements and architecture, define WebSocket message format for real-time updates, create OpenAPI specification for plan management API, design component structure for plan dashboard, implement server-side plan status fetching, and create mock data for frontend development and testing

**VERIFY Phase 12:**
- [ ] `test -f docs/api/openapi.yaml` returns 0 (OpenAPI spec exists)
- [ ] OpenAPI spec validates with `npx @redocly/cli lint docs/api/openapi.yaml`
- [ ] Mock data files exist for frontend development testing

## Phase 13: End-to-End Integration Testing

- [ ] 13.1 Execute comprehensive integration test suite: test creating multiple worktrees simultaneously, test running 3+ orchestrators in parallel, test completing plans in different orders, test conflict detection between plans, test TUI with multiple active plans, test API endpoints under load, and test cleanup procedures after various failure scenarios

**VERIFY Phase 13:**
- [ ] 3 worktrees can be created and run orchestrators simultaneously
- [ ] Completing plans in any order works without errors
- [ ] All API endpoints respond correctly under concurrent load
- [ ] Cleanup removes all worktrees and branches after test completion

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
