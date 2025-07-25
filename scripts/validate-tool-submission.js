#!/usr/bin/env node

/**
 * Validates a tool submission for the clanker-tools registry
 * Ensures proper structure and buildability
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function validateToolSubmission(toolPath) {
  log('🔍 Validating tool submission...', 'blue');
  
  const errors = [];
  const warnings = [];
  
  // 1. Check required files
  log('\n📁 Checking required files...', 'blue');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'src'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(toolPath, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file/directory: ${file}`);
    } else {
      log(`  ✅ ${file}`, 'green');
    }
  }
  
  // 2. Check package.json structure
  log('\n📦 Validating package.json...', 'blue');
  
  const packageJsonPath = path.join(toolPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check required fields
      if (!packageJson.name) {
        errors.push('package.json missing "name" field');
      } else if (!packageJson.name.includes('-clanker-tool-')) {
        errors.push('package.json name must follow format: org-clanker-tool-name');
      }
      
      if (!packageJson.version) {
        errors.push('package.json missing "version" field');
      }
      
      if (!packageJson.description) {
        warnings.push('package.json missing "description" field');
      }
      
      // Check scripts
      if (!packageJson.scripts) {
        errors.push('package.json missing "scripts" field');
      } else {
        if (!packageJson.scripts.build) {
          errors.push('package.json missing "build" script');
        }
        if (!packageJson.scripts.bundle) {
          warnings.push('package.json missing "bundle" script');
        }
      }
      
      log('  ✅ package.json structure valid', 'green');
      
    } catch (error) {
      errors.push(`Invalid package.json: ${error.message}`);
    }
  }
  
  // 3. Check source directory
  log('\n📂 Checking source directory...', 'blue');
  
  const srcPath = path.join(toolPath, 'src');
  if (fs.existsSync(srcPath)) {
    const srcFiles = fs.readdirSync(srcPath);
    if (srcFiles.length === 0) {
      errors.push('src directory is empty');
    } else {
      // Check for index file
      const hasIndex = srcFiles.some(file => 
        file === 'index.js' || 
        file === 'index.ts' || 
        file === 'index.jsx' || 
        file === 'index.tsx'
      );
      
      if (!hasIndex) {
        errors.push('No index file found in src directory');
      } else {
        log('  ✅ Source files found', 'green');
      }
    }
  }
  
  // 4. Check for forbidden directories
  log('\n🚫 Checking for forbidden directories...', 'blue');
  
  const forbiddenDirs = ['bin', 'dist', 'build', 'out'];
  for (const dir of forbiddenDirs) {
    const dirPath = path.join(toolPath, dir);
    if (fs.existsSync(dirPath)) {
      errors.push(`Forbidden directory found: ${dir}/ (should not be committed)`);
    }
  }
  
  if (errors.length === 0) {
    log('  ✅ No forbidden directories', 'green');
  }
  
  // 5. Check .gitignore
  log('\n📝 Checking .gitignore...', 'blue');
  
  const gitignorePath = path.join(toolPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    warnings.push('No .gitignore file found');
  } else {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const shouldIgnore = ['node_modules', 'bin/', 'dist/'];
    
    for (const pattern of shouldIgnore) {
      if (!gitignore.includes(pattern)) {
        warnings.push(`.gitignore should include: ${pattern}`);
      }
    }
    
    if (warnings.length === 0) {
      log('  ✅ .gitignore properly configured', 'green');
    }
  }
  
  // 6. Test build process
  if (errors.length === 0) {
    log('\n🔨 Testing build process...', 'blue');
    
    try {
      // Install dependencies
      log('  📦 Installing dependencies...', 'yellow');
      await execAsync('npm install', { cwd: toolPath });
      
      // Run build
      log('  🏗️  Running build...', 'yellow');
      await execAsync('npm run build', { cwd: toolPath });
      
      // Check if bin directory was created
      const binPath = path.join(toolPath, 'bin');
      if (!fs.existsSync(binPath)) {
        errors.push('Build did not create bin directory');
      } else {
        const binFiles = fs.readdirSync(binPath);
        if (binFiles.length === 0) {
          errors.push('Build created empty bin directory');
        } else {
          log('  ✅ Build successful', 'green');
        }
      }
      
      // Try bundle if script exists
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.scripts?.bundle) {
        log('  📦 Running bundle...', 'yellow');
        await execAsync('npm run bundle', { cwd: toolPath });
        
        const bundlePath = path.join(toolPath, 'bin', 'bundle.js');
        if (!fs.existsSync(bundlePath)) {
          warnings.push('Bundle script did not create bin/bundle.js');
        } else {
          log('  ✅ Bundle successful', 'green');
        }
      }
      
    } catch (error) {
      errors.push(`Build failed: ${error.message}`);
    }
  }
  
  // 7. Summary
  log('\n📊 Validation Summary', 'blue');
  log('=' .repeat(50));
  
  if (errors.length === 0 && warnings.length === 0) {
    log('✅ All checks passed!', 'green');
    log('\nTool is ready for submission.', 'green');
    return true;
  }
  
  if (errors.length > 0) {
    log(`\n❌ Errors (${errors.length}):`, 'red');
    errors.forEach(error => log(`   • ${error}`, 'red'));
  }
  
  if (warnings.length > 0) {
    log(`\n⚠️  Warnings (${warnings.length}):`, 'yellow');
    warnings.forEach(warning => log(`   • ${warning}`, 'yellow'));
  }
  
  if (errors.length > 0) {
    log('\n❌ Validation failed. Fix errors before submitting.', 'red');
    return false;
  } else {
    log('\n✅ Validation passed with warnings.', 'green');
    return true;
  }
}

// Main execution
async function main() {
  const toolPath = process.argv[2] || process.cwd();
  
  if (!fs.existsSync(toolPath)) {
    log(`Error: Path not found: ${toolPath}`, 'red');
    process.exit(1);
  }
  
  log(`Validating tool at: ${toolPath}\n`);
  
  try {
    const isValid = await validateToolSubmission(toolPath);
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateToolSubmission };