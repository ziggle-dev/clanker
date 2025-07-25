# Clanker API Reference

Complete API documentation for Clanker's programmatic interfaces.

## Command Line Interface

### Basic Usage

```bash
clanker [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--api-key <key>` | `-k` | API key for AI provider | ENV: CLANKER_API_KEY |
| `--base-url <url>` | `-u` | Base URL for API endpoint | Provider default |
| `--model <model>` | `-m` | AI model to use | Provider default |
| `--provider <name>` | | AI provider (openai, anthropic, custom) | grok |
| `--prompt <text>` | `-p` | Process single prompt (headless mode) | Interactive mode |
| `--directory <dir>` | `-d` | Set working directory | Current directory |
| `--debug` | | Enable debug logging | false |
| `--list-tools` | | List available tools and exit | false |
| `--load-dynamic-tools` | | Load tools from .clanker/tools | true |
| `--tools-path <path>` | | Custom dynamic tools directory | .clanker/tools |
| `--no-confirmations` | | Skip all confirmations (dangerous!) | false |
| `--help` | `-h` | Show help | |
| `--version` | `-v` | Show version | |

### Examples

```bash
# Interactive mode with specific model
clanker --model gpt-4

# Headless execution
clanker --prompt "analyze package.json for vulnerabilities"

# Custom provider
clanker --base-url http://localhost:11434/v1 --model llama2

# Debug mode with tool listing
clanker --debug --list-tools
```

## Configuration API

### Settings Structure

```typescript
interface UserSettings {
  apiKey?: string;
  provider?: 'grok' | 'openai' | 'anthropic' | 'custom';
  model?: string;
  customBaseURL?: string;
  confirmBeforeExecute?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  defaultToolSettings?: {
    [toolId: string]: any;
  };
}
```

### Configuration Files

#### User Settings (`~/.clanker/user-settings.json`)

```json
{
  "apiKey": "sk-...",
  "provider": "openai",
  "model": "gpt-4",
  "confirmBeforeExecute": true,
  "theme": "dark"
}
```

#### Project Instructions (`./CLANKER.md`)

```markdown
# Project Context

This project uses:
- TypeScript with strict mode
- React functional components
- Vitest for testing

## Coding Standards
- Prefer const over let
- Use async/await over promises
- Follow existing naming conventions
```

## Tool Development API

### Tool Interface

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  inputSchema: ZodSchema;
  outputSchema?: ZodSchema;
  execute: ToolExecutor;
  renderResult?: ResultRenderer;
  requiresConfirmation?: boolean;
  getConfirmationMessage?: ConfirmationMessageGetter;
}
```

### Tool Builder API

```typescript
import { createTool } from '@ziggle/clanker';

const tool = createTool()
  .id('my_tool')
  .name('My Tool')
  .description('Tool description')
  .stringArg('input', 'Input description', { required: true })
  .numberArg('count', 'Count description', { default: 1 })
  .booleanArg('verbose', 'Verbose output', { default: false })
  .execute(async (args, context) => {
    // Implementation
    return { success: true, output: 'Result' };
  })
  .build();
```

### Argument Types

#### String Arguments

```typescript
.stringArg(name: string, description: string, options?: {
  required?: boolean;
  default?: string;
  enum?: string[];
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
})
```

#### Number Arguments

```typescript
.numberArg(name: string, description: string, options?: {
  required?: boolean;
  default?: number;
  min?: number;
  max?: number;
  integer?: boolean;
})
```

#### Boolean Arguments

```typescript
.booleanArg(name: string, description: string, options?: {
  required?: boolean;
  default?: boolean;
})
```

#### Array Arguments

```typescript
.arrayArg(name: string, description: string, itemType: 'string' | 'number', options?: {
  required?: boolean;
  default?: any[];
  minItems?: number;
  maxItems?: number;
  unique?: boolean;
})
```

#### Object Arguments

```typescript
.objectArg(name: string, description: string, schema: ZodObject, options?: {
  required?: boolean;
  default?: object;
})
```

### Execution Context

```typescript
interface ExecutionContext {
  registry: ToolRegistry;          // Access other tools
  logger: Logger;                  // Logging utilities
  confirmationService: ConfirmationService;
  workingDirectory: string;
  settings: UserSettings;
  reportProgress: (percent: number, message?: string) => void;
  signal?: AbortSignal;           // For cancellation
}
```

### Tool Registry API

```typescript
interface ToolRegistry {
  // Tool management
  register(tool: Tool): void;
  unregister(toolId: string): void;
  get(toolId: string): Tool | undefined;
  list(): Tool[];
  
  // Tool execution
  execute<T = any>(
    toolId: string, 
    args: Record<string, any>
  ): Promise<ToolResult<T>>;
  
  // Batch operations
  executeMany(
    executions: Array<{ toolId: string; args: any }>
  ): Promise<ToolResult[]>;
  
  // Tool composition
  compose(
    type: 'sequence' | 'parallel' | 'map',
    toolIds: string[],
    options?: CompositionOptions
  ): Tool;
}
```

## Agent API

### GrokAgent

```typescript
class GrokAgent extends EventEmitter {
  constructor(options: GrokAgentOptions);
  
  // Chat methods
  async chat(
    messages: GrokMessage[],
    onChunk?: (chunk: StreamingChunk) => void,
    streaming?: boolean
  ): Promise<string | void>;
  
  // Registry access
  getRegistry(): ToolRegistry;
  
  // Statistics
  getToolStats(): ToolStatistics;
  getTokenUsage(): TokenUsage;
  
  // Events
  on(event: 'chunk', listener: (chunk: StreamingChunk) => void): this;
  on(event: 'tool-start', listener: (tool: string, args: any) => void): this;
  on(event: 'tool-end', listener: (tool: string, result: ToolResult) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}
```

### Message Types

```typescript
interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}
```

### Streaming Types

```typescript
interface StreamingChunk {
  type: 'content' | 'tool_calls' | 'tool_result' | 'done' | 'token_count';
  content?: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
  tokenCount?: number;
}
```

## State Management API

### Store Structure

```typescript
interface Store {
  // UI State
  currentStage: Stage;
  settings: UserSettings;
  
  // Chat State
  messages: Message[];
  inputValue: string;
  isProcessing: boolean;
  
  // Execution State
  executions: ToolExecution[];
  currentExecution?: ToolExecution;
  
  // Confirmation State
  pendingConfirmation?: ConfirmationRequest;
  confirmationHistory: ConfirmationDecision[];
}
```

### Actions

```typescript
const actions = {
  // Navigation
  setStage(stage: Stage): void;
  
  // Settings
  updateSettings(settings: Partial<UserSettings>): void;
  
  // Chat
  addMessage(message: Message): void;
  clearMessages(): void;
  setInputValue(value: string): void;
  
  // Execution
  startExecution(toolId: string, args: any): void;
  updateExecution(id: string, update: Partial<ToolExecution>): void;
  completeExecution(id: string, result: ToolResult): void;
  
  // Confirmation
  requestConfirmation(request: ConfirmationRequest): void;
  resolveConfirmation(decision: ConfirmationDecision): void;
};
```

### React Hooks

```typescript
// Access store state
import { useSnapshot } from 'valtio';
import { store } from '@ziggle/clanker';

function MyComponent() {
  const snap = useSnapshot(store);
  return <div>{snap.currentStage}</div>;
}

// Use actions
import { actions } from '@ziggle/clanker';

function MyButton() {
  return (
    <button onClick={() => actions.setStage('settings')}>
      Settings
    </button>
  );
}
```

## UI Component API

### Custom Tool UI

```typescript
interface ResultRenderer {
  (props: {
    result: ToolResult;
    args: any;
    isExecuting: boolean;
  }): React.ReactElement;
}

// Example
const customRenderer: ResultRenderer = ({ result, isExecuting }) => {
  if (isExecuting) {
    return <Spinner label="Processing..." />;
  }
  
  return (
    <Box flexDirection="column">
      <Text color={result.success ? 'green' : 'red'}>
        {result.success ? '✓' : '✗'} {result.output}
      </Text>
    </Box>
  );
};
```

### Form Components

```typescript
import { Form, FormInput, FormSelect, FormToggle } from '@ziggle/clanker/ui';

<Form onSubmit={handleSubmit}>
  <FormInput
    name="path"
    label="File Path"
    placeholder="/path/to/file"
    required
  />
  
  <FormSelect
    name="format"
    label="Output Format"
    options={['json', 'yaml', 'toml']}
    default="json"
  />
  
  <FormToggle
    name="verbose"
    label="Verbose Output"
    default={false}
  />
</Form>
```

## Error Handling

### Error Types

```typescript
class ToolExecutionError extends Error {
  constructor(
    public toolId: string,
    public args: any,
    public cause: Error
  );
}

class ConfirmationCancelledError extends Error {
  constructor(public toolId: string);
}

class TokenLimitError extends Error {
  constructor(
    public used: number,
    public limit: number
  );
}
```

### Error Handling Patterns

```typescript
// In tools
try {
  const result = await riskyOperation();
  return { success: true, output: result };
} catch (error) {
  return {
    success: false,
    error: error.message,
    details: error.stack,
    suggestion: 'Try checking file permissions'
  };
}

// In agent
agent.on('error', (error) => {
  if (error instanceof TokenLimitError) {
    // Handle token limit
  } else if (error instanceof ToolExecutionError) {
    // Handle tool failure
  }
});
```

## Testing Tools

### Unit Testing

```typescript
import { createTestRegistry } from '@ziggle/clanker/testing';

describe('MyTool', () => {
  it('should process input correctly', async () => {
    const registry = createTestRegistry();
    const tool = require('./my-tool').default;
    
    registry.register(tool);
    
    const result = await registry.execute('my_tool', {
      input: 'test'
    });
    
    expect(result.success).toBe(true);
    expect(result.output).toBe('expected output');
  });
});
```

### Integration Testing

```typescript
import { createTestAgent } from '@ziggle/clanker/testing';

describe('Tool Integration', () => {
  it('should work with agent', async () => {
    const agent = createTestAgent({
      tools: ['my_tool', 'read_file']
    });
    
    const response = await agent.chat([
      { role: 'user', content: 'Use my tool on test.txt' }
    ]);
    
    expect(response).toContain('processed');
  });
});
```

## Advanced Usage

### Custom Providers

```typescript
import { AIProvider } from '@ziggle/clanker';

class CustomProvider implements AIProvider {
  async complete(
    messages: Message[],
    options: CompletionOptions
  ): Promise<CompletionResult> {
    // Custom implementation
  }
  
  async stream(
    messages: Message[],
    options: StreamOptions,
    onChunk: (chunk: any) => void
  ): Promise<void> {
    // Custom streaming implementation
  }
}
```

### Middleware

```typescript
registry.use({
  name: 'timing-middleware',
  pre: async (context, next) => {
    context.startTime = Date.now();
    return next();
  },
  post: async (context, result, next) => {
    const duration = Date.now() - context.startTime;
    console.log(`${context.toolId}: ${duration}ms`);
    return next();
  }
});
```

### Custom Confirmations

```typescript
const customConfirmation: ConfirmationService = {
  async requestConfirmation(request: ConfirmationRequest): Promise<boolean> {
    // Custom UI implementation
    return await showCustomDialog(request);
  }
};
```

## Performance Considerations

### Token Optimization

```typescript
// Configure token limits
const agent = new GrokAgent({
  maxTokens: 4000,
  maxCompletionTokens: 1000,
  truncationStrategy: 'sliding-window'
});

// Monitor usage
agent.on('token-count', ({ input, output, total }) => {
  console.log(`Tokens used: ${total}`);
});
```

### Tool Execution Optimization

```typescript
// Parallel execution
const results = await registry.executeMany([
  { toolId: 'read_file', args: { path: 'file1.txt' } },
  { toolId: 'read_file', args: { path: 'file2.txt' } },
  { toolId: 'read_file', args: { path: 'file3.txt' } }
]);

// Cached execution
const cachedTool = createTool()
  .id('expensive_operation')
  .cache({ ttl: 3600 }) // Cache for 1 hour
  .execute(async () => {
    // Expensive computation
  });
```

## Security

### Input Sanitization

```typescript
// Built-in path traversal protection
const sanitizedPath = sanitizePath(userInput);

// Command injection protection
const sanitizedCommand = escapeShellArg(userCommand);
```

### Permission Checks

```typescript
// File system permissions
const canWrite = await checkWritePermission(path);
if (!canWrite) {
  throw new PermissionError('Cannot write to system directories');
}
```

### API Key Management

```typescript
// Never log sensitive data
logger.info('Using API key:', maskApiKey(apiKey));
// Output: "Using API key: sk-...abc123"
```