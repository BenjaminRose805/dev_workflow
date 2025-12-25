#!/usr/bin/env python3
"""
Tests for constraint handling in plan_orchestrator.py

Tests:
- 4.5: _filter_sequential_tasks() filters tasks to batch only one from each sequential group
- 4.6: _build_constraints_section() generates "Sequential Constraints" section in prompt
- 4.7: Logger shows "Task X held back (sequential with Y)" when filtering

Run: python scripts/tests/test-orchestrator-constraints.py
"""

import sys
import os
import json
import logging
from io import StringIO
from pathlib import Path

# Ensure project root is in path for imports
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
sys.path.insert(0, str(project_root))

# Track test results
passed = 0
failed = 0
failures = []

def log(msg):
    print(msg)

def log_test(name, success, error=None):
    global passed, failed, failures
    if success:
        passed += 1
        log(f"  ✓ {name}")
    else:
        failed += 1
        error_msg = error or "Failed"
        failures.append({"name": name, "error": error_msg})
        log(f"  ✗ {name}: {error_msg}")


def test_filter_sequential_tasks():
    """Test 4.5: _filter_sequential_tasks() only batches one task per sequential group."""
    log("\n=== Testing: _filter_sequential_tasks() [Task 4.5] ===")

    from scripts.plan_orchestrator import PlanOrchestrator

    # Create orchestrator instance (dry_run mode, no TUI)
    orchestrator = PlanOrchestrator(
        plan_path="docs/plans/test.md",
        dry_run=True,
        use_tui=False,
        verbose=False
    )

    log("\n--- No Constraints ---")

    # Test: Tasks without constraints should all pass through
    tasks = [
        {"id": "1.1", "description": "Task 1"},
        {"id": "1.2", "description": "Task 2"},
        {"id": "1.3", "description": "Task 3"},
    ]
    result = orchestrator._filter_sequential_tasks(tasks)
    log_test("all tasks pass when no constraints",
        len(result) == 3,
        f"Expected 3, got {len(result)}")

    log("\n--- Single Sequential Group ---")

    # Test: Tasks in same sequential group - only first should be included
    tasks = [
        {"id": "2.1", "description": "First in group", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.2", "description": "Second in group", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.3", "description": "Third in group", "sequential": True, "sequentialGroup": "2.1-2.3"},
    ]
    result = orchestrator._filter_sequential_tasks(tasks)
    log_test("only first task from sequential group is included",
        len(result) == 1,
        f"Expected 1, got {len(result)}")
    log_test("included task is the first one (2.1)",
        result[0]["id"] == "2.1",
        f"Got: {result[0]['id']}")

    log("\n--- Mixed Sequential and Parallel ---")

    # Test: Mix of sequential and parallel tasks
    tasks = [
        {"id": "1.1", "description": "Parallel task"},  # No constraint
        {"id": "2.1", "description": "First sequential", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.2", "description": "Second sequential", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "3.1", "description": "Another parallel"},  # No constraint
    ]
    result = orchestrator._filter_sequential_tasks(tasks)
    log_test("parallel tasks pass through",
        len(result) == 3,
        f"Expected 3, got {len(result)}")

    included_ids = [t["id"] for t in result]
    log_test("result includes 1.1 (parallel)",
        "1.1" in included_ids,
        f"Got: {included_ids}")
    log_test("result includes 2.1 (first of sequential)",
        "2.1" in included_ids,
        f"Got: {included_ids}")
    log_test("result excludes 2.2 (held back)",
        "2.2" not in included_ids,
        f"Got: {included_ids}")
    log_test("result includes 3.1 (parallel)",
        "3.1" in included_ids,
        f"Got: {included_ids}")

    log("\n--- Multiple Sequential Groups ---")

    # Test: Multiple sequential groups - one from each
    tasks = [
        {"id": "2.1", "description": "Group A first", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.2", "description": "Group A second", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "3.1", "description": "Group B first", "sequential": True, "sequentialGroup": "3.1-3.4"},
        {"id": "3.2", "description": "Group B second", "sequential": True, "sequentialGroup": "3.1-3.4"},
    ]
    result = orchestrator._filter_sequential_tasks(tasks)
    log_test("one task from each sequential group",
        len(result) == 2,
        f"Expected 2, got {len(result)}")

    included_ids = [t["id"] for t in result]
    log_test("includes first from group A (2.1)",
        "2.1" in included_ids,
        f"Got: {included_ids}")
    log_test("includes first from group B (3.1)",
        "3.1" in included_ids,
        f"Got: {included_ids}")

    log("\n--- Empty Input ---")

    result = orchestrator._filter_sequential_tasks([])
    log_test("empty input returns empty list",
        result == [],
        f"Got: {result}")


def test_build_constraints_section():
    """Test 4.6: _build_constraints_section() generates prompt section when constraints exist."""
    log("\n=== Testing: _build_constraints_section() [Task 4.6] ===")

    from scripts.plan_orchestrator import PlanOrchestrator

    orchestrator = PlanOrchestrator(
        plan_path="docs/plans/test.md",
        dry_run=True,
        use_tui=False
    )

    log("\n--- No Constraints ---")

    # Test: No sequential tasks
    tasks = [
        {"id": "1.1", "description": "Task 1"},
        {"id": "1.2", "description": "Task 2"},
    ]
    result = orchestrator._build_constraints_section(tasks)
    log_test("returns empty string when no constraints",
        result == "",
        f"Got: '{result}'")

    log("\n--- Single Constraint ---")

    # Test: Tasks with sequential constraint
    tasks = [
        {"id": "2.1", "description": "First", "sequential": True,
         "sequentialGroup": "2.1-2.3", "sequentialReason": "all modify same file"},
    ]
    result = orchestrator._build_constraints_section(tasks)
    log_test("returns non-empty string when constraints exist",
        len(result) > 0,
        f"Got empty string")
    log_test("includes 'Sequential Constraints' header",
        "Sequential Constraints" in result,
        f"Got: {result}")
    log_test("includes task range",
        "2.1-2.3" in result,
        f"Got: {result}")
    log_test("includes [SEQUENTIAL] marker",
        "[SEQUENTIAL]" in result,
        f"Got: {result}")
    log_test("includes reason",
        "all modify same file" in result,
        f"Got: {result}")

    log("\n--- Multiple Constraints ---")

    # Test: Multiple sequential groups
    tasks = [
        {"id": "2.1", "sequential": True, "sequentialGroup": "2.1-2.3", "sequentialReason": "config changes"},
        {"id": "3.1", "sequential": True, "sequentialGroup": "3.1-3.2", "sequentialReason": "file dependency"},
    ]
    result = orchestrator._build_constraints_section(tasks)
    log_test("includes both constraint groups",
        "2.1-2.3" in result and "3.1-3.2" in result,
        f"Got: {result}")

    log("\n--- Constraint Without Reason ---")

    # Test: Constraint with empty reason
    tasks = [
        {"id": "2.1", "sequential": True, "sequentialGroup": "2.1-2.3", "sequentialReason": ""},
    ]
    result = orchestrator._build_constraints_section(tasks)
    log_test("handles empty reason gracefully",
        "2.1-2.3" in result,
        f"Got: {result}")

    log("\n--- Mixed Tasks (Some Without Constraints) ---")

    # Test: Mix of constrained and unconstrained
    tasks = [
        {"id": "1.1", "description": "No constraint"},
        {"id": "2.1", "sequential": True, "sequentialGroup": "2.1-2.3", "sequentialReason": "test"},
        {"id": "1.2", "description": "No constraint"},
    ]
    result = orchestrator._build_constraints_section(tasks)
    log_test("only includes tasks with constraints",
        "2.1-2.3" in result,
        f"Got: {result}")


def test_held_back_logging():
    """Test 4.7: Logger shows 'Task X held back (sequential with Y)' when filtering."""
    log("\n=== Testing: Held-Back Logging [Task 4.7] ===")

    from scripts.plan_orchestrator import PlanOrchestrator

    # Create orchestrator with verbose logging
    orchestrator = PlanOrchestrator(
        plan_path="docs/plans/test.md",
        dry_run=True,
        use_tui=False,
        verbose=True
    )

    # Capture log output
    log_capture = StringIO()
    handler = logging.StreamHandler(log_capture)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter("%(message)s"))
    orchestrator.logger.addHandler(handler)

    log("\n--- Held-Back Message Format ---")

    # Tasks where one will be held back
    tasks = [
        {"id": "2.1", "description": "First", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.2", "description": "Second", "sequential": True, "sequentialGroup": "2.1-2.3"},
    ]

    orchestrator._filter_sequential_tasks(tasks)

    log_output = log_capture.getvalue()

    log_test("logs held-back message",
        "held back" in log_output.lower(),
        f"Got: '{log_output}'")
    log_test("message includes held-back task ID (2.2)",
        "2.2" in log_output,
        f"Got: '{log_output}'")
    log_test("message includes 'sequential with' phrase",
        "sequential with" in log_output.lower(),
        f"Got: '{log_output}'")
    log_test("message includes running task ID (2.1)",
        "2.1" in log_output,
        f"Got: '{log_output}'")

    # Verify exact format: "Task 2.2 held back (sequential with 2.1)"
    expected_pattern = "Task 2.2 held back (sequential with 2.1)"
    log_test(f"message matches expected format",
        expected_pattern in log_output,
        f"Expected: '{expected_pattern}', Got: '{log_output}'")

    log("\n--- Multiple Held-Back Tasks ---")

    log_capture.truncate(0)
    log_capture.seek(0)

    tasks = [
        {"id": "2.1", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.2", "sequential": True, "sequentialGroup": "2.1-2.3"},
        {"id": "2.3", "sequential": True, "sequentialGroup": "2.1-2.3"},
    ]

    orchestrator._filter_sequential_tasks(tasks)

    log_output = log_capture.getvalue()
    lines = [l for l in log_output.split('\n') if 'held back' in l.lower()]

    log_test("logs message for each held-back task",
        len(lines) == 2,  # 2.2 and 2.3 held back
        f"Expected 2 held-back messages, got {len(lines)}: {lines}")


def test_build_prompt_with_constraints():
    """Integration test: _build_prompt includes constraints section."""
    log("\n=== Testing: _build_prompt() Integration ===")

    from scripts.plan_orchestrator import PlanOrchestrator, PlanStatus

    orchestrator = PlanOrchestrator(
        plan_path="docs/plans/test.md",
        dry_run=True,
        use_tui=False
    )

    # Create a mock status
    status = PlanStatus({
        "planPath": "docs/plans/implement-orchestration-constraints.md",
        "planName": "Test Plan",
        "total": 10,
        "completed": 5,
        "pending": 5,
        "percentage": 50,
        "currentPhase": "Phase 2",
    })

    log("\n--- Prompt With Constraints ---")

    tasks = [
        {"id": "2.1", "description": "First task", "sequential": True,
         "sequentialGroup": "2.1-2.3", "sequentialReason": "all modify same file"},
    ]

    prompt = orchestrator._build_prompt(status, tasks)

    log_test("prompt includes Sequential Constraints section",
        "Sequential Constraints" in prompt,
        f"Section not found in prompt")
    log_test("prompt includes task range",
        "2.1-2.3" in prompt,
        f"Task range not found in prompt")
    log_test("prompt includes constraint reason",
        "all modify same file" in prompt,
        f"Reason not found in prompt")

    log("\n--- Prompt Without Constraints ---")

    tasks = [
        {"id": "1.1", "description": "Parallel task"},
        {"id": "1.2", "description": "Another parallel"},
    ]

    prompt = orchestrator._build_prompt(status, tasks)

    log_test("prompt does not include Sequential Constraints when no constraints",
        "Sequential Constraints" not in prompt,
        f"Section found in prompt when it shouldn't be")


def main():
    log("========================================")
    log("  Orchestrator Constraint Tests")
    log("========================================")

    test_filter_sequential_tasks()
    test_build_constraints_section()
    test_held_back_logging()
    test_build_prompt_with_constraints()

    log("\n========================================")
    log("  Test Results")
    log("========================================")
    log(f"  Passed: {passed}")
    log(f"  Failed: {failed}")
    log(f"  Total:  {passed + failed}")

    if failures:
        log("\n  Failures:")
        for f in failures:
            log(f"    - {f['name']}: {f['error']}")

    log("========================================\n")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
