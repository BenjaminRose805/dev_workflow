#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Plan TUI for Parallel Plan Execution.

This module provides a Rich-based TUI for monitoring multiple plans
running in parallel across different worktrees.

Features:
- Task 7.1: Multi-pane layout for parallel plans (split view + tabs)
- Task 7.2: Plan selector/switcher panel (Tab, number keys)
- Task 7.3: Per-plan activity feeds
- Task 7.4: Aggregate progress bar across all plans
- Task 7.5: Keyboard navigation between plan panes
- Task 7.6: Launch new plan from TUI (n key)
- Task 7.7: Stop individual plans from TUI (s/x keys)

Keyboard Shortcuts:
- Tab / Shift+Tab: Cycle through plans
- 1-9: Jump to plan by number
- h/l or Left/Right: Switch plans
- n: Launch new plan (opens selection dialog)
- s: Stop plan (opens selection dialog)
- x: Stop currently focused plan's orchestrator
- q: Quit TUI

Usage:
    from scripts.lib.multi_plan_tui import MultiPlanTUI

    tui = MultiPlanTUI()
    tui.start()
    tui.add_plan('plan-1', status_data)
    tui.update_plan('plan-1', new_status_data)
    tui.stop()

    # Launch a new plan
    success, msg = tui.launch_plan('/path/to/plan.md')

    # Stop a running plan
    success, msg = tui.stop_plan('plan-id')
"""

import json
import os
import signal
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

# Rich library imports (required for TUI)
try:
    from rich.console import Console
    from rich.layout import Layout
    from rich.live import Live
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.style import Style
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class PlanActivity:
    """Represents a single activity in a plan."""
    timestamp: datetime
    description: str
    status: str = "started"  # started, completed, failed
    duration_seconds: float = 0.0


@dataclass
class PlanState:
    """Represents the state of a single plan."""
    plan_id: str
    plan_name: str
    plan_path: str
    worktree_path: Optional[str] = None

    # Progress
    total_tasks: int = 0
    completed_tasks: int = 0
    pending_tasks: int = 0
    in_progress_tasks: int = 0
    failed_tasks: int = 0
    current_phase: str = ""
    percentage: int = 0

    # Orchestrator
    orchestrator_running: bool = False
    orchestrator_id: Optional[str] = None
    iteration: int = 0
    max_iterations: int = 50

    # Activities (per-plan feed)
    activities: deque = field(default_factory=lambda: deque(maxlen=50))

    # Timing
    started_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None

    def add_activity(self, description: str, status: str = "started") -> PlanActivity:
        """Add an activity to this plan's feed."""
        activity = PlanActivity(
            timestamp=datetime.now(),
            description=description,
            status=status
        )
        self.activities.append(activity)
        self.last_updated = datetime.now()
        return activity

    def get_recent_activities(self, count: int = 5) -> List[PlanActivity]:
        """Get the most recent activities."""
        return list(self.activities)[-count:]


# =============================================================================
# Task 7.1: Multi-Pane TUI Layout
# =============================================================================

class MultiPlanTUI:
    """
    Multi-plan TUI for monitoring parallel plan execution.

    Layout modes:
    - 'split': Show 2-3 plans side by side
    - 'tabs': Show one plan at a time with tab navigation
    - 'focus': Focus on one plan with mini-view of others

    Keyboard navigation (Task 7.5):
    - Tab / Shift+Tab: Cycle through plans
    - 1-9: Jump to plan by number
    - h/l or Left/Right: Switch plans
    - j/k or Up/Down: Scroll activity feed
    - q: Quit
    - r: Refresh
    """

    def __init__(
        self,
        layout_mode: str = "focus",
        max_visible_plans: int = 3,
        refresh_rate: int = 4
    ):
        if not RICH_AVAILABLE:
            raise RuntimeError("Rich library not available. Install with: pip install rich")

        self.console = Console()
        self.layout_mode = layout_mode
        self.max_visible_plans = max_visible_plans
        self.refresh_rate = refresh_rate

        # Plan management
        self.plans: Dict[str, PlanState] = {}
        self.plan_order: List[str] = []  # Ordered list of plan IDs
        self.active_plan_index: int = 0  # Currently focused plan (Task 7.2)

        # Aggregate stats (Task 7.4)
        self.aggregate_total: int = 0
        self.aggregate_completed: int = 0
        self.aggregate_in_progress: int = 0
        self.aggregate_failed: int = 0

        # UI state
        self.status_message: str = "Initializing..."
        self.start_time: float = time.time()
        self._lock = threading.Lock()

        # Heartbeat animation
        self._heartbeat_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        self._heartbeat_index = 0

        # Keyboard handler (Task 7.5)
        self._key_handlers: Dict[str, Callable] = {}
        self._setup_key_handlers()

        # Task 7.6/7.7: Plan selection mode
        self._plan_selection_mode: bool = False
        self._plan_selection_list: List[Dict] = []
        self._plan_selection_index: int = 0
        self._plan_selection_action: str = ''  # 'launch' or 'stop'

        # Rich live display
        self.layout: Optional[Layout] = None
        self.live: Optional[Live] = None

    # =========================================================================
    # Task 7.2: Plan Selector/Switcher
    # =========================================================================

    def add_plan(
        self,
        plan_id: str,
        plan_name: str,
        plan_path: str,
        worktree_path: Optional[str] = None
    ) -> PlanState:
        """Add a plan to the TUI."""
        with self._lock:
            plan = PlanState(
                plan_id=plan_id,
                plan_name=plan_name,
                plan_path=plan_path,
                worktree_path=worktree_path,
                started_at=datetime.now()
            )
            self.plans[plan_id] = plan
            if plan_id not in self.plan_order:
                self.plan_order.append(plan_id)
            self._recalculate_aggregate()
            self.refresh()
            return plan

    def remove_plan(self, plan_id: str):
        """Remove a plan from the TUI."""
        with self._lock:
            if plan_id in self.plans:
                del self.plans[plan_id]
            if plan_id in self.plan_order:
                self.plan_order.remove(plan_id)
                # Adjust active index if needed
                if self.active_plan_index >= len(self.plan_order):
                    self.active_plan_index = max(0, len(self.plan_order) - 1)
            self._recalculate_aggregate()
            self.refresh()

    def update_plan(self, plan_id: str, status_data: Dict):
        """Update a plan's status from status.json data."""
        with self._lock:
            if plan_id not in self.plans:
                return

            plan = self.plans[plan_id]
            summary = status_data.get('summary', {})

            plan.total_tasks = summary.get('totalTasks', 0)
            plan.completed_tasks = summary.get('completed', 0)
            plan.pending_tasks = summary.get('pending', 0)
            plan.in_progress_tasks = summary.get('in_progress', 0)
            plan.failed_tasks = summary.get('failed', 0)
            plan.current_phase = status_data.get('currentPhase', '')
            plan.last_updated = datetime.now()

            # Calculate percentage
            if plan.total_tasks > 0:
                plan.percentage = int((plan.completed_tasks / plan.total_tasks) * 100)
            else:
                plan.percentage = 0

            self._recalculate_aggregate()
            self.refresh()

    def set_plan_orchestrator(
        self,
        plan_id: str,
        running: bool,
        orchestrator_id: Optional[str] = None,
        iteration: int = 0,
        max_iterations: int = 50
    ):
        """Update orchestrator status for a plan."""
        with self._lock:
            if plan_id not in self.plans:
                return

            plan = self.plans[plan_id]
            plan.orchestrator_running = running
            plan.orchestrator_id = orchestrator_id
            plan.iteration = iteration
            plan.max_iterations = max_iterations
            self.refresh()

    def add_plan_activity(self, plan_id: str, description: str, status: str = "started"):
        """Add an activity to a plan's feed (Task 7.3)."""
        with self._lock:
            if plan_id not in self.plans:
                return

            plan = self.plans[plan_id]
            plan.add_activity(description, status)
            self.refresh()

    def select_plan(self, index: int):
        """Select a plan by index (Task 7.2)."""
        with self._lock:
            if 0 <= index < len(self.plan_order):
                self.active_plan_index = index
                self.refresh()

    def select_plan_by_id(self, plan_id: str):
        """Select a plan by ID."""
        with self._lock:
            if plan_id in self.plan_order:
                self.active_plan_index = self.plan_order.index(plan_id)
                self.refresh()

    def next_plan(self):
        """Switch to next plan (Task 7.5)."""
        with self._lock:
            if self.plan_order:
                self.active_plan_index = (self.active_plan_index + 1) % len(self.plan_order)
                self.refresh()

    def prev_plan(self):
        """Switch to previous plan (Task 7.5)."""
        with self._lock:
            if self.plan_order:
                self.active_plan_index = (self.active_plan_index - 1) % len(self.plan_order)
                self.refresh()

    def get_active_plan(self) -> Optional[PlanState]:
        """Get the currently active/focused plan."""
        with self._lock:
            if self.plan_order and 0 <= self.active_plan_index < len(self.plan_order):
                plan_id = self.plan_order[self.active_plan_index]
                return self.plans.get(plan_id)
            return None

    # =========================================================================
    # Task 7.4: Aggregate Progress
    # =========================================================================

    def _recalculate_aggregate(self):
        """Recalculate aggregate stats across all plans."""
        self.aggregate_total = sum(p.total_tasks for p in self.plans.values())
        self.aggregate_completed = sum(p.completed_tasks for p in self.plans.values())
        self.aggregate_in_progress = sum(p.in_progress_tasks for p in self.plans.values())
        self.aggregate_failed = sum(p.failed_tasks for p in self.plans.values())

    def get_aggregate_percentage(self) -> int:
        """Get the aggregate completion percentage."""
        if self.aggregate_total > 0:
            return int((self.aggregate_completed / self.aggregate_total) * 100)
        return 0

    # =========================================================================
    # Task 7.5: Keyboard Navigation
    # =========================================================================

    def _setup_key_handlers(self):
        """Set up keyboard handlers for navigation."""
        self._key_handlers = {
            'tab': self.next_plan,
            'shift+tab': self.prev_plan,
            'l': self.next_plan,
            'h': self.prev_plan,
            'right': self.next_plan,
            'left': self.prev_plan,
            '1': lambda: self.select_plan(0),
            '2': lambda: self.select_plan(1),
            '3': lambda: self.select_plan(2),
            '4': lambda: self.select_plan(3),
            '5': lambda: self.select_plan(4),
            '6': lambda: self.select_plan(5),
            '7': lambda: self.select_plan(6),
            '8': lambda: self.select_plan(7),
            '9': lambda: self.select_plan(8),
            # Task 7.6: Launch new plan
            'n': self._prompt_launch_plan,
            # Task 7.7: Stop plan
            's': self._prompt_stop_plan,
            'x': self._stop_active_plan,
        }

    def handle_key(self, key: str):
        """Handle a keyboard input."""
        key_lower = key.lower()

        # Handle selection mode navigation
        if self._plan_selection_mode:
            if key_lower in ('up', 'k'):
                self._selection_prev()
            elif key_lower in ('down', 'j'):
                self._selection_next()
            elif key_lower in ('enter', 'return', '\r', '\n'):
                self._selection_confirm()
            elif key_lower in ('escape', 'esc', 'q'):
                self._selection_cancel()
            return

        # Normal mode key handling
        if key_lower in self._key_handlers:
            self._key_handlers[key_lower]()

    def _selection_prev(self):
        """Move selection up."""
        with self._lock:
            if self._plan_selection_list:
                self._plan_selection_index = (self._plan_selection_index - 1) % len(self._plan_selection_list)
                self.refresh()

    def _selection_next(self):
        """Move selection down."""
        with self._lock:
            if self._plan_selection_list:
                self._plan_selection_index = (self._plan_selection_index + 1) % len(self._plan_selection_list)
                self.refresh()

    def _selection_confirm(self):
        """Confirm the current selection."""
        with self._lock:
            if not self._plan_selection_list:
                return

            selected = self._plan_selection_list[self._plan_selection_index]
            action = self._plan_selection_action

        if action == 'launch':
            self._confirm_launch_plan(selected)
        elif action == 'stop':
            self._confirm_stop_plan(selected)

    def _selection_cancel(self):
        """Cancel selection mode."""
        with self._lock:
            self._plan_selection_mode = False
            self._plan_selection_list = []
            self._plan_selection_index = 0
            self._plan_selection_action = ''
            self.set_status("Selection cancelled")

    # =========================================================================
    # Task 7.6: Launch New Plan from TUI
    # =========================================================================

    def get_available_plans(self) -> List[Dict]:
        """
        Scan for available plan files that can be launched.

        Returns a list of dicts with:
        - path: full path to plan file
        - name: plan name (filename without .md)
        - is_running: whether this plan has an active orchestrator
        - worktree_path: worktree path if running in worktree
        """
        available = []

        # Get project root
        script_dir = Path(__file__).parent
        project_root = script_dir.parent.parent

        # Scan docs/plans/ directory
        plans_dir = project_root / "docs" / "plans"
        if plans_dir.exists():
            for plan_file in plans_dir.glob("*.md"):
                # Skip non-plan files like README, EXECUTION-ORDER
                if plan_file.name.startswith("README") or plan_file.name.startswith("EXECUTION"):
                    continue

                plan_name = plan_file.stem
                plan_path = str(plan_file)

                # Check if this plan is already running
                is_running = False
                worktree_path = None

                for pid, plan in self.plans.items():
                    if plan_name in plan.plan_path or plan_name == plan.plan_name:
                        is_running = plan.orchestrator_running
                        worktree_path = plan.worktree_path
                        break

                available.append({
                    'path': plan_path,
                    'name': plan_name,
                    'is_running': is_running,
                    'worktree_path': worktree_path
                })

        # Sort by name
        available.sort(key=lambda x: x['name'])
        return available

    def launch_plan(
        self,
        plan_path: str,
        worktree: bool = False,
        max_iterations: int = 50,
        batch_size: int = 5
    ) -> Tuple[bool, str]:
        """
        Launch a new plan orchestrator in daemon mode.

        Args:
            plan_path: Path to the plan file
            worktree: If True, create a worktree for this plan
            max_iterations: Max iterations for orchestrator
            batch_size: Tasks per iteration

        Returns:
            Tuple of (success, message)
        """
        try:
            # Get project root
            script_dir = Path(__file__).parent
            project_root = script_dir.parent.parent

            # Build command
            cmd = [
                sys.executable,  # Python interpreter
                str(project_root / "scripts" / "plan_orchestrator.py"),
                "--plan", plan_path,
                "--max-iterations", str(max_iterations),
                "--batch-size", str(batch_size),
                "--daemon",  # Run in background
                "--continue",  # Skip confirmation prompt
            ]

            # Add worktree flag if requested
            if worktree:
                plan_name = Path(plan_path).stem
                worktree_path = project_root / "worktrees" / f"plan-{plan_name}"
                cmd.extend(["--worktree", str(worktree_path)])

            # Launch the process
            subprocess.Popen(
                cmd,
                cwd=str(project_root),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True  # Detach from parent
            )

            plan_name = Path(plan_path).stem
            return True, f"Launched orchestrator for {plan_name}"

        except Exception as e:
            return False, f"Failed to launch: {str(e)}"

    def _prompt_launch_plan(self):
        """
        Prompt user to select a plan to launch.

        Sets the TUI into plan selection mode.
        """
        # Get available plans
        available = self.get_available_plans()

        if not available:
            self.set_status("No plans found in docs/plans/")
            return

        # Filter to non-running plans
        launchable = [p for p in available if not p['is_running']]

        if not launchable:
            self.set_status("All plans already have orchestrators running")
            return

        # Store for selection
        with self._lock:
            self._plan_selection_mode = True
            self._plan_selection_list = launchable
            self._plan_selection_index = 0
            self._plan_selection_action = 'launch'
            self.refresh()

    def _confirm_launch_plan(self, plan_info: Dict):
        """
        Actually launch the selected plan.
        """
        success, message = self.launch_plan(plan_info['path'])

        if success:
            self.set_status(f"✓ {message}")

            # Add the plan to TUI
            plan_name = plan_info['name']
            self.add_plan(
                plan_id=f"orch:{plan_name}",
                plan_name=plan_name,
                plan_path=plan_info['path']
            )
        else:
            self.set_status(f"✗ {message}")

        # Exit selection mode
        with self._lock:
            self._plan_selection_mode = False
            self.refresh()

    # =========================================================================
    # Task 7.7: Stop Individual Plans from TUI
    # =========================================================================

    def stop_plan(self, plan_id: str, force: bool = False) -> Tuple[bool, str]:
        """
        Stop an orchestrator for a specific plan.

        Args:
            plan_id: ID of the plan in the TUI
            force: If True, force kill the process

        Returns:
            Tuple of (success, message)
        """
        with self._lock:
            if plan_id not in self.plans:
                return False, f"Plan not found: {plan_id}"

            plan = self.plans[plan_id]

            if not plan.orchestrator_running:
                return False, f"Plan {plan.plan_name} is not running"

            if not plan.orchestrator_id:
                return False, f"No orchestrator ID for plan {plan.plan_name}"

        try:
            # Try to stop via IPC using the orchestrator CLI
            script_dir = Path(__file__).parent
            project_root = script_dir.parent.parent

            cmd = [
                sys.executable,
                str(project_root / "scripts" / "plan_orchestrator.py"),
                "--stop", plan.orchestrator_id
            ]

            if force:
                cmd.append("--force")

            result = subprocess.run(
                cmd,
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                # Update TUI state
                with self._lock:
                    plan.orchestrator_running = False
                    plan.add_activity("Orchestrator stopped", status="completed")
                    self.refresh()
                return True, f"Stopped orchestrator for {plan.plan_name}"
            else:
                return False, f"Stop failed: {result.stderr or result.stdout}"

        except subprocess.TimeoutExpired:
            return False, "Stop command timed out"
        except Exception as e:
            return False, f"Stop failed: {str(e)}"

    def stop_plan_by_pid(self, plan_id: str) -> Tuple[bool, str]:
        """
        Stop an orchestrator by killing its PID directly.

        Fallback when IPC is not available.
        """
        with self._lock:
            if plan_id not in self.plans:
                return False, f"Plan not found: {plan_id}"

            plan = self.plans[plan_id]

        # Try to find PID from registry
        try:
            script_dir = Path(__file__).parent
            project_root = script_dir.parent.parent
            registry_path = project_root / ".claude" / "orchestrator-registry.json"

            if registry_path.exists():
                with open(registry_path, 'r') as f:
                    registry = json.load(f)

                for inst in registry.get('instances', []):
                    if inst.get('id') == plan.orchestrator_id or \
                       Path(inst.get('plan_path', '')).stem == plan.plan_name:
                        pid = inst.get('pid')
                        if pid:
                            try:
                                os.kill(pid, signal.SIGTERM)
                                # Update TUI state
                                with self._lock:
                                    plan.orchestrator_running = False
                                    plan.add_activity("Orchestrator terminated", status="completed")
                                    self.refresh()
                                return True, f"Sent SIGTERM to PID {pid}"
                            except (OSError, ProcessLookupError):
                                return False, f"Process {pid} not found"

            return False, "Could not find orchestrator PID"

        except Exception as e:
            return False, f"Failed to stop by PID: {str(e)}"

    def _prompt_stop_plan(self):
        """
        Prompt user to select a plan to stop.
        """
        # Get running plans
        with self._lock:
            running = [
                {'id': pid, 'name': p.plan_name, 'orch_id': p.orchestrator_id}
                for pid, p in self.plans.items()
                if p.orchestrator_running
            ]

        if not running:
            self.set_status("No running orchestrators to stop")
            return

        # Store for selection
        with self._lock:
            self._plan_selection_mode = True
            self._plan_selection_list = running
            self._plan_selection_index = 0
            self._plan_selection_action = 'stop'
            self.refresh()

    def _stop_active_plan(self):
        """
        Stop the currently focused plan's orchestrator.
        """
        active = self.get_active_plan()
        if not active:
            self.set_status("No active plan selected")
            return

        if not active.orchestrator_running:
            self.set_status(f"Plan {active.plan_name} is not running")
            return

        # Find the plan_id
        with self._lock:
            plan_id = None
            for pid, p in self.plans.items():
                if p == active:
                    plan_id = pid
                    break

        if plan_id:
            success, message = self.stop_plan(plan_id)
            self.set_status(f"{'✓' if success else '✗'} {message}")

    def _confirm_stop_plan(self, plan_info: Dict):
        """
        Actually stop the selected plan.
        """
        success, message = self.stop_plan(plan_info['id'])

        if success:
            self.set_status(f"✓ {message}")
        else:
            # Try by PID as fallback
            success2, message2 = self.stop_plan_by_pid(plan_info['id'])
            if success2:
                self.set_status(f"✓ {message2}")
            else:
                self.set_status(f"✗ {message}")

        # Exit selection mode
        with self._lock:
            self._plan_selection_mode = False
            self.refresh()

    # =========================================================================
    # Layout Rendering (Task 7.1)
    # =========================================================================

    def _create_layout(self) -> Layout:
        """Create the multi-plan TUI layout."""
        layout = Layout()

        # Main structure:
        # ┌─────────────────────────────────────────────────────────────────┐
        # │ Header: Aggregate progress + plan selector tabs                 │
        # ├─────────────────────────────────────────────────────────────────┤
        # │ Main content area (depends on layout_mode)                      │
        # │ - split: 2-3 plan panes side by side                           │
        # │ - focus: large focused plan + mini sidebar                     │
        # ├─────────────────────────────────────────────────────────────────┤
        # │ Footer: Status + keyboard shortcuts                             │
        # └─────────────────────────────────────────────────────────────────┘

        layout.split(
            Layout(name="header", size=6),
            Layout(name="main"),
            Layout(name="footer", size=2)
        )

        return layout

    def _render_header(self) -> Panel:
        """Render header with aggregate progress and plan tabs."""
        header_text = Text()

        # Title
        header_text.append("MULTI-PLAN ORCHESTRATOR\n", style="bold cyan")

        # Aggregate progress bar (Task 7.4)
        agg_pct = self.get_aggregate_percentage()
        bar_width = 40
        filled = int(bar_width * agg_pct / 100)
        bar = "█" * filled + "░" * (bar_width - filled)

        header_text.append(f"Overall: [{bar}] ", style="green")
        header_text.append(f"{agg_pct}%", style="bold green")
        header_text.append(f"  ({self.aggregate_completed}/{self.aggregate_total} tasks)\n", style="dim")

        # Running orchestrators
        running_count = sum(1 for p in self.plans.values() if p.orchestrator_running)
        header_text.append(f"Plans: {len(self.plans)}", style="dim")
        header_text.append(f"  |  Running: {running_count}", style="cyan" if running_count > 0 else "dim")
        header_text.append(f"  |  In Progress: {self.aggregate_in_progress}", style="yellow")
        if self.aggregate_failed > 0:
            header_text.append(f"  |  Failed: {self.aggregate_failed}", style="red")
        header_text.append("\n")

        # Plan selector tabs (Task 7.2)
        header_text.append("Plans: ", style="dim")
        for i, plan_id in enumerate(self.plan_order):
            plan = self.plans.get(plan_id)
            if not plan:
                continue

            # Truncate plan name
            name = plan.plan_name
            if len(name) > 20:
                name = name[:17] + "..."

            # Style based on selection and status
            if i == self.active_plan_index:
                style = "bold reverse white"
            elif plan.orchestrator_running:
                style = "cyan"
            elif plan.failed_tasks > 0:
                style = "red"
            else:
                style = "dim"

            # Status indicator
            if plan.orchestrator_running:
                indicator = "●"
            elif plan.percentage == 100:
                indicator = "✓"
            elif plan.failed_tasks > 0:
                indicator = "✗"
            else:
                indicator = "○"

            header_text.append(f" [{i+1}]{indicator}{name}", style=style)

            if i < len(self.plan_order) - 1:
                header_text.append(" |", style="dim")

        return Panel(header_text, border_style="cyan")

    def _render_plan_pane(self, plan: PlanState, is_active: bool, compact: bool = False) -> Panel:
        """Render a single plan pane."""
        content = Text()

        # Plan name and status
        status_icon = "●" if plan.orchestrator_running else "○"
        color = "cyan" if plan.orchestrator_running else "dim"
        content.append(f"{status_icon} ", style=color)
        content.append(f"{plan.plan_name}\n", style="bold" if is_active else "")

        # Progress bar
        bar_width = 30 if compact else 40
        filled = int(bar_width * plan.percentage / 100)
        bar = "█" * filled + "░" * (bar_width - filled)

        pct_style = "green" if plan.percentage == 100 else "yellow" if plan.percentage > 0 else "dim"
        content.append(f"[{bar}] ", style=pct_style)
        content.append(f"{plan.percentage}%\n", style=f"bold {pct_style}")

        if not compact:
            # Task counts
            content.append(f"Tasks: {plan.completed_tasks}/{plan.total_tasks}", style="dim")
            if plan.in_progress_tasks > 0:
                content.append(f"  Working: {plan.in_progress_tasks}", style="cyan")
            if plan.failed_tasks > 0:
                content.append(f"  Failed: {plan.failed_tasks}", style="red")
            content.append("\n")

            # Current phase
            if plan.current_phase:
                phase_text = plan.current_phase
                if len(phase_text) > 40:
                    phase_text = phase_text[:37] + "..."
                content.append(f"Phase: {phase_text}\n", style="yellow")

            # Orchestrator info
            if plan.orchestrator_running:
                content.append(f"Iteration: {plan.iteration}/{plan.max_iterations}", style="dim")
                self._heartbeat_index = (self._heartbeat_index + 1) % len(self._heartbeat_chars)
                spinner = self._heartbeat_chars[self._heartbeat_index]
                content.append(f"  {spinner}\n", style="cyan")
            content.append("\n")

            # Activity feed (Task 7.3)
            content.append("Recent Activity:\n", style="dim")
            activities = plan.get_recent_activities(4)
            if activities:
                for activity in reversed(activities):
                    time_str = activity.timestamp.strftime("%H:%M:%S")
                    status_mark = "✓" if activity.status == "completed" else "..."
                    desc = activity.description
                    if len(desc) > 50:
                        desc = desc[:47] + "..."
                    content.append(f"  [{time_str}] {status_mark} {desc}\n", style="dim")
            else:
                content.append("  [No activity yet]\n", style="dim")

        # Border style
        border_style = "green" if is_active else "dim"
        if plan.orchestrator_running and is_active:
            border_style = "cyan"

        # Title with worktree indicator
        title = plan.plan_name
        if plan.worktree_path:
            title = f"⑂ {title}"
        if len(title) > 30:
            title = title[:27] + "..."

        return Panel(content, title=title, border_style=border_style)

    def _render_main_focus(self) -> Layout:
        """Render main area in focus mode (one large + sidebar)."""
        main_layout = Layout()

        if not self.plan_order:
            # No plans
            return Panel(Text("No plans active\n\nAdd a plan with: tui.add_plan(...)"), border_style="dim")

        # Get active plan
        active_plan_id = self.plan_order[self.active_plan_index]
        active_plan = self.plans.get(active_plan_id)

        if len(self.plan_order) == 1:
            # Single plan - full width
            if active_plan:
                return self._render_plan_pane(active_plan, is_active=True)
            return Panel(Text("Loading..."), border_style="dim")

        # Multiple plans - focus view with sidebar
        main_layout.split_row(
            Layout(name="focus", ratio=3),
            Layout(name="sidebar", ratio=1)
        )

        # Focused plan (large)
        if active_plan:
            main_layout["focus"].update(self._render_plan_pane(active_plan, is_active=True))

        # Sidebar with other plans (compact)
        sidebar_content = Layout()
        other_plans = [(i, self.plans.get(pid)) for i, pid in enumerate(self.plan_order)
                       if pid != active_plan_id and self.plans.get(pid)]

        if other_plans:
            # Create vertical split for other plans
            sidebar_layouts = []
            for i, (idx, plan) in enumerate(other_plans[:4]):  # Max 4 in sidebar
                mini_pane = self._render_plan_pane(plan, is_active=False, compact=True)
                sidebar_layouts.append(mini_pane)

            # Stack them vertically
            if len(sidebar_layouts) == 1:
                sidebar_content = sidebar_layouts[0]
            else:
                sidebar_content = Layout()
                sidebar_content.split(*[Layout(ratio=1) for _ in sidebar_layouts])
                for i, pane in enumerate(sidebar_layouts):
                    list(sidebar_content.children)[i].update(pane)
        else:
            sidebar_content = Panel(Text("No other plans"), border_style="dim")

        main_layout["sidebar"].update(sidebar_content)

        return main_layout

    def _render_main_split(self) -> Layout:
        """Render main area in split mode (side-by-side plans)."""
        main_layout = Layout()

        if not self.plan_order:
            return Panel(Text("No plans active"), border_style="dim")

        # Show up to max_visible_plans side by side
        visible_plans = self.plan_order[:self.max_visible_plans]

        if len(visible_plans) == 1:
            plan = self.plans.get(visible_plans[0])
            if plan:
                return self._render_plan_pane(plan, is_active=True)
            return Panel(Text("Loading..."), border_style="dim")

        # Split into columns
        main_layout.split_row(*[Layout(ratio=1) for _ in visible_plans])

        for i, (layout_child, plan_id) in enumerate(zip(main_layout.children, visible_plans)):
            plan = self.plans.get(plan_id)
            if plan:
                is_active = (i == self.active_plan_index)
                layout_child.update(self._render_plan_pane(plan, is_active=is_active))

        return main_layout

    def _render_footer(self) -> Panel:
        """Render footer with status and keyboard shortcuts."""
        footer_text = Text()

        # Status message
        footer_text.append(f"STATUS: ", style="dim")
        footer_text.append(f"{self.status_message}", style="cyan")

        # Elapsed time
        elapsed = time.time() - self.start_time
        elapsed_str = time.strftime("%H:%M:%S", time.gmtime(elapsed))
        footer_text.append(f"  |  Elapsed: {elapsed_str}", style="dim")

        # Keyboard shortcuts - different for selection mode vs normal mode
        footer_text.append(f"  |  ", style="dim")

        if self._plan_selection_mode:
            footer_text.append("j/k", style="bold")
            footer_text.append(":nav ", style="dim")
            footer_text.append("Enter", style="bold")
            footer_text.append(":confirm ", style="dim")
            footer_text.append("Esc", style="bold")
            footer_text.append(":cancel", style="dim")
        else:
            footer_text.append("Tab", style="bold")
            footer_text.append(":switch ", style="dim")
            footer_text.append("1-9", style="bold")
            footer_text.append(":select ", style="dim")
            footer_text.append("n", style="bold cyan")
            footer_text.append(":new ", style="dim")
            footer_text.append("s/x", style="bold red")
            footer_text.append(":stop ", style="dim")
            footer_text.append("q", style="bold")
            footer_text.append(":quit", style="dim")

        return Panel(footer_text, border_style="dim")

    def update_layout(self):
        """Update all layout sections."""
        if not self.layout:
            return

        self.layout["header"].update(self._render_header())

        # Task 7.6/7.7: Show selection dialog when in selection mode
        if self._plan_selection_mode:
            self.layout["main"].update(self._render_selection_dialog())
        elif self.layout_mode == "split":
            self.layout["main"].update(self._render_main_split())
        else:  # focus mode (default)
            self.layout["main"].update(self._render_main_focus())

        self.layout["footer"].update(self._render_footer())

    def _render_selection_dialog(self) -> Panel:
        """Render the plan selection dialog (Task 7.6/7.7)."""
        content = Text()

        # Title based on action
        if self._plan_selection_action == 'launch':
            content.append("LAUNCH NEW PLAN\n\n", style="bold cyan")
            content.append("Select a plan to start:\n\n", style="dim")
        elif self._plan_selection_action == 'stop':
            content.append("STOP PLAN\n\n", style="bold red")
            content.append("Select an orchestrator to stop:\n\n", style="dim")

        # List items
        for i, item in enumerate(self._plan_selection_list):
            is_selected = (i == self._plan_selection_index)

            # Selection indicator
            indicator = "▶ " if is_selected else "  "
            style = "bold reverse" if is_selected else ""

            # Item name
            name = item.get('name', 'Unknown')
            if len(name) > 40:
                name = name[:37] + "..."

            content.append(f"{indicator}", style="cyan" if is_selected else "dim")
            content.append(f"{name}\n", style=style)

            # Show path if launching
            if self._plan_selection_action == 'launch':
                path = item.get('path', '')
                if path and len(path) > 60:
                    path = "..." + path[-57:]
                content.append(f"    {path}\n", style="dim")

        content.append("\n")

        # Instructions
        content.append("↑/k", style="bold")
        content.append(" up  ", style="dim")
        content.append("↓/j", style="bold")
        content.append(" down  ", style="dim")
        content.append("Enter", style="bold")
        content.append(" confirm  ", style="dim")
        content.append("Esc/q", style="bold")
        content.append(" cancel", style="dim")

        border_style = "cyan" if self._plan_selection_action == 'launch' else "red"
        title = "Launch Plan" if self._plan_selection_action == 'launch' else "Stop Plan"

        return Panel(content, title=title, border_style=border_style)

    # =========================================================================
    # Lifecycle
    # =========================================================================

    def start(self):
        """Start the live TUI display."""
        self.layout = self._create_layout()
        self.update_layout()
        self.live = Live(
            self.layout,
            console=self.console,
            refresh_per_second=self.refresh_rate,
            screen=False
        )
        self.live.start()

    def stop(self):
        """Stop the live TUI display."""
        if self.live:
            self.live.stop()
            self.live = None

    def refresh(self):
        """Refresh the display."""
        with self._lock:
            try:
                self.update_layout()
                if self.live:
                    self.live.update(self.layout)
            except Exception:
                pass  # Don't crash on display errors

    def set_status(self, message: str):
        """Set the status message."""
        self.status_message = message
        self.refresh()

    def set_layout_mode(self, mode: str):
        """Change the layout mode ('focus' or 'split')."""
        if mode in ('focus', 'split'):
            self.layout_mode = mode
            self.refresh()


# =============================================================================
# Multi-Plan Status Monitor
# =============================================================================

class MultiPlanStatusMonitor:
    """
    Monitors multiple plans' status.json files and updates the TUI.

    Integrates with the orchestrator registry to discover running plans.
    """

    def __init__(self, tui: MultiPlanTUI, interval: float = 1.0):
        self.tui = tui
        self.interval = interval
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._monitored_paths: Dict[str, str] = {}  # plan_id -> status.json path

    def add_plan_monitor(self, plan_id: str, status_path: str):
        """Add a status.json path to monitor."""
        self._monitored_paths[plan_id] = status_path

    def remove_plan_monitor(self, plan_id: str):
        """Stop monitoring a plan."""
        if plan_id in self._monitored_paths:
            del self._monitored_paths[plan_id]

    def start(self):
        """Start the monitoring thread."""
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the monitoring thread."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None

    def _monitor_loop(self):
        """Main monitoring loop."""
        last_mtimes: Dict[str, float] = {}

        while not self._stop_event.is_set():
            for plan_id, status_path in list(self._monitored_paths.items()):
                try:
                    if not os.path.exists(status_path):
                        continue

                    # Check if file was modified
                    mtime = os.path.getmtime(status_path)
                    if plan_id in last_mtimes and mtime == last_mtimes[plan_id]:
                        continue

                    last_mtimes[plan_id] = mtime

                    # Load and update
                    with open(status_path, 'r') as f:
                        status_data = json.load(f)

                    self.tui.update_plan(plan_id, status_data)

                except (OSError, json.JSONDecodeError):
                    pass  # Ignore errors, will retry next interval

            self._stop_event.wait(self.interval)


# =============================================================================
# Factory Function
# =============================================================================

def create_multi_plan_tui_from_registry() -> MultiPlanTUI:
    """
    Create a MultiPlanTUI populated from the orchestrator registry.

    Scans:
    - Main repo plan
    - Worktree plans
    - Running orchestrators

    Returns a TUI instance ready to start().
    """
    tui = MultiPlanTUI()

    # Get project root (assuming we're in scripts/lib/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent

    # 1. Check main repo plan
    main_plan_ptr = project_root / ".claude" / "current-plan.txt"
    if main_plan_ptr.exists():
        try:
            plan_path = main_plan_ptr.read_text().strip()
            if plan_path:
                plan_name = Path(plan_path).stem
                tui.add_plan(
                    plan_id=f"main:{plan_name}",
                    plan_name=plan_name,
                    plan_path=plan_path
                )
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
                            tui.add_plan(
                                plan_id=f"worktree:{entry.name}",
                                plan_name=plan_name,
                                plan_path=plan_path,
                                worktree_path=str(entry)
                            )
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
                    plan_id = inst.get('id', f"orch:{plan_name}")

                    # Check if this plan is already tracked
                    existing_ids = [pid for pid in tui.plan_order
                                    if plan_name in pid]

                    if existing_ids:
                        # Update existing plan with orchestrator info
                        tui.set_plan_orchestrator(
                            existing_ids[0],
                            running=True,
                            orchestrator_id=inst.get('id')
                        )
                    else:
                        # Add new plan
                        tui.add_plan(
                            plan_id=plan_id,
                            plan_name=plan_name,
                            plan_path=plan_path,
                            worktree_path=inst.get('worktree_path')
                        )
                        tui.set_plan_orchestrator(
                            plan_id,
                            running=True,
                            orchestrator_id=inst.get('id')
                        )
        except (OSError, json.JSONDecodeError):
            pass

    return tui


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    'MultiPlanTUI',
    'MultiPlanStatusMonitor',
    'PlanState',
    'PlanActivity',
    'create_multi_plan_tui_from_registry',
    'RICH_AVAILABLE',
]
