import {useSnapshot} from 'valtio';
import {store} from '../store';
import {executionRegistry as ExecutionRegistryType} from '../registry/execution';

/**
 * Hook to track execution state and force updates when executions change
 * Now uses Valtio store subscription instead of event emitters
 */
export const useExecutionTracking = (executionRegistry: typeof ExecutionRegistryType) => {
    // Subscribe to executions in the store
    const snap = useSnapshot(store);
    const executions = snap.executions;

    // Check if any tools are currently executing
    const hasExecutingTools = executionRegistry.getHistory().some(
        execution => execution.status === "executing"
    );

    return {
        hasExecutingTools,
    };
};