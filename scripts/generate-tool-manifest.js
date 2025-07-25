#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateToolManifest() {
  console.log('Generating tool manifest...');
  
  // Find all tool files in src/tools/dynamic
  const toolFiles = await glob('src/tools/dynamic/*.tsx', {
    cwd: path.join(__dirname, '..'),
    absolute: false
  });
  
  // Extract tool names from file paths
  const tools = toolFiles.map(file => {
    const basename = path.basename(file, '.tsx');
    return {
      id: basename.replace(/-/g, '_'), // Convert kebab-case to snake_case
      module: `./tools/dynamic/${basename}.js` // Path in dist folder
    };
  });
  
  // Generate manifest content
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    tools: tools
  };
  
  // Write manifest to dist folder
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
  
  const manifestPath = path.join(distPath, 'tool-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`Generated manifest with ${tools.length} tools at ${manifestPath}`);
  console.log('Tools:', tools.map(t => t.id).join(', '));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateToolManifest().catch(console.error);
}

export { generateToolManifest };