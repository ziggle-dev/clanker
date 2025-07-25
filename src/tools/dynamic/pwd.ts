/**
 * PWD (Print Working Directory) tool
 */

import { createTool, ToolCategory, ExtractToolArgs } from '../../registry';

/**
 * PWD (Print Working Directory) tool
 */
const pwdTool = createTool()
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

export default pwdTool;

// Export type
export type PwdToolArgs = ExtractToolArgs<typeof pwdTool>;