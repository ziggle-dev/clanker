# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clanker is an open-source AI agent CLI tool with intelligent text editor capabilities and tool usage. It's built with TypeScript and React (Ink) for terminal UI, designed as a global NPM package.

## Development Commands

```bash
# Development
npm run dev          # Run with tsx for development (hot reload)

# Build
npm run build        # Compile TypeScript to dist/

# Code Quality
npm run lint         # Run ESLint checks
npm run typecheck    # Run TypeScript type checking

# Production
npm start           # Run compiled version from dist/
```

## Architecture

### Core Components

1. **Agent System** (`src/agent/`): Core AI agent logic and orchestration
   - `agent.ts`: Main agent implementation
   - Handles conversation flow and tool execution

2. **Client** (`src/grok/`): API client and tool management
   - `client.ts`: API client adapted for multiple providers (OpenAI compatible)
   - `tools.ts`: Tool definitions and schemas

3. **Tools** (`src/tools/`): Modular tool implementations
   - `bash.ts`: Execute shell commands
   - `text-editor.ts`: File reading operations (view_file)
   - `file-operations.tsx`: Modern file operations (write_to_file, multi_edit) with order-invariant diff support
   - `read-file.tsx`: Full file reading for edit preparation
   - `search.ts`: Ripgrep-based file search
   - `todo-tool.ts`: Task management
   - `confirmation-tool.ts`: User confirmations

4. **UI Layer** (`src/ui/`): React/Ink based terminal interface
   - `app.tsx`: Main UI application
   - `components/`: Reusable UI components
   - Uses React hooks and functional components

### Key Design Patterns

- **Tool-based Architecture**: Each tool is a self-contained module with its own schema
- **React for Terminal UI**: Ink framework provides React-like component model for terminal
- **Flexible API Support**: Designed to work with multiple AI providers via OpenAI-compatible API
- **Command Pattern**: Uses Commander.js for CLI argument parsing

## TypeScript Configuration

- **Strict Mode**: Disabled (`noImplicitAny: false`)
- **Target**: ES2020 with CommonJS modules
- **JSX**: React (for Ink components)
- When adding new code, follow existing patterns even though strict mode is off

## Development Guidelines

1. **Component Structure**: 
   - Keep React components in `src/ui/components/`
   - Use functional components with hooks
   - Follow existing patterns for state management

2. **Tool Development**:
   - New tools go in `src/tools/`
   - Each tool should have a clear schema definition
   - Tools should be single-purpose and focused

3. **API Integration**:
   - The client supports multiple providers through `baseURL` configuration
   - Handle OpenAI-compatible endpoints

4. **Error Handling**:
   - Use try-catch blocks in async functions
   - Provide meaningful error messages to users
   - Handle API errors gracefully

## File Editing Workflow

The project uses a hash-based file tracking system to ensure safe file operations:

1. **Read Before Edit**: Files must be read with `read_file` before editing
2. **Hash Verification**: File content is hashed (SHA-256) to detect external changes
3. **New Tools** (Recommended):
   - `write_to_file`: Write complete content to files (replaces `create_file`)
   - `multi_edit`: Flexible file editing (add, append, replace, remove) with order-invariant algorithm. Use empty search string to append.
   - Supports multiple diff formats (unified, markers, etc.)
   - 10x improvement in edit success rate

4. **Deprecated Tools**:
   - `create_file`: Use `write_to_file` instead
   - `str_replace_editor`: Use `multi_edit` instead

## Important Notes

- **No Test Suite**: This project doesn't have automated tests. Test changes manually.
- **Global Package**: Designed for global installation via `npm install -g`
- **Environment Variables**: Uses `.env` files for API keys and configuration
- **Terminal Focus**: Heavy investment in terminal UX - maintain high-quality terminal interactions