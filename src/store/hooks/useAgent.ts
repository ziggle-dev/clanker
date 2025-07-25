import { useSnapshot } from 'valtio';
import { store, actions } from '../index';
import { GrokAgent } from '../../clanker/agent';

export const useAgent = () => {
  const snap = useSnapshot(store);
  const agent = snap.agent;
  const isInitializing = snap.isInitializing;
  const initError = snap.initError;
  
  return {
    agent,
    isInitializing,
    initError,
    setAgent: actions.setAgent,
    initializeAgent: actions.initializeAgent,
    clearAgent: actions.clearAgent,
  };
};

// Selector hooks for specific agent states
export const useAgentReady = () => {
  const snap = useSnapshot(store);
  const agent = snap.agent;
  const isInitializing = snap.isInitializing;
  const initError = snap.initError;
  
  return {
    isReady: agent !== null && !isInitializing && !initError,
    isLoading: isInitializing,
    error: initError,
  };
};

export const useAgentModel = () => {
  const snap = useSnapshot(store);
  const agent = snap.agent;
  const model = snap.model;
  
  // Return the model from settings as the source of truth
  // The agent will be updated when the model changes
  return model;
};