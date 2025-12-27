#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Plan Monitor CLI.

A standalone TUI for monitoring multiple plans running in parallel.
This complements the plan_orchestrator.py by providing a unified view
across all active plans and worktrees.

Usage:
    python scripts/multi_plan_monitor.py [options]

Options:
    --layout {focus,split}  Layout mode (default: focus)
    --refresh N             Refresh rate in Hz (default: 4)
    --no-registry           Don't scan orchestrator registry
    --plan PATH             Manually add a plan to monitor

Examples:
    # Monitor all active plans (auto-discovers from registry)
    python scripts/multi_plan_monitor.py

    # Use split layout to see all plans side-by-side
    python scripts/multi_plan_monitor.py --layout split

    # Monitor specific plans
    python scripts/multi_plan_monitor.py --plan docs/plans/my-plan.md
"""

import argparse
import json
import os
import signal
import sys
import time
from pathlib import Path

# Ensure project root is in path
_script_dir = Path(__file__).parent
_project_root = _script_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from scripts.lib.multi_plan_tui import (
    MultiPlanTUI,
    MultiPlanStatusMonitor,
    create_multi_plan_tui_from_registry,
    RICH_AVAILABLE,
)


def get_status_path(plan_path: str, project_root: Path) -> str:
    """Get the status.json path for a plan."""
    plan_name = Path(plan_path).stem
    return str(project_root / "docs" / "plan-outputs" / plan_name / "status.json")


def scan_and_populate_tui(tui: MultiPlanTUI, monitor: MultiPlanStatusMonitor, project_root: Path):
    """Scan for plans and populate the TUI."""

    # 1. Check main repo plan
    main_plan_ptr = project_root / ".claude" / "current-plan.txt"
    if main_plan_ptr.exists():
        try:
            plan_path = main_plan_ptr.read_text().strip()
            if plan_path:
                plan_name = Path(plan_path).stem
                plan_id = f"main:{plan_name}"
                tui.add_plan(
                    plan_id=plan_id,
                    plan_name=plan_name,
                    plan_path=plan_path
                )

                # Add to monitor
                status_path = get_status_path(plan_path, project_root)
                if os.path.exists(status_path):
                    monitor.add_plan_monitor(plan_id, status_path)

                    # Load initial status
                    try:
                        with open(status_path, 'r') as f:
                            status_data = json.load(f)
                        tui.update_plan(plan_id, status_data)
                    except (OSError, json.JSONDecodeError):
                        pass
        except OSError:
            pass

    # 2. Scan worktrees directory
    worktrees_dir = project_root / "worktrees"
    if worktrees_dir.exists():
        for entry in worktrees_dir.iterdir():
            if entry.is_dir() and entry.name.startswith("plan-"):
                context_file = entry / ".claude-context" / "current-plan.txt"
                if context_file.exists():
                    try:
                        plan_path = context_file.read_text().strip()
                        if plan_path:
                            plan_name = Path(plan_path).stem
                            plan_id = f"worktree:{entry.name}"

                            tui.add_plan(
                                plan_id=plan_id,
                                plan_name=plan_name,
                                plan_path=plan_path,
                                worktree_path=str(entry)
                            )

                            # Check for status.json in worktree or main repo
                            wt_status = entry / "docs" / "plan-outputs" / plan_name / "status.json"
                            main_status = get_status_path(plan_path, project_root)

                            status_path = str(wt_status) if wt_status.exists() else main_status
                            if os.path.exists(status_path):
                                monitor.add_plan_monitor(plan_id, status_path)

                                try:
                                    with open(status_path, 'r') as f:
                                        status_data = json.load(f)
                                    tui.update_plan(plan_id, status_data)
                                except (OSError, json.JSONDecodeError):
                                    pass
                    except OSError:
                        pass

    # 3. Check orchestrator registry for running instances
    registry_path = project_root / ".claude" / "orchestrator-registry.json"
    if registry_path.exists():
        try:
            with open(registry_path, 'r') as f:
                registry = json.load(f)

            for inst in registry.get('instances', []):
                if inst.get('status') == 'running':
                    plan_path = inst.get('plan_path', '')
                    plan_name = Path(plan_path).stem if plan_path else 'unknown'

                    # Find matching plan in TUI
                    matching_id = None
                    for pid in tui.plan_order:
                        if plan_name in pid:
                            matching_id = pid
                            break

                    if matching_id:
                        tui.set_plan_orchestrator(
                            matching_id,
                            running=True,
                            orchestrator_id=inst.get('id')
                        )
        except (OSError, json.JSONDecodeError):
            pass


def main():
    parser = argparse.ArgumentParser(
        description="Monitor multiple plans running in parallel"
    )
    parser.add_argument(
        "--layout",
        choices=["focus", "split"],
        default="focus",
        help="Layout mode: 'focus' shows one plan large, 'split' shows all side-by-side"
    )
    parser.add_argument(
        "--refresh",
        type=int,
        default=4,
        help="Refresh rate in Hz (default: 4)"
    )
    parser.add_argument(
        "--no-registry",
        action="store_true",
        help="Don't scan orchestrator registry for running instances"
    )
    parser.add_argument(
        "--plan",
        type=str,
        action="append",
        dest="plans",
        help="Manually add a plan to monitor (can be specified multiple times)"
    )

    args = parser.parse_args()

    if not RICH_AVAILABLE:
        print("Error: Rich library not available. Install with: pip install rich")
        return 1

    project_root = Path.cwd()

    # Create TUI
    tui = MultiPlanTUI(
        layout_mode=args.layout,
        refresh_rate=args.refresh
    )

    # Create status monitor
    monitor = MultiPlanStatusMonitor(tui, interval=0.5)

    # Scan and populate
    if not args.no_registry:
        scan_and_populate_tui(tui, monitor, project_root)

    # Add manually specified plans
    if args.plans:
        for plan_path in args.plans:
            plan_name = Path(plan_path).stem
            plan_id = f"manual:{plan_name}"
            tui.add_plan(
                plan_id=plan_id,
                plan_name=plan_name,
                plan_path=plan_path
            )

            status_path = get_status_path(plan_path, project_root)
            if os.path.exists(status_path):
                monitor.add_plan_monitor(plan_id, status_path)

                try:
                    with open(status_path, 'r') as f:
                        status_data = json.load(f)
                    tui.update_plan(plan_id, status_data)
                except (OSError, json.JSONDecodeError):
                    pass

    if not tui.plan_order:
        print("No active plans found.")
        print("")
        print("To start monitoring plans:")
        print("  1. Set an active plan: /plan:set <plan-name>")
        print("  2. Or create a worktree: /plan:worktree create <plan-name>")
        print("  3. Or specify a plan: python scripts/multi_plan_monitor.py --plan <path>")
        return 0

    # Set up signal handler
    def handle_signal(signum, frame):
        tui.set_status("Shutting down...")
        monitor.stop()
        tui.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    # Start TUI and monitor
    tui.set_status("Monitoring active plans...")
    tui.start()
    monitor.start()

    # Keep running until interrupted
    try:
        while True:
            time.sleep(1)

            # Periodically re-scan registry for new orchestrators
            if not args.no_registry:
                registry_path = project_root / ".claude" / "orchestrator-registry.json"
                if registry_path.exists():
                    try:
                        with open(registry_path, 'r') as f:
                            registry = json.load(f)

                        for inst in registry.get('instances', []):
                            if inst.get('status') == 'running':
                                plan_path = inst.get('plan_path', '')
                                plan_name = Path(plan_path).stem if plan_path else 'unknown'

                                # Update orchestrator status
                                for pid in tui.plan_order:
                                    if plan_name in pid:
                                        tui.set_plan_orchestrator(
                                            pid,
                                            running=True,
                                            orchestrator_id=inst.get('id')
                                        )
                                        break
                    except (OSError, json.JSONDecodeError):
                        pass

    except KeyboardInterrupt:
        pass
    finally:
        monitor.stop()
        tui.stop()

    return 0


if __name__ == "__main__":
    sys.exit(main())
