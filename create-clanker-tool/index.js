#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTool() {
  console.log(chalk.blue.bold('\n🔧 Create Clanker Tool\n'));

  // Get tool information
  const response = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Tool name (lowercase, hyphens):',
      validate: value => /^[a-z0-9-]+$/.test(value) || 'Tool name must be lowercase with hyphens only'
    },
    {
      type: 'text',
      name: 'org',
      message: 'Organization name:',
      initial: 'community',
      validate: value => /^[a-z0-9-]+$/.test(value) || 'Organization must be lowercase with hyphens only'
    },
    {
      type: 'text',
      name: 'description',
      message: 'Tool description:'
    },
    {
      type: 'text',
      name: 'author',
      message: 'Author name:'
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: 'Use TypeScript?',
      initial: true
    }
  ]);

  if (!response.name) {
    console.log(chalk.red('✖ Cancelled'));
    return;
  }

  const { name, org, description, author, typescript } = response;
  const targetDir = path.join(process.cwd(), name);

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`✖ Directory ${name} already exists`));
    return;
  }

  // Create project directory
  console.log(chalk.gray(`\nCreating project in ${targetDir}...`));
  fs.ensureDirSync(targetDir);

  // Copy template files
  const templateDir = path.join(__dirname, 'templates', 'default');
  fs.copySync(templateDir, targetDir);

  // Create package.json
  const packageJson = {
    name: `${org}-clanker-tool-${name}`,
    version: '0.1.0',
    description,
    author,
    type: 'module',
    main: 'bin/index.js',
    scripts: {
      build: typescript ? 'tsc' : 'cp src/index.js bin/index.js',
      dev: typescript ? 'tsx src/index.ts' : 'node src/index.js',
      'dev:watch': 'npm run build && npm run install:local && clanker --watch-tools --debug',
      test: 'echo "No tests yet"',
      bundle: 'esbuild src/index.' + (typescript ? 'ts' : 'js') + ' --bundle --platform=node --target=node16 --external:@ziggler/clanker --outfile=bin/bundle.js --minify',
      'install:local': 'node scripts/install-local.js',
      'publish:tool': 'clanker --publish'
    },
    keywords: ['clanker', 'tool', name],
    devDependencies: {
      '@ziggler/clanker': '^0.1.1',
      'esbuild': '^0.19.0',
      ...(typescript ? {
        'typescript': '^5.0.0',
        'tsx': '^4.0.0',
        '@types/node': '^20.0.0'
      } : {})
    },
    peerDependencies: {
      '@ziggler/clanker': '>=0.1.0'
    }
  };

  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create directories
  fs.ensureDirSync(path.join(targetDir, 'src'));
  fs.ensureDirSync(path.join(targetDir, 'bin'));
  
  // Create source file
  const ext = typescript ? 'ts' : 'js';
  const toolId = name.replace(/-/g, '_');
  
  const sourceCode = `${typescript ? "import { ToolDefinition, ToolResult } from '@ziggler/clanker';\n\n" : ''}const ${toolId}${typescript ? ': ToolDefinition' : ''} = {
  id: '${toolId}',
  name: '${name}',
  description: '${description}',
  
  execute: async (args${typescript ? ': any' : ''})${typescript ? ': Promise<ToolResult>' : ''} => {
    // TODO: Implement your tool logic here
    console.log('Tool executed with args:', args);
    
    return {
      success: true,
      output: \`Hello from ${name}!\`
    };
  },
  
  arguments: [
    {
      name: 'message',
      type: 'string',
      description: 'A message to display',
      required: false
    }
  ]
};

export default ${toolId};
`;

  fs.writeFileSync(
    path.join(targetDir, 'src', `index.${ext}`),
    sourceCode
  );
  
  // Ensure scripts directory is created (template copy should handle this)
  // The install-local.js script will be copied from the template

  // Create TypeScript config if needed
  if (typescript) {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        outDir: './bin',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'bin', 'dist']
    };

    fs.writeFileSync(
      path.join(targetDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }

  // Create README
  const readme = `# ${name}

${description}

A Clanker tool by ${author}.

## Project Structure

\`\`\`
${name}/
├── src/                # Source code (TypeScript/JavaScript)
│   └── index.${ext}    # Tool implementation
├── bin/                # Compiled output (generated, not in git)
│   └── bundle.js       # Bundled tool ready for distribution
├── scripts/            # Development scripts
│   └── install-local.js
├── package.json        # Dependencies and scripts
${typescript ? '├── tsconfig.json       # TypeScript configuration\n' : ''}└── README.md           # This file
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
npm run bundle
\`\`\`

## Testing Locally

1. Build and bundle your tool:
   \`\`\`bash
   npm run build    # Compiles src/ to bin/
   npm run bundle   # Creates bin/bundle.js
   \`\`\`

2. Install locally for development:
   \`\`\`bash
   npm run install:local
   \`\`\`
   
   Or watch for changes during development:
   \`\`\`bash
   npm run dev:watch
   \`\`\`

3. Test with Clanker:
   \`\`\`bash
   clanker --list-tools | grep ${toolId}
   clanker --prompt "Use ${toolId} to test"
   \`\`\`

## Publishing

To publish your tool to the Clanker registry:

\`\`\`bash
npm run publish:tool
\`\`\`

This will:
1. Validate your source structure
2. Ensure only source files are included
3. Create a PR template
4. Guide you through submission

**Important**: Only submit source code!
- ✅ Include: src/, package.json, README.md, tsconfig.json
- ❌ Exclude: bin/, node_modules/, compiled files

The Clanker registry will build your tool automatically after merge.

## Tool Structure

\`\`\`javascript
{
  id: '${toolId}',        // Unique identifier
  name: '${name}',        // Display name
  description: '...',     // What the tool does
  execute: async (args) => {
    // Your tool logic here
  },
  arguments: [
    // Define your tool's arguments
  ]
}
\`\`\`

## Best Practices

1. **Source Control**: Only commit src/ files, not bin/
2. **Testing**: Test thoroughly before publishing
3. **Documentation**: Keep README updated with examples
4. **Versioning**: Use semantic versioning (1.0.0, 1.1.0, 2.0.0)
5. **Dependencies**: Bundle all dependencies in bin/bundle.js
`;

  fs.writeFileSync(path.join(targetDir, 'README.md'), readme);

  // Create .gitignore
  const gitignore = `node_modules/
bin/
dist/
*.log
.DS_Store
.env
clanker-manifest.json
`;

  fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignore);

  // Success message
  console.log(chalk.green('\n✔ Tool created successfully!\n'));
  console.log('Next steps:');
  console.log(chalk.gray(`  cd ${name}`));
  console.log(chalk.gray('  npm install'));
  console.log(chalk.gray('  npm run dev'));
  console.log('\nHappy coding! 🚀\n');
}

// Run the tool
createTool().catch(console.error);