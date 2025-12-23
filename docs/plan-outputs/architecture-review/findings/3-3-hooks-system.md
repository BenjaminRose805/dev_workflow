# Task 3.3: Hooks System Review

## Available Hook Types

Claude Code provides 10 distinct hook events, each triggering at different points in the agent lifecycle:

1. **PreToolUse** - Executes after Claude creates tool parameters and before processing the tool call
   - Allows blocking tool calls with feedback
   - Can modify tool inputs before execution
   - Common matchers: Bash, Edit, Write, Read, Task, Glob, Grep, WebFetch, WebSearch

2. **PostToolUse** - Executes immediately after a tool completes successfully
   - Provides feedback to Claude about tool execution results
   - Cannot block tool execution (tool already ran)
   - Same matchers as PreToolUse

3. **PermissionRequest** - Executes when the user is shown a permission dialog
   - Allows or denies permission requests on behalf of user
   - Can also modify tool inputs via updatedInput field
   - Same matchers as PreToolUse

4. **Notification** - Executes when Claude Code sends notifications
   - Matchers include: permission_prompt, idle_prompt, auth_success, elicitation_dialog
   - Supports filtering different notification types
   - Useful for custom notification systems

5. **UserPromptSubmit** - Executes when user submits a prompt, before Claude processes it
   - Can add context to conversation
   - Can block/validate prompts
   - No matcher field required

6. **Stop** - Executes when the main Claude Code agent finishes responding
   - Can block stoppage and force Claude to continue
   - Does not run if user interrupts stoppage
   - No matcher field required

7. **SubagentStop** - Executes when a Claude Code subagent (Task tool call) finishes responding
   - Can block subagent stoppage
   - Same control structure as Stop
   - No matcher field required

8. **PreCompact** - Executes before Claude Code compacts the conversation
   - Matchers: manual (from /compact), auto (from auto-compact)
   - Cannot block compaction
   - Useful for pre-compaction validation

9. **SessionStart** - Executes when Claude Code starts or resumes a session
   - Matchers: startup, resume, clear, compact
   - Can inject context into session initialization
   - Special access to CLAUDE_ENV_FILE for persisting environment variables

10. **SessionEnd** - Executes when Claude Code session ends
    - Reason field: clear, logout, prompt_input_exit, other
    - Cannot block session termination
    - Useful for cleanup tasks and logging

### Hook Execution Types

- **Command hooks** (`type: "command"`) - Execute bash shell commands with JSON input via stdin
- **Prompt-based hooks** (`type: "prompt"`) - Send input to LLM (Haiku) for context-aware decisions
  - Currently supported for: Stop, SubagentStop, UserPromptSubmit, PreToolUse, PermissionRequest
  - Uses structured JSON response with decision, reason, optional continue/stopReason

## Configuration

### Hook Configuration Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "bash-command-here",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

### Configuration Locations (Precedence Order)

1. **Enterprise managed policy settings** - Highest priority
2. **.claude/settings.local.json** - Local project (not committed)
3. **.claude/settings.json** - Project-specific settings
4. **~/.claude/settings.json** - User settings (lowest priority)

### Matcher Patterns

- **Exact match**: `Write` matches only the Write tool (case-sensitive)
- **Regex patterns**: `Edit|Write`, `Notebook.*`, `mcp__github__.*`
- **Wildcard**: `*` or empty string `""` matches all tools
- **MCP tools**: Pattern is `mcp__<server>__<tool>`, e.g., `mcp__memory__create_entities`

### Available Environment Variables

- **$CLAUDE_PROJECT_DIR** - Absolute path to project root
- **${CLAUDE_PLUGIN_ROOT}** - Absolute path to plugin directory (for plugin hooks)
- **$CLAUDE_CODE_REMOTE** - "true" if running in remote/web environment
- **$CLAUDE_ENV_FILE** - File path for persisting environment variables (SessionStart only)

## Event Triggers

### When Hooks Execute

- **PreToolUse**: After Claude generates tool parameters, before execution
- **PermissionRequest**: When Claude Code shows permission dialog to user
- **PostToolUse**: Immediately after successful tool completion
- **Notification**: When Claude Code sends notifications (idle, permission, auth, etc.)
- **UserPromptSubmit**: When user submits prompt, before Claude processes it
- **Stop**: When main agent finishes responding (not triggered by user interrupt)
- **SubagentStop**: When subagent (Task tool) finishes responding
- **PreCompact**: Before conversation context is compacted
- **SessionStart**: At session initialization or resume
- **SessionEnd**: When session ends (clear, logout, exit, etc.)

## Hook Execution

### Execution Model

- **Parallelization**: All matching hooks for an event run in parallel
- **Deduplication**: Multiple identical hook commands execute only once
- **Timeout**: 60-second default per hook command, configurable via `timeout` field
- **Working directory**: Runs in current directory with Claude Code's environment
- **Input method**: JSON data passed via stdin

### Execution Sequence

1. Hook input JSON is generated by Claude Code
2. JSON is piped to stdin of hook command
3. Hook processes input and produces output
4. Exit code and stdout/stderr determine behavior
5. Multiple matching hooks execute in parallel
6. Results are aggregated and applied

## Data Flow

### Input Data (via stdin)

All hooks receive common fields:
```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default|plan|acceptEdits|bypassPermissions",
  "hook_event_name": "EventName"
}
```

Event-specific fields added:

- **PreToolUse/PostToolUse**: tool_name, tool_input, tool_response, tool_use_id
- **PermissionRequest**: Permission dialog data and tool information
- **Notification**: message, notification_type
- **UserPromptSubmit**: prompt text
- **Stop/SubagentStop**: stop_hook_active flag (boolean, prevents infinite loops)
- **PreCompact**: trigger (manual|auto), custom_instructions
- **SessionStart**: source (startup|resume|clear|compact)
- **SessionEnd**: reason (clear|logout|prompt_input_exit|other)

### Output Data (via stdout)

#### Exit Code 0 (Success)
- **stdout shown to user**: In verbose mode (Ctrl+O)
- **stdout added to context**: For UserPromptSubmit and SessionStart hooks
- **JSON output parsed**: For structured control

#### Exit Code 2 (Blocking Error)
- **stderr used as message**: Shown to Claude or user depending on hook type
- **JSON ignored**: Any JSON in stdout is not processed
- **Tool blocked**: For PreToolUse hooks, prevents tool execution

#### Exit Code Other (Non-blocking Error)
- **stderr shown to user**: In verbose mode
- **Execution continues**: Does not block Claude or prevent action

### JSON Output Structure

```json
{
  "continue": true,
  "stopReason": "Message shown to user",
  "suppressOutput": false,
  "systemMessage": "Optional warning to user",
  "hookSpecificOutput": {
    "hookEventName": "EventName"
  }
}
```

### Decision Control by Event Type

**PreToolUse decisions**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "explanation",
    "updatedInput": { "field": "new_value" }
  }
}
```

**Stop/SubagentStop decisions**:
```json
{
  "decision": "block",
  "reason": "Must be provided when blocking Claude"
}
```

## Error Handling

### Exit Code Behavior

| Exit Code | Meaning | Behavior |
|-----------|---------|----------|
| 0 | Success | stdout processed, JSON parsed for control |
| 1+ (except 2) | Non-blocking error | stderr shown, execution continues |
| 2 | Blocking error | Only stderr used, action blocked |

### Hook-Specific Error Handling

- **PreToolUse**: Exit code 2 blocks tool call, shows stderr to Claude
- **PostToolUse**: Exit code 2 shows stderr to Claude (tool already ran)
- **PermissionRequest**: Exit code 2 denies permission, shows stderr to Claude
- **UserPromptSubmit**: Exit code 2 blocks prompt, shows stderr to user only
- **Stop/SubagentStop**: Exit code 2 blocks stoppage, shows stderr to Claude

### Preventing Infinite Loops

Stop/SubagentStop hooks receive `stop_hook_active` flag:
- When true: Claude is already continuing due to a stop hook
- Check this value to prevent infinite loop scenarios

## Notification Patterns

### Common Notification Matchers

1. **permission_prompt** - When Claude needs permission to use a tool
2. **idle_prompt** - When Claude is waiting for user input (60+ seconds idle)
3. **auth_success** - When authentication succeeds
4. **elicitation_dialog** - When Claude Code needs input for MCP tool elicitation

### Notification Use Cases

**Desktop Notifications**:
```bash
notify-send 'Claude Code' 'Awaiting your input'
```

**Sound Alerts**:
```bash
afplay /System/Library/Sounds/Glass.aiff  # macOS
paplay /usr/share/sounds/freedesktop/stereo/complete.oga  # Linux
```

**Integration Pattern**:
```bash
curl -X POST https://api.slack.com/hooks/... -d "Claude needs permission"
```

## Key Findings

### Architecture Insights

1. **Deterministic Control**: Hooks provide guaranteed execution of shell commands at specific points in Claude's lifecycle

2. **Multi-Layer Configuration**: Settings precedence (enterprise > local > project > user) allows organization-wide policies while supporting project and personal overrides

3. **Parallel Execution**: All matching hooks execute simultaneously, improving performance

4. **Flexible Permission Model**: Three levels of control:
   - Shell command hooks for deterministic rule-based decisions
   - Prompt-based hooks for context-aware LLM evaluation
   - Pre-approval/modification of tool inputs before execution

5. **MCP Integration**: Hooks fully support Model Context Protocol tools via pattern matching

6. **Input/Output Contract**: Well-defined JSON contract via stdin/stdout enables type-safe data exchange

7. **Security by Default**: Exit code 2 for blocking errors is explicit and unambiguous

8. **Session Persistence**: SessionStart hooks can persist environment variables via CLAUDE_ENV_FILE

9. **Notification Extensibility**: Different notification types enable targeted customization

10. **Debugging Support**: Debug mode (--debug flag) shows hook execution details

### Common Use Cases

1. Automatic code formatting (PostToolUse on Edit|Write)
2. File protection (PreToolUse blocking sensitive files)
3. Command logging and auditing (PreToolUse on Bash)
4. Permission automation (PermissionRequest)
5. Custom notifications (Notification with type-specific matchers)
6. Context injection (UserPromptSubmit, SessionStart)
7. Bash command validation (PreToolUse with regex validation)
8. Compliance logging (PreToolUse, SessionEnd)
9. MCP operation monitoring (PreToolUse with mcp__ patterns)

## Evidence/Sources

### Official Documentation

1. **Hooks Guide**: https://code.claude.com/docs/en/hooks-guide.md
2. **Hooks Reference**: https://code.claude.com/docs/en/hooks.md
3. **Settings Reference**: https://code.claude.com/docs/en/settings.md
4. **IAM Reference**: https://code.claude.com/docs/en/iam.md
