#\!/bin/bash
CORE_TOOLS_DIR="/Users/james/Projects/clanker-core-tools"

echo "=== Core Tools Repository Structure ==="
echo "Directories:"
find "$CORE_TOOLS_DIR" -type d | grep -v ".git" | sort

echo -e "\n=== Looking for source files ==="
find "$CORE_TOOLS_DIR" -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -10

echo -e "\n=== Contents of root directory ==="
ls -la "$CORE_TOOLS_DIR" | grep -v ".git"
