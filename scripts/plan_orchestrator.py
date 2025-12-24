#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Plan Orchestrator - Python wrapper for autonomous plan execution.

This script repeatedly invokes Claude Code to execute a plan until completion.
It handles:
- Monitoring plan status between runs
- Restarting Claude Code sessions as needed
- Logging progress and errors
- Graceful interruption and resume
- Rich TUI with live activity tracking

Usage:
    python scripts/plan_orchestrator.py [options]

Options:
    --plan PATH         Path to plan file (uses active plan if not specified)
    --max-iterations N  Maximum number of Claude invocations (default: 50)
    --batch-size N      Tasks per iteration hint (default: 5)
    --timeout SECONDS   Timeout per Claude session (default: 600)
    --dry-run           Show what would be done without executing
    --verbose           Enable verbose logging
    --continue          Continue from last run (skip confirmation)
    --no-tui            Disable Rich TUI (use plain text output)
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

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

# Configuration
DEFAULT_MAX_ITERATIONS = 50
DEFAULT_TIMEOUT = 600  # 10 minutes per session
DEFAULT_BATCH_SIZE = 5
PLAN_RUNNER_SCRIPT = "./scripts/plan-runner.sh"
STATUS_CHECK_INTERVAL = 2  # seconds between status checks


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
        """Format a human-readable description of the tool call."""
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
            cmd = details.get('command', '')[:35]
            return f"Bash: {cmd}..."
        elif tool_name == 'Task':
            desc = details.get('description', 'agent')
            return f"Task: {desc}"
        elif tool_name == 'Grep':
            pattern = details.get('pattern', '')[:20]
            return f"Grep: {pattern}"
        elif tool_name == 'Glob':
            pattern = details.get('pattern', '')[:20]
            return f"Glob: {pattern}"
        elif tool_name == 'WebSearch':
            query = details.get('query', '')[:25]
            return f"WebSearch: {query}"
        elif tool_name == 'TodoWrite':
            return "TodoWrite: updating tasks"
        else:
            return f"{tool_name}"

    def _truncate_path(self, path: str, max_len: int = 40) -> str:
        """Truncate a path for display."""
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
# Streaming Claude Runner
# =============================================================================

class StreamingClaudeRunner:
    """Runs Claude CLI with streaming JSON output and event callbacks."""

    def __init__(
        self,
        on_tool_start: Optional[Callable[[str, Dict], None]] = None,
        on_tool_end: Optional[Callable[[str, str, float], None]] = None,
        on_text: Optional[Callable[[str], None]] = None,
        timeout: int = 600
    ):
        self.on_tool_start = on_tool_start
        self.on_tool_end = on_tool_end  # (tool_name, tool_id, duration_seconds) -> None
        self.on_text = on_text
        self.timeout = timeout
        self.process: Optional[subprocess.Popen] = None
        self._tool_inputs: Dict[int, str] = {}      # index -> accumulated JSON
        self._tool_names: Dict[int, str] = {}       # index -> tool name
        self._tool_ids: Dict[int, str] = {}         # index -> tool id (from Claude)
        self._tool_start_times: Dict[int, float] = {}  # index -> start timestamp
        self._current_index: int = 0

    def run(self, prompt: str) -> Tuple[bool, str]:
        """Run Claude with streaming output, calling callbacks for events."""
        cmd = [
            "claude", "-p", prompt,
            "--dangerously-skip-permissions",
            "--output-format", "stream-json"
        ]

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )

            output_parts = []

            # Read stdout line by line
            for line in self.process.stdout:
                line = line.strip()
                if line:
                    self._parse_json_line(line, output_parts)

            # Wait for process to complete
            self.process.wait(timeout=self.timeout)
            success = self.process.returncode == 0

            # Capture any stderr
            stderr = self.process.stderr.read()
            if stderr:
                output_parts.append(stderr)

            return success, ''.join(output_parts)

        except subprocess.TimeoutExpired:
            if self.process:
                self.process.kill()
                self.process.wait()
            return False, "Session timed out"
        except FileNotFoundError:
            return False, "Claude CLI not found"
        except Exception as e:
            return False, str(e)
        finally:
            self.process = None

    def _parse_json_line(self, line: str, output_parts: List[str]):
        """Parse a streaming JSON line and dispatch to callbacks."""
        try:
            data = json.loads(line)
            event_type = data.get('type')

            if event_type == 'content_block_start':
                content_block = data.get('content_block', {})
                block_type = content_block.get('type')
                index = data.get('index', 0)

                if block_type == 'tool_use':
                    tool_name = content_block.get('name', 'Unknown')
                    tool_id = content_block.get('id', '')

                    # Store tool info for later
                    self._tool_names[index] = tool_name
                    self._tool_ids[index] = tool_id
                    self._tool_inputs[index] = ""
                    self._tool_start_times[index] = time.time()
                    self._current_index = index

                    # Fire on_tool_start immediately when tool begins
                    # (we don't have full input yet, but we have tool name)
                    if self.on_tool_start:
                        # Pass partial details - just the tool_id for now
                        self.on_tool_start(tool_name, {'id': tool_id})

            elif event_type == 'content_block_delta':
                delta = data.get('delta', {})
                delta_type = delta.get('type')
                index = data.get('index', self._current_index)

                if delta_type == 'text_delta':
                    text = delta.get('text', '')
                    if text and self.on_text:
                        self.on_text(text)
                    output_parts.append(text)

                elif delta_type == 'input_json_delta':
                    # Accumulate tool input JSON
                    partial = delta.get('partial_json', '')
                    if index in self._tool_inputs:
                        self._tool_inputs[index] += partial

            elif event_type == 'content_block_stop':
                index = data.get('index', self._current_index)

                if index in self._tool_names:
                    tool_name = self._tool_names[index]
                    tool_id = self._tool_ids.get(index, '')
                    details = {}

                    # Try to parse accumulated input
                    if index in self._tool_inputs:
                        try:
                            details = json.loads(self._tool_inputs[index])
                        except json.JSONDecodeError:
                            pass

                    # Calculate duration
                    duration = 0.0
                    if index in self._tool_start_times:
                        duration = time.time() - self._tool_start_times[index]

                    # Fire on_tool_end when tool completes
                    if self.on_tool_end:
                        self.on_tool_end(tool_name, tool_id, duration)

                    # Clean up
                    del self._tool_names[index]
                    if index in self._tool_inputs:
                        del self._tool_inputs[index]
                    if index in self._tool_ids:
                        del self._tool_ids[index]
                    if index in self._tool_start_times:
                        del self._tool_start_times[index]

        except json.JSONDecodeError:
            pass  # Skip malformed lines

    def stop(self):
        """Stop the running process."""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()


# =============================================================================
# Status Monitor
# =============================================================================

class StatusMonitor:
    """Background monitor that watches status.json for changes."""

    def __init__(
        self,
        status_path: str,
        callback: Callable[[Dict], None],
        interval: float = 0.5  # Reduced from 2.0s to 500ms for responsiveness
    ):
        self.status_path = status_path
        self.callback = callback
        self.interval = interval
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_mtime: float = 0
        self._use_inotify = False
        self._watcher = None

        # Try to use inotify for more responsive updates (Linux only)
        try:
            import inotify.adapters
            self._use_inotify = True
        except ImportError:
            pass  # Fall back to polling

    def start(self):
        """Start the background monitoring thread."""
        self._stop_event.clear()

        if self._use_inotify:
            self._thread = threading.Thread(target=self._inotify_loop, daemon=True)
        else:
            self._thread = threading.Thread(target=self._poll_loop, daemon=True)

        self._thread.start()

    def stop(self):
        """Stop the background monitoring thread."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5.0)

    def _poll_loop(self):
        """Polling-based monitoring loop (fallback)."""
        while not self._stop_event.is_set():
            try:
                self._check_status()
            except Exception:
                pass  # Silently handle errors

            self._stop_event.wait(self.interval)

    def _inotify_loop(self):
        """inotify-based monitoring loop (Linux, more responsive)."""
        try:
            import inotify.adapters
            import inotify.constants

            # Watch the directory containing status.json
            watch_dir = os.path.dirname(self.status_path)
            watch_file = os.path.basename(self.status_path)

            i = inotify.adapters.Inotify()
            i.add_watch(watch_dir, mask=inotify.constants.IN_MODIFY | inotify.constants.IN_CLOSE_WRITE)

            # Initial check
            self._check_status()

            for event in i.event_gen(yield_nones=True, timeout_s=0.5):
                if self._stop_event.is_set():
                    break

                if event is not None:
                    (_, type_names, path, filename) = event
                    if filename == watch_file:
                        self._check_status()

        except Exception:
            # Fall back to polling if inotify fails
            self._poll_loop()

    def _check_status(self):
        """Check status.json and invoke callback if changed."""
        try:
            mtime = os.path.getmtime(self.status_path)
            if mtime > self._last_mtime:
                self._last_mtime = mtime
                with open(self.status_path, 'r') as f:
                    status = json.load(f)
                self.callback(status)
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            pass


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
        table = Table(show_header=False, box=None, padding=(0, 1))
        table.add_column("Time", style="dim", width=10)
        table.add_column("Activity", style="white", overflow="ellipsis")
        table.add_column("Duration", style="dim", width=8, justify="right")

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
        table = Table(show_header=False, box=None)
        table.add_column("Task", style="yellow", overflow="ellipsis")

        for task in self.tasks_in_progress[:4]:
            task_id = task.get('id', '?')
            desc = task.get('description', '')[:35]
            table.add_row(f"{task_id}: {desc}")

        if not self.tasks_in_progress:
            table.add_row(Text("[dim]No tasks in progress[/dim]"))

        return Panel(table, title="In Progress", border_style="yellow")

    def _render_completions(self) -> Panel:
        """Render recently completed tasks."""
        table = Table(show_header=False, box=None)
        table.add_column("Task", style="green", overflow="ellipsis")

        for task in self.recent_completions[:4]:
            task_id = task.get('id', '?')
            desc = task.get('description', '')[:30]
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
# Plan Status
# =============================================================================

class PlanStatus:
    """Represents the current state of a plan."""

    def __init__(self, data: dict):
        self.plan_path = data.get("planPath", "")
        self.plan_name = data.get("planName", "Unknown")
        self.total = data.get("total", 0)
        self.completed = data.get("completed", 0)
        self.in_progress = data.get("inProgress", 0)
        self.pending = data.get("pending", 0)
        self.failed = data.get("failed", 0)
        self.skipped = data.get("skipped", 0)
        self.percentage = data.get("percentage", 0)
        self.current_phase = data.get("currentPhase", "")

    @property
    def is_complete(self) -> bool:
        return self.percentage >= 100 or self.pending == 0

    @property
    def is_blocked(self) -> bool:
        return self.pending == 0 and self.failed > 0

    def __str__(self) -> str:
        bar_width = 30
        filled = int(bar_width * self.percentage / 100)
        bar = "█" * filled + "░" * (bar_width - filled)
        return (
            f"[{bar}] {self.percentage}% "
            f"({self.completed}/{self.total} tasks)\n"
            f"  Pending: {self.pending} | In Progress: {self.in_progress} | "
            f"Failed: {self.failed} | Skipped: {self.skipped}"
        )


class PlanOrchestrator:
    """Orchestrates plan execution across multiple Claude Code sessions."""

    def __init__(
        self,
        plan_path: Optional[str] = None,
        max_iterations: int = DEFAULT_MAX_ITERATIONS,
        timeout: int = DEFAULT_TIMEOUT,
        batch_size: int = DEFAULT_BATCH_SIZE,
        dry_run: bool = False,
        verbose: bool = False,
        use_tui: bool = True,
    ):
        self.plan_path = plan_path
        self.max_iterations = max_iterations
        self.timeout = timeout
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.verbose = verbose
        self.use_tui = use_tui and RICH_AVAILABLE

        self.iteration = 0
        self.start_time = None
        self.tasks_completed_this_run = 0

        # TUI components (initialized in run() if use_tui is True)
        self.tui: Optional[RichTUIManager] = None
        self.status_monitor: Optional[StatusMonitor] = None
        self.streaming_runner: Optional[StreamingClaudeRunner] = None

        # Set up logging (quieter when TUI is active)
        level = logging.DEBUG if verbose else (logging.WARNING if use_tui else logging.INFO)
        logging.basicConfig(
            level=level,
            format="%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%H:%M:%S",
        )
        self.logger = logging.getLogger(__name__)

    def get_status(self) -> Optional[PlanStatus]:
        """Get current plan status from plan-runner.sh."""
        try:
            result = subprocess.run(
                [PLAN_RUNNER_SCRIPT, "status"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                self.logger.error(f"Status check failed: {result.stderr}")
                return None

            data = json.loads(result.stdout)
            return PlanStatus(data)
        except subprocess.TimeoutExpired:
            self.logger.error("Status check timed out")
            return None
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse status: {e}")
            return None
        except FileNotFoundError:
            self.logger.error(f"Plan runner script not found: {PLAN_RUNNER_SCRIPT}")
            return None

    def get_next_tasks(self, count: int = 5) -> list:
        """Get next recommended tasks."""
        try:
            result = subprocess.run(
                [PLAN_RUNNER_SCRIPT, "next", str(count)],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                return []

            data = json.loads(result.stdout)
            return data.get("tasks", [])
        except Exception as e:
            self.logger.error(f"Failed to get next tasks: {e}")
            return []

    def get_retryable_tasks(self) -> list:
        """Get failed tasks that can be retried (retryCount < 2)."""
        try:
            result = subprocess.run(
                ["node", "scripts/status-cli.js", "retryable"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                return []

            data = json.loads(result.stdout)
            return data.get("tasks", [])
        except Exception as e:
            self.logger.warning(f"Failed to get retryable tasks: {e}")
            return []

    def increment_retry(self, task_id: str, error: str) -> dict:
        """Increment retry count for a failed task."""
        try:
            result = subprocess.run(
                ["node", "scripts/status-cli.js", "increment-retry", task_id, "--error", error],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                return {"canRetry": False, "error": result.stderr}

            return json.loads(result.stdout)
        except Exception as e:
            self.logger.warning(f"Failed to increment retry for {task_id}: {e}")
            return {"canRetry": False, "error": str(e)}

    def reset_task_for_retry(self, task_id: str) -> bool:
        """Reset a failed task to pending for retry."""
        try:
            result = subprocess.run(
                ["node", "scripts/status-cli.js", "mark-started", task_id],
                capture_output=True,
                text=True,
                timeout=30,
            )
            return result.returncode == 0
        except Exception as e:
            self.logger.warning(f"Failed to reset task {task_id} for retry: {e}")
            return False

    def detect_stuck_tasks(self) -> list:
        """Detect and mark stuck tasks as failed."""
        try:
            result = subprocess.run(
                ["node", "scripts/status-cli.js", "detect-stuck"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                return []

            data = json.loads(result.stdout)
            return data.get("stuckTasks", [])
        except Exception as e:
            self.logger.warning(f"Failed to detect stuck tasks: {e}")
            return []

    def run_claude_session(self, prompt: str) -> tuple[bool, str]:
        """Run a single Claude Code session with the given prompt."""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would execute: claude -p '{prompt[:50]}...'")
            return True, "Dry run - no execution"

        try:
            self.logger.info("Starting Claude Code session...")

            # Run claude with the orchestrate command
            result = subprocess.run(
                ["claude", "-p", prompt, "--dangerously-skip-permissions"],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=os.getcwd(),
            )

            success = result.returncode == 0
            output = result.stdout + result.stderr

            if not success:
                self.logger.warning(f"Claude session ended with code {result.returncode}")

            return success, output

        except subprocess.TimeoutExpired:
            self.logger.warning(f"Claude session timed out after {self.timeout}s")
            return False, "Session timed out"
        except FileNotFoundError:
            self.logger.error("Claude CLI not found. Is it installed and in PATH?")
            return False, "Claude CLI not found"
        except Exception as e:
            self.logger.error(f"Claude session failed: {e}")
            return False, str(e)

    def print_header(self, status: PlanStatus):
        """Print orchestrator header."""
        print("\n" + "═" * 65)
        print("  PLAN ORCHESTRATOR")
        print("═" * 65)
        print(f"  Plan: {status.plan_name}")
        print(f"  Phase: {status.current_phase}")
        print(f"  Status: {status}")
        print("═" * 65 + "\n")

    def print_progress(self, status: PlanStatus, iteration: int):
        """Print current progress."""
        elapsed = time.time() - self.start_time if self.start_time else 0
        elapsed_str = time.strftime("%H:%M:%S", time.gmtime(elapsed))

        print(f"\n{'─' * 65}")
        print(f"  Iteration {iteration}/{self.max_iterations} | Elapsed: {elapsed_str}")
        print(f"  {status}")
        print(f"{'─' * 65}\n")

    def print_completion(self, status: PlanStatus, reason: str):
        """Print completion summary."""
        elapsed = time.time() - self.start_time if self.start_time else 0
        elapsed_str = time.strftime("%H:%M:%S", time.gmtime(elapsed))

        print("\n" + "═" * 65)
        print(f"  ORCHESTRATION {reason.upper()}")
        print("═" * 65)
        print(f"  Plan: {status.plan_name}")
        print(f"  Final Status: {status.percentage}% complete")
        print(f"  Tasks Completed: {status.completed}/{status.total}")
        print(f"  Failed: {status.failed} | Skipped: {status.skipped}")
        print(f"  Iterations: {self.iteration}")
        print(f"  Duration: {elapsed_str}")
        print("═" * 65 + "\n")

    def _get_output_dir(self) -> Optional[str]:
        """Get the output directory for the current plan."""
        try:
            pointer_path = ".claude/current-plan-output.txt"
            if os.path.exists(pointer_path):
                with open(pointer_path, 'r') as f:
                    return f.read().strip()
        except Exception:
            pass
        return None

    def _on_tool_start(self, tool_name: str, details: Dict):
        """Callback when a tool starts (TUI mode)."""
        if self.tui:
            self.tui.add_activity(tool_name, details)

    def _on_tool_end(self, tool_name: str, tool_id: str, duration: float):
        """Callback when a tool completes (TUI mode)."""
        if self.tui:
            self.tui.complete_activity(tool_id, duration)

    def _on_status_update(self, status_data: Dict):
        """Callback when status.json is updated (TUI mode)."""
        if self.tui:
            summary = status_data.get('summary', {})
            # Pass all counts including in_progress from summary
            self.tui.set_progress(
                summary.get('completed', 0),
                summary.get('totalTasks', 0),
                summary.get('pending', 0),
                summary.get('failed', 0),
                summary.get('in_progress', 0)
            )

            # Update current phase
            current_phase = status_data.get('currentPhase', '')
            if current_phase:
                self.tui.set_phase(current_phase)

            # Update task lists - use actual in_progress tasks from status.json (not getNextTasks)
            tasks = status_data.get('tasks', [])
            in_progress = [t for t in tasks if t.get('status') == 'in_progress']
            completed = [t for t in tasks if t.get('status') == 'completed'][-5:]
            self.tui.update_tasks(in_progress, list(reversed(completed)))

    def run(self) -> int:
        """Main orchestration loop. Returns exit code."""
        self.start_time = time.time()

        # Initial status check
        status = self.get_status()
        if not status:
            self.logger.error("Could not get initial plan status")
            return 1

        if not status.plan_path:
            self.logger.error("No active plan. Use /plan:set to choose a plan first.")
            return 1

        # Initialize TUI if enabled
        if self.use_tui:
            try:
                self.tui = RichTUIManager(status.plan_name)
                self.tui.set_phase(status.current_phase)
                self.tui.set_progress(status.completed, status.total, status.pending, status.failed, status.in_progress)
                self.tui.set_iteration(0, self.max_iterations)

                # Start status monitor with faster polling (500ms)
                output_dir = self._get_output_dir()
                if output_dir:
                    status_path = os.path.join(output_dir, 'status.json')
                    if os.path.exists(status_path):
                        self.status_monitor = StatusMonitor(
                            status_path,
                            self._on_status_update,
                            interval=0.5  # Reduced from 1.0s for better responsiveness
                        )
                        self.status_monitor.start()

                # NOTE: StreamingClaudeRunner disabled due to --output-format stream-json bug
                # The TUI still displays progress via status.json file monitoring

                self.tui.start()
            except Exception as e:
                self.logger.warning(f"Failed to initialize TUI: {e}, falling back to plain mode")
                self.use_tui = False
                self.tui = None

        if not self.use_tui:
            self.print_header(status)

        # Check if already complete
        if status.is_complete:
            if self.use_tui:
                self.tui.set_status("Plan is already complete!")
                time.sleep(2)
            else:
                self.logger.info("Plan is already complete!")
                self.print_completion(status, "already complete")
            self._cleanup()
            return 0

        consecutive_failures = 0
        max_consecutive_failures = 3

        try:
            # Main loop
            while self.iteration < self.max_iterations:
                self.iteration += 1

                if self.use_tui:
                    self.tui.set_iteration(self.iteration, self.max_iterations)

                # Get current status
                status = self.get_status()
                if not status:
                    consecutive_failures += 1
                    if consecutive_failures >= max_consecutive_failures:
                        self.logger.error("Too many consecutive failures, stopping")
                        self._cleanup()
                        return 1
                    time.sleep(STATUS_CHECK_INTERVAL)
                    continue

                consecutive_failures = 0

                if self.use_tui:
                    self.tui.set_progress(status.completed, status.total, status.pending, status.failed, status.in_progress)
                    self.tui.set_phase(status.current_phase)
                else:
                    self.print_progress(status, self.iteration)

                # Check completion
                if status.is_complete:
                    if self.use_tui:
                        self.tui.set_status("Plan complete!")
                        time.sleep(2)
                    else:
                        self.print_completion(status, "complete")
                    self._cleanup()
                    return 0

                # Check for stuck tasks and mark them as failed
                stuck_tasks = self.detect_stuck_tasks()
                if stuck_tasks:
                    if self.use_tui:
                        self.tui.set_status(f"Detected {len(stuck_tasks)} stuck task(s), marking as failed")
                    else:
                        self.logger.warning(f"Detected {len(stuck_tasks)} stuck task(s)")
                    for task in stuck_tasks:
                        self.logger.info(f"  Stuck: {task.get('id')} (in_progress for {task.get('elapsedMinutes', '?')} min)")

                # Check if blocked - but first try to retry failed tasks
                if status.is_blocked:
                    # Try to find retryable tasks
                    retryable = self.get_retryable_tasks()
                    if retryable:
                        if self.use_tui:
                            self.tui.set_status(f"Retrying {len(retryable)} failed task(s)")
                        else:
                            self.logger.info(f"Found {len(retryable)} task(s) eligible for retry")

                        # Reset the first retryable task and continue
                        for task in retryable[:self.batch_size]:
                            task_id = task.get('id')
                            retry_count = task.get('retryCount', 0) + 1
                            if self.use_tui:
                                self.tui.set_status(f"Retry #{retry_count} for task {task_id}")
                            else:
                                self.logger.info(f"Retrying task {task_id} (attempt #{retry_count})")
                            self.reset_task_for_retry(task_id)
                        # Refresh status and continue loop
                        status = self.get_status()
                        if status and status.is_blocked:
                            pass  # Still blocked after retry attempts
                        else:
                            continue  # Tasks were reset, continue with fresh status
                    else:
                        # No retryable tasks left, truly blocked
                        if self.use_tui:
                            self.tui.set_status("Plan blocked - all remaining tasks have failed (no retries left)")
                            time.sleep(2)
                        else:
                            self.logger.warning("Plan is blocked - all remaining tasks have failed and retries exhausted")
                            self.print_completion(status, "blocked")
                        self._cleanup()
                        return 2

                # Get next tasks for context
                next_tasks = self.get_next_tasks(self.batch_size)
                task_ids = [t.get("id", "?") for t in next_tasks]

                if self.use_tui:
                    self.tui.set_status(f"Running tasks: {', '.join(task_ids)}")
                    self.tui.update_tasks(next_tasks, self.tui.recent_completions)
                else:
                    self.logger.info(f"Next tasks: {', '.join(task_ids)}")

                # Build prompt for Claude
                prompt = self._build_prompt(status, next_tasks)

                # Run Claude session
                # NOTE: Always use run_claude_session() - the StreamingClaudeRunner
                # with --output-format stream-json has a bug causing premature exit.
                # The TUI still works for progress display via status.json monitoring.
                if self.use_tui:
                    self.tui.set_claude_running(True)

                success, output = self.run_claude_session(prompt)

                if self.use_tui:
                    self.tui.set_claude_running(False)

                if not success:
                    if self.use_tui:
                        self.tui.set_status("Session ended with errors")
                    elif self.verbose and output:
                        print(f"\n--- Claude Output ---\n{output[:2000]}\n--- End Output ---\n")

                # Brief pause between iterations
                if not self.dry_run:
                    time.sleep(STATUS_CHECK_INTERVAL)

            # Max iterations reached
            status = self.get_status()
            if status:
                if self.use_tui:
                    self.tui.set_status("Max iterations reached")
                    time.sleep(2)
                else:
                    self.print_completion(status, "max iterations reached")

            self._cleanup()
            return 0 if status and status.is_complete else 3

        except Exception as e:
            self.logger.error(f"Orchestration error: {e}")
            self._cleanup()
            raise

    def _cleanup(self):
        """Clean up TUI and monitor resources."""
        if self.status_monitor:
            self.status_monitor.stop()
            self.status_monitor = None
        if self.tui:
            self.tui.stop()
            self.tui = None

    def _build_prompt(self, status: PlanStatus, next_tasks: list) -> str:
        """Build the prompt for Claude Code.

        This prompt is designed to be clear and reliable:
        - Uses status-cli.js commands instead of inline JavaScript
        - Provides explicit implementation instructions
        - Includes error recovery guidance
        - Never references skill invocations
        """
        task_list = "\n".join(
            f"  - {t.get('id')}: {t.get('description')}"
            for t in next_tasks
        )

        return f"""Execute these tasks from the plan:

{task_list}

Plan: {status.plan_path}
Progress: {status.percentage}% ({status.completed}/{status.total} tasks)

## How to Implement Each Task

1. **Mark task started:**
   ```bash
   node scripts/status-cli.js mark-started TASK_ID
   ```

2. **Read the plan file** to understand detailed requirements:
   - Open {status.plan_path}
   - Find the task section (look for "TASK_ID" in the markdown)
   - Read all bullet points and sub-tasks

3. **Implement the task:**
   - Make the actual code/file changes
   - Create, edit, or delete files as needed
   - Run tests or builds if the task requires it

4. **Mark task complete:**
   ```bash
   node scripts/status-cli.js mark-complete TASK_ID --notes "Brief summary of changes"
   ```

## If a Task Fails

If you encounter an error you cannot resolve:

```bash
node scripts/status-cli.js mark-failed TASK_ID --error "Description of what went wrong"
```

Then continue to the next task.

## Rules

- Execute autonomously - do NOT ask for confirmation
- Implement directly - do NOT use slash commands or skills
- Use parallel Task agents for independent subtasks
- Stop after this batch or if blocked
- Check progress: `node scripts/status-cli.js progress`"""


def main():
    parser = argparse.ArgumentParser(
        description="Orchestrate plan execution across multiple Claude Code sessions"
    )
    parser.add_argument(
        "--plan",
        type=str,
        help="Path to plan file (uses active plan if not specified)",
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=DEFAULT_MAX_ITERATIONS,
        help=f"Maximum Claude invocations (default: {DEFAULT_MAX_ITERATIONS})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Timeout per session in seconds (default: {DEFAULT_TIMEOUT})",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Tasks per iteration hint (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without executing",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--continue", "-c",
        dest="continue_run",
        action="store_true",
        help="Continue from last run without confirmation",
    )
    parser.add_argument(
        "--no-tui",
        action="store_true",
        help="Disable Rich TUI (use plain text output)",
    )

    args = parser.parse_args()

    # Confirmation prompt unless --continue
    if not args.continue_run and not args.dry_run:
        print("\nPlan Orchestrator")
        print("=" * 40)
        print("This will run Claude Code repeatedly until the plan is complete.")
        print(f"Max iterations: {args.max_iterations}")
        print(f"Timeout per session: {args.timeout}s")
        print()

        try:
            response = input("Continue? [y/N] ").strip().lower()
            if response != "y":
                print("Aborted.")
                return 0
        except KeyboardInterrupt:
            print("\nAborted.")
            return 0

    orchestrator = PlanOrchestrator(
        plan_path=args.plan,
        max_iterations=args.max_iterations,
        timeout=args.timeout,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        verbose=args.verbose,
        use_tui=not args.no_tui,
    )

    try:
        return orchestrator.run()
    except KeyboardInterrupt:
        orchestrator._cleanup()
        print("\n\nInterrupted by user. Progress has been saved.")
        status = orchestrator.get_status()
        if status:
            orchestrator.print_completion(status, "interrupted")
        return 130


if __name__ == "__main__":
    sys.exit(main())
