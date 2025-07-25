import React from 'react';
import { Text, Box } from 'ink';
import { DiffBlock } from '../../utils/diff-parser';

interface EnhancedDiffViewProps {
    blocks: DiffBlock[];
    filePath: string;
    stats: {
        appliedCount: number;
        failedCount: number;
        conflictCount: number;
        totalBlocks: number;
    };
    maxBlocksToShow?: number;
}

/**
 * Enhanced diff view with beautiful formatting
 */
export const EnhancedDiffView: React.FC<EnhancedDiffViewProps> = ({
    blocks,
    filePath,
    stats,
    maxBlocksToShow = 5
}) => {
    const blocksToShow = blocks.slice(0, maxBlocksToShow);
    const hiddenCount = blocks.length - blocksToShow.length;
    
    return (
        <Box flexDirection="column">
            {/* Summary */}
            <Box marginBottom={1}>
                <Text color="cyan" bold>Summary: </Text>
                <Text color="green">{stats.appliedCount} applied</Text>
                {stats.failedCount > 0 && (
                    <>
                        <Text color="gray"> • </Text>
                        <Text color="yellow">{stats.failedCount} failed</Text>
                    </>
                )}
                {stats.conflictCount > 0 && (
                    <>
                        <Text color="gray"> • </Text>
                        <Text color="red">{stats.conflictCount} conflicts</Text>
                    </>
                )}
            </Box>
            
            {/* Diff blocks */}
            <Box flexDirection="column">
                {blocksToShow.map((block, index) => (
                    <Box key={index} flexDirection="column" marginBottom={1}>
                        <Box>
                            <Text color="gray" dimColor>
                                [{index + 1}/{blocks.length}] 
                            </Text>
                            <Text color="cyan" dimColor> {getBlockDescription(block)}</Text>
                        </Box>
                        
                        <Box flexDirection="column" paddingLeft={2}>
                            {/* Search content with background */}
                            <Box>
                                <Text backgroundColor="red" color="white">-</Text>
                                <Text> </Text>
                                <Text backgroundColor="red" color="white">{formatContent(block.search)}</Text>
                            </Box>
                            
                            {/* Replace content with background */}
                            <Box>
                                <Text backgroundColor="green" color="white">+</Text>
                                <Text> </Text>
                                <Text backgroundColor="green" color="white">{formatContent(block.replace)}</Text>
                            </Box>
                        </Box>
                    </Box>
                ))}
                
                {hiddenCount > 0 && (
                    <Box marginTop={1}>
                        <Text color="gray" dimColor>
                            ... and {hiddenCount} more replacement{hiddenCount !== 1 ? 's' : ''}
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

/**
 * Get a description for the block type
 */
function getBlockDescription(block: DiffBlock): string {
    const searchLines = block.search.split('\n').length;
    const replaceLines = block.replace.split('\n').length;
    
    if (searchLines > 1 || replaceLines > 1) {
        return `${searchLines} → ${replaceLines} lines`;
    }
    
    if (block.search.length > 50 || block.replace.length > 50) {
        return 'large replacement';
    }
    
    return 'text replacement';
}

/**
 * Format content for display
 */
function formatContent(content: string): string {
    // Replace newlines with visible indicator
    let formatted = content.replace(/\n/g, '↵\n');
    
    // Truncate if too long
    const maxLength = 80;
    if (formatted.length > maxLength) {
        const lines = formatted.split('\n');
        if (lines.length > 3) {
            // Show first 2 lines and last line
            formatted = lines.slice(0, 2).join('\n') + '\n...\n' + lines[lines.length - 1];
        } else {
            // Truncate long single line
            formatted = formatted.substring(0, maxLength - 3) + '...';
        }
    }
    
    return formatted;
}