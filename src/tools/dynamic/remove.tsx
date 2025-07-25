/**
 * Remove (delete) file tool with confirmation
 */

import React from 'react';
import { Box, Text } from 'ink';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTool, ToolCategory, ToolCapability, ExtractToolArgs } from '../../registry';
import { ConfirmationService } from '../../utils/confirmation-service';

const removeTool = createTool()
    .id('remove')
    .name('Remove Files')
    .description('Delete one or more files (requires confirmation)')
    .category(ToolCategory.FileSystem)
    .capabilities(ToolCapability.FileWrite)
    .tags('delete', 'remove', 'rm', 'unlink', 'filesystem')
    
    // Arguments - accept either a single path or array of paths
    .stringArg('path', 'File path to remove (for single file)', { required: false })
    .arrayArg('paths', 'Array of file paths to remove (for multiple files)', { required: false })
    .booleanArg('force', 'Skip confirmation (requires dangerously bypass permission)', { default: false })
    
    .examples([
        {
            description: "Remove a single file",
            arguments: { path: "temp.txt" },
            result: "File removed: temp.txt"
        },
        {
            description: "Remove multiple files",
            arguments: { paths: ["file1.txt", "file2.txt", "file3.txt"] },
            result: "3 files removed successfully"
        }
    ])
    
    .renderResult(({ isExecuting, result, arguments: args }) => {
        if (isExecuting) {
            const count = (args as any).paths?.length || 1;
            return <Text color="yellow">⎿ Preparing to remove {count} file{count > 1 ? 's' : ''}...</Text>;
        }
        
        if (!result?.success) {
            return <Text color="red">⎿ {result?.error || 'Failed to remove file(s)'}</Text>;
        }
        
        const data = result.data as any;
        if (data?.removedCount > 1) {
            return (
                <Box flexDirection="column" marginLeft={2}>
                    <Text color="green">⎿ Successfully removed {data.removedCount} files</Text>
                    {data.removed?.map((file: string, i: number) => (
                        <Text key={i} color="gray">  • {file}</Text>
                    ))}
                </Box>
            );
        }
        
        return <Text color="green">⎿ {result.output}</Text>;
    })
    
    .execute(async (args, context) => {
        const { path: singlePath, paths: multiplePaths, force } = args as {
            path?: string;
            paths?: string[];
            force?: boolean;
        };
        
        // Validate arguments
        if (!singlePath && (!multiplePaths || multiplePaths.length === 0)) {
            return {
                success: false,
                error: 'Either "path" or "paths" argument is required'
            };
        }
        
        if (singlePath && multiplePaths) {
            return {
                success: false,
                error: 'Cannot specify both "path" and "paths" - use one or the other'
            };
        }
        
        // Normalize to array
        const filesToRemove = singlePath ? [singlePath] : multiplePaths!;
        
        // Check if files exist
        const existingFiles: string[] = [];
        const missingFiles: string[] = [];
        
        for (const file of filesToRemove) {
            try {
                const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
                const stats = await fs.stat(absolutePath);
                
                if (stats.isDirectory()) {
                    return {
                        success: false,
                        error: `Cannot remove directory: ${file}. Use a different tool for directory operations.`
                    };
                }
                
                existingFiles.push(file);
            } catch (error) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length === filesToRemove.length) {
            return {
                success: false,
                error: `No files found to remove. Missing: ${missingFiles.join(', ')}`
            };
        }
        
        // Build confirmation message
        let confirmMessage = existingFiles.length === 1
            ? `Remove file: ${existingFiles[0]}?`
            : `Remove ${existingFiles.length} files?`;
        
        const fileList = existingFiles.map(f => `• ${f}`).join('\n');
        
        // Request confirmation
        if (!force) {
            const confirmationService = ConfirmationService.getInstance();
            const result = await confirmationService.requestConfirmation({
                operation: 'file_delete',
                filename: existingFiles.length === 1 ? existingFiles[0] : `${existingFiles.length} files`,
                content: confirmMessage + '\n\nFiles to remove:\n' + fileList
            });
            
            if (!result.confirmed) {
                return {
                    success: false,
                    error: result.feedback || 'Operation cancelled by user'
                };
            }
        }
        
        // Remove files
        const removed: string[] = [];
        const failed: string[] = [];
        
        for (const file of existingFiles) {
            try {
                const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
                await fs.unlink(absolutePath);
                removed.push(file);
                context.logger?.info(`Removed file: ${file}`);
            } catch (error) {
                failed.push(file);
                context.logger?.error(`Failed to remove ${file}: ${error}`);
            }
        }
        
        // Handle missing files warning
        let warningMessage = '';
        if (missingFiles.length > 0) {
            warningMessage = `\n\nWarning: ${missingFiles.length} file(s) not found: ${missingFiles.join(', ')}`;
        }
        
        if (failed.length > 0) {
            return {
                success: false,
                error: `Failed to remove ${failed.length} file(s): ${failed.join(', ')}`,
                data: {
                    removed,
                    failed,
                    missing: missingFiles
                }
            };
        }
        
        const output = removed.length === 1
            ? `File removed: ${removed[0]}${warningMessage}`
            : `${removed.length} files removed successfully${warningMessage}`;
        
        return {
            success: true,
            output,
            data: {
                removed,
                removedCount: removed.length,
                missing: missingFiles
            }
        };
    })
    
    .build();

export default removeTool;

// Export type
export type RemoveToolArgs = ExtractToolArgs<typeof removeTool>;