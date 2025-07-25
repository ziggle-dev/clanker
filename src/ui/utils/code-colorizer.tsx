import React from 'react';
import { Text, Box } from 'ink';

export const colorizeCode = (
  content: string
): React.ReactNode => {
  // Simple plain text rendering - could be enhanced with syntax highlighting later
  return (
    <Box flexDirection="column">
      {content.split('\n').map((line, index) => (
        <Text key={index} wrap="wrap">
          {line}
        </Text>
      ))}
    </Box>
  );
};