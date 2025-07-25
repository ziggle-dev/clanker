/**
 * GrokAgent implementation with dynamic tool registry
 */

import {GrokClient, GrokTool, GrokMessage, GrokToolCall} from './client';
import {ToolResult} from '../types';
import {
    ToolRegistry,
    createToolRegistry,
    ToolLoader,
    createToolLoader,
    generateGrokTools
} from '../registry';
import { createToolExecutorWithRetry } from '../registry/retry-executor';
import {EventEmitter} from 'events';
import {TokenCounter, createTokenCounter} from '../utils/token-counter';
import {debug} from '../utils/debug-logger';
import * as path from 'path';


interface GrokAgentOptions {
    apiKey: string;
    baseURL?: string;
    model?: string;
    maxToolRounds?: number;
    systemPrompt?: string;
    loadDynamicTools?: boolean;
    dynamicToolsPath?: string;
    watchTools?: boolean;
}

export interface StreamingChunk {
    type: 'content' | 'tool_calls' | 'tool_result' | 'done' | 'token_count';
    content?: string;
    toolCalls?: GrokToolCall[];
    toolCall?: GrokToolCall;
    toolResult?: ToolResult;
    tokenCount?: number;
}

export class GrokAgent extends EventEmitter {
    private client: GrokClient;
    private model: string;
    private maxToolRounds: number;
    private registry: ToolRegistry;
    private toolLoader?: ToolLoader;
    private executeToolWithRegistry: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
    private tokenCounter: TokenCounter;

    constructor(options: GrokAgentOptions) {
        super();
        this.client = new GrokClient(
            options.apiKey,
            options.model,
            options.baseURL
        );
        this.model = options.model || 'grok-3-latest';
        this.maxToolRounds = options.maxToolRounds || 30;
        this.tokenCounter = createTokenCounter(this.model);

        // Create registry
        this.registry = createToolRegistry();

        // Create tool executor with retry logic
        this.executeToolWithRegistry = createToolExecutorWithRetry(this.registry);

        // Create tool loader with appropriate directories
        const directories: string[] = [];

        // Always include ~/.clanker
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        if (homeDir) {
            directories.push(path.join(homeDir, '.clanker'));
        }

        // Add custom path if specified
        if (options.dynamicToolsPath) {
            directories.push(options.dynamicToolsPath);
        }

        // Add current directory if dynamic tools enabled
        if (options.loadDynamicTools) {
            directories.push(process.cwd());
        }

        // Create loader
        this.toolLoader = createToolLoader(this.registry, {
            directories: directories.length > 0 ? directories : undefined,
            recursive: true,
            watch: options.watchTools ?? false,
            loadBuiltins: true
        });

        // Tools will be loaded when needed via waitForToolsToLoad()
    }


    async chat(
        messages: GrokMessage[],
        systemPrompt?: string,
        stream: boolean = false
    ): Promise<string | AsyncGenerator<StreamingChunk, void, unknown>> {
        const allMessages: GrokMessage[] = [];

        // Add system prompt if provided
        if (systemPrompt) {
            allMessages.push({role: 'system', content: systemPrompt});
        }

        // Add user messages
        allMessages.push(...messages);

        // Get tool definitions from registry
        const tools = generateGrokTools(this.registry);

        if (stream) {
            return this.streamChat(allMessages, tools);
        } else {
            return this.nonStreamChat(allMessages, tools);
        }
    }

    private async* streamChat(
        messages: GrokMessage[],
        tools: GrokTool[]
    ): AsyncGenerator<StreamingChunk, void, unknown> {
        let rounds = 0;
        let currentMessages = [...messages];
        let totalTokens = this.tokenCounter.countMessageTokens(currentMessages as never); // Start with initial message tokens

        while (rounds < this.maxToolRounds) {
            // Use real streaming from Grok API
            const stream = this.client.chatStream(
                currentMessages,
                tools.length > 0 ? tools : undefined,
                this.model
            );

            let accumulatedContent = '';
            const accumulatedToolCalls: GrokToolCall[] = [];
            let currentToolCall: Partial<GrokToolCall> | null = null;
            let lastFinishReason: string | null = null;

            // Process the stream
            for await (const chunk of stream) {
                // Skip chunks without choices or delta
                if (!chunk.choices || chunk.choices.length === 0 || !chunk.choices[0].delta) {
                    continue;
                }

                // Handle tool calls
                if (chunk.choices[0].delta.tool_calls) {
                    for (const toolCallDelta of chunk.choices[0].delta.tool_calls) {
                        if (toolCallDelta.index === 0 && !currentToolCall) {
                            currentToolCall = {
                                id: toolCallDelta.id,
                                type: 'function' as const,
                                function: {
                                    name: toolCallDelta.function?.name || '',
                                    arguments: toolCallDelta.function?.arguments || ''
                                }
                            };
                        } else if (currentToolCall && toolCallDelta.function?.arguments) {
                            currentToolCall.function!.arguments += toolCallDelta.function.arguments;
                        }
                    }
                }

                // Handle content streaming
                if (chunk.choices[0].delta.content !== undefined && chunk.choices[0].delta.content !== null) {
                    const content = chunk.choices[0].delta.content;
                    accumulatedContent += content;

                    yield {
                        type: 'content',
                        content
                    };

                    // Update token count in real-time
                    const currentOutputTokens = this.tokenCounter.estimateStreamingTokens(accumulatedContent) +
                        (accumulatedToolCalls.length > 0 ? this.tokenCounter.countTokens(JSON.stringify(accumulatedToolCalls)) : 0);

                    yield {
                        type: 'token_count',
                        tokenCount: totalTokens + currentOutputTokens
                    };
                }

                // Check for finish reason
                if (chunk.choices[0].finish_reason) {
                    lastFinishReason = chunk.choices[0].finish_reason;
                    if (currentToolCall) {
                        accumulatedToolCalls.push(currentToolCall as GrokToolCall);
                    }
                    break;
                }
            }

            // Process accumulated results
            if (accumulatedToolCalls.length > 0) {
                // Emit tool calls
                yield {
                    type: 'tool_calls',
                    toolCalls: accumulatedToolCalls
                };

                // Execute tool calls
                const toolResults = await this.executeToolCalls(accumulatedToolCalls);

                // Add assistant message
                const assistantMessage = {
                    role: 'assistant',
                    content: accumulatedContent || '',
                    tool_calls: accumulatedToolCalls
                } as GrokMessage;
                currentMessages.push(assistantMessage);

                // Update total tokens to include the assistant message
                totalTokens = this.tokenCounter.countMessageTokens(currentMessages as never);

                // Add tool results and emit them
                for (let i = 0; i < toolResults.length; i++) {
                    const toolResult = toolResults[i];

                    yield {
                        type: 'tool_result',
                        toolCall: accumulatedToolCalls[i],
                        toolResult
                    };

                    const toolMessage = {
                        role: 'tool',
                        content: this.formatToolResult(toolResult),
                        tool_call_id: accumulatedToolCalls[i].id
                    } as GrokMessage;
                    currentMessages.push(toolMessage);

                    // Update total tokens after each tool result
                    totalTokens = this.tokenCounter.countMessageTokens(currentMessages as never);

                    // Emit updated token count
                    yield {
                        type: 'token_count',
                        tokenCount: totalTokens
                    };
                }

                rounds++;
                currentToolCall = null;
                debug.log(`[Agent] Tool execution complete, continuing to round ${rounds}`);
                // Continue the loop to get assistant's response about the tool results
            } else if (accumulatedContent) {
                // No tool calls but we have content, we're done
                yield {
                    type: 'done'
                };
                return;
            } else if (lastFinishReason === 'tool_calls') {
                // Grok API quirk: finish_reason is tool_calls but no actual tool calls
                // This seems to happen on the first round, continue to get actual response
                rounds++;
            } else {
                // No tool calls and no content, we're done
                yield {
                    type: 'done'
                };
                return;
            }
        }

        throw new Error(`Maximum tool rounds (${this.maxToolRounds}) exceeded`);
    }

    private async nonStreamChat(
        messages: GrokMessage[],
        tools: GrokTool[]
    ): Promise<string> {
        let rounds = 0;
        let currentMessages = [...messages];

        while (rounds < this.maxToolRounds) {
            const response = await this.client.chat(
                currentMessages,
                tools.length > 0 ? tools : undefined,
                this.model
            );

            const message = response.choices[0]?.message;
            if (!message) {
                throw new Error('No response from API');
            }

            if (message.tool_calls && message.tool_calls.length > 0) {
                // Execute tool calls
                const toolResults = await this.executeToolCalls(message.tool_calls);

                // Add assistant message
                currentMessages.push({
                    role: 'assistant',
                    content: message.content,
                    tool_calls: message.tool_calls
                } as GrokMessage);

                // Add tool results
                for (let i = 0; i < toolResults.length; i++) {
                    currentMessages.push({
                        role: 'tool',
                        content: this.formatToolResult(toolResults[i]),
                        tool_call_id: message.tool_calls[i].id
                    } as GrokMessage);
                }

                rounds++;
            } else {
                // No tool calls, return the content
                return message.content || '';
            }
        }

        throw new Error(`Maximum tool rounds (${this.maxToolRounds}) exceeded`);
    }

    private async executeToolCalls(toolCalls: GrokToolCall[]): Promise<ToolResult[]> {
        const results: ToolResult[] = [];

        for (const toolCall of toolCalls) {
            try {
                const result = await this.executeTool(toolCall);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    error: `Tool execution error: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }

        return results;
    }

    async executeTool(toolCall: GrokToolCall): Promise<ToolResult> {
        const toolName = toolCall.function.name;

        // Safely parse arguments
        let args: Record<string, unknown>;
        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch (error) {
            debug.error(`[Agent] Failed to parse arguments for ${toolName}:`);
            debug.error(`[Agent] Raw arguments: ${JSON.stringify(toolCall.function.arguments)}`);
            debug.error(`[Agent] Error: ${error}`);
            
            // Get tool info to provide better error message
            const tool = this.registry.get(toolName);
            // const hasRequiredArgs = tool?.definition.arguments?.some(arg => arg.required) ?? false;
            
            // Build helpful error message
            let errorMessage = `Failed to parse JSON arguments: ${error instanceof Error ? error.message : String(error)}`;
            errorMessage += `\n\nThe raw arguments were: ${toolCall.function.arguments}`;
            
            if (tool) {
                errorMessage += `\n\nTool "${toolName}" expects:`;
                if (!tool.definition.arguments || tool.definition.arguments.length === 0) {
                    errorMessage += '\n- No arguments required (use empty object: {})';
                } else {
                    tool.definition.arguments.forEach(arg => {
                        errorMessage += `\n- ${arg.name}: ${arg.type}${arg.required ? ' (required)' : ' (optional)'}`;
                        if (arg.description) {
                            errorMessage += ` - ${arg.description}`;
                        }
                    });
                }
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }

        return this.executeToolWithRegistry(toolName, args);
    }

    private formatToolResult(result: ToolResult): string {
        if (result.success) {
            return result.output || JSON.stringify(result.data) || 'Success';
        } else {
            return `Error: ${result.error}`;
        }
    }

    // Public API for registry access
    getRegistry(): ToolRegistry {
        return this.registry;
    }
    
    async waitForToolsToLoad(): Promise<void> {
        if (this.toolLoader) {
            await this.toolLoader.loadTools();
        }
    }

    // Get tool statistics
    getToolStats(): Record<string, { executionCount: number; totalDuration: number }> {
        // Type assertion to access the implementation's getExecutionStats method
        const registryImpl = this.registry as ToolRegistry & {
            getExecutionStats(): Record<string, { executionCount: number; totalDuration: number }>
        };
        return registryImpl.getExecutionStats();
    }

    // Get the underlying Grok client
    getClient(): GrokClient {
        return this.client;
    }

    // Reload dynamic tools
    async reloadDynamicTools(): Promise<void> {
        if (this.toolLoader) {
            await this.toolLoader.reloadAllTools();
        }
    }

    // Clean up resources
    dispose(): void {
        this.tokenCounter.dispose();
        if (this.toolLoader) {
            this.toolLoader.cleanup();
        }
    }
}