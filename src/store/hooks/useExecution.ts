import { useSnapshot } from 'valtio';
import { store, actions } from '../index';
import { ToolExecution } from '../../registry/execution';
import { ToolResult } from '../../types';

export const useExecutions = () => {
  const snap = useSnapshot(store);
  const executions = snap.executions;
  const activeExecutions = snap.activeExecutions;
  
  return {
    executions,
    activeExecutions,
    addExecution: actions.addExecution,
    updateExecution: actions.updateExecution,
    completeExecution: actions.completeExecution,
    failExecution: actions.failExecution,
    getExecution: actions.getExecution,
    clearExecutions: actions.clearExecutions,
  };
};

// Selector hooks for specific execution queries
export const useActiveExecutions = () => {
  const snap = useSnapshot(store);
  const activeExecutions = snap.activeExecutions;
  const executions = snap.executions;
  
  return activeExecutions.map(id => executions.get(id)).filter(Boolean) as ToolExecution[];
};

export const useExecutionById = (id: string) => {
  const snap = useSnapshot(store);
  return snap.executions.get(id);
};

export const useExecutionsByTool = (toolName: string) => {
  const snap = useSnapshot(store);
  const executions = snap.executions;
  
  return Array.from(executions.values()).filter(
    exec => exec.toolName === toolName
  );
};

export const useIsExecuting = () => {
  const snap = useSnapshot(store);
  const activeExecutions = snap.activeExecutions;
  return activeExecutions.length > 0;
};