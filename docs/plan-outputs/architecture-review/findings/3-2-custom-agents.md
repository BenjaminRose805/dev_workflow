# Task 3.2: Custom Agents (Subagents) Review

## Overview

Claude Code implements custom agents through a feature called "subagents" - specialized AI assistants configured to handle specific types of tasks. Subagents operate with their own context window separate from the main conversation, enabling specialized expertise, context preservation, and flexible tool access control.

## Agent Configuration

### File Structure and Locations

Subagents are stored as Markdown files with YAML frontmatter in two possible locations:

| Type                  | Location            | Scope                         | Priority |
| :-------------------- | :------------------ | :---------------------------- | :------- |
| **Project agents**    | `.claude/agents/`   | Available in current project  | Highest  |
| **User agents**       | `~/.claude/agents/` | Available across all projects | Lower    |
| **Plugin agents**     | Plugin `agents/` dir| Distributed via plugins       | Medium   |
| **CLI-defined agents**| CLI flag `--agents` | Session-specific only         | Lowest   |

When agent names conflict, project-level agents take precedence over user-level agents.

### File Format

Each agent is defined in a Markdown file with this structure:

```markdown
---
name: agent-name
description: When and why to use this agent
tools: tool1, tool2, tool3
model: sonnet
permissionMode: default
skills: skill1, skill2
---

Your agent's system prompt goes here. Define the agent's role,
capabilities, approach to solving problems, best practices, and constraints.
```

### JSON Schema (CLI Format)

When using the `--agents` CLI flag, agents are defined as a JSON object:

```json
{
  "agent-name": {
    "description": "Natural language description of when to use this agent",
    "prompt": "The system prompt that guides the agent's behavior",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}
```

## Configuration Options

### Required Fields

| Field         | Type   | Description                                          |
| :------------ | :----- | :--------------------------------------------------- |
| `name`        | String | Unique identifier using lowercase letters and hyphens |
| `description` | String | When the agent should be invoked and its purpose     |

### Optional Fields

| Field            | Type   | Default | Description                                                                                    |
| :--------------- | :----- | :------ | :--------------------------------------------------------------------------------------------- |
| `tools`          | String | (inherit all) | Comma-separated list of specific tools. If omitted, inherits all tools from main thread including MCP tools |
| `model`          | String | sonnet  | Model to use: `sonnet`, `opus`, `haiku`, or `'inherit'`     |
| `permissionMode` | String | default | Permission handling: `default`, `acceptEdits`, `bypassPermissions`, `plan`, `ignore`          |
| `skills`         | String | (none)  | Comma-separated list of skill names to auto-load when agent starts                           |

### Tool Configuration

**Tool Specification Methods:**

1. **Omit `tools` field** (Recommended for most cases)
   - Agent inherits all tools from main thread
   - Includes MCP server tools automatically
   - More flexible approach

2. **Specify individual tools** (For granular control)
   - List tools as comma-separated string: `"Read, Edit, Bash, Grep, Glob"`
   - Restricts agent to only specified tools
   - Improves security and focus

**Available Tools:**
- **File Operations**: Read, Edit, Write, Glob, Bash
- **Search**: Grep
- **Exploration**: Read, Glob, Grep, Bash
- **Code Execution**: Bash, Edit
- **MCP Tools**: Any tools from configured MCP servers

### Model Selection

| Option  | Behavior                                     |
| :------ | :------------------------------------------- |
| `sonnet` | Uses Claude Sonnet (default for agents) |
| `opus`  | Uses Claude Opus (more capable)        |
| `haiku` | Uses Claude Haiku (faster, lightweight) |
| `inherit` | Uses same model as main conversation       |
| (omitted) | Defaults to `sonnet`                       |

**Best Practices:**
- Use `'inherit'` for consistency across agents
- Use `sonnet` for balanced capability/speed
- Use `opus` for complex reasoning
- Use `haiku` for fast exploration

## Capabilities

### What Agents Can Do

1. **Specialized Task Handling**
   - Perform task-specific workflows
   - Use customized system prompts
   - Operate independently from main conversation

2. **Flexible Tool Access**
   - Restrict tools to specific subset
   - Leverage MCP server tools
   - Control permissions per agent

3. **Context Preservation**
   - Maintain separate context window
   - Prevent main conversation pollution
   - Enable longer overall sessions

4. **Model Flexibility**
   - Use different models per agent
   - Inherit main conversation model
   - Optimize performance vs capability

5. **Proactive Activation**
   - Claude automatically delegates matching tasks
   - Model-invoked based on agent description
   - Explicit invocation via natural language

6. **Resumable Execution**
   - Continue previous agent conversations
   - Maintain full context across invocations
   - Useful for long-running research tasks

### Built-in Agents

**General-purpose Agent:**
- Model: Sonnet
- Tools: All tools
- Purpose: Complex multi-step tasks, exploration and modification
- When used: Tasks requiring both exploration and modification

**Plan Agent:**
- Model: Sonnet
- Tools: Read, Glob, Grep, Bash
- Purpose: Research and information gathering in plan mode
- When used: Automatically in plan mode for codebase research

**Explore Agent:**
- Model: Haiku (fast)
- Tools: Glob, Grep, Read, Bash (read-only)
- Purpose: Fast codebase searching and analysis
- When used: When research needed without modifications

## Limitations

### What Agents Cannot Do

1. **Cannot Spawn Sub-agents**
   - Agents cannot invoke other agents
   - Prevents infinite nesting
   - Plan agent used internally to solve this

2. **Cannot Modify Execution Context**
   - Cannot change working directory permanently
   - Cannot modify environment variables for main thread
   - Changes scoped to agent execution only

3. **Permission Model Constraints**
   - Subject to same permission system as main thread
   - `permissionMode` controls behavior but doesn't bypass core security
   - Cannot exceed parent thread's tool access

4. **Context Management**
   - Agents start with clean context (latency cost)
   - Must gather context themselves for awareness
   - Not suitable for tasks requiring extensive previous context

5. **Tool Restrictions**
   - Cannot use tools not available in system
   - MCP tools limited to configured servers
   - Tool list immutable during agent execution

## Agent vs Command

### Key Differences

| Aspect           | Custom Agents (Subagents) | Slash Commands      |
| :--------------- | :------------------------ | :------------------ |
| **Discovery**    | Model-invoked (automatic) | User-invoked (explicit) |
| **Invocation**   | `/agents` or natural language | `/command-name` |
| **Context**      | Separate context window   | Shared context      |
| **Complexity**   | Complex multi-step tasks  | Simple prompts      |
| **Structure**    | YAML frontmatter + prompt | Single .md file     |
| **Tool Access**  | Can restrict per agent    | Inherits conversation |
| **Model Choice** | Different per agent       | Single model per session |
| **Permission Mode** | Configurable per agent | Inherited from main |
| **Use Case**     | Specialized expertise     | Quick templates     |

### When to Use Each

**Use Agents for:**
- Specialized tasks requiring separate context
- Complex workflows with multiple steps
- Read-only or restricted-tool operations
- Different model per task type
- Automatic delegation based on task matching
- Team expertise encapsulation

**Use Slash Commands for:**
- Quick, frequently used prompts
- Simple instructions you invoke manually
- Single-file prompts
- One-off customizations
- Quick reminders or templates

## Invocation Patterns

### Automatic Delegation
```
> Help me refactor the authentication module
Claude: [Automatically invokes general-purpose agent when appropriate]
```

### Explicit Invocation
```
> Use the code-reviewer agent to check my recent changes
> Have the debugger agent investigate this error
```

### CLI Invocation
```bash
claude --agents '{"reviewer":{"description":"Reviews code","prompt":"You are a code reviewer"}}'
```

### Agent Management
```
/agents  # Opens interactive interface to create/edit/delete agents
```

## Configuration Examples

### Example 1: Code Reviewer Agent

```markdown
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability after code changes.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards of code quality and security.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
- Performance considerations addressed

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

### Example 2: Debugger Agent

```markdown
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

Debugging process:
- Analyze error messages and logs
- Check recent code changes
- Form and test hypotheses
- Add strategic debug logging
- Inspect variable states

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendations

Focus on fixing the underlying issue, not the symptoms.
```

## Best Practices

1. **Design Focused Agents**
   - Single, clear responsibility per agent
   - Better performance and predictability
   - Easier to reason about behavior

2. **Write Detailed Prompts**
   - Include specific instructions and examples
   - Define constraints and best practices
   - More guidance = better performance

3. **Limit Tool Access**
   - Only grant necessary tools
   - Improves security and focus
   - Prevents agent from taking unexpected actions

4. **Use Specific Descriptions**
   - Clear trigger terms for auto-invocation
   - Include "when to use" guidance
   - Helps Claude match requests to agents

5. **Version Control**
   - Check project agents into git
   - Team can benefit and improve collaboratively
   - Track agent evolution

6. **Start with Claude-Generated**
   - Have Claude generate initial agent
   - Then customize to make it yours
   - Results in well-structured agents

7. **Test with Team**
   - Have teammates use agents
   - Gather feedback on activation and clarity
   - Iterate based on usage patterns

## Key Findings

### 1. Two-Tier Architecture
Agents have separate context windows from main conversation, enabling specialized expertise while preventing context pollution.

### 2. Flexible Configuration
Four configuration methods (file-based project, file-based user, CLI flag, plugin) provide flexibility for different use cases.

### 3. Model Flexibility
Unlike Skills, agents can specify different models (`sonnet`, `opus`, `haiku`, or `inherit`), allowing performance vs capability tradeoffs per agent.

### 4. Tool Restriction at Agent Level
Both agents and Skills support tool restriction, but agents expose this as primary configuration.

### 5. Automatic Invocation is Primary Pattern
Agents are designed primarily for automatic/model-invoked delegation based on task matching.

### 6. Built-in Agents Provide Framework
Plan, Explore, and General-purpose agents solve common needs and serve as framework for custom agents.

### 7. Permission Mode Control
Agents can control permission handling behavior independently with `permissionMode` field.

## Evidence/Sources

**Official Documentation:**
- https://code.claude.com/docs/en/sub-agents.md
- https://code.claude.com/docs/en/cli-reference.md
- https://code.claude.com/docs/en/skills.md
- https://code.claude.com/docs/en/slash-commands.md
- https://code.claude.com/docs/en/settings.md
