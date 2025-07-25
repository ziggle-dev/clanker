/**
 * Tool execution tracking for UI display
 */

import { store, actions } from "../store";
import { ToolResult } from "../types";

export interface ToolExecution {
    id: string;
    toolName: string;
    arguments: Record<string, unknown>;
    status: "executing" | "completed" | "failed";
    result?: ToolResult;
    startTime: Date;
    endTime?: Date;
}

export interface ExecutionEvent {
    type: "started" | "completed" | "failed";
    execution: ToolExecution;
}

/**
 * Execution registry is now just a facade over the Valtio store
 * All methods directly manipulate the store
 */
export const executionRegistry = {
    start(id: string, toolName: string, args: Record<string, unknown>): void {
        // The store generates its own ID, so we need to track the mapping
        const executionId = actions.addExecution({
            toolName,
            arguments: args,
        });
        // Store the mapping from tool call ID to execution ID
        (store as any).toolCallToExecutionMap = (store as any).toolCallToExecutionMap || new Map();
        (store as any).toolCallToExecutionMap.set(id, executionId);
    },

    complete(id: string, result: ToolResult): void {
        // Get the actual execution ID from our mapping
        const toolCallMap = (store as any).toolCallToExecutionMap as Map<string, string> | undefined;
        const executionId = toolCallMap?.get(id) || id;
        
        if (result.success) {
            actions.completeExecution(executionId, result);
        } else {
            actions.failExecution(executionId, result.error || 'Unknown error');
        }
        
        // Don't clean up the mapping - we need it for later lookups
        // The mapping will persist for the session
    },

    get(id: string): ToolExecution | undefined {
        // Check if this is a tool call ID that needs mapping
        const toolCallMap = (store as any).toolCallToExecutionMap as Map<string, string> | undefined;
        const executionId = toolCallMap?.get(id) || id;
        return actions.getExecution(executionId);
    },

    getHistory(): ToolExecution[] {
        return Array.from(store.executions.values());
    },

    clear(): void {
        actions.clearExecutions();
    }
};

// For backward compatibility - just return the global registry object
export function createExecutionRegistry(): typeof executionRegistry {
    return executionRegistry;
}

// Re-export for backward compatibility
export const ExecutionRegistry = executionRegistry;