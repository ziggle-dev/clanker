import { createTool } from '../registry/builder';
import { ToolCategory } from '../registry/types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * PWD (Print Working Directory) tool
 */
export const pwdTool = createTool()
    .id('pwd')
    .name('Print Working Directory')
    .description('Get the current working directory path')
    .category(ToolCategory.FileSystem)
    .tags('filesystem', 'navigation', 'directory', 'pwd')
    
    .examples([
        {
            description: "Get current working directory",
            arguments: {},
            result: "/Users/username/projects/my-app"
        }
    ])
    
    .execute(async (args, context) => {
        const cwd = process.cwd();
        
        return {
            success: true,
            output: cwd,
            data: { path: cwd }
        };
    })
    .build();

/**
 * List directory contents tool
 */
export const listTool = createTool()
    .id('list')
    .name('List Directory Contents')
    .description('List files and directories in a given path (defaults to current directory)')
    .category(ToolCategory.FileSystem)
    .tags('filesystem', 'list', 'directory', 'ls')
    
    .stringArg('path', 'Directory path to list (defaults to current directory)', {
        required: false,
        default: '.'
    })
    
    .booleanArg('detailed', 'Show detailed information including file types and sizes', {
        required: false,
        default: false
    })
    
    .examples([
        {
            description: "List current directory",
            arguments: {},
            result: "file1.ts\nfile2.js\nsubdir/\nREADME.md"
        },
        {
            description: "List specific directory",
            arguments: { path: "./src" },
            result: "index.ts\napp.tsx\ncomponents/\nutils/"
        },
        {
            description: "List with detailed information",
            arguments: { path: ".", detailed: true },
            result: "[file] README.md (2.5 KB)\n[file] package.json (1.2 KB)\n[dir] src/\n[dir] node_modules/"
        }
    ])
    
    .execute(async (args, context) => {
        const targetPath = path.resolve(args.path as string || '.');
        const detailed = args.detailed as boolean || false;
        
        try {
            // Check if path exists and is a directory
            const stats = await fs.stat(targetPath);
            if (!stats.isDirectory()) {
                return {
                    success: false,
                    error: `Path is not a directory: ${targetPath}`
                };
            }
            
            // Read directory contents
            const entries = await fs.readdir(targetPath, { withFileTypes: true });
            
            // Sort entries: directories first, then files
            entries.sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });
            
            let output: string;
            const items: { name: string; type: 'dir' | 'file'; size?: number; isDirectory: boolean }[] = [];
            
            if (detailed) {
                // Detailed view with file sizes
                const detailedEntries = await Promise.all(
                    entries.map(async (entry) => {
                        const fullPath = path.join(targetPath, entry.name);
                        const stats = await fs.stat(fullPath);
                        
                        const type = entry.isDirectory() ? 'dir' : 'file';
                        const size = entry.isDirectory() ? '-' : formatFileSize(stats.size);
                        const name = entry.isDirectory() ? `${entry.name}/` : entry.name;
                        
                        items.push({
                            name: entry.name,
                            type,
                            size: stats.size,
                            isDirectory: entry.isDirectory()
                        });
                        
                        return `[${type}] ${name} ${size ? `(${size})` : ''}`.trim();
                    })
                );
                output = detailedEntries.join('\n');
            } else {
                // Simple view
                output = entries.map(entry => 
                    entry.isDirectory() ? `${entry.name}/` : entry.name
                ).join('\n');
                
                entries.forEach(entry => {
                    items.push({
                        name: entry.name,
                        type: entry.isDirectory() ? 'dir' : 'file',
                        isDirectory: entry.isDirectory()
                    });
                });
            }
            
            const summary = `Listed ${entries.length} items in ${targetPath}`;
            
            return {
                success: true,
                output: output || 'Empty directory',
                data: {
                    path: targetPath,
                    count: entries.length,
                    items
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })
    .build();

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

// Export tools
export default [pwdTool, listTool];