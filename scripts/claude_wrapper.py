#!/usr/bin/env python3
"""Wrapper for sending commands to Claude using subprocess."""

import subprocess
import sys
import os

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.live import Live
    from rich.panel import Panel
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


def run_claude(
    prompt: str,
    print_output: bool = True,
    timeout: int = 300,
    permission_mode: str = "acceptEdits",
    stream: bool = True
) -> dict:
    """
    Run a command/prompt through Claude and return the result.

    Args:
        prompt: The command or prompt to send (e.g., "/plan:create foo")
        print_output: Whether to print output in real-time
        timeout: Timeout in seconds
        permission_mode: Permission mode (acceptEdits, bypassPermissions, default)
        stream: Use streaming JSON output for real-time display

    Returns:
        dict with 'success', 'output', and 'error' keys
    """
    if stream and print_output:
        # Use stream-json for real-time output
        cmd = [
            "claude",
            "-p",
            "--verbose",
            "--permission-mode", permission_mode,
            "--output-format", "stream-json",
            prompt
        ]
    else:
        cmd = [
            "claude",
            "-p",
            "--permission-mode", permission_mode,
            prompt
        ]

    try:
        import json

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

        output_parts = []

        if stream and print_output:
            # Parse streaming JSON and print content in real-time
            if RICH_AVAILABLE:
                console = Console()
                accumulated_text = ""

                for line in process.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        text = ""

                        if data.get('type') == 'assistant':
                            content = data.get('message', {}).get('content', [])
                            for block in content:
                                if block.get('type') == 'text':
                                    text = block.get('text', '')
                        elif data.get('type') == 'content_block_delta':
                            delta = data.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                text = delta.get('text', '')

                        if text:
                            accumulated_text += text
                            output_parts.append(text)

                            # Print when we hit a natural break (newlines)
                            if '\n' in text:
                                # Render as markdown
                                console.print(Markdown(accumulated_text))
                                accumulated_text = ""

                    except json.JSONDecodeError:
                        console.print(line)
                        output_parts.append(line)

                # Print any remaining text
                if accumulated_text.strip():
                    console.print(Markdown(accumulated_text))
            else:
                # Fallback without rich
                for line in process.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        if data.get('type') == 'assistant':
                            content = data.get('message', {}).get('content', [])
                            for block in content:
                                if block.get('type') == 'text':
                                    text = block.get('text', '')
                                    print(text, end='', flush=True)
                                    output_parts.append(text)
                        elif data.get('type') == 'content_block_delta':
                            delta = data.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                text = delta.get('text', '')
                                print(text, end='', flush=True)
                                output_parts.append(text)
                    except json.JSONDecodeError:
                        print(line, flush=True)
                        output_parts.append(line)
                print()
        elif print_output:
            # Non-streaming output
            for line in process.stdout:
                print(line, end='', flush=True)
                output_parts.append(line)
        else:
            # Silent capture
            stdout, stderr = process.communicate(timeout=timeout)
            output_parts.append(stdout)

        process.wait(timeout=timeout)
        output = ''.join(output_parts)

        return {
            'success': process.returncode == 0,
            'output': output,
            'returncode': process.returncode,
            'error': None
        }

    except subprocess.TimeoutExpired:
        process.kill()
        return {
            'success': False,
            'output': None,
            'returncode': -1,
            'error': f'Timeout after {timeout}s'
        }
    except Exception as e:
        return {
            'success': False,
            'output': None,
            'returncode': -1,
            'error': str(e)
        }


def run_commands(commands: list, print_output: bool = True, timeout: int = 300) -> dict:
    """
    Run multiple commands sequentially.

    Args:
        commands: List of commands to run
        print_output: Whether to print output
        timeout: Timeout per command in seconds

    Returns:
        dict with results
    """
    results = {
        'success': [],
        'failed': [],
        'outputs': {}
    }

    for cmd in commands:
        print(f"\n{'='*60}")
        print(f"Running: {cmd}")
        print('='*60 + "\n")

        result = run_claude(cmd, print_output=print_output, timeout=timeout)

        if result['success']:
            results['success'].append(cmd)
        else:
            results['failed'].append(cmd)

        results['outputs'][cmd] = result

    return results


def main():
    """CLI interface."""
    if len(sys.argv) < 2:
        print("Usage: python claude_wrapper.py <command>")
        print("       python claude_wrapper.py '/plan:create foo'")
        print("       python claude_wrapper.py '/plan:templates'")
        print("")
        print("For multiple commands, separate with ';':")
        print("       python claude_wrapper.py '/plan:templates; /plan:status'")
        print("")
        print("Environment variables:")
        print("  CLAUDE_TIMEOUT=300       Timeout in seconds")
        print("  CLAUDE_PERMISSION=acceptEdits  Permission mode")
        print("  CLAUDE_QUIET=1           Suppress real-time output")
        sys.exit(1)

    # Join args and split on semicolon for multiple commands
    input_str = ' '.join(sys.argv[1:])
    commands = [cmd.strip() for cmd in input_str.split(';') if cmd.strip()]

    timeout = int(os.environ.get('CLAUDE_TIMEOUT', 300))
    quiet = os.environ.get('CLAUDE_QUIET', '').lower() in ('1', 'true', 'yes')

    print(f"Commands to run: {len(commands)}")
    for i, cmd in enumerate(commands, 1):
        print(f"  {i}. {cmd}")
    print()

    results = run_commands(commands, print_output=not quiet, timeout=timeout)

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Success: {len(results['success'])}")
    print(f"Failed:  {len(results['failed'])}")

    if results['failed']:
        print("\nFailed commands:")
        for cmd in results['failed']:
            error = results['outputs'][cmd].get('error', 'Unknown error')
            print(f"  - {cmd}: {error}")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
