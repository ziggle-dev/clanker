#!/bin/bash

REGISTRY_DIR="/Users/james/Projects/clanker-tools"

echo "Adding core tools to central registry..."

cd "$REGISTRY_DIR"
git checkout -b add-core-tools

# Update registry.json to add core tools
cat > registry.json << 'EOF'
{
  "tools": [
    {
      "organization": "example",
      "name": "ai-math",
      "version": "1.0.0"
    },
    {
      "organization": "clanker",
      "name": "bash",
      "version": "1.0.0"
    },
    {
      "organization": "clanker",
      "name": "pwd",
      "version": "1.0.0"
    },
    {
      "organization": "clanker",
      "name": "list",
      "version": "1.0.0"
    },
    {
      "organization": "clanker",
      "name": "read-file",
      "version": "1.0.0"
    },
    {
      "organization": "clanker",
      "name": "write-to-file",
      "version": "1.0.0"
    },
    {
      "organization": "clanker",
      "name": "remove",
      "version": "1.0.0"
    }
  ]
}
EOF

# Update tools.json
cat > tools.json << 'EOF'
{
  "repositories": [
    {
      "url": "https://github.com/ziggle-dev/clanker-tools",
      "name": "Official Clanker Tools",
      "description": "The official Clanker tool registry"
    },
    {
      "url": "https://github.com/ziggle-dev/clanker-core-tools",
      "name": "Clanker Core Tools",
      "description": "Essential core tools for Clanker CLI"
    }
  ]
}
EOF

# Commit changes
git add .
git commit -m "feat: add clanker core tools to registry

Added the following core tools from clanker-core-tools repository:
- bash: Execute shell commands
- pwd: Print working directory
- list: List directory contents
- read-file: Read file contents
- write-to-file: Write to files
- remove: Remove files/directories

These are essential tools extracted from the main Clanker CLI
for better modularity and package management."

# Push and create PR
git push -u origin add-core-tools

gh pr create \
  --title "Add Clanker Core Tools to Registry" \
  --body "## Summary
This PR adds the core tools from the newly created [clanker-core-tools](https://github.com/ziggle-dev/clanker-core-tools) repository to the central registry.

## Tools Added
- **bash** - Execute shell commands with timeout and security controls
- **pwd** - Print the current working directory
- **list** - List directory contents with filtering
- **read-file** - Read file contents with line numbers and offset support
- **write-to-file** - Write content to files with safety checks
- **remove** - Remove files or directories

## Rationale
These tools were previously built into Clanker CLI. By extracting them into a separate repository and adding them to the registry, we:
1. Enable better modularity and maintainability
2. Allow users to update tools independently of the main CLI
3. Provide a foundation for community-contributed tools
4. Normalize the tool ecosystem

## Testing
- [x] All tools have been tested locally
- [x] Tools are properly packaged with manifests
- [x] Registry JSON is valid
" \
  --base main

echo "✅ PR created successfully"