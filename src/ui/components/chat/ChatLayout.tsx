import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient, { GradientName } from 'ink-gradient';
import BigText from 'ink-big-text';
import { useSnapshot } from 'valtio';
import { store } from '../../../store';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ children }) => {
  const snap = useSnapshot(store);
  const [gradientIndex, setGradientIndex] = useState(0);
  
  const gradients: GradientName[] = [
    'passion',
    'fruit',
    'morning',
    'vice',
    'mind',
    'teen',
    'summer',
    'retro'
  ];
  
  useEffect(() => {
    if (!snap.isStreaming) return;
    
    const interval = setInterval(() => {
      setGradientIndex((prev) => (prev + 1) % gradients.length);
    }, 200); // Change gradient every 200ms while streaming
    
    return () => clearInterval(interval);
  }, [snap.isStreaming]);
  
  return (
    <Box flexDirection="column" width="100%">
      <Box paddingX={2}>
        <Box justifyContent="center" marginBottom={1}>
          <Gradient name={snap.isStreaming ? gradients[gradientIndex] : 'passion'}>
            <BigText text="CLANK" font="3d" />
          </Gradient>
        </Box>
        <Box flexDirection="column" marginBottom={0}>
          <Text dimColor>
            Type your request in natural language. Type '/exit' or press Ctrl+C to quit.
          </Text>
        </Box>
      </Box>
      {children}
    </Box>
  );
};