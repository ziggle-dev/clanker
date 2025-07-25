import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { store, actions } from '../../store';
import { GrokAgent } from '../../clanker/agent';
import { messageRegistry as MessageRegistryType, MessageRegistryMessage } from '../../registry/messages';
import { getDefaultCommands } from '../../utils/commands';
import { ConfirmationService } from '../../utils/confirmation-service';

interface UseCommandInputProps {
  agent: GrokAgent;
  messageRegistry: typeof MessageRegistryType;
}

const COMMAND_PREFIX = "/";

export function useCommandInput({ agent, messageRegistry }: UseCommandInputProps) {
  const confirmationService = ConfirmationService.getInstance();
  const commands = getDefaultCommands();
  
  const snap = useSnapshot(store);
  const inputValue = snap.inputValue;
  
  // Use store for command suggestions state
  const showCommandSuggestions = snap.showCommandSuggestions;
  const selectedCommandIndex = snap.selectedCommandIndex;
  
  const setShowCommandSuggestions = (show: boolean) => {
    store.showCommandSuggestions = show;
  };
  
  const setSelectedCommandIndex = (index: number) => {
    store.selectedCommandIndex = index;
  };
  
  const commandSuggestions = inputValue.startsWith(COMMAND_PREFIX)
    ? commands
        .filter((cmd) =>
          cmd.name.toLowerCase().startsWith(inputValue.slice(1).toLowerCase())
        )
        .map((cmd) => `${COMMAND_PREFIX}${cmd.name} - ${cmd.description}`)
    : [];

  useEffect(() => {
    const shouldShow = inputValue.startsWith(COMMAND_PREFIX) && inputValue.length > 1 && commandSuggestions.length > 0;
    setShowCommandSuggestions(shouldShow);
    
    // Also update the command suggestions in the store
    store.commandSuggestions = commandSuggestions;
  }, [inputValue, commandSuggestions.length, commandSuggestions]);

  const handleCommand = useCallback(
    async (command: string) => {
      const parts = command.slice(1).split(" ");
      const cmdName = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      const cmd = commands.find((c) => c.name.toLowerCase() === cmdName);
      if (!cmd) {
        messageRegistry.addMessage({
          role: "system",
          content: `Unknown command: ${command}`,
        });
        return;
      }

      if (cmd.execute) {
        await cmd.execute({
          args,
          agent,
          chatHistory: messageRegistry.getMessages(),
          setChatHistory: (fn) => {
            if (typeof fn === 'function') {
              const currentMessages = messageRegistry.getMessages();
              const newHistory = fn(currentMessages);
              messageRegistry.clearMessages();
              newHistory.forEach((msg: MessageRegistryMessage) => {
                // If the message already has an ID (it's from existing history), keep it
                // Otherwise, addMessage will generate a new ID
                if (msg.id && currentMessages.some(m => m.id === msg.id)) {
                  // It's an existing message, preserve it
                  const { id: _id, ...msgWithoutId } = msg;
                  messageRegistry.addMessage(msgWithoutId);
                } else {
                  // It's a new message, add without ID
                  const { id: _id, ...msgWithoutId } = msg;
                  messageRegistry.addMessage(msgWithoutId);
                }
              });
            } else if (Array.isArray(fn)) {
              // Handle direct array assignment (like setChatHistory([]))
              messageRegistry.clearMessages();
              fn.forEach((msg: MessageRegistryMessage) => {
                const { id: _id, ...msgWithoutId } = msg;
                messageRegistry.addMessage(msgWithoutId);
              });
            }
          },
          setInput: actions.setInputValue,
          setShowModelSelection: actions.toggleModelSelector,
          setAutoEditEnabled: actions.setAutoEdit,
          confirmationService,
        });
      }
    },
    [agent, messageRegistry, confirmationService, commands]
  );
  
  const selectCommandSuggestion = useCallback(() => {
    if (showCommandSuggestions && commandSuggestions.length > 0) {
      const selectedCommand = commandSuggestions[selectedCommandIndex];
      const cmdName = selectedCommand.split(" - ")[0];
      actions.setInputValue(cmdName);
      setShowCommandSuggestions(false);
      setSelectedCommandIndex(0);
    }
  }, [showCommandSuggestions, commandSuggestions, selectedCommandIndex]);
  
  const navigateCommandSuggestions = useCallback((direction: 'up' | 'down') => {
    if (!showCommandSuggestions) return;
    
    if (direction === 'up') {
      setSelectedCommandIndex(
        selectedCommandIndex > 0
          ? selectedCommandIndex - 1
          : commandSuggestions.length - 1
      );
    } else {
      setSelectedCommandIndex(
        selectedCommandIndex < commandSuggestions.length - 1
          ? selectedCommandIndex + 1
          : 0
      );
    }
  }, [showCommandSuggestions, selectedCommandIndex, commandSuggestions.length]);
  
  const cancelCommandSuggestions = useCallback(() => {
    if (showCommandSuggestions) {
      setShowCommandSuggestions(false);
      setSelectedCommandIndex(0);
    }
  }, [showCommandSuggestions]);

  return {
    showCommandSuggestions,
    selectedCommandIndex,
    commandSuggestions,
    handleCommand,
    selectCommandSuggestion,
    navigateCommandSuggestions,
    cancelCommandSuggestions,
    isCommand: inputValue.startsWith(COMMAND_PREFIX),
  };
}