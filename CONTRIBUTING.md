# Contributing to Clanker

Thank you for your interest in contributing to Clanker! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git
- A code editor (VS Code recommended)
- Basic knowledge of TypeScript and React

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/clanker.git
   cd clanker
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Start development mode:
   ```bash
   npm run dev
   ```

## Development Workflow

### Running the Project

```bash
# Development mode with hot reload
npm run dev

# Build the project
npm run build

# Run the built version
npm start

# Run checks
npm run typecheck
npm run lint

# Build before testing locally
npm run build
```

### Code Style

We use ESLint and TypeScript for code quality:

- Run `npm run lint` before committing
- Run `npm run typecheck` to check types
- Follow existing code patterns
- Use functional components for React
- Prefer `const` over `let`
- Use async/await over promises

### Commit Messages

Follow the conventional commits format:

```
type: short description

Longer description if needed

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat: add support for yaml configuration files
fix: resolve file path issues on Windows
docs: update tool development guide
```

## Contributing Code

### Adding New Features

1. Discuss the feature in an issue first
2. Create a feature branch
3. Implement the feature with tests
4. Update documentation
5. Submit a pull request

### Creating New Tools

Tools are a great way to contribute! See the [Tool Development Guide](docs/tools.md).

1. Create your tool in `src/tools/dynamic/`
2. Follow the tool template:
   ```typescript
   import { createTool, ToolCategory, ToolCapability } from '../../registry';
   
   const yourTool = createTool()
     .id('your_tool')
     .name('Your Tool')
     .description('What your tool does')
     .category(ToolCategory.Utility)
     .capabilities(ToolCapability.FileRead)
     .stringArg('input', 'Input description', { required: true })
     .execute(async (args, context) => {
       // Implementation
       return { success: true, output: 'Result' };
     })
     .build();
   
   export default yourTool;
   ```
3. Add tests for your tool
4. Document the tool in your PR

### Fixing Bugs

1. Check if the bug is already reported
2. Create an issue if it's not reported
3. Reference the issue in your PR
4. Include a test that reproduces the bug
5. Ensure your fix passes all tests

### Improving Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Improve code comments
- Update outdated information
- Add diagrams or visualizations

## Testing

### Running Tests

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# All checks
npm run typecheck && npm run lint
```

### Writing Tests

When adding new features:

1. Add type definitions
2. Ensure no TypeScript errors
3. Follow existing test patterns
4. Test edge cases
5. Test error conditions

## Pull Request Process

### Before Submitting

1. Update documentation if needed
2. Run all tests locally
3. Ensure your branch is up to date with main
4. Write a clear PR description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.logs left
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, it will be merged
4. Your contribution will be included in the next release

## Project Structure

```
clanker/
├── src/
│   ├── index.ts           # Main entry point
│   ├── clanker/           # Agent system
│   ├── registry/          # Tool registry
│   ├── tools/            # Built-in tools
│   │   └── dynamic/      # Dynamic tools
│   ├── ui/               # React UI components
│   ├── store/            # State management
│   └── utils/            # Utilities
├── docs/                 # Documentation
├── package.json
└── tsconfig.json
```

## Design Principles

When contributing, keep these principles in mind:

1. **User Safety**: Confirmations for destructive operations
2. **Extensibility**: Easy to add new tools
3. **Performance**: Efficient execution and UI updates
4. **Developer Experience**: Clear APIs and error messages
5. **Terminal-First**: Beautiful terminal UI

## Getting Help

- Create an issue for bugs or features
- Join discussions for questions
- Check existing issues and PRs
- Read the documentation thoroughly

## Recognition

Contributors will be:
- Listed in the changelog
- Mentioned in release notes
- Added to the contributors list

## Release Process

Maintainers handle releases:

1. Version bump in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Publish to npm
5. Create GitHub release

## Development Tips

### Debugging

```bash
# Enable debug logging
npm run dev -- --debug

# Use VS Code debugger
# Launch configuration is included
```

### Hot Reload

The development server supports hot reload:
- Tool changes reload automatically
- UI changes update instantly
- State is preserved during reload

### Performance

When developing:
- Profile long operations
- Minimize re-renders
- Use proper React keys
- Implement progress reporting

## Questions?

If you have questions:
1. Check the documentation
2. Look at existing code
3. Ask in discussions
4. Create an issue

Thank you for contributing to Clanker! 🚀