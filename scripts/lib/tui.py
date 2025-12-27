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

import json
import subprocess
import threading
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from enum import Enum, auto
from typing import Callable, Dict, List, Optional, Any

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
# Panel Navigation
# =============================================================================

class FocusablePanel(Enum):
    """Enum for panels that can receive keyboard focus."""
    IN_PROGRESS = auto()
    COMPLETIONS = auto()
    ACTIVITY = auto()


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

class LayoutMode(Enum):
    """Layout mode based on terminal size."""
    COMPACT = auto()    # Small terminals (<24 rows)
    STANDARD = auto()   # Normal terminals (24-39 rows)
    FULL = auto()       # Large terminals (40+ rows)


class RichTUIManager:
    """Manages the Rich-based TUI for the orchestrator."""

    # Terminal size thresholds
    MIN_ROWS_COMPACT = 24    # Below this = compact mode
    MIN_ROWS_FULL = 40       # Above this = full mode
    MIN_COLS_COMPACT = 80    # Below this = hide some panels

    def __init__(self, plan_name: str):
        if not RICH_AVAILABLE:
            raise RuntimeError("Rich library not available")

        self.console = Console()
        self.plan_name = plan_name
        self.current_phase = ""
        self.iteration = 0
        self.max_iterations = 50
        self.start_time = time.time()

        # Terminal size tracking
        self._terminal_rows = 0
        self._terminal_cols = 0
        self._layout_mode = LayoutMode.STANDARD
        self._detect_terminal_size()

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

        # Navigation state
        self._focused_panel: FocusablePanel = FocusablePanel.IN_PROGRESS
        self._selection_index: Dict[FocusablePanel, int] = {
            FocusablePanel.IN_PROGRESS: 0,
            FocusablePanel.COMPLETIONS: 0,
            FocusablePanel.ACTIVITY: 0,
        }
        self._keyboard_enabled = False  # Set True when keyboard handler attached

        # Action callbacks (set by keyboard handler integration)
        self._on_task_action: Optional[Callable[[str, Dict], Any]] = None

        # Keyboard handler (optional, set via attach_keyboard_handler)
        self._keyboard_handler: Optional[Any] = None  # KeyboardHandler from scripts.tui.keyboard

        # Overlay manager (optional, set via attach_overlay_manager)
        self._overlay_manager: Optional[Any] = None  # OverlayManager from scripts.tui.overlays

        # Phase progress panel (optional, set via attach_phase_panel)
        self._phase_panel: Optional[Any] = None  # PhaseProgressPanel from scripts.tui.panels
        self._show_phases = True  # Whether to show phase panel

        # Upcoming tasks panel (optional, set via attach_upcoming_panel)
        self._upcoming_panel: Optional[Any] = None  # UpcomingPanel from scripts.tui.panels
        self._show_upcoming = True  # Whether to show upcoming panel

        # Run history panel (optional, set via attach_run_history_panel)
        self._run_history_panel: Optional[Any] = None  # RunHistoryPanel from scripts.tui.panels
        self._show_run_history = True  # Whether to show run history panel

        # Dependency graph panel (optional, set via attach_dependency_graph_panel)
        self._dependency_graph_panel: Optional[Any] = None  # DependencyGraphPanel from scripts.tui.panels
        self._show_dependency_graph = True  # Whether to show dependency graph panel

        # Agent tracker panel (optional, set via attach_agent_tracker_panel)
        self._agent_tracker_panel: Optional[Any] = None  # AgentTrackerPanel from scripts.tui.panels
        self._show_agent_tracker = True  # Whether to show agent tracker panel

        # Subtask tree panel (optional, set via attach_subtask_tree_panel)
        self._subtask_tree_panel: Optional[Any] = None  # SubtaskTreePanel from scripts.tui.panels
        self._show_subtask_tree = False  # Whether to show subtask tree panel (hidden by default, toggle with 7)

        # Artifact browser panel (optional, set via attach_artifact_browser_panel)
        self._artifact_browser_panel: Optional[Any] = None  # ArtifactBrowserPanel from scripts.tui.panels
        self._show_artifact_browser = False  # Whether to show artifact browser panel (hidden by default, toggle with 8)

        # Search mode state
        self._search_query = ""
        self._search_matches: List[Dict] = []  # List of matching task dicts
        self._search_match_index = 0  # Current match index (for n/N navigation)
        self._search_active = False  # Whether search highlighting is active

        # Activity panel visibility (always available, toggled via keyboard)
        self._show_activity = True  # Whether to show activity panel

        # Responsive layout settings
        self._auto_hide_panels = True  # Auto-hide panels when terminal is small

        # Panel visibility state for toggle keys
        # Maps panel number (1-8) to panel name for status display
        self._panel_names = {
            1: 'Phases',
            2: 'Upcoming',
            3: 'Run History',
            4: 'Dependencies',
            5: 'Activity',
            6: 'Agents',
            7: 'Subtasks',
            8: 'Artifacts',
        }

        # Task action handler (optional, set via attach_task_action_handler)
        self._task_action_handler: Optional[Any] = None  # TaskActionHandler from scripts.tui.task_actions

        # Quit callback
        self._on_quit: Optional[Callable[[], None]] = None

        # Configuration manager (optional, set via load_config)
        self._config: Optional[Any] = None  # TUIConfig from scripts.tui.config
        self._config_manager: Optional[Any] = None  # ConfigManager from scripts.tui.config

        # Focus mode state
        self._focus_mode = False  # Whether focus mode is active
        self._focus_panel: Optional[str] = None  # Panel to maximize in focus mode

        # Error handler (optional, set via attach_error_handler)
        self._error_handler: Optional[Any] = None  # ErrorHandler from scripts.tui.error_handler

        # Layout
        self.layout = self._create_layout()
        self.live: Optional[Live] = None
        self._lock = threading.Lock()

        # Load configuration on init
        self._load_config()

    # =========================================================================
    # Configuration Management
    # =========================================================================

    def _load_config(self):
        """Load configuration from file."""
        try:
            from scripts.tui.config import ConfigManager, TUIConfig
            self._config_manager = ConfigManager()
            self._config = self._config_manager.load()

            # Apply panel visibility from config
            if self._config:
                self._show_phases = self._config.is_panel_visible('phases')
                self._show_upcoming = self._config.is_panel_visible('upcoming')
                self._show_run_history = self._config.is_panel_visible('run_history')
                self._show_dependency_graph = self._config.is_panel_visible('dependency_graph')
                self._show_activity = self._config.is_panel_visible('activity')
                self._show_agent_tracker = self._config.is_panel_visible('agent_tracker')
                self._show_subtask_tree = self._config.is_panel_visible('subtask_tree')
                self._show_artifact_browser = self._config.is_panel_visible('artifact_browser')
                self._auto_hide_panels = self._config.auto_hide_panels
                self._focus_panel = self._config.focus_mode_panel

        except ImportError:
            # Config module not available - use defaults
            self._config = None
            self._config_manager = None
        except Exception:
            # Other errors - use defaults
            self._config = None
            self._config_manager = None

    def save_config(self):
        """Save current configuration to file."""
        if not self._config or not self._config_manager:
            return

        # Update config with current state
        self._config.panel_visibility['phases'] = self._show_phases
        self._config.panel_visibility['upcoming'] = self._show_upcoming
        self._config.panel_visibility['run_history'] = self._show_run_history
        self._config.panel_visibility['dependency_graph'] = self._show_dependency_graph
        self._config.panel_visibility['activity'] = self._show_activity
        self._config.panel_visibility['agent_tracker'] = self._show_agent_tracker
        self._config.panel_visibility['subtask_tree'] = self._show_subtask_tree
        self._config.panel_visibility['artifact_browser'] = self._show_artifact_browser
        self._config.auto_hide_panels = self._auto_hide_panels
        self._config.focus_mode_panel = self._focus_panel

        # Save to file
        try:
            self._config_manager.save(self._config)
        except Exception:
            pass  # Silently fail on save errors

    @property
    def config(self) -> Optional[Any]:
        """Get the current TUI configuration."""
        return self._config

    # =========================================================================
    # Terminal Size Detection and Responsive Layout
    # =========================================================================

    def _detect_terminal_size(self):
        """Detect current terminal size and update layout mode."""
        try:
            import shutil
            cols, rows = shutil.get_terminal_size((80, 24))
            self._terminal_cols = cols
            self._terminal_rows = rows

            # Determine layout mode based on terminal height
            if rows < self.MIN_ROWS_COMPACT:
                self._layout_mode = LayoutMode.COMPACT
            elif rows >= self.MIN_ROWS_FULL:
                self._layout_mode = LayoutMode.FULL
            else:
                self._layout_mode = LayoutMode.STANDARD

        except Exception:
            # Fallback to standard size
            self._terminal_cols = 80
            self._terminal_rows = 24
            self._layout_mode = LayoutMode.STANDARD

    def check_terminal_resize(self) -> bool:
        """
        Check if terminal was resized and update layout mode.

        Returns:
            True if size changed and layout needs rebuild
        """
        old_rows = self._terminal_rows
        old_cols = self._terminal_cols
        old_mode = self._layout_mode

        self._detect_terminal_size()

        # Return True if layout mode changed
        if self._layout_mode != old_mode:
            return True

        # Also return True if significant size change in same mode
        return abs(self._terminal_rows - old_rows) > 5 or abs(self._terminal_cols - old_cols) > 10

    @property
    def layout_mode(self) -> LayoutMode:
        """Get current layout mode."""
        return self._layout_mode

    @property
    def terminal_size(self) -> tuple:
        """Get current terminal size as (cols, rows)."""
        return (self._terminal_cols, self._terminal_rows)

    def _get_effective_panel_visibility(self) -> Dict[str, bool]:
        """
        Get effective panel visibility based on layout mode and user preferences.

        In compact mode, auto-hide low priority panels.
        In standard mode, show user-configured panels.
        In full mode, show all panels.
        """
        visibility = {
            'phases': self._show_phases and self._phase_panel is not None,
            'activity': self._show_activity,
            'dependency_graph': self._show_dependency_graph and self._dependency_graph_panel is not None,
            'agent_tracker': self._show_agent_tracker and self._agent_tracker_panel is not None,
            'subtask_tree': self._show_subtask_tree and self._subtask_tree_panel is not None,
            'artifact_browser': self._show_artifact_browser and self._artifact_browser_panel is not None,
            'upcoming': self._show_upcoming and self._upcoming_panel is not None,
            'run_history': self._show_run_history and self._run_history_panel is not None,
        }

        # In compact mode with auto-hide, hide low priority panels
        if self._auto_hide_panels and self._layout_mode == LayoutMode.COMPACT:
            # Priority order (high to low):
            # 1. activity (always show)
            # 2. phases (show if exists)
            # 3. others (hide in compact)
            visibility['dependency_graph'] = False
            visibility['agent_tracker'] = False
            visibility['subtask_tree'] = False
            visibility['artifact_browser'] = False
            visibility['run_history'] = False

        # In narrow terminals, hide side panels
        if self._auto_hide_panels and self._terminal_cols < self.MIN_COLS_COMPACT:
            visibility['run_history'] = False
            visibility['upcoming'] = False if self._terminal_cols < 100 else visibility['upcoming']

        return visibility

    def _get_layout_sizes(self) -> Dict[str, int]:
        """
        Get panel sizes based on layout mode.

        Returns dict of panel name -> size in rows.
        """
        if self._layout_mode == LayoutMode.COMPACT:
            return {
                'header': 3,       # Compact header
                'progress': 2,     # Single line progress
                'phases': 4,       # Compact phases
                'activity_row': 6, # Smaller activity area
                'tasks': 6,        # Smaller tasks area
                'footer': 1,       # Single line footer
            }
        elif self._layout_mode == LayoutMode.FULL:
            return {
                'header': 6,       # Full header
                'progress': 3,
                'phases': 8,       # Full phases with all details
                'activity_row': 14,# Larger activity area
                'tasks': 10,       # More task rows
                'footer': 2,
            }
        else:  # STANDARD
            return {
                'header': 5,
                'progress': 3,
                'phases': 6,
                'activity_row': 10,
                'tasks': 8,
                'footer': 2,
            }

    def set_auto_hide_panels(self, enabled: bool):
        """
        Enable or disable automatic panel hiding in compact mode.

        Args:
            enabled: Whether to auto-hide panels
        """
        self._auto_hide_panels = enabled
        self.layout = self._make_layout()
        self.refresh()

    def _create_layout(self) -> Layout:
        """Create the TUI layout structure."""
        layout = Layout()

        layout.split(
            Layout(name="header", size=5),
            Layout(name="progress", size=3),
            Layout(name="phases", size=6),  # Phase progress bars
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

    def _make_layout(self) -> Layout:
        """
        Create the TUI layout structure with dynamic panel visibility.

        This method is called during refresh to rebuild layout based on
        current panel visibility settings and terminal size.
        """
        # Check for focus mode - render simplified maximized layout
        if self._focus_mode and self._focus_panel:
            return self._make_focus_layout()

        layout = Layout()

        # Get responsive sizes
        sizes = self._get_layout_sizes()

        # Get effective visibility based on terminal size and user preferences
        visibility = self._get_effective_panel_visibility()

        sections = [
            Layout(name="header", size=sizes['header']),
            Layout(name="progress", size=sizes['progress']),
        ]

        # Conditionally add phases panel
        if visibility['phases']:
            sections.append(Layout(name="phases", size=sizes['phases']))

        # Add activity section (may be split with dependency graph, agent tracker, subtask tree, artifact browser) if visible
        has_activity = visibility['activity']
        has_dep_graph = visibility['dependency_graph']
        has_agent_tracker = visibility['agent_tracker']
        has_subtask_tree = visibility['subtask_tree']
        has_artifact_browser = visibility['artifact_browser']

        if has_activity or has_dep_graph or has_agent_tracker or has_subtask_tree or has_artifact_browser:
            sections.append(Layout(name="activity_row", size=sizes['activity_row']))

        sections.extend([
            Layout(name="tasks", size=sizes['tasks']),
            Layout(name="footer", size=sizes['footer']),
        ])

        layout.split(*sections)

        # Split activity row based on visibility settings
        if has_activity or has_dep_graph or has_agent_tracker or has_subtask_tree or has_artifact_browser:
            visible_panels = []
            if has_activity:
                visible_panels.append(("activity", 2))
            if has_agent_tracker:
                visible_panels.append(("agent_tracker", 1))
            if has_dep_graph:
                visible_panels.append(("dependency_graph", 1))
            if has_subtask_tree:
                visible_panels.append(("subtask_tree", 1))
            if has_artifact_browser:
                visible_panels.append(("artifact_browser", 1))

            # Dynamic layout based on number of visible panels
            if len(visible_panels) == 1:
                layout["activity_row"].split_row(
                    Layout(name=visible_panels[0][0]),
                )
            elif len(visible_panels) == 2:
                layout["activity_row"].split_row(
                    Layout(name=visible_panels[0][0], ratio=visible_panels[0][1]),
                    Layout(name=visible_panels[1][0], ratio=visible_panels[1][1]),
                )
            elif len(visible_panels) == 3:
                layout["activity_row"].split_row(
                    Layout(name=visible_panels[0][0], ratio=visible_panels[0][1]),
                    Layout(name=visible_panels[1][0], ratio=visible_panels[1][1]),
                    Layout(name=visible_panels[2][0], ratio=visible_panels[2][1]),
                )
            elif len(visible_panels) == 4:
                layout["activity_row"].split_row(
                    Layout(name=visible_panels[0][0], ratio=visible_panels[0][1]),
                    Layout(name=visible_panels[1][0], ratio=visible_panels[1][1]),
                    Layout(name=visible_panels[2][0], ratio=visible_panels[2][1]),
                    Layout(name=visible_panels[3][0], ratio=visible_panels[3][1]),
                )
            else:  # 5+ panels - just use first 5
                layout["activity_row"].split_row(
                    Layout(name=visible_panels[0][0], ratio=visible_panels[0][1]),
                    Layout(name=visible_panels[1][0], ratio=visible_panels[1][1]),
                    Layout(name=visible_panels[2][0], ratio=visible_panels[2][1]),
                    Layout(name=visible_panels[3][0], ratio=visible_panels[3][1]),
                    Layout(name=visible_panels[4][0], ratio=visible_panels[4][1]),
                )

        # Split tasks section based on visible panels (using responsive visibility)
        has_upcoming = visibility['upcoming']
        has_run_history = visibility['run_history']

        if has_upcoming and has_run_history:
            # 4-column layout: in_progress, upcoming, completions, run_history
            layout["tasks"].split_row(
                Layout(name="in_progress", ratio=2),
                Layout(name="upcoming", ratio=2),
                Layout(name="completions", ratio=2),
                Layout(name="run_history", ratio=2)
            )
        elif has_upcoming:
            # 3-column layout with upcoming
            layout["tasks"].split_row(
                Layout(name="in_progress", ratio=2),
                Layout(name="upcoming", ratio=2),
                Layout(name="completions", ratio=2)
            )
        elif has_run_history:
            # 3-column layout with run history (next to completions)
            layout["tasks"].split_row(
                Layout(name="in_progress", ratio=2),
                Layout(name="completions", ratio=2),
                Layout(name="run_history", ratio=2)
            )
        else:
            # Original two-column layout
            layout["tasks"].split_row(
                Layout(name="in_progress"),
                Layout(name="completions")
            )

        return layout

    def _make_focus_layout(self) -> Layout:
        """
        Create a maximized layout for focus mode.

        Shows only the focused panel plus minimal header/footer.
        """
        layout = Layout()

        # Simple layout: header + main content + footer
        layout.split(
            Layout(name="header", size=3),
            Layout(name="focus_content"),
            Layout(name="footer", size=3),
        )

        return layout

    def _render_focus_content(self) -> Panel:
        """Render the focused panel content for focus mode."""
        panel_name = self._focus_panel or 'activity'

        # Map panel names to render methods
        panel_renderers = {
            'in_progress': self._render_in_progress,
            'completions': self._render_completions,
            'activity': self._render_activity,
            'phases': self._render_phases,
            'upcoming': self._render_upcoming,
            'run_history': self._render_run_history,
            'dependency_graph': self._render_dependency_graph,
            'agent_tracker': self._render_agent_tracker,
            'subtask_tree': self._render_subtask_tree,
            'artifact_browser': self._render_artifact_browser,
        }

        renderer = panel_renderers.get(panel_name)
        if renderer:
            try:
                return renderer()
            except Exception as e:
                return Panel(
                    Text(f"Error rendering {panel_name}: {e}", style="red"),
                    title=f"Focus: {panel_name}",
                    border_style="red"
                )
        else:
            return Panel(
                Text(f"Unknown panel: {panel_name}", style="dim"),
                title="Focus Mode",
                border_style="yellow"
            )

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

    def _get_retry_indicator(self, task: Dict) -> tuple:
        """
        Get retry indicator text and style for a task.

        Returns:
            tuple: (indicator_text, style) where:
                - indicator_text: e.g., "[Retry 1/3]" or "" if no retries
                - style: color based on retry count (yellow→orange→red)
        """
        retry_count = task.get('retryCount', 0)
        if retry_count <= 0:
            return ("", "")

        # MAX_RETRIES is 2, so total attempts = 3 (0, 1, 2)
        max_retries = 3

        # Color code based on retry count
        if retry_count == 1:
            style = "yellow"
        elif retry_count == 2:
            style = "rgb(255,165,0)"  # orange
        else:
            style = "red"

        return (f" [Retry {retry_count}/{max_retries}]", style)

    def _get_error_preview(self, task: Dict, max_length: int = 50) -> str:
        """
        Get a truncated preview of the last error for a task.

        Args:
            task: Task dict with optional 'lastError' field
            max_length: Maximum length of preview text

        Returns:
            Truncated error string or empty string if no error
        """
        last_error = task.get('lastError', '')
        if not last_error:
            return ""

        # Clean up the error message (remove newlines, extra spaces)
        last_error = ' '.join(last_error.split())

        if len(last_error) <= max_length:
            return last_error
        return last_error[:max_length - 3] + "..."

    def _check_task_blockers(self, task_id: str) -> Dict:
        """
        Query status-cli.js to check if a task has blockers.

        Args:
            task_id: The task ID to check (e.g., "2.4")

        Returns:
            Dict with:
                - canStart: bool - whether task can start
                - blockers: List[str] - list of blocking task IDs
        """
        try:
            cmd = ['node', 'scripts/status-cli.js', 'check', task_id]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=2
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {
                    'canStart': data.get('canStart', True),
                    'blockers': data.get('blockers', [])
                }
        except Exception:
            pass

        return {'canStart': True, 'blockers': []}

    def _get_blocker_indicator(self, task: Dict) -> tuple:
        """
        Get blocker indicator text and style for a task.

        Args:
            task: Task dict with 'id' field

        Returns:
            tuple: (indicator_text, style, should_dim) where:
                - indicator_text: e.g., "[Blocked by: 2.3]" or "" if no blockers
                - style: color for the indicator (dim blue for blockers)
                - should_dim: whether the task row should be dimmed
        """
        # Check cached blockers first (avoids subprocess for each render)
        task_id = task.get('id', '')
        if not task_id:
            return ("", "", False)

        # Use cached value if available
        cache_key = f"_blockers_{task_id}"
        if hasattr(self, '_blocker_cache') and cache_key in self._blocker_cache:
            cached = self._blocker_cache[cache_key]
            return cached

        # Query for blockers
        blocker_info = self._check_task_blockers(task_id)
        blockers = blocker_info.get('blockers', [])
        can_start = blocker_info.get('canStart', True)

        if not blockers:
            result = ("", "", False)
        else:
            # Show up to 2 blocker IDs, or count if more
            if len(blockers) <= 2:
                blocker_text = ", ".join(blockers)
            else:
                blocker_text = f"{blockers[0]}, +{len(blockers) - 1}"

            indicator = f" [Blocked by: {blocker_text}]"
            should_dim = not can_start
            result = (indicator, "dim blue", should_dim)

        # Cache the result
        if not hasattr(self, '_blocker_cache'):
            self._blocker_cache = {}
        self._blocker_cache[cache_key] = result

        return result

    def refresh_blocker_cache(self):
        """Clear the blocker cache to force re-query on next render."""
        self._blocker_cache = {}

    def _render_tasks_in_progress(self) -> Panel:
        """Render tasks currently in progress with retry, blocker, and search indicators."""
        table = Table(show_header=False, box=None, expand=True)
        table.add_column("Task", overflow="ellipsis", no_wrap=True)

        is_focused = self._focused_panel == FocusablePanel.IN_PROGRESS
        selected_idx = self._selection_index[FocusablePanel.IN_PROGRESS]

        for idx, task in enumerate(self.tasks_in_progress[:4]):
            task_id = task.get('id', '?')
            desc = task.get('description', '')

            # Get retry indicator
            retry_text, retry_style = self._get_retry_indicator(task)

            # Get blocker indicator
            blocker_text, blocker_style, should_dim = self._get_blocker_indicator(task)

            # Check for search match
            is_search_match = self.is_task_match(task)
            is_current_match = self._search_active and task == self.get_current_match()

            # Build the display text
            row_text = Text()

            # Determine base style (dimmed if blocked, highlighted if search match)
            if is_current_match:
                base_style = "bold magenta reverse"
                selected_style = "bold magenta reverse"
            elif is_search_match:
                base_style = "bold magenta"
                selected_style = "bold magenta reverse"
            elif should_dim:
                base_style = "dim yellow"
                selected_style = "bold dim yellow reverse"
            else:
                base_style = "yellow"
                selected_style = "bold yellow reverse"

            # Highlight selected row if panel is focused and keyboard enabled
            if self._keyboard_enabled and is_focused and idx == selected_idx:
                row_text.append("▶ ", style="bold yellow")
                row_text.append(f"{task_id}: {desc}", style=selected_style)
                if retry_text:
                    row_text.append(retry_text, style=f"bold {retry_style}")
                if blocker_text:
                    row_text.append(blocker_text, style=blocker_style)

                # Show error preview for selected task with retries
                error_preview = self._get_error_preview(task)
                if error_preview and task.get('retryCount', 0) > 0:
                    table.add_row(row_text)
                    # Add error line below
                    error_text = Text()
                    error_text.append("  └─ ", style="dim")
                    error_text.append(error_preview, style="dim red italic")
                    table.add_row(error_text)
                    continue
            else:
                # Add search match indicator
                if is_current_match:
                    row_text.append("» ", style="bold magenta")
                elif is_search_match:
                    row_text.append("• ", style="magenta")

                row_text.append(f"{task_id}: {desc}", style=base_style)
                if retry_text:
                    row_text.append(retry_text, style=retry_style)
                if blocker_text:
                    row_text.append(blocker_text, style=blocker_style)

            table.add_row(row_text)

        if not self.tasks_in_progress:
            table.add_row(Text("[dim]No tasks in progress[/dim]"))

        # Show focus indicator in panel title
        title = "In Progress"
        if self._keyboard_enabled and is_focused:
            title = "● In Progress"

        border_style = "bold yellow" if (self._keyboard_enabled and is_focused) else "yellow"
        return Panel(table, title=title, border_style=border_style)

    def _render_completions(self) -> Panel:
        """Render recently completed tasks with search highlighting."""
        table = Table(show_header=False, box=None, expand=True)
        table.add_column("Task", overflow="ellipsis", no_wrap=True)

        is_focused = self._focused_panel == FocusablePanel.COMPLETIONS
        selected_idx = self._selection_index[FocusablePanel.COMPLETIONS]

        for idx, task in enumerate(self.recent_completions[:4]):
            task_id = task.get('id', '?')
            desc = task.get('description', '')

            # Check for search match
            is_search_match = self.is_task_match(task)
            is_current_match = self._search_active and task == self.get_current_match()

            # Determine style based on search state
            if is_current_match:
                base_style = "bold magenta reverse"
            elif is_search_match:
                base_style = "bold magenta"
            else:
                base_style = "green"

            row_text = Text()

            # Highlight selected row if panel is focused and keyboard enabled
            if self._keyboard_enabled and is_focused and idx == selected_idx:
                row_text.append("▶ ✓ ", style="bold green")
                row_text.append(f"{task_id}: {desc}", style="bold green reverse" if not is_search_match else "bold magenta reverse")
            else:
                # Add search match indicator
                if is_current_match:
                    row_text.append("» ✓ ", style="bold magenta")
                elif is_search_match:
                    row_text.append("• ✓ ", style="magenta")
                else:
                    row_text.append("✓ ", style="green")

                row_text.append(f"{task_id}: {desc}", style=base_style)

            table.add_row(row_text)

        if not self.recent_completions:
            table.add_row(Text("[dim]No completions yet[/dim]"))

        # Show focus indicator in panel title
        title = "Recent Completions"
        if self._keyboard_enabled and is_focused:
            title = "● Recent Completions"

        border_style = "bold green" if (self._keyboard_enabled and is_focused) else "green"
        return Panel(table, title=title, border_style=border_style)

    def _render_footer(self) -> Panel:
        """Render the footer with status, stats, and search input when active."""
        stats = self.activity_tracker.stats
        footer_text = Text()

        # Check if we're in search mode via keyboard handler
        search_mode_active = False
        if self._keyboard_handler:
            from scripts.tui.keyboard import InputMode
            search_mode_active = self._keyboard_handler.mode == InputMode.SEARCH

        if search_mode_active:
            # Show search input line
            query = self._keyboard_handler.input_buffer
            cursor = self._keyboard_handler.input_cursor
            footer_text.append("Search: /", style="bold cyan")
            if cursor < len(query):
                footer_text.append(query[:cursor], style="white")
                footer_text.append(query[cursor], style="bold white reverse")
                footer_text.append(query[cursor+1:], style="white")
            else:
                footer_text.append(query, style="white")
                footer_text.append("█", style="bold white")  # Cursor at end

            # Show match count
            if self._search_matches:
                footer_text.append(f"  ({len(self._search_matches)} matches)", style="dim cyan")
            else:
                if query:
                    footer_text.append("  (no matches)", style="dim red")
        else:
            footer_text.append(f"STATUS: ", style="dim")
            footer_text.append(f"{self.status_message}", style="cyan")
            footer_text.append(f"  |  Tools: {stats['total_tools']}", style="dim")
            footer_text.append(f"  |  Agents: {stats['agents_spawned']}", style="dim")
            footer_text.append(f"  |  Edits: {stats['edits']}", style="dim")

        border_style = "bold cyan" if search_mode_active else "dim"
        return Panel(footer_text, border_style=border_style)

    def _render_phases(self) -> Panel:
        """Render the phase progress panel."""
        if self._phase_panel:
            return self._phase_panel.render()
        else:
            # Fallback if no phase panel attached
            return Panel(
                Text("[dim]Phase data not available[/dim]"),
                title="Phases",
                border_style="blue"
            )

    def _render_upcoming(self) -> Panel:
        """Render the upcoming tasks panel."""
        if self._upcoming_panel:
            return self._upcoming_panel.render()
        else:
            # Fallback if no upcoming panel attached
            return Panel(
                Text("[dim]Upcoming tasks not available[/dim]"),
                title="Upcoming",
                border_style="cyan"
            )

    def _render_run_history(self) -> Panel:
        """Render the run history panel."""
        if self._run_history_panel:
            return self._run_history_panel.render()
        else:
            # Fallback if no run history panel attached
            return Panel(
                Text("[dim]Run history not available[/dim]"),
                title="Run History",
                border_style="magenta"
            )

    def _render_dependency_graph(self) -> Panel:
        """Render the dependency graph panel."""
        if self._dependency_graph_panel:
            # Update selected task if we have selection
            selected = self.get_selected_task()
            if selected:
                self._dependency_graph_panel.set_selected_task(selected.get('id'))
            else:
                self._dependency_graph_panel.set_selected_task(None)
            return self._dependency_graph_panel.render()
        else:
            # Fallback if no dependency graph panel attached
            return Panel(
                Text("[dim]Dependency graph not available[/dim]"),
                title="Dependencies",
                border_style="blue"
            )

    def _has_layout_section(self, name: str) -> bool:
        """Check if a layout section exists."""
        try:
            self.layout[name]
            return True
        except KeyError:
            return False

    def update_layout(self):
        """Update all layout sections with responsive visibility."""
        # Handle focus mode with simplified layout
        if self._focus_mode and self._focus_panel:
            self.layout["header"].update(self._render_header())
            self.layout["focus_content"].update(self._render_focus_content())
            self.layout["footer"].update(self._render_footer())
            return

        # Get effective visibility (respects terminal size and user settings)
        visibility = self._get_effective_panel_visibility()

        self.layout["header"].update(self._render_header())
        self.layout["progress"].update(self._render_progress())

        # Update phases panel if showing
        if visibility['phases'] and self._has_layout_section("phases"):
            self.layout["phases"].update(self._render_phases())

        # Update activity panel if showing
        if visibility['activity'] and self._has_layout_section("activity"):
            self.layout["activity"].update(self._render_activity())

        # Update dependency graph panel if showing
        if visibility['dependency_graph'] and self._has_layout_section("dependency_graph"):
            self.layout["dependency_graph"].update(self._render_dependency_graph())

        # Update agent tracker panel if showing
        if visibility['agent_tracker'] and self._has_layout_section("agent_tracker"):
            self.layout["agent_tracker"].update(self._render_agent_tracker())

        # Update subtask tree panel if showing
        if visibility['subtask_tree'] and self._has_layout_section("subtask_tree"):
            self.layout["subtask_tree"].update(self._render_subtask_tree())

        # Update artifact browser panel if showing
        if visibility['artifact_browser'] and self._has_layout_section("artifact_browser"):
            self.layout["artifact_browser"].update(self._render_artifact_browser())

        self.layout["in_progress"].update(self._render_tasks_in_progress())

        # Update upcoming panel if showing
        if visibility['upcoming'] and self._has_layout_section("upcoming"):
            self.layout["upcoming"].update(self._render_upcoming())

        self.layout["completions"].update(self._render_completions())

        # Update run history panel if showing
        if visibility['run_history'] and self._has_layout_section("run_history"):
            self.layout["run_history"].update(self._render_run_history())

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
        """Refresh the display, checking for terminal resize."""
        with self._lock:
            try:
                # Check if terminal was resized and rebuild layout if needed
                if self.check_terminal_resize():
                    self.layout = self._make_layout()

                self.update_layout()
                if self.live:
                    self.live.update(self.layout)
            except Exception as e:
                # Use error handler if available, otherwise silently fail
                if self._error_handler:
                    self._error_handler.handle_exception(
                        e,
                        context="Refreshing display"
                    )
                # Don't crash on display errors

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
        # Clamp selection indices to valid range
        self._clamp_selection_indices()
        self.refresh()

    # =========================================================================
    # Navigation Methods
    # =========================================================================

    def enable_keyboard(self, enabled: bool = True):
        """Enable or disable keyboard navigation mode."""
        self._keyboard_enabled = enabled
        self.refresh()

    @property
    def keyboard_enabled(self) -> bool:
        """Check if keyboard navigation is enabled."""
        return self._keyboard_enabled

    @property
    def focused_panel(self) -> FocusablePanel:
        """Get the currently focused panel."""
        return self._focused_panel

    def focus_panel(self, panel: FocusablePanel):
        """Set focus to a specific panel."""
        self._focused_panel = panel
        self.refresh()

    def next_panel(self) -> FocusablePanel:
        """Move focus to the next panel (Tab key)."""
        panels = list(FocusablePanel)
        current_idx = panels.index(self._focused_panel)
        next_idx = (current_idx + 1) % len(panels)
        self._focused_panel = panels[next_idx]
        self.refresh()
        return self._focused_panel

    def prev_panel(self) -> FocusablePanel:
        """Move focus to the previous panel (Shift+Tab)."""
        panels = list(FocusablePanel)
        current_idx = panels.index(self._focused_panel)
        prev_idx = (current_idx - 1) % len(panels)
        self._focused_panel = panels[prev_idx]
        self.refresh()
        return self._focused_panel

    def _get_panel_item_count(self, panel: FocusablePanel) -> int:
        """Get the number of items in a panel."""
        if panel == FocusablePanel.IN_PROGRESS:
            return min(len(self.tasks_in_progress), 4)
        elif panel == FocusablePanel.COMPLETIONS:
            return min(len(self.recent_completions), 4)
        elif panel == FocusablePanel.ACTIVITY:
            return min(len(self.activity_tracker.get_recent(8)), 8)
        return 0

    def _clamp_selection_indices(self):
        """Ensure all selection indices are within valid range."""
        for panel in FocusablePanel:
            max_idx = self._get_panel_item_count(panel) - 1
            if max_idx < 0:
                self._selection_index[panel] = 0
            elif self._selection_index[panel] > max_idx:
                self._selection_index[panel] = max_idx

    def move_selection(self, direction: int) -> int:
        """
        Move selection in the current panel.

        Args:
            direction: -1 for up, +1 for down

        Returns:
            New selection index
        """
        panel = self._focused_panel
        max_idx = self._get_panel_item_count(panel) - 1

        if max_idx < 0:
            return 0

        current = self._selection_index[panel]
        new_idx = max(0, min(max_idx, current + direction))
        self._selection_index[panel] = new_idx
        self.refresh()
        return new_idx

    def move_up(self) -> int:
        """Move selection up (k or Up arrow)."""
        return self.move_selection(-1)

    def move_down(self) -> int:
        """Move selection down (j or Down arrow)."""
        return self.move_selection(1)

    def move_to_first(self) -> int:
        """Move selection to first item (g or Home)."""
        panel = self._focused_panel
        self._selection_index[panel] = 0
        self.refresh()
        return 0

    def move_to_last(self) -> int:
        """Move selection to last item (G or End)."""
        panel = self._focused_panel
        max_idx = self._get_panel_item_count(panel) - 1
        self._selection_index[panel] = max(0, max_idx)
        self.refresh()
        return self._selection_index[panel]

    def get_selected_task(self) -> Optional[Dict]:
        """Get the currently selected task (if any)."""
        panel = self._focused_panel
        idx = self._selection_index[panel]

        if panel == FocusablePanel.IN_PROGRESS:
            if 0 <= idx < len(self.tasks_in_progress):
                return self.tasks_in_progress[idx]
        elif panel == FocusablePanel.COMPLETIONS:
            if 0 <= idx < len(self.recent_completions):
                return self.recent_completions[idx]

        return None

    def get_selection_info(self) -> Dict:
        """Get information about current selection state."""
        return {
            'panel': self._focused_panel.name,
            'index': self._selection_index[self._focused_panel],
            'task': self.get_selected_task(),
            'keyboard_enabled': self._keyboard_enabled,
        }

    def set_task_action_callback(self, callback: Callable[[str, Dict], Any]):
        """
        Set callback for task actions.

        The callback receives (action_name, task_dict) where action_name is
        one of: 'explain', 'implement', 'verify', 'skip', 'findings', 'deps'
        """
        self._on_task_action = callback

    def trigger_task_action(self, action: str) -> bool:
        """
        Trigger an action on the selected task.

        Args:
            action: Action name (explain, implement, verify, skip, findings, deps)

        Returns:
            True if action was triggered, False if no task selected
        """
        task = self.get_selected_task()
        if not task:
            return False

        # If we have a task action handler, use it
        if self._task_action_handler:
            result = self._task_action_handler.handle_action(action, task)
            # Update status message with result
            self.set_status(result.message)
            return result.success

        # Fall back to callback if set
        if self._on_task_action:
            self._on_task_action(action, task)
            return True

        return False

    def attach_task_action_handler(self, handler: Any):
        """
        Attach a task action handler.

        Args:
            handler: TaskActionHandler instance from scripts.tui.task_actions
        """
        self._task_action_handler = handler

        # Wire up overlay callback if overlay manager is attached
        if self._overlay_manager:
            handler.set_overlay_callback(self._handle_action_overlay)

    # =========================================================================
    # Keyboard Integration
    # =========================================================================

    def attach_keyboard_handler(self, handler: Any):
        """
        Attach a keyboard handler for interactive mode.

        Args:
            handler: KeyboardHandler instance from scripts.tui.keyboard
        """
        self._keyboard_handler = handler
        self._keyboard_enabled = True

        # Wire up navigation callbacks
        handler.set_navigation_callbacks(
            on_up=self.move_up,
            on_down=self.move_down,
            on_next_panel=self.next_panel,
            on_prev_panel=self.prev_panel,
            on_first=self.move_to_first,
            on_last=self.move_to_last,
        )

        # Register action key handlers
        from scripts.tui.keyboard import InputMode

        # Task action keys
        handler.register(InputMode.NORMAL, 'e', lambda e: self.trigger_task_action('explain'))
        handler.register(InputMode.NORMAL, 'i', lambda e: self.trigger_task_action('implement'))
        handler.register(InputMode.NORMAL, 'v', lambda e: self.trigger_task_action('verify'))
        handler.register(InputMode.NORMAL, 's', lambda e: self.trigger_task_action('skip'))
        handler.register(InputMode.NORMAL, 'f', lambda e: self.trigger_task_action('findings'))
        handler.register(InputMode.NORMAL, 'd', lambda e: self.trigger_task_action('deps'))

        # Panel toggle keys (1-8)
        handler.register(InputMode.NORMAL, '1', lambda e: self._toggle_panel_by_number(1))
        handler.register(InputMode.NORMAL, '2', lambda e: self._toggle_panel_by_number(2))
        handler.register(InputMode.NORMAL, '3', lambda e: self._toggle_panel_by_number(3))
        handler.register(InputMode.NORMAL, '4', lambda e: self._toggle_panel_by_number(4))
        handler.register(InputMode.NORMAL, '5', lambda e: self._toggle_panel_by_number(5))
        handler.register(InputMode.NORMAL, '6', lambda e: self._toggle_panel_by_number(6))
        handler.register(InputMode.NORMAL, '7', lambda e: self._toggle_panel_by_number(7))
        handler.register(InputMode.NORMAL, '8', lambda e: self._toggle_panel_by_number(8))

        # Subtask tree collapse/expand keys (+/-)
        handler.register(InputMode.NORMAL, '+', lambda e: self.toggle_subtask_collapse())
        handler.register(InputMode.NORMAL, '-', lambda e: self.toggle_subtask_collapse())
        handler.register(InputMode.NORMAL, '=', lambda e: self.expand_all_subtasks())  # Shift+= on most keyboards
        handler.register(InputMode.NORMAL, '_', lambda e: self.collapse_all_subtasks())  # Shift+- on most keyboards

        # Search mode: / key is handled by keyboard handler, but we need callbacks
        # The / key enters SEARCH mode via keyboard handler's _enter_search_mode
        # Register Enter and Escape handlers for SEARCH mode
        handler.register(InputMode.SEARCH, 'Enter', lambda e: self._handle_search_enter())
        # Note: Escape is handled globally by keyboard handler to exit to NORMAL mode

        # Search navigation keys (n/N) in NORMAL mode for after search is done
        handler.register(InputMode.NORMAL, 'n', lambda e: self.next_search_match())
        handler.register(InputMode.NORMAL, 'N', lambda e: self.prev_search_match())

        # Register mode change callback to sync search state
        handler.on_mode_change(self._on_mode_change)

        # Focus mode key
        handler.register(InputMode.NORMAL, 'F', lambda e: self.toggle_focus_mode())

        # Quit key
        handler.register(InputMode.NORMAL, 'q', lambda e: self._handle_quit())

        # Refresh key
        handler.register(InputMode.NORMAL, 'r', lambda e: self.refresh())

    def attach_overlay_manager(self, manager: Any):
        """
        Attach an overlay manager for modal displays.

        Args:
            manager: OverlayManager instance from scripts.tui.overlays
        """
        self._overlay_manager = manager

        # Wire up help toggle to keyboard handler
        if self._keyboard_handler:
            from scripts.tui.keyboard import InputMode
            self._keyboard_handler.register(
                InputMode.NORMAL, '?',
                lambda e: self._overlay_manager.toggle_help()
            )
            # Wire up command palette to : key
            self._keyboard_handler.register(
                InputMode.NORMAL, ':',
                lambda e: self._show_command_palette()
            )

    def _show_command_palette(self) -> bool:
        """Show the command palette overlay."""
        if self._overlay_manager:
            return self._overlay_manager.show_command_palette()
        return False

    def _handle_action_overlay(self, overlay_type: str, data: Any):
        """
        Handle overlay requests from task actions.

        Args:
            overlay_type: Type of overlay ('findings', 'deps')
            data: Overlay data (content, task_id, etc.)
        """
        if overlay_type == 'findings':
            task_id = data.get('task_id', '')
            # Show findings browser overlay
            if self._overlay_manager:
                if self._overlay_manager.show_findings_browser(task_id):
                    self.set_status(f"Viewing findings for {task_id}")
                else:
                    path = data.get('path', '')
                    self.set_status(f"Findings for {task_id}: {path}")
            else:
                path = data.get('path', '')
                self.set_status(f"Findings for {task_id}: {path}")
        elif overlay_type == 'deps':
            task_id = data.get('task_id', '')
            deps_data = data.get('data', {})
            blockers = deps_data.get('blockers', [])
            if blockers:
                self.set_status(f"Task {task_id} blocked by: {', '.join(blockers)}")
            else:
                self.set_status(f"Task {task_id} has no blockers")

    def set_command_execute_callback(self, callback: Callable[[Any, str], Any]):
        """
        Set callback for command execution from palette.

        Args:
            callback: Function receiving (PlanCommand, args_string)
        """
        if self._overlay_manager:
            self._overlay_manager.set_command_execute_callback(callback)

    def attach_phase_panel(self, panel: Any):
        """
        Attach a phase progress panel.

        Args:
            panel: PhaseProgressPanel instance from scripts.tui.panels
        """
        self._phase_panel = panel
        self._show_phases = True

    def toggle_phases(self) -> bool:
        """Toggle phase panel visibility. Returns new visibility state."""
        self._show_phases = not self._show_phases
        self.save_config()  # Persist preference
        self.refresh()
        return self._show_phases

    def update_phases(self):
        """Refresh phase data from status.json."""
        if self._phase_panel:
            self._phase_panel.update_phases()
            self.refresh()

    def attach_upcoming_panel(self, panel: Any):
        """
        Attach an upcoming tasks panel.

        Args:
            panel: UpcomingPanel instance from scripts.tui.panels
        """
        self._upcoming_panel = panel
        self._show_upcoming = True

    def toggle_upcoming(self) -> bool:
        """Toggle upcoming panel visibility. Returns new visibility state."""
        self._show_upcoming = not self._show_upcoming
        self.save_config()  # Persist preference
        # Rebuild layout since column structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_upcoming

    def update_upcoming(self):
        """Refresh upcoming tasks from status.json."""
        if self._upcoming_panel:
            self._upcoming_panel.update_tasks()
            self.refresh()

    def attach_run_history_panel(self, panel: Any):
        """
        Attach a run history panel.

        Args:
            panel: RunHistoryPanel instance from scripts.tui.panels
        """
        self._run_history_panel = panel
        self._show_run_history = True

    def toggle_run_history(self) -> bool:
        """Toggle run history panel visibility. Returns new visibility state."""
        self._show_run_history = not self._show_run_history
        self.save_config()  # Persist preference
        # Rebuild layout since column structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_run_history

    def update_run_history(self):
        """Refresh run history from status.json."""
        if self._run_history_panel:
            self._run_history_panel.update_runs()
            self.refresh()

    def attach_dependency_graph_panel(self, panel: Any):
        """
        Attach a dependency graph panel.

        Args:
            panel: DependencyGraphPanel instance from scripts.tui.panels
        """
        self._dependency_graph_panel = panel
        self._show_dependency_graph = True

    def toggle_dependency_graph(self) -> bool:
        """Toggle dependency graph panel visibility. Returns new visibility state."""
        self._show_dependency_graph = not self._show_dependency_graph
        self.save_config()  # Persist preference
        # Rebuild layout since row structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_dependency_graph

    def update_dependency_graph(self):
        """Refresh dependency graph from status.json."""
        if self._dependency_graph_panel:
            self._dependency_graph_panel.update_graph()
            self.refresh()

    def toggle_activity(self) -> bool:
        """Toggle activity panel visibility. Returns new visibility state."""
        self._show_activity = not self._show_activity
        self.save_config()  # Persist preference
        # Rebuild layout since structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_activity

    def attach_error_handler(self, handler: Any):
        """
        Attach an error handler for graceful error handling.

        Args:
            handler: ErrorHandler instance from scripts.tui.error_handler
        """
        self._error_handler = handler
        # Attach the TUI to the handler's notifier
        if hasattr(handler, 'attach_tui'):
            handler.attach_tui(self)

    @property
    def error_handler(self) -> Optional[Any]:
        """Get the attached error handler."""
        return self._error_handler

    def attach_agent_tracker_panel(self, panel: Any):
        """
        Attach an agent tracker panel.

        Args:
            panel: AgentTrackerPanel instance from scripts.tui.panels
        """
        self._agent_tracker_panel = panel
        self._show_agent_tracker = True

    def toggle_agent_tracker(self) -> bool:
        """Toggle agent tracker panel visibility. Returns new visibility state."""
        self._show_agent_tracker = not self._show_agent_tracker
        self.save_config()  # Persist preference
        # Rebuild layout since structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_agent_tracker

    def _render_agent_tracker(self) -> 'Panel':
        """Render the agent tracker panel."""
        if self._agent_tracker_panel:
            return self._agent_tracker_panel.render()
        else:
            # Fallback if no agent tracker panel attached
            return Panel(
                Text("[dim]Agent tracker not available[/dim]"),
                title="Agents",
                border_style="cyan"
            )

    def attach_subtask_tree_panel(self, panel: Any):
        """
        Attach a subtask tree panel.

        Args:
            panel: SubtaskTreePanel instance from scripts.tui.panels
        """
        self._subtask_tree_panel = panel
        self._show_subtask_tree = True

    def toggle_subtask_tree(self) -> bool:
        """Toggle subtask tree panel visibility. Returns new visibility state."""
        self._show_subtask_tree = not self._show_subtask_tree
        self.save_config()  # Persist preference
        # Rebuild layout since structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_subtask_tree

    def update_subtask_tree(self):
        """Refresh subtask tree from status.json."""
        if self._subtask_tree_panel:
            self._subtask_tree_panel.update_tree()
            self.refresh()

    def _render_subtask_tree(self) -> 'Panel':
        """Render the subtask tree panel."""
        if self._subtask_tree_panel:
            # Update selected task if we have selection
            selected = self.get_selected_task()
            if selected:
                self._subtask_tree_panel.set_selected(selected.get('id'))
            else:
                self._subtask_tree_panel.set_selected(None)
            return self._subtask_tree_panel.render()
        else:
            # Fallback if no subtask tree panel attached
            return Panel(
                Text("[dim]Subtask tree not available[/dim]"),
                title="Subtasks",
                border_style="magenta"
            )

    def toggle_subtask_collapse(self) -> bool:
        """
        Toggle collapse state for the selected subtask.
        Used by +/- key handlers.

        Returns:
            True if toggled, False if no subtask panel or invalid selection
        """
        if not self._subtask_tree_panel:
            return False

        selected = self.get_selected_task()
        if not selected:
            return False

        task_id = selected.get('id', '')
        result = self._subtask_tree_panel.toggle_collapse(task_id)
        self.refresh()
        return result

    def expand_all_subtasks(self):
        """Expand all collapsed subtasks."""
        if self._subtask_tree_panel:
            self._subtask_tree_panel.expand_all()
            self.refresh()

    def collapse_all_subtasks(self):
        """Collapse all parent subtasks."""
        if self._subtask_tree_panel:
            self._subtask_tree_panel.collapse_all()
            self.refresh()

    def attach_artifact_browser_panel(self, panel: Any):
        """
        Attach an artifact browser panel.

        Args:
            panel: ArtifactBrowserPanel instance from scripts.tui.panels
        """
        self._artifact_browser_panel = panel
        self._show_artifact_browser = True

    def toggle_artifact_browser(self) -> bool:
        """Toggle artifact browser panel visibility. Returns new visibility state."""
        self._show_artifact_browser = not self._show_artifact_browser
        self.save_config()  # Persist preference
        # Rebuild layout since structure changes
        self.layout = self._make_layout()
        self.refresh()
        return self._show_artifact_browser

    def update_artifact_browser(self):
        """Refresh artifact list from findings directory."""
        if self._artifact_browser_panel:
            self._artifact_browser_panel.scan_artifacts()
            self.refresh()

    def _render_artifact_browser(self) -> 'Panel':
        """Render the artifact browser panel."""
        if self._artifact_browser_panel:
            return self._artifact_browser_panel.render()
        else:
            # Fallback if no artifact browser panel attached
            return Panel(
                Text("[dim]Artifact browser not available[/dim]"),
                title="Artifacts",
                border_style="blue"
            )

    def open_selected_artifact(self) -> bool:
        """
        Open the selected artifact in an external editor.

        Uses $EDITOR environment variable, falls back to 'vi'.

        Returns:
            True if editor was launched, False otherwise
        """
        if not self._artifact_browser_panel:
            self.set_status("Artifact browser not available")
            return False

        artifact = self._artifact_browser_panel.selected_artifact
        if not artifact:
            self.set_status("No artifact selected")
            return False

        # Open in editor
        result = self._artifact_browser_panel.open_in_editor(artifact)
        if result:
            self.set_status(f"Opened: {artifact.filename}")
        else:
            self.set_status(f"Failed to open: {artifact.filename}")
        return result

    def _toggle_panel_by_number(self, panel_number: int) -> bool:
        """
        Toggle panel visibility by number key (1-8).

        Panel mapping:
            1: Phases panel
            2: Upcoming tasks panel
            3: Run History panel
            4: Dependency Graph panel
            5: Activity panel
            6: Agents panel
            7: Subtasks panel
            8: Artifacts panel

        Args:
            panel_number: The panel number (1-8)

        Returns:
            True if the panel was toggled, False if panel doesn't exist
        """
        panel_name = self._panel_names.get(panel_number, f'Panel {panel_number}')
        new_state = False

        if panel_number == 1:
            new_state = self.toggle_phases()
        elif panel_number == 2:
            new_state = self.toggle_upcoming()
        elif panel_number == 3:
            new_state = self.toggle_run_history()
        elif panel_number == 4:
            new_state = self.toggle_dependency_graph()
        elif panel_number == 5:
            new_state = self.toggle_activity()
        elif panel_number == 6:
            new_state = self.toggle_agent_tracker()
        elif panel_number == 7:
            new_state = self.toggle_subtask_tree()
        elif panel_number == 8:
            new_state = self.toggle_artifact_browser()
        else:
            self.set_status(f"Unknown panel: {panel_number}")
            return False

        # Update status message to show toggle result
        state_str = "shown" if new_state else "hidden"
        self.set_status(f"{panel_name}: {state_str} (press {panel_number} to toggle)")
        return True

    def get_panel_visibility(self) -> Dict[int, bool]:
        """
        Get visibility state of all toggleable panels.

        Returns:
            Dict mapping panel number to visibility state
        """
        return {
            1: self._show_phases,
            2: self._show_upcoming,
            3: self._show_run_history,
            4: self._show_dependency_graph,
            5: self._show_activity,
            6: self._show_agent_tracker,
            7: self._show_subtask_tree,
            8: self._show_artifact_browser,
        }

    # =========================================================================
    # Focus Mode
    # =========================================================================

    def toggle_focus_mode(self) -> bool:
        """
        Toggle focus mode - maximize focused panel, hide others.

        In focus mode:
        - Only the currently focused panel is shown (maximized)
        - All other panels are hidden
        - Press F again to exit focus mode and restore previous layout

        Returns:
            True if now in focus mode, False if exiting focus mode
        """
        if self._focus_mode:
            # Exit focus mode - restore previous visibility
            self._focus_mode = False
            self._focus_panel = None
            # Reload config to restore saved panel visibility
            self._load_config()
            self.set_status("Focus mode: OFF")
        else:
            # Enter focus mode
            self._focus_mode = True
            # Determine which panel to focus based on current panel
            panel = self._focused_panel
            if panel == FocusablePanel.IN_PROGRESS:
                self._focus_panel = 'in_progress'
            elif panel == FocusablePanel.COMPLETIONS:
                self._focus_panel = 'completions'
            elif panel == FocusablePanel.ACTIVITY:
                self._focus_panel = 'activity'
            else:
                self._focus_panel = 'activity'  # Default

            self.set_status(f"Focus mode: ON ({self._focus_panel})")

        # Rebuild layout
        self.layout = self._make_layout()
        self.refresh()
        return self._focus_mode

    @property
    def is_focus_mode(self) -> bool:
        """Check if focus mode is active."""
        return self._focus_mode

    def focus_panel_by_name(self, panel_name: str) -> bool:
        """
        Enter focus mode with a specific panel.

        Args:
            panel_name: Name of the panel to focus ('activity', 'dependency_graph', etc.)

        Returns:
            True if focus mode was entered
        """
        valid_panels = {
            'in_progress', 'completions', 'activity',
            'dependency_graph', 'phases', 'upcoming',
            'run_history', 'agent_tracker', 'subtask_tree',
            'artifact_browser'
        }

        if panel_name not in valid_panels:
            return False

        self._focus_mode = True
        self._focus_panel = panel_name
        self.layout = self._make_layout()
        self.set_status(f"Focus mode: {panel_name}")
        self.refresh()
        return True

    def exit_focus_mode(self):
        """Exit focus mode and restore previous layout."""
        if self._focus_mode:
            self.toggle_focus_mode()

    # =========================================================================
    # Search Mode Methods
    # =========================================================================

    def start_search(self, query: str = ""):
        """
        Start search mode with optional initial query.

        Args:
            query: Initial search query (empty to start fresh)
        """
        self._search_query = query
        self._search_active = True
        self._search_matches = []
        self._search_match_index = 0
        if query:
            self._execute_search()
        self.refresh()

    def update_search_query(self, query: str):
        """
        Update the search query (called while typing).

        Args:
            query: Current search query string
        """
        self._search_query = query
        if query:
            self._execute_search()
        else:
            self._search_matches = []
            self._search_match_index = 0
        self.refresh()

    def _execute_search(self):
        """Execute search across task descriptions."""
        query_lower = self._search_query.lower()
        self._search_matches = []

        # Search in_progress tasks
        for task in self.tasks_in_progress:
            desc = task.get('description', '').lower()
            task_id = task.get('id', '').lower()
            if query_lower in desc or query_lower in task_id:
                self._search_matches.append(task)

        # Search recent completions
        for task in self.recent_completions:
            desc = task.get('description', '').lower()
            task_id = task.get('id', '').lower()
            if query_lower in desc or query_lower in task_id:
                self._search_matches.append(task)

        # Reset match index if out of bounds
        if self._search_match_index >= len(self._search_matches):
            self._search_match_index = 0

        # Update status with match count
        if self._search_matches:
            self.set_status(f"Search: {len(self._search_matches)} matches for '{self._search_query}'")
        else:
            self.set_status(f"Search: No matches for '{self._search_query}'")

    def next_search_match(self) -> bool:
        """
        Navigate to next search match.

        Returns:
            True if moved to next match, False if no matches
        """
        if not self._search_matches:
            return False

        self._search_match_index = (self._search_match_index + 1) % len(self._search_matches)
        match = self._search_matches[self._search_match_index]
        self.set_status(f"Match {self._search_match_index + 1}/{len(self._search_matches)}: {match.get('id', '?')}")
        self.refresh()
        return True

    def prev_search_match(self) -> bool:
        """
        Navigate to previous search match.

        Returns:
            True if moved to previous match, False if no matches
        """
        if not self._search_matches:
            return False

        self._search_match_index = (self._search_match_index - 1) % len(self._search_matches)
        match = self._search_matches[self._search_match_index]
        self.set_status(f"Match {self._search_match_index + 1}/{len(self._search_matches)}: {match.get('id', '?')}")
        self.refresh()
        return True

    def finish_search(self):
        """
        Finish search mode (Enter pressed).

        Jumps to current match if any, keeps highlighting active.
        """
        if self._search_matches and self._search_match_index < len(self._search_matches):
            match = self._search_matches[self._search_match_index]
            task_id = match.get('id', '')
            self.set_status(f"Selected: {task_id}")
        # Keep search active for highlighting
        self.refresh()

    def cancel_search(self):
        """
        Cancel search mode (Escape pressed).

        Clears search state and highlighting.
        """
        self._search_query = ""
        self._search_matches = []
        self._search_match_index = 0
        self._search_active = False
        self.set_status("Search cancelled")
        self.refresh()

    def clear_search(self):
        """Clear search highlighting without changing mode."""
        self._search_active = False
        self._search_matches = []
        self.refresh()

    def is_task_match(self, task: Dict) -> bool:
        """
        Check if a task matches the current search.

        Args:
            task: Task dict to check

        Returns:
            True if task matches current search query
        """
        if not self._search_active or not self._search_query:
            return False

        task_id = task.get('id', '')
        return task in self._search_matches

    def get_current_match(self) -> Optional[Dict]:
        """Get the currently selected search match."""
        if self._search_matches and self._search_match_index < len(self._search_matches):
            return self._search_matches[self._search_match_index]
        return None

    @property
    def search_query(self) -> str:
        """Get current search query."""
        return self._search_query

    @property
    def search_active(self) -> bool:
        """Check if search highlighting is active."""
        return self._search_active

    @property
    def search_match_count(self) -> int:
        """Get number of search matches."""
        return len(self._search_matches)

    def _handle_search_enter(self) -> bool:
        """Handle Enter key in SEARCH mode."""
        self.finish_search()
        # Switch back to NORMAL mode
        if self._keyboard_handler:
            from scripts.tui.keyboard import InputMode
            self._keyboard_handler.set_mode(InputMode.NORMAL)
        return True

    def _on_mode_change(self, old_mode, new_mode):
        """Handle keyboard mode changes."""
        from scripts.tui.keyboard import InputMode

        if old_mode == InputMode.SEARCH and new_mode == InputMode.NORMAL:
            # Exiting search mode
            if self._keyboard_handler and self._keyboard_handler.input_buffer:
                # Had a search query - keep highlighting but finish search
                self.finish_search()
            else:
                # Empty search - cancel
                self.cancel_search()

        elif new_mode == InputMode.SEARCH:
            # Entering search mode
            self.start_search()

        self.refresh()

    def set_quit_callback(self, callback: Callable[[], None]):
        """Set callback to be invoked when quit is requested."""
        self._on_quit = callback

    def _handle_quit(self) -> bool:
        """Handle quit request."""
        if self._on_quit:
            self._on_quit()
        return True

    def poll_keyboard(self, timeout: float = 0.05) -> bool:
        """
        Poll for keyboard input and dispatch events.

        This should be called regularly in the TUI update loop.

        Args:
            timeout: Maximum time to wait for input (seconds)

        Returns:
            True if an event was processed, False otherwise
        """
        if not self._keyboard_handler:
            return False

        # Check for overlay first - it intercepts keys
        if self._overlay_manager and self._overlay_manager.has_active_overlay:
            event = self._keyboard_handler.get_event(timeout=timeout)
            if event:
                # Let overlay manager handle the key
                handled = self._overlay_manager.handle_key(event.key)
                if handled:
                    self.refresh()
                    return True
                # Fall through to normal handling if overlay didn't handle it

        # Normal keyboard handling
        event = self._keyboard_handler.get_event(timeout=timeout)
        if event:
            handled = self._keyboard_handler.dispatch(event)

            # Sync search state if in SEARCH mode
            from scripts.tui.keyboard import InputMode
            if self._keyboard_handler.mode == InputMode.SEARCH:
                self.update_search_query(self._keyboard_handler.input_buffer)

            if handled:
                self.refresh()
            return handled

        return False

    def update(self) -> bool:
        """
        Perform a single update cycle.

        This polls keyboard input and refreshes the display.
        Call this in a loop for interactive mode.

        Returns:
            False if quit was requested, True otherwise
        """
        # Poll keyboard with short timeout
        self.poll_keyboard(timeout=0.05)

        # Refresh display
        self.refresh()

        return True

    def run_interactive(self, update_callback: Optional[Callable[[], None]] = None):
        """
        Run the TUI in interactive mode with keyboard support.

        Args:
            update_callback: Optional callback to invoke each update cycle
                           (e.g., to refresh task data from status.json)
        """
        if not self._keyboard_handler:
            raise RuntimeError("Keyboard handler not attached. Call attach_keyboard_handler() first.")

        running = True

        def on_quit():
            nonlocal running
            running = False

        self.set_quit_callback(on_quit)

        try:
            # Start keyboard handler
            self._keyboard_handler.start()

            # Start live display
            self.start()

            # Main loop
            while running:
                # Call update callback if provided
                if update_callback:
                    update_callback()

                # Poll keyboard and refresh
                self.poll_keyboard(timeout=0.1)
                self.refresh()

                # Small sleep to prevent CPU spinning
                time.sleep(0.05)

        finally:
            # Cleanup
            self._keyboard_handler.stop()
            self.stop()

    def get_overlay_renderable(self) -> Optional[Any]:
        """Get the current overlay renderable, if any."""
        if self._overlay_manager and self._overlay_manager.has_active_overlay:
            return self._overlay_manager.render()
        return None


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    'Activity',
    'ActivityTracker',
    'RichTUIManager',
    'FocusablePanel',
    'RICH_AVAILABLE',
]
