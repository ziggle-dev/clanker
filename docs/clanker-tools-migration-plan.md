# Clanker Tools Repository Migration Plan

## Overview
This document outlines the migration strategy for transforming the clanker-tools repository into a modern, CI/CD-driven tool registry with automatic building, testing, and publishing.

## Current State vs Target State

### Current State
- Tools are pre-bundled and stored in the repository
- Minimal metadata in separate JSON files
- No automated testing or validation
- Manual process for adding tools
- Loss of tool metadata during bundling

### Target State
- Source-based tool submissions via PR
- Automated build, test, and publish pipeline
- Full metadata preservation
- Branch-based staging for unmerged tools
- Support for experimental/testing tools
- Shared dependency resolution

## Migration Steps

### Phase 1: Repository Structure (Week 1)

1. **Create new repository structure**:
   ```
   clanker-tools/
   ├── .github/
   │   ├── workflows/
   │   │   ├── tool-submission.yml    # Main CI/CD workflow
   │   │   ├── tool-validation.yml    # PR validation
   │   │   └── registry-update.yml    # Post-merge registry update
   │   └── PULL_REQUEST_TEMPLATE/
   │       └── tool_submission.md
   ├── submissions/                    # Source tool submissions
   │   └── README.md
   ├── tools/                         # Published tools (auto-generated)
   │   └── .gitkeep
   ├── scripts/
   │   ├── build-tool.js             # Tool bundling script
   │   ├── validate-tool.js          # Tool validation
   │   ├── test-integration.js       # E2E testing with clanker
   │   └── publish-tool.js           # Publishing to registry
   ├── templates/
   │   ├── tool-template/            # Starter template
   │   └── manifest.schema.json      # Manifest schema
   └── README.md
   ```

2. **Archive current tools** in a `legacy/` directory for reference

3. **Create tool submission guidelines** and templates

### Phase 2: Build Pipeline (Week 1-2)

1. **Tool Bundling Script** (`scripts/build-tool.js`):
   - Use esbuild or rollup for bundling
   - Mark React, Ink, and @ziggler/clanker as external
   - Preserve all metadata from builder pattern
   - Generate manifest.json with full metadata
   - Output single bundled JS file

2. **Manifest Format**:
   ```json
   {
     "id": "tool-id",
     "name": "Tool Name",
     "description": "Tool description",
     "version": "1.0.0",
     "author": {
       "name": "Author Name",
       "email": "email@example.com",
       "github": "username"
     },
     "repository": "https://github.com/user/tool",
     "category": "System",
     "capabilities": ["SystemExecute", "UserConfirmation"],
     "tags": ["bash", "shell", "command"],
     "dependencies": {
       "external": ["react", "ink", "@ziggler/clanker"],
       "bundled": {}
     },
     "clankerVersion": ">=0.1.33",
     "buildInfo": {
       "date": "2025-01-01T00:00:00Z",
       "builder": "esbuild",
       "sourceHash": "abc123...",
       "size": 12345
     }
   }
   ```

3. **Validation Script** (`scripts/validate-tool.js`):
   - Verify tool exports correct structure
   - Check all required metadata present
   - Validate dependencies
   - Run basic smoke tests

### Phase 3: CI/CD Workflow (Week 2)

1. **PR Submission Workflow**:
   ```yaml
   name: Tool Submission
   on:
     pull_request:
       paths:
         - 'submissions/**'
   
   jobs:
     validate:
       - Lint source code
       - Check tool structure
       - Verify metadata completeness
     
     build:
       - Bundle tool with build script
       - Generate manifest.json
       - Upload artifacts
     
     test:
       - Clone latest clanker
       - Install tool to temp directory
       - Run integration tests
       - Verify tool appears in --list-tools
     
     staging:
       - Create branch: org/toolname@version
       - Commit bundled tool + manifest
       - Comment on PR with test results
   ```

2. **Post-Merge Workflow**:
   - Move tool from staging branch to main registry
   - Update registry.json
   - Archive staging branch
   - Trigger CDN/cache refresh

### Phase 4: Package Manager Updates (Week 2-3)

1. **Add experimental tool support**:
   ```bash
   # New CLI flags
   clanker --enable-experimental        # Enable experimental tools
   clanker --install org/tool@pr-123    # Install from PR
   clanker --list-experimental          # List available experimental tools
   ```

2. **Update RegistryClient** to:
   - Fetch from staging branches when experimental mode enabled
   - Track which tools are experimental vs stable
   - Handle upgrades from experimental to stable

3. **Add configuration option**:
   ```json
   {
     "experimental": {
       "enabled": false,
       "autoUpgrade": true,  // Auto-upgrade experimental to stable
       "sources": ["pull-requests", "branches"]
     }
   }
   ```

### Phase 5: Tool Migration (Week 3-4)

1. **Migrate core tools** (bash, pwd, list, etc.):
   - Extract source from current clanker codebase
   - Create proper tool packages with full metadata
   - Submit as PRs to test the pipeline
   - Verify all metadata preserved

2. **Create migration guide** for community tools

3. **Deprecation timeline** for old tool format

## Success Criteria

1. All 14 core tools migrated with full metadata
2. CI/CD pipeline successfully builds and tests tools
3. Experimental tools can be installed and tested
4. No regression in tool functionality
5. Clear documentation for tool authors

## Timeline

- Week 1: Repository structure and build scripts
- Week 2: CI/CD implementation
- Week 3: Package manager updates
- Week 4: Tool migration and testing
- Week 5: Documentation and community outreach

## Risks and Mitigations

1. **Risk**: Breaking existing tool installations
   - **Mitigation**: Maintain backward compatibility during transition

2. **Risk**: Complex CI/CD may discourage contributions  
   - **Mitigation**: Provide clear templates and documentation

3. **Risk**: Performance impact from metadata
   - **Mitigation**: Optimize manifest format and loading

## Next Steps

1. Create the new repository structure
2. Implement the build pipeline
3. Set up GitHub Actions workflows
4. Begin migrating core tools