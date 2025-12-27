#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Command Runner for TUI.

This module provides command execution with real-time output streaming
to the TUI activity panel.

Features:
- Spawns Claude sessions via StreamingClaudeRunner
- Streams output to activity panel in real-time
- Parses tool calls and status updates from stream
- Handles command completion and error states

Usage:
    from scripts.tui.command_runner import CommandRunner

    runner = CommandRunner(activity_tracker)
    runner.execute_command('implement', task_id='1.1')
"""

import json
import subprocess
import threading
import time
from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path
from typing import Callable, Dict, List, Optional, Any

try:
    from rich.console import Console
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


class CommandState(Enum):
    """State of a running command."""
    IDLE = auto()
    STARTING = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    CANCELLED = auto()


@dataclass
class CommandResult:
    """Result of command execution."""
    success: bool
    message: str
    output: str = ""
    duration_seconds: float = 0.0
    tools_used: int = 0
    error: Optional[str] = None


@dataclass
class StreamEvent:
    """Event from command stream."""
    event_type: str  # 'tool_start', 'tool_end', 'text', 'status', 'error', 'agent_spawn', 'agent_complete'
    tool_name: Optional[str] = None
    tool_id: Optional[str] = None
    text: Optional[str] = None
    duration: Optional[float] = None
    details: Optional[Dict] = None


@dataclass
class AgentInfo:
    """Information about a spawned parallel agent."""
    agent_id: str
    description: str
    start_time: float
    status: str = "running"  # running, completed, failed
    end_time: Optional[float] = None
    progress: int = 0  # 0-100 estimated progress
    tools_used: int = 0
    subagent_type: Optional[str] = None

    @property
    def duration_seconds(self) -> float:
        """Get duration in seconds."""
        end = self.end_time or time.time()
        return end - self.start_time

    @property
    def is_complete(self) -> bool:
        """Check if agent has completed."""
        return self.status in ('completed', 'failed')


class AgentTracker:
    """
    Tracks parallel agent spawn and completion events.

    Parses Claude stream output to detect Task tool invocations
    and agent completions, maintaining state for display.
    """

    def __init__(self):
        """Initialize the agent tracker."""
        self._agents: Dict[str, AgentInfo] = {}
        self._lock = threading.Lock()
        self._on_agent_update: Optional[Callable[[AgentInfo], None]] = None

    def set_update_callback(self, callback: Callable[[AgentInfo], None]):
        """Set callback for agent state changes."""
        self._on_agent_update = callback

    def agent_spawned(
        self,
        agent_id: str,
        description: str,
        subagent_type: Optional[str] = None,
    ) -> AgentInfo:
        """
        Record a new agent being spawned.

        Args:
            agent_id: Unique agent identifier
            description: Short description of agent task
            subagent_type: Optional agent type (e.g., 'general-purpose', 'Explore')

        Returns:
            AgentInfo for the new agent
        """
        with self._lock:
            agent = AgentInfo(
                agent_id=agent_id,
                description=description,
                start_time=time.time(),
                status="running",
                subagent_type=subagent_type,
            )
            self._agents[agent_id] = agent

        if self._on_agent_update:
            self._on_agent_update(agent)

        return agent

    def agent_completed(
        self,
        agent_id: str,
        success: bool = True,
    ) -> Optional[AgentInfo]:
        """
        Record an agent completing.

        Args:
            agent_id: Agent identifier
            success: Whether agent completed successfully

        Returns:
            Updated AgentInfo or None if not found
        """
        with self._lock:
            if agent_id not in self._agents:
                return None

            agent = self._agents[agent_id]
            agent.status = "completed" if success else "failed"
            agent.end_time = time.time()
            agent.progress = 100

        if self._on_agent_update:
            self._on_agent_update(agent)

        return agent

    def update_progress(
        self,
        agent_id: str,
        progress: int,
        tools_used: Optional[int] = None,
    ) -> Optional[AgentInfo]:
        """
        Update agent progress.

        Args:
            agent_id: Agent identifier
            progress: Progress percentage (0-100)
            tools_used: Optional tool count update

        Returns:
            Updated AgentInfo or None if not found
        """
        with self._lock:
            if agent_id not in self._agents:
                return None

            agent = self._agents[agent_id]
            agent.progress = min(100, max(0, progress))
            if tools_used is not None:
                agent.tools_used = tools_used

        if self._on_agent_update:
            self._on_agent_update(agent)

        return agent

    def get_active_agents(self) -> List[AgentInfo]:
        """Get all currently running agents."""
        with self._lock:
            return [a for a in self._agents.values() if a.status == "running"]

    def get_all_agents(self) -> List[AgentInfo]:
        """Get all agents (including completed)."""
        with self._lock:
            return list(self._agents.values())

    def get_agent(self, agent_id: str) -> Optional[AgentInfo]:
        """Get agent by ID."""
        with self._lock:
            return self._agents.get(agent_id)

    def get_fan_in_status(self) -> tuple:
        """
        Get fan-in status (waiting for N/M agents).

        Returns:
            tuple: (completed_count, total_count)
        """
        with self._lock:
            total = len(self._agents)
            completed = sum(1 for a in self._agents.values() if a.is_complete)
            return (completed, total)

    def clear(self):
        """Clear all tracked agents."""
        with self._lock:
            self._agents.clear()

    def parse_tool_event(self, tool_name: str, details: Dict) -> Optional[AgentInfo]:
        """
        Parse a tool event to detect agent spawn.

        Args:
            tool_name: Name of the tool (e.g., 'Task')
            details: Tool invocation details

        Returns:
            AgentInfo if an agent was spawned, None otherwise
        """
        if tool_name != 'Task':
            return None

        # Extract agent info from Task tool details
        agent_id = details.get('id', str(id(details)))
        description = details.get('description', 'Agent')
        subagent_type = details.get('subagent_type')

        return self.agent_spawned(
            agent_id=agent_id,
            description=description,
            subagent_type=subagent_type,
        )

    def parse_tool_result(
        self,
        tool_name: str,
        tool_id: str,
        success: bool = True,
    ) -> Optional[AgentInfo]:
        """
        Parse a tool result to detect agent completion.

        Args:
            tool_name: Name of the tool
            tool_id: Tool invocation ID
            success: Whether the tool succeeded

        Returns:
            AgentInfo if an agent completed, None otherwise
        """
        if tool_name != 'Task':
            return None

        return self.agent_completed(tool_id, success)


class CommandRunner:
    """
    Runs commands with real-time output streaming to TUI.

    Provides integration between plan commands (implement, verify, explain)
    and the TUI activity panel for real-time feedback.
    """

    # Map command names to skill paths
    SKILL_COMMANDS = {
        'implement': 'plan:implement',
        'verify': 'plan:verify',
        'explain': 'plan:explain',
    }

    def __init__(
        self,
        activity_tracker: Optional[Any] = None,
        on_status_update: Optional[Callable[[str], None]] = None,
        on_command_complete: Optional[Callable[[CommandResult], None]] = None,
        working_dir: Optional[str] = None,
    ):
        """
        Initialize the command runner.

        Args:
            activity_tracker: ActivityTracker instance for logging tool calls
            on_status_update: Callback for status message updates
            on_command_complete: Callback when command completes
            working_dir: Working directory for command execution
        """
        self.activity_tracker = activity_tracker
        self.on_status_update = on_status_update
        self.on_command_complete = on_command_complete
        self.working_dir = working_dir

        self._state = CommandState.IDLE
        self._current_process: Optional[subprocess.Popen] = None
        self._current_thread: Optional[threading.Thread] = None
        self._stop_requested = False
        self._lock = threading.Lock()

        # Track statistics for current command
        self._tools_used = 0
        self._start_time: Optional[float] = None
        self._output_parts: List[str] = []

        # Agent tracker for parallel agent monitoring
        self.agent_tracker = AgentTracker()

    @property
    def state(self) -> CommandState:
        """Get current command state."""
        return self._state

    @property
    def is_running(self) -> bool:
        """Check if a command is currently running."""
        return self._state in (CommandState.STARTING, CommandState.RUNNING)

    def execute_command(
        self,
        command: str,
        task_id: Optional[str] = None,
        args: str = "",
        autonomous: bool = True,
    ) -> bool:
        """
        Execute a command asynchronously.

        Args:
            command: Command name ('implement', 'verify', 'explain', or custom)
            task_id: Optional task ID to pass to the command
            args: Additional command arguments
            autonomous: If True, add --autonomous flag

        Returns:
            True if command was started, False if busy
        """
        if self.is_running:
            return False

        # Build the prompt
        prompt = self._build_prompt(command, task_id, args, autonomous)
        if not prompt:
            return False

        # Start execution in background thread
        self._state = CommandState.STARTING
        self._stop_requested = False
        self._tools_used = 0
        self._output_parts = []
        self._start_time = time.time()

        thread = threading.Thread(
            target=self._run_command,
            args=(prompt,),
            daemon=True
        )
        thread.start()
        self._current_thread = thread

        return True

    def _build_prompt(
        self,
        command: str,
        task_id: Optional[str],
        args: str,
        autonomous: bool,
    ) -> Optional[str]:
        """Build the prompt string for the command."""
        # Get the skill name
        skill_name = self.SKILL_COMMANDS.get(command, command)

        # Build command string
        parts = [f"/{skill_name}"]

        if task_id:
            parts.append(task_id)

        if args:
            parts.append(args)

        if autonomous and command in ('implement', 'verify'):
            parts.append("--autonomous")

        return " ".join(parts)

    def _run_command(self, prompt: str):
        """Run command in background thread."""
        try:
            self._state = CommandState.RUNNING

            if self.on_status_update:
                self.on_status_update(f"Executing: {prompt}")

            # Import StreamingClaudeRunner
            from scripts.lib.claude_runner import StreamingClaudeRunner

            # Create runner with callbacks
            runner = StreamingClaudeRunner(
                on_tool_start=self._handle_tool_start,
                on_tool_end=self._handle_tool_end,
                on_text=self._handle_text,
                timeout=600,
                working_dir=self.working_dir,
            )

            # Run the command
            success, output = runner.run(prompt)

            # Check if we were stopped
            if self._stop_requested:
                self._state = CommandState.CANCELLED
                result = CommandResult(
                    success=False,
                    message="Command cancelled",
                    output=self._get_output(),
                    duration_seconds=self._get_duration(),
                    tools_used=self._tools_used,
                )
            elif success:
                self._state = CommandState.COMPLETED
                result = CommandResult(
                    success=True,
                    message="Command completed successfully",
                    output=output or self._get_output(),
                    duration_seconds=self._get_duration(),
                    tools_used=self._tools_used,
                )
            else:
                self._state = CommandState.FAILED
                result = CommandResult(
                    success=False,
                    message="Command failed",
                    output=output or self._get_output(),
                    duration_seconds=self._get_duration(),
                    tools_used=self._tools_used,
                    error=output,
                )

            # Notify completion
            if self.on_command_complete:
                self.on_command_complete(result)

            if self.on_status_update:
                status = "completed" if result.success else "failed"
                self.on_status_update(
                    f"Command {status} ({self._tools_used} tools, {result.duration_seconds:.1f}s)"
                )

        except Exception as e:
            self._state = CommandState.FAILED
            result = CommandResult(
                success=False,
                message=f"Command error: {str(e)}",
                duration_seconds=self._get_duration(),
                error=str(e),
            )

            if self.on_command_complete:
                self.on_command_complete(result)

            if self.on_status_update:
                self.on_status_update(f"Command error: {str(e)}")

    def _handle_tool_start(self, tool_name: str, details: Dict):
        """Handle tool start event from stream."""
        self._tools_used += 1

        # Log to activity tracker
        if self.activity_tracker:
            self.activity_tracker.tool_started(tool_name, details)

        # Track agent spawns
        agent_info = self.agent_tracker.parse_tool_event(tool_name, details)
        if agent_info:
            # Emit agent spawn event
            event = StreamEvent(
                event_type='agent_spawn',
                tool_name=tool_name,
                tool_id=details.get('id'),
                details={
                    'agent_id': agent_info.agent_id,
                    'description': agent_info.description,
                    'subagent_type': agent_info.subagent_type,
                },
            )
            self._emit_event(event)
        else:
            # Create regular stream event
            event = StreamEvent(
                event_type='tool_start',
                tool_name=tool_name,
                tool_id=details.get('id'),
                details=details,
            )
            self._emit_event(event)

    def _handle_tool_end(self, tool_name: str, tool_id: str, duration: float):
        """Handle tool end event from stream."""
        # Log to activity tracker
        if self.activity_tracker:
            self.activity_tracker.tool_completed(tool_id, duration)

        # Track agent completions
        agent_info = self.agent_tracker.parse_tool_result(tool_name, tool_id, success=True)
        if agent_info:
            # Emit agent complete event
            event = StreamEvent(
                event_type='agent_complete',
                tool_name=tool_name,
                tool_id=tool_id,
                duration=duration,
                details={
                    'agent_id': agent_info.agent_id,
                    'status': agent_info.status,
                    'duration_seconds': agent_info.duration_seconds,
                },
            )
            self._emit_event(event)
        else:
            # Create regular stream event
            event = StreamEvent(
                event_type='tool_end',
                tool_name=tool_name,
                tool_id=tool_id,
                duration=duration,
            )
            self._emit_event(event)

    def _handle_text(self, text: str):
        """Handle text output from stream."""
        with self._lock:
            self._output_parts.append(text)

        # Create stream event
        event = StreamEvent(
            event_type='text',
            text=text,
        )
        self._emit_event(event)

    def _emit_event(self, event: StreamEvent):
        """Emit a stream event (extensibility hook)."""
        # Currently just for internal tracking
        # Could add event listeners in the future
        pass

    def _get_output(self) -> str:
        """Get accumulated output."""
        with self._lock:
            return ''.join(self._output_parts)

    def _get_duration(self) -> float:
        """Get elapsed duration in seconds."""
        if self._start_time:
            return time.time() - self._start_time
        return 0.0

    def stop(self):
        """Stop the current command if running."""
        if not self.is_running:
            return

        self._stop_requested = True

        if self._current_process:
            try:
                self._current_process.terminate()
                self._current_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._current_process.kill()
                self._current_process.wait()
            except Exception:
                pass

    def wait(self, timeout: Optional[float] = None) -> Optional[CommandResult]:
        """
        Wait for current command to complete.

        Args:
            timeout: Maximum time to wait in seconds

        Returns:
            CommandResult if command completed, None if timeout
        """
        if not self._current_thread:
            return None

        self._current_thread.join(timeout=timeout)

        if self._current_thread.is_alive():
            return None

        return CommandResult(
            success=self._state == CommandState.COMPLETED,
            message=f"State: {self._state.name}",
            output=self._get_output(),
            duration_seconds=self._get_duration(),
            tools_used=self._tools_used,
        )


class CommandOutputStreamer:
    """
    Streams command output to TUI in real-time.

    This class wraps CommandRunner and provides a higher-level interface
    for streaming command output to the TUI activity panel.
    """

    def __init__(
        self,
        tui_manager: Any,
        plan_path: Optional[str] = None,
    ):
        """
        Initialize the output streamer.

        Args:
            tui_manager: RichTUIManager instance
            plan_path: Optional path to plan file
        """
        self.tui_manager = tui_manager
        self.plan_path = plan_path

        # Create command runner with TUI integration
        self.runner = CommandRunner(
            activity_tracker=tui_manager.activity_tracker if tui_manager else None,
            on_status_update=self._on_status_update,
            on_command_complete=self._on_complete,
        )

        self._last_result: Optional[CommandResult] = None

    def _on_status_update(self, message: str):
        """Handle status update from command runner."""
        if self.tui_manager:
            self.tui_manager.set_status(message)
            self.tui_manager.set_claude_running(
                self.runner.state == CommandState.RUNNING
            )

    def _on_complete(self, result: CommandResult):
        """Handle command completion."""
        self._last_result = result

        if self.tui_manager:
            self.tui_manager.set_claude_running(False)
            # Refresh task data after command completes
            self.tui_manager.refresh()

    def execute(
        self,
        command: str,
        task_id: Optional[str] = None,
        args: str = "",
    ) -> bool:
        """
        Execute a command with output streaming.

        Args:
            command: Command name ('implement', 'verify', 'explain')
            task_id: Optional task ID
            args: Additional arguments

        Returns:
            True if command started
        """
        if self.tui_manager:
            self.tui_manager.set_claude_running(True)

        return self.runner.execute_command(
            command=command,
            task_id=task_id,
            args=args,
            autonomous=True,
        )

    @property
    def is_running(self) -> bool:
        """Check if command is running."""
        return self.runner.is_running

    @property
    def last_result(self) -> Optional[CommandResult]:
        """Get the last command result."""
        return self._last_result

    def stop(self):
        """Stop current command."""
        self.runner.stop()


def create_command_runner(
    tui_manager: Any = None,
    activity_tracker: Any = None,
) -> CommandRunner:
    """
    Create a command runner.

    Args:
        tui_manager: Optional RichTUIManager instance
        activity_tracker: Optional ActivityTracker instance

    Returns:
        Configured CommandRunner
    """
    return CommandRunner(
        activity_tracker=activity_tracker or (
            tui_manager.activity_tracker if tui_manager else None
        ),
        on_status_update=lambda msg: (
            tui_manager.set_status(msg) if tui_manager else None
        ),
    )


def create_output_streamer(
    tui_manager: Any,
    plan_path: Optional[str] = None,
) -> CommandOutputStreamer:
    """
    Create a command output streamer.

    Args:
        tui_manager: RichTUIManager instance
        plan_path: Optional path to plan file

    Returns:
        Configured CommandOutputStreamer
    """
    return CommandOutputStreamer(tui_manager, plan_path)


__all__ = [
    'CommandState',
    'CommandResult',
    'StreamEvent',
    'AgentInfo',
    'AgentTracker',
    'CommandRunner',
    'CommandOutputStreamer',
    'create_command_runner',
    'create_output_streamer',
]
