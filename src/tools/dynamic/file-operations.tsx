/**
 * Modern file operation tools with order-invariant diff support
 * Replaces create_file and str_replace_editor with more robust implementations
 */

import React from 'react';
import {Text, Box} from 'ink';
import * as fs from 'fs/promises';
import * as path from 'path';
import {createTool, ToolCategory, ToolCapability, ExtractToolArgs} from '../../registry';
import {ConfirmationService} from '../../utils/confirmation-service';
import {CompactOutput, ToolOutput} from '../../ui/components/tool-output';
import {fileTrackerActions} from '../../store/store';
import {diffParser, DiffBlock} from '../../utils/diff-parser';
import {orderInvariantApplicator} from '../../utils/order-invariant-apply';
import {EnhancedDiffView} from '../../ui/components/enhanced-diff-view';

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

/**
 * Replace in file tool - applies multiple search-and-replace operations
 */
const replaceInFileTool = createTool()
    .id('replace_in_file')
    .name('Replace in File')
    .description('Apply multiple search-and-replace operations to a file using order-invariant algorithm')
    .category(ToolCategory.FileSystem)
    .capabilities(ToolCapability.FileRead, ToolCapability.FileWrite, ToolCapability.UserConfirmation)
    .tags('file', 'edit', 'replace', 'modify', 'diff')

    // Arguments
    .stringArg('path', 'Path to the file to edit', {required: true})
    .arrayArg('replacements', 'Array of search-and-replace operations. Each item should have: search (string), replace (string), and optional mode (exact|fuzzy)', {
        required: false
    })
    .stringArg('diff_format', 'Alternative: provide replacements as a diff string in various formats', {
        required: false
    })

    // Examples
    .examples([
        {
            description: "Multiple replacements",
            arguments: {
                path: "src/config.ts",
                replacements: [
                    {search: "localhost", replace: "example.com"},
                    {search: "8080", replace: "443"}
                ]
            },
            result: "Replaces all occurrences in order-invariant way"
        },
        {
            description: "Using diff format",
            arguments: {
                path: "README.md",
                diff_format: "--- old text\n+++ new text\n\n--- another old\n+++ another new"
            },
            result: "Applies diff-formatted replacements"
        }
    ])

    // Initialize
    .onInitialize(async (context) => {
        confirmationService = ConfirmationService.getInstance();
        context.logger?.debug("Replace in File tool initialized");
    })

    // Execute
    .execute(async (args, context) => {
        const {path: filePath, replacements, diff_format} = args as {
            path: string;
            replacements?: Array<{
                search: string;
                replace: string;
                mode?: 'exact' | 'fuzzy';
            }>;
            diff_format?: string;
        };

        context.logger?.debug(`Replacing in file: ${filePath}`);

        try {
            // Check if file has been tracked
            if (!fileTrackerActions.hasFile(filePath)) {
                context.logger?.warn(`File ${filePath} has not been read yet`);
                return {
                    success: false,
                    error: `You must read the file before editing it. Please use read_file to read "${filePath}" first.`
                };
            }

            // Read current content
            const content = await fs.readFile(filePath, 'utf8');

            // Verify file hasn't changed
            if (!fileTrackerActions.verifyFileHash(filePath, content)) {
                context.logger?.warn(`File ${filePath} has been modified since last read`);
                fileTrackerActions.clearFile(filePath);
                return {
                    success: false,
                    error: `File "${filePath}" has been modified since it was last read. Please use read_file to read the latest version before editing.`
                };
            }

            // Parse replacements
            let blocks: DiffBlock[] = [];

            if (diff_format) {
                // Parse diff format
                const parseResult = diffParser.autoDetectFormat(diff_format);
                blocks = parseResult.blocks;

                if (parseResult.errors.length > 0) {
                    context.logger?.warn(`Diff parsing warnings: ${parseResult.errors.join(', ')}`);
                }
            } else if (replacements && replacements.length > 0) {
                // Convert replacements to diff blocks
                blocks = replacements.map(r => ({
                    search: r.search,
                    replace: r.replace,
                    format: 'literal' as const
                }));
            } else {
                return {
                    success: false,
                    error: 'No replacements provided. Use either replacements array or diff_format.'
                };
            }

            // Validate blocks
            const validation = orderInvariantApplicator.validateBlocks(content, blocks);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Invalid replacements:\n${validation.errors.join('\n')}`
                };
            }

            // Apply replacements
            const result = orderInvariantApplicator.apply(content, blocks);

            // Show confirmation
            const sessionFlags = confirmationService.getSessionFlags();
            if (!sessionFlags.editFiles && !sessionFlags.allOperations) {
                let confirmMessage = `Will apply ${result.stats.appliedCount} replacement(s):\n\n`;

                // Show summary of changes
                result.applied.forEach((block, i) => {
                    const searchPreview = block.search.length > 50 ?
                        block.search.substring(0, 47) + '...' : block.search;
                    const replacePreview = block.replace.length > 50 ?
                        block.replace.substring(0, 47) + '...' : block.replace;

                    confirmMessage += `${i + 1}. "${searchPreview}" → "${replacePreview}"\n`;
                });

                if (result.stats.failedCount > 0) {
                    confirmMessage += `\nWarning: ${result.stats.failedCount} replacement(s) could not be applied.`;
                }

                if (result.stats.conflictCount > 0) {
                    confirmMessage += `\nWarning: ${result.stats.conflictCount} conflicting replacement(s) detected.`;
                }

                const confirmationResult = await confirmationService.requestConfirmation({
                    operation: 'Edit file',
                    filename: filePath,
                    content: confirmMessage
                }, 'file_edit');

                if (!confirmationResult.confirmed) {
                    context.logger?.info(`File edit cancelled by user`);
                    return {
                        success: false,
                        error: confirmationResult.feedback || 'Edit cancelled by user'
                    };
                }
            }

            // Write updated content
            if (result.content) {
                await fs.writeFile(filePath, result.content, 'utf8');
                fileTrackerActions.updateFile(filePath, result.content);
            }

            const message = `Successfully applied ${result.stats.appliedCount} replacement(s) in ${filePath}`;
            context.logger?.info(message);

            return {
                success: result.success,
                output: message,
                data: {
                    filePath,
                    stats: result.stats,
                    applied: result.applied,
                    failed: result.failed,
                    conflicts: result.conflicts,
                    originalContent: content,
                    newContent: result.content
                }
            };
        } catch (error) {
            context.logger?.error(`Failed to edit file: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Failed to edit file: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })

    // Custom renderer with enhanced diff view
    .renderResult(({isExecuting, result, arguments: args}) => {
        if (isExecuting) {
            return (
                <CompactOutput>
                    <Text color="cyan"> Applying replacements...</Text>
                </CompactOutput>
            );
        }

        if (!result) {
            return null;
        }

        if (!result.success) {
            return (
                <CompactOutput>
                    <Text color="red"> {result.error || 'Failed to apply replacements'}</Text>
                </CompactOutput>
            );
        }

        const data = result.data as {
            filePath?: string;
            stats?: {
                totalBlocks: number;
                appliedCount: number;
                failedCount: number;
                conflictCount: number;
            };
            applied?: DiffBlock[];
            originalContent?: string;
            newContent?: string;
        };

        if (!data || !data.stats) {
            return (
                <CompactOutput>
                    <Text color="green"> {result.output}</Text>
                </CompactOutput>
            );
        }

        const filePath = data.filePath || (args.path as string);
        const ext = path.extname(filePath).slice(1) || 'text';

        return (
            <ToolOutput>
                <Box flexDirection="column">
                    {/* File header */}
                    <Box marginBottom={1} flexDirection="column">
                        <Box>
                            <Text color="cyan" bold>{path.basename(filePath)}</Text>
                            <Text color="gray"> • </Text>
                            <Text color="gray" dimColor>{path.dirname(filePath)}/</Text>
                        </Box>
                        <Box>
                            <Text color="green">
                                ✓ Applied {data.stats.appliedCount}/{data.stats.totalBlocks} replacements
                            </Text>
                            {data.stats.failedCount > 0 && (
                                <Text color="yellow"> ({data.stats.failedCount} failed)</Text>
                            )}
                            {data.stats.conflictCount > 0 && (
                                <Text color="red"> ({data.stats.conflictCount} conflicts)</Text>
                            )}
                        </Box>
                    </Box>

                    {/* Enhanced diff view */}
                    {data.applied && data.applied.length > 0 && (
                        <Box marginTop={1}>
                            <EnhancedDiffView
                                blocks={data.applied}
                                filePath={filePath}
                                stats={data.stats}
                                maxBlocksToShow={5}
                            />
                        </Box>
                    )}
                </Box>
            </ToolOutput>
        );
    })

    .build();

// Export all tools
export default [writeToFileTool, replaceInFileTool];

// Export types
export type WriteToFileArgs = ExtractToolArgs<typeof writeToFileTool>;
export type ReplaceInFileArgs = ExtractToolArgs<typeof replaceInFileTool>;