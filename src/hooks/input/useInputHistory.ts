import { useState, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { store, actions } from '../../store';
import { messageRegistry as MessageRegistryType } from '../../registry/messages';

interface UseInputHistoryProps {
  messageRegistry: typeof MessageRegistryType;
}

export function useInputHistory({ messageRegistry }: UseInputHistoryProps) {
  const snap = useSnapshot(store);
  const inputValue = snap.inputValue;
  // Use actions.setInputValue directly
  // Use actions.addToHistory directly
  
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [currentInput, setCurrentInput] = useState("");
  
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    const userMessages = messageRegistry.getMessagesByRole("user");
    
    if (direction === 'up') {
      if (userMessages.length > 0) {
        if (historyIndex === null) {
          setCurrentInput(inputValue);
          setHistoryIndex(userMessages.length - 1);
          actions.setInputValue(userMessages[userMessages.length - 1].content);
        } else if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          actions.setInputValue(userMessages[historyIndex - 1].content);
        }
      }
    } else { // down
      if (historyIndex !== null) {
        if (historyIndex < userMessages.length - 1) {
          setHistoryIndex(historyIndex + 1);
          actions.setInputValue(userMessages[historyIndex + 1].content);
        } else {
          setHistoryIndex(null);
          actions.setInputValue(currentInput);
        }
      }
    }
  }, [messageRegistry, inputValue, historyIndex, currentInput]);
  
  const resetHistory = useCallback(() => {
    setHistoryIndex(null);
    setCurrentInput("");
  }, []);
  
  const saveToHistory = useCallback((input: string) => {
    if (input.trim()) {
      actions.addToHistory(input);
    }
    resetHistory();
  }, [resetHistory]);

  return {
    navigateHistory,
    resetHistory,
    saveToHistory,
    isNavigatingHistory: historyIndex !== null,
  };
}