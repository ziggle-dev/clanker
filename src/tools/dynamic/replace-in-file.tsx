/**
 * Replace in file tool - applies multiple search-and-replace operations
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

export default replaceInFileTool;

// Export type
export type ReplaceInFileArgs = ExtractToolArgs<typeof replaceInFileTool>;