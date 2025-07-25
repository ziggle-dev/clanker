import React from 'react';
import { Box, Text } from 'ink';

interface StartupTipsProps {
  isVisible: boolean;
}

export const StartupTips: React.FC<StartupTipsProps> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan" bold>
        Tips for getting started:
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">
          1. Ask questions, edit files, or run commands.
        </Text>
        <Text color="gray">2. Be specific for the best results.</Text>
        <Text color="gray">
          3. Create GROK.md files to customize your interactions with Grok.
        </Text>
        <Text color="gray">
          4. Press Shift+Tab to toggle auto-edit mode.
        </Text>
        <Text color="gray">5. /help for more information.</Text>
      </Box>
    </Box>
  );
};