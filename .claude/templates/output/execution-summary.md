# Execution Summary Template

A reusable template for displaying final results after batch operations complete.

## Template Variables

- `{{title}}` - Summary title (e.g., "BATCH EXECUTION COMPLETE")
- `{{results}}` - Results summary object
- `{{completed_items}}` - Array of completed items
- `{{failed_items}}` - Array of failed items
- `{{skipped_items}}` - Array of skipped items
- `{{timing}}` - Timing statistics object
- `{{next_steps}}` - Suggested next actions

## Results Structure

```typescript
interface ExecutionResults {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  warnings: number;
}

interface TimingStats {
  total_time: string;        // Total elapsed time
  sequential_estimate: string; // Estimated sequential time
  time_saved: string;        // Percentage saved
  avg_per_item: string;      // Average time per item
}

interface ResultItem {
  id: string;                // Task ID
  name: string;              // Task description
  duration?: string;         // Completion time
  error?: string;            // Error message (for failed)
  reason?: string;           // Skip reason (for skipped)
}
```

## Template Format

### Full Summary

```
═══════════════════════════════════════════════════════
                 {{title}}
═══════════════════════════════════════════════════════

Results:
  ✓ Completed: {{results.completed}} tasks
  ✗ Failed: {{results.failed}} task(s)
  ⊘ Skipped: {{results.skipped}} task(s)
{{#if results.warnings}}
  ⚠ Warnings: {{results.warnings}} task(s)
{{/if}}

{{#if completed_items}}
─── Completed Tasks ───
{{#each completed_items}}
  ✓ {{id}} {{name}}{{#if duration}} ({{duration}}){{/if}}
{{/each}}
{{/if}}

{{#if failed_items}}
─── Failed Tasks ───
{{#each failed_items}}
  ✗ {{id}} {{name}}
    Error: {{error}}
{{/each}}
{{/if}}

{{#if skipped_items}}
─── Skipped Tasks ───
{{#each skipped_items}}
  ⊘ {{id}} {{name}}
    Reason: {{reason}}
{{/each}}
{{/if}}

{{#if timing}}
─── Timing ───
Total time: {{timing.total_time}}{{#if timing.sequential_estimate}} (with parallelization)
Sequential estimate: {{timing.sequential_estimate}}
Time saved: ~{{timing.time_saved}}{{/if}}
{{/if}}

{{#if next_steps}}
─── Next Steps ───
{{#each next_steps}}
  → {{this}}
{{/each}}
{{/if}}

{{#if plan_updated}}
Plan updated: {{results.completed}} tasks marked complete
Remaining in plan: {{remaining_count}} tasks
{{/if}}

═══════════════════════════════════════════════════════
```

## Usage Examples

### Example 1: Successful Batch Completion

```
═══════════════════════════════════════════════════════
                 BATCH EXECUTION COMPLETE
═══════════════════════════════════════════════════════

Results:
  ✓ Completed: 6 tasks
  ✗ Failed: 0 tasks
  ⊘ Skipped: 0 tasks

─── Completed Tasks ───
  ✓ 0.3 Update playwright.config.ts (12s)
  ✓ 0.4 Update vitest.config.ts (8s)
  ✓ 1.1 websocket-connection.test.ts (2m 34s)
  ✓ 1.2 preferences-store.test.ts (1m 12s)
  ✓ 1.3 api-utils.test.ts (45s)
  ✓ 2.1 mock-claude-cli.ts (1m 56s)

─── Timing ───
Total time: 4m 23s (with parallelization)
Sequential estimate: 8m 15s
Time saved: ~47%

Plan updated: 6 tasks marked complete
Remaining in plan: 6 tasks

═══════════════════════════════════════════════════════
```

### Example 2: Partial Success with Failures

```
═══════════════════════════════════════════════════════
                 BATCH EXECUTION COMPLETE
═══════════════════════════════════════════════════════

Results:
  ✓ Completed: 5 tasks
  ✗ Failed: 1 task
  ⊘ Skipped: 1 task

─── Completed Tasks ───
  ✓ 0.3 Update playwright.config.ts (12s)
  ✓ 0.4 Update vitest.config.ts (8s)
  ✓ 1.1 websocket-connection.test.ts (2m 34s)
  ✓ 1.2 preferences-store.test.ts (1m 12s)
  ✓ 2.1 mock-claude-cli.ts (1m 56s)

─── Failed Tasks ───
  ✗ 1.3 api-utils.test.ts
    Error: Test file created but 3 tests failing

─── Skipped Tasks ───
  ⊘ 2.2 orchestrator.integration.test.ts
    Reason: Depends on failed task 1.3

─── Timing ───
Total time: 4m 23s

Plan updated: 5 tasks marked complete
Remaining in plan: 7 tasks

─── Next Steps ───
  → Run /plan:batch again to retry failed tasks
  → Run /plan:verify to check task status

═══════════════════════════════════════════════════════
```

### Example 3: Compact Summary

```
═══════════════════════════════════════════════════════
                      COMPLETE
═══════════════════════════════════════════════════════

  ✓ 6 completed  •  ✗ 0 failed  •  ⊘ 0 skipped

Total time: 4m 23s
Plan updated: 6 tasks marked complete

═══════════════════════════════════════════════════════
```

### Example 4: All Failed

```
═══════════════════════════════════════════════════════
                 BATCH EXECUTION FAILED
═══════════════════════════════════════════════════════

Results:
  ✓ Completed: 0 tasks
  ✗ Failed: 3 tasks
  ⊘ Skipped: 0 tasks

─── Failed Tasks ───
  ✗ 1.1 websocket-connection.test.ts
    Error: Module not found: @/lib/websocket
  ✗ 1.2 preferences-store.test.ts
    Error: Module not found: @/stores/preferences
  ✗ 1.3 api-utils.test.ts
    Error: Module not found: @/lib/api-utils

─── Analysis ───
All failures share a common cause: missing module imports.
This may indicate a path alias configuration issue.

─── Suggested Fix ───
Check tsconfig.json path aliases match vitest.config.ts

═══════════════════════════════════════════════════════
```

### Example 5: Prompt Batch Summary

```
═══════════════════════════════════════════════════════
                 PROMPT BATCH COMPLETE
═══════════════════════════════════════════════════════

Results:
  ✓ Completed: 4 prompts
  ✗ Failed: 1 prompt
  ⊘ Skipped: 0 prompts

─── Completed Prompts ───
  ✓ generate-unit-tests.md → tests/unit/new-tests.ts
  ✓ generate-integration-tests.md → tests/integration/suite.ts
  ✓ identify-code-smells.md → reports/code-smells.md
  ✓ suggest-improvements.md → reports/improvements.md

─── Failed Prompts ───
  ✗ analyze-coverage.md
    Error: Coverage tool not installed

─── Output Summary ───
  • 4 files generated
  • 2 test files (145 tests)
  • 2 report files

Total time: 3m 12s

═══════════════════════════════════════════════════════
```

## Helper Functions

```typescript
function formatResults(results: ExecutionResults): string {
  const parts = [];
  if (results.completed > 0) parts.push(`✓ ${results.completed} completed`);
  if (results.failed > 0) parts.push(`✗ ${results.failed} failed`);
  if (results.skipped > 0) parts.push(`⊘ ${results.skipped} skipped`);
  return parts.join('  •  ');
}

function calculateTimeSaved(total: number, sequential: number): string {
  const saved = ((sequential - total) / sequential) * 100;
  return `${Math.round(saved)}%`;
}

function generateNextSteps(results: ExecutionResults): string[] {
  const steps = [];
  if (results.failed > 0) {
    steps.push('Run /plan:batch again to retry failed tasks');
    steps.push('Run /plan:verify to check task status');
  }
  if (results.completed > 0 && results.failed === 0) {
    steps.push('Run /plan:status to see remaining tasks');
  }
  return steps;
}
```

## Best Practices

1. **Show counts first** - Quick overview before details
2. **Group by status** - Completed, failed, skipped in separate sections
3. **Include timing** - Total time and comparison to sequential
4. **Provide next steps** - Guide users on what to do next
5. **Update plan** - Automatically mark completed tasks
6. **Show remaining** - How many tasks left in plan
7. **Analyze failures** - Look for common causes across failures

## Conditional Sections

- Only show "Failed Tasks" section if there are failures
- Only show "Skipped Tasks" section if there are skips
- Only show timing comparison if parallelization was used
- Only show "Analysis" if pattern detected in failures

## See Also

- `.claude/templates/output/progress-display.md` - Progress during execution
- `.claude/templates/shared/status-symbols.md` - Status symbols
- `.claude/templates/questions/next-steps.md` - Post-execution options
