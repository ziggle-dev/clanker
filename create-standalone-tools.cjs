#!/usr/bin/env node

// Script to create standalone versions of tools without React/Ink dependencies
const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, 'src/tools/dynamic');
const outputDir = path.join(__dirname, 'dist/standalone-tools');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Tool templates that work without React
const toolTemplates = {
  'bash.js': `
module.exports = {
  id: 'bash',
  name: 'Bash',
  description: 'Execute a bash command',
  execute: async ({ command, timeout }) => {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const options = { 
        encoding: 'utf8',
        timeout: timeout || 30000
      };
      
      const { stdout, stderr } = await execAsync(command, options);
      
      return {
        success: true,
        output: stdout || stderr || 'Command executed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  arguments: [
    {
      name: 'command',
      type: 'string',
      description: 'The bash command to execute',
      required: true
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Command timeout in milliseconds',
      required: false
    }
  ]
};
`,

  'pwd.js': `
module.exports = {
  id: 'pwd',
  name: 'PWD',
  description: 'Get the current working directory path',
  execute: async () => {
    return {
      success: true,
      output: process.cwd()
    };
  },
  arguments: []
};
`,

  'list.js': `
module.exports = {
  id: 'list',
  name: 'List',
  description: 'List files and directories in a given path (defaults to current directory)',
  execute: async ({ path: dirPath, detailed }) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    const targetPath = dirPath || process.cwd();
    
    try {
      const items = await fs.readdir(targetPath, { withFileTypes: true });
      
      if (!detailed) {
        return {
          success: true,
          output: items.map(item => item.name).join('\\n')
        };
      }
      
      const details = await Promise.all(
        items.map(async (item) => {
          const fullPath = path.join(targetPath, item.name);
          const stats = await fs.stat(fullPath);
          return {
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      return {
        success: true,
        output: JSON.stringify(details, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  arguments: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path to list (defaults to current directory)',
      required: false
    },
    {
      name: 'detailed',
      type: 'boolean',
      description: 'Show detailed information including file types and sizes',
      required: false
    }
  ]
};
`,

  'read_file.js': `
module.exports = {
  id: 'read_file',
  name: 'Read File',
  description: 'Read an entire file to prepare for editing (max 25,000 tokens). This tool must be used before any file editing operations.',
  execute: async ({ path: filePath }) => {
    const fs = require('fs').promises;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Simple token estimation
      const estimatedTokens = Math.ceil(content.length / 4);
      if (estimatedTokens > 25000) {
        return {
          success: false,
          error: \`File is too large (\${estimatedTokens} estimated tokens). Maximum is 25,000 tokens.\`
        };
      }
      
      return {
        success: true,
        output: content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  arguments: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file to read',
      required: true
    }
  ]
};
`
};

// Write the standalone tool files
Object.entries(toolTemplates).forEach(([filename, content]) => {
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, content.trim());
  console.log(`Created ${outputPath}`);
});

console.log('\\nStandalone tools created successfully!');
console.log('Copy these to ~/.clanker/tools/ for dynamic loading.');