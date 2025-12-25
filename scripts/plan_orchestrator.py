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

        # Set up logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG if verbose else logging.INFO)

        # Clear any existing handlers
        self.logger.handlers.clear()

        log_format = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

        if use_tui:
            # Log to file when TUI is active (stdout would mess up the display)
            self.log_file = "orchestrator.log"
            file_handler = logging.FileHandler(self.log_file, mode='a')
            file_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
            file_handler.setFormatter(log_format)
            self.logger.addHandler(file_handler)
        else:
            # Log to stdout when TUI is disabled
            self.log_file = None
            stream_handler = logging.StreamHandler()
            stream_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
            stream_handler.setFormatter(log_format)
            self.logger.addHandler(stream_handler)

    def get_status(self) -> Optional[PlanStatus]:
        """Get current plan status via node scripts/status-cli.js."""
        try:
            result = subprocess.run(
                ["node", STATUS_CLI_JS, "status"],
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
            self.logger.error(f"Node or status-cli.js not found")
            return None

    def get_next_tasks(self, count: int = 5) -> list:
        """Get next recommended tasks via status-cli.js."""
        try:
            result = subprocess.run(
                ["node", STATUS_CLI_JS, "next", str(count)],
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

    def _get_output_dir(self, status: Optional[PlanStatus] = None) -> Optional[str]:
        """Get the output directory for the current plan.

        Derives output path from plan name: docs/plan-outputs/{plan-name}/
        Uses status.plan_path if available, falls back to self.plan_path.
        """
        plan_path = None
        if status and status.plan_path:
            plan_path = status.plan_path
        elif self.plan_path:
            plan_path = self.plan_path

        if plan_path:
            plan_name = Path(plan_path).stem
            return f"docs/plan-outputs/{plan_name}"
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
                output_dir = self._get_output_dir(status)
                if output_dir:
                    status_path = os.path.join(output_dir, 'status.json')
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
                self.streaming_runner = StreamingClaudeRunner(
                    on_tool_start=self._on_tool_start,
                    on_tool_end=self._on_tool_end,
                    timeout=self.timeout
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

        return f"""Execute these tasks from the plan:

{task_list}

Plan: {status.plan_path}
Progress: {status.percentage}% ({status.completed}/{status.total} tasks)

Run: /plan:implement {task_ids} --autonomous

## Rules

- Execute autonomously - do NOT ask for confirmation
- Check for [SEQUENTIAL] annotations in the plan - run marked tasks one at a time
- Detect file conflicts - if multiple tasks modify the same file, run sequentially
- Stop after completing this batch or if blocked by unrecoverable error
- If a task fails, the command will mark it failed and continue to next task
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
