# Findings Output Format Specification

This document defines the standard format for findings files written to `docs/plan-outputs/{plan-name}/findings/`.

## File Naming Convention

- **Format:** `{task-id}.md` where dots are replaced with hyphens
- **Examples:**
  - Task `0.1` → `0-1.md`
  - Task `2.3` → `2-3.md`
  - Task `VERIFY 0` → `verify-0.md` (lowercase, spaces to hyphens)

## Markdown Structure

### Required Sections

```markdown
# Task {task-id}: {task-description}

**Status:** completed | failed | skipped
**Started:** {ISO timestamp}
**Completed:** {ISO timestamp}
**Duration:** {formatted duration}

## Summary

{1-3 sentence summary of what was accomplished or why it failed}

## Details

{Detailed description of work performed, decisions made, or issues encountered}
```

### Optional Sections

```markdown
## Files Modified

- `path/to/file1.ts` - {brief description of change}
- `path/to/file2.md` - {brief description of change}

## Code Changes

\`\`\`typescript
// Key code snippets or diffs
\`\`\`

## Analysis

{For research/analysis tasks: detailed findings, data, observations}

## Recommendations

{For analysis tasks: suggested next steps or improvements}

## Errors

{For failed tasks: error messages, stack traces, troubleshooting attempted}

## Related Tasks

- `{task-id}` - {relationship description}
```

## Example: Completed Task

```markdown
# Task 1.3: Update scripts/scan-plans.js to read status.json

**Status:** completed
**Started:** 2025-12-18T22:45:00.000Z
**Completed:** 2025-12-18T22:45:30.000Z
**Duration:** 30s

## Summary

Updated scan-plans.js to check for and include status.json data when available for each plan.

## Details

Added integration with plan-output-utils.js to:
1. Check if output directory exists for each plan
2. Load status.json if present
3. Include status summary, last updated time, and run count in output

## Files Modified

- `scripts/scan-plans.js` - Added status.json reading logic
```

## Example: Failed Task

```markdown
# Task 2.5: Implement real-time sync

**Status:** failed
**Started:** 2025-12-18T23:00:00.000Z
**Completed:** 2025-12-18T23:05:00.000Z
**Duration:** 5m

## Summary

Failed to implement real-time sync due to WebSocket connection issues.

## Details

Attempted to implement WebSocket-based real-time synchronization between status.json and the frontend. Encountered connection timeout issues.

## Errors

```
Error: WebSocket connection timeout after 30s
    at WebSocketManager.connect (src/lib/websocket-manager.ts:45)
    at StatusSync.init (src/lib/status-sync.ts:23)
```

## Recommendations

- Check WebSocket server configuration
- Consider using polling as fallback
- May need to increase connection timeout
```

## Example: Verification Task

```markdown
# Task VERIFY 1: Create test status.json, verify /plan:status reads it correctly

**Status:** completed
**Started:** 2025-12-18T22:50:00.000Z
**Completed:** 2025-12-18T22:51:00.000Z
**Duration:** 1m

## Summary

Verification passed. Status tracking system correctly initializes and reads status.json.

## Details

### Tests Performed

1. **Initialization Test**
   - Called `initializePlanStatus()` for current plan
   - Verified status.json created with correct structure
   - Confirmed all tasks extracted from plan markdown

2. **Reading Test**
   - Ran `scan-plans.js`
   - Verified output includes `hasStatusTracking: true`
   - Confirmed `statusSummary` matches initialized data

3. **Display Test**
   - Called `formatProgress()` function
   - Verified human-readable output format
   - Confirmed progress bar and task counts display correctly

### Results

All tests passed:
- ✓ status.json structure valid
- ✓ scan-plans.js includes status data
- ✓ formatProgress displays correctly
```

## Programmatic Access

Use `scripts/lib/plan-output-utils.js` functions:

```javascript
const { writeFindings, readFindings } = require('./scripts/lib/plan-output-utils');

// Write findings
const findingsPath = writeFindings(planPath, taskId, markdownContent);

// Read findings
const content = readFindings(planPath, taskId);
```

## Integration with Status

When a task completes, the findings path should be recorded in status.json:

```json
{
  "tasks": [
    {
      "id": "1.3",
      "status": "completed",
      "findingsPath": "docs/plan-outputs/my-plan/findings/1-3.md"
    }
  ]
}
```
