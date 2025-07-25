import React from 'react';
import { Text, Box } from 'ink';
import { DiffBlock } from '../../utils/diff-parser';

interface MultiDiffViewProps {
  blocks: DiffBlock[];
  filePath?: string;
  showStats?: boolean;
  maxBlocksToShow?: number;
}

/**
 * Component to display multiple diff blocks
 */
export const MultiDiffView: React.FC<MultiDiffViewProps> = ({
  blocks,
  filePath,
  showStats = true,
  maxBlocksToShow = 5
}) => {
  if (blocks.length === 0) {
    return (
      <Text color="gray" dimColor>No changes to display</Text>
    );
  }

  const blocksToShow = blocks.slice(0, maxBlocksToShow);
  const hiddenCount = blocks.length - blocksToShow.length;

  return (
    <Box flexDirection="column">
      {showStats && (
        <Box marginBottom={1}>
          <Text color="cyan">
            {blocks.length} replacement{blocks.length !== 1 ? 's' : ''} to apply
          </Text>
          {filePath && (
            <>
              <Text color="gray"> in </Text>
              <Text color="white">{filePath}</Text>
            </>
          )}
        </Box>
      )}

      {blocksToShow.map((block, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="gray" dimColor>
              [{index + 1}/{blocks.length}] {block.format} replacement
            </Text>
          </Box>
          
          <Box flexDirection="column" paddingLeft={2}>
            {/* Search content */}
            <Box>
              <Text color="red">- </Text>
              <Text color="gray">{truncateContent(block.search, 80)}</Text>
            </Box>
            
            {/* Replace content */}
            <Box>
              <Text color="green">+ </Text>
              <Text color="gray">{truncateContent(block.replace, 80)}</Text>
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
  );
};

/**
 * Truncate content for display
 */
function truncateContent(content: string, maxLength: number): string {
  const normalized = content.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.substring(0, maxLength - 3) + '...';
}