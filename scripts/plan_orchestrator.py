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
- Git worktree support for parallel plan execution
- Multi-orchestrator registry and IPC
- Daemon mode for background execution
- Graceful shutdown via signals or IPC

Usage:
    python scripts/plan_orchestrator.py [options]

Execution Options:
    --plan PATH         Path to plan file (uses active plan if not specified)
    --worktree PATH     Path to worktree directory for parallel execution
    --max-iterations N  Maximum number of Claude invocations (default: 50)
    --batch-size N      Tasks per iteration hint (default: 5)
    --timeout SECONDS   Timeout per Claude session (default: 600)
    --dry-run           Show what would be done without executing
    --verbose           Enable verbose logging
    --continue          Continue from last run (skip confirmation)
    --no-tui            Disable Rich TUI (use plain text output)
    --no-auto-complete  Disable auto-complete (don't merge when done)
    --daemon            Run in background (daemon mode)

Management Commands:
    --list              List all registered orchestrator instances
    --stop ID           Stop a specific orchestrator instance
    --shutdown-all      Shutdown all running orchestrator instances
    --status ID         Get status of a specific orchestrator instance
    --force             Force shutdown (used with --stop or --shutdown-all)
"""

import argparse
import json
import logging
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Optional

# Ensure project root is in path for imports when run directly
_script_dir = Path(__file__).parent
_project_root = _script_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

# Import extracted modules
from scripts.lib.tui import RichTUIManager, RICH_AVAILABLE
from scripts.lib.claude_runner import StreamingClaudeRunner
from scripts.lib.status_monitor import StatusMonitor
from scripts.lib.orchestrator_registry import (
    OrchestratorRegistry,
    OrchestratorInstance,
    HeartbeatThread,
    DuplicatePlanError,
)
from scripts.lib.orchestrator_ipc import (
    IPCServer,
    IPCClient,
    IPCError,
    get_socket_path,
)

# Configuration
DEFAULT_MAX_ITERATIONS = 50
DEFAULT_TIMEOUT = 600  # 10 minutes per session
DEFAULT_BATCH_SIZE = 5
# Node script for status queries - unified CLI replacing plan-orchestrator.js
STATUS_CLI_JS = "scripts/status-cli.js"
STATUS_CHECK_INTERVAL = 2  # seconds between status checks


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
        worktree_path: Optional[str] = None,
        max_iterations: int = DEFAULT_MAX_ITERATIONS,
        timeout: int = DEFAULT_TIMEOUT,
        batch_size: int = DEFAULT_BATCH_SIZE,
        dry_run: bool = False,
        verbose: bool = False,
        use_tui: bool = True,
        auto_complete: bool = True,
    ):
        self.plan_path = plan_path
        self.max_iterations = max_iterations
        self.timeout = timeout
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.verbose = verbose
        self.use_tui = use_tui and RICH_AVAILABLE
        self.auto_complete = auto_complete

        self.iteration = 0
        self.start_time = None
        self.tasks_completed_this_run = 0

        # Phase 5: Multi-orchestrator support
        self.registry: Optional[OrchestratorRegistry] = None
        self.instance: Optional[OrchestratorInstance] = None
        self.heartbeat_thread: Optional[HeartbeatThread] = None
        self.ipc_server: Optional[IPCServer] = None
        self._shutdown_requested = False
        self._paused = False

        # Task 4.1-4.3: Worktree support
        # Auto-detect worktree from current directory if not specified
        self.worktree_path = self._resolve_worktree_path(worktree_path)
        self.working_dir = self._get_working_directory()

        # TUI components (initialized in run() if use_tui is True)
        self.tui: Optional[RichTUIManager] = None
        self.status_monitor: Optional[StatusMonitor] = None
        self.streaming_runner: Optional[StreamingClaudeRunner] = None

        # Set up logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG if verbose else logging.INFO)

        # Clear any existing handlers
        self.logger.handlers.clear()

        log_format = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

        # Task 4.4: Use worktree-specific log file
        self.log_file = self._get_log_file_path()

        if use_tui:
            # Log to file when TUI is active (stdout would mess up the display)
            file_handler = logging.FileHandler(self.log_file, mode='a')
            file_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
            file_handler.setFormatter(log_format)
            self.logger.addHandler(file_handler)
        else:
            # Log to stdout when TUI is disabled
            stream_handler = logging.StreamHandler()
            stream_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
            stream_handler.setFormatter(log_format)
            self.logger.addHandler(stream_handler)

    def _resolve_worktree_path(self, explicit_path: Optional[str]) -> Optional[str]:
        """Task 4.1 + 4.2: Resolve worktree path.

        Priority:
        1. Explicitly provided --worktree flag
        2. Auto-detect from current directory (.claude-context/ presence)
        3. CLAUDE_WORKTREE environment variable
        4. None (not in a worktree)
        """
        # Priority 1: Explicit --worktree flag
        if explicit_path:
            resolved = Path(explicit_path).resolve()
            if resolved.exists():
                return str(resolved)
            self.logger.warning(f"Specified worktree path does not exist: {explicit_path}")
            return None

        # Priority 2: Auto-detect from current directory
        cwd = Path.cwd()
        if (cwd / ".claude-context").exists():
            return str(cwd)

        # Priority 3: CLAUDE_WORKTREE environment variable
        env_worktree = os.environ.get("CLAUDE_WORKTREE")
        if env_worktree and Path(env_worktree).exists():
            return env_worktree

        return None

    def _get_working_directory(self) -> str:
        """Task 4.3: Get the working directory for Claude sessions.

        Returns worktree path if in a worktree, otherwise current directory.
        """
        if self.worktree_path:
            return self.worktree_path
        return str(Path.cwd())

    def _get_log_file_path(self) -> str:
        """Task 4.4: Get worktree-specific log file path.

        Format: orchestrator-{plan-name}.log in the working directory.
        Falls back to orchestrator.log if plan name cannot be determined.
        """
        # Try to get plan name from plan_path or worktree context
        plan_name = None

        if self.plan_path:
            plan_name = Path(self.plan_path).stem
        elif self.worktree_path:
            # Try to read from .claude-context/current-plan.txt
            plan_pointer = Path(self.worktree_path) / ".claude-context" / "current-plan.txt"
            if plan_pointer.exists():
                try:
                    plan_path = plan_pointer.read_text().strip()
                    plan_name = Path(plan_path).stem
                except Exception:
                    pass

        if plan_name:
            return str(Path(self.working_dir) / f"orchestrator-{plan_name}.log")
        return str(Path(self.working_dir) / "orchestrator.log")

    def get_status(self) -> Optional[PlanStatus]:
        """Get current plan status via node scripts/status-cli.js."""
        try:
            result = subprocess.run(
                ["node", STATUS_CLI_JS, "status"],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self.working_dir,
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
            self.logger.error(f"Node or status-cli.js not found")
            return None

    def get_next_tasks(self, count: int = 5) -> list:
        """Get next recommended tasks via status-cli.js.

        Returns a list of task objects, each containing:
        - id: Task ID (e.g., "3.1")
        - description: Task description
        - phase: Phase number
        - status: Task status
        - reason: Why this task was selected
        - sequential: True if task is in a sequential group (optional)
        - sequentialGroup: Range like "3.1-3.4" if sequential (optional)
        - sequentialReason: Reason for sequential constraint (optional)
        """
        try:
            result = subprocess.run(
                ["node", STATUS_CLI_JS, "next", str(count)],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self.working_dir,
            )
            if result.returncode != 0:
                return []

            data = json.loads(result.stdout)
            tasks = data.get("tasks", [])

            # Log constraint metadata for debugging
            for task in tasks:
                if task.get("sequential"):
                    self.logger.debug(
                        f"Task {task.get('id')} has sequential constraint: "
                        f"group={task.get('sequentialGroup')}, reason={task.get('sequentialReason')}"
                    )

            return tasks
        except Exception as e:
            self.logger.error(f"Failed to get next tasks: {e}")
            return []

    def _filter_sequential_tasks(self, tasks: list) -> list:
        """Filter tasks to respect sequential constraints.

        If multiple tasks share the same sequentialGroup, only include the first one
        (by task ID order). This ensures tasks marked [SEQUENTIAL] run one at a time.

        Args:
            tasks: List of task objects from get_next_tasks()

        Returns:
            Filtered list respecting sequential constraints. Tasks not in any
            sequential group are passed through unchanged.
        """
        if not tasks:
            return []

        # Track which sequential groups we've already included
        seen_groups = set()
        filtered = []
        held_back = []

        for task in tasks:
            seq_group = task.get("sequentialGroup")

            if seq_group:
                if seq_group in seen_groups:
                    # Already have a task from this group, hold this one back
                    held_back.append(task)
                    continue
                # First task from this sequential group
                seen_groups.add(seq_group)

            filtered.append(task)

        # Log held-back tasks
        for task in held_back:
            # Find which task is running from the same group
            running_task = next(
                (t for t in filtered if t.get("sequentialGroup") == task.get("sequentialGroup")),
                None
            )
            running_id = running_task.get("id") if running_task else "unknown"
            self.logger.info(
                f"Task {task.get('id')} held back (sequential with {running_id})"
            )

        return filtered

    def get_retryable_tasks(self) -> list:
        """Get failed tasks that can be retried (retryCount < 2)."""
        try:
            result = subprocess.run(
                ["node", "scripts/status-cli.js", "retryable"],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self.working_dir,
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
                cwd=self.working_dir,
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
                cwd=self.working_dir,
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
                cwd=self.working_dir,
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

            # Task 4.3 + 4.5: Set working directory and pass worktree context
            env = os.environ.copy()
            if self.worktree_path:
                env["CLAUDE_WORKTREE"] = self.worktree_path

            # Run claude with the orchestrate command
            result = subprocess.run(
                ["claude", "-p", prompt, "--dangerously-skip-permissions"],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=self.working_dir,
                env=env,
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
        if self.worktree_path:
            print(f"  Worktree: {self.worktree_path}")
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

    def _get_output_dir(self, status: Optional[PlanStatus] = None) -> Optional[str]:
        """Get the output directory for the current plan.

        Derives output path from plan name: docs/plan-outputs/{plan-name}/
        Uses status.plan_path if available, falls back to self.plan_path.

        Task 4.6: When in a worktree context, returns an absolute path
        relative to the worktree's working directory. Otherwise returns
        a relative path that will be resolved from the current directory.
        """
        plan_path = None
        if status and status.plan_path:
            plan_path = status.plan_path
        elif self.plan_path:
            plan_path = self.plan_path

        if plan_path:
            plan_name = Path(plan_path).stem
            output_dir = f"docs/plan-outputs/{plan_name}"

            # Task 4.6: Handle worktree path in status monitoring
            # When in a worktree, make the path absolute relative to working_dir
            if self.worktree_path:
                return os.path.join(self.working_dir, output_dir)

            return output_dir
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

    # =========================================================================
    # Phase 5: Multi-orchestrator support - Registry, IPC, Daemon, Shutdown
    # =========================================================================

    def _register_instance(self, plan_path: str):
        """Register this orchestrator instance with the registry.

        Args:
            plan_path: Path to the plan being executed.

        Raises:
            DuplicatePlanError: If the plan is already being executed.
        """
        self.registry = OrchestratorRegistry()

        # Clean up stale instances first
        self.registry.cleanup_stale()

        # Create and register instance
        socket_path = get_socket_path(f"orch-{int(time.time() * 1000)}")
        self.instance = OrchestratorInstance.create(
            plan_path=plan_path,
            worktree_path=self.worktree_path,
            socket_path=socket_path,
        )

        # Register (raises DuplicatePlanError if duplicate)
        self.registry.register(self.instance)
        self.logger.info(f"Registered orchestrator instance: {self.instance.id}")

        # Start heartbeat thread
        self.heartbeat_thread = HeartbeatThread(
            self.registry,
            self.instance.id,
        )
        self.heartbeat_thread.start()

        # Start IPC server
        self._start_ipc_server()

    def _unregister_instance(self):
        """Unregister this orchestrator instance from the registry."""
        # Stop IPC server
        if self.ipc_server:
            self.ipc_server.stop()
            self.ipc_server = None

        # Stop heartbeat
        if self.heartbeat_thread:
            self.heartbeat_thread.stop()
            self.heartbeat_thread = None

        # Unregister from registry
        if self.registry and self.instance:
            self.registry.unregister(self.instance.id)
            self.logger.info(f"Unregistered orchestrator instance: {self.instance.id}")
            self.instance = None

    def _start_ipc_server(self):
        """Start the IPC server for receiving commands."""
        if not self.instance or not self.instance.socket_path:
            return

        self.ipc_server = IPCServer(self.instance.socket_path)
        self.ipc_server.on_command = self._handle_ipc_command
        self.ipc_server.start()
        self.logger.debug(f"IPC server started: {self.instance.socket_path}")

    def _handle_ipc_command(self, command: str, payload: Dict) -> Dict:
        """Handle an incoming IPC command.

        Args:
            command: Command name.
            payload: Command payload.

        Returns:
            Response payload.
        """
        if command == "status":
            status = self.get_status()
            return {
                "instance_id": self.instance.id if self.instance else None,
                "plan_path": status.plan_path if status else None,
                "progress": status.percentage if status else 0,
                "completed": status.completed if status else 0,
                "total": status.total if status else 0,
                "iteration": self.iteration,
                "paused": self._paused,
                "shutdown_requested": self._shutdown_requested,
            }

        elif command == "shutdown":
            force = payload.get("force", False)
            self._shutdown_requested = True
            self.logger.info(f"Shutdown requested via IPC (force={force})")

            if self.registry and self.instance:
                self.registry.update_status(self.instance.id, "stopping")

            return {"ack": True, "message": "Shutdown initiated"}

        elif command == "pause":
            self._paused = True
            self.logger.info("Pause requested via IPC")
            return {"ack": True, "message": "Paused"}

        elif command == "resume":
            self._paused = False
            self.logger.info("Resume requested via IPC")
            return {"ack": True, "message": "Resumed"}

        else:
            return {"error": f"Unknown command: {command}"}

    def _setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        def handle_signal(signum, frame):
            sig_name = signal.Signals(signum).name
            self.logger.info(f"Received {sig_name}, initiating graceful shutdown...")
            self._shutdown_requested = True

            if self.registry and self.instance:
                self.registry.update_status(self.instance.id, "stopping")

        # Handle SIGTERM and SIGINT
        signal.signal(signal.SIGTERM, handle_signal)
        signal.signal(signal.SIGINT, handle_signal)

    def run(self) -> int:
        """Main orchestration loop. Returns exit code."""
        self.start_time = time.time()

        # Set up signal handlers for graceful shutdown
        self._setup_signal_handlers()

        # Initial status check
        status = self.get_status()
        if not status:
            self.logger.error("Could not get initial plan status")
            return 1

        if not status.plan_path:
            self.logger.error("No active plan. Use /plan:set to choose a plan first.")
            return 1

        # Register with orchestrator registry (prevents duplicate plans)
        try:
            self._register_instance(status.plan_path)
        except DuplicatePlanError as e:
            self.logger.error(str(e))
            return 1

        # Initialize TUI if enabled
        if self.use_tui:
            try:
                self.tui = RichTUIManager(status.plan_name)
                self.tui.set_phase(status.current_phase)
                self.tui.set_progress(status.completed, status.total, status.pending, status.failed, status.in_progress)
                self.tui.set_iteration(0, self.max_iterations)

                # Start status monitor with faster polling (500ms)
                # Task 4.6: Handle worktree path in status monitoring
                output_dir = self._get_output_dir(status)
                if output_dir:
                    status_path = os.path.join(output_dir, 'status.json')
                    self.logger.debug(f"Status monitor path: {status_path}")
                    if os.path.exists(status_path):
                        # Initial read to populate recent_completions immediately
                        try:
                            with open(status_path, 'r') as f:
                                initial_status = json.load(f)
                            self._on_status_update(initial_status)
                        except (json.JSONDecodeError, OSError):
                            pass  # Will be populated by monitor

                        self.status_monitor = StatusMonitor(
                            status_path,
                            self._on_status_update,
                            interval=0.5  # Reduced from 1.0s for better responsiveness
                        )
                        self.status_monitor.start()

                # Initialize streaming runner with callbacks for real-time activity display
                # Task 4.5: Pass worktree context to Claude sessions
                self.streaming_runner = StreamingClaudeRunner(
                    on_tool_start=self._on_tool_start,
                    on_tool_end=self._on_tool_end,
                    timeout=self.timeout,
                    working_dir=self.working_dir,
                    worktree_path=self.worktree_path
                )

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
                # Check for shutdown request (from signal or IPC)
                if self._shutdown_requested:
                    self.logger.info("Shutdown requested, stopping gracefully...")
                    status = self.get_status()
                    if status:
                        if self.use_tui:
                            self.tui.set_status("Shutdown requested")
                            time.sleep(1)
                        else:
                            self.print_completion(status, "shutdown requested")
                    self._cleanup()
                    return 0

                # Check for pause request
                while self._paused and not self._shutdown_requested:
                    if self.use_tui:
                        self.tui.set_status("Paused (waiting for resume)")
                    time.sleep(1)

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

                    # Run auto-complete if enabled
                    if self.auto_complete:
                        self._cleanup()  # Clean up TUI first
                        self._run_auto_complete()

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

                # Filter out tasks that would violate sequential constraints
                # (only include first task from each sequential group)
                filtered_tasks = self._filter_sequential_tasks(next_tasks)
                if len(filtered_tasks) < len(next_tasks):
                    self.logger.info(
                        f"Filtered {len(next_tasks)} tasks to {len(filtered_tasks)} "
                        f"(respecting sequential constraints)"
                    )

                task_ids = [t.get("id", "?") for t in filtered_tasks]

                if self.use_tui:
                    self.tui.set_status(f"Running tasks: {', '.join(task_ids)}")
                    self.tui.update_tasks(filtered_tasks, self.tui.recent_completions)
                else:
                    self.logger.info(f"Next tasks: {', '.join(task_ids)}")

                # Build prompt for Claude (using filtered tasks)
                prompt = self._build_prompt(status, filtered_tasks)

                # Run Claude session
                if self.use_tui:
                    self.tui.set_claude_running(True)

                if self.use_tui and self.streaming_runner:
                    # Use streaming runner for real-time activity tracking in TUI
                    success, output = self.streaming_runner.run(prompt)
                else:
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

    def _run_auto_complete(self) -> bool:
        """Run /plan:complete via Claude to merge plan to main.

        Returns:
            True if completion succeeded, False otherwise.
        """
        if self.dry_run:
            self.logger.info("Dry run: would run /plan:complete")
            return True

        self.logger.info("Running /plan:complete to merge to main...")

        try:
            # Run Claude with /plan:complete command
            # Use --dangerously-skip-permissions to avoid prompts
            result = subprocess.run(
                ["claude", "-p", "/plan:complete", "--dangerously-skip-permissions"],
                capture_output=True, text=True, cwd=self.working_dir,
                timeout=300  # 5 minute timeout for completion
            )

            if result.returncode == 0:
                self.logger.info("Plan completed and merged successfully")
                return True
            else:
                self.logger.error(f"/plan:complete failed: {result.stderr or result.stdout}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error("/plan:complete timed out after 5 minutes")
            return False
        except Exception as e:
            self.logger.error(f"Auto-complete failed: {e}")
            return False

    def _cleanup(self):
        """Clean up TUI, monitor resources, and unregister from registry."""
        # Unregister from orchestrator registry first
        self._unregister_instance()

        if self.status_monitor:
            self.status_monitor.stop()
            self.status_monitor = None
        if self.tui:
            self.tui.stop()
            self.tui = None

    def _build_prompt(self, status: PlanStatus, next_tasks: list) -> str:
        """Build the prompt for Claude Code.

        Uses command invocation with --autonomous flag instead of inline instructions.
        The /plan:implement command handles:
        - Task status tracking (mark-started, mark-complete, mark-failed)
        - Template variable handling
        - Agent execution strategy (parallel agents, read-only pattern)
        - Run tracking (startRun/completeRun)
        - Findings collection
        - Sophisticated error handling
        """
        # Build task ID list for command args (batch appropriately)
        task_ids = " ".join(t.get('id', '') for t in next_tasks)

        # Build task list for context display
        task_list = "\n".join(
            f"  - {t.get('id')}: {t.get('description')}"
            for t in next_tasks
        )

        # Build sequential constraints section if any tasks have constraints
        constraints_section = self._build_constraints_section(next_tasks)

        prompt = f"""Execute these tasks from the plan:

{task_list}

Plan: {status.plan_path}
Progress: {status.percentage}% ({status.completed}/{status.total} tasks)

Run: /plan:implement {task_ids} --autonomous
{constraints_section}
## Rules

- Execute autonomously - do NOT ask for confirmation
- Check for [SEQUENTIAL] annotations in the plan - run marked tasks one at a time
- Detect file conflicts - if multiple tasks modify the same file, run sequentially
- Stop after completing this batch or if blocked by unrecoverable error
- If a task fails, the command will mark it failed and continue to next task
- Check progress: `node scripts/status-cli.js progress`"""
        return prompt

    def _build_constraints_section(self, tasks: list) -> str:
        """Build the Sequential Constraints section for the prompt.

        Args:
            tasks: List of task objects, potentially with constraint metadata

        Returns:
            Formatted constraint section string, or empty string if no constraints
        """
        # Collect unique sequential groups from tasks
        groups = {}
        for task in tasks:
            if task.get("sequential"):
                group = task.get("sequentialGroup", "unknown")
                reason = task.get("sequentialReason", "")
                if group not in groups:
                    groups[group] = reason

        if not groups:
            return ""

        lines = ["\n## Sequential Constraints\n"]
        for group, reason in groups.items():
            reason_text = f" - {reason}" if reason else ""
            lines.append(f"- Tasks {group}: [SEQUENTIAL]{reason_text}")

        return "\n".join(lines)


def daemonize():
    """Fork the process to run in the background (Unix only)."""
    if sys.platform == "win32":
        raise NotImplementedError("Daemon mode not supported on Windows")

    # First fork
    try:
        pid = os.fork()
        if pid > 0:
            # Parent exits
            sys.exit(0)
    except OSError as e:
        sys.stderr.write(f"Fork #1 failed: {e}\n")
        sys.exit(1)

    # Decouple from parent environment
    os.chdir("/")
    os.setsid()
    os.umask(0)

    # Second fork
    try:
        pid = os.fork()
        if pid > 0:
            # Parent exits
            print(f"Daemon started with PID {pid}")
            sys.exit(0)
    except OSError as e:
        sys.stderr.write(f"Fork #2 failed: {e}\n")
        sys.exit(1)

    # Redirect standard file descriptors
    sys.stdout.flush()
    sys.stderr.flush()
    with open("/dev/null", "r") as devnull:
        os.dup2(devnull.fileno(), sys.stdin.fileno())
    # Keep stdout/stderr for logging (will be redirected to file by orchestrator)


def cmd_list():
    """List all registered orchestrator instances."""
    registry = OrchestratorRegistry()
    registry.cleanup_stale()  # Clean up first

    instances = registry.get_all()
    if not instances:
        print("No orchestrators registered")
        return 0

    print("\nRegistered Orchestrators")
    print("=" * 70)

    for inst in instances:
        status_indicator = {
            "running": "●",
            "stopping": "○",
            "stopped": "◌",
            "crashed": "✗",
        }.get(inst.status, "?")

        alive_str = "alive" if inst.is_alive() else "dead"
        stale_str = "stale" if inst.is_stale() else "fresh"

        plan_name = Path(inst.plan_path).stem if inst.plan_path else "unknown"
        worktree_str = f" [{Path(inst.worktree_path).name}]" if inst.worktree_path else ""

        print(f"  {status_indicator} {inst.id}")
        print(f"      Plan: {plan_name}{worktree_str}")
        print(f"      PID: {inst.pid} ({alive_str}), heartbeat: {stale_str}")
        print(f"      Started: {inst.started_at}")
        print()

    return 0


def cmd_stop(instance_id: str, force: bool = False):
    """Stop a specific orchestrator instance."""
    registry = OrchestratorRegistry()
    instance = registry.get_instance(instance_id)

    if not instance:
        print(f"Instance not found: {instance_id}")
        return 1

    if not instance.socket_path:
        print(f"Instance has no IPC socket: {instance_id}")
        return 1

    try:
        client = IPCClient(instance.socket_path)
        if client.is_available():
            print(f"Sending shutdown to {instance_id}...")
            response = client.request_shutdown(force=force)
            if response:
                print(f"Shutdown acknowledged: {instance_id}")
                return 0
            else:
                print(f"Shutdown not acknowledged: {instance_id}")
                return 1
        else:
            print(f"Instance not responding, removing from registry: {instance_id}")
            registry.unregister(instance_id)
            return 0
    except IPCError as e:
        print(f"IPC error: {e}")
        return 1


def cmd_shutdown_all(force: bool = False, timeout: float = 30.0):
    """Shutdown all running orchestrator instances."""
    registry = OrchestratorRegistry()
    registry.cleanup_stale()

    instances = registry.get_running()
    if not instances:
        print("No running orchestrators")
        return 0

    print(f"Shutting down {len(instances)} orchestrator(s)...")

    for inst in instances:
        if inst.socket_path:
            try:
                client = IPCClient(inst.socket_path)
                if client.is_available():
                    print(f"  Sending shutdown to {inst.id}...")
                    client.request_shutdown(force=force)
            except IPCError:
                pass

    # Wait for graceful shutdown
    print(f"Waiting up to {timeout}s for graceful shutdown...")
    start = time.time()
    while time.time() - start < timeout:
        registry.cleanup_stale()
        if not registry.get_running():
            print("All orchestrators stopped")
            return 0
        time.sleep(1)

    # Force kill remaining
    remaining = registry.get_running()
    if remaining:
        print(f"Force killing {len(remaining)} remaining orchestrator(s)...")
        for inst in remaining:
            try:
                os.kill(inst.pid, signal.SIGKILL)
            except (OSError, ProcessLookupError):
                pass
            registry.unregister(inst.id)

    print("All orchestrators stopped")
    return 0


def cmd_status(instance_id: str):
    """Get status of a specific orchestrator instance."""
    registry = OrchestratorRegistry()
    instance = registry.get_instance(instance_id)

    if not instance:
        print(f"Instance not found: {instance_id}")
        return 1

    if not instance.socket_path:
        print(f"Instance has no IPC socket: {instance_id}")
        return 1

    try:
        client = IPCClient(instance.socket_path)
        if not client.is_available():
            print(f"Instance not responding: {instance_id}")
            return 1

        status = client.get_status()
        print(json.dumps(status, indent=2))
        return 0
    except IPCError as e:
        print(f"IPC error: {e}")
        return 1


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
        "--worktree",
        type=str,
        help="Path to worktree directory for parallel execution (auto-detects if not specified)",
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
    parser.add_argument(
        "--no-auto-complete",
        action="store_true",
        help="Disable auto-complete (don't merge to main when plan finishes)",
    )

    # Phase 5: Multi-orchestrator management commands
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run in daemon mode (background)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all registered orchestrator instances",
    )
    parser.add_argument(
        "--stop",
        type=str,
        metavar="INSTANCE_ID",
        help="Stop a specific orchestrator instance",
    )
    parser.add_argument(
        "--shutdown-all",
        action="store_true",
        help="Shutdown all running orchestrator instances",
    )
    parser.add_argument(
        "--status",
        type=str,
        metavar="INSTANCE_ID",
        help="Get status of a specific orchestrator instance",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force shutdown (used with --stop or --shutdown-all)",
    )

    args = parser.parse_args()

    # Handle management commands first
    if args.list:
        return cmd_list()

    if args.stop:
        return cmd_stop(args.stop, force=args.force)

    if args.shutdown_all:
        return cmd_shutdown_all(force=args.force)

    if args.status:
        return cmd_status(args.status)

    # Daemon mode: fork to background
    if args.daemon:
        # Change to working directory before daemonizing
        working_dir = Path.cwd()
        daemonize()
        os.chdir(working_dir)

    # Confirmation prompt unless --continue or --daemon
    if not args.continue_run and not args.dry_run and not args.daemon:
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

    # Daemon mode implies no TUI
    use_tui = not args.no_tui and not args.daemon

    orchestrator = PlanOrchestrator(
        plan_path=args.plan,
        worktree_path=args.worktree,
        max_iterations=args.max_iterations,
        timeout=args.timeout,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        verbose=args.verbose,
        use_tui=use_tui,
        auto_complete=not args.no_auto_complete,
    )

    try:
        result = orchestrator.run()
        if orchestrator.log_file:
            print(f"\nLogs written to: {orchestrator.log_file}")
        return result
    except KeyboardInterrupt:
        orchestrator._cleanup()
        print("\n\nInterrupted by user. Progress has been saved.")
        if orchestrator.log_file:
            print(f"Logs written to: {orchestrator.log_file}")
        status = orchestrator.get_status()
        if status:
            orchestrator.print_completion(status, "interrupted")
        return 130


if __name__ == "__main__":
    sys.exit(main())
