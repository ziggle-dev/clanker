# Clanker Package Manager

The Clanker Package Manager is a built-in tool discovery and management system that makes it easy to extend Clanker's capabilities with community-created tools.

## Table of Contents

- [Overview](#overview)
- [Installing Tools](#installing-tools)
- [Managing Tools](#managing-tools)
- [Creating Tools](#creating-tools)
- [Publishing Tools](#publishing-tools)
- [Repository Management](#repository-management)
- [Tool Development Workflow](#tool-development-workflow)
- [Technical Details](#technical-details)

## Overview

The package manager provides:
- 🔍 **Discovery** - Search and browse available tools
- 📦 **Installation** - One-command tool installation
- 🔄 **Updates** - Keep tools up to date
- 🛠️ **Development** - Hot-reloading for tool creators
- 🌐 **Publishing** - Share your tools with the community
- 🏢 **Multi-repo** - Support for private/organizational repositories

## Installing Tools

### Search for Tools

Find tools in the registry:

```bash
# Search by keyword
clanker --search "git"
clanker -S "database"

# Search results show:
# - Tool name and organization
# - Description
# - Latest version
# - Download stats
```

### Install a Tool

Install tools by name:

```bash
# Install latest version
clanker --install ziggler/core
clanker -I community/git-tools

# Install specific version
clanker --install ziggler/core@1.2.0
clanker -I community/git-tools@0.5.0

# Short format
clanker -I org/tool-name
```

### Installation Process

When you install a tool:
1. Downloads from the tool registry
2. Verifies checksums for security
3. Installs to `~/.clanker/tools/org/tool-name/`
4. Creates version symlink at `current`
5. Tool is immediately available

## Managing Tools

### List Installed Tools

View all your installed tools:

```bash
clanker --list-installed
clanker -L

# Output shows:
# ✓ ziggler/core@1.0.0
#   A comprehensive utility toolkit
#   Installed: 2025-07-25
# 
# ✓ community/git-tools@0.5.0
#   Git workflow automation tools
#   Installed: 2025-07-24
```

### Update Tools

Keep tools up to date:

```bash
# Update specific tool
clanker --update ziggler/core

# Update checks for new versions and installs if available
```

### Uninstall Tools

Remove tools you no longer need:

```bash
clanker --uninstall community/git-tools
clanker -U community/git-tools

# Removes all versions and cleans up
```

### Clear Cache

Clean up downloaded packages:

```bash
clanker --clear-cache

# Removes cached downloads but keeps installed tools
```

## Creating Tools

### Quick Start

Create a new tool project:

```bash
npx create-clanker-tool
```

This interactive wizard will:
1. Ask for tool name, organization, and description
2. Let you choose TypeScript or JavaScript
3. Create a complete project structure
4. Set up build scripts and dependencies

### Project Structure

```
my-awesome-tool/
├── src/                 # Source code (committed to git)
│   └── index.ts         # Tool implementation
├── bin/                 # Compiled output (NOT in git)
│   ├── index.js         # Compiled TypeScript
│   └── bundle.js        # Bundled tool with dependencies
├── scripts/
│   └── install-local.js # Local installation script
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript config
├── README.md           # Documentation
└── .gitignore          # Excludes bin/, node_modules/, etc.
```

**Important**: The `bin/` directory is for local development only and should NOT be committed to git or included in pull requests.

### Development Scripts

Your tool project includes these npm scripts:

```bash
# Development
npm run dev              # Run tool directly
npm run dev:watch        # Build, install, and watch for changes

# Building
npm run build            # Compile TypeScript
npm run bundle           # Create minified bundle

# Testing
npm run install:local    # Install to ~/.clanker/tools for testing

# Publishing
npm run publish:tool     # Prepare for registry submission
```

### Tool Structure

A minimal tool looks like:

```javascript
export default {
  id: 'my_tool',
  name: 'My Tool',
  description: 'What this tool does',
  
  execute: async (args, context) => {
    // Your tool logic here
    return {
      success: true,
      output: 'Tool executed successfully!'
    };
  },
  
  arguments: [
    {
      name: 'input',
      type: 'string',
      description: 'Input value',
      required: true
    }
  ]
};
```

## Publishing Tools

### Prepare for Publishing

1. **Test thoroughly**: Ensure your tool works correctly
2. **Build**: Run `npm run build` and `npm run bundle`
3. **Document**: Update README with usage examples
4. **Version**: Update version in package.json

### Publish Command

```bash
npm run publish:tool
# or
clanker --publish
```

This command:
1. Builds and bundles your tool
2. Generates a manifest file
3. Creates a PR template
4. Opens GitHub for easy submission

### Registry Structure

Tools in the registry follow this structure:
```
clanker-tools/
└── tools/
    └── your-org/
        └── your-tool/
            ├── src/            # Source code (TypeScript/JavaScript)
            │   └── index.ts    # Tool implementation
            ├── package.json    # Dependencies and build scripts
            ├── tsconfig.json   # TypeScript config (if applicable)
            ├── README.md       # Documentation
            └── manifest.json   # Auto-generated tool metadata
```

**Note**: Only source code is stored in the registry. The bin/ directory with compiled files is generated automatically during the CI/CD build process after merge.

### Submission Process

1. Fork [clanker-tools](https://github.com/ziggle-dev/clanker-tools)
2. Add your tool following the structure above:
   - Include only source files in `src/`
   - Include `package.json` with build scripts
   - Include `README.md` with documentation
   - Do NOT include `bin/`, `dist/`, or compiled files
3. Create a pull request with the generated template
4. Tools are reviewed for:
   - Source code quality and security
   - Proper build configuration
   - Documentation completeness
5. After merge:
   - CI/CD automatically builds your tool
   - Bundled version is distributed to users
   - Source remains available for transparency

## Repository Management

### Multiple Repositories

Clanker supports multiple tool repositories for:
- Private organizational tools
- Testing repositories
- Alternative registries

### Add a Repository

```bash
# Add by GitHub URL
clanker --add-repo "myorg/private-clanker-tools"

# Full URL also works
clanker --add-repo "https://github.com/myorg/private-tools"
```

### Remove a Repository

```bash
clanker --remove-repo "myorg/private-tools"
```

### List Repositories

```bash
clanker --list-repos

# Shows:
# 1. Official Clanker Tools (default)
#    URL: https://github.com/ziggle-dev/clanker-tools
#    Status: ✅ Enabled
# 
# 2. myorg/private-tools
#    URL: https://github.com/myorg/private-tools
#    Status: ✅ Enabled
```

### Repository Priority

- Tools are searched in repository order
- First match wins for duplicate tool names
- Official repository has highest priority by default
- Edit `~/.clanker/settings.json` to reorder

## Tool Development Workflow

### 1. Bootstrap a Tool

```bash
npx create-clanker-tool
cd my-tool
npm install
```

### 2. Develop Locally

```bash
# Edit src/index.ts
# Test your changes
npm run build
npm run install:local

# Verify it loads
clanker --list-tools | grep my-tool
```

### 3. Hot Reloading

For rapid development:

```bash
# Terminal 1: Watch and rebuild
npm run dev:watch

# Terminal 2: Use Clanker with watch mode
clanker --watch-tools
```

Changes to your tool are automatically reloaded!

### 4. Test with Clanker

```bash
# Test in headless mode
clanker --prompt "Use my_tool to do something"

# Test interactively
clanker
> Use my_tool with input "test"
```

### 5. Publish

```bash
npm run publish:tool
# Follow the instructions to create PR
```

## Technical Details

### Tool Loading

Tools are discovered and loaded from:
1. Built-in tools (packaged with Clanker)
2. `~/.clanker/tools/` directory (recursive)
3. Package-managed tools with version symlinks

### Version Management

- Each tool version is stored separately
- `current` symlink points to active version
- Supports version constraints (^1.0.0, ~1.2.0, etc.)

### Security

- All tools run in Clanker's process
- Checksums verify package integrity
- PR review process for registry additions
- Tools should follow principle of least privilege

### File Watching

With `--watch-tools` flag:
- Monitors `~/.clanker/tools/` for changes
- Automatically reloads modified tools
- Calls cleanup hooks before unloading
- Uses file hashes to detect changes

### Tool Discovery

Tools are identified by:
- File extension: `.js`, `.ts`, `.tsx`, `.jsx`
- Valid tool structure (id, description, execute)
- Unique ID across all loaded tools

### Performance

- Tools are loaded on startup
- Lazy initialization for better performance
- Caching of downloaded packages
- Parallel tool execution support

## Best Practices

### Tool Development

1. **Use TypeScript**: Better type safety and IDE support
2. **Handle errors gracefully**: Return error in result, don't throw
3. **Validate arguments**: Check required args before execution
4. **Provide examples**: Help users understand usage
5. **Version semantically**: Follow semver for updates
6. **Source-only submission**: Never commit bin/ or compiled files
7. **Build scripts**: Ensure `npm run build` and `npm run bundle` work correctly

### Tool Design

1. **Single purpose**: Each tool should do one thing well
2. **Composable**: Design tools to work together
3. **Idempotent**: Running twice should be safe
4. **Documented**: Clear description and argument docs
5. **Tested**: Include tests for reliability

### Publishing

1. **Test thoroughly**: In different scenarios
2. **Document clearly**: README with examples
3. **Version appropriately**: Breaking changes = major version
4. **Provide metadata**: Author, keywords, homepage
5. **Respond to feedback**: Monitor issues and PRs

## Troubleshooting

### Tool Not Loading

```bash
# Check if tool is installed
clanker --list-installed

# Check debug output
clanker --debug --list-tools

# Verify file structure
ls -la ~/.clanker/tools/
```

### Installation Failures

```bash
# Clear cache and retry
clanker --clear-cache
clanker --install org/tool

# Check network/permissions
# Verify GitHub access
```

### Development Issues

```bash
# Ensure dependencies installed
npm install

# Check build output
npm run build

# Verify bundle creation
npm run bundle
ls -la dist/bundle.js
```

## Examples

### Example: Git Workflow Tool

```typescript
export default {
  id: 'git_pr',
  name: 'Git PR Creator',
  description: 'Create PR with conventional commits',
  
  arguments: [
    {
      name: 'title',
      type: 'string',
      description: 'PR title',
      required: true
    }
  ],
  
  execute: async ({ title }, context) => {
    // Implementation
    const branch = await createBranch();
    await commitChanges();
    const prUrl = await createPR(title);
    
    return {
      success: true,
      output: `PR created: ${prUrl}`
    };
  }
};
```

### Example: Code Generator

```typescript
export default {
  id: 'gen_component',
  name: 'Component Generator',
  description: 'Generate React component with tests',
  
  arguments: [
    {
      name: 'name',
      type: 'string',
      required: true
    },
    {
      name: 'typescript',
      type: 'boolean',
      default: true
    }
  ],
  
  execute: async ({ name, typescript }, context) => {
    const ext = typescript ? 'tsx' : 'jsx';
    
    // Generate component file
    await createFile(`${name}.${ext}`, componentTemplate(name));
    
    // Generate test file
    await createFile(`${name}.test.${ext}`, testTemplate(name));
    
    return {
      success: true,
      output: `Created ${name} component with tests`
    };
  }
};
```

## FAQ

**Q: Can I install private tools?**  
A: Yes! Add your private repository with `--add-repo` and install tools normally.

**Q: How do I update all tools at once?**  
A: Currently, update tools individually. Bulk updates coming soon.

**Q: Can tools depend on npm packages?**  
A: Yes, but they must be bundled. The bundle should include all dependencies.

**Q: What Node version is required?**  
A: Tools run in Clanker's Node environment (16+). Use appropriate syntax.

**Q: How do I debug my tool?**  
A: Use `clanker --debug` to see detailed execution logs.

## Get Involved

- 🐛 [Report issues](https://github.com/ziggle-dev/clanker/issues)
- 💡 [Suggest features](https://github.com/ziggle-dev/clanker/discussions)
- 🛠️ [Browse tools](https://github.com/ziggle-dev/clanker-tools)
- 👥 [Join community](https://github.com/ziggle-dev/clanker/discussions)

---

[← Back to Documentation](../README.md#documentation)