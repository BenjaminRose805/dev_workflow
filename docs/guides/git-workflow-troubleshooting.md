# Git Workflow Troubleshooting Guide

Quick solutions for common git workflow issues in the plan system.

---

## Branch Issues

### "Not on a plan branch" Error

**Symptom:**
```
✗ Error: Not on a plan branch (currently on 'main').
  This plan requires being on branch 'plan/my-plan'.
```

**Cause:** `enforce_branch: true` (default) requires you to be on the correct plan branch.

**Solutions:**

1. **Switch to the correct branch:**
   ```bash
   /plan:set  # Auto-switches to plan branch
   ```

2. **Disable enforcement temporarily:**
   Add to `.claude/git-workflow.json`:
   ```json
   { "enforce_branch": false }
   ```

3. **For CI/CD or special cases**, disable enforcement:
   ```json
   { "enforce_branch": false }
   ```

---

### Wrong Plan Branch Auto-Switch

**Symptom:**
```
⚠ On wrong plan branch: plan/other-plan
  Switching to: plan/my-plan
```

**Cause:** You were on a different plan's branch.

**This is normal behavior** - the system auto-corrects to the correct branch. If you want to work on the other plan instead, run:
```bash
/plan:set other-plan
```

---

### Branch Already Exists

**Symptom:** Error when trying to create a plan branch that already exists.

**Solutions:**

1. **Resume work on existing branch:**
   ```bash
   git checkout plan/my-plan
   ```

2. **Start fresh (if branch is stale):**
   ```bash
   git branch -D plan/my-plan  # Delete local
   /plan:set                    # Recreate from main
   ```

3. **Use cleanup to remove stale branches:**
   ```bash
   /plan:cleanup --delete
   ```

---

## Remote Sync Issues

### Push Failures

**Symptom:**
```
⚠ Failed to push to remote: Permission denied
  Task completed locally. Push manually with: git push
```

**This is graceful degradation** - your work is saved locally; only the push failed.

**Common causes and solutions:**

| Cause | Solution |
|-------|----------|
| No remote configured | `git remote add origin <url>` |
| SSH key issues | Check `ssh -T git@github.com` |
| Branch protection | Use PR workflow instead |
| Network unavailable | Push manually later: `git push` |

---

### GitHub CLI Not Found

**Symptom:**
```
⚠ GitHub CLI (gh) not found. Cannot create PR.
  Install: https://cli.github.com/
```

**Solutions:**

1. **Install GitHub CLI:**
   - macOS: `brew install gh`
   - Linux: See https://cli.github.com/
   - Windows: `winget install GitHub.cli`

2. **Authenticate:**
   ```bash
   gh auth login
   ```

3. **Skip PR creation** and use local merge:
   ```bash
   /plan:complete  # Without --pr flag
   ```

---

### No Remote Repository

**Symptom:**
```
Warning: No remote configured, skipping push
```

**Solutions:**

1. **Add a remote:**
   ```bash
   git remote add origin <repository-url>
   ```

2. **Disable sync_remote** (if working locally):
   ```json
   { "sync_remote": false }
   ```

---

## Merge Conflicts

### Conflict Detection

**Symptom:**
```
Conflicts detected between plan branch and main:
- src/lib/auth.ts
- src/routes/login.ts

Options:
1. Rebase onto main
2. Resolve manually
3. Abort merge
```

**Solutions:**

1. **Rebase (recommended):**
   - Brings your changes on top of latest main
   - Resolves most conflicts automatically

2. **Manual resolution:**
   - Opens each conflicting file
   - Mark resolved: `git add <file>`
   - Continue: `git rebase --continue`

3. **Skip conflict check (if confident):**
   ```bash
   /plan:complete --force
   ```

---

### Rebase Failures

**Symptom:** Rebase conflicts that can't be auto-resolved.

**Solutions:**

1. **Abort and try later:**
   ```bash
   git rebase --abort
   ```

2. **Resolve manually:**
   - Edit conflicting files
   - `git add <resolved-files>`
   - `git rebase --continue`

3. **Use merge commit instead:**
   ```bash
   /plan:complete --merge commit
   ```

---

## Configuration Issues

### Invalid Configuration File

**Symptom:**
```
⚠ Warning: Invalid .claude/git-workflow.json, using defaults
```

**Solutions:**

1. **Validate JSON syntax:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('.claude/git-workflow.json'))"
   ```

2. **Common JSON errors:**
   - Trailing commas
   - Single quotes instead of double
   - Missing quotes around strings

3. **Start fresh with valid config:**
   ```json
   {
     "strategy": "branch-per-plan",
     "branch_prefix": "plan/",
     "auto_commit": true
   }
   ```

---

### Invalid Option Values

**Symptom:**
```
⚠ Invalid strategy: "rebase" (must be: branch-per-plan, branch-per-phase)
Using default values for invalid options
```

**Solution:** Check valid values for each option:

| Option | Valid Values |
|--------|--------------|
| `strategy` | `branch-per-plan`, `branch-per-phase` |
| `merge_strategy` | `squash`, `commit`, `ff` |
| Boolean options | `true`, `false` |
| Integer options | Positive numbers (>= 1) |

---

## Cleanup Issues

### Accidental Branch Deletion

**Symptom:** Deleted a branch you still needed.

**Solutions:**

1. **If archive was created:**
   ```bash
   # Find archive tag
   git tag -l "archive/plan-*"

   # Restore branch from archive
   git checkout -b plan/my-plan archive/plan-my-plan
   ```

2. **If recently deleted (reflog):**
   ```bash
   git reflog
   git checkout -b plan/my-plan <commit-hash>
   ```

3. **Enable archiving for future:**
   ```json
   { "archive_branches": true }
   ```

---

### Cleanup Deleting Wrong Branches

**Symptom:** `/plan:cleanup --delete` wants to delete branches you're using.

**Solutions:**

1. **Increase age threshold:**
   ```json
   { "cleanup_age_days": 60 }
   ```

2. **Review before deleting** (skip `--yes`):
   ```bash
   /plan:cleanup  # Preview only
   ```

3. **Touch branches to update timestamp:**
   ```bash
   git checkout plan/my-plan
   git commit --allow-empty -m "Keep branch active"
   ```

---

## Commit Issues

### Auto-Commit Disabled

**Symptom:**
```
✓ 1.1 Add auth middleware - Completed
  ⚠ Auto-commit disabled (auto_commit: false in config)
    Changes remain uncommitted.
```

**This is expected behavior** when `auto_commit: false`.

**Solutions:**

1. **Commit manually:**
   ```bash
   git add -A
   git commit -m "[my-plan] tasks 1.1-1.3: Implement auth"
   ```

2. **Enable auto-commit:**
   ```json
   { "auto_commit": true }
   ```

---

### Commit Hook Failures

**Symptom:** Task commits fail due to pre-commit hooks.

**Solutions:**

1. **Fix hook issues** (linting, tests, etc.)

2. **Check hook output** for specific errors

3. **Temporarily disable hooks (not recommended):**
   ```bash
   git commit --no-verify -m "message"
   ```

---

## Status Tracking Issues

### Status Out of Sync

**Symptom:** status.json doesn't match actual progress.

**Solutions:**

1. **Validate and repair:**
   ```bash
   node scripts/status-cli.js validate
   ```

2. **Compare with plan:**
   ```bash
   node scripts/status-cli.js sync-check
   ```

3. **Manual fix:**
   Edit `docs/plan-outputs/{plan-name}/status.json` directly.

---

### Stuck Tasks

**Symptom:** Tasks marked as `in_progress` but not actually running.

**Solutions:**

1. **Detect stuck tasks:**
   ```bash
   node scripts/status-cli.js detect-stuck
   ```

2. **Reset manually:**
   ```bash
   node scripts/status-cli.js mark-failed 1.1 --error "Marked stuck"
   ```

---

## Quick Reference

### Common Commands

| Issue | Command |
|-------|---------|
| Switch to plan branch | `/plan:set` |
| Check current status | `/plan:status` |
| Preview cleanup | `/plan:cleanup` |
| Delete stale branches | `/plan:cleanup --delete` |
| Skip conflict check | `/plan:complete --force` |
| Create PR | `/plan:complete --pr` |
| Push changes | `git push` or `--push` flag |

### Configuration Locations

| File | Purpose |
|------|---------|
| `.claude/git-workflow.json` | Git workflow settings |
| `.claude/current-plan.txt` | Active plan path |
| `docs/plan-outputs/{plan}/status.json` | Task status |

### Getting Help

- **Check plan status:** `/plan:status`
- **View git state:** `git status`
- **Show configuration:** `cat .claude/git-workflow.json`
- **Report issues:** https://github.com/anthropics/claude-code/issues
