import { useSnapshot } from 'valtio';
import { store, actions } from '../index';
import { MessageRegistryMessage } from '../../registry/messages';
import { GrokToolCall } from '../../clanker/client';

export const useMessages = () => {
  const snap = useSnapshot(store);
  const messages = snap.messages;
  
  return {
    messages,
    addMessage: actions.addMessage,
    updateMessage: actions.updateMessage,
    clearMessages: actions.clearMessages,
    setMessages: actions.setMessages,
  };
};

export const useMessageStreaming = () => {
  return {
    startStreaming: actions.startStreaming,
    appendToMessage: actions.appendToMessage,
    finishStreaming: actions.finishStreaming,
  };
};

export const useMessageTools = () => {
  return {
    addToolCalls: actions.addToolCalls,
  };
};

// Selector hooks for specific message queries
export const useLatestMessage = () => {
  const snap = useSnapshot(store);
  return snap.messages.length > 0 
    ? snap.messages[snap.messages.length - 1] 
    : null;
};

export const useMessageById = (id: string) => {
  const snap = useSnapshot(store);
  return snap.messages.find(msg => msg.id === id);
};

export const useUserMessages = () => {
  const snap = useSnapshot(store);
  return snap.messages.filter(msg => msg.role === 'user');
};

export const useAssistantMessages = () => {
  const snap = useSnapshot(store);
  return snap.messages.filter(msg => msg.role === 'assistant');
};