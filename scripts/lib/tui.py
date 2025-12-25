#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TUI Components for Plan Orchestrator.

This module provides the Rich-based terminal user interface components:
- Activity: Dataclass representing a tracked tool call
- ActivityTracker: Tracks all tool calls and activities during orchestration
- RichTUIManager: Manages the Rich-based TUI display

Usage:
    from scripts.lib.tui import Activity, ActivityTracker, RichTUIManager
"""

import threading
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

# Rich library imports (optional but recommended)
try:
    from rich.console import Console
    from rich.layout import Layout
    from rich.live import Live
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


# =============================================================================
# Activity Tracking
# =============================================================================

@dataclass
class Activity:
    """Represents a single tracked activity (tool call)."""
    timestamp: datetime
    tool_name: str
    description: str
    details: Optional[Dict] = None
    status: str = "started"  # started, completed, failed
    duration_seconds: float = 0.0  # Duration in seconds (set on completion)


class ActivityTracker:
    """Tracks all tool calls and activities during orchestration."""

    def __init__(self, max_history: int = 100):
        self.activities: deque = deque(maxlen=max_history)
        self.active_tools: Dict[str, Activity] = {}
        self.stats = {
            'reads': 0,
            'edits': 0,
            'writes': 0,
            'bash_commands': 0,
            'agents_spawned': 0,
            'greps': 0,
            'globs': 0,
            'total_tools': 0
        }
        self._lock = threading.Lock()

    def tool_started(self, tool_name: str, details: Dict) -> str:
        """Record a tool invocation starting."""
        with self._lock:
            activity = Activity(
                timestamp=datetime.now(),
                tool_name=tool_name,
                description=self._format_description(tool_name, details),
                details=details,
                status="started"
            )

            tool_id = details.get('id', str(len(self.activities)))
            self.active_tools[tool_id] = activity
            self.activities.append(activity)
            self._update_stats(tool_name)

            return tool_id

    def tool_completed(self, tool_id: str, duration: float = 0.0, result: str = ""):
        """Record a tool invocation completing."""
        with self._lock:
            if tool_id in self.active_tools:
                activity = self.active_tools[tool_id]
                activity.status = "completed"
                activity.duration_seconds = duration
                del self.active_tools[tool_id]

    def _format_description(self, tool_name: str, details: Dict) -> str:
        """Format a human-readable description of the tool call.

        Note: No truncation here - let Rich's overflow="ellipsis" handle it
        based on actual terminal width.
        """
        if tool_name == 'Read':
            path = details.get('file_path', 'unknown')
            return f"Read: {self._truncate_path(path)}"
        elif tool_name == 'Edit':
            path = details.get('file_path', 'unknown')
            return f"Edit: {self._truncate_path(path)}"
        elif tool_name == 'Write':
            path = details.get('file_path', 'unknown')
            return f"Write: {self._truncate_path(path)}"
        elif tool_name == 'Bash':
            cmd = details.get('command', '')
            return f"Bash: {cmd}"
        elif tool_name == 'Task':
            desc = details.get('description', 'agent')
            return f"Task: {desc}"
        elif tool_name == 'Grep':
            pattern = details.get('pattern', '')
            return f"Grep: {pattern}"
        elif tool_name == 'Glob':
            pattern = details.get('pattern', '')
            return f"Glob: {pattern}"
        elif tool_name == 'WebSearch':
            query = details.get('query', '')
            return f"WebSearch: {query}"
        elif tool_name == 'TodoWrite':
            return "TodoWrite: updating tasks"
        else:
            return f"{tool_name}"

    def _truncate_path(self, path: str, max_len: int = 80) -> str:
        """Truncate a path for display.

        Uses a generous default - Rich's overflow handling will do
        additional truncation if needed based on terminal width.
        """
        if len(path) <= max_len:
            return path
        return "..." + path[-(max_len - 3):]

    def _update_stats(self, tool_name: str):
        """Update statistics counters."""
        self.stats['total_tools'] += 1
        stat_map = {
            'Read': 'reads',
            'Edit': 'edits',
            'Write': 'writes',
            'Bash': 'bash_commands',
            'Task': 'agents_spawned',
            'Grep': 'greps',
            'Glob': 'globs'
        }
        if tool_name in stat_map:
            self.stats[stat_map[tool_name]] += 1

    def get_recent(self, count: int = 10) -> List[Activity]:
        """Get the most recent activities."""
        with self._lock:
            return list(self.activities)[-count:]

    def get_active(self) -> List[Activity]:
        """Get currently active tools."""
        with self._lock:
            return list(self.active_tools.values())


# =============================================================================
# Rich TUI Manager
# =============================================================================

class RichTUIManager:
    """Manages the Rich-based TUI for the orchestrator."""

    def __init__(self, plan_name: str):
        if not RICH_AVAILABLE:
            raise RuntimeError("Rich library not available")

        self.console = Console()
        self.plan_name = plan_name
        self.current_phase = ""
        self.iteration = 0
        self.max_iterations = 50
        self.start_time = time.time()

        # Progress tracking
        self.total_tasks = 0
        self.completed_tasks = 0
        self.pending_tasks = 0
        self.in_progress_count = 0
        self.failed_tasks = 0
        self.percentage = 0

        # Activity tracker
        self.activity_tracker = ActivityTracker()

        # Tasks (from status.json, not getNextTasks)
        self.tasks_in_progress: List[Dict] = []  # Actual in_progress tasks from status.json
        self.recent_completions: List[Dict] = []

        # Status message
        self.status_message = "Initializing..."

        # Heartbeat tracking
        self.claude_running = False
        self.last_activity_time: Optional[float] = None
        self._heartbeat_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        self._heartbeat_index = 0

        # Layout
        self.layout = self._create_layout()
        self.live: Optional[Live] = None
        self._lock = threading.Lock()

    def _create_layout(self) -> Layout:
        """Create the TUI layout structure."""
        layout = Layout()

        layout.split(
            Layout(name="header", size=5),
            Layout(name="progress", size=3),
            Layout(name="activity", size=10),
            Layout(name="tasks", size=8),
            Layout(name="footer", size=2)
        )

        # Split tasks section into two columns
        layout["tasks"].split_row(
            Layout(name="in_progress"),
            Layout(name="completions")
        )

        return layout

    def _render_header(self) -> Panel:
        """Render the header panel."""
        header_text = Text()
        header_text.append("PLAN ORCHESTRATOR\n", style="bold cyan")
        header_text.append(f"Plan: ", style="dim")
        header_text.append(f"{self.plan_name}\n", style="white")
        header_text.append(f"Phase: ", style="dim")
        header_text.append(f"{self.current_phase}", style="yellow")
        header_text.append(f"  |  ", style="dim")
        header_text.append(f"Iteration: {self.iteration}/{self.max_iterations}", style="dim")

        return Panel(header_text, border_style="cyan")

    def _render_progress(self) -> Panel:
        """Render the progress bar panel."""
        # Calculate percentage from actual counts (handle edge case of 0 total)
        if self.total_tasks > 0:
            self.percentage = int((self.completed_tasks / self.total_tasks) * 100)
        else:
            self.percentage = 0

        bar_width = 50
        filled = int(bar_width * self.percentage / 100) if self.percentage > 0 else 0
        filled = min(filled, bar_width)
        remaining = bar_width - filled
        bar = "█" * filled
        if remaining > 0:
            bar += "░" * remaining

        elapsed = time.time() - self.start_time
        elapsed_str = time.strftime("%H:%M:%S", time.gmtime(elapsed))

        progress_text = Text()
        progress_text.append(f"[{bar}] ", style="green")
        progress_text.append(f"{self.percentage}%", style="bold green")

        # Add heartbeat indicator
        if self.claude_running:
            self._heartbeat_index = (self._heartbeat_index + 1) % len(self._heartbeat_chars)
            spinner = self._heartbeat_chars[self._heartbeat_index]
            progress_text.append(f"  {spinner} Claude working", style="cyan")
        elif self.last_activity_time:
            idle_secs = int(time.time() - self.last_activity_time)
            if idle_secs < 60:
                progress_text.append(f"  (idle {idle_secs}s)", style="dim")
            else:
                mins = idle_secs // 60
                progress_text.append(f"  (idle {mins}m)", style="dim")

        progress_text.append("\n")
        progress_text.append(f"{self.completed_tasks}/{self.total_tasks} tasks", style="dim")
        progress_text.append(f"  |  Elapsed: {elapsed_str}", style="dim")
        if self.in_progress_count > 0:
            progress_text.append(f"  |  Working: {self.in_progress_count}", style="cyan")
        if self.pending_tasks > 0:
            progress_text.append(f"  |  Pending: {self.pending_tasks}", style="yellow")
        if self.failed_tasks > 0:
            progress_text.append(f"  |  Failed: {self.failed_tasks}", style="red")

        return Panel(progress_text, title="Progress", border_style="green")

    def _render_activity(self) -> Panel:
        """Render the activity panel showing recent tool calls."""
        table = Table(show_header=False, box=None, padding=(0, 1), expand=True)
        table.add_column("Time", style="dim", no_wrap=True)
        table.add_column("Activity", style="white", overflow="ellipsis", ratio=1, no_wrap=True)
        table.add_column("Duration", style="dim", no_wrap=True, justify="right")

        for activity in self.activity_tracker.get_recent(8):
            time_str = activity.timestamp.strftime("%H:%M:%S")
            style = "dim" if activity.status == "completed" else "white"
            status_icon = "[OK]" if activity.status == "completed" else "..."

            # Format duration
            duration_str = ""
            if activity.status == "completed" and activity.duration_seconds > 0:
                if activity.duration_seconds >= 60:
                    mins = int(activity.duration_seconds // 60)
                    secs = int(activity.duration_seconds % 60)
                    duration_str = f"{mins}m{secs}s"
                elif activity.duration_seconds >= 1:
                    duration_str = f"{activity.duration_seconds:.1f}s"
                else:
                    duration_str = f"{activity.duration_seconds * 1000:.0f}ms"
            elif activity.status == "started":
                duration_str = "..."

            table.add_row(
                f"[{time_str}]",
                Text(f"{status_icon} {activity.description}", style=style),
                duration_str
            )

        if not self.activity_tracker.get_recent(1):
            table.add_row("", Text("[dim]Waiting for activity...[/dim]"), "")

        return Panel(table, title="Current Activity", border_style="blue")

    def _render_tasks_in_progress(self) -> Panel:
        """Render tasks currently in progress."""
        table = Table(show_header=False, box=None, expand=True)
        table.add_column("Task", style="yellow", overflow="ellipsis", no_wrap=True)

        for task in self.tasks_in_progress[:4]:
            task_id = task.get('id', '?')
            desc = task.get('description', '')
            table.add_row(f"{task_id}: {desc}")

        if not self.tasks_in_progress:
            table.add_row(Text("[dim]No tasks in progress[/dim]"))

        return Panel(table, title="In Progress", border_style="yellow")

    def _render_completions(self) -> Panel:
        """Render recently completed tasks."""
        table = Table(show_header=False, box=None, expand=True)
        table.add_column("Task", style="green", overflow="ellipsis", no_wrap=True)

        for task in self.recent_completions[:4]:
            task_id = task.get('id', '?')
            desc = task.get('description', '')
            table.add_row(f"[OK] {task_id}: {desc}")

        if not self.recent_completions:
            table.add_row(Text("[dim]No completions yet[/dim]"))

        return Panel(table, title="Recent Completions", border_style="green")

    def _render_footer(self) -> Panel:
        """Render the footer with status and stats."""
        stats = self.activity_tracker.stats
        footer_text = Text()
        footer_text.append(f"STATUS: ", style="dim")
        footer_text.append(f"{self.status_message}", style="cyan")
        footer_text.append(f"  |  Tools: {stats['total_tools']}", style="dim")
        footer_text.append(f"  |  Agents: {stats['agents_spawned']}", style="dim")
        footer_text.append(f"  |  Edits: {stats['edits']}", style="dim")

        return Panel(footer_text, border_style="dim")

    def update_layout(self):
        """Update all layout sections."""
        self.layout["header"].update(self._render_header())
        self.layout["progress"].update(self._render_progress())
        self.layout["activity"].update(self._render_activity())
        self.layout["in_progress"].update(self._render_tasks_in_progress())
        self.layout["completions"].update(self._render_completions())
        self.layout["footer"].update(self._render_footer())

    def start(self):
        """Start the live display."""
        self.update_layout()
        self.live = Live(
            self.layout,
            console=self.console,
            refresh_per_second=4,
            screen=False
        )
        self.live.start()

    def stop(self):
        """Stop the live display."""
        if self.live:
            self.live.stop()

    def refresh(self):
        """Refresh the display."""
        with self._lock:
            try:
                self.update_layout()
                if self.live:
                    self.live.update(self.layout)
            except Exception:
                pass  # Don't crash on display errors

    # Update methods called by orchestrator
    def set_status(self, message: str):
        self.status_message = message
        self.refresh()

    def set_progress(self, completed: int, total: int, pending: int, failed: int, in_progress: int = 0):
        self.completed_tasks = completed
        self.total_tasks = total
        self.pending_tasks = pending
        self.failed_tasks = failed
        self.in_progress_count = in_progress
        # Percentage is now calculated in _render_progress to handle 0 total
        self.refresh()

    def set_phase(self, phase: str):
        self.current_phase = phase
        self.refresh()

    def set_iteration(self, iteration: int, max_iterations: int):
        self.iteration = iteration
        self.max_iterations = max_iterations
        self.refresh()

    def add_activity(self, tool_name: str, details: Dict) -> str:
        tool_id = self.activity_tracker.tool_started(tool_name, details)
        self.last_activity_time = time.time()
        self.refresh()
        return tool_id

    def complete_activity(self, tool_id: str, duration: float = 0.0):
        self.last_activity_time = time.time()
        self.activity_tracker.tool_completed(tool_id, duration)
        self.refresh()

    def set_claude_running(self, running: bool):
        """Set whether Claude is currently running (for heartbeat display)."""
        self.claude_running = running
        if running:
            self.last_activity_time = time.time()
        self.refresh()

    def update_tasks(self, in_progress: List[Dict], completions: List[Dict]):
        self.tasks_in_progress = in_progress
        self.recent_completions = completions
        self.refresh()


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    'Activity',
    'ActivityTracker',
    'RichTUIManager',
    'RICH_AVAILABLE',
]
