#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Task Picker Modal for TUI.

This module provides a task picker modal for commands that need task context:
- TaskPickerModal: Full-screen task selector with search and multi-select
- Support for pending/in_progress task selection
- Space key for multi-select in batch operations

Usage:
    from scripts.tui.task_picker import TaskPickerModal

    picker = TaskPickerModal()
    picker.show()
"""

import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any, Set

try:
    from rich.console import Console, RenderableType
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.align import Align
    from rich.box import ROUNDED
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


@dataclass
class PickableTask:
    """Represents a task that can be picked."""
    id: str
    description: str
    phase: int
    status: str  # 'pending', 'in_progress', 'failed'
    dependencies: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    is_verify: bool = False

    @property
    def is_blocked(self) -> bool:
        """Check if this task is blocked."""
        return len(self.blockers) > 0

    @property
    def status_icon(self) -> str:
        """Get status icon for display."""
        if self.status == 'in_progress':
            return '◆'  # In progress
        elif self.status == 'failed':
            return '✗'  # Failed
        elif self.is_blocked:
            return '⊘'  # Blocked
        elif self.is_verify:
            return '✓'  # Verify task
        else:
            return '○'  # Pending

    @property
    def status_style(self) -> str:
        """Get Rich style for this task's status."""
        if self.status == 'in_progress':
            return 'yellow'
        elif self.status == 'failed':
            return 'red'
        elif self.is_blocked:
            return 'dim'
        elif self.is_verify:
            return 'magenta'
        else:
            return 'white'

    @classmethod
    def from_dict(cls, data: Dict) -> 'PickableTask':
        """Create a PickableTask from status.json task data."""
        desc = data.get('description', '')
        is_verify = desc.upper().startswith('VERIFY') or 'VERIFY' in data.get('id', '').upper()

        return cls(
            id=data.get('id', ''),
            description=desc,
            phase=data.get('phase', 0),
            status=data.get('status', 'pending'),
            dependencies=data.get('dependencies', []),
            blockers=data.get('blockers', []),
            is_verify=is_verify,
        )


class TaskPickerModal:
    """
    Task picker modal with search and multi-select support.

    Features:
    - Shows pending/in_progress tasks for selection
    - Space key for multi-select (batch commands)
    - Type to filter/search tasks
    - Enter to confirm selection
    - Escape to cancel
    """

    def __init__(self, plan_path: Optional[str] = None, multi_select: bool = False):
        """
        Initialize task picker.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
            multi_select: Whether to allow multi-select with Space key
        """
        self.plan_path = plan_path
        self.multi_select = multi_select
        self._visible = False
        self._tasks: List[PickableTask] = []
        self._filtered_tasks: List[PickableTask] = []
        self._input_buffer = ""
        self._selected_index = 0
        self._selected_ids: Set[str] = set()  # For multi-select
        self._max_visible = 10
        self._title = "Select Task"

        # Callbacks
        self._on_select: Optional[Callable[[List[str]], None]] = None
        self._on_close: Optional[Callable[[], None]] = None

        # Load tasks on init
        self._load_tasks()

    def _load_tasks(self):
        """Load tasks from status.json via status-cli."""
        self._tasks = []

        try:
            # Get all tasks (next returns recommended tasks)
            cmd = ['node', 'scripts/status-cli.js', 'status']
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

                # We need to read status.json directly for task list
                plan_path = Path(data.get('planPath', ''))
                if plan_path.exists():
                    plan_name = plan_path.stem
                    status_path = Path(f'docs/plan-outputs/{plan_name}/status.json')

                    if status_path.exists():
                        with open(status_path, 'r') as f:
                            status_data = json.load(f)

                        for task_data in status_data.get('tasks', []):
                            status = task_data.get('status', 'pending')
                            # Only include pending, in_progress, and failed tasks
                            if status in ('pending', 'in_progress', 'failed'):
                                # Get blocker info for each task
                                task_data['blockers'] = self._get_blockers(task_data.get('id', ''))
                                self._tasks.append(PickableTask.from_dict(task_data))

        except Exception:
            pass

        # Sort: in_progress first, then pending, then failed
        status_order = {'in_progress': 0, 'pending': 1, 'failed': 2}
        self._tasks.sort(key=lambda t: (status_order.get(t.status, 9), t.id))

        # Initialize filtered list
        self._update_filtered()

    def _get_blockers(self, task_id: str) -> List[str]:
        """Get blockers for a task via status-cli check."""
        if not task_id:
            return []

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
                return data.get('blockers', [])
        except Exception:
            pass

        return []

    def _update_filtered(self):
        """Update filtered task list based on input buffer."""
        if not self._input_buffer:
            self._filtered_tasks = self._tasks.copy()
        else:
            query = self._input_buffer.lower()
            self._filtered_tasks = [
                t for t in self._tasks
                if query in t.id.lower() or query in t.description.lower()
            ]

        # Clamp selected index
        if self._filtered_tasks:
            self._selected_index = min(self._selected_index, len(self._filtered_tasks) - 1)
        else:
            self._selected_index = 0

    @property
    def visible(self) -> bool:
        """Check if picker is visible."""
        return self._visible

    @property
    def input_buffer(self) -> str:
        """Get current input buffer."""
        return self._input_buffer

    @property
    def selected_task(self) -> Optional[PickableTask]:
        """Get the currently highlighted task."""
        if self._filtered_tasks and 0 <= self._selected_index < len(self._filtered_tasks):
            return self._filtered_tasks[self._selected_index]
        return None

    @property
    def selected_task_ids(self) -> List[str]:
        """Get list of selected task IDs (for multi-select)."""
        return list(self._selected_ids)

    def set_title(self, title: str):
        """Set the modal title."""
        self._title = title

    def show(self, reload: bool = True):
        """Show the task picker."""
        self._visible = True
        self._input_buffer = ""
        self._selected_index = 0
        self._selected_ids.clear()
        if reload:
            self._load_tasks()
        self._update_filtered()

    def hide(self):
        """Hide the task picker."""
        self._visible = False
        self._input_buffer = ""
        if self._on_close:
            self._on_close()

    def set_select_callback(self, callback: Callable[[List[str]], None]):
        """
        Set callback for task selection.

        Args:
            callback: Function receiving list of selected task IDs
        """
        self._on_select = callback

    def set_close_callback(self, callback: Callable[[], None]):
        """Set callback for picker close."""
        self._on_close = callback

    def handle_input(self, char: str):
        """Handle character input for search."""
        self._input_buffer += char
        self._update_filtered()

    def handle_backspace(self):
        """Handle backspace key."""
        if self._input_buffer:
            self._input_buffer = self._input_buffer[:-1]
            self._update_filtered()

    def handle_key(self, key: str) -> bool:
        """
        Handle a key press.

        Returns True if the key was handled.
        """
        if key == 'Escape':
            self.hide()
            return True

        if key == 'Enter':
            self._confirm_selection()
            return True

        if key == 'Space' and self.multi_select:
            self._toggle_selection()
            return True

        if key == 'Up':
            self.move_selection(-1)
            return True

        if key == 'Down':
            self.move_selection(1)
            return True

        if key == 'Backspace':
            self.handle_backspace()
            return True

        # Regular character input (for search)
        if len(key) == 1 and key.isprintable():
            self.handle_input(key)
            return True

        return False

    def move_selection(self, direction: int):
        """Move selection up (-1) or down (+1)."""
        if not self._filtered_tasks:
            return

        new_idx = self._selected_index + direction
        new_idx = max(0, min(len(self._filtered_tasks) - 1, new_idx))
        self._selected_index = new_idx

    def _toggle_selection(self):
        """Toggle selection of current task (for multi-select)."""
        task = self.selected_task
        if task:
            if task.id in self._selected_ids:
                self._selected_ids.discard(task.id)
            else:
                self._selected_ids.add(task.id)

    def _confirm_selection(self):
        """Confirm and return selected tasks."""
        selected_ids = []

        if self.multi_select and self._selected_ids:
            # Use multi-select list
            selected_ids = list(self._selected_ids)
        elif self.selected_task:
            # Single selection
            selected_ids = [self.selected_task.id]

        if selected_ids and self._on_select:
            self._on_select(selected_ids)

        self.hide()

    def reload_tasks(self):
        """Reload tasks from status.json."""
        self._load_tasks()

    def render(self) -> 'RenderableType':
        """Render the task picker as a Rich renderable."""
        if not RICH_AVAILABLE:
            return "Task Picker (Rich not available)"

        # Build content
        content = Text()

        # Search input line
        content.append("Filter: ", style="dim")
        content.append(self._input_buffer if self._input_buffer else "(type to search)",
                      style="white" if self._input_buffer else "dim italic")
        content.append("█", style="blink white")  # Cursor
        content.append("\n\n")

        # Task list
        if not self._filtered_tasks:
            content.append("  No matching tasks\n", style="dim italic")
        else:
            visible_tasks = self._filtered_tasks[:self._max_visible]

            for idx, task in enumerate(visible_tasks):
                is_highlighted = idx == self._selected_index
                is_selected = task.id in self._selected_ids

                # Selection/highlight indicator
                if is_highlighted:
                    content.append("▶ ", style="bold cyan")
                elif is_selected:
                    content.append("● ", style="green")
                else:
                    content.append("  ", style="dim")

                # Multi-select checkbox (if enabled)
                if self.multi_select:
                    checkbox = "[×]" if is_selected else "[ ]"
                    content.append(checkbox, style="green" if is_selected else "dim")
                    content.append(" ")

                # Status icon
                content.append(task.status_icon, style=task.status_style)
                content.append(" ")

                # Task ID
                id_style = "bold " + task.status_style if is_highlighted else task.status_style
                content.append(f"{task.id}", style=id_style)
                content.append(" ")

                # Description (truncated)
                desc = task.description[:45] + "..." if len(task.description) > 48 else task.description
                content.append(desc, style=task.status_style)

                # Blocker indicator
                if task.is_blocked:
                    blocker_text = ", ".join(task.blockers[:2])
                    if len(task.blockers) > 2:
                        blocker_text += f", +{len(task.blockers) - 2}"
                    content.append(f" [Blocked by: {blocker_text}]", style="dim blue")

                content.append("\n")

            # Show more indicator
            remaining = len(self._filtered_tasks) - self._max_visible
            if remaining > 0:
                content.append(f"\n  ... and {remaining} more", style="dim italic")

        # Help line
        content.append("\n")
        content.append("↑↓", style="cyan")
        content.append(": navigate  ", style="dim")
        if self.multi_select:
            content.append("Space", style="cyan")
            content.append(": toggle  ", style="dim")
        content.append("Enter", style="cyan")
        content.append(": confirm  ", style="dim")
        content.append("Esc", style="cyan")
        content.append(": cancel", style="dim")

        # Selected count (for multi-select)
        if self.multi_select and self._selected_ids:
            content.append(f"  ({len(self._selected_ids)} selected)", style="green")

        # Wrap in a panel
        panel = Panel(
            content,
            title=self._title,
            border_style="cyan",
            box=ROUNDED,
            padding=(1, 2),
        )

        return Align.center(panel)


def create_task_picker(
    plan_path: Optional[str] = None,
    multi_select: bool = False,
    title: str = "Select Task"
) -> TaskPickerModal:
    """
    Create and configure a task picker.

    Args:
        plan_path: Optional path to plan file
        multi_select: Whether to allow multi-select
        title: Modal title

    Returns:
        Configured TaskPickerModal
    """
    picker = TaskPickerModal(plan_path=plan_path, multi_select=multi_select)
    picker.set_title(title)
    return picker


__all__ = [
    'PickableTask',
    'TaskPickerModal',
    'create_task_picker',
]
