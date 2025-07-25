# Getting Started with Clanker

This guide will help you install, configure, and start using Clanker for AI-powered development assistance.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @ziggle/clanker
```

### Using npx (No Installation)

```bash
npx @ziggle/clanker
```

### From Source

```bash
git clone https://github.com/ziggle-dev/clanker.git
cd clanker
npm install
npm run build
npm link  # Makes 'clanker' available globally
```

## Configuration

Clanker supports multiple configuration methods, in order of precedence:

### 1. Command Line Arguments

```bash
clanker --api-key YOUR_API_KEY --model gpt-4
```

### 2. Environment Variables

```bash
export CLANKER_API_KEY="your-api-key"
export CLANKER_BASE_URL="https://api.openai.com/v1"  # Optional
export CLANKER_MODEL="gpt-4"  # Optional
```

### 3. User Settings File

Create `~/.clanker/user-settings.json`:

```json
{
  "apiKey": "your-api-key",
  "provider": "openai",
  "model": "gpt-4",
  "confirmBeforeExecute": true
}
```

### 4. Project-Specific Instructions

Create `CLANKER.md` in your project root to provide context-specific instructions:

```markdown
# Project Context

This is a TypeScript project using React and Vite.

## Coding Standards
- Use functional components with hooks
- Prefer named exports
- Follow existing patterns for state management
```

## First Run

### Interactive Mode

Simply run:

```bash
clanker
```

On first run, Clanker will:
1. Display a welcome animation
2. Prompt for API configuration if not set
3. Launch the interactive chat interface

### Headless Mode

For scripting or CI/CD:

```bash
clanker --prompt "analyze all TypeScript files and find unused imports"
```

## Basic Commands

### In Interactive Mode

- **Enter**: Send message
- **Ctrl+C**: Clear input (press twice to exit)
- **↑/↓**: Navigate message history
- **Tab**: Autocomplete (when available)
- **Ctrl+N**: New chat
- **Ctrl+S**: Open settings

### Command Line Options

```bash
clanker --help                    # Show all options
clanker --list-tools              # List available tools
clanker --debug                   # Enable debug logging
clanker --no-confirmations        # Skip all confirmations (use with caution)
```

## Core Concepts

### Tools

Clanker operates through "tools" - discrete capabilities the AI can use:

- **read_file**: Read file contents
- **write_to_file**: Write or create files
- **multi_edit**: Advanced file editing with diff support
- **bash**: Execute shell commands
- **search**: Find files or content using ripgrep
- **create_todo_list**: Task management

### Confirmation System

By default, Clanker asks for confirmation before:
- Writing or modifying files
- Executing shell commands
- Deleting files

You can:
- Approve individual operations
- Use "Don't ask again" for trusted operations
- Disable globally with `--no-confirmations` (not recommended)

### Multi-Provider Support

Clanker works with various AI providers:

**OpenAI**:
```bash
clanker --provider openai --model gpt-4
```

**Anthropic** (via proxy):
```bash
clanker --provider anthropic --model claude-3-opus-20240229
```

**Local Models** (Ollama, LM Studio):
```bash
clanker --base-url http://localhost:11434/v1 --model llama2
```

## Common Use Cases

### Code Refactoring

```
You: Refactor all console.log statements to use our logger utility
```

### Bug Investigation

```
You: Find all TypeScript files with unused imports and remove them
```

### Project Setup

```
You: Set up a new React component with TypeScript, tests, and stories
```

### Documentation

```
You: Generate API documentation for all public methods in src/
```

## Tips for Effective Use

1. **Be Specific**: Instead of "fix the bug", try "fix the TypeScript error in auth.ts line 45"

2. **Provide Context**: Clanker reads your CLANKER.md file, so document project-specific patterns there

3. **Use Confirmations**: Review changes before applying them, especially for complex operations

4. **Check Progress**: Clanker shows what tools it's using in real-time

5. **Iterative Refinement**: If results aren't perfect, provide feedback and iterate

## Troubleshooting

### API Key Issues

```
Error: API key required
```

**Solution**: Set your API key using one of the configuration methods above.

### Permission Errors

```
Error: EACCES: permission denied
```

**Solution**: Check file permissions or run with appropriate privileges.

### Tool Execution Failures

Clanker will show which tool failed and why. Common causes:
- File not found
- Syntax errors in generated code
- Command not available in PATH

### Performance

For large operations:
- Use specific file paths instead of wildcards when possible
- Break complex tasks into smaller steps
- Monitor token usage in debug mode

## Next Steps

- Explore [Architecture](architecture.md) to understand how Clanker works
- Learn to create custom tools in [Tool Development](tools.md)
- Check the [API Reference](api.md) for advanced usage

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/ziggle-dev/clanker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ziggle-dev/clanker/discussions)
- **Updates**: Watch the [repository](https://github.com/ziggle-dev/clanker) for updates