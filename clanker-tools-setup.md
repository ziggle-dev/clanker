# Setting up the Clanker Tools Repository

## Repository Structure

The new clanker-tools repository should have this structure:

```
clanker-tools/
├── .github/
│   └── workflows/
│       └── process-submissions.yml
├── manifests/              # User submissions go here
│   └── README.md          # Instructions for contributors
├── tools/                  # Built tools (auto-generated)
│   └── .gitkeep
├── scripts/                # Build and validation scripts
│   ├── process-tool.js
│   ├── validate-manifest.js
│   └── security-scan.js
├── package.json
├── README.md
└── CONTRIBUTING.md
```

## Setup Instructions

1. **Create the repository structure**:

```bash
mkdir -p clanker-tools/{.github/workflows,manifests,tools,scripts}
cd clanker-tools
```

2. **Create package.json**:

```json
{
  "name": "@clanker/tools-registry",
  "version": "1.0.0",
  "description": "Official Clanker Tools Registry",
  "type": "module",
  "scripts": {
    "process-tool": "node scripts/process-tool.js",
    "validate-manifest": "node scripts/validate-manifest.js",
    "security-scan": "node scripts/security-scan.js"
  },
  "dependencies": {
    "esbuild": "^0.19.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.0.0"
  }
}
```

3. **Add the GitHub Actions workflow** (copy from clanker-tools-workflow.yml)

4. **Add the process-tool script** (copy from process-tool-submission.js)

5. **Create manifests/README.md**:

```markdown
# Contributing Tools to Clanker

To submit a tool to the Clanker registry:

1. Create a directory structure: `manifests/<first-letter>/<org-name>/<tool-name>/<version>/`
2. Add a `manifest.yaml` file following the format below
3. Submit a pull request

## Manifest Format

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full manifest format.

## Example

```yaml
id: "myorg/awesome-tool"
version: "1.0.0"
name: "Awesome Tool"
description: "A tool that does awesome things"
author: "Your Name"
license: "MIT"

source:
  repository: "https://github.com/myorg/awesome-tool"
  tag: "v1.0.0"
  entry: "src/index.ts"

metadata:
  minClankerVersion: "0.1.31"
  category: "productivity"
  tags: ["awesome", "tool"]
```
```

6. **Create CONTRIBUTING.md** with the full submission format documentation

## Migration Plan

For the existing core tools, we can:

1. Keep them in clanker-core-tools temporarily
2. Create manifest files for each in the new clanker-tools repo
3. Point the manifests to the clanker repository source
4. Eventually phase out clanker-core-tools

Example manifest for bash tool:

```yaml
id: "clanker/bash"
version: "1.0.0"
name: "Bash"
description: "Execute shell commands with timeout and security controls"
author: "Clanker Team"
license: "MIT"

source:
  repository: "https://github.com/ziggle-dev/clanker"
  tag: "v0.1.31"
  entry: "src/tools/dynamic/bash.tsx"

metadata:
  minClankerVersion: "0.1.0"
  category: "system"
  tags: ["shell", "command", "execute", "terminal"]
  homepage: "https://github.com/ziggle-dev/clanker"
```