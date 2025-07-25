# Clanker Tools Documentation

This guide covers the built-in tools available in Clanker and how to create your own custom tools.

## Built-in Tools

### File Operations

#### `read_file`
Read the contents of a file.

```typescript
{
  path: string  // Path to the file to read
}
```

Example: "Read the contents of src/index.ts"

#### `write_to_file`
Write content to a file (creates if doesn't exist).

```typescript
{
  path: string     // Path to the file
  content: string  // Content to write
}
```

Example: "Create a new README.md with project documentation"

#### `multi_edit`
Advanced file editing with multiple changes. Supports various diff formats.

```typescript
{
  path: string              // Path to the file
  edits: Array<{
    search: string         // Text to find
    replace: string        // Text to replace with
    options?: {
      regex?: boolean      // Use regex matching
      case_sensitive?: boolean
      whole_word?: boolean
    }
  }>
}
```

Example: "Replace all console.log with logger.info in app.ts"

#### `view_file`
View a file with syntax highlighting and line numbers.

```typescript
{
  path: string      // Path to the file
  start_line?: number  // Starting line (optional)
  end_line?: number    // Ending line (optional)
}
```

Example: "Show me lines 50-100 of server.ts"

#### `remove`
Remove files or directories with confirmation.

```typescript
{
  paths: string[]   // Paths to remove
  recursive?: boolean  // Remove directories recursively
}
```

Example: "Delete all .tmp files in the build directory"

### System Operations

#### `bash`
Execute shell commands with timeout and confirmation.

```typescript
{
  command: string      // Command to execute
  timeout?: number     // Timeout in milliseconds
  cwd?: string        // Working directory
}
```

Example: "Run npm test and show me the output"

#### `pwd`
Get the current working directory.

No parameters required.

Example: "What directory am I in?"

#### `list`
List files and directories with filtering.

```typescript
{
  path?: string       // Directory to list (default: current)
  pattern?: string    // Filter pattern (glob)
  recursive?: boolean // List recursively
}
```

Example: "Show me all TypeScript files in src/"

### Search Operations

#### `search`
Powerful file search using ripgrep.

```typescript
{
  query: string         // Search query (supports regex)
  path?: string        // Directory to search
  file_types?: string[] // File extensions to include
  case_sensitive?: boolean
  whole_word?: boolean
  show_context?: boolean // Show surrounding lines
  context_lines?: number // Number of context lines
}
```

Example: "Find all TODO comments in TypeScript files"

### Task Management

#### `create_todo_list`
Create a visual todo list for tracking tasks.

```typescript
{
  todos: Array<{
    id: string
    content: string
    status: 'pending' | 'in_progress' | 'completed'
    priority: 'low' | 'medium' | 'high'
  }>
}
```

Example: "Create a todo list for refactoring the auth module"

#### `update_todo_list`
Update an existing todo list.

```typescript
{
  updates: Array<{
    id: string
    content?: string
    status?: 'pending' | 'in_progress' | 'completed'
    priority?: 'low' | 'medium' | 'high'
  }>
}
```

Example: "Mark task 1 as completed"

#### `list_todos`
Display the current todo list.

No parameters required.

Example: "Show me the current todo list"

### AI Enhancement

#### `summarize`
Use AI to summarize text or code.

```typescript
{
  content: string        // Content to summarize
  style?: 'brief' | 'detailed' | 'technical'
  max_length?: number    // Maximum summary length
}
```

Example: "Summarize this function's purpose"

### User Interaction

#### `input`
Get input from the user during execution.

```typescript
{
  prompt: string         // Question to ask
  type?: 'text' | 'confirm' | 'select'
  choices?: string[]     // For select type
  default?: string | boolean
}
```

Example: "Ask the user which branch to deploy"

## Creating Custom Tools

### Basic Tool Structure

Create a new file in `.clanker/tools/` directory:

```typescript
// ~/.clanker/tools/my-custom-tool.ts
import { createTool } from '@ziggle/clanker';
import { z } from 'zod';

export default createTool({
  id: 'my_custom_tool',
  name: 'My Custom Tool',
  description: 'Does something useful',
  
  // Define input schema using Zod
  inputSchema: z.object({
    input: z.string().describe('Tool input'),
    count: z.number().optional().describe('Optional count')
  }),
  
  // Execute function
  execute: async ({ input, count = 1 }) => {
    try {
      // Your tool logic here
      const result = processInput(input, count);
      
      return {
        success: true,
        output: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});
```

### Advanced Tool Features

#### 1. Custom UI Rendering

```typescript
export default createTool({
  // ... basic config
  
  renderResult: ({ result, isExecuting }) => {
    if (isExecuting) {
      return <Spinner label="Processing..." />;
    }
    
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Success</Text>
        <Text>{result.output}</Text>
      </Box>
    );
  }
});
```

#### 2. Progress Reporting

```typescript
export default createTool({
  // ... basic config
  
  execute: async ({ input }, { reportProgress }) => {
    reportProgress(0, 'Starting...');
    
    for (let i = 0; i < 100; i += 10) {
      await doWork();
      reportProgress(i, `Processing ${i}%`);
    }
    
    reportProgress(100, 'Complete!');
    return { success: true };
  }
});
```

#### 3. Using Other Tools

```typescript
export default createTool({
  // ... basic config
  
  execute: async ({ files }, { registry }) => {
    // Use other tools via registry
    for (const file of files) {
      const content = await registry.execute('read_file', { 
        path: file 
      });
      
      if (content.success) {
        // Process content
      }
    }
    
    return { success: true };
  }
});
```

#### 4. Confirmation Handling

```typescript
export default createTool({
  // ... basic config
  requiresConfirmation: true,
  
  getConfirmationMessage: (args) => ({
    title: 'Dangerous Operation',
    description: `This will delete ${args.files.length} files`,
    consequences: [
      'Files cannot be recovered',
      'Related dependencies may break'
    ]
  })
});
```

### Tool Best Practices

#### 1. Input Validation

Always validate inputs thoroughly:

```typescript
inputSchema: z.object({
  path: z.string()
    .min(1, 'Path cannot be empty')
    .refine(path => !path.includes('..'), 'Path traversal not allowed'),
  
  options: z.object({
    recursive: z.boolean().default(false)
  }).optional()
})
```

#### 2. Error Handling

Provide clear error messages:

```typescript
execute: async ({ path }) => {
  if (!fs.existsSync(path)) {
    return {
      success: false,
      error: `File not found: ${path}`,
      suggestion: 'Check the file path and try again'
    };
  }
  // ... rest of logic
}
```

#### 3. Performance

For long operations:
- Report progress regularly
- Support cancellation
- Consider chunking large operations
- Add reasonable timeouts

#### 4. Documentation

Document your tool well:

```typescript
export default createTool({
  id: 'analyze_deps',
  name: 'Analyze Dependencies',
  description: 'Analyzes npm dependencies for security and updates',
  
  examples: [
    {
      description: 'Basic usage',
      args: { path: './package.json' }
    },
    {
      description: 'With security audit',
      args: { path: './package.json', audit: true }
    }
  ],
  
  notes: [
    'Requires npm to be installed',
    'May take time for large projects',
    'Results are cached for 1 hour'
  ]
});
```

### Tool Distribution

#### Sharing Tools

1. Create a GitHub repository for your tools
2. Add installation instructions
3. Consider publishing to npm as `@yourname/clanker-tools`

#### Installing Community Tools

```bash
# Clone tool repository
git clone https://github.com/user/awesome-clanker-tools
cp awesome-clanker-tools/*.ts ~/.clanker/tools/

# Or via npm (if published)
npm install -g @user/clanker-tools
```

### Tool Ideas

Here are some ideas for custom tools:

1. **Git Operations**: Automated commits, PR creation, branch management
2. **Database Tools**: Schema migrations, data queries, backups
3. **API Testing**: Request builders, response validators, load testing
4. **Code Generation**: Boilerplate creators, scaffold generators
5. **DevOps**: Docker commands, K8s operations, CI/CD triggers
6. **Documentation**: API doc generation, README updates, changelog creation
7. **Refactoring**: Pattern detection, code transformation, dependency updates

## Tool Development Tips

### 1. Start Simple

Begin with a basic tool and add features incrementally:

```typescript
// Version 1: Basic
export default createTool({
  id: 'count_lines',
  execute: async ({ path }) => {
    const content = await fs.readFile(path, 'utf-8');
    const lines = content.split('\n').length;
    return { success: true, output: `${lines} lines` };
  }
});
```

### 2. Test Thoroughly

Test your tools before use:

```bash
# Create test script
node -e "
  const tool = require('./my-tool.ts').default;
  tool.execute({ input: 'test' }).then(console.log);
"
```

### 3. Consider Edge Cases

- Empty inputs
- Missing files
- Permission errors
- Network failures
- Large data sets

### 4. Make Tools Composable

Design tools that work well together:

```typescript
// Tool 1: Find files
const files = await registry.execute('find_files', { 
  pattern: '*.test.ts' 
});

// Tool 2: Run tests on found files
const results = await registry.execute('run_tests', { 
  files: files.output 
});
```

## Conclusion

Clanker's tool system is designed to be:
- **Extensible**: Easy to add new capabilities
- **Discoverable**: AI can understand and use tools
- **Safe**: Confirmations and validations built-in
- **Composable**: Tools can work together

Start with the built-in tools, then create your own as needs arise. The tool system is the heart of Clanker's extensibility.