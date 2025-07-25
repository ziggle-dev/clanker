#!/usr/bin/env node

/**
 * Bundle all built-in tools for the Clanker registry
 * This script creates standalone versions of all built-in tools
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Tool metadata for all 14 built-in tools
const BUILTIN_TOOLS = [
  { id: 'bash', name: 'Bash Command Executor', description: 'Execute bash commands with timeout and output capture' },
  { id: 'create_todo_list', name: 'Create Todo List', description: 'Create a new todo list for planning and tracking tasks' },
  { id: 'input', name: 'User Input', description: 'Show a platform-specific input dialog to get information from the user' },
  { id: 'list_todos', name: 'List Todos', description: 'List all current todos in the todo list' },
  { id: 'list', name: 'List Files', description: 'List files and directories in a given path' },
  { id: 'multi_edit', name: 'Multi Edit', description: 'Flexible file editing tool with order-invariant algorithm' },
  { id: 'pwd', name: 'Print Working Directory', description: 'Get the current working directory path' },
  { id: 'read_file', name: 'Read File', description: 'Read an entire file to prepare for editing' },
  { id: 'remove', name: 'Remove Files', description: 'Delete one or more files with confirmation' },
  { id: 'search', name: 'Search Files', description: 'Search for files containing a pattern using ripgrep' },
  { id: 'summarize', name: 'Summarize Text', description: 'Intelligently summarize text content into structured markdown' },
  { id: 'update_todo_list', name: 'Update Todo List', description: 'Update existing todos in the todo list' },
  { id: 'view_file', name: 'View File', description: 'View contents of a file or list directory contents' },
  { id: 'write_to_file', name: 'Write to File', description: 'Write complete content to a file' }
];

async function bundleTool(toolFile, outputDir) {
  const toolName = path.basename(toolFile, '.tsx');
  const outputFile = path.join(outputDir, `${toolName}.js`);
  
  console.log(`Bundling ${toolName}...`);
  
  try {
    await build({
      entryPoints: [toolFile],
      bundle: true,
      platform: 'node',
      target: 'node16',
      format: 'cjs',
      outfile: outputFile,
      external: ['react', 'ink', '@ziggler/clanker'],
      minify: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    // Wrap the bundle to ensure it exports correctly
    const bundleContent = await fs.readFile(outputFile, 'utf-8');
    const wrappedContent = `
// Bundled tool: ${toolName}
// Generated on ${new Date().toISOString()}

${bundleContent}

// Ensure the tool is exported
if (typeof module !== 'undefined' && module.exports && module.exports.default) {
  module.exports = module.exports.default;
}
`;
    
    await fs.writeFile(outputFile, wrappedContent);
    
    return { success: true, toolName, outputFile };
  } catch (error) {
    console.error(`Failed to bundle ${toolName}:`, error);
    return { success: false, toolName, error: error.message };
  }
}

async function createToolMetadata(tool) {
  const metadata = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    author: "Clanker Team",
    versions: {
      "1.0.0": {
        date: new Date().toISOString().split('T')[0],
        dependencies: {},
        minClankerVersion: "0.1.0",
        size: 0 // Will be updated after bundling
      }
    },
    latest: "1.0.0",
    tags: ["builtin", "official"],
    homepage: "https://github.com/ziggle-dev/clanker",
    repository: "https://github.com/ziggle-dev/clanker"
  };
  
  return metadata;
}

async function main() {
  console.log('🔧 Bundling built-in tools for registry...\n');
  
  const outputBase = path.join(rootDir, 'clanker-tools-setup', 'tools', 'clanker');
  
  // Create output directories
  await fs.mkdir(outputBase, { recursive: true });
  
  // Get all tool files
  const toolFiles = await glob('src/tools/dynamic/*.tsx', {
    cwd: rootDir,
    absolute: true
  });
  
  console.log(`Found ${toolFiles.length} tool files\n`);
  
  const results = [];
  
  for (const toolFile of toolFiles) {
    const toolName = path.basename(toolFile, '.tsx');
    const toolId = toolName.replace(/-/g, '_');
    
    // Find metadata for this tool
    const toolMeta = BUILTIN_TOOLS.find(t => t.id === toolId);
    if (!toolMeta) {
      console.warn(`⚠️  No metadata found for ${toolName}, skipping...`);
      continue;
    }
    
    // Create tool directory structure
    const toolDir = path.join(outputBase, toolName);
    const versionDir = path.join(toolDir, '1.0.0');
    await fs.mkdir(versionDir, { recursive: true });
    
    // Bundle the tool
    const result = await bundleTool(toolFile, versionDir);
    
    if (result.success) {
      // Get file size
      const stats = await fs.stat(path.join(versionDir, `${toolName}.js`));
      
      // Rename to index.js
      await fs.rename(
        path.join(versionDir, `${toolName}.js`),
        path.join(versionDir, 'index.js')
      );
      
      // Create metadata
      const metadata = await createToolMetadata(toolMeta);
      metadata.versions['1.0.0'].size = stats.size;
      
      await fs.writeFile(
        path.join(toolDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`✅ ${toolName} (${(stats.size / 1024).toFixed(1)}KB)`);
      results.push({ ...result, size: stats.size });
    } else {
      console.log(`❌ ${toolName} - ${result.error}`);
      results.push(result);
    }
  }
  
  // Update registry
  const registryPath = path.join(rootDir, 'clanker-tools-setup', 'registry.json');
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
  
  // Add all successfully bundled tools to registry
  for (const result of results.filter(r => r.success)) {
    const toolName = result.toolName.replace(/_/g, '-');
    const existing = registry.tools.find(t => t.org === 'clanker' && t.name === toolName);
    
    if (!existing) {
      const toolMeta = BUILTIN_TOOLS.find(t => t.id === result.toolName.replace(/-/g, '_'));
      registry.tools.push({
        org: 'clanker',
        name: toolName,
        description: toolMeta?.description || 'Built-in Clanker tool',
        latest: '1.0.0',
        downloads: 0,
        stars: 0
      });
    }
  }
  
  registry.lastUpdated = new Date().toISOString();
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`Total tools: ${toolFiles.length}`);
  console.log(`Successfully bundled: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Total size: ${(results.filter(r => r.success).reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(1)}KB`);
  
  console.log('\n✨ Done!');
}

main().catch(console.error);