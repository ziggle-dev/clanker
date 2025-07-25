# Clanker: Reimagining Human-AI Collaboration

<div align="center">
  <h3>An exploration into fluid, extensible AI tool systems</h3>
  <p><em>When the boundary between thought and action dissolves</em></p>
</div>

## The Problem Space

Traditional AI assistants operate in a constrained paradigm: they can suggest, but rarely act. They exist behind APIs, processing text in → text out, disconnected from the environments where real work happens. This creates a fundamental impedance mismatch between AI capabilities and human workflows.

**Clanker** represents a different approach: what if AI agents could fluidly move between understanding intent and executing actions, all within the same conversational flow?

## Core Philosophy

### 1. **Tools as First-Class Citizens**

In Clanker's world, tools aren't afterthoughts or plugins—they're the primary interface through which AI agents interact with the world. Every capability, from reading files to running commands, is expressed as a tool with:

- **Clear contracts**: Strongly typed inputs and outputs
- **Composability**: Tools can call other tools
- **Discoverability**: Agents can inspect available tools and their capabilities
- **Safety**: Built-in confirmation flows for destructive operations

### 2. **The Order-Invariant Principle**

One of Clanker's breakthrough insights came from studying why traditional file editing approaches fail. Most diff algorithms assume order matters—that line 10 must come before line 11. But in real codebases, especially after refactoring, this assumption breaks down catastrophically.

Clanker's order-invariant algorithm ([inspired by Cline's research](https://cline.bot/blog/improving-diff-edits-by-10)) treats file editing as a constraint satisfaction problem:

- Find all possible matches for a change
- Resolve conflicts through context analysis
- Apply changes in reverse order to maintain position integrity
- Achieve 89% success rate vs 8% for traditional approaches

### 3. **Terminal-Native Experience**

While web UIs have their place, developers live in terminals. Clanker embraces this reality with a React-based terminal UI that proves CLIs don't have to be austere:

- Rich interactions with forms, modals, and navigation
- Syntax highlighting and markdown rendering
- Real-time execution feedback
- Keyboard-first design

## Architectural Insights

Clanker's architecture embodies several key principles:

**Registry Pattern**: Tools are dynamically loaded and registered, allowing for runtime extension without recompilation.

**Execution Tracking**: Every tool invocation is tracked, providing insights into agent behavior and enabling features like progress visualization.

**Multi-Provider Support**: Abstract over different AI providers (OpenAI, Anthropic, local models) while maintaining consistent behavior.

**State Management**: Using Valtio for reactive state that bridges the gap between React UI and background agent operations.

## Implications

### For Developers

Clanker shifts the paradigm from "AI as assistant" to "AI as collaborative agent". Instead of copy-pasting suggestions, developers can:

- Express intent at a higher level ("make this codebase follow our naming conventions")
- Trust that changes will be applied correctly, even in complex scenarios
- Extend capabilities through simple tool definitions
- Maintain control through confirmation flows

### For AI Systems

Clanker demonstrates that effective AI agents need:

- **Rich environment interaction**: Not just text, but files, processes, and system state
- **Failure recovery**: When tools fail, agents need to understand why and adapt
- **User trust**: Through transparency, confirmations, and predictable behavior

### For the Future

Clanker points toward a future where:

- AI agents become true development partners, not just suggestion engines
- The boundary between describing and doing dissolves
- Custom tools proliferate, creating ecosystems of specialized capabilities
- Terminal interfaces reclaim their place as powerful, beautiful interaction mediums

## Getting Started

```bash
npm install -g @ziggle/clanker
clanker
```

## Documentation

- **[Getting Started Guide](docs/getting-started.md)**: Installation, configuration, first steps
- **[Architecture Overview](docs/architecture.md)**: Technical deep dive into Clanker's design
- **[Tool Development](docs/tools.md)**: Creating and sharing custom tools
- **[API Reference](docs/api.md)**: Complete API documentation

## Contributing

Clanker is open source and welcomes contributions. Key areas of interest:

- New tool implementations
- Provider integrations
- UI/UX improvements
- Documentation and examples

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Ziggle](https://github.com/ziggle-dev)

---

<div align="center">
  <p><strong>Clanker is not just a tool—it's a bet on a different future for human-AI collaboration.</strong></p>
  <p>One where agents don't just suggest—they act, adapt, and evolve alongside us.</p>
</div>