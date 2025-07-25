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
      <Box paddingX={2} flexShrink={0} height={8}>
        <Box justifyContent="center" marginBottom={1}>
          <Gradient name="passion">
            <BigText text="CLANK" font="3d" />
          </Gradient>
        </Box>
        <Box flexDirection="column" marginBottom={0}>
          <Text dimColor>
            Type your request in natural language. Type '/exit' or press Ctrl+C to quit.
          </Text>
        </Box>
      </Box>
      <Box flexGrow={1} overflow="hidden">
        {children}
      </Box>
    </Box>
  );
});