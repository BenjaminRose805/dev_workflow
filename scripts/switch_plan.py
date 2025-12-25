#!/usr/bin/env python3
"""
switch_plan.py - Easily switch between plans and prepare orchestrator

Usage:
    python scripts/switch_plan.py              # Interactive mode
    python scripts/switch_plan.py list         # List all plans
    python scripts/switch_plan.py current      # Show current plan
    python scripts/switch_plan.py next         # Switch to next incomplete plan
    python scripts/switch_plan.py <plan-name>  # Switch to specific plan
"""

import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime

# Colors for terminal output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    BOLD = '\033[1m'
    NC = '\033[0m'  # No Color


def get_root_dir():
    """Get the project root directory."""
    return Path(__file__).parent.parent


def get_paths():
    """Get all relevant paths."""
    root = get_root_dir()
    return {
        'root': root,
        'plans': root / 'docs' / 'plans',
        'outputs': root / 'docs' / 'plan-outputs',
        'current_plan': root / '.claude' / 'current-plan.txt',
        # Output path is now derived from plan name: docs/plan-outputs/{plan-name}/
        # No longer using .claude/current-plan-output.txt pointer
    }


def load_status(status_path):
    """Load status.json and return summary."""
    try:
        with open(status_path) as f:
            data = json.load(f)
            return data.get('summary', {})
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def get_current_plan():
    """Get the currently active plan name."""
    paths = get_paths()
    if paths['current_plan'].exists():
        content = paths['current_plan'].read_text().strip()
        return Path(content).stem
    return None


def show_current():
    """Display the current plan and its status."""
    paths = get_paths()
    current = get_current_plan()

    if current:
        print(f"{Colors.CYAN}Current plan:{Colors.NC} {current}")
        status_file = paths['outputs'] / current / 'status.json'
        if status_file.exists():
            summary = load_status(status_file)
            total = summary.get('totalTasks', 0)
            completed = summary.get('completed', 0)
            pending = summary.get('pending', 0)
            in_progress = summary.get('in_progress', 0)

            if total > 0:
                pct = int((completed / total) * 100)
                bar = '█' * (pct // 10) + '░' * (10 - pct // 10)
                print(f"Progress: [{bar}] {pct}%")
                print(f"  ✓ Completed: {completed}")
                print(f"  ◯ Pending: {pending}")
                print(f"  ⏳ In Progress: {in_progress}")
    else:
        print(f"{Colors.YELLOW}No plan currently set{Colors.NC}")


def list_plans():
    """List all available plans with their status."""
    paths = get_paths()
    current = get_current_plan()

    print(f"\n{Colors.BLUE}{'═' * 70}{Colors.NC}")
    print(f"{Colors.BLUE}                         AVAILABLE PLANS{Colors.NC}")
    print(f"{Colors.BLUE}{'═' * 70}{Colors.NC}\n")

    print(f"{Colors.YELLOW}Plans with pending tasks:{Colors.NC}\n")
    print(f"{'#':>4}  {'Plan Name':<45} {'Pending':>8} {'Done':>8} Progress")
    print("─" * 78)

    plans = []
    plan_files = sorted(paths['plans'].glob('*.md'))

    for plan_file in plan_files:
        name = plan_file.stem
        status_file = paths['outputs'] / name / 'status.json'

        summary = load_status(status_file)
        pending = summary.get('pending', 0)
        completed = summary.get('completed', 0)
        total = pending + completed

        # Skip completed plans
        if pending == 0 and completed > 0:
            continue

        pct = int((completed / total) * 100) if total > 0 else 0
        bar = '█' * (pct // 10) + '░' * (10 - pct // 10)

        marker = f"{Colors.GREEN}▶{Colors.NC}" if name == current else " "

        plans.append({
            'name': name,
            'pending': pending,
            'completed': completed,
            'pct': pct,
        })

        idx = len(plans)
        print(f"{marker}{idx:>3}  {name:<45} {pending:>8} {completed:>8} {bar} {pct:>3}%")

    print()
    return plans


def parse_plan_tasks(plan_path):
    """Parse tasks from a plan file."""
    tasks = []
    current_phase = ""
    task_regex = re.compile(r'^- \[ \] (\d+\.\d+)\s+(.+)$')

    with open(plan_path) as f:
        for line in f:
            line = line.rstrip()
            if line.startswith('## Phase '):
                current_phase = line.replace('## ', '')
            match = task_regex.match(line)
            if match:
                tasks.append({
                    'id': match.group(1),
                    'phase': current_phase,
                    'description': match.group(2).strip(),
                    'status': 'pending'
                })

    return tasks, current_phase


def switch_to_plan(name):
    """Switch to a specific plan."""
    paths = get_paths()
    plan_file = paths['plans'] / f'{name}.md'
    output_dir = paths['outputs'] / name
    status_file = output_dir / 'status.json'

    if not plan_file.exists():
        print(f"{Colors.RED}Error: Plan file not found: {plan_file}{Colors.NC}")
        return False

    print(f"\n{Colors.CYAN}Switching to plan:{Colors.NC} {name}")

    # Update current plan pointer
    paths['current_plan'].write_text(f'docs/plans/{name}.md\n')
    print(f"{Colors.GREEN}✓{Colors.NC} Updated current-plan.txt")

    # Create output directory if needed
    findings_dir = output_dir / 'findings'
    findings_dir.mkdir(parents=True, exist_ok=True)
    print(f"{Colors.GREEN}✓{Colors.NC} Output directory ready: docs/plan-outputs/{name}/")

    # Initialize status.json if needed
    if not status_file.exists():
        print(f"{Colors.YELLOW}⚠{Colors.NC} No status.json found, initializing...")

        tasks, first_phase = parse_plan_tasks(plan_file)

        status = {
            '_comment': 'This file is the authoritative source of truth for task execution state.',
            'planPath': f'docs/plans/{name}.md',
            'planName': name,
            'createdAt': datetime.now().isoformat(),
            'lastUpdatedAt': datetime.now().isoformat(),
            'currentPhase': first_phase or 'Phase 1',
            'tasks': tasks,
            'runs': [],
            'summary': {
                'totalTasks': len(tasks),
                'completed': 0,
                'pending': len(tasks),
                'in_progress': 0,
                'failed': 0,
                'skipped': 0
            }
        }

        with open(status_file, 'w') as f:
            json.dump(status, f, indent=2)

        print(f"{Colors.GREEN}✓{Colors.NC} Created status.json with {len(tasks)} tasks")
    else:
        print(f"{Colors.GREEN}✓{Colors.NC} status.json exists")

    # Show plan status
    print(f"\n{Colors.BLUE}Plan Status:{Colors.NC}")
    summary = load_status(status_file)
    total = summary.get('totalTasks', 0)
    completed = summary.get('completed', 0)
    pending = summary.get('pending', 0)

    if total > 0:
        pct = int((completed / total) * 100)
        bar = '█' * (pct // 10) + '░' * (10 - pct // 10)
        print(f"Progress: [{bar}] {pct}%")
        print(f"  Pending: {pending} | Completed: {completed} | Total: {total}")

    print(f"\n{Colors.GREEN}Ready to run!{Colors.NC}")
    print(f"  {Colors.CYAN}TUI mode:{Colors.NC}  python scripts/plan_orchestrator.py --tui")
    print(f"  {Colors.CYAN}CLI mode:{Colors.NC}  python scripts/plan_orchestrator.py")
    print(f"  {Colors.CYAN}Status:{Colors.NC}    node scripts/status-cli.js status")

    return True


def find_next_plan():
    """Find the next incomplete plan based on execution order."""
    paths = get_paths()

    # Priority order from docs/plans/EXECUTION-ORDER.md
    # These implement parallel execution and git workflow features
    priority_order = [
        # Parallel Execution & Git Workflow (ordered by dependencies)
        'parallel-execution-foundation',
        'git-workflow-phase1-core-branching',
        'git-workflow-phase2-completion',
        'parallel-execution-dependencies',
        'git-workflow-phase3-safety',
        'git-workflow-phase4-advanced',
        'git-workflow-phase5-worktrees',
        # Other active plans
        'tui-integration-implementation',
        'documentation-cleanup',
        'documentation-standards-analysis',
        'fix-plan-compliance',
        'high-priority-fixes',
        'implement-orchestration-constraints',
        'medium-priority-fixes',
        'parallel-execution-architecture',
        'plan-system-analysis',
    ]

    for name in priority_order:
        status_file = paths['outputs'] / name / 'status.json'
        if status_file.exists():
            summary = load_status(status_file)
            if summary.get('pending', 0) > 0:
                return name

    # Fallback: any plan with pending tasks
    for plan_file in paths['plans'].glob('*.md'):
        name = plan_file.stem
        status_file = paths['outputs'] / name / 'status.json'
        if status_file.exists():
            summary = load_status(status_file)
            if summary.get('pending', 0) > 0:
                return name

    return None


def interactive_mode():
    """Run interactive plan selection."""
    show_current()
    plans = list_plans()

    if not plans:
        print(f"{Colors.YELLOW}No plans with pending tasks found{Colors.NC}")
        return

    try:
        choice = input(f"{Colors.CYAN}Enter plan number (or 'q' to quit):{Colors.NC} ").strip()
    except (KeyboardInterrupt, EOFError):
        print()
        return

    if choice.lower() == 'q':
        return

    try:
        idx = int(choice)
        if 1 <= idx <= len(plans):
            switch_to_plan(plans[idx - 1]['name'])
        else:
            print(f"{Colors.RED}Invalid selection{Colors.NC}")
    except ValueError:
        print(f"{Colors.RED}Invalid input{Colors.NC}")


def main():
    """Main entry point."""
    os.chdir(get_root_dir())

    if len(sys.argv) < 2:
        interactive_mode()
    elif sys.argv[1] in ('list', '-l'):
        show_current()
        list_plans()
    elif sys.argv[1] in ('current', '-c'):
        show_current()
    elif sys.argv[1] in ('next', '-n'):
        next_plan = find_next_plan()
        if next_plan:
            switch_to_plan(next_plan)
        else:
            print(f"{Colors.YELLOW}No incomplete plans found{Colors.NC}")
    elif sys.argv[1] in ('help', '-h', '--help'):
        print(__doc__)
    else:
        # Direct plan name
        switch_to_plan(sys.argv[1])


if __name__ == '__main__':
    main()
