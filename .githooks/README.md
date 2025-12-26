# Git Hooks for Plan Workflow

This directory contains git hooks that support the plan-based workflow.

## Installation

To enable these hooks, configure git to use this directory:

```bash
git config core.hooksPath .githooks
```

This command sets the hooks path for the current repository only. To verify:

```bash
git config --get core.hooksPath
# Should output: .githooks
```

## Available Hooks

### pre-commit

Provides safety warnings for the plan workflow:

1. **Main/Master Warning**: When committing directly to `main` or `master`, displays a warning suggesting the plan workflow instead
2. **Plan Branch Detection**: Confirms when on a `plan/*` branch
3. **Non-Plan Branch Info**: Informs when on a branch that doesn't follow the plan pattern

## Bypass

To bypass hook checks when needed:

```bash
git commit --no-verify -m "message"
```

Common bypass scenarios:
- Quick hotfix to main (with caution)
- Emergency commits
- Commits that are intentionally outside the plan workflow

## Uninstalling

To restore default git hooks behavior:

```bash
git config --unset core.hooksPath
```

## Adding Custom Hooks

You can extend the pre-commit hook or add other hooks (commit-msg, pre-push, etc.) following the same pattern:

1. Create the hook file in `.githooks/`
2. Make it executable: `chmod +x .githooks/<hook-name>`
3. Test the hook before committing

## Troubleshooting

**Hook not running:**
- Verify: `git config --get core.hooksPath` returns `.githooks`
- Check permissions: `ls -la .githooks/pre-commit`
- Ensure executable: `chmod +x .githooks/pre-commit`

**Hook blocking commits:**
- Use `--no-verify` to bypass temporarily
- Review hook output for specific warnings
