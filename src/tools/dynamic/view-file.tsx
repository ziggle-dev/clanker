/**
 * View file tool - reads files and lists directories
 */
import React from 'react';
import {Text, Box} from 'ink';
import * as fs from 'fs/promises';
import * as path from 'path';
import {createTool, ToolCategory, ToolCapability, ExtractToolArgs} from '../../registry';
import {CompactOutput, ToolOutput} from '../../ui/components/tool-output';
import {CodeBlock} from '../../ui/components/code-block';
import {fileTrackerActions} from '../../store/store';

const maxAllowedLines = 100;
// Maximum content size in tokens (rough estimate: 1 token ≈ 4 characters)
const MAX_TOKENS = 25000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN; // 100,000 characters

/**
 * View file tool - reads files and lists directories
 */
const viewFileTool = createTool()
    .id('view_file')
    .name('View File or Directory')
    .description(`View contents of a file or list directory contents (max ${MAX_TOKENS.toLocaleString()} tokens)`)
    .category(ToolCategory.FileSystem)
    .capabilities(ToolCapability.FileRead)
    .tags('file', 'read', 'view', 'directory', 'list')

    // Arguments
    .stringArg('path', 'Path to file or directory to view', {required: true})
    .numberArg('start_line', `Starting line number (1-based). If provided without end_line, shows from this line to end of file or max ${maxAllowedLines} lines`, {
        required: false,
        validate: (value) => value >= 1 || 'Start line must be at least 1'
    })
    .numberArg('end_line', `Ending line number (inclusive). If provided, shows lines from start_line to end_line, max ${maxAllowedLines} lines total`, {
        required: false,
        validate: (value) => value >= 1 || 'End line must be at least 1'
    })

    // Examples
    .examples([
        {
            description: `View entire file (up to ${maxAllowedLines} lines and ${MAX_TOKENS.toLocaleString()} tokens)`,
            arguments: {path: "src/index.ts"},
            result: "Shows the file content with syntax highlighting"
        },
        {
            description: "View specific line range",
            arguments: {path: "src/app.tsx", start_line: 50, end_line: 100},
            result: "Shows lines 50-100 of the file"
        },
        {
            description: "View from a line to end of file",
            arguments: {path: "package.json", start_line: 20},
            result: `Shows from line 20 to end (max ${maxAllowedLines} lines)`
        }
    ])

    // Execute
    .execute(async (args, context) => {
        const {path: filePath, start_line, end_line} = args as {
            path: string;
            start_line?: number;
            end_line?: number;
        };

        context.logger?.debug(`Viewing path: ${filePath}`);
        if (start_line && end_line) {
            context.logger?.debug(`Line range: ${start_line}-${end_line}`);
        }

        try {
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                // List directory contents
                const entries = await fs.readdir(filePath, {withFileTypes: true});
                const formatted = entries
                    .sort((a, b) => {
                        // Directories first, then files
                        if (a.isDirectory() && !b.isDirectory()) return -1;
                        if (!a.isDirectory() && b.isDirectory()) return 1;
                        return a.name.localeCompare(b.name);
                    })
                    .map(entry => {
                        const type = entry.isDirectory() ? 'DIR' : 'FILE';
                        return `[${type}] ${entry.name}`;
                    })
                    .join('\n');

                context.logger?.info(`Listed directory: ${filePath} (${entries.length} entries)`);
                return {
                    success: true,
                    output: `Contents of ${filePath}:\n${formatted}`,
                    data: {
                        type: 'directory',
                        files: entries.map(e => e.name + (e.isDirectory() ? '/' : ''))
                    }
                };
            } else {
                // Read file contents
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.split('\n');

                // Determine line range with max lines limit
                const totalLines = lines.length;
                let startIdx = 0;
                let endIdx = totalLines;

                if (start_line && end_line) {
                    // Both start and end specified
                    startIdx = Math.max(0, Math.min(start_line - 1, totalLines - 1));
                    endIdx = Math.max(startIdx + 1, Math.min(end_line, totalLines));

                    // Enforce max lines limit
                    if (endIdx - startIdx > maxAllowedLines) {
                        endIdx = startIdx + maxAllowedLines;
                        context.logger?.warn(`Requested ${end_line - start_line + 1} lines, limiting to ${maxAllowedLines}`);
                    }
                } else if (start_line) {
                    // Only start specified - show from start to end or max lines
                    startIdx = Math.max(0, Math.min(start_line - 1, totalLines - 1));
                    endIdx = Math.min(totalLines, startIdx + maxAllowedLines);
                } else {
                    // No range specified - show full file up to max lines
                    if (totalLines > maxAllowedLines) {
                        endIdx = maxAllowedLines;
                    }
                }

                // Extract and format the selected lines
                const selectedLines = lines.slice(startIdx, endIdx);
                const selectedContent = selectedLines.join('\n');
                const estimatedTokens = Math.ceil(selectedContent.length / CHARS_PER_TOKEN);
                
                // Check if selected content exceeds token limit
                if (selectedContent.length > MAX_CHARS) {
                    context.logger?.error(`Selected content too large: ${estimatedTokens} tokens`);
                    return {
                        success: false,
                        error: `Selected content too large: ${estimatedTokens.toLocaleString()} tokens (max: ${MAX_TOKENS.toLocaleString()} tokens). Please use a smaller line range. Requested lines ${startIdx + 1}-${endIdx} would return ${selectedLines.length} lines.`
                    };
                }
                
                const formatted = selectedLines
                    .map((line, idx) => `${startIdx + idx + 1}: ${line}`)
                    .join('\n');

                // Create informative output
                let rangeInfo = '';
                if (startIdx > 0 || endIdx < totalLines) {
                    rangeInfo = ` (lines ${startIdx + 1}-${endIdx} of ${totalLines})`;
                } else if (totalLines > maxAllowedLines) {
                    rangeInfo = ` (showing first ${maxAllowedLines} of ${totalLines} lines)`;
                }

                context.logger?.info(`Read file: ${filePath}${rangeInfo} (~${estimatedTokens} tokens)`);
                
                // Update file tracker with full content only if it's not too large
                if (content.length <= MAX_CHARS) {
                    fileTrackerActions.updateFile(filePath, content);
                }

                return {
                    success: true,
                    output: `File: ${filePath}${rangeInfo}:\n${formatted}`,
                    data: {
                        type: 'file',
                        totalLines,
                        displayedLines: selectedLines.length,
                        startLine: startIdx + 1,
                        endLine: endIdx,
                        truncated: endIdx < totalLines,
                        estimatedTokens
                    }
                };
            }
        } catch (error) {
            context.logger?.error(`Failed to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Failed to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })

    // Custom renderer for file content with syntax highlighting
    .renderResult(({isExecuting, result, arguments: args}) => {
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

        const filePath = args.path as string;
        const content = result.output || '';

        // Check if it's a directory listing
        const dataType = (result.data as { type?: string })?.type;
        if (dataType === 'directory') {
            const dirData = result.data as { type?: string; files?: string[] };
            const items = dirData.files || [];
            if (items.length === 0) {
                return (
                    <CompactOutput>
                        <Text color="gray"> Empty directory</Text>
                    </CompactOutput>
                );
            }

            return (
                <ToolOutput>
                    <Box flexDirection="column">
                        {items.map((item, index) => (
                            <Text key={index} color={item.endsWith('/') ? 'cyan' : 'white'}>
                                {item}
                            </Text>
                        ))}
                    </Box>
                </ToolOutput>
            );
        }

        // File content rendering
        let lines = content.split('\n');

        // Remove the "File: path:" header if present
        if (lines[0] && lines[0].startsWith('File: ')) {
            lines = lines.slice(1);
        }

        // Extract line numbers if they're in the content
        let startLineNumber = 1;
        const hasLineNumbers = lines.length > 0 && /^\d+:\s/.test(lines[0]);
        if (hasLineNumbers) {
            // Extract the starting line number from the first line
            const firstLineMatch = lines[0].match(/^(\d+):\s/);
            if (firstLineMatch) {
                startLineNumber = parseInt(firstLineMatch[1], 10);
            }

            // Remove line numbers from content
            lines = lines.map(line => {
                const match = line.match(/^\d+:\s(.*)$/);
                return match ? match[1] : line;
            });
        }

        // Use data from result if available for accurate line info
        const resultData = result.data as {
            totalLines?: number;
            displayedLines?: number;
            startLine?: number;
            endLine?: number;
            truncated?: boolean;
        };

        const totalLines = resultData?.totalLines || lines.length;
        const displayedStartLine = resultData?.startLine || startLineNumber;
        const displayedEndLine = resultData?.endLine || displayedStartLine + lines.length - 1;
        const isPartialView = resultData?.startLine && resultData.startLine > 1;
        const isTruncated = resultData?.truncated || false;

        // Get file extension for syntax highlighting
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
                        <Text color="gray" dimColor>
                            {totalLines} lines
                            {isPartialView ? ` (showing lines ${displayedStartLine}-${displayedEndLine})` :
                                isTruncated ? ` (showing first ${lines.length} lines)` : ''} • {ext || 'plain text'}
                        </Text>
                    </Box>

                    {/* File content with syntax highlighting */}
                    <CodeBlock
                        content={lines.join('\n')}
                        language={ext}
                        showLineNumbers={true}
                        startLineNumber={displayedStartLine}
                    />

                    {/* Truncation notice */}
                    {isTruncated && (
                        <Box marginTop={1}>
                            <Text color="yellow" dimColor>
                                ... {totalLines - displayedEndLine} more lines
                            </Text>
                        </Box>
                    )}
                </Box>
            </ToolOutput>
        );
    })

    .build();

export default viewFileTool;

// Export type
export type ViewFileArgs = ExtractToolArgs<typeof viewFileTool>;