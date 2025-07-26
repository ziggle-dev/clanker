#!/bin/bash

# Script to set up and build clanker-core-tools

CORE_TOOLS_DIR="/Users/james/Projects/clanker-core-tools"

echo "Setting up Clanker Core Tools..."

# Install dependencies
cd "$CORE_TOOLS_DIR"
npm install

# Build bash tool
cd "$CORE_TOOLS_DIR/tools/clanker/bash"
npm install
npm run build

echo "✅ Bash tool built successfully"

# Now let's create a simple version of each tool
# We'll create simplified versions that work with the package manager

# List of tools to convert
TOOLS=(
  "pwd"
  "list"
  "read-file"
  "write-to-file"
  "remove"
  "search"
  "input"
  "summarize"
  "view-file"
  "multi-edit"
  "create-todo-list"
  "list-todos" 
  "update-todo-list"
)

for tool in "${TOOLS[@]}"; do
  echo "Creating $tool..."
  mkdir -p "$CORE_TOOLS_DIR/tools/clanker/$tool/src"
  mkdir -p "$CORE_TOOLS_DIR/tools/clanker/$tool/1.0.0"
done

echo "✅ Directory structure created"