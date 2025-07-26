# Clanker Tools Submission Format

## Overview

To submit a tool to the Clanker Tools registry, users create a PR with a metadata file. The CI/CD system automatically builds and validates the tool.

## Directory Structure for Submissions

```
manifests/
└── o/
    └── organization-name/
        └── tool-name/
            └── 1.0.0/
                └── manifest.yaml
```

## Manifest Format (manifest.yaml)

```yaml
# Tool identity
id: "organization/tool-name"
version: "1.0.0"
name: "My Awesome Tool"
description: "A tool that does awesome things"
author: "Tool Author"
license: "MIT"

# Source location (pick one)
source:
  # Option 1: GitHub repository + tag/release
  repository: "https://github.com/username/repo"
  tag: "v1.0.0"  # or commit: "abc123" or branch: "main"
  
  # Entry point within the repository
  entry: "src/index.ts"  # Path to the main tool file
  
  # Build configuration (optional)
  build:
    # Build command to run before bundling (optional)
    command: "npm install && npm run build"
    # Output directory after build (defaults to repository root)
    outputDir: "dist"
    # Entry point after build (if different from source entry)
    outputEntry: "index.js"

# Tool metadata
metadata:
  # Minimum Clanker version required
  minClankerVersion: "0.1.31"
  
  # Tool category
  category: "productivity"
  
  # Search tags
  tags:
    - "file"
    - "editor"
    - "productivity"
  
  # Homepage/documentation
  homepage: "https://tool-website.com"
  
  # Dependencies on other Clanker tools (optional)
  dependencies:
    "org/other-tool": "^1.0.0"

# Tool configuration schema (optional)
config:
  # JSON Schema for tool configuration
  schema:
    type: "object"
    properties:
      apiKey:
        type: "string"
        description: "API key for the service"
    required: ["apiKey"]
```

## Submission Process

1. **User creates PR** with manifest.yaml in correct directory structure
2. **CI validates** the manifest format
3. **CI fetches** the source code from the specified repository/tag
4. **CI builds** the tool (if build command specified)
5. **CI bundles** the tool into a single index.js file
6. **CI creates** a new branch: `built/organization/tool-name/1.0.0`
7. **CI adds** the built tool and metadata.json to the branch
8. **PR shows** build status and validation results
9. **Maintainer reviews** and merges if all checks pass
10. **Tool becomes available** in the package manager

## CI/CD Workflow

```yaml
name: Process Tool Submission

on:
  pull_request:
    paths:
      - 'manifests/**/*.yaml'

jobs:
  process-tool:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout PR
        uses: actions/checkout@v4
        
      - name: Validate manifest
        run: |
          # Validate YAML format and required fields
          npm run validate-manifest ${{ github.event.pull_request.changed_files }}
      
      - name: Fetch tool source
        run: |
          # Clone repository at specified tag/commit
          npm run fetch-source
      
      - name: Build tool
        run: |
          # Run build command if specified
          npm run build-tool
      
      - name: Bundle tool
        run: |
          # Bundle into single file with esbuild
          npm run bundle-tool
      
      - name: Run security checks
        run: |
          # Scan for malicious patterns
          npm run security-scan
      
      - name: Test tool loading
        run: |
          # Verify tool can be loaded by Clanker
          npm run test-tool
      
      - name: Create built branch
        if: success()
        run: |
          # Create branch with built tool
          npm run create-built-branch
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Tool built successfully! Ready for review.'
            })
```

## Example Submission

User creates: `manifests/a/acme/file-scanner/1.0.0/manifest.yaml`

```yaml
id: "acme/file-scanner"
version: "1.0.0"
name: "ACME File Scanner"
description: "Scan files for patterns and security issues"
author: "ACME Corporation"
license: "MIT"

source:
  repository: "https://github.com/acme/file-scanner-tool"
  tag: "v1.0.0"
  entry: "src/main.ts"
  build:
    command: "npm ci && npm run build"
    outputDir: "dist"
    outputEntry: "main.js"

metadata:
  minClankerVersion: "0.1.31"
  category: "security"
  tags:
    - "security"
    - "scanner"
    - "files"
  homepage: "https://acme.com/file-scanner"
```

CI creates: `built/acme/file-scanner/1.0.0/`
- `index.js` (bundled tool)
- `metadata.json` (for package manager)

## Benefits

1. **No source code in main repo** - Only metadata files
2. **Automated validation** - CI ensures tools work before merge
3. **Version control** - Each version is a separate submission
4. **Security scanning** - Automated checks for malicious code
5. **Reproducible builds** - Anyone can verify the build from source
6. **Easy submission** - Just create a YAML file
7. **Distributed hosting** - Tools stay in author's repositories