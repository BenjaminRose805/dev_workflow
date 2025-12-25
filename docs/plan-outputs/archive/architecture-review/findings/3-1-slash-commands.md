# Task 3.1: Custom Slash Commands Review

## Capabilities

Custom slash commands can:

1. **Execute dynamic prompts**
   - Run frequently used prompts as single-word commands
   - Support arguments passed by users
   - Include frontmatter metadata (model selection, tool restrictions, hints)

2. **Accept parameters and arguments**
   - `$ARGUMENTS` placeholder for all arguments as a single string
   - `$1`, `$2`, `$3`, etc. for positional arguments
   - Optional argument hints for auto-completion hints

3. **Invoke bash commands**
   - Execute bash with `!` prefix within command markdown
   - Include bash output in command context
   - Requires explicit `allowed-tools` with Bash tool permissions

4. **Reference files in context**
   - Use `@` prefix to include file contents (e.g., `@src/utils/helpers.js`)
   - Reference multiple files for comparison
   - Files are included in the context passed to Claude

5. **Trigger extended thinking**
   - Include extended thinking keywords to enable thinking mode
   - Supported within command prompts

6. **Be invoked programmatically**
   - The `SlashCommand` tool allows Claude to execute commands automatically
   - Commands must have `description` frontmatter field to be available

7. **Specify execution context**
   - Frontmatter allows per-command model selection (override conversation model)
   - Restrict tools available to command with `allowed-tools` field
   - Set custom argument hints for documentation

## Limitations

1. **Single file definition**
   - Commands are stored as single Markdown files only
   - Cannot be multi-file structures (unlike Skills)
   - Cannot include scripts, utilities, or supporting resources directly

2. **Cannot invoke other commands**
   - Slash commands cannot call other slash commands
   - No command chaining capability
   - Must use Skills for complex workflows requiring multiple steps

3. **Restricted programmatic access**
   - `SlashCommand` tool has a character budget limit (default 15,000 chars)
   - Cannot disable per-command programmatically beyond frontmatter field
   - Many commands become unavailable when character budget is exceeded

4. **Limited discovery mechanism**
   - Commands are not automatically discovered based on context
   - Explicit invocation required (user must type `/command-name`)
   - Contrast with Skills which are context-aware

5. **No shared state between commands**
   - Commands cannot access outputs from other commands
   - No inter-command communication mechanism
   - Each command runs in isolation

6. **Naming conflicts resolved by scope only**
   - If project command and user command share same name, project wins
   - Cannot coexist as different namespace variants
   - Subdirectories affect description only, not command name

7. **No direct file writing**
   - Commands generate prompts to Claude; Claude decides what to write
   - Cannot directly manipulate files from command definition
   - File operations depend on Claude's decision-making

8. **Limited to Markdown format**
   - Commands must be valid Markdown files
   - YAML frontmatter is optional but has specific field constraints
   - No support for other markup or configuration formats

9. **No native scheduling or automation**
   - Commands are entirely interactive
   - No way to schedule recurring execution
   - No triggers or event-based execution (unlike hooks)

10. **SlashCommand tool availability**
    - Not available for built-in commands (like `/compact`, `/init`)
    - `disable-model-invocation: true` removes command from Claude's context
    - Permission rules must be explicitly configured

## File Structure

```
Project-level commands:
.claude/
└── commands/
    ├── command-name.md                    # Simple command
    ├── namespace/
    │   ├── command-name.md                # Namespaced command
    │   └── another-command.md
    └── plan/                              # Example: plan commands
        ├── explain.md
        ├── batch.md
        ├── implement.md
        ├── split.md
        ├── verify.md
        ├── status.md
        ├── templates.md
        ├── set.md
        ├── create.md
        ├── archive.md
        └── migrate.md

Personal commands (user-level):
~/.claude/
└── commands/
    ├── command-name.md
    └── namespace/
        └── command-name.md
```

**Key structure rules:**
- Subdirectories = namespacing for organization (affects description)
- Command name = filename without `.md` extension
- Subdirectories do NOT change the command name (only the display description)
- File location determines scope: `.claude/commands/` = project, `~/.claude/commands/` = personal

## Syntax & Parameters

### Basic Syntax
```
/<command-name> [arguments]
```

### Frontmatter (YAML)
Optional metadata block at start of command file:

```yaml
---
allowed-tools: Bash(git add:*), Bash(git status:*)
argument-hint: [message] or [pr-number] [priority] [assignee]
description: Brief description of command
model: claude-3-5-haiku-20241022
disable-model-invocation: false
---
```

### Argument Handling

**All arguments as single string:**
```markdown
# Command definition
Fix issue #$ARGUMENTS following our coding standards

# Usage
> /fix-issue 123 high-priority
# $ARGUMENTS becomes: "123 high-priority"
```

**Individual positional arguments:**
```markdown
# Command definition
Review PR #$1 with priority $2 and assign to $3

# Usage
> /review-pr 456 high alice
# $1="456", $2="high", $3="alice"
```

### Bash Execution

Commands can execute bash with `!` prefix to include output:

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*)
description: Create a git commit
---

## Context

- Current git status: !`git status`
- Current git diff: !`git diff HEAD`
- Recent commits: !`git log --oneline -10`

## Your task

Based on the above changes, create a single git commit.
```

**Important:** You MUST include `allowed-tools` with Bash tool permissions to use bash execution.

### File References

Include file contents with `@` prefix:

```markdown
# Reference specific file
Review the implementation in @src/utils/helpers.js

# Reference multiple files
Compare @src/old-version.js with @src/new-version.js
```

## Integration Points

### 1. Tool Restrictions (allowed-tools)
Commands can restrict which tools Claude can use:

```yaml
allowed-tools:
  - Bash(grep:*)
  - Bash(find:*)
  - Read   # Entire tool
  - Glob
```

### 2. Model Selection
Override the conversation model for a specific command:

```yaml
model: claude-opus-4-5-20251101
```

### 3. SlashCommand Tool Integration
Claude can invoke custom commands via the SlashCommand tool:

```yaml
description: Create a git commit    # REQUIRED for SlashCommand availability
argument-hint: [message]
```

### 4. Context Integration
Commands are executed within the conversation context:
- Bash output included directly
- File references replaced with file contents
- All within Claude's context window
- No out-of-band execution or async processing

### 5. Extended Thinking
Commands can trigger extended thinking by including keywords:
- "think about", "analyze deeply", "consider carefully"
- Extended thinking keywords in command text enable thinking mode

## Key Findings

### Implementation Pattern (Plan Commands)
This project uses an excellent namespacing pattern with `/plan:*` commands:

```
.claude/commands/plan/
├── explain.md      → /plan:explain
├── batch.md        → /plan:batch
├── implement.md    → /plan:implement
├── verify.md       → /plan:verify
└── status.md       → /plan:status
```

**Key characteristics:**

1. **Comprehensive tool usage**
   - Commands use Bash for file operations
   - Read from specific paths (`.claude/current-plan.txt`)
   - Execute status-manager functions via Node.js

2. **Clear task organization**
   - Explains tasks before implementation
   - Provides batch execution with parallelism
   - Tracks status across executions

3. **Structured workflows**
   - Commands guide users through multi-step processes
   - Use AskUserQuestion templates for UI
   - Output follows consistent formatting

4. **Status tracking integration**
   - Commands reference `scripts/lib/status-manager.js`
   - Write findings to `docs/plan-outputs/{plan-name}/findings/`
   - Manage execution runs and task states

### Critical Insight: Skills vs Commands

The plan commands are **borderline Skills** candidates:

**Why they work as commands:**
- They're frequently invoked (`/plan:explain`, `/plan:implement`)
- Users explicitly call them
- Single file definitions (mostly)

**Why they could become Skills:**
- Complex multi-step workflows
- Reference external utilities (`status-manager.js`, templates)
- Could benefit from automatic discovery
- Require significant context (task definitions, status data)

### Architectural Pattern: Commands as Workflow Orchestrators

This implementation shows commands can be effective orchestrators that:
1. Read state (`.claude/current-plan.txt`, `status.json`)
2. Present options to users (AskUserQuestion)
3. Delegate implementation to agents
4. Track results and persist state

## Comparison: Commands vs Skills vs Hooks

| Aspect | Commands | Skills | Hooks |
|--------|----------|--------|-------|
| **Discovery** | Explicit invocation | Context-aware automatic | Automatic on events |
| **Structure** | Single .md file | Directory with SKILL.md | `.claude/hooks.json` + scripts |
| **Complexity** | Simple prompts | Complex workflows | Background automation |
| **Best for** | Frequent prompts | Comprehensive capabilities | Guaranteed execution |

## Evidence/Sources

### Official Documentation
- **Slash Commands Guide:** https://code.claude.com/docs/en/slash-commands.md
- **Common Workflows:** https://code.claude.com/docs/en/common-workflows.md
- **IAM & Permissions:** https://code.claude.com/docs/en/iam.md

### Implementation Examples Analyzed
- `.claude/commands/plan/explain.md` - State reading, multi-select UI
- `.claude/commands/plan/batch.md` - Complex orchestration, parallel execution
- `.claude/commands/plan/implement.md` - Template variable handling
- `.claude/commands/plan/split.md` - Task analysis, plan modification
- `.claude/commands/plan/create.md` - Template discovery, output directory setup
