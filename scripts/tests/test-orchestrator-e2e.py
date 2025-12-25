#!/usr/bin/env python3
"""
End-to-End Test: Python Orchestrator

Tests the orchestrator with a minimal plan to verify:
- Plan loading
- Status tracking
- Task selection
- Completion detection

Run: python3 scripts/tests/test-orchestrator-e2e.py
"""

import os
import sys
import json
import subprocess
import tempfile
import shutil
from pathlib import Path

# Test configuration
PROJECT_ROOT = Path.cwd()
CLAUDE_DIR = PROJECT_ROOT / ".claude"

# Store original values
original_plan_path = ""
# Note: current-plan-output.txt is no longer used - output path is derived from plan name


def log(msg):
    print(msg)


def run_cmd(cmd, check=True, capture=True):
    """Run a command and return output."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=capture,
            text=True,
            timeout=30
        )
        if check and result.returncode != 0:
            return None
        return result.stdout.strip() if capture else ""
    except Exception as e:
        log(f"Command failed: {e}")
        return None


def setup_test_environment():
    """Set up a minimal test plan for orchestrator testing."""
    global original_plan_path

    # Save original values
    plan_path_file = CLAUDE_DIR / "current-plan.txt"
    # Note: current-plan-output.txt is no longer used - output path is derived from plan name

    try:
        original_plan_path = plan_path_file.read_text().strip()
    except:
        original_plan_path = ""

    # Create test plan directory
    test_plan_dir = PROJECT_ROOT / "docs" / "plans"
    test_output_dir = PROJECT_ROOT / "docs" / "plan-outputs" / "test-e2e"
    test_plan_dir.mkdir(parents=True, exist_ok=True)
    test_output_dir.mkdir(parents=True, exist_ok=True)
    (test_output_dir / "findings").mkdir(exist_ok=True)

    # Create minimal test plan
    test_plan = test_plan_dir / "test-e2e.md"
    test_plan.write_text("""# E2E Test Plan

## Phase 1: Test Tasks

**Tasks:**
- [ ] 1.1 First simple task
- [ ] 1.2 Second simple task
- [ ] 1.3 Third simple task

**VERIFY Phase 1:**
- [ ] All tasks complete
""")

    # Create status.json
    status = {
        "_comment": "E2E test status",
        "planPath": "docs/plans/test-e2e.md",
        "planName": "E2E Test Plan",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastUpdatedAt": "2024-01-01T00:00:00.000Z",
        "currentPhase": "Phase 1: Test Tasks",
        "tasks": [
            {"id": "1.1", "phase": "Phase 1: Test Tasks", "description": "First simple task", "status": "pending"},
            {"id": "1.2", "phase": "Phase 1: Test Tasks", "description": "Second simple task", "status": "pending"},
            {"id": "1.3", "phase": "Phase 1: Test Tasks", "description": "Third simple task", "status": "pending"},
        ],
        "runs": [],
        "summary": {
            "totalTasks": 3,
            "completed": 0,
            "pending": 3,
            "in_progress": 0,
            "failed": 0,
            "skipped": 0
        }
    }
    (test_output_dir / "status.json").write_text(json.dumps(status, indent=2))

    # Set current plan pointer (output path is derived from plan name)
    plan_path_file.write_text("docs/plans/test-e2e.md")

    log("Created test plan with 3 tasks")
    return test_plan, test_output_dir


def cleanup_test_environment():
    """Restore original state."""
    global original_plan_path

    # Restore original values
    if original_plan_path:
        (CLAUDE_DIR / "current-plan.txt").write_text(original_plan_path)
    # Note: current-plan-output.txt is no longer used - output path is derived from plan name

    # Clean up test files
    try:
        (PROJECT_ROOT / "docs" / "plans" / "test-e2e.md").unlink()
    except:
        pass
    try:
        shutil.rmtree(PROJECT_ROOT / "docs" / "plan-outputs" / "test-e2e")
    except:
        pass


def test_plan_loading():
    """Test that orchestrator can load the plan."""
    log("\n=== Test: Plan Loading ===")

    # Use plan-orchestrator.js to check status
    output = run_cmd("node scripts/plan-orchestrator.js status")
    if not output:
        log("  ✗ Failed to get plan status")
        return False

    try:
        data = json.loads(output)
        if data.get("total") == 3:
            log("  ✓ Plan loaded correctly (3 tasks)")
            return True
        else:
            log(f"  ✗ Wrong task count: {data.get('total')}")
            return False
    except json.JSONDecodeError:
        log("  ✗ Invalid JSON from status command")
        return False


def test_task_selection():
    """Test that orchestrator can select next tasks."""
    log("\n=== Test: Task Selection ===")

    output = run_cmd("node scripts/plan-orchestrator.js next 5")
    if not output:
        log("  ✗ Failed to get next tasks")
        return False

    try:
        data = json.loads(output)
        count = len(data.get("tasks", []))
        if count > 0:
            log(f"  ✓ Selected {count} tasks for execution")
            return True
        else:
            log("  ✗ No tasks selected")
            return False
    except json.JSONDecodeError:
        log("  ✗ Invalid JSON from next command")
        return False


def test_status_updates():
    """Test that status updates work correctly."""
    log("\n=== Test: Status Updates ===")

    # Mark task 1.1 as started
    output = run_cmd("node scripts/status-cli.js mark-started 1.1")
    if not output:
        log("  ✗ Failed to mark task started")
        return False

    try:
        data = json.loads(output)
        if data.get("success") and data.get("status") == "in_progress":
            log("  ✓ Task 1.1 marked as in_progress")
        else:
            log("  ✗ Failed to mark task started")
            return False
    except:
        log("  ✗ Invalid response from mark-started")
        return False

    # Mark task 1.1 as complete
    output = run_cmd('node scripts/status-cli.js mark-complete 1.1 --notes "E2E test completion"')
    if not output:
        log("  ✗ Failed to mark task complete")
        return False

    try:
        data = json.loads(output)
        if data.get("success") and data.get("status") == "completed":
            log("  ✓ Task 1.1 marked as completed")
        else:
            log("  ✗ Failed to mark task complete")
            return False
    except:
        log("  ✗ Invalid response from mark-complete")
        return False

    return True


def test_progress_tracking():
    """Test that progress is tracked correctly."""
    log("\n=== Test: Progress Tracking ===")

    # Check progress after completing one task
    output = run_cmd("node scripts/status-cli.js status")
    if not output:
        log("  ✗ Failed to get status")
        return False

    try:
        data = json.loads(output)
        summary = data.get("summary", {})
        if summary.get("completed") == 1 and summary.get("pending") == 2:
            log("  ✓ Progress tracked correctly (1 completed, 2 pending)")
            return True
        else:
            log(f"  ✗ Incorrect progress: completed={summary.get('completed')}, pending={summary.get('pending')}")
            return False
    except:
        log("  ✗ Invalid response from status")
        return False


def test_completion_detection():
    """Test that completion is detected."""
    log("\n=== Test: Completion Detection ===")

    # Complete remaining tasks
    for task_id in ["1.2", "1.3"]:
        run_cmd(f"node scripts/status-cli.js mark-started {task_id}")
        run_cmd(f'node scripts/status-cli.js mark-complete {task_id} --notes "E2E test"')

    # Check if plan is complete
    output = run_cmd("node scripts/plan-orchestrator.js status")
    if not output:
        log("  ✗ Failed to get final status")
        return False

    try:
        data = json.loads(output)
        if data.get("completed") == 3 and data.get("pending") == 0:
            log("  ✓ Plan completion detected (3/3 tasks)")
            return True
        else:
            log(f"  ✗ Plan not complete: {data.get('completed')}/{data.get('total')}")
            return False
    except:
        log("  ✗ Invalid response from status")
        return False


def test_orchestrator_dry_run():
    """Test orchestrator in dry-run mode."""
    log("\n=== Test: Orchestrator Dry Run ===")

    # Reset tasks to pending for this test
    status_path = PROJECT_ROOT / "docs" / "plan-outputs" / "test-e2e" / "status.json"
    status = json.loads(status_path.read_text())
    for task in status["tasks"]:
        task["status"] = "pending"
    status["summary"] = {
        "totalTasks": 3,
        "completed": 0,
        "pending": 3,
        "in_progress": 0,
        "failed": 0,
        "skipped": 0
    }
    status_path.write_text(json.dumps(status, indent=2))

    # Run orchestrator in dry-run mode with max 1 iteration and no TUI
    result = subprocess.run(
        ["python3", "scripts/plan_orchestrator.py", "--dry-run", "--max-iterations", "1", "--no-tui", "-v"],
        capture_output=True,
        text=True,
        timeout=30,
        cwd=PROJECT_ROOT
    )

    output = result.stdout + result.stderr

    # Check for expected output patterns
    if result.returncode == 0 or "DRY RUN" in output or "Progress" in output or "complete" in output.lower():
        log("  ✓ Orchestrator dry-run completed")
        if "DRY RUN" in output:
            log("  ✓ Dry-run mode detected")
        return True
    else:
        log(f"  ✗ Orchestrator failed with code {result.returncode}")
        if result.stderr:
            log(f"    stderr: {result.stderr[:200]}")
        return False


def main():
    log("========================================")
    log("  Python Orchestrator E2E Test")
    log("========================================")

    passed = 0
    failed = 0
    tests = [
        ("Plan Loading", test_plan_loading),
        ("Task Selection", test_task_selection),
        ("Status Updates", test_status_updates),
        ("Progress Tracking", test_progress_tracking),
        ("Completion Detection", test_completion_detection),
        ("Orchestrator Dry Run", test_orchestrator_dry_run),
    ]

    try:
        log("\nSetting up test environment...")
        setup_test_environment()

        for name, test_fn in tests:
            try:
                if test_fn():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                log(f"\n=== Test: {name} ===")
                log(f"  ✗ Exception: {e}")
                failed += 1

        log("\n========================================")
        log(f"  Results: {passed} passed, {failed} failed")
        log("========================================")

        return 0 if failed == 0 else 1

    finally:
        log("\nCleaning up test environment...")
        cleanup_test_environment()


if __name__ == "__main__":
    sys.exit(main())
