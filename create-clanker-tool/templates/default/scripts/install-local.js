#!/usr/bin/env node

/**
 * Install tool locally for development
 * Copies the built/bundled tool to ~/.clanker/tools for testing
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function installLocal() {
  console.log('📦 Installing tool locally for development...\n');
  
  // Load package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Error: package.json not found');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const toolName = packageJson.name.replace(/^.*-clanker-tool-/, '');
  const org = packageJson.name.match(/^(.*)-clanker-tool-/)?.[1] || 'local';
  
  // Determine source file
  let sourceFile;
  const bundlePath = path.join(process.cwd(), 'bin', 'bundle.js');
  const binPath = path.join(process.cwd(), 'bin', 'index.js');
  const srcPath = path.join(process.cwd(), 'src', 'index.js');
  
  if (fs.existsSync(bundlePath)) {
    sourceFile = bundlePath;
    console.log('✅ Using bundled file:', bundlePath);
  } else if (fs.existsSync(binPath)) {
    sourceFile = binPath;
    console.log('✅ Using compiled file:', binPath);
  } else if (fs.existsSync(srcPath)) {
    sourceFile = srcPath;
    console.log('✅ Using source file:', srcPath);
  } else {
    console.error('❌ Error: No built file found. Run "npm run build" or "npm run bundle" first.');
    console.error('   Expected files in bin/ directory');
    process.exit(1);
  }
  
  // Create target directory
  const toolsDir = path.join(os.homedir(), '.clanker', 'tools');
  const targetFile = path.join(toolsDir, `${toolName}.js`);
  
  // Ensure directory exists
  fs.ensureDirSync(toolsDir);
  
  // Copy file
  try {
    fs.copySync(sourceFile, targetFile);
    console.log(`✅ Tool installed to: ${targetFile}`);
    
    // Create a simple wrapper if using TypeScript compiled output
    if (sourceFile === binPath) {
      const wrapper = `// Auto-generated wrapper for local development
const tool = require('./index.js');
module.exports = tool.default || tool;
`;
      fs.writeFileSync(targetFile, wrapper);
      fs.copySync(binPath, path.join(toolsDir, 'index.js'));
    }
    
    console.log('\n🎉 Tool installed successfully!');
    console.log('\nTest your tool with:');
    console.log('  clanker --list-tools');
    console.log(`  clanker --prompt "Use the ${toolName} tool"`);
    
  } catch (error) {
    console.error('❌ Error installing tool:', error);
    process.exit(1);
  }
}

installLocal().catch(console.error);