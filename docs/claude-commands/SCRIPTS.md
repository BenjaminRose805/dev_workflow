# Claude Commands - Script Reference

Complete reference for all scripts in the `scripts/` directory.

## Entry Point

### `index.js`

Unified entry point routing to all scripts.

```bash
node scripts/index.js <command> [options]
node scripts/index.js --help
```

**Available Commands:**
- `scan-plans` - Scan plan files
- `check-file-status` - Check file status
- `substitute-variables` - Variable substitution
- `cache-clear` - Clear caches
- `cache-stats` - Cache statistics

---

## Scanning Scripts

### `scan-plans.js`

Scans all plan files in `docs/plans/` and generates a JSON summary.

```bash
node scripts/scan-plans.js
```

**Output:**
```json
{
  "currentPlan": "docs/plans/test-coverage.md",
  "plans": [
    {
      "path": "/path/docs/plans/test-coverage.md",
      "title": "Test Coverage Enhancement",
      "incomplete": 5,
      "complete": 3,
      "phases": [...]
    }
  ]
}
```

---

## Utility Scripts

### `check-file-status.js`

Checks file existence, size, mtime, and optionally runs tests.

```bash
# From stdin
echo '["file1.js", "file2.ts"]' | node scripts/check-file-status.js

# Command line
node scripts/check-file-status.js --files src/utils.ts tests/utils.test.ts

# With test execution
node scripts/check-file-status.js --files tests/utils.test.ts --run-tests
```

**Output:**
```json
{
  "checks": [
    {
      "file": "tests/utils.test.ts",
      "exists": true,
      "size": 3245,
      "mtime": 1702857600000,
      "tests_pass": true,
      "coverage": 85.5
    }
  ]
}
```

### `substitute-variables.js`

Substitutes `{{variable}}` placeholders in templates.

```bash
# From stdin
cat prompt.md | node scripts/substitute-variables.js --vars '{"user":"john"}'

# Using --var flags
node scripts/substitute-variables.js --file prompt.md --var user=john --var project=myapp
```

**Output:**
```json
{
  "success": true,
  "content": "Hello john, welcome to myapp!",
  "substitutions": {"user": "john", "project": "myapp"}
}
```

---

## Cache Management

### `cache-clear.js`

Clears various cache types.

```bash
node scripts/cache-clear.js --all           # Clear all
node scripts/cache-clear.js --scripts       # Scripts cache only
node scripts/cache-clear.js --research      # Research cache only
```

**Output:**
```json
{
  "cleared": {
    "scripts": {"files": 10, "bytes": 12345},
    "research": {"files": 5, "bytes": 6789}
  },
  "total": {"files": 15, "bytes": 19134}
}
```

### `cache-stats.js`

Shows cache statistics.

```bash
node scripts/cache-stats.js              # All caches
node scripts/cache-stats.js --detailed   # With file list
```

**Output:**
```json
{
  "caches": {
    "scripts": {
      "exists": true,
      "totalEntries": 10,
      "validEntries": 8,
      "expiredEntries": 2,
      "totalSizeKB": "12.05"
    }
  },
  "totals": {
    "totalEntries": 18,
    "validEntries": 15
  }
}
```

---

## Common Options

All scripts support:
- `--help, -h` - Show help
- `--verbose, -v` - Verbose output

---

## Examples

### Full Workflow

```bash
# 1. Scan plan
node scripts/scan-plans.js > plan-summary.json

# 2. Check file status
node scripts/check-file-status.js --files tests/unit/*.test.ts --run-tests

# 3. Check cache health
node scripts/cache-stats.js

# 4. Clear old cache
node scripts/cache-clear.js --all
```

### JSON Processing with jq

```bash
# Extract incomplete tasks
node scripts/scan-plans.js | jq '.plans[0].phases[] | select(.incompleteCount > 0)'

# Calculate cache health
node scripts/cache-stats.js | jq '.totals.validEntries / .totals.totalEntries * 100'
```

---

## Troubleshooting

### "Template not found"
- Check template path in `.claude/templates/agents/`
- Verify file permissions

### "Cache hit rate low"
- Clear cache: `node scripts/cache-clear.js --all`
- Check file mtime changes

### "Parse error"
- Enable verbose mode: `--verbose`
- Validate JSON output with `| jq empty`
