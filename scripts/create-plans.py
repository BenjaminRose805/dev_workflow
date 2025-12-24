#!/usr/bin/env python3
"""Create implementation plans by section."""

import sys
import os

# Add scripts directory to path for import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from claude_wrapper import run_claude

SECTIONS = {
    "p0": {
        "name": "P0 - MVP (Foundation)",
        "plans": [
            "implement-artifact-registry",
            "implement-workflow-branching",
            "implement-explore-command",
            "implement-clarify-command",
            "implement-test-command",
            "implement-validate-command",
        ]
    },
    "p1": {
        "name": "P1 - High Value",
        "plans": [
            "implement-fix-command",
            "implement-refactor-command",
            "implement-analyze-command",
            "implement-review-command",
            "implement-debug-command",
            "implement-workflow-loops",
            "implement-error-recovery-hooks",
        ]
    },
    "p2-design": {
        "name": "P2 - Design Commands",
        "plans": [
            "implement-architect-command",
            "implement-design-command",
            "implement-spec-command", 
            "implement-research-command",
            "implement-brainstorm-command",
            "implement-model-command",
        ]
    },
    "p2-docs": {
        "name": "P2 - Documentation Commands",
        "plans": [
            "implement-document-command",
            "implement-explain-command",
            "implement-audit-command",
        ]
    },
    "p2-infra": {
        "name": "P2 - Infrastructure",
        "plans": [
            "implement-workflow-composition",
            "implement-fan-in-fan-out",
        ]
    },
    "p3": {
        "name": "P3 - Operations Commands",
        "plans": [
            "implement-deploy-command",
            "implement-migrate-command",
            "implement-release-command",
            "implement-workflow-command",
            "implement-template-command",
        ]
    },
    "agents": {
        "name": "Agents",
        "plans": [
            "implement-explore-agent",
            "implement-analyze-agent",
            "implement-review-agent",
            "implement-debug-agent",
            "implement-deploy-agent",
        ]
    },
    "hooks": {
        "name": "Hooks",
        "plans": [
            "implement-context-loading-hook",
            "implement-artifact-storage-hook",
            "implement-notification-hooks",
        ]
    },
    "final": {
        "name": "Final",
        "plans": [
            "implement-implement-command",
        ]
    },
}


def run_plan(plan_name: str, timeout: int = 300) -> bool:
    """Run /plan:create for a single plan."""
    print(f"\n{'='*60}")
    print(f"Creating: {plan_name}")
    print('='*60 + "\n")

    command = f'/plan:create {plan_name}'
    result = run_claude(command, print_output=True, timeout=timeout)
    return result['success']


def run_section(section_key: str, timeout: int = 300) -> None:
    """Run all plans in a section."""
    section = SECTIONS[section_key]
    print(f"\n{'#'*60}")
    print(f"# {section['name']}")
    print('#'*60)

    completed = 0
    failed = []

    for plan in section["plans"]:
        success = run_plan(plan, timeout=timeout)
        if success:
            completed += 1
        else:
            failed.append(plan)
            response = input(f"\n  Failed: {plan}. Continue? [Y/n] ").strip().lower()
            if response == 'n':
                break

    print(f"\n{'='*60}")
    print(f"Section complete: {completed}/{len(section['plans'])} succeeded")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    print('='*60)


def list_sections() -> None:
    """List all available sections."""
    print("\nAvailable sections:\n")
    total = 0
    for key, section in SECTIONS.items():
        count = len(section["plans"])
        total += count
        print(f"  {key:12} - {section['name']} ({count} plans)")
    print(f"\n  all          - Run all sections ({total} plans)")
    print(f"\n  list         - Show all plan names")


def list_plans() -> None:
    """List all plan names."""
    print("\nAll plans:\n")
    for key, section in SECTIONS.items():
        print(f"# {section['name']}")
        for plan in section["plans"]:
            print(f"  {plan}")
        print()


def main():
    if len(sys.argv) < 2:
        list_sections()
        print("\nUsage: python create-plans.py <section> [section2 ...]")
        print("       python create-plans.py all")
        print("       python create-plans.py all --from <section>")
        print("       python create-plans.py list")
        sys.exit(0)

    args = [a.lower() for a in sys.argv[1:]]

    if args[0] == "list":
        list_plans()
    elif args[0] == "all":
        sections_to_run = list(SECTIONS.keys())

        # Handle --from option
        if "--from" in args:
            from_idx = args.index("--from")
            if from_idx + 1 < len(args):
                start_section = args[from_idx + 1]
                if start_section in SECTIONS:
                    section_keys = list(SECTIONS.keys())
                    start_idx = section_keys.index(start_section)
                    sections_to_run = section_keys[start_idx:]
                else:
                    print(f"Unknown section: {start_section}")
                    list_sections()
                    sys.exit(1)

        for key in sections_to_run:
            run_section(key)
        print("\nDone!")
    elif all(s in SECTIONS for s in args):
        # Run multiple specific sections
        for section in args:
            run_section(section)
        print(f"\nDone!")
    elif args[0] in SECTIONS:
        run_section(args[0])
        print(f"\nDone!")
    else:
        print(f"Unknown section: {args[0]}")
        list_sections()
        sys.exit(1)


if __name__ == "__main__":
    main()
