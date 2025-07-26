#!/bin/bash

CORE_TOOLS_DIR="/Users/james/Projects/clanker-core-tools"

# Build all tools
TOOLS=(
  "bash"
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

echo "Building all core tools..."

for tool in "${TOOLS[@]}"; do
  if [ -f "$CORE_TOOLS_DIR/tools/clanker/$tool/src/index.js" ]; then
    echo "Building $tool..."
    cd "$CORE_TOOLS_DIR/tools/clanker/$tool"
    
    # Create package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
      cat > package.json << EOF
{
  "name": "@clanker/$tool-tool",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "esbuild src/index.js --bundle --platform=node --target=node18 --format=cjs --outfile=1.0.0/index.js --external:child_process --external:util --external:fs --external:path --external:os --external:crypto"
  }
}
EOF
    fi
    
    # Build the tool
    npx esbuild src/index.js --bundle --platform=node --target=node18 --format=cjs --outfile=1.0.0/index.js --external:child_process --external:util --external:fs --external:path --external:os --external:crypto
    
    echo "✅ $tool built"
  else
    echo "⚠️  $tool source not found"
  fi
done

echo "✅ Build complete!"