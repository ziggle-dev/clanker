#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as esbuild from 'esbuild';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

async function processToolSubmission(options) {
  const { manifest: manifestPath, org, tool, version } = options;
  
  console.log(`📦 Processing ${org}/${tool}@${version}`);
  
  try {
    // 1. Load and validate manifest
    const manifestContent = await readFile(manifestPath, 'utf8');
    const manifest = yaml.load(manifestContent);
    
    validateManifest(manifest, org, tool, version);
    
    // 2. Clone source repository
    const tempDir = `.tmp/${org}-${tool}-${version}`;
    await cloneRepository(manifest.source, tempDir);
    
    // 3. Build if needed
    if (manifest.source.build) {
      await buildTool(tempDir, manifest.source.build);
    }
    
    // 4. Bundle the tool
    const entryPoint = path.join(
      tempDir,
      manifest.source.build?.outputDir || '',
      manifest.source.build?.outputEntry || manifest.source.entry
    );
    
    const bundledCode = await bundleTool(entryPoint);
    
    // 5. Create metadata.json
    const metadata = createMetadata(manifest, bundledCode);
    
    // 6. Save built files
    const outputDir = `built/${org}/${tool}/${version}`;
    await mkdir(outputDir, { recursive: true });
    
    await writeFile(path.join(outputDir, 'index.js'), bundledCode);
    await writeFile(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    
    console.log(`✅ Successfully built ${org}/${tool}@${version}`);
    
    // 7. Cleanup
    await execAsync(`rm -rf ${tempDir}`);
    
  } catch (error) {
    console.error(`❌ Failed to process ${org}/${tool}@${version}:`, error.message);
    throw error;
  }
}

function validateManifest(manifest, expectedOrg, expectedTool, expectedVersion) {
  // Check required fields
  const required = ['id', 'version', 'name', 'description', 'author', 'source'];
  for (const field of required) {
    if (!manifest[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate ID format
  const [orgPart, toolPart] = manifest.id.split('/');
  if (orgPart !== expectedOrg || toolPart !== expectedTool) {
    throw new Error(`Manifest ID (${manifest.id}) doesn't match path (${expectedOrg}/${expectedTool})`);
  }
  
  // Validate version
  if (manifest.version !== expectedVersion) {
    throw new Error(`Manifest version (${manifest.version}) doesn't match path (${expectedVersion})`);
  }
  
  // Validate source
  if (!manifest.source.repository) {
    throw new Error('Missing source.repository');
  }
  
  if (!manifest.source.tag && !manifest.source.commit && !manifest.source.branch) {
    throw new Error('Must specify source.tag, source.commit, or source.branch');
  }
  
  if (!manifest.source.entry) {
    throw new Error('Missing source.entry');
  }
}

async function cloneRepository(source, tempDir) {
  console.log(`📥 Cloning repository...`);
  
  // Clone the repository
  await execAsync(`git clone ${source.repository} ${tempDir}`);
  
  // Checkout specific version
  if (source.tag) {
    await execAsync(`cd ${tempDir} && git checkout tags/${source.tag}`);
  } else if (source.commit) {
    await execAsync(`cd ${tempDir} && git checkout ${source.commit}`);
  } else if (source.branch) {
    await execAsync(`cd ${tempDir} && git checkout ${source.branch}`);
  }
}

async function buildTool(tempDir, buildConfig) {
  console.log(`🔨 Building tool...`);
  
  const { stdout, stderr } = await execAsync(buildConfig.command, { cwd: tempDir });
  
  if (stderr) {
    console.warn('Build warnings:', stderr);
  }
  
  console.log('Build output:', stdout);
}

async function bundleTool(entryPoint) {
  console.log(`📦 Bundling tool...`);
  
  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    write: false,
    external: [
      // Clanker internals that tools import
      'ink',
      'react',
      '@inkjs/ui',
      'zustand'
    ],
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx'
    }
  });
  
  if (result.errors.length > 0) {
    throw new Error(`Bundle errors: ${result.errors.join(', ')}`);
  }
  
  return result.outputFiles[0].text;
}

function createMetadata(manifest, bundledCode) {
  const now = new Date().toISOString();
  const hash = createHash('sha256').update(bundledCode).digest('hex');
  const size = Buffer.byteLength(bundledCode, 'utf8');
  
  return {
    id: manifest.id.split('/')[1], // Just the tool name
    name: manifest.name,
    description: manifest.description,
    author: manifest.author,
    versions: {
      [manifest.version]: {
        date: now,
        minClankerVersion: manifest.metadata?.minClankerVersion || '0.1.31',
        sha256: hash,
        size: size,
        dependencies: manifest.metadata?.dependencies
      }
    },
    latest: manifest.version,
    tags: manifest.metadata?.tags || [],
    homepage: manifest.metadata?.homepage || manifest.source.repository,
    repository: manifest.source.repository,
    category: manifest.metadata?.category,
    license: manifest.license
  };
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
  }
  
  processToolSubmission(options).catch(error => {
    console.error(error);
    process.exit(1);
  });
}