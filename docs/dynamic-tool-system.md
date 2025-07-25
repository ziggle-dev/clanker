# Dynamic Tool System Documentation

Clanker now features a powerful dynamic tool system that allows for:
- Dynamic tool registration and discovery
- Tool composition patterns
- Runtime tool loading from `.clanker/tools` directory
- Type-safe argument validation
- Unified API for all tools

## Table of Contents
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Built-in Tools](#built-in-tools)
- [Creating Custom Tools](#creating-custom-tools)
- [Tool Composition](#tool-composition)
- [Dynamic Loading](#dynamic-loading)
- [Migration Guide](#migration-guide)

## Overview

The dynamic tool system replaces the previous hardcoded tool implementation with a flexible, extensible architecture. Tools are now first-class citizens that can be:
- Registered and discovered at runtime
- Composed into complex workflows
- Loaded from external files
- Validated automatically
- Extended with custom functionality

## Core Concepts

### Tool Definition

Every tool is defined using the `ToolDefinition` interface:

```typescript
interface ToolDefinition {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // What the tool does
  category?: ToolCategory;       // Organization category
  capabilities?: ToolCapability[]; // Required permissions
  arguments?: ArgumentSpec[];    // Input arguments
  execute: ToolExecutor;         // Execution function
}
```

### Tool Builder API

The preferred way to create tools is using the fluent builder API:

```typescript
import { createTool, ToolCategory, ToolCapability } from 'clanker';

const myTool = createTool()
  .id('my-tool')
  .name('My Custom Tool')
  .description('Does something useful')
  .category(ToolCategory.Utility)
  .capabilities(ToolCapability.FileRead)
  
  // Define arguments
  .stringArg('input', 'Input text', { required: true })
  .numberArg('count', 'Number of times', { default: 1 })
  
  // Implementation
  .execute(async (args, context) => {
    const { input, count } = args;
    
    // Tool logic here
    const result = input.repeat(count);
    
    return {
      success: true,
      output: result
    };
  })
  .build();
```

### Argument Types and Validation

The system supports comprehensive argument validation:

```typescript
// String argument with validation
.stringArg('email', 'User email', {
  required: true,
  validate: validators.email()
})

// Number argument with constraints
.numberArg('age', 'User age', {
  validate: validators.combine(
    validators.min(0),
    validators.max(150),
    validators.integer()
  )
})

// Array argument
.arrayArg('tags', 'Item tags', {
  default: [],
  validate: validators.unique()
})

// Custom validation
.stringArg('code', 'Access code', {
  validate: (value) => {
    if (!/^[A-Z]{3}-\d{3}$/.test(value)) {
      return 'Code must be format: XXX-123';
    }
    return true;
  }
})
```

## Built-in Tools

### Bash Tool
Execute shell commands with confirmation support.

```typescript
// Usage
registry.execute('bash', {
  command: 'ls -la',
  timeout: 30000
});
```

### File Tools

#### View File
Read files or list directories.

```typescript
registry.execute('view_file', {
  path: '/path/to/file.txt',
  start_line: 10,
  end_line: 20
});
```

#### Create File
Create new files with content.

```typescript
registry.execute('create_file', {
  path: '/path/to/new-file.txt',
  content: 'File content here'
});
```

#### String Replace Editor
Replace text in files.

```typescript
registry.execute('str_replace_editor', {
  path: '/path/to/file.txt',
  old_str: 'old text',
  new_str: 'new text',
  replace_all: true
});
```

### Search Tool
Unified search for text and files.

```typescript
registry.execute('search', {
  query: 'TODO',
  search_type: 'text',
  file_types: ['js', 'ts'],
  max_results: 50
});
```

### Todo Tools
Task management tools.

```typescript
// Create todo list
registry.execute('create_todo_list', {
  todos: [
    {
      id: '1',
      content: 'Implement feature',
      status: 'pending',
      priority: 'high'
    }
  ]
});

// Update todos
registry.execute('update_todo_list', {
  updates: [
    {
      id: '1',
      status: 'in_progress'
    }
  ]
});
```

## Creating Custom Tools

### Basic Tool

Create a simple custom tool:

```typescript
// .clanker/tools/word-count.ts
import { createTool, ToolCategory } from 'grok-cli';

export default createTool()
  .id('word-count')
  .name('Word Counter')
  .description('Count words in text')
  .category(ToolCategory.Utility)
  
  .stringArg('text', 'Text to analyze', { required: true })
  
  .execute(async (args) => {
    const words = args.text.split(/\s+/).filter(w => w.length > 0);
    
    return {
      success: true,
      output: `Word count: ${words.length}`,
      data: { count: words.length, words }
    };
  })
  .build();
```

### Tool with State

Tools can maintain state across executions:

```typescript
// .clanker/tools/counter.ts
let count = 0;

export default createTool()
  .id('counter')
  .name('Counter Tool')
  .description('Increment and track a counter')
  
  .stringArg('action', 'Action to perform', {
    enum: ['increment', 'decrement', 'reset', 'get']
  })
  
  .execute(async (args) => {
    switch (args.action) {
      case 'increment':
        count++;
        break;
      case 'decrement':
        count--;
        break;
      case 'reset':
        count = 0;
        break;
    }
    
    return {
      success: true,
      output: `Counter: ${count}`,
      data: { count }
    };
  })
  .build();
```

### Tool with External Dependencies

```typescript
// .clanker/tools/http-client.ts
import axios from 'axios';
import { createTool, ToolCapability } from 'grok-cli';

export default createTool()
  .id('http-get')
  .name('HTTP GET Request')
  .description('Make HTTP GET requests')
  .capabilities(ToolCapability.NetworkAccess)
  
  .stringArg('url', 'URL to fetch', { 
    required: true,
    validate: validators.url()
  })
  .objectArg('headers', 'Request headers', { default: {} })
  
  .execute(async (args) => {
    try {
      const response = await axios.get(args.url, {
        headers: args.headers
      });
      
      return {
        success: true,
        data: {
          status: response.status,
          headers: response.headers,
          body: response.data
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  })
  .build();
```

## Tool Composition

### Pipeline Pattern

Execute tools sequentially with output chaining:

```typescript
const pipeline = registry.compose('pipeline', [
  'search',        // Find files
  'view_file',     // Read first result
  'word-count'     // Count words
]);

const result = await registry.execute(pipeline.id, {
  query: '*.md',
  search_type: 'files'
});
```

### Parallel Pattern

Execute multiple tools concurrently:

```typescript
const parallel = registry.compose('parallel', [
  'bash',
  'view_file',
  'search'
]);

const results = await registry.execute(parallel.id, {
  command: 'git status',
  path: 'README.md',
  query: 'TODO'
});
```

### Map Pattern

Apply a tool to each item in a collection:

```typescript
const mapper = registry.compose('map', ['word-count'], {
  concurrency: 5
});

const result = await registry.execute(mapper.id, {
  items: ['text one', 'text two', 'text three']
});
```

### Conditional Pattern

Branch execution based on conditions:

```typescript
const conditional = registry.compose('conditional', 
  ['create_file', 'str_replace_editor'],
  {
    condition: (args) => args.exists ? 'str_replace_editor' : 'create_file',
    branches: {
      'create_file': 0,
      'str_replace_editor': 1
    }
  }
);
```

## Dynamic Loading

### Setup

Tools are automatically loaded from `.clanker/tools/*.ts` files:

```bash
# Create tools directory
mkdir -p .clanker/tools

# Create a tool
cat > .clanker/tools/my-tool.ts << 'EOF'
import { createTool } from 'clanker';

export default createTool()
  .id('my-tool')
  .name('My Tool')
  .description('Custom tool')
  .execute(async () => ({
    success: true,
    output: 'Hello from my tool!'
  }))
  .build();
EOF
```

### Tool Template

Generate a tool template:

```typescript
import { ToolLoader } from 'grok-cli';

// Create template file
await ToolLoader.createToolTemplate('my-new-tool');
// Creates: .clanker/tools/my-new-tool.ts
```

### Hot Reloading

Tools are automatically reloaded when files change:

```typescript
const agent = new GrokAgent({
  apiKey: 'your-key',
  loadDynamicTools: true
});

// Tools in .clanker/tools are loaded and watched
// Changes are picked up automatically
```

## Migration Guide

### From Old Tool System

#### Before (Old System):
```typescript
// Direct instantiation
this.textEditor = new TextEditorTool();
this.bash = new BashTool();

// Direct method calls
const result = await this.textEditor.view(path);
```

#### After (New System):
```typescript
// Register tools
registry.register(viewFileTool);
registry.register(bashTool);

// Execute through registry
const result = await registry.execute('view_file', { path });
```

### Tool Implementation Changes

#### Before:
```typescript
export class MyTool {
  async execute(arg1: string, arg2: number): Promise<ToolResult> {
    // Implementation
  }
}
```

#### After:
```typescript
export default createTool()
  .id('my-tool')
  .stringArg('arg1', 'First argument', { required: true })
  .numberArg('arg2', 'Second argument', { required: true })
  .execute(async (args) => {
    const { arg1, arg2 } = args;
    // Implementation
  })
  .build();
```

### GrokAgent Integration

The agent now uses the registry internally:

```typescript
const agent = new GrokAgent({
  apiKey: 'your-key',
  loadDynamicTools: true
});

// Access registry
const registry = agent.getRegistry();

// Get tool stats
const stats = agent.getToolStats();

// Reload dynamic tools
await agent.reloadDynamicTools();
```

## Best Practices

1. **Use the Builder API**: It provides type safety and validation
2. **Declare Capabilities**: Always declare required permissions
3. **Validate Arguments**: Use built-in validators or custom validation
4. **Handle Errors**: Return proper error results instead of throwing
5. **Document Tools**: Provide clear descriptions and examples
6. **Test Tools**: Create test files for complex tools
7. **Version Tools**: Include version in metadata for compatibility

## Advanced Topics

### Custom Validators

```typescript
const phoneValidator = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return 'Phone number must be 10 digits';
  }
  return true;
};

.stringArg('phone', 'Phone number', {
  validate: phoneValidator
})
```

### Tool Middleware

```typescript
// Add logging to all tools
registry.use({
  name: 'logger',
  pre: async (context, args) => {
    console.log(`Executing ${context.toolId} with:`, args);
    return args;
  },
  post: async (context, result) => {
    console.log(`Tool ${context.toolId} result:`, result);
    return result;
  }
});
```

### Performance Optimization

```typescript
// Cache tool results
const cachedTool = createTool()
  .id('expensive-operation')
  .execute(async (args) => {
    // Check cache first
    const cached = await cache.get(args.key);
    if (cached) return cached;
    
    // Expensive operation
    const result = await doExpensiveWork(args);
    
    // Cache result
    await cache.set(args.key, result, 3600);
    
    return result;
  })
  .build();
```

## Troubleshooting

### Tool Not Found
- Check tool is registered: `registry.get('tool-id')`
- Verify tool file exports correctly
- Check for loading errors in console

### Validation Errors
- Use `registry.validateArguments()` to test
- Check required arguments are provided
- Verify argument types match specification

### Dynamic Loading Issues
- Ensure `.clanker/tools` directory exists
- Check file has `.ts` or `.js` extension
- Verify default export or `tool` export
- Look for syntax errors in tool file

## API Reference

See the TypeScript definitions in:
- `src/registry/types.ts` - Core types
- `src/registry/builder.ts` - Builder API
- `src/registry/composition.ts` - Composition patterns
- `src/registry/validation.ts` - Validation utilities