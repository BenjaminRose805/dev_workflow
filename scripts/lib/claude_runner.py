#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Runner - Streaming Claude CLI execution with event callbacks.

This module provides StreamingClaudeRunner for running Claude CLI with
real-time streaming JSON output parsing and tool call tracking.

Part of the plan_orchestrator module split.
"""

import json
import subprocess
import time
from typing import Callable, Dict, List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from .event_bus import EventBus

__all__ = ['StreamingClaudeRunner']


class StreamingClaudeRunner:
    """Runs Claude CLI with streaming JSON output and event callbacks.

    Parses Claude CLI's stream-json format which uses these event types:
    - type: "system" (subtype: "init") - session initialization
    - type: "assistant" - assistant messages with tool_use or text content
    - type: "user" - tool results
    - type: "result" - session completion

    Optionally integrates with an EventBus to emit TOOL_STARTED and TOOL_COMPLETED
    events, allowing decoupled subscribers to track tool execution.
    """

    def __init__(
        self,
        on_tool_start: Optional[Callable[[str, Dict], None]] = None,
        on_tool_end: Optional[Callable[[str, str, float], None]] = None,
        on_text: Optional[Callable[[str], None]] = None,
        timeout: int = 600,
        working_dir: Optional[str] = None,
        worktree_path: Optional[str] = None,
        event_bus: Optional['EventBus'] = None,
        instance_id: Optional[str] = None,
    ):
        self.on_tool_start = on_tool_start
        self.on_tool_end = on_tool_end  # (tool_name, tool_id, duration_seconds) -> None
        self.on_text = on_text
        self.timeout = timeout
        self.working_dir = working_dir
        self.worktree_path = worktree_path
        self.event_bus = event_bus
        self.instance_id = instance_id
        self.process: Optional[subprocess.Popen] = None
        # Track active tool calls: tool_id -> {name, start_time, input}
        self._active_tools: Dict[str, Dict] = {}

    def run(self, prompt: str) -> Tuple[bool, str]:
        """Run Claude with streaming output, calling callbacks for events.

        Uses working_dir and worktree_path if set during initialization
        to properly run Claude in the correct worktree context.
        """
        import os

        cmd = [
            "claude", "-p", prompt,
            "--dangerously-skip-permissions",
            "--output-format", "stream-json",
            "--verbose"  # Required for stream-json with -p
        ]

        # Build environment with worktree context if specified
        env = None
        if self.worktree_path:
            env = os.environ.copy()
            env["CLAUDE_WORKTREE"] = self.worktree_path

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=self.working_dir,
                env=env
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
            self._active_tools.clear()

    def _parse_json_line(self, line: str, output_parts: List[str]):
        """Parse a Claude CLI streaming JSON line and dispatch to callbacks.

        Claude CLI stream-json format:
        - {"type": "assistant", "message": {"content": [{"type": "tool_use", ...}]}}
        - {"type": "user", "message": {"content": [{"type": "tool_result", ...}]}}
        - {"type": "assistant", "message": {"content": [{"type": "text", "text": "..."}]}}
        - {"type": "result", "result": "final text", ...}
        """
        try:
            data = json.loads(line)
            event_type = data.get('type')

            if event_type == 'assistant':
                # Assistant message - may contain tool_use or text
                message = data.get('message', {})
                content_list = message.get('content', [])

                for content in content_list:
                    content_type = content.get('type')

                    if content_type == 'tool_use':
                        # Tool invocation starting
                        tool_id = content.get('id', '')
                        tool_name = content.get('name', 'Unknown')
                        tool_input = content.get('input', {})

                        # Track this tool call
                        self._active_tools[tool_id] = {
                            'name': tool_name,
                            'start_time': time.time(),
                            'input': tool_input
                        }

                        # Fire callback
                        if self.on_tool_start:
                            self.on_tool_start(tool_name, {'id': tool_id, **tool_input})

                        # Emit event to event bus
                        if self.event_bus:
                            self._emit_tool_started(tool_id, tool_name, tool_input)

                    elif content_type == 'text':
                        # Text output
                        text = content.get('text', '')
                        if text:
                            if self.on_text:
                                self.on_text(text)
                            output_parts.append(text)

            elif event_type == 'user':
                # User message with tool results - means tool completed
                message = data.get('message', {})
                content_list = message.get('content', [])

                for content in content_list:
                    if content.get('type') == 'tool_result':
                        tool_id = content.get('tool_use_id', '')

                        if tool_id in self._active_tools:
                            tool_info = self._active_tools[tool_id]
                            duration = time.time() - tool_info['start_time']

                            # Fire callback
                            if self.on_tool_end:
                                self.on_tool_end(tool_info['name'], tool_id, duration)

                            # Emit event to event bus
                            if self.event_bus:
                                # Determine success based on tool_result content
                                result_content = content.get('content', '')
                                is_error = content.get('is_error', False)
                                self._emit_tool_completed(
                                    tool_id, tool_info['name'], duration, not is_error
                                )

                            # Clean up
                            del self._active_tools[tool_id]

            elif event_type == 'result':
                # Session complete - extract final result
                result_text = data.get('result', '')
                if result_text and result_text not in ''.join(output_parts):
                    output_parts.append(result_text)

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

    def _emit_tool_started(self, tool_id: str, tool_name: str, tool_input: Dict):
        """Emit TOOL_STARTED event to the event bus.

        Args:
            tool_id: Unique ID of the tool call
            tool_name: Name of the tool being called
            tool_input: Input parameters for the tool
        """
        # Import here to avoid circular imports at module load
        from .event_bus import EventType

        # Create a summary of the input (truncate long values)
        input_summary = {}
        for key, value in tool_input.items():
            if isinstance(value, str) and len(value) > 100:
                input_summary[key] = value[:100] + '...'
            elif isinstance(value, (dict, list)):
                input_summary[key] = f"<{type(value).__name__}>"
            else:
                input_summary[key] = value

        self.event_bus.emit_sync(
            EventType.TOOL_STARTED,
            data={
                'tool_id': tool_id,
                'tool_name': tool_name,
                'input_summary': input_summary,
            },
            instance_id=self.instance_id,
        )

    def _emit_tool_completed(
        self,
        tool_id: str,
        tool_name: str,
        duration: float,
        success: bool,
    ):
        """Emit TOOL_COMPLETED event to the event bus.

        Args:
            tool_id: Unique ID of the tool call
            tool_name: Name of the tool that was called
            duration: Duration of the tool call in seconds
            success: Whether the tool call succeeded
        """
        # Import here to avoid circular imports at module load
        from .event_bus import EventType

        self.event_bus.emit_sync(
            EventType.TOOL_COMPLETED,
            data={
                'tool_id': tool_id,
                'tool_name': tool_name,
                'duration': round(duration, 3),
                'success': success,
            },
            instance_id=self.instance_id,
        )
