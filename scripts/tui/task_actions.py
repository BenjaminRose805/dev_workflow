#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Task Action Handlers for TUI.

This module provides handlers for task action keys:
- e: Explain task (run plan:explain)
- i: Implement task (run plan:implement)
- v: Verify task (run plan:verify)
- s: Skip task (mark as skipped)
- f: View task findings
- d: Show task dependencies

Usage:
    from scripts.tui.task_actions import TaskActionHandler

    handler = TaskActionHandler()
    handler.handle_action('explain', task)
"""

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any

try:
    from rich.console import Console, RenderableType
    from rich.panel import Panel
    from rich.text import Text
    from rich.markdown import Markdown
    from rich.align import Align
    from rich.box import ROUNDED
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


@dataclass
class ActionResult:
    """Result of a task action."""
    success: bool
    message: str
    data: Optional[Dict] = None
    content: Optional[str] = None  # For findings display


class TaskActionHandler:
    """
    Handles task action key commands.

    Provides implementations for:
    - explain (e): Run plan:explain on selected task
    - implement (i): Run plan:implement on selected task
    - verify (v): Run plan:verify on selected task
    - skip (s): Mark task as skipped
    - findings (f): View task findings
    - deps (d): Show task dependencies
    """

    # Command paths for each action
    COMMAND_PATHS = {
        'explain': '.claude/commands/plan/explain.md',
        'implement': '.claude/commands/plan/implement.md',
        'verify': '.claude/commands/plan/verify.md',
    }

    def __init__(self, plan_path: Optional[str] = None):
        """
        Initialize the task action handler.

        Args:
            plan_path: Optional path to plan file (uses current plan if None)
        """
        self.plan_path = plan_path
        self._plan_name: Optional[str] = None

        # Callbacks for actions that need external handling
        self._on_command_execute: Optional[Callable[[str, str], None]] = None
        self._on_show_overlay: Optional[Callable[[str, Any], None]] = None

    def _get_plan_name(self) -> str:
        """Get the plan name from the plan path."""
        if self._plan_name:
            return self._plan_name

        plan_path = self.plan_path
        if not plan_path:
            # Read from current-plan.txt
            try:
                with open('.claude/current-plan.txt', 'r') as f:
                    plan_path = f.read().strip()
            except Exception:
                return "unknown"

        if plan_path:
            self._plan_name = Path(plan_path).stem
            return self._plan_name

        return "unknown"

    def set_command_execute_callback(self, callback: Callable[[str, str], None]):
        """
        Set callback for executing commands.

        Args:
            callback: Function receiving (command_name, task_id)
        """
        self._on_command_execute = callback

    def set_overlay_callback(self, callback: Callable[[str, Any], None]):
        """
        Set callback for showing overlays.

        Args:
            callback: Function receiving (overlay_type, content)
        """
        self._on_show_overlay = callback

    def handle_action(self, action: str, task: Dict) -> ActionResult:
        """
        Handle a task action.

        Args:
            action: Action name (explain, implement, verify, skip, findings, deps)
            task: Task dictionary with at least 'id' field

        Returns:
            ActionResult with success status and message/content
        """
        task_id = task.get('id', '')
        if not task_id:
            return ActionResult(
                success=False,
                message="No task ID provided"
            )

        action_handlers = {
            'explain': self._handle_explain,
            'implement': self._handle_implement,
            'verify': self._handle_verify,
            'skip': self._handle_skip,
            'findings': self._handle_findings,
            'deps': self._handle_deps,
        }

        handler = action_handlers.get(action)
        if not handler:
            return ActionResult(
                success=False,
                message=f"Unknown action: {action}"
            )

        return handler(task_id, task)

    def _handle_explain(self, task_id: str, task: Dict) -> ActionResult:
        """Handle explain action (e key)."""
        # Signal to execute plan:explain command
        if self._on_command_execute:
            self._on_command_execute('explain', task_id)
            return ActionResult(
                success=True,
                message=f"Launching plan:explain for task {task_id}..."
            )

        return ActionResult(
            success=False,
            message="Command execution not configured"
        )

    def _handle_implement(self, task_id: str, task: Dict) -> ActionResult:
        """Handle implement action (i key)."""
        # Signal to execute plan:implement command
        if self._on_command_execute:
            self._on_command_execute('implement', task_id)
            return ActionResult(
                success=True,
                message=f"Launching plan:implement for task {task_id}..."
            )

        return ActionResult(
            success=False,
            message="Command execution not configured"
        )

    def _handle_verify(self, task_id: str, task: Dict) -> ActionResult:
        """Handle verify action (v key)."""
        # Signal to execute plan:verify command
        if self._on_command_execute:
            self._on_command_execute('verify', task_id)
            return ActionResult(
                success=True,
                message=f"Launching plan:verify for task {task_id}..."
            )

        return ActionResult(
            success=False,
            message="Command execution not configured"
        )

    def _handle_skip(self, task_id: str, task: Dict) -> ActionResult:
        """Handle skip action (s key)."""
        try:
            cmd = [
                'node', 'scripts/status-cli.js',
                'mark-skipped', task_id,
                '--reason', 'Skipped via TUI'
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                return ActionResult(
                    success=True,
                    message=f"Task {task_id} marked as skipped",
                    data=json.loads(result.stdout) if result.stdout else None
                )
            else:
                return ActionResult(
                    success=False,
                    message=f"Failed to skip task: {result.stderr or 'Unknown error'}"
                )

        except subprocess.TimeoutExpired:
            return ActionResult(
                success=False,
                message="Command timed out"
            )
        except Exception as e:
            return ActionResult(
                success=False,
                message=f"Error skipping task: {str(e)}"
            )

    def _handle_findings(self, task_id: str, task: Dict) -> ActionResult:
        """Handle findings action (f key)."""
        plan_name = self._get_plan_name()
        findings_dir = Path(f'docs/plan-outputs/{plan_name}/findings')

        if not findings_dir.exists():
            return ActionResult(
                success=False,
                message=f"No findings directory found for plan: {plan_name}"
            )

        # Look for findings files matching the task ID
        # Pattern: {task_id}.md or {task_id}-*.md
        findings_files = list(findings_dir.glob(f"{task_id}.md")) + \
                        list(findings_dir.glob(f"{task_id}-*.md"))

        if not findings_files:
            return ActionResult(
                success=False,
                message=f"No findings found for task {task_id}"
            )

        # Read the first findings file
        findings_path = findings_files[0]
        try:
            with open(findings_path, 'r') as f:
                content = f.read()

            # Signal to show findings overlay if callback is set
            if self._on_show_overlay:
                self._on_show_overlay('findings', {
                    'task_id': task_id,
                    'path': str(findings_path),
                    'content': content,
                    'files': [str(p) for p in findings_files]
                })

            return ActionResult(
                success=True,
                message=f"Found {len(findings_files)} findings file(s)",
                content=content,
                data={
                    'path': str(findings_path),
                    'files': [str(p) for p in findings_files]
                }
            )

        except Exception as e:
            return ActionResult(
                success=False,
                message=f"Error reading findings: {str(e)}"
            )

    def _handle_deps(self, task_id: str, task: Dict) -> ActionResult:
        """Handle deps action (d key)."""
        try:
            cmd = ['node', 'scripts/status-cli.js', 'check', task_id]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)

                # Format dependency information
                blockers = data.get('blockers', [])
                can_start = data.get('canStart', True)

                if blockers:
                    message = f"Task {task_id} blocked by: {', '.join(blockers)}"
                elif can_start:
                    message = f"Task {task_id} has no blockers, ready to start"
                else:
                    message = f"Task {task_id} cannot start (status: {data.get('task', {}).get('status', 'unknown')})"

                # Signal to show deps overlay if callback is set
                if self._on_show_overlay:
                    self._on_show_overlay('deps', {
                        'task_id': task_id,
                        'data': data
                    })

                return ActionResult(
                    success=True,
                    message=message,
                    data=data
                )
            else:
                return ActionResult(
                    success=False,
                    message=f"Failed to check dependencies: {result.stderr or 'Unknown error'}"
                )

        except subprocess.TimeoutExpired:
            return ActionResult(
                success=False,
                message="Command timed out"
            )
        except Exception as e:
            return ActionResult(
                success=False,
                message=f"Error checking dependencies: {str(e)}"
            )

    def render_deps_panel(self, task_id: str, deps_data: Dict) -> 'RenderableType':
        """Render a panel showing task dependencies."""
        if not RICH_AVAILABLE:
            return f"Dependencies for {task_id}"

        content = Text()

        task_info = deps_data.get('task', {})
        content.append(f"Task: ", style="dim")
        content.append(f"{task_id}", style="bold cyan")
        content.append(f" - {task_info.get('description', '')}\n", style="white")
        content.append(f"Status: ", style="dim")
        content.append(f"{task_info.get('status', 'unknown')}\n", style="yellow")
        content.append(f"Phase: ", style="dim")
        content.append(f"{deps_data.get('phase', 'unknown')}\n\n", style="white")

        # Blockers
        blockers = deps_data.get('blockers', [])
        if blockers:
            content.append("Blocked by:\n", style="bold red")
            for blocker in blockers:
                content.append(f"  ⊘ {blocker}\n", style="red")
        else:
            content.append("No blockers ", style="green")
            content.append("✓\n", style="bold green")

        # Can start status
        can_start = deps_data.get('canStart', True)
        content.append("\n")
        if can_start:
            content.append("Ready to start: ", style="dim")
            content.append("Yes ✓\n", style="bold green")
        else:
            content.append("Ready to start: ", style="dim")
            content.append("No ✗\n", style="bold red")

        return Panel(
            content,
            title=f"Dependencies: {task_id}",
            border_style="blue",
            box=ROUNDED,
            padding=(1, 2),
        )

    def render_findings_panel(self, task_id: str, content: str, path: str) -> 'RenderableType':
        """Render a panel showing task findings."""
        if not RICH_AVAILABLE:
            return f"Findings for {task_id}"

        # Render markdown content
        md = Markdown(content)

        return Panel(
            md,
            title=f"Findings: {task_id}",
            subtitle=f"[dim]{path}[/dim]",
            border_style="cyan",
            box=ROUNDED,
            padding=(1, 2),
        )


def create_task_action_handler(plan_path: Optional[str] = None) -> TaskActionHandler:
    """
    Create a task action handler.

    Args:
        plan_path: Optional path to plan file

    Returns:
        Configured TaskActionHandler
    """
    return TaskActionHandler(plan_path=plan_path)


__all__ = [
    'ActionResult',
    'TaskActionHandler',
    'create_task_action_handler',
]
