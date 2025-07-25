/**
 * Tool composition patterns
 */

import {
    ToolDefinition,
    ComposedTool,
    CompositionPattern,
    ToolArguments,
    ToolContext,
    ToolCategory
} from './types';
import {ToolResult} from '../types';

/**
 * Create a composed tool based on pattern
 */
export function createComposedTool(
    pattern: CompositionPattern,
    tools: ToolDefinition[],
    config?: Record<string, unknown>
): ComposedTool {
    const toolIds = tools.map(t => t.id);
    const name = `${pattern}_${toolIds.join('_')}`;
    const description = `${pattern} composition of: ${toolIds.join(', ')}`;

    let executor: (args: ToolArguments, context: ToolContext) => Promise<ToolResult>;

    switch (pattern) {
        case 'pipeline':
            executor = createPipelineExecutor(tools);
            break;
        case 'parallel':
            executor = createParallelExecutor(tools);
            break;
        case 'conditional':
            executor = createConditionalExecutor(tools, config);
            break;
        case 'map':
            executor = createMapExecutor(tools[0], config);
            break;
        case 'reduce':
            executor = createReduceExecutor(tools[0], config);
            break;
        default:
            throw new Error(`Unknown composition pattern: ${pattern}`);
    }

    const composedTool: ComposedTool = {
        id: name,
        name,
        description,
        category: ToolCategory.Composition,
        composable: true,
        pattern,
        tools: toolIds,
        config,
        execute: executor,

        // Inherit capabilities from all tools
        capabilities: Array.from(new Set(
            tools.flatMap(t => t.capabilities || [])
        ))
    };

    return composedTool;
}

/**
 * Pipeline executor - sequential execution with output chaining
 */
function createPipelineExecutor(tools: ToolDefinition[]) {
    return async (args: ToolArguments, context: ToolContext): Promise<ToolResult> => {
        let currentInput = args;
        let lastResult: ToolResult | null = null;

        for (const tool of tools) {
            const result = await context.registry.execute(tool.id, currentInput);

            if (!result.success) {
                return result;
            }

            // Chain output to next tool's input
            currentInput = (result.data || result.output || {}) as ToolArguments;
            lastResult = result;
        }

        return lastResult || {success: true};
    };
}

/**
 * Parallel executor - concurrent execution
 */
function createParallelExecutor(tools: ToolDefinition[]) {
    return async (args: ToolArguments, context: ToolContext): Promise<ToolResult> => {
        const promises = tools.map(tool =>
            context.registry.execute(tool.id, args)
        );

        const results = await Promise.all(promises);

        // Check if all succeeded
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
            return {
                success: false,
                error: `${failures.length} tools failed: ${failures.map(f => f.error).join(', ')}`
            };
        }

        // Return all results
        return {
            success: true,
            data: results.map(r => r.data || r.output)
        };
    };
}

/**
 * Conditional executor - branching based on condition
 */
function createConditionalExecutor(tools: ToolDefinition[], config: Record<string, unknown>) {
    const {condition, branches} = config;

    return async (args: ToolArguments, context: ToolContext): Promise<ToolResult> => {
        // Evaluate condition
        let branchKey: string;

        if (typeof condition === 'function') {
            branchKey = await condition(args, context);
        } else {
            branchKey = args[condition as string] ? 'true' : 'false';
        }

        // Find tool for branch
        const toolIndex = branches[branchKey];
        if (toolIndex === undefined || toolIndex >= tools.length) {
            return {
                success: false,
                error: `No tool defined for branch: ${branchKey}`
            };
        }

        const tool = tools[toolIndex];
        return context.registry.execute(tool.id, args);
    };
}

/**
 * Map executor - apply tool to each item in collection
 */
function createMapExecutor(tool: ToolDefinition, config: Record<string, unknown> = {}) {
    const concurrency = (config.concurrency as number) || 1;
    const continueOnError = (config.continueOnError as boolean) || false;

    return async (args: ToolArguments, context: ToolContext): Promise<ToolResult> => {
        const {items, ...otherArgs} = args;

        if (!Array.isArray(items)) {
            return {
                success: false,
                error: 'Map requires "items" array in arguments'
            };
        }

        const results: unknown[] = [];
        const errors: Array<{ item: unknown; error: string | undefined }> = [];

        if (concurrency === 1) {
            // Sequential processing
            for (const item of items) {
                const itemArgs = {...otherArgs, item};
                const result = await context.registry.execute(tool.id, itemArgs);

                if (!result.success) {
                    if (!continueOnError) {
                        return result;
                    }
                    errors.push({item, error: result.error});
                } else {
                    results.push(result.data || result.output);
                }
            }
        } else {
            // Parallel processing with concurrency limit
            const chunks: unknown[][] = [];
            for (let i = 0; i < items.length; i += concurrency) {
                chunks.push(items.slice(i, i + concurrency));
            }

            for (const chunk of chunks) {
                const promises = chunk.map(item => {
                    const itemArgs = {...otherArgs, item};
                    return context.registry.execute(tool.id, itemArgs);
                });

                const chunkResults = await Promise.all(promises);

                chunkResults.forEach((result, index) => {
                    if (!result.success) {
                        if (!continueOnError) {
                            return result;
                        }
                        errors.push({item: chunk[index], error: result.error});
                    } else {
                        results.push(result.data || result.output);
                    }
                });
            }
        }

        return {
            success: errors.length === 0 || continueOnError,
            data: results,
            error: errors.length > 0 ? `${errors.length} items failed` : undefined
        };
    };
}

/**
 * Reduce executor - aggregate results
 */
function createReduceExecutor(tool: ToolDefinition, config: Record<string, unknown>) {
    const {reducer, initialValue} = config;

    return async (args: ToolArguments, context: ToolContext): Promise<ToolResult> => {
        const {items, ...otherArgs} = args;

        if (!Array.isArray(items)) {
            return {
                success: false,
                error: 'Reduce requires "items" array in arguments'
            };
        }

        let accumulator = initialValue;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemArgs = {...otherArgs, item, accumulator, index: i};

            const result = await context.registry.execute(tool.id, itemArgs);

            if (!result.success) {
                return result;
            }

            // Apply reducer
            if (typeof reducer === 'function') {
                accumulator = await reducer(accumulator, result.data || result.output, i);
            } else {
                accumulator = result.data || result.output;
            }
        }

        return {
            success: true,
            data: accumulator
        };
    };
}

/**
 * Composition builder with fluent API
 */
export class CompositionBuilder {
    private registry: { get(id: string): { definition: ToolDefinition } | undefined };

    constructor(registry: { get(id: string): { definition: ToolDefinition } | undefined }) {
        this.registry = registry;
    }

    /**
     * Create a pipeline composition
     */
    pipeline(...toolIds: string[]): ComposedTool {
        const tools = toolIds.map(id => {
            const tool = this.registry.get(id);
            if (!tool) throw new Error(`Tool '${id}' not found`);
            return tool.definition;
        });

        return createComposedTool('pipeline', tools);
    }

    /**
     * Create a parallel composition
     */
    parallel(...toolIds: string[]): ComposedTool {
        const tools = toolIds.map(id => {
            const tool = this.registry.get(id);
            if (!tool) throw new Error(`Tool '${id}' not found`);
            return tool.definition;
        });

        return createComposedTool('parallel', tools);
    }

    /**
     * Create a conditional composition
     */
    conditional(
        condition: string | ((args: ToolArguments, context: ToolContext) => string | Promise<string>),
        branches: Record<string, string>
    ): ComposedTool {
        const branchTools: ToolDefinition[] = [];
        const branchMap: Record<string, number> = {};

        Object.entries(branches).forEach(([key, toolId], index) => {
            const tool = this.registry.get(toolId);
            if (!tool) throw new Error(`Tool '${toolId}' not found`);
            branchTools.push(tool.definition);
            branchMap[key] = index;
        });

        return createComposedTool('conditional', branchTools, {
            condition,
            branches: branchMap
        });
    }

    /**
     * Create a map composition
     */
    map(toolId: string, options?: { concurrency?: number; continueOnError?: boolean }): ComposedTool {
        const tool = this.registry.get(toolId);
        if (!tool) throw new Error(`Tool '${toolId}' not found`);

        return createComposedTool('map', [tool.definition], options);
    }

    /**
     * Create a reduce composition
     */
    reduce(
        toolId: string,
        reducer: (acc: unknown, value: unknown, index: number) => unknown,
        initialValue?: unknown
    ): ComposedTool {
        const tool = this.registry.get(toolId);
        if (!tool) throw new Error(`Tool '${toolId}' not found`);

        return createComposedTool('reduce', [tool.definition], {
            reducer,
            initialValue
        });
    }
}