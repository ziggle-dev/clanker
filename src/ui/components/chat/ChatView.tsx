import React from 'react';
import { Box } from 'ink';
import { useSnapshot } from 'valtio';
import { store } from '../../../store';
import { CommandSuggestions } from '../command-suggestions';
import { ModelSelection } from '../model-selection';
import { ChatInput } from './ChatInput';
import ConfirmationDialog from '../confirmation-dialog';
import { StatusBar } from './StatusBar';
import { StartupTips } from './StartupTips';
import { useRegistries } from '../../../hooks/useRegistries';
import { useConfirmationHandler } from '../../../hooks/useConfirmationHandler';
import { ChatHistory } from '../chat-history';

/**
 * ChatView component - main chat interface view
 * Uses Zustand store and hooks directly - no props needed
 */
export const ChatView: React.FC = () => {
  // Get registries from hook
  const { messageRegistry, executionRegistry } = useRegistries();
  
  // Get agent and tool registry from store
  const snap = useSnapshot(store);
  const agent = snap.agent;
  const toolRegistry = agent?.getRegistry();
  
  // Get confirmation state and handlers
  const confirmationOptions = snap.confirmationOptions;
  const { handleConfirmation, handleRejection } = useConfirmationHandler();
  
  // Check if we have messages
  const hasMessages = messageRegistry.getMessages().length > 0;
  
  return (
    <>
      <StartupTips isVisible={!hasMessages && !confirmationOptions} />
      
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        <ChatHistory
          messageRegistry={messageRegistry}
          executionRegistry={executionRegistry}
          toolRegistry={toolRegistry}
          isConfirmationActive={!!confirmationOptions}
        />
      </Box>

      {confirmationOptions && (
        <ConfirmationDialog
          operation={confirmationOptions.operation}
          filename={confirmationOptions.filename}
          content={confirmationOptions.content}
          onConfirm={handleConfirmation}
          onReject={handleRejection}
        />
      )}

      {!confirmationOptions && (
        <>
          <ChatInput />
          <StatusBar />
          <CommandSuggestions />
          <ModelSelection />
        </>
      )}
    </>
  );
};