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
from typing import Callable, Dict, List, Optional, Tuple

__all__ = ['StreamingClaudeRunner']


class StreamingClaudeRunner:
    """Runs Claude CLI with streaming JSON output and event callbacks.

    Parses Claude CLI's stream-json format which uses these event types:
    - type: "system" (subtype: "init") - session initialization
    - type: "assistant" - assistant messages with tool_use or text content
    - type: "user" - tool results
    - type: "result" - session completion
    """

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
        # Track active tool calls: tool_id -> {name, start_time, input}
        self._active_tools: Dict[str, Dict] = {}

    def run(self, prompt: str) -> Tuple[bool, str]:
        """Run Claude with streaming output, calling callbacks for events."""
        cmd = [
            "claude", "-p", prompt,
            "--dangerously-skip-permissions",
            "--output-format", "stream-json",
            "--verbose"  # Required for stream-json with -p
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
