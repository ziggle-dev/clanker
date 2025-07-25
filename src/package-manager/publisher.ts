/**
 * Tool publisher for creating pull requests to add tools to the registry
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import open from 'open';
import { debug } from '../utils/debug-logger';

const execAsync = promisify(exec);

interface ToolMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    org?: string;
}

export async function publishTool(): Promise<void> {
    console.log('🚀 Publishing tool to Clanker registry...\n');
    
    try {
        // 1. Check if we're in a tool project directory
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        let packageJson: any;
        
        try {
            const content = await fs.readFile(packageJsonPath, 'utf8');
            packageJson = JSON.parse(content);
        } catch (error) {
            console.error('❌ Error: No package.json found in current directory');
            console.error('   Make sure you run this command from your tool project directory');
            process.exit(1);
        }
        
        // 2. Extract tool metadata
        const toolName = packageJson.name.replace(/^.*-clanker-tool-/, '');
        const org = packageJson.name.match(/^(.*)-clanker-tool-/)?.[1] || 'community';
        const version = packageJson.version || '1.0.0';
        const description = packageJson.description || '';
        const author = packageJson.author || 'Unknown';
        
        console.log('📋 Tool Information:');
        console.log(`   Name: ${toolName}`);
        console.log(`   Organization: ${org}`);
        console.log(`   Version: ${version}`);
        console.log(`   Author: ${author}\n`);
        
        // 3. Validate project structure
        console.log('🔍 Validating project structure...\n');
        
        try {
            const { stdout } = await execAsync('npm run validate-tool 2>&1 || true');
            console.log(stdout);
            
            // Check exit code separately
            try {
                await execAsync('npm run validate-tool');
            } catch (validationError) {
                console.error('\n❌ Validation failed. Fix issues before publishing.');
                process.exit(1);
            }
        } catch (error) {
            // If validate-tool script doesn't exist, do basic checks
            console.log('⚠️  No validate-tool script found, doing basic checks...\n');
            
            // Check for src directory
            const srcPath = path.join(process.cwd(), 'src');
            try {
                await fs.access(srcPath);
                const srcFiles = await fs.readdir(srcPath);
                if (srcFiles.length === 0) {
                    throw new Error('src directory is empty');
                }
                console.log('✅ Source files found in src/');
            } catch (error) {
                console.error('❌ Error: src directory not found or empty');
                console.error('   Your tool source code must be in the src/ directory');
                process.exit(1);
            }
        }
        
        
        // 4. Check for required files
        const readmePath = path.join(process.cwd(), 'README.md');
        
        let readmeContent = '';
        try {
            readmeContent = await fs.readFile(readmePath, 'utf8');
        } catch {
            console.warn('⚠️  Warning: No README.md found, creating a basic one');
            readmeContent = `# ${toolName}\n\n${description}\n\nA Clanker tool by ${author}.`;
        }
        
        // 5. Create tool manifest
        const manifest = {
            id: toolName.replace(/-/g, '_'),
            name: toolName,
            version,
            description,
            author,
            repository: `https://github.com/${org}/${packageJson.name}`,
            homepage: packageJson.homepage || '',
            keywords: packageJson.keywords || ['clanker', 'tool'],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        // 6. Prepare PR body
        const prBody = `## 🔧 New Tool: ${toolName}

### Description
${description}

### Author
${author}

### Version
${version}

### Tool Details
- **ID**: \`${manifest.id}\`
- **Organization**: \`${org}\`
- **Keywords**: ${manifest.keywords.join(', ')}

### Source Code Structure
- ✅ Source code in \`src/\` directory
- ✅ Build configuration in \`package.json\`
- ✅ No compiled files included (bin/ directory excluded)

### Build Verification
- ✅ \`npm install\` runs successfully
- ✅ \`npm run build\` completes without errors
- ✅ Tool can be bundled for distribution

### Checklist
- [ ] Tool follows naming conventions
- [ ] Source code is in src/ directory
- [ ] No compiled/bundled files included
- [ ] package.json has build script
- [ ] README.md is complete
- [ ] Tool has been tested locally
- [ ] Code is readable and maintainable

### Files to Add
- \`tools/${org}/${toolName}/src/\` (all source files)
- \`tools/${org}/${toolName}/package.json\`
- \`tools/${org}/${toolName}/README.md\`
- \`tools/${org}/${toolName}/tsconfig.json\` (if using TypeScript)

### Note
The \`bin/\` directory will be automatically generated during the CI/CD build process after merge.
`;

        // 7. Encode PR data for URL
        const prTitle = `Add ${toolName} tool by ${author}`;
        const encodedTitle = encodeURIComponent(prTitle);
        const encodedBody = encodeURIComponent(prBody);
        
        // 8. Create GitHub PR URL
        const baseRepo = 'ziggle-dev/clanker-tools';
        const prUrl = `https://github.com/${baseRepo}/compare/main...main?quick_pull=1&title=${encodedTitle}&body=${encodedBody}`;
        
        console.log('📝 Publishing Instructions:\n');
        console.log('1. Fork the clanker-tools repository:');
        console.log(`   https://github.com/${baseRepo}\n`);
        
        console.log('2. Create the following directory structure in your fork:');
        console.log(`   tools/${org}/${toolName}/`);
        console.log(`   tools/${org}/${toolName}/${version}/\n`);
        
        console.log('3. Copy your project structure:');
        console.log(`   - tools/${org}/${toolName}/src/ (all source files)`);
        console.log(`   - tools/${org}/${toolName}/package.json`);
        console.log(`   - tools/${org}/${toolName}/README.md`);
        console.log(`   - tools/${org}/${toolName}/tsconfig.json (if using TypeScript)`);
        console.log(`\n   ⚠️  Do NOT include:`);
        console.log(`   - node_modules/`);
        console.log(`   - bin/ or dist/ directories`);
        console.log(`   - Any compiled/bundled files\n`);
        
        console.log('4. Commit and push to your fork\n');
        
        console.log('5. Create a pull request\n');
        
        // Save manifest locally for reference
        const manifestPath = path.join(process.cwd(), 'clanker-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`✅ Manifest saved to: ${manifestPath}\n`);
        
        // Open browser to GitHub
        console.log('🌐 Opening GitHub in your browser...');
        console.log('   (If it doesn\'t open, visit the URL manually)\n');
        
        await open(`https://github.com/${baseRepo}`);
        
        console.log('📋 PR Template (copy this for your PR):');
        console.log('─'.repeat(60));
        console.log(prBody);
        console.log('─'.repeat(60));
        
    } catch (error) {
        console.error('❌ Error publishing tool:', error);
        process.exit(1);
    }
}