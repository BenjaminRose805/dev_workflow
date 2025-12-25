# Task 3.5: Agent-to-Agent Communication Patterns

## Communication Mechanisms

Claude agents communicate through multiple mechanisms:

1. **Task Tool**: The primary communication mechanism for spawning and coordinating subagents
   - Invoked via the `Task` tool when included in `allowedTools`
   - Enables parent agents to delegate work to specialized subagents
   - Subagents cannot spawn their own subagents (one level of nesting only)

2. **Message Passing**: Results flow back through tool completion blocks
   - Parent agent receives subagent results via `tool_result` blocks
   - Subagent invocations tracked via `parent_tool_use_id` field in messages
   - Enables context preservation across agent boundaries

3. **Explicit Invocation**: Direct agent naming in prompts
   - Example: "Use the code-reviewer agent to review this codebase"
   - Forces Claude to delegate to specific subagent regardless of context

4. **Automatic Delegation**: Claude decides to invoke agents based on:
   - Task description in user prompt
   - Subagent `description` field matching task needs
   - Current context and available tools

## Task Tool

The Task tool is the foundation of agent-to-agent communication:

### How It Works
- Included in parent agent's `allowedTools` configuration
- Claude invokes it with parameters specifying target subagent
- Spawns a new agent instance with separate context window
- Subagent operates independently with own tool access
- Results returned to parent via standard tool result mechanism

### Parameters
- `subagent_type`: Name of the subagent to invoke
- `description`: What the subagent should accomplish
- `prompt`: Task-specific instructions (optional override)
- `resume`: Agent ID to continue previous conversation (optional)

### Invocation Detection
Monitor for `tool_use` blocks with `name: "Task"` in message content:
```python
if block.type == 'tool_use' and block.name == 'Task':
    subagent_name = block.input.get('subagent_type')
```

### Key Constraints
- Subagents cannot invoke other subagents
- Subagents have fresh context each invocation (unless resumed)
- No shared memory between parent and child agents
- Data exchange only through return values

## Data Flow

### From Parent to Child
1. Task tool invocation carries task description and parameters
2. Subagent receives full prompt context
3. Subagent inherits parent's tools (unless restricted)
4. No direct access to parent's conversation history

### From Child to Parent
1. Subagent completes work and returns results
2. Results captured in `tool_result` block
3. Parent agent receives results in conversation
4. Parent integrates findings into its reasoning

### Context Isolation
- Each subagent maintains separate context window
- Prevents information overload in parent agent
- Subagent's exploratory work doesn't pollute parent context
- Example: Research subagent explores 50+ files, parent sees only findings

### Data Passing Limitations
- Results must be serializable (text, structured data)
- Large result sets may require summarization
- Binary data requires base64 encoding
- File references use absolute paths

## Parallel Execution

### Multiple Subagents Running Concurrently
Claude can invoke multiple subagents simultaneously when:
- Tasks are independent (no data dependencies)
- Multiple `tool_use` blocks appear in single response
- Each subagent has distinct responsibility

### Example Parallel Pattern
```
Main Agent
├── Subagent 1: Code Style Review (Read, Grep, Glob)
├── Subagent 2: Security Scanner (Read, Grep, Glob)
└── Subagent 3: Test Coverage (Bash, Read, Grep)
     ↓
Results aggregated by main agent
```

### Performance Benefits
- Specialized agents run concurrently
- Time for code review reduced from minutes to seconds
- Independent analyses don't block each other
- Orchestrator waits for all subagents to complete

### Constraints on Parallelization
- Subagents don't communicate with each other
- All parallel agents must be independent
- Parent agent must wait for all results before continuing
- No true inter-subagent communication in current implementation

## Orchestration Patterns

### 1. Orchestrator-Worker Pattern (Recommended)
Lead agent coordinates multiple specialized workers:
- Lead agent analyzes task and develops strategy
- Spawns appropriate subagents for specific work
- Aggregates results and synthesizes findings
- Best for complex multi-step workflows

### 2. Sequential Pipeline Pattern
Agents execute in series with output feeding to next:
- Example: analyzer → architect → implementer → tester → security auditor
- Each stage builds on previous results
- Requires explicit sequencing in parent prompts
- Good for deterministic workflows with clear dependencies

### 3. Parallel Specialization Pattern
Multiple independent agents work simultaneously:
- Example: UI agent, API agent, Database agent
- Each agent handles specific domain
- Results merged by orchestrator
- Good when subagents have low interdependencies

### 4. Hierarchical Delegation Pattern
- Parent delegates to intermediate coordinating subagents
- Intermediate agents coordinate other tasks
- Limited to one level (subagents can't spawn subagents)
- Workaround: Parent orchestrates all coordination

### 5. Resumable Agent Pattern
Continue previous agent conversation with full context:
- Capture `agentId` from first invocation
- Use `resume` parameter to continue analysis
- Maintains context across multiple sessions
- Useful for iterative refinement

## Limitations

### Communication Constraints
1. **One-way data flow**: Information passes up, not sideways between siblings
2. **No inter-agent communication**: Subagents cannot invoke each other
3. **No shared state**: Each agent has isolated context
4. **Result format restrictions**: Must serialize to text/JSON
5. **One level nesting**: Subagents cannot spawn other subagents

### Performance Limitations
1. **Token overhead**: Multi-agent systems use ~15x tokens vs single chat
2. **Latency**: Each subagent starts fresh (unless resumed)
3. **Context window isolation**: Large intermediate results need summarization
4. **Synchronous execution**: Parent waits for all subagent results

### Tool Access Restrictions
1. **Tool inheritance**: Subagents inherit or have restricted tool access
2. **No Task in subagents**: Subagents cannot access Task tool
3. **Permission mode limitations**: Tool permissions don't cross agent boundaries

### Task Specification Challenges
1. **Clear task definition required**: Vague instructions cause duplicate work
2. **Output format specification**: Subagents need explicit output expectations
3. **Tool guidance**: Must specify which tools and sources to use
4. **Boundary definition**: Need clear scope to prevent scope creep

## Best Practices

### 1. Task Definition
- Provide clear, specific objectives for each subagent
- Define expected output format explicitly
- Specify tools and data sources to prioritize
- Include examples of expected output when possible

### 2. Agent Design
- Create focused subagents with single responsibility
- Write detailed system prompts with specific expertise
- Limit tool access to necessary tools only
- Use clear, action-oriented descriptions

### 3. Error Handling
- Implement retry logic for transient failures
- Include fallback strategies for complex queries
- Graceful degradation when hitting resource limits
- Monitor agent health and respawn on failure

### 4. Resource Management
- Summarize large result sets before returning
- Use absolute file paths for file references
- Monitor token usage (multi-agent burns 15x tokens)
- Consider cost implications of parallel execution

### 5. Orchestration Strategy
- Choose pattern based on task structure (sequential vs parallel)
- Default to orchestrator-worker for complex tasks
- Use parallel specialization for independent domains
- Reserve sequential pipelines for deterministic workflows

### 6. Context Management
- Keep agent prompts concise
- Leverage separate context windows to prevent information overload
- Return only essential findings to parent
- Use resumable agents for long-running analysis

## Key Findings

1. **Subagents enable effective task specialization** through isolated context and focused instructions, reducing context pollution in parent conversations

2. **The Task tool is the only mechanism for spawning subagents** and must be explicitly included in allowedTools configuration

3. **Parallel execution is supported but not inter-coordinated** - multiple subagents run concurrently but cannot communicate with each other

4. **Data flow is strictly hierarchical** - information flows from parent to child and back, with no sideways communication between siblings

5. **One-level nesting constraint** prevents complex hierarchical agent structures; parent orchestrator must coordinate all subagent work

6. **Token overhead is significant** - multi-agent systems consume approximately 15x more tokens than single-agent chat interactions

7. **Isolated context prevents bloat but requires clear task specifications** - subagents need detailed instructions and output format expectations

8. **Resumable agents enable iterative refinement** - agents can continue previous conversations while maintaining full context

9. **Two orchestration patterns emerge as most practical**:
   - Orchestrator-worker for complex workflows requiring coordination
   - Parallel specialization for independent domain-specific tasks

10. **Production-grade resilience** requires error handling at multiple levels: subagent retry logic, orchestrator health monitoring, and graceful failure recovery

## Evidence/Sources

### Claude Code Documentation
- [Subagents](https://code.claude.com/docs/en/sub-agents.md)
- [Common Workflows](https://code.claude.com/docs/en/common-workflows.md)
- [CLI Reference - Agents Flag](https://code.claude.com/docs/en/cli-reference.md#agents-flag-format)

### Claude Agent SDK Documentation
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview.md)
- [Subagents in the SDK](https://platform.claude.com/docs/en/agent-sdk/subagents.md)
- [Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md)

### Community Research & Best Practices
- [Multi-Agent Orchestration: Running 10+ Claude Instances in Parallel](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da)
- [Anthropic Engineering: Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Claude Flow: Agent Orchestration Platform](https://github.com/ruvnet/claude-flow)
- [Mastering Claude Agent Patterns: A Deep Dive for 2025](https://sparkco.ai/blog/mastering-claude-agent-patterns-a-deep-dive-for-2025)
