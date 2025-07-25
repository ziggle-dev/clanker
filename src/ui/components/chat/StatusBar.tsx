import React from 'react';
import { Box, Text } from 'ink';
import { useSnapshot } from 'valtio';
import { store } from '../../../store';

/**
 * StatusBar component - shows auto-edit status and exit info at the bottom
 */
export const StatusBar: React.FC = () => {
  const snap = useSnapshot(store);
  const autoEditEnabled = snap.autoEditEnabled;
  const showExitConfirmation = snap.exitConfirmation;
  
  return (
    <Box width="100%">
      {showExitConfirmation ? (
        <Text color="yellow" bold>
          Press Ctrl+C again to exit
        </Text>
      ) : (
        <>
          <Text color="cyan">
            {autoEditEnabled ? "▶" : "⏸"} auto-edit:{" "}
            {autoEditEnabled ? "on" : "off"}
          </Text>
          <Text color="gray"> • </Text>
          <Text color="gray">Ctrl+C to exit</Text>
        </>
      )}
    </Box>
  );
};