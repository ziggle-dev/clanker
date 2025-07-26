#!/bin/bash

CORE_TOOLS_DIR="/Users/james/Projects/clanker-core-tools"

echo "Publishing Clanker Core Tools to GitHub..."

cd "$CORE_TOOLS_DIR"

# Create .gitignore
cat > .gitignore << EOF
node_modules/
*.log
.DS_Store
.env
dist/
EOF

# Initialize git and create initial commit
git add .
git commit -m "feat: initial release of clanker core tools

- bash: Execute shell commands
- pwd: Print working directory  
- list: List directory contents
- read-file: Read file contents
- write-to-file: Write to files
- remove: Remove files/directories

This is the first release of core tools extracted from the main Clanker CLI."

# Create GitHub repository
gh repo create ziggle-dev/clanker-core-tools \
  --public \
  --description "Core tools for Clanker CLI - essential tools for file operations, search, and system interaction" \
  --source=. \
  --push

echo "✅ Repository created and pushed to GitHub"

# Create a release
gh release create v1.0.0 \
  --title "v1.0.0 - Initial Release" \
  --notes "Initial release of Clanker Core Tools

## Tools Included
- **bash** - Execute shell commands
- **pwd** - Print working directory
- **list** - List directory contents
- **read-file** - Read file contents with line numbers
- **write-to-file** - Write content to files
- **remove** - Remove files or directories

## Installation
These tools are designed to be installed via the Clanker package manager:
\`\`\`bash
clanker --install clanker/bash
clanker --install clanker/pwd
# etc...
\`\`\`"

echo "✅ Release created"