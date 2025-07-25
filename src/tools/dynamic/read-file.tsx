/**
 * Read file tool - reads entire files and tracks them for editing
 */
import React from 'react';
import {Text} from 'ink';
import * as fs from 'fs/promises';
import * as path from 'path';
import {createTool, ToolCategory, ToolCapability, ExtractToolArgs} from '../../registry';
import {CompactOutput} from '../../ui/components/tool-output';
import {fileTrackerActions} from '../../store/store';

// Maximum file size in tokens (rough estimate: 1 token ≈ 4 characters)
const MAX_TOKENS = 25000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN; // 100,000 characters

/**
 * Read file tool - reads entire files and tracks them for editing
 */
const readFileTool = createTool()
    .id('read_file')
    .name('Read Entire File')
    .description(`Read an entire file to prepare for editing (max ${MAX_TOKENS.toLocaleString()} tokens). This tool must be used before any file editing operations.`)
    .category(ToolCategory.FileSystem)
    .capabilities(ToolCapability.FileRead)
    .tags('file', 'read', 'full', 'edit', 'prepare')

    // Arguments
    .stringArg('path', 'Path to the file to read', {required: true})

    // Examples
    .examples([
        {
            description: "Read a file before editing",
            arguments: { path: "src/index.ts" },
            result: "File read and tracked for editing"
        }
    ])

    // Execute
    .execute(async (args, context) => {
        const {path: filePath} = args as {
            path: string;
        };

        context.logger?.debug(`Reading entire file: ${filePath}`);

        try {
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                context.logger?.error(`Path is a directory, not a file: ${filePath}`);
                return {
                    success: false,
                    error: `Cannot read directory: ${filePath}. This tool is for files only.`
                };
            }

            // Check file size first
            const fileSize = stats.size;
            const estimatedTokens = Math.ceil(fileSize / CHARS_PER_TOKEN);
            
            if (fileSize > MAX_CHARS) {
                const lines = (await fs.readFile(filePath, 'utf8')).split('\n').length;
                context.logger?.error(`File too large: ${filePath} (${estimatedTokens} tokens)`);
                return {
                    success: false,
                    error: `File too large: ${estimatedTokens.toLocaleString()} tokens (max: ${MAX_TOKENS.toLocaleString()} tokens). Use view_file with start_line and end_line arguments to read specific sections. File has ${lines.toLocaleString()} total lines.`
                };
            }

            // Read the entire file
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            const totalLines = lines.length;

            // Update file tracker
            fileTrackerActions.updateFile(filePath, content);

            context.logger?.info(`Read entire file: ${filePath} (${totalLines} lines, ~${estimatedTokens} tokens)`);
            
            return {
                success: true,
                output: `Successfully read ${filePath}`,
                data: {
                    filePath,
                    totalLines,
                    sizeInBytes: content.length,
                    estimatedTokens
                }
            };
        } catch (error) {
            context.logger?.error(`Failed to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Failed to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })
    
    // Custom renderer - minimal output
    .renderResult(({ isExecuting, result, arguments: args }) => {
        if (isExecuting) {
            return (
                <CompactOutput>
                    <Text color="cyan"> Reading file...</Text>
                </CompactOutput>
            );
        }

        if (!result || !result.success) {
            return (
                <CompactOutput>
                    <Text color="red"> {result?.error || 'Failed to read file'}</Text>
                </CompactOutput>
            );
        }

        const data = result.data as {
            filePath?: string;
            totalLines?: number;
            sizeInBytes?: number;
        };

        const filePath = data?.filePath || (args.path as string);
        const totalLines = data?.totalLines || 0;

        return (
            <CompactOutput>
                <Text color="green"> Read {path.basename(filePath)} ({totalLines} lines)</Text>
            </CompactOutput>
        );
    })
    
    .build();

export default readFileTool;

// Export type
export type ReadFileArgs = ExtractToolArgs<typeof readFileTool>;