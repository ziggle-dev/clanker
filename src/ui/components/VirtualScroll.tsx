import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

interface VirtualScrollProps {
  children: React.ReactElement[];
  maxHeight: number;
  estimatedItemHeight?: number;
  getItemHeight?: (index: number) => number;
}

export const VirtualScroll: React.FC<VirtualScrollProps> = ({ 
  children, 
  maxHeight,
  estimatedItemHeight = 3,
  getItemHeight
}) => {
  // Calculate which items to show
  const visibleItems = useMemo(() => {
    if (!children || children.length === 0) return [];
    
    // Start from the end (most recent messages)
    const items: React.ReactElement[] = [];
    let currentHeight = 0;
    
    // Work backwards from the most recent message
    for (let i = children.length - 1; i >= 0; i--) {
      // Use custom height function if provided, otherwise use estimate
      const itemHeight = getItemHeight ? getItemHeight(i) : estimatedItemHeight;
      
      if (currentHeight + itemHeight > maxHeight - 2) { // Leave some buffer
        // We've filled the viewport, stop adding items
        break;
      }
      
      items.unshift(children[i]); // Add to beginning to maintain order
      currentHeight += itemHeight;
    }
    
    return items;
  }, [children, maxHeight, estimatedItemHeight, getItemHeight]);
  
  // Show indicator if there are hidden messages
  const hiddenCount = children.length - visibleItems.length;
  
  return (
    <Box flexDirection="column" height={maxHeight} overflow="hidden" flexShrink={0}>
      {hiddenCount > 0 && (
        <Box marginBottom={1} flexShrink={0}>
          <Text color="gray" dimColor>↑ {hiddenCount} earlier message{hiddenCount > 1 ? 's' : ''}</Text>
        </Box>
      )}
      <Box flexDirection="column" flexGrow={1} overflow="hidden" justifyContent="flex-end">
        {visibleItems}
      </Box>
    </Box>
  );
};