/**
 * Write to file tool - creates or overwrites files with complete content
 */

import React from 'react';
import {Text, Box} from 'ink';
import * as fs from 'fs/promises';
import * as path from 'path';
import {createTool, ToolCategory, ToolCapability, ExtractToolArgs} from '../../registry';
import {ConfirmationService} from '../../utils/confirmation-service';
import {CompactOutput, ToolOutput} from '../../ui/components/tool-output';
import {fileTrackerActions} from '../../store/store';

// Shared state
let confirmationService: ConfirmationService;

/**
 * Write to file tool - creates or overwrites files with complete content
 */
const writeToFileTool = createTool()
    .id('write_to_file')
    .name('Write to File')
    .description('Write complete content to a file (create new or overwrite existing)')
    .category(ToolCategory.FileSystem)
    .capabilities(ToolCapability.FileWrite, ToolCapability.UserConfirmation)
    .tags('file', 'write', 'create', 'overwrite')

    // Arguments
    .stringArg('path', 'Path where the file should be written', {required: true})
    .stringArg('content', 'Complete content to write to the file', {required: true})
    .booleanArg('create_only', 'Fail if file already exists (default: false)', {default: false})

    // Examples
    .examples([
        {
            description: "Create a new file",
            arguments: {
                path: "src/hello.ts",
                content: "console.log('Hello, world!');"
            },
            result: "Creates hello.ts with the provided content"
        },
        {
            description: "Overwrite existing file",
            arguments: {
                path: "README.md",
                content: "# New Content\nThis replaces the entire file."
            },
            result: "Overwrites README.md with new content"
        },
        {
            description: "Create only (fail if exists)",
            arguments: {
                path: "config.json",
                content: "{}",
                create_only: true
            },
            result: "Creates config.json only if it doesn't exist"
        }
    ])

    // Initialize
    .onInitialize(async (context) => {
        confirmationService = ConfirmationService.getInstance();
        context.logger?.debug("Write to File tool initialized");
    })

    // Execute
    .execute(async (args, context) => {
        const {path: filePath, content, create_only} = args as {
            path: string;
            content: string;
            create_only: boolean;
        };

        context.logger?.debug(`Writing to file: ${filePath}`);
        context.logger?.debug(`Content length: ${content.length} bytes`);
        context.logger?.debug(`Create only: ${create_only}`);

        try {
            // Check if file exists
            let fileExists = false;
            let existingContent = '';

            try {
                existingContent = await fs.readFile(filePath, 'utf8');
                fileExists = true;
            } catch {
                fileExists = false;
            }

            // Handle create_only flag
            if (create_only && fileExists) {
                context.logger?.warn(`File ${filePath} already exists (create_only=true)`);
                return {
                    success: false,
                    error: `File already exists: ${filePath}. Set create_only to false to overwrite.`
                };
            }

            // Request confirmation
            const sessionFlags = confirmationService.getSessionFlags();
            if (!sessionFlags.createFiles && !sessionFlags.allOperations) {
                const operation = fileExists ? 'Overwrite file' : 'Create file';
                const warningMessage = fileExists ?
                    `WARNING: This will OVERWRITE the existing file!\n\nExisting content (first 500 chars):\n${existingContent.slice(0, 500)}${existingContent.length > 500 ? '...' : ''}\n\n` : '';

                const confirmationResult = await confirmationService.requestConfirmation({
                    operation: operation,
                    filename: filePath,
                    content: `${warningMessage}New content (first 500 chars):\n${content.slice(0, 500)}${content.length > 500 ? '...' : ''}`
                }, 'file_create');

                if (!confirmationResult.confirmed) {
                    context.logger?.info(`File write cancelled by user`);
                    return {
                        success: false,
                        error: confirmationResult.feedback || 'File write cancelled by user'
                    };
                }
            }

            // Ensure directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, {recursive: true});

            // Write file
            await fs.writeFile(filePath, content, 'utf8');

            // Update file tracker
            fileTrackerActions.updateFile(filePath, content);

            const message = fileExists ?
                `Successfully overwrote file: ${filePath}` :
                `Successfully created file: ${filePath}`;

            context.logger?.info(message);

            return {
                success: true,
                output: message,
                data: {
                    filePath,
                    fileExists,
                    contentLength: content.length,
                    lines: content.split('\n').length
                }
            };
        } catch (error) {
            context.logger?.error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })

    // Custom renderer
    .renderResult(({isExecuting, result, arguments: args}) => {
        if (isExecuting) {
            return (
                <CompactOutput>
                    <Text color="cyan"> Writing file...</Text>
                </CompactOutput>
            );
        }

        if (!result || !result.success) {
            return (
                <CompactOutput>
                    <Text color="red"> {result?.error || 'Failed to write file'}</Text>
                </CompactOutput>
            );
        }

        const data = result.data as {
            filePath?: string;
            fileExists?: boolean;
            contentLength?: number;
            lines?: number;
        };

        const filePath = data?.filePath || (args.path as string);
        const action = data?.fileExists ? 'Overwrote' : 'Created';

        return (
            <ToolOutput>
                <Box flexDirection="column">
                    <Box>
                        <Text color="green">✓ {action} </Text>
                        <Text color="cyan" bold>{path.basename(filePath)}</Text>
                        <Text color="gray"> in </Text>
                        <Text color="gray" dimColor>{path.dirname(filePath)}/</Text>
                    </Box>
                    {data?.lines && (
                        <Text color="gray" dimColor>
                            {data.lines} lines • {data.contentLength} bytes
                        </Text>
                    )}
                </Box>
            </ToolOutput>
        );
    })

    .build();

export default writeToFileTool;

// Export type
export type WriteToFileArgs = ExtractToolArgs<typeof writeToFileTool>;