#!/usr/bin/env python3
"""Test the Claude wrapper."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from claude_wrapper import run_claude, run_commands


def test_simple_command():
    """Test sending a simple command."""
    print("Test 1: Simple command (/plan:templates)")
    print("-" * 40)

    result = run_claude('/plan:templates', print_output=True, timeout=120)

    if result['success']:
        print("\n[OK] Command completed")
        return True
    else:
        print(f"\n[FAIL] {result.get('error', 'Unknown error')}")
        return False


def test_multiple_commands():
    """Test sending multiple commands."""
    print("\nTest 2: Multiple commands")
    print("-" * 40)

    commands = ['/plan:templates', '/plan:status']
    results = run_commands(commands, print_output=True, timeout=120)

    passed = len(results['failed']) == 0
    if passed:
        print("\n[OK] All commands completed")
    else:
        print(f"\n[FAIL] {len(results['failed'])} commands failed")

    return passed


def test_quiet_mode():
    """Test quiet mode (no output)."""
    print("\nTest 3: Quiet mode")
    print("-" * 40)

    result = run_claude('/plan:templates', print_output=False, timeout=120)

    if result['success'] and result['output']:
        print(f"[OK] Got {len(result['output'])} chars of output silently")
        return True
    else:
        print(f"[FAIL] {result.get('error', 'No output')}")
        return False


def main():
    print("=" * 60)
    print("Claude Wrapper Tests")
    print("=" * 60)

    tests = [
        ("Simple Command", test_simple_command),
        ("Multiple Commands", test_multiple_commands),
        ("Quiet Mode", test_quiet_mode),
    ]

    results = []
    for name, test_fn in tests:
        print(f"\n{'#'*60}")
        try:
            passed = test_fn()
            results.append((name, passed))
        except KeyboardInterrupt:
            print("\n[INTERRUPTED]")
            break
        except Exception as e:
            print(f"\n[ERROR] {e}")
            results.append((name, False))

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    passed = sum(1 for _, p in results if p)
    total = len(results)

    for name, p in results:
        status = "PASS" if p else "FAIL"
        print(f"  {status}: {name}")

    print(f"\n{passed}/{total} tests passed")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
