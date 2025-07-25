import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

interface ChatLayoutProps {
  children: React.ReactNode;
}

// Memoized static layout component
export const ChatLayout: React.FC<ChatLayoutProps> = React.memo(({ children }) => {
  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box flexGrow={1} overflow="hidden">
        {children}
      </Box>
    </Box>
  );
});