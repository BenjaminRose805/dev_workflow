#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extended Panel Types for TUI.

This module provides additional panel components for the TUI:
- PhaseProgressPanel: Displays progress bars for each phase

Usage:
    from scripts.tui.panels import PhaseProgressPanel

    panel = PhaseProgressPanel()
    panel.update_phases(phases_data)
    renderable = panel.render()
"""

import json
import subprocess
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set

try:
    from rich.console import Console, RenderableType
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.progress import Progress, BarColumn, TextColumn
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


@dataclass
class PhaseInfo:
    """Information about a single phase."""
    number: int
    title: str
    total: int
    completed: int
    percentage: int
    status: str  # 'complete', 'in_progress', 'pending'

    @property
    def is_current(self) -> bool:
        """Check if this is the currently active phase."""
        return self.status == 'in_progress' or (
            self.percentage > 0 and self.percentage < 100
        )


class PhaseProgressPanel:
    """
    Panel displaying progress bars for each phase.

    Features:
    - Mini progress bars for each phase
    - Highlights current phase with color
    - Shows completion percentage
    - Compact display for TUI integration
    """

    def __init__(self, plan_path: Optional[str] = None):
        """
        Initialize the phase progress panel.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
        """
        self.plan_path = plan_path
        self.phases: List[PhaseInfo] = []
        self._current_phase: Optional[int] = None
        self._compact = False  # Compact mode for small terminals

    def update_phases(self, phases_data: Optional[List[Dict]] = None):
        """
        Update phase data.

        Args:
            phases_data: List of phase dictionaries, or None to fetch from status-cli
        """
        if phases_data is None:
            phases_data = self._fetch_phases()

        self.phases = []
        for phase in phases_data:
            info = PhaseInfo(
                number=phase.get('number', 0),
                title=phase.get('title', ''),
                total=phase.get('total', 0),
                completed=phase.get('completed', 0),
                percentage=phase.get('percentage', 0),
                status=phase.get('status', 'pending'),
            )
            self.phases.append(info)

            # Track current phase
            if info.is_current:
                self._current_phase = info.number

    def _fetch_phases(self) -> List[Dict]:
        """Fetch phase data from status-cli."""
        try:
            cmd = ['node', 'scripts/status-cli.js', 'phases']
            if self.plan_path:
                cmd.extend(['--plan', self.plan_path])

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                return data.get('phases', [])
        except Exception:
            pass

        return []

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def _get_phase_style(self, phase: PhaseInfo) -> str:
        """Get the style for a phase based on its status."""
        if phase.status == 'complete':
            return 'green'
        elif phase.is_current or phase.status == 'in_progress':
            return 'yellow'
        else:
            return 'dim'

    def _render_progress_bar(self, percentage: int, width: int = 10) -> Text:
        """Render a mini progress bar."""
        filled = int(width * percentage / 100)
        filled = min(filled, width)
        remaining = width - filled

        bar = Text()
        bar.append('█' * filled, style='green')
        bar.append('░' * remaining, style='dim')

        return bar

    def render(self) -> 'RenderableType':
        """Render the phase progress panel."""
        if not RICH_AVAILABLE:
            return "Phase Progress (Rich not available)"

        if not self.phases:
            return Panel(
                Text("[dim]No phase data available[/dim]"),
                title="Phases",
                border_style="blue"
            )

        if self._compact:
            return self._render_compact()
        else:
            return self._render_full()

    def _render_full(self) -> Panel:
        """Render full phase progress display."""
        table = Table(show_header=False, box=None, padding=(0, 1), expand=True)
        table.add_column("Phase", style="white", no_wrap=True, width=3)
        table.add_column("Title", style="white", overflow="ellipsis", ratio=1)
        table.add_column("Progress", no_wrap=True, width=12)
        table.add_column("Pct", style="white", no_wrap=True, justify="right", width=4)

        for phase in self.phases:
            style = self._get_phase_style(phase)
            is_current = phase.is_current

            # Phase number with indicator
            phase_num = f"{phase.number}"
            if is_current:
                phase_num = f"▶{phase.number}"

            # Progress bar
            bar = self._render_progress_bar(phase.percentage, width=10)

            # Percentage
            pct_text = f"{phase.percentage}%"

            # Add row with appropriate styling
            table.add_row(
                Text(phase_num, style=f"bold {style}" if is_current else style),
                Text(phase.title, style=style),
                bar,
                Text(pct_text, style=style),
            )

        # Add summary line
        total_completed = sum(p.completed for p in self.phases)
        total_tasks = sum(p.total for p in self.phases)
        if total_tasks > 0:
            overall_pct = int((total_completed / total_tasks) * 100)
        else:
            overall_pct = 0

        return Panel(
            table,
            title=f"Phases ({total_completed}/{total_tasks} tasks)",
            border_style="blue",
        )

    def _render_compact(self) -> Panel:
        """Render compact phase progress (single row)."""
        text = Text()

        for i, phase in enumerate(self.phases):
            if i > 0:
                text.append(" ", style="dim")

            style = self._get_phase_style(phase)
            is_current = phase.is_current

            # Show phase number and mini indicator
            if phase.status == 'complete':
                text.append(f"P{phase.number}✓", style="green")
            elif is_current:
                text.append(f"P{phase.number}●", style="yellow bold")
            else:
                text.append(f"P{phase.number}○", style="dim")

        return Panel(text, title="Phases", border_style="blue")

    @property
    def current_phase(self) -> Optional[int]:
        """Get the current phase number."""
        return self._current_phase

    def get_phase_info(self, phase_number: int) -> Optional[PhaseInfo]:
        """Get info for a specific phase."""
        for phase in self.phases:
            if phase.number == phase_number:
                return phase
        return None


def create_phase_panel(plan_path: Optional[str] = None) -> PhaseProgressPanel:
    """
    Create and initialize a phase progress panel.

    Args:
        plan_path: Optional path to plan file

    Returns:
        Initialized PhaseProgressPanel with data loaded
    """
    panel = PhaseProgressPanel(plan_path)
    panel.update_phases()
    return panel


@dataclass
class UpcomingTask:
    """Information about an upcoming task."""
    id: str
    description: str
    phase: int
    status: str  # 'pending', 'blocked', 'ready'
    is_verify: bool = False
    dependencies: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)  # Tasks blocking this one
    sequential: bool = False
    sequential_group: Optional[str] = None

    @property
    def is_blocked(self) -> bool:
        """Check if this task has blockers."""
        return len(self.blockers) > 0 or self.status == 'blocked'

    @classmethod
    def from_dict(cls, data: Dict) -> 'UpcomingTask':
        """Create an UpcomingTask from a dictionary (status-cli.js output)."""
        desc = data.get('description', '')
        # Check if this is a VERIFY task
        is_verify = desc.upper().startswith('VERIFY') or 'VERIFY' in data.get('id', '').upper()

        return cls(
            id=data.get('id', ''),
            description=desc,
            phase=data.get('phase', 0),
            status=data.get('status', 'pending'),
            is_verify=is_verify,
            dependencies=data.get('dependencies', []),
            blockers=data.get('blockers', []),
            sequential=data.get('sequential', False),
            sequential_group=data.get('sequentialGroup'),
        )


class UpcomingPanel:
    """
    Panel displaying upcoming/next tasks.

    Features:
    - Shows next N recommended tasks from get_next_tasks()
    - Numbered list with task IDs and truncated descriptions
    - Highlights VERIFY tasks with different color
    - DAG-aware task ordering
    """

    def __init__(self, plan_path: Optional[str] = None, max_tasks: int = 5):
        """
        Initialize the upcoming tasks panel.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
            max_tasks: Maximum number of tasks to display
        """
        self.plan_path = plan_path
        self.max_tasks = max_tasks
        self.tasks: List[UpcomingTask] = []
        self._compact = False  # Compact mode for small terminals

    def update_tasks(self, tasks_data: Optional[List[Dict]] = None):
        """
        Update upcoming tasks data.

        Args:
            tasks_data: List of task dictionaries, or None to fetch from status-cli
        """
        if tasks_data is None:
            tasks_data = self._fetch_next_tasks()

        self.tasks = []
        for task_dict in tasks_data[:self.max_tasks]:
            task = UpcomingTask.from_dict(task_dict)
            self.tasks.append(task)

    def _fetch_next_tasks(self) -> List[Dict]:
        """Fetch next tasks from status-cli."""
        try:
            cmd = ['node', 'scripts/status-cli.js', 'next', str(self.max_tasks)]
            if self.plan_path:
                cmd.insert(2, '--plan')
                cmd.insert(3, self.plan_path)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                return data.get('tasks', [])
        except Exception:
            pass

        return []

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def _truncate_description(self, desc: str, max_len: int = 40) -> str:
        """Truncate description for display."""
        if len(desc) <= max_len:
            return desc
        return desc[:max_len - 3] + "..."

    def _get_task_style(self, task: UpcomingTask) -> str:
        """Get the style for a task based on its type and status."""
        if task.is_blocked:
            return 'dim'  # Dim blocked tasks
        elif task.is_verify:
            return 'magenta bold'  # VERIFY tasks in magenta
        elif task.status == 'blocked':
            return 'dim'
        elif task.sequential:
            return 'cyan'  # Sequential tasks in cyan
        else:
            return 'white'

    def _get_status_indicator(self, task: UpcomingTask) -> str:
        """Get a status indicator for the task."""
        if task.is_blocked:
            return '⊘'  # Blocked indicator
        elif task.is_verify:
            return '✓'  # Checkmark for verify
        elif task.status == 'blocked':
            return '⊘'  # Blocked indicator
        elif task.sequential:
            return '→'  # Sequential indicator
        else:
            return '○'  # Ready indicator

    def _get_blocker_text(self, task: UpcomingTask) -> str:
        """Get blocker indicator text for a task."""
        if not task.blockers:
            return ""

        # Show up to 2 blocker IDs, or count if more
        if len(task.blockers) <= 2:
            blocker_text = ", ".join(task.blockers)
        else:
            blocker_text = f"{task.blockers[0]}, +{len(task.blockers) - 1}"

        return f" [Blocked by: {blocker_text}]"

    def render(self) -> 'RenderableType':
        """Render the upcoming tasks panel."""
        if not RICH_AVAILABLE:
            return "Upcoming Tasks (Rich not available)"

        if not self.tasks:
            return Panel(
                Text("[dim]No upcoming tasks[/dim]"),
                title="Upcoming",
                border_style="cyan"
            )

        if self._compact:
            return self._render_compact()
        else:
            return self._render_full()

    def _render_full(self) -> Panel:
        """Render full upcoming tasks display with blocker indicators."""
        table = Table(show_header=False, box=None, padding=(0, 1), expand=True)
        table.add_column("#", style="dim", no_wrap=True, width=2)
        table.add_column("ID", style="white", no_wrap=True, width=5)
        table.add_column("Description", style="white", overflow="ellipsis", ratio=1)

        for idx, task in enumerate(self.tasks, 1):
            style = self._get_task_style(task)
            indicator = self._get_status_indicator(task)
            blocker_text = self._get_blocker_text(task)

            # Number column
            num_text = Text(f"{idx}.", style="dim")

            # Task ID with indicator
            id_text = Text(f"{indicator} {task.id}", style=style)

            # Description with optional blocker indicator
            desc_text = Text()
            desc_text.append(self._truncate_description(task.description), style=style)
            if blocker_text:
                desc_text.append(blocker_text, style="dim blue")

            table.add_row(num_text, id_text, desc_text)

        title = f"Upcoming ({len(self.tasks)})"
        return Panel(
            table,
            title=title,
            border_style="cyan",
        )

    def _render_compact(self) -> Panel:
        """Render compact upcoming tasks (single line summary)."""
        text = Text()

        for idx, task in enumerate(self.tasks):
            if idx > 0:
                text.append(" ", style="dim")

            style = self._get_task_style(task)
            indicator = self._get_status_indicator(task)
            text.append(f"{indicator}{task.id}", style=style)

        return Panel(text, title="Upcoming", border_style="cyan")

    def get_task_by_index(self, index: int) -> Optional[UpcomingTask]:
        """Get task by its display index (1-based)."""
        if 1 <= index <= len(self.tasks):
            return self.tasks[index - 1]
        return None

    def get_task_by_id(self, task_id: str) -> Optional[UpcomingTask]:
        """Get task by its ID."""
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None


def create_upcoming_panel(plan_path: Optional[str] = None, max_tasks: int = 5) -> UpcomingPanel:
    """
    Create and initialize an upcoming tasks panel.

    Args:
        plan_path: Optional path to plan file
        max_tasks: Maximum number of tasks to display

    Returns:
        Initialized UpcomingPanel with data loaded
    """
    panel = UpcomingPanel(plan_path, max_tasks)
    panel.update_tasks()
    return panel


@dataclass
class RunInfo:
    """Information about an execution run."""
    run_id: str
    run_number: int  # 1-indexed for display
    started_at: str  # ISO timestamp
    completed_at: Optional[str]  # ISO timestamp or None if still running
    tasks_completed: int
    tasks_failed: int
    duration_seconds: Optional[float] = None  # Calculated from timestamps

    @property
    def is_complete(self) -> bool:
        """Check if this run is complete."""
        return self.completed_at is not None

    @property
    def duration_display(self) -> str:
        """Format duration for display."""
        if self.duration_seconds is None:
            return "..."
        secs = int(self.duration_seconds)
        if secs >= 3600:
            hours = secs // 3600
            mins = (secs % 3600) // 60
            return f"{hours}h{mins}m"
        elif secs >= 60:
            mins = secs // 60
            remainder = secs % 60
            return f"{mins}m{remainder}s"
        else:
            return f"{secs}s"

    @property
    def start_time_display(self) -> str:
        """Format start time for display (HH:MM)."""
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(self.started_at.replace('Z', '+00:00'))
            return dt.strftime("%H:%M")
        except Exception:
            return "??:??"

    @classmethod
    def from_dict(cls, data: Dict, run_number: int) -> 'RunInfo':
        """Create a RunInfo from a dictionary (status.json runs array item)."""
        started_at = data.get('startedAt', '')
        completed_at = data.get('completedAt')

        # Calculate duration
        duration = None
        if started_at and completed_at:
            try:
                from datetime import datetime
                start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                end = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                duration = (end - start).total_seconds()
            except Exception:
                pass

        return cls(
            run_id=data.get('runId', ''),
            run_number=run_number,
            started_at=started_at,
            completed_at=completed_at,
            tasks_completed=data.get('tasksCompleted', 0),
            tasks_failed=data.get('tasksFailed', 0),
            duration_seconds=duration,
        )


class RunHistoryPanel:
    """
    Panel displaying run execution history.

    Features:
    - Shows recent execution runs from status.json
    - Displays run #, start time, duration
    - Shows tasks completed/failed per run
    - Indicates active run with spinner
    """

    def __init__(self, plan_path: Optional[str] = None, max_runs: int = 5):
        """
        Initialize the run history panel.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
            max_runs: Maximum number of runs to display
        """
        self.plan_path = plan_path
        self.max_runs = max_runs
        self.runs: List[RunInfo] = []
        self._compact = False

    def update_runs(self, runs_data: Optional[List[Dict]] = None):
        """
        Update runs data.

        Args:
            runs_data: List of run dictionaries, or None to fetch from status.json
        """
        if runs_data is None:
            runs_data = self._fetch_runs()

        self.runs = []
        # Reverse to show most recent first
        reversed_runs = list(reversed(runs_data))
        total_runs = len(runs_data)

        for idx, run_dict in enumerate(reversed_runs[:self.max_runs]):
            # Run number is 1-indexed, counting from earliest
            run_number = total_runs - idx
            run = RunInfo.from_dict(run_dict, run_number)
            self.runs.append(run)

    def _fetch_runs(self) -> List[Dict]:
        """Fetch runs data from status.json via status-cli."""
        try:
            # Use status-cli.js to get status which includes runs
            cmd = ['node', 'scripts/status-cli.js', 'status', '--json']
            if self.plan_path:
                cmd.insert(2, '--plan')
                cmd.insert(3, self.plan_path)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                return data.get('runs', [])
        except Exception:
            pass

        return []

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def _get_run_style(self, run: RunInfo) -> str:
        """Get the style for a run based on its status."""
        if not run.is_complete:
            return 'cyan'  # Active run
        elif run.tasks_failed > 0:
            return 'red'  # Run with failures
        elif run.tasks_completed > 0:
            return 'green'  # Successful run
        else:
            return 'dim'  # Empty run

    def _get_status_indicator(self, run: RunInfo) -> str:
        """Get a status indicator for the run."""
        if not run.is_complete:
            return '●'  # Active indicator
        elif run.tasks_failed > 0:
            return '✗'  # Failure indicator
        elif run.tasks_completed > 0:
            return '✓'  # Success indicator
        else:
            return '○'  # Empty run

    def render(self) -> 'RenderableType':
        """Render the run history panel."""
        if not RICH_AVAILABLE:
            return "Run History (Rich not available)"

        if not self.runs:
            return Panel(
                Text("[dim]No runs recorded[/dim]"),
                title="Run History",
                border_style="magenta"
            )

        if self._compact:
            return self._render_compact()
        else:
            return self._render_full()

    def _render_full(self) -> Panel:
        """Render full run history display."""
        table = Table(show_header=True, box=None, padding=(0, 1), expand=True)
        table.add_column("#", style="dim", no_wrap=True, width=3)
        table.add_column("Start", style="white", no_wrap=True, width=6)
        table.add_column("Duration", style="white", no_wrap=True, width=8)
        table.add_column("Tasks", style="white", no_wrap=True, width=10)

        for run in self.runs:
            style = self._get_run_style(run)
            indicator = self._get_status_indicator(run)

            # Run number with indicator
            run_num = Text(f"{indicator}{run.run_number}", style=style)

            # Start time
            start_time = Text(run.start_time_display, style=style)

            # Duration
            duration = Text(run.duration_display, style=style)

            # Tasks completed/failed
            tasks_text = Text()
            if run.tasks_completed > 0:
                tasks_text.append(f"✓{run.tasks_completed}", style="green")
            if run.tasks_failed > 0:
                if run.tasks_completed > 0:
                    tasks_text.append(" ", style="dim")
                tasks_text.append(f"✗{run.tasks_failed}", style="red")
            if run.tasks_completed == 0 and run.tasks_failed == 0:
                if run.is_complete:
                    tasks_text.append("-", style="dim")
                else:
                    tasks_text.append("...", style="cyan")

            table.add_row(run_num, start_time, duration, tasks_text)

        # Calculate summary
        total_completed = sum(r.tasks_completed for r in self.runs)
        total_failed = sum(r.tasks_failed for r in self.runs)
        title = f"Run History ({len(self.runs)} runs)"
        if total_failed > 0:
            title = f"Run History ({len(self.runs)} runs, {total_failed} failures)"

        return Panel(
            table,
            title=title,
            border_style="magenta",
        )

    def _render_compact(self) -> Panel:
        """Render compact run history (single line summary)."""
        text = Text()

        for idx, run in enumerate(self.runs):
            if idx > 0:
                text.append(" ", style="dim")

            style = self._get_run_style(run)
            indicator = self._get_status_indicator(run)
            text.append(f"{indicator}R{run.run_number}", style=style)

        return Panel(text, title="Runs", border_style="magenta")

    def get_run_by_number(self, run_number: int) -> Optional[RunInfo]:
        """Get run by its number (1-indexed)."""
        for run in self.runs:
            if run.run_number == run_number:
                return run
        return None

    def get_active_run(self) -> Optional[RunInfo]:
        """Get the currently active (incomplete) run, if any."""
        for run in self.runs:
            if not run.is_complete:
                return run
        return None


def create_run_history_panel(plan_path: Optional[str] = None, max_runs: int = 5) -> RunHistoryPanel:
    """
    Create and initialize a run history panel.

    Args:
        plan_path: Optional path to plan file
        max_runs: Maximum number of runs to display

    Returns:
        Initialized RunHistoryPanel with data loaded
    """
    panel = RunHistoryPanel(plan_path, max_runs)
    panel.update_runs()
    return panel


@dataclass
class DependencyNode:
    """A node in the dependency graph."""
    id: str
    description: str
    status: str  # 'completed', 'in_progress', 'pending', 'failed', 'skipped'
    dependencies: List[str] = field(default_factory=list)
    dependents: List[str] = field(default_factory=list)
    phase: str = ""

    @property
    def is_complete(self) -> bool:
        """Check if this task is complete."""
        return self.status in ('completed', 'skipped')

    @property
    def is_active(self) -> bool:
        """Check if this task is in progress."""
        return self.status == 'in_progress'

    @property
    def is_blocked(self) -> bool:
        """Check if this task is blocked (has unmet dependencies)."""
        # This is set by the panel after checking dependency status
        return hasattr(self, '_blocked') and self._blocked

    @classmethod
    def from_dict(cls, data: Dict, phase_name: str = "") -> 'DependencyNode':
        """Create a DependencyNode from a dictionary."""
        node = cls(
            id=data.get('id', ''),
            description=data.get('description', ''),
            status=data.get('status', 'pending'),
            dependencies=data.get('dependencies', []),
            dependents=data.get('dependents', []),
            phase=phase_name,
        )
        return node


class DependencyGraphPanel:
    """
    Panel displaying task dependency graph.

    Features:
    - Vertical tree layout with box-drawing characters
    - Shows current phase tasks with dependency arrows
    - Color-coded by status (green=complete, yellow=in_progress, dim=pending)
    - Highlights selected task's dependencies
    """

    # Box drawing characters for tree
    BOX_VERT = '│'
    BOX_HORIZ = '─'
    BOX_CORNER = '└'
    BOX_TEE = '├'
    BOX_ARROW = '→'

    def __init__(self, plan_path: Optional[str] = None, max_tasks: int = 8):
        """
        Initialize the dependency graph panel.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
            max_tasks: Maximum number of tasks to display
        """
        self.plan_path = plan_path
        self.max_tasks = max_tasks
        self.nodes: Dict[str, DependencyNode] = {}
        self.current_phase: str = ""
        self.phase_tasks: List[DependencyNode] = []
        self._selected_task_id: Optional[str] = None
        self._compact = False

    def update_graph(self, deps_data: Optional[Dict] = None):
        """
        Update graph data.

        Args:
            deps_data: Dependency data dict, or None to fetch from status-cli
        """
        if deps_data is None:
            deps_data = self._fetch_deps()

        self.nodes = {}
        self.phase_tasks = []

        if not deps_data:
            return

        phases = deps_data.get('phases', [])

        # Find the current phase (in_progress or first pending)
        current_phase_data = None
        for phase in phases:
            if phase.get('blockedCount', 0) > 0 or self._has_active_tasks(phase):
                current_phase_data = phase
                break

        # Fallback to first phase with pending tasks
        if not current_phase_data:
            for phase in phases:
                for task in phase.get('tasks', []):
                    if task.get('status') in ('pending', 'in_progress'):
                        current_phase_data = phase
                        break
                if current_phase_data:
                    break

        # Still nothing? Use first phase
        if not current_phase_data and phases:
            current_phase_data = phases[0]

        if not current_phase_data:
            return

        self.current_phase = current_phase_data.get('name', 'Unknown Phase')

        # Build nodes for current phase
        for task in current_phase_data.get('tasks', [])[:self.max_tasks]:
            node = DependencyNode.from_dict(task, self.current_phase)
            self.nodes[node.id] = node
            self.phase_tasks.append(node)

        # Calculate blocked status for each node
        self._update_blocked_status()

    def _has_active_tasks(self, phase: Dict) -> bool:
        """Check if phase has any in_progress tasks."""
        for task in phase.get('tasks', []):
            if task.get('status') == 'in_progress':
                return True
        return False

    def _update_blocked_status(self):
        """Update blocked status for all nodes based on dependencies."""
        completed_ids = {n.id for n in self.nodes.values() if n.is_complete}

        for node in self.nodes.values():
            if node.dependencies:
                # Check if any dependency is incomplete
                node._blocked = any(
                    dep_id not in completed_ids
                    for dep_id in node.dependencies
                )
            else:
                node._blocked = False

    def _fetch_deps(self) -> Dict:
        """Fetch dependency data from status-cli."""
        try:
            cmd = ['node', 'scripts/status-cli.js', 'deps', '--format=json']
            if self.plan_path:
                cmd.insert(2, '--plan')
                cmd.insert(3, self.plan_path)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                return json.loads(result.stdout)
        except Exception:
            pass

        return {}

    def set_selected_task(self, task_id: Optional[str]):
        """Set the currently selected task for highlighting."""
        self._selected_task_id = task_id

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def _get_node_style(self, node: DependencyNode) -> str:
        """Get the style for a node based on its status."""
        if node.status == 'completed':
            return 'green'
        elif node.status == 'in_progress':
            return 'yellow'
        elif node.status == 'failed':
            return 'red'
        elif node.status == 'skipped':
            return 'dim'
        elif node.is_blocked:
            return 'dim'  # Blocked tasks are dimmed
        else:
            return 'white'  # Ready tasks

    def _get_status_indicator(self, node: DependencyNode) -> str:
        """Get a status indicator for the node."""
        if node.status == 'completed':
            return '✓'
        elif node.status == 'in_progress':
            return '●'
        elif node.status == 'failed':
            return '✗'
        elif node.status == 'skipped':
            return '⊘'
        elif node.is_blocked:
            return '⊘'  # Blocked indicator
        else:
            return '○'  # Ready

    def render(self) -> 'RenderableType':
        """Render the dependency graph panel."""
        if not RICH_AVAILABLE:
            return "Dependency Graph (Rich not available)"

        if not self.phase_tasks:
            return Panel(
                Text("[dim]No tasks in current phase[/dim]"),
                title="Dependencies",
                border_style="blue"
            )

        if self._compact:
            return self._render_compact()
        else:
            return self._render_full()

    def _render_full(self) -> Panel:
        """Render full dependency graph display."""
        table = Table(show_header=False, box=None, padding=(0, 0), expand=True)
        table.add_column("Graph", style="white", overflow="ellipsis", ratio=1)

        # Render each task as a tree node
        for idx, node in enumerate(self.phase_tasks):
            is_last = idx == len(self.phase_tasks) - 1
            is_selected = node.id == self._selected_task_id
            style = self._get_node_style(node)
            indicator = self._get_status_indicator(node)

            # Build the row
            row_text = Text()

            # Tree structure
            if is_last:
                row_text.append(f" {self.BOX_CORNER}{self.BOX_HORIZ} ", style="dim")
            else:
                row_text.append(f" {self.BOX_TEE}{self.BOX_HORIZ} ", style="dim")

            # Status indicator
            row_text.append(indicator, style=style)
            row_text.append(" ", style="dim")

            # Task ID
            if is_selected:
                row_text.append(f"[{node.id}]", style=f"bold {style} reverse")
            else:
                row_text.append(node.id, style=f"bold {style}")

            # Description (truncated)
            desc = node.description[:25] + "..." if len(node.description) > 25 else node.description
            row_text.append(f" {desc}", style=style)

            table.add_row(row_text)

            # Show dependencies if present
            if node.dependencies and (is_selected or node.is_active):
                dep_text = Text()
                if is_last:
                    dep_text.append("     ", style="dim")
                else:
                    dep_text.append(f" {self.BOX_VERT}   ", style="dim")

                dep_text.append(f"{self.BOX_ARROW} depends: ", style="dim cyan")
                for dep_idx, dep_id in enumerate(node.dependencies[:3]):
                    if dep_idx > 0:
                        dep_text.append(", ", style="dim")

                    # Check if dep is completed
                    dep_node = self.nodes.get(dep_id)
                    if dep_node and dep_node.is_complete:
                        dep_text.append(dep_id, style="green dim")
                    else:
                        dep_text.append(dep_id, style="yellow")

                if len(node.dependencies) > 3:
                    dep_text.append(f" +{len(node.dependencies) - 3}", style="dim")

                table.add_row(dep_text)

        # Summary line
        total = len(self.phase_tasks)
        completed = sum(1 for n in self.phase_tasks if n.is_complete)
        in_progress = sum(1 for n in self.phase_tasks if n.is_active)
        blocked = sum(1 for n in self.phase_tasks if n.is_blocked)

        title = f"Dependencies ({completed}/{total})"
        if blocked > 0:
            title = f"Dependencies ({completed}/{total}, {blocked} blocked)"

        return Panel(
            table,
            title=title,
            border_style="blue",
        )

    def _render_compact(self) -> Panel:
        """Render compact dependency view (single line per task)."""
        text = Text()

        for idx, node in enumerate(self.phase_tasks):
            if idx > 0:
                text.append(" ", style="dim")

            style = self._get_node_style(node)
            indicator = self._get_status_indicator(node)
            is_selected = node.id == self._selected_task_id

            if is_selected:
                text.append(f"[{indicator}{node.id}]", style=f"bold {style} reverse")
            else:
                text.append(f"{indicator}{node.id}", style=style)

        return Panel(text, title="Deps", border_style="blue")

    def get_node(self, task_id: str) -> Optional[DependencyNode]:
        """Get a specific node by ID."""
        return self.nodes.get(task_id)

    def get_dependencies(self, task_id: str) -> List[DependencyNode]:
        """Get dependencies for a task."""
        node = self.nodes.get(task_id)
        if not node:
            return []

        return [
            self.nodes[dep_id]
            for dep_id in node.dependencies
            if dep_id in self.nodes
        ]

    def get_dependents(self, task_id: str) -> List[DependencyNode]:
        """Get tasks that depend on this task."""
        node = self.nodes.get(task_id)
        if not node:
            return []

        return [
            self.nodes[dep_id]
            for dep_id in node.dependents
            if dep_id in self.nodes
        ]


def create_dependency_graph_panel(
    plan_path: Optional[str] = None,
    max_tasks: int = 8
) -> DependencyGraphPanel:
    """
    Create and initialize a dependency graph panel.

    Args:
        plan_path: Optional path to plan file
        max_tasks: Maximum number of tasks to display

    Returns:
        Initialized DependencyGraphPanel with data loaded
    """
    panel = DependencyGraphPanel(plan_path, max_tasks)
    panel.update_graph()
    return panel


@dataclass
class SubtaskNode:
    """A node in the subtask tree."""
    id: str
    description: str
    status: str  # 'completed', 'in_progress', 'pending', 'failed', 'skipped'
    parent_id: Optional[str] = None
    children: List['SubtaskNode'] = field(default_factory=list)
    depth: int = 0

    @property
    def is_complete(self) -> bool:
        """Check if this task is complete."""
        return self.status in ('completed', 'skipped')

    @property
    def is_parent(self) -> bool:
        """Check if this is a parent task with children."""
        return len(self.children) > 0

    @property
    def child_progress(self) -> tuple:
        """Get (completed, total) for child tasks."""
        if not self.children:
            return (0, 0)
        completed = sum(1 for c in self.children if c.is_complete)
        return (completed, len(self.children))

    @classmethod
    def from_dict(cls, data: Dict, parent_id: Optional[str] = None, depth: int = 0) -> 'SubtaskNode':
        """Create a SubtaskNode from a dictionary."""
        return cls(
            id=data.get('id', ''),
            description=data.get('description', ''),
            status=data.get('status', 'pending'),
            parent_id=parent_id,
            children=[],
            depth=depth,
        )


class SubtaskTreePanel:
    """
    Panel displaying subtasks in a hierarchical tree view.

    Features:
    - Parses X.Y.Z notation to build tree structure
    - Shows indented tree view with expand/collapse
    - Displays subtask progress (2/5 complete)
    - Color-coded by status
    """

    # Tree drawing characters
    BOX_VERT = '│'
    BOX_HORIZ = '─'
    BOX_CORNER = '└'
    BOX_TEE = '├'

    def __init__(self, plan_path: Optional[str] = None, max_visible: int = 12):
        """
        Initialize the subtask tree panel.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
            max_visible: Maximum number of visible rows
        """
        self.plan_path = plan_path
        self.max_visible = max_visible
        self.root_nodes: List[SubtaskNode] = []
        self.all_nodes: Dict[str, SubtaskNode] = {}
        self._collapsed: Set[str] = set()  # Set of collapsed parent IDs
        self._compact = False
        self._selected_id: Optional[str] = None

    def update_tree(self, tasks_data: Optional[List[Dict]] = None):
        """
        Update tree data from task list.

        Args:
            tasks_data: List of task dictionaries, or None to fetch from status.json
        """
        if tasks_data is None:
            tasks_data = self._fetch_tasks()

        self.root_nodes = []
        self.all_nodes = {}

        # Parse tasks and build tree
        self._build_tree(tasks_data)

    def _fetch_tasks(self) -> List[Dict]:
        """Fetch tasks from status.json via status-cli."""
        try:
            cmd = ['node', 'scripts/status-cli.js', 'status', '--json']
            if self.plan_path:
                cmd.insert(2, '--plan')
                cmd.insert(3, self.plan_path)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                # status-cli returns tasks indirectly; read status.json directly
                return self._read_status_tasks()
        except Exception:
            pass

        return self._read_status_tasks()

    def _read_status_tasks(self) -> List[Dict]:
        """Read tasks directly from status.json."""
        try:
            import os
            # Determine plan output directory
            if self.plan_path:
                plan_name = os.path.basename(self.plan_path).replace('.md', '')
            else:
                # Try to read current plan
                current_plan_path = '.claude/current-plan.txt'
                if os.path.exists(current_plan_path):
                    with open(current_plan_path, 'r') as f:
                        plan_path = f.read().strip()
                    plan_name = os.path.basename(plan_path).replace('.md', '')
                else:
                    return []

            status_path = f'docs/plan-outputs/{plan_name}/status.json'
            if os.path.exists(status_path):
                with open(status_path, 'r') as f:
                    data = json.load(f)
                return data.get('tasks', [])
        except Exception:
            pass

        return []

    def _parse_task_id(self, task_id: str) -> List[str]:
        """
        Parse a task ID into its hierarchical parts.

        Examples:
            "1.1" -> ["1.1"]
            "1.1.1" -> ["1.1", "1.1.1"]
            "1.1.2.3" -> ["1.1", "1.1.2", "1.1.2.3"]
        """
        parts = task_id.split('.')
        result = []
        for i in range(2, len(parts) + 1):
            result.append('.'.join(parts[:i]))
        return result

    def _get_parent_id(self, task_id: str) -> Optional[str]:
        """Get the parent task ID for a given task ID."""
        parts = task_id.split('.')
        if len(parts) <= 2:
            return None  # Top-level task (e.g., "1.1")
        return '.'.join(parts[:-1])

    def _build_tree(self, tasks_data: List[Dict]):
        """Build tree structure from flat task list."""
        # First pass: create all nodes
        for task in tasks_data:
            task_id = task.get('id', '')
            if not task_id:
                continue

            parent_id = self._get_parent_id(task_id)
            depth = len(task_id.split('.')) - 2  # 1.1 = depth 0, 1.1.1 = depth 1

            node = SubtaskNode.from_dict(task, parent_id, depth)
            self.all_nodes[task_id] = node

        # Second pass: link parents and children
        for task_id, node in self.all_nodes.items():
            if node.parent_id and node.parent_id in self.all_nodes:
                parent = self.all_nodes[node.parent_id]
                parent.children.append(node)
            else:
                # No parent in tree = root node
                self.root_nodes.append(node)

        # Sort children by ID
        for node in self.all_nodes.values():
            node.children.sort(key=lambda n: self._sort_key(n.id))

        # Sort root nodes
        self.root_nodes.sort(key=lambda n: self._sort_key(n.id))

    def _sort_key(self, task_id: str) -> tuple:
        """Generate a sort key for task IDs."""
        parts = task_id.split('.')
        return tuple(int(p) if p.isdigit() else p for p in parts)

    def toggle_collapse(self, task_id: str) -> bool:
        """
        Toggle collapse state for a parent node.

        Args:
            task_id: The task ID to toggle

        Returns:
            True if now collapsed, False if now expanded
        """
        node = self.all_nodes.get(task_id)
        if not node or not node.is_parent:
            return False

        if task_id in self._collapsed:
            self._collapsed.discard(task_id)
            return False
        else:
            self._collapsed.add(task_id)
            return True

    def expand_all(self):
        """Expand all collapsed nodes."""
        self._collapsed.clear()

    def collapse_all(self):
        """Collapse all parent nodes."""
        for task_id, node in self.all_nodes.items():
            if node.is_parent:
                self._collapsed.add(task_id)

    def is_collapsed(self, task_id: str) -> bool:
        """Check if a node is collapsed."""
        return task_id in self._collapsed

    def set_selected(self, task_id: Optional[str]):
        """Set the currently selected task."""
        self._selected_id = task_id

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def _get_node_style(self, node: SubtaskNode) -> str:
        """Get the style for a node based on its status."""
        if node.status == 'completed':
            return 'green'
        elif node.status == 'in_progress':
            return 'yellow'
        elif node.status == 'failed':
            return 'red'
        elif node.status == 'skipped':
            return 'dim'
        else:
            return 'white'  # pending

    def _get_status_indicator(self, node: SubtaskNode) -> str:
        """Get a status indicator for the node."""
        if node.status == 'completed':
            return '✓'
        elif node.status == 'in_progress':
            return '●'
        elif node.status == 'failed':
            return '✗'
        elif node.status == 'skipped':
            return '⊘'
        else:
            return '○'  # pending

    def _get_visible_nodes(self) -> List[tuple]:
        """
        Get list of visible nodes with their prefixes.

        Returns:
            List of (node, prefix_chars, is_last) tuples
        """
        result = []

        def walk_tree(nodes: List[SubtaskNode], prefix: str = "", parent_collapsed: bool = False):
            if parent_collapsed:
                return

            for idx, node in enumerate(nodes):
                is_last = idx == len(nodes) - 1

                # Build prefix for this node
                if node.depth == 0:
                    node_prefix = ""
                else:
                    node_prefix = prefix

                result.append((node, node_prefix, is_last))

                # Recurse into children if not collapsed
                if node.is_parent and node.id not in self._collapsed:
                    child_prefix = prefix
                    if node.depth > 0:
                        if is_last:
                            child_prefix = prefix + "   "
                        else:
                            child_prefix = prefix + f"{self.BOX_VERT}  "
                    walk_tree(node.children, child_prefix, False)

        walk_tree(self.root_nodes)
        return result

    def render(self) -> 'RenderableType':
        """Render the subtask tree panel."""
        if not RICH_AVAILABLE:
            return "Subtask Tree (Rich not available)"

        if not self.root_nodes:
            return Panel(
                Text("[dim]No tasks available[/dim]"),
                title="Subtasks",
                border_style="magenta"
            )

        if self._compact:
            return self._render_compact()
        else:
            return self._render_full()

    def _render_full(self) -> Panel:
        """Render full subtask tree display."""
        table = Table(show_header=False, box=None, padding=(0, 0), expand=True)
        table.add_column("Tree", style="white", overflow="ellipsis", ratio=1)

        visible_nodes = self._get_visible_nodes()

        for node, prefix, is_last in visible_nodes[:self.max_visible]:
            style = self._get_node_style(node)
            indicator = self._get_status_indicator(node)
            is_selected = node.id == self._selected_id

            row_text = Text()

            # Add tree prefix
            if node.depth > 0:
                row_text.append(prefix, style="dim")
                if is_last:
                    row_text.append(f"{self.BOX_CORNER}{self.BOX_HORIZ} ", style="dim")
                else:
                    row_text.append(f"{self.BOX_TEE}{self.BOX_HORIZ} ", style="dim")

            # Collapse/expand indicator for parent nodes
            if node.is_parent:
                if node.id in self._collapsed:
                    row_text.append("[+] ", style="cyan bold")
                else:
                    row_text.append("[-] ", style="cyan")

            # Status indicator
            row_text.append(indicator, style=style)
            row_text.append(" ", style="dim")

            # Task ID
            if is_selected:
                row_text.append(f"[{node.id}]", style=f"bold {style} reverse")
            else:
                row_text.append(node.id, style=f"bold {style}")

            # Description (truncated)
            desc = node.description[:30] + "..." if len(node.description) > 30 else node.description
            row_text.append(f" {desc}", style=style)

            # Show progress for parent nodes
            if node.is_parent:
                completed, total = node.child_progress
                row_text.append(f" ({completed}/{total})", style="dim cyan")

            table.add_row(row_text)

        # Show "more" indicator if truncated
        if len(visible_nodes) > self.max_visible:
            remaining = len(visible_nodes) - self.max_visible
            table.add_row(Text(f"  ... and {remaining} more", style="dim"))

        # Calculate summary
        total = len(self.all_nodes)
        completed = sum(1 for n in self.all_nodes.values() if n.is_complete)
        parents = sum(1 for n in self.all_nodes.values() if n.is_parent)

        title = f"Subtasks ({completed}/{total})"
        if parents > 0:
            collapsed_count = len(self._collapsed)
            if collapsed_count > 0:
                title = f"Subtasks ({completed}/{total}, {collapsed_count} collapsed)"

        return Panel(
            table,
            title=title,
            border_style="magenta",
        )

    def _render_compact(self) -> Panel:
        """Render compact subtask view."""
        text = Text()

        # Show top-level summary only
        for idx, node in enumerate(self.root_nodes[:8]):
            if idx > 0:
                text.append(" ", style="dim")

            style = self._get_node_style(node)
            indicator = self._get_status_indicator(node)
            is_selected = node.id == self._selected_id

            if is_selected:
                text.append(f"[{indicator}{node.id}]", style=f"bold {style} reverse")
            else:
                text.append(f"{indicator}{node.id}", style=style)

            if node.is_parent:
                completed, total = node.child_progress
                text.append(f"({completed}/{total})", style="dim")

        if len(self.root_nodes) > 8:
            text.append(f" +{len(self.root_nodes) - 8}", style="dim")

        return Panel(text, title="Subtasks", border_style="magenta")

    def get_node(self, task_id: str) -> Optional[SubtaskNode]:
        """Get a specific node by ID."""
        return self.all_nodes.get(task_id)

    def get_parent_nodes(self) -> List[SubtaskNode]:
        """Get all parent nodes (tasks with subtasks)."""
        return [n for n in self.all_nodes.values() if n.is_parent]

    def get_children(self, task_id: str) -> List[SubtaskNode]:
        """Get children of a task."""
        node = self.all_nodes.get(task_id)
        if node:
            return node.children
        return []


def create_subtask_tree_panel(
    plan_path: Optional[str] = None,
    max_visible: int = 12
) -> SubtaskTreePanel:
    """
    Create and initialize a subtask tree panel.

    Args:
        plan_path: Optional path to plan file
        max_visible: Maximum visible rows

    Returns:
        Initialized SubtaskTreePanel with data loaded
    """
    panel = SubtaskTreePanel(plan_path, max_visible)
    panel.update_tree()
    return panel


@dataclass
class Artifact:
    """Represents an artifact file from plan findings."""
    path: str
    filename: str
    task_id: str
    title: str
    size_bytes: int
    modified_time: float

    @property
    def size_display(self) -> str:
        """Format file size for display."""
        if self.size_bytes < 1024:
            return f"{self.size_bytes}B"
        elif self.size_bytes < 1024 * 1024:
            return f"{self.size_bytes // 1024}KB"
        else:
            return f"{self.size_bytes // (1024 * 1024)}MB"

    @property
    def modified_display(self) -> str:
        """Format modification time for display (HH:MM)."""
        try:
            from datetime import datetime
            dt = datetime.fromtimestamp(self.modified_time)
            return dt.strftime("%H:%M")
        except Exception:
            return "??:??"

    @classmethod
    def from_file(cls, path: str) -> Optional['Artifact']:
        """
        Load artifact metadata from a file path.

        Args:
            path: Path to the artifact file

        Returns:
            Artifact instance or None if file cannot be read
        """
        import os

        try:
            if not os.path.isfile(path):
                return None

            filename = os.path.basename(path)
            stat = os.stat(path)

            # Extract task ID from filename (e.g., "1.1.md" or "1.1-analysis.md")
            task_id = filename.replace('.md', '')
            # Handle filenames like "1.1-analysis.md"
            if '-' in task_id:
                task_id = task_id.split('-')[0]

            # Extract title from first heading or filename
            title = filename
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('# '):
                            title = line[2:].strip()
                            break
                        elif line.startswith('## '):
                            title = line[3:].strip()
                            break
            except Exception:
                pass

            return cls(
                path=path,
                filename=filename,
                task_id=task_id,
                title=title,
                size_bytes=stat.st_size,
                modified_time=stat.st_mtime,
            )
        except Exception:
            return None


class ArtifactBrowserPanel:
    """
    Panel displaying artifact list from plan findings.

    Features:
    - Scans docs/plan-outputs/{plan}/findings/ directory for all artifacts
    - Shows artifact list with task association
    - Preview artifact content on selection
    - Open artifact in external editor with Enter via $EDITOR environment variable
    """

    def __init__(self, plan_path: Optional[str] = None, max_artifacts: int = 10):
        """
        Initialize the artifact browser panel.

        Args:
            plan_path: Path to plan file (uses current plan if None)
            max_artifacts: Maximum number of artifacts to display
        """
        import os

        self.plan_path = plan_path
        self.max_artifacts = max_artifacts
        self._plan_name: Optional[str] = None
        self._findings_dir: Optional[str] = None
        self.artifacts: List[Artifact] = []
        self._selected_index = 0
        self._compact = False
        self._preview_lines = 5  # Number of preview lines to show

        # Initialize paths
        self._init_paths()

    def _init_paths(self):
        """Initialize plan paths."""
        import os

        if self.plan_path:
            self._plan_name = os.path.basename(self.plan_path).replace('.md', '')
        else:
            # Try to read current plan
            current_plan_path = '.claude/current-plan.txt'
            if os.path.exists(current_plan_path):
                with open(current_plan_path, 'r') as f:
                    plan_path = f.read().strip()
                self._plan_name = os.path.basename(plan_path).replace('.md', '')

        if self._plan_name:
            self._findings_dir = f'docs/plan-outputs/{self._plan_name}/findings'

    def scan_artifacts(self):
        """Scan the findings directory for all artifact files."""
        import os

        self.artifacts = []

        if not self._findings_dir or not os.path.isdir(self._findings_dir):
            return

        # Find all markdown files
        for filename in sorted(os.listdir(self._findings_dir)):
            if filename.endswith('.md'):
                path = os.path.join(self._findings_dir, filename)
                artifact = Artifact.from_file(path)
                if artifact:
                    self.artifacts.append(artifact)

        # Clamp selection index
        if self._selected_index >= len(self.artifacts):
            self._selected_index = max(0, len(self.artifacts) - 1)

    def set_selected_index(self, index: int):
        """Set the selected artifact index."""
        if 0 <= index < len(self.artifacts):
            self._selected_index = index

    def move_selection(self, direction: int) -> int:
        """
        Move selection up or down.

        Args:
            direction: -1 for up, +1 for down

        Returns:
            New selection index
        """
        if not self.artifacts:
            return 0

        new_index = max(0, min(len(self.artifacts) - 1, self._selected_index + direction))
        self._selected_index = new_index
        return new_index

    @property
    def selected_artifact(self) -> Optional[Artifact]:
        """Get the currently selected artifact."""
        if 0 <= self._selected_index < len(self.artifacts):
            return self.artifacts[self._selected_index]
        return None

    def get_preview(self, artifact: Optional[Artifact] = None, max_lines: int = 5) -> str:
        """
        Get a preview of the artifact content.

        Args:
            artifact: Artifact to preview (uses selected if None)
            max_lines: Maximum lines to show

        Returns:
            Preview string or empty if not available
        """
        if artifact is None:
            artifact = self.selected_artifact

        if not artifact:
            return ""

        try:
            with open(artifact.path, 'r', encoding='utf-8') as f:
                lines = []
                for i, line in enumerate(f):
                    if i >= max_lines:
                        break
                    lines.append(line.rstrip())
                return '\n'.join(lines)
        except Exception:
            return "[Unable to read file]"

    def open_in_editor(self, artifact: Optional[Artifact] = None) -> bool:
        """
        Open artifact in external editor.

        Uses $EDITOR environment variable, falls back to 'vi'.

        Args:
            artifact: Artifact to open (uses selected if None)

        Returns:
            True if editor was launched, False otherwise
        """
        import os
        import subprocess

        if artifact is None:
            artifact = self.selected_artifact

        if not artifact:
            return False

        # Get editor from environment
        editor = os.environ.get('EDITOR', os.environ.get('VISUAL', 'vi'))

        try:
            # Launch editor in a subprocess
            # Note: This will block the TUI until the editor closes
            # In practice, the TUI should handle this appropriately
            subprocess.run([editor, artifact.path])
            return True
        except Exception:
            return False

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def _get_artifact_style(self, artifact: Artifact, is_selected: bool) -> str:
        """Get the style for an artifact based on selection state."""
        if is_selected:
            return 'bold white reverse'
        else:
            return 'white'

    def render(self) -> 'RenderableType':
        """Render the artifact browser panel."""
        if not RICH_AVAILABLE:
            return "Artifact Browser (Rich not available)"

        if not self.artifacts:
            return Panel(
                Text("[dim]No artifacts found[/dim]"),
                title="Artifacts",
                border_style="blue"
            )

        if self._compact:
            return self._render_compact()
        else:
            return self._render_full()

    def _render_full(self) -> Panel:
        """Render full artifact browser display with preview."""
        table = Table(show_header=True, box=None, padding=(0, 1), expand=True)
        table.add_column("Task", style="cyan", no_wrap=True, width=5)
        table.add_column("Title", style="white", overflow="ellipsis", ratio=2)
        table.add_column("Size", style="dim", no_wrap=True, width=5)
        table.add_column("Time", style="dim", no_wrap=True, width=5)

        for idx, artifact in enumerate(self.artifacts[:self.max_artifacts]):
            is_selected = idx == self._selected_index
            style = self._get_artifact_style(artifact, is_selected)

            # Task ID
            task_text = Text(artifact.task_id, style="cyan bold" if is_selected else "cyan")

            # Title (truncated)
            title = artifact.title
            if len(title) > 40:
                title = title[:37] + "..."
            if is_selected:
                title_text = Text(f"▶ {title}", style=style)
            else:
                title_text = Text(title, style="white")

            # Size and time
            size_text = Text(artifact.size_display, style="dim")
            time_text = Text(artifact.modified_display, style="dim")

            table.add_row(task_text, title_text, size_text, time_text)

        # Add preview section if we have a selection
        content_parts = [table]

        selected = self.selected_artifact
        if selected:
            preview = self.get_preview(selected, max_lines=3)
            if preview:
                preview_text = Text()
                preview_text.append("\n─── Preview ───\n", style="dim")
                # Truncate preview lines for display
                for line in preview.split('\n')[:3]:
                    if len(line) > 60:
                        line = line[:57] + "..."
                    preview_text.append(line + "\n", style="dim italic")
                content_parts.append(preview_text)

        from rich.console import Group
        content = Group(*content_parts)

        title = f"Artifacts ({len(self.artifacts)})"
        subtitle = "Enter: open in $EDITOR"

        return Panel(
            content,
            title=title,
            subtitle=subtitle,
            border_style="blue",
        )

    def _render_compact(self) -> Panel:
        """Render compact artifact view (single line per artifact)."""
        text = Text()

        for idx, artifact in enumerate(self.artifacts[:6]):
            if idx > 0:
                text.append(" ", style="dim")

            is_selected = idx == self._selected_index
            if is_selected:
                text.append(f"[{artifact.task_id}]", style="bold cyan reverse")
            else:
                text.append(artifact.task_id, style="cyan")

        if len(self.artifacts) > 6:
            text.append(f" +{len(self.artifacts) - 6}", style="dim")

        return Panel(text, title="Artifacts", border_style="blue")

    def get_artifact_by_task_id(self, task_id: str) -> Optional[Artifact]:
        """Get artifact by task ID."""
        for artifact in self.artifacts:
            if artifact.task_id == task_id:
                return artifact
        return None

    def get_artifact_by_index(self, index: int) -> Optional[Artifact]:
        """Get artifact by index."""
        if 0 <= index < len(self.artifacts):
            return self.artifacts[index]
        return None

    @property
    def artifact_count(self) -> int:
        """Get total number of artifacts."""
        return len(self.artifacts)

    @property
    def findings_directory(self) -> Optional[str]:
        """Get the findings directory path."""
        return self._findings_dir


def create_artifact_browser_panel(
    plan_path: Optional[str] = None,
    max_artifacts: int = 10
) -> ArtifactBrowserPanel:
    """
    Create and initialize an artifact browser panel.

    Args:
        plan_path: Optional path to plan file
        max_artifacts: Maximum number of artifacts to display

    Returns:
        Initialized ArtifactBrowserPanel with artifacts loaded
    """
    panel = ArtifactBrowserPanel(plan_path, max_artifacts)
    panel.scan_artifacts()
    return panel


class AgentTrackerPanel:
    """
    Panel displaying parallel agent status.

    Features:
    - Shows active agents with mini progress bars
    - Displays fan-in status (waiting for N/M agents)
    - Color-coded by agent status (running=yellow, complete=green, failed=red)
    - Shows agent descriptions and durations
    """

    def __init__(self, agent_tracker: Optional[Any] = None, max_agents: int = 6):
        """
        Initialize the agent tracker panel.

        Args:
            agent_tracker: AgentTracker instance from command_runner (optional)
            max_agents: Maximum number of agents to display
        """
        self.agent_tracker = agent_tracker
        self.max_agents = max_agents
        self._compact = False
        self._agents: List[Dict] = []  # Fallback storage if no tracker

    def set_agent_tracker(self, tracker: Any):
        """Set the agent tracker instance."""
        self.agent_tracker = tracker

    def add_agent(
        self,
        agent_id: str,
        description: str,
        subagent_type: Optional[str] = None,
    ):
        """
        Manually add an agent (used when no tracker attached).

        Args:
            agent_id: Unique agent identifier
            description: Short description
            subagent_type: Optional agent type
        """
        if self.agent_tracker:
            self.agent_tracker.agent_spawned(agent_id, description, subagent_type)
        else:
            import time
            self._agents.append({
                'agent_id': agent_id,
                'description': description,
                'subagent_type': subagent_type,
                'status': 'running',
                'start_time': time.time(),
                'progress': 0,
            })

    def complete_agent(self, agent_id: str, success: bool = True):
        """
        Mark an agent as complete.

        Args:
            agent_id: Agent identifier
            success: Whether agent succeeded
        """
        if self.agent_tracker:
            self.agent_tracker.agent_completed(agent_id, success)
        else:
            import time
            for agent in self._agents:
                if agent['agent_id'] == agent_id:
                    agent['status'] = 'completed' if success else 'failed'
                    agent['end_time'] = time.time()
                    agent['progress'] = 100
                    break

    def update_progress(self, agent_id: str, progress: int):
        """
        Update agent progress.

        Args:
            agent_id: Agent identifier
            progress: Progress percentage (0-100)
        """
        if self.agent_tracker:
            self.agent_tracker.update_progress(agent_id, progress)
        else:
            for agent in self._agents:
                if agent['agent_id'] == agent_id:
                    agent['progress'] = min(100, max(0, progress))
                    break

    def _get_agents(self) -> List[Dict]:
        """Get list of agent dicts for rendering."""
        if self.agent_tracker:
            agents = []
            for a in self.agent_tracker.get_all_agents():
                agents.append({
                    'agent_id': a.agent_id,
                    'description': a.description,
                    'subagent_type': a.subagent_type,
                    'status': a.status,
                    'progress': a.progress,
                    'duration_seconds': a.duration_seconds,
                    'is_complete': a.is_complete,
                })
            return agents
        return self._agents

    def _get_fan_in_status(self) -> tuple:
        """Get fan-in status (completed, total)."""
        if self.agent_tracker:
            return self.agent_tracker.get_fan_in_status()
        else:
            total = len(self._agents)
            completed = sum(1 for a in self._agents if a.get('status') in ('completed', 'failed'))
            return (completed, total)

    def set_compact(self, compact: bool):
        """Set compact display mode."""
        self._compact = compact

    def clear(self):
        """Clear all tracked agents."""
        if self.agent_tracker:
            self.agent_tracker.clear()
        else:
            self._agents.clear()

    def _get_agent_style(self, agent: Dict) -> str:
        """Get the style for an agent based on its status."""
        status = agent.get('status', 'running')
        if status == 'completed':
            return 'green'
        elif status == 'failed':
            return 'red'
        elif status == 'running':
            return 'yellow'
        else:
            return 'dim'

    def _get_status_indicator(self, agent: Dict) -> str:
        """Get a status indicator for the agent."""
        status = agent.get('status', 'running')
        if status == 'completed':
            return '✓'
        elif status == 'failed':
            return '✗'
        elif status == 'running':
            return '●'
        else:
            return '○'

    def _render_progress_bar(self, progress: int, width: int = 10) -> Text:
        """Render a mini progress bar."""
        filled = int(width * progress / 100)
        filled = min(filled, width)
        remaining = width - filled

        bar = Text()
        bar.append('█' * filled, style='green')
        bar.append('░' * remaining, style='dim')

        return bar

    def _format_duration(self, seconds: float) -> str:
        """Format duration for display."""
        if seconds >= 60:
            mins = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{mins}m{secs}s"
        elif seconds >= 1:
            return f"{seconds:.1f}s"
        else:
            return f"{seconds * 1000:.0f}ms"

    def render(self) -> 'RenderableType':
        """Render the agent tracker panel."""
        if not RICH_AVAILABLE:
            return "Agent Tracker (Rich not available)"

        agents = self._get_agents()

        if not agents:
            return Panel(
                Text("[dim]No parallel agents[/dim]"),
                title="Agents",
                border_style="cyan"
            )

        if self._compact:
            return self._render_compact(agents)
        else:
            return self._render_full(agents)

    def _render_full(self, agents: List[Dict]) -> Panel:
        """Render full agent tracker display."""
        table = Table(show_header=False, box=None, padding=(0, 1), expand=True)
        table.add_column("St", no_wrap=True, width=2)  # Status indicator
        table.add_column("Description", style="white", overflow="ellipsis", ratio=1)
        table.add_column("Progress", no_wrap=True, width=12)
        table.add_column("Time", style="dim", no_wrap=True, width=6)

        for agent in agents[:self.max_agents]:
            style = self._get_agent_style(agent)
            indicator = self._get_status_indicator(agent)
            progress = agent.get('progress', 0)
            duration = agent.get('duration_seconds', 0)

            # Status indicator
            status_text = Text(indicator, style=style)

            # Description (truncated)
            desc = agent.get('description', 'Agent')
            if len(desc) > 25:
                desc = desc[:22] + "..."
            desc_text = Text(desc, style=style)

            # Progress bar
            progress_bar = self._render_progress_bar(progress)

            # Duration
            duration_text = Text(self._format_duration(duration), style="dim")

            table.add_row(status_text, desc_text, progress_bar, duration_text)

        # Fan-in status
        completed, total = self._get_fan_in_status()
        running = total - completed

        title = f"Agents ({completed}/{total})"
        if running > 0:
            title = f"Agents (waiting {running}/{total})"

        border_style = "yellow" if running > 0 else "green"

        return Panel(
            table,
            title=title,
            border_style=border_style,
        )

    def _render_compact(self, agents: List[Dict]) -> Panel:
        """Render compact agent view (single line per agent)."""
        text = Text()

        for idx, agent in enumerate(agents[:self.max_agents]):
            if idx > 0:
                text.append(" ", style="dim")

            style = self._get_agent_style(agent)
            indicator = self._get_status_indicator(agent)
            progress = agent.get('progress', 0)

            # Show indicator and truncated ID
            agent_id = agent.get('agent_id', '')[:6]
            text.append(f"{indicator}{agent_id}", style=style)
            text.append(f"[{progress}%]", style="dim")

        completed, total = self._get_fan_in_status()
        return Panel(text, title=f"Agents ({completed}/{total})", border_style="cyan")

    @property
    def has_active_agents(self) -> bool:
        """Check if there are any active (running) agents."""
        if self.agent_tracker:
            return len(self.agent_tracker.get_active_agents()) > 0
        return any(a.get('status') == 'running' for a in self._agents)


def create_agent_tracker_panel(
    agent_tracker: Optional[Any] = None,
    max_agents: int = 6
) -> AgentTrackerPanel:
    """
    Create an agent tracker panel.

    Args:
        agent_tracker: Optional AgentTracker instance
        max_agents: Maximum number of agents to display

    Returns:
        Configured AgentTrackerPanel
    """
    return AgentTrackerPanel(agent_tracker, max_agents)


__all__ = [
    'PhaseInfo',
    'PhaseProgressPanel',
    'create_phase_panel',
    'UpcomingTask',
    'UpcomingPanel',
    'create_upcoming_panel',
    'RunInfo',
    'RunHistoryPanel',
    'create_run_history_panel',
    'DependencyNode',
    'DependencyGraphPanel',
    'create_dependency_graph_panel',
    'SubtaskNode',
    'SubtaskTreePanel',
    'create_subtask_tree_panel',
    'Artifact',
    'ArtifactBrowserPanel',
    'create_artifact_browser_panel',
    'AgentTrackerPanel',
    'create_agent_tracker_panel',
]
