#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORE_TOOLS_DIR = '/Users/james/Projects/clanker-core-tools';

// Tool definitions
const TOOLS = {
  'list': {
    description: 'List directory contents with filtering',
    keywords: ['ls', 'dir', 'directory', 'files'],
    implementation: `
import { promises as fs } from 'fs';
import path from 'path';

const listTool = {
  id: 'list',
  name: 'list',
  description: 'List directory contents with filtering',
  
  execute: async (args, context) => {
    try {
      const { path: dirPath = '.', ignore = [] } = args;
      
      const workingDir = context?.workingDirectory || process.cwd();
      const resolvedPath = path.isAbsolute(dirPath) 
        ? dirPath 
        : path.join(workingDir, dirPath);
      
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      
      // Filter entries
      const filtered = entries.filter(entry => {
        return !ignore.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\\*/g, '.*') + '$');
            return regex.test(entry.name);
          }
          return entry.name === pattern;
        });
      });
      
      // Format output
      const output = filtered.map(entry => {
        const type = entry.isDirectory() ? 'DIR ' : 'FILE';
        return \`[\${type}] \${entry.name}\`;
      }).join('\\n');
      
      return {
        success: true,
        output: output || '(Empty directory)',
        data: {
          path: resolvedPath,
          count: filtered.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: \`Failed to list directory: \${error.message || error}\`
      };
    }
  },
  
  arguments: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path to list',
      required: false,
      default: '.'
    },
    {
      name: 'ignore',
      type: 'array',
      description: 'Patterns to ignore',
      required: false,
      default: []
    }
  ]
};

export default listTool;`
  },
  
  'write-to-file': {
    description: 'Write content to files with safety checks',
    keywords: ['file', 'write', 'create', 'save'],
    implementation: `
import { promises as fs } from 'fs';
import path from 'path';

const writeToFileTool = {
  id: 'write_to_file',
  name: 'write-to-file',
  description: 'Write content to files with safety checks',
  
  execute: async (args, context) => {
    try {
      const { file_path, content } = args;
      
      if (!file_path) {
        return {
          success: false,
          error: 'File path is required'
        };
      }
      
      if (content === undefined) {
        return {
          success: false,
          error: 'Content is required'
        };
      }
      
      const workingDir = context?.workingDirectory || process.cwd();
      const resolvedPath = path.isAbsolute(file_path) 
        ? file_path 
        : path.join(workingDir, file_path);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(resolvedPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(resolvedPath, content, 'utf-8');
      
      // Get file stats
      const stats = await fs.stat(resolvedPath);
      
      return {
        success: true,
        output: \`File written successfully: \${file_path}\`,
        data: {
          path: resolvedPath,
          size: stats.size,
          lines: content.split('\\n').length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: \`Failed to write file: \${error.message || error}\`
      };
    }
  },
  
  arguments: [
    {
      name: 'file_path',
      type: 'string',
      description: 'Path to the file to write',
      required: true
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to write to the file',
      required: true
    }
  ]
};

export default writeToFileTool;`
  },
  
  'remove': {
    description: 'Remove files or directories',
    keywords: ['delete', 'rm', 'remove', 'unlink'],
    implementation: `
import { promises as fs } from 'fs';
import path from 'path';

const removeTool = {
  id: 'remove',
  name: 'remove',
  description: 'Remove files or directories',
  
  execute: async (args, context) => {
    try {
      const { path: targetPath, recursive = false } = args;
      
      if (!targetPath) {
        return {
          success: false,
          error: 'Path is required'
        };
      }
      
      const workingDir = context?.workingDirectory || process.cwd();
      const resolvedPath = path.isAbsolute(targetPath) 
        ? targetPath 
        : path.join(workingDir, targetPath);
      
      // Check if exists
      try {
        await fs.access(resolvedPath);
      } catch {
        return {
          success: false,
          error: \`Path not found: \${targetPath}\`
        };
      }
      
      // Get stats
      const stats = await fs.stat(resolvedPath);
      
      if (stats.isDirectory()) {
        await fs.rm(resolvedPath, { recursive, force: true });
      } else {
        await fs.unlink(resolvedPath);
      }
      
      return {
        success: true,
        output: \`Removed: \${targetPath}\`,
        data: {
          path: resolvedPath,
          type: stats.isDirectory() ? 'directory' : 'file'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: \`Failed to remove: \${error.message || error}\`
      };
    }
  },
  
  arguments: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to remove',
      required: true
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'Remove directories recursively',
      required: false,
      default: false
    }
  ]
};

export default removeTool;`
  }
};

async function generateTool(toolName, toolDef) {
  console.log(`Generating ${toolName}...`);
  
  const toolDir = path.join(CORE_TOOLS_DIR, 'tools', 'clanker', toolName);
  
  // Create directories
  await fs.mkdir(path.join(toolDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(toolDir, '1.0.0'), { recursive: true });
  
  // Write source file
  await fs.writeFile(
    path.join(toolDir, 'src', 'index.js'),
    toolDef.implementation.trim()
  );
  
  // Write manifest
  const manifest = {
    id: toolName,
    name: toolName,
    organization: "clanker",
    description: toolDef.description,
    author: "Clanker Team",
    license: "MIT",
    homepage: "https://github.com/ziggle-dev/clanker-core-tools",
    repository: {
      type: "git",
      url: "https://github.com/ziggle-dev/clanker-core-tools.git"
    },
    keywords: toolDef.keywords,
    versions: {
      "1.0.0": {
        minClankerVersion: "0.1.0",
        releaseDate: "2024-07-26",
        changelog: "Initial release"
      }
    },
    latestVersion: "1.0.0"
  };
  
  await fs.writeFile(
    path.join(toolDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Write package.json
  const packageJson = {
    name: `@clanker/${toolName}-tool`,
    version: "1.0.0",
    type: "module",
    scripts: {
      build: "esbuild src/index.js --bundle --platform=node --target=node18 --format=cjs --outfile=1.0.0/index.js --external:child_process --external:util --external:fs --external:path --external:os --external:crypto"
    }
  };
  
  await fs.writeFile(
    path.join(toolDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

async function main() {
  console.log('Generating core tools...\n');
  
  for (const [toolName, toolDef] of Object.entries(TOOLS)) {
    await generateTool(toolName, toolDef);
  }
  
  console.log('\n✅ Tools generated successfully!');
}

main().catch(console.error);