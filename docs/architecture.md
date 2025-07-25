# Clanker Architecture

This document provides a technical deep dive into Clanker's architecture, design decisions, and implementation details.

## Overview

Clanker is built as a modular, extensible system with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                   Terminal UI (React/Ink)               │
├─────────────────────────────────────────────────────────┤
│                    State Management (Valtio)            │
├─────────────────────────────────────────────────────────┤
│                      Agent System                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Client    │  │   Registry   │  │   Executor     │  │
│  │  (API calls)│  │ (Tool mgmt)  │  │ (Tool runner)  │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                      Tool System                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐   │
│  │  File   │  │  Bash   │  │ Search  │  │  Custom   │   │
│  │  Tools  │  │  Tool   │  │  Tool   │  │   Tools   │   │
│  └─────────┘  └─────────┘  └─────────┘  └───────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Entry Point (`src/index.ts`)

The main entry point handles:
- CLI argument parsing via Commander.js
- Configuration loading (env vars, settings files, CLI args)
- Mode selection (interactive vs headless)
- React app initialization for interactive mode

Key design decision: Single binary that can run both interactively and headless.

### 2. Agent System (`src/clanker/`)

#### GrokAgent (`agent.ts`)

The central orchestrator that:
- Manages conversations with the AI model
- Handles tool execution flows
- Tracks token usage
- Emits events for UI updates

```typescript
class GrokAgent extends EventEmitter {
    private client: GrokClient;
    private registry: ToolRegistry;
    private tokenCounter: TokenCounter;
    
    async chat(messages: GrokMessage[], streaming?: boolean): Promise<string | void>
}
```

#### GrokClient (`client.ts`)

Abstracts API communication:
- Supports multiple providers (OpenAI, Anthropic, etc.)
- Handles streaming responses
- Manages rate limiting and retries

### 3. Registry System (`src/registry/`)

The registry pattern enables dynamic tool management:

```typescript
interface ToolRegistry {
    register(tool: Tool): void;
    get(id: string): Tool | undefined;
    list(): Tool[];
    execute(id: string, args: any): Promise<ToolResult>;
}
```

Key features:
- Dynamic tool loading from filesystem
- Tool validation and schema enforcement
- Execution tracking and statistics
- Retry logic for failed executions

### 4. Tool System (`src/tools/dynamic/`)

Tools are self-contained modules with:
- TypeScript/TSX implementation
- Clear input/output contracts
- Built-in UI rendering capabilities
- Error handling

Example tool structure:
```typescript
export default createTool({
    id: 'read_file',
    name: 'Read File',
    description: 'Read contents of a file',
    inputSchema: z.object({
        path: z.string().describe('File path to read')
    }),
    execute: async ({ path }) => {
        const content = await fs.readFile(path, 'utf-8');
        return { success: true, output: content };
    }
});
```

### 5. State Management (`src/store/`)

Valtio-based reactive state management:

```typescript
const store = proxy({
    messages: [],
    currentStage: 'chat',
    settings: {},
    executions: [],
    // ... more state
});
```

Benefits:
- Simple, proxy-based API
- React integration via `useSnapshot`
- Works outside React components
- Mutation tracking for debugging

### 6. UI System (`src/ui/`)

React-based terminal UI using Ink:

```
AppContainer
├── StageRouter (manages screens)
├── ChatScreen
│   ├── MessageList
│   ├── InputArea
│   └── StatusBar
├── SettingsScreen
├── ConfirmationModal
└── ... other screens
```

Key patterns:
- Functional components with hooks
- Custom hooks for business logic
- Form handling with custom Form component
- Keyboard navigation support

## Key Design Patterns

### 1. Tool as Interface

Every capability is expressed as a tool:
- Consistent interface for all operations
- AI can discover and use tools dynamically
- Users can extend functionality without modifying core

### 2. Registry Pattern

Dynamic registration enables:
- Runtime tool discovery
- Plugin-like extensibility
- Hot reloading during development

### 3. Event-Driven Updates

Agent emits events for:
- Streaming content chunks
- Tool execution status
- Token usage updates

UI subscribes to events for real-time feedback.

### 4. Confirmation Flow

Safety-first approach:
- Destructive operations require confirmation
- Settings for "don't ask again"
- Override via CLI flags

### 5. Error Recovery

Multi-level error handling:
- Tool-level try/catch
- Registry-level retry logic
- Agent-level fallback strategies
- UI-level error display

## Technical Innovations

### Order-Invariant Diff Algorithm

Located in `src/utils/order-invariant-apply.ts`:

```typescript
function orderInvariantApply(originalContent: string, diffs: Diff[]): {
    content: string;
    results: DiffResult[];
}
```

Key insights:
1. Sort diffs by position (reverse order)
2. Apply from end to beginning (preserves positions)
3. Handle overlapping changes
4. Support multiple diff formats

### Multi-Format Support

The edit tools support various formats:
- Unified diff patches
- Search/replace pairs
- Marker-based sections (`<<<<<<<` / `>>>>>>>`)
- Direct content arrays

### Streaming Architecture

Efficient handling of AI responses:
- Parse streaming chunks in real-time
- Update UI incrementally
- Handle tool calls mid-stream
- Maintain conversation context

## Extension Points

### Custom Tools

Add tools by creating files in `.clanker/tools/`:

```typescript
// ~/.clanker/tools/my-tool.ts
export default createTool({
    id: 'my_tool',
    // ... tool definition
});
```

### Custom Providers

Add AI providers by implementing the client interface:

```typescript
class CustomProvider implements AIProvider {
    async complete(messages: Message[]): Promise<Response> {
        // ... implementation
    }
}
```

### UI Extensions

Add screens by:
1. Creating component in `src/ui/screens/`
2. Adding to `StageRouter`
3. Updating stage management in store

## Performance Considerations

### Token Management

- Count tokens before sending to API
- Track usage across conversation
- Warn when approaching limits
- Prune old messages if needed

### Tool Execution

- Parallel execution where possible
- Timeout handling for long operations
- Progress reporting for multi-step tools
- Caching for repeated operations

### UI Responsiveness

- Debounced input handling
- Virtual scrolling for long lists
- Lazy loading of file contents
- Efficient diff rendering

## Security Considerations

### File System Access

- Path validation to prevent traversal
- Read permissions check
- Confirmation for writes
- No access outside working directory

### Command Execution

- Command sanitization
- Timeout enforcement
- Resource limits
- Confirmation for destructive commands

### API Key Management

- Never logged or displayed
- Stored in user config with permissions
- Environment variable support
- Per-project overrides

## Future Architecture Directions

### Planned Enhancements

1. **Tool Composition**: Define tools that compose other tools
2. **Async Tool Execution**: Better handling of long-running operations
3. **Tool Versioning**: Support multiple versions of tools
4. **Remote Tools**: Execute tools on remote systems
5. **Tool Marketplace**: Share and discover community tools

### Scaling Considerations

As Clanker grows:
- Move to worker threads for tool execution
- Implement tool sandboxing
- Add distributed execution support
- Create tool dependency management

## Conclusion

Clanker's architecture prioritizes:
- **Extensibility**: Easy to add new capabilities
- **Safety**: Confirmations and validations throughout
- **Performance**: Efficient execution and UI updates
- **Developer Experience**: Clear patterns and good defaults

The modular design ensures that each component can evolve independently while maintaining clean interfaces between systems.