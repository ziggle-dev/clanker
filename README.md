# 🔧 Clanker - The Dynamic Tool System for AI

<div align="center">
  <img src="https://img.shields.io/badge/Dynamic_Tools-Hot_Reload-FF6B6B?style=for-the-badge" alt="Dynamic Tools" />
  <img src="https://img.shields.io/badge/Diff_Algorithm-10x_Better-4ECDC4?style=for-the-badge" alt="10x Better" />
  <img src="https://img.shields.io/badge/UI-React_Terminal-45B7D1?style=for-the-badge" alt="React Terminal" />
  <img src="https://img.shields.io/npm/v/@ziggle/clanker?style=for-the-badge&color=FD79A8" alt="npm version" />
</div>

<div align="center">
  <h3>Build, Share, and Compose AI Tools That Actually Work</h3>
  <p><em>Featuring the order-invariant diff algorithm that achieves 89% success rate vs 8% for traditional tools</em></p>
</div>

---

## 🚀 See It In Action

```bash
# Install globally
npm install -g @ziggle/clanker

# Start with beautiful animated intro
clanker

# Or jump straight to work
clanker --prompt "refactor all imports to use path aliases"
```

## 🔧 The Tool System That Changes Everything

### Create a Tool in 30 Seconds

```typescript
// ~/.clanker/tools/pr-ready.ts
import { createTool, ToolCategory } from '@ziggle/clanker';

export default createTool()
  .id('pr-ready')
  .name('PR Ready Checker')
  .description('Ensures code is ready for pull request')
  .category(ToolCategory.DevOps)
  
  .stringArg('branch', 'Branch to check', { default: 'current' })
  
  .execute(async ({ branch }) => {
    // Your tool has access to all of Clanker's capabilities
    const tests = await registry.execute('bash', { command: 'npm test' });
    const lint = await registry.execute('bash', { command: 'npm run lint' });
    const typecheck = await registry.execute('bash', { command: 'npm run typecheck' });
    
    return {
      success: tests.success && lint.success && typecheck.success,
      output: `PR Ready: ${tests.success ? '✅' : '❌'} Tests | ${lint.success ? '✅' : '❌'} Lint | ${typecheck.success ? '✅' : '❌'} Types`
    };
  })
  .build();
```

**Save the file and it's instantly available** - no restart needed!

### 🔥 Compose Tools Into Workflows

```typescript
// Pipeline: Find → Analyze → Fix
const codeQuality = registry.compose('pipeline', [
  'search',           // Find all TypeScript files
  'complexity-check', // Analyze complexity
  'auto-refactor'    // Apply fixes
]);

// Parallel: Run multiple checks at once
const prCheck = registry.compose('parallel', [
  'test-runner',
  'lint-checker', 
  'type-checker',
  'security-scan'
]);

// Map: Apply tool to each file
const optimizer = registry.compose('map', ['optimize-imports'], {
  concurrency: 5  // Process 5 files at a time
});
```

## 💡 The 10x Diff Algorithm That Actually Works

Traditional tools fail at simple tasks. **Clanker succeeds where others give up:**

### ❌ What Makes Other Tools Fail
```typescript
// File has moved lines, repeated patterns, or indentation changes
// Traditional diff: "Cannot apply patch" 
// Success rate: 8%
```

### ✅ How Clanker Handles It
```typescript
clanker> Update all console.log to use our logger

// Clanker's order-invariant algorithm:
// 1. Finds ALL matches regardless of position
// 2. Handles overlapping changes intelligently  
// 3. Applies changes from end to beginning
// 4. Shows visual diff for confirmation
// Success rate: 89%
```

Based on [Cline's research](https://cline.bot/blog/improving-diff-edits-by-10), implemented with:
- Context-aware matching
- Whitespace normalization
- Collision detection
- Multiple format support (unified diff, markers, arrays)

## 🎨 Not Just a CLI - A Complete Terminal Experience

<div align="center">
  <p><strong>🌈 Animated gradient logo</strong> • <strong>💬 AI chat simulation</strong> • <strong>🎯 Smart suggestions</strong></p>
</div>

### Built-in Power Tools

#### 📝 **Smart File Operations**
```typescript
// Order-invariant multi-replacement
registry.execute('replace_in_file', {
  path: 'config.ts',
  replacements: [
    { search: 'API_URL = "old"', replace: 'API_URL = "new"' },
    { search: 'VERSION = "1.0"', replace: 'VERSION = "2.0"' },
    { search: 'DEBUG = false', replace: 'DEBUG = true' }
  ]
});
```

#### 🔍 **Intelligent Search** 
```typescript
// Ripgrep-powered search with context
registry.execute('search', {
  query: 'TODO|FIXME|HACK',
  search_type: 'regex',
  file_types: ['ts', 'tsx'],
  show_context: true
});
```

#### ✅ **Visual Todo Management**
```typescript
// Beautiful terminal UI for tasks
registry.execute('create_todo_list', {
  todos: [
    { id: '1', content: 'Review PR feedback', priority: 'high' },
    { id: '2', content: 'Update tests', priority: 'medium' }
  ]
});
// Renders with: ● completed  ◐ in-progress  ○ pending
```

#### 🚀 **Safe Bash Execution**
```typescript
// With confirmation and timeout support
registry.execute('bash', {
  command: 'rm -rf node_modules && npm install',
  timeout: 120000,
  requireConfirmation: true
});
```

## 🛠️ Advanced Tool Features

### 🎯 Type-Safe Builder API
```typescript
createTool()
  .id('my-tool')
  .name('My Tool')
  
  // Multiple argument types with validation
  .stringArg('email', 'User email', { 
    required: true,
    validate: validators.email() 
  })
  .numberArg('age', 'User age', {
    validate: validators.combine(
      validators.min(0),
      validators.max(150),
      validators.integer()
    )
  })
  .arrayArg('tags', 'Tags', { 
    validate: validators.unique() 
  })
  
  // Custom UI rendering
  .renderResult(({ result, isExecuting }) => (
    <Box flexDirection="column">
      {isExecuting ? <Spinner /> : <Text color="green">✓</Text>}
      <Text>{result.output}</Text>
    </Box>
  ))
  
  .execute(async (args, context) => {
    // Access to registry, logger, confirmation service
    return { success: true, output: 'Done!' };
  })
  .build();
```

### 🔌 Tool Middleware
```typescript
// Add capabilities to all tools
registry.use({
  name: 'performance-logger',
  pre: async (context, args) => {
    context.startTime = Date.now();
    console.log(`Starting ${context.toolId}`);
  },
  post: async (context, result) => {
    const duration = Date.now() - context.startTime;
    console.log(`${context.toolId} completed in ${duration}ms`);
  }
});
```

### 🏗️ Stateful Tools
```typescript
// Tools can maintain state across executions
const sessionCache = new Map();

export default createTool()
  .id('session-tool')
  .execute(async ({ key, value }) => {
    if (value) {
      sessionCache.set(key, value);
      return { success: true, output: 'Stored' };
    }
    return { 
      success: true, 
      output: sessionCache.get(key) || 'Not found' 
    };
  })
  .build();
```

## ⚙️ Configuration

### Multiple Ways to Configure

```bash
# Environment variable (supports both for compatibility)
export CLANKER_API_KEY=your_key_here
export GROK_API_KEY=your_key_here  # Also supported

# User settings file
~/.clanker/user-settings.json

# Command line
clanker --api-key your_key --base-url https://api.openai.com/v1

# Project-specific instructions
.clanker/CLANKER.md
```

### Provider Agnostic

Works with any OpenAI-compatible API:
- **Grok** (default)
- **OpenAI**
- **Anthropic** (via proxy)
- **Local models** (LM Studio, Ollama)

## 🚀 Unique Commands

```bash
# List all available tools
clanker --list-tools

# Load tools from custom directory
clanker --load-dynamic-tools --tools-path ./my-tools

# Headless mode for CI/CD
clanker --prompt "run tests and fix any linting errors"

# Debug mode with execution tracking
clanker --debug

# Skip intro animations
clanker  # Then press ESC
```

## 📦 Installation

```bash
# Global (recommended)
npm install -g @ziggle/clanker

# Or use directly with npx
npx @ziggle/clanker

# Development
git clone https://github.com/ziggle-dev/clanker
cd clanker
npm install
npm run dev
```

## 🎯 Why Developers Choose Clanker

1. **Tools That Actually Work** - 89% success rate on complex edits
2. **Dynamic & Extensible** - Create and share tools without forking
3. **Beautiful Experience** - Not just functional, but delightful to use
4. **Provider Flexible** - Use with any AI provider
5. **Built for Real Work** - Handles production codebases

## 🤝 Community

- 📚 [Documentation](https://clanker.dev)
- 💬 [Discord](https://discord.gg/clanker)
- 🐛 [Issues](https://github.com/ziggle-dev/clanker/issues)
- ⭐ [Star on GitHub](https://github.com/ziggle-dev/clanker)

## 📄 License

MIT © [Ziggle](https://github.com/ziggle-dev)

---

<div align="center">
  <p><strong>Stop fighting with your tools. Start building with Clanker.</strong></p>
  <p>If you create cool tools, share them with <code>#clanker-tools</code></p>
</div>