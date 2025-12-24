#!/bin/bash

# Plan Runner - Wrapper for orchestrating plan execution
#
# This script provides simple commands that the orchestrator agent
# can use to drive plan execution.
#
# Usage:
#   ./scripts/plan-runner.sh <command> [args]
#
# Commands:
#   status              Show current plan status
#   next [count]        Get next N tasks to work on (default: 1)
#   explain <task-id>   Explain a task (prints command to run)
#   implement <task-id> Implement a task (prints command to run)
#   verify <task-id>    Verify a task (prints command to run)
#   split <task-id>     Split a task (prints command to run)
#   phase <N>           Show tasks in phase N
#   run <task-id>       Full cycle: explain, implement, verify

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

command="$1"
shift || true

case "$command" in
    status)
        node scripts/plan-orchestrator.js status
        ;;

    next)
        count="${1:-1}"
        node scripts/plan-orchestrator.js next "$count"
        ;;

    check)
        task_id="$1"
        if [ -z "$task_id" ]; then
            echo '{"error": "Task ID required"}'
            exit 1
        fi
        node scripts/plan-orchestrator.js check "$task_id"
        ;;

    phases)
        node scripts/plan-orchestrator.js phases
        ;;

    explain)
        task_id="$1"
        if [ -z "$task_id" ]; then
            echo '{"error": "Task ID required"}'
            exit 1
        fi
        echo "Run: /plan:explain $task_id"
        ;;

    implement)
        task_id="$1"
        if [ -z "$task_id" ]; then
            echo '{"error": "Task ID required"}'
            exit 1
        fi
        echo "Run: /plan:implement $task_id"
        ;;

    verify)
        task_id="$1"
        if [ -z "$task_id" ]; then
            echo '{"error": "Task ID required"}'
            exit 1
        fi
        echo "Run: /plan:verify $task_id"
        ;;

    split)
        task_id="$1"
        if [ -z "$task_id" ]; then
            echo '{"error": "Task ID required"}'
            exit 1
        fi
        echo "Run: /plan:split $task_id"
        ;;

    phase)
        phase_num="$1"
        if [ -z "$phase_num" ]; then
            echo '{"error": "Phase number required"}'
            exit 1
        fi
        # Get tasks for specific phase
        node -e "
            const fs = require('fs');
            const planPath = fs.readFileSync('.claude/current-plan.txt', 'utf8').trim();
            const content = fs.readFileSync(planPath, 'utf8');
            const lines = content.split('\n');
            let inPhase = false;
            const tasks = [];

            for (const line of lines) {
                if (line.match(/^##\\s+Phase\\s+${phase_num}:/)) {
                    inPhase = true;
                    continue;
                }
                if (inPhase && line.match(/^##\\s+Phase\\s+\\d+:/)) {
                    break;
                }
                if (inPhase) {
                    const match = line.match(/^-\\s+\\[([ x])\\]\\s+(\\d+\\.\\d+)\\s+(.+)\$/);
                    if (match) {
                        tasks.push({
                            id: match[2],
                            description: match[3],
                            completed: match[1] === 'x'
                        });
                    }
                }
            }
            console.log(JSON.stringify({ phase: ${phase_num}, tasks }, null, 2));
        "
        ;;

    run)
        task_id="$1"
        if [ -z "$task_id" ]; then
            echo '{"error": "Task ID required"}'
            exit 1
        fi
        echo "Full execution cycle for task $task_id:"
        echo "1. /plan:explain $task_id"
        echo "2. /plan:implement $task_id"
        echo "3. /plan:verify $task_id"
        ;;

    help|--help|-h|"")
        cat << 'EOF'
Plan Runner - Orchestrator Helper

Commands:
  status              Show current plan status (JSON)
  next [count]        Get next N tasks to work on (default: 1)
  check <task-id>     Check if a task can be started
  phases              List all phases with status
  explain <task-id>   Show command to explain a task
  implement <task-id> Show command to implement a task
  verify <task-id>    Show command to verify a task
  split <task-id>     Show command to split a task
  phase <N>           Show tasks in phase N
  run <task-id>       Show full execution cycle commands

Examples:
  ./scripts/plan-runner.sh status
  ./scripts/plan-runner.sh next 3
  ./scripts/plan-runner.sh check 3.4
  ./scripts/plan-runner.sh run 3.4
EOF
        ;;

    *)
        echo "{\"error\": \"Unknown command: $command\"}"
        exit 1
        ;;
esac
