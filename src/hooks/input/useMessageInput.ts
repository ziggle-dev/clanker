import {useCallback, MutableRefObject} from 'react';
import {actions, store} from '../../store';
import {useSnapshot} from 'valtio';
import {GrokAgent} from '../../clanker/agent';
import {messageRegistry as MessageRegistryType, MessageRegistryMessage} from '../../registry/messages';
import {executionRegistry as ExecutionRegistryType} from '../../registry/execution';
import {debug} from '../../utils/debug-logger';
import {TokenCounter} from '../../utils/token-counter';

interface UseMessageInputProps {
    agent: GrokAgent;
    messageRegistry: typeof MessageRegistryType;
    executionRegistry: typeof ExecutionRegistryType;
    processingStartTime: MutableRefObject<number>;
}

export const useMessageInput = ({
                                    agent,
                                    messageRegistry,
                                    executionRegistry,
                                    processingStartTime,
                                }: UseMessageInputProps) => {
    // Use actions.setProcessing directly
    // Use actions.setStreaming directly
    // Use actions.updateTokenCount directly
    // Use actions.setInputValue directly
    
    // Get store state for auto-edit
    const snap = useSnapshot(store);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || !agent) return;

            const userMessage = {
                role: "user" as const,
                content: content.trim(),
            };
            messageRegistry.addMessage(userMessage);

            // Count input tokens
            const tokenCounter = new TokenCounter(snap.model || 'grok-3-mini');
            const inputTokens = tokenCounter.countTokens(userMessage.content);
            actions.updateInputTokenCount(inputTokens);
            tokenCounter.dispose();

            actions.setInputValue("");
            actions.setProcessing(true);
            processingStartTime.current = Date.now();
            actions.updateTokenCount(0);

            // Declare these outside try block for access in finally
            let currentAssistantMessage: MessageRegistryMessage | null = null;

            try {
                const messages = messageRegistry.toGrokMessages();

                // Build system prompt with autonomy instructions
                let systemPrompt = '';
                
                // Add autonomy instruction if auto-edit is enabled
                if (snap.autoEditEnabled) {
                    systemPrompt += '\n\nIMPORTANT: Auto-edit mode is enabled. Work autonomously without asking for confirmation when making file edits. Proceed directly with implementing solutions and making necessary changes.';
                }
                
                // Add todo-related autonomy instruction
                // Since we can't easily check for pending todos from here, we'll add a general instruction
                systemPrompt += '\n\nWhen you have pending tasks in your todo list, work through them autonomously and systematically. Focus on completing tasks without repeatedly asking for confirmation or clarification unless absolutely necessary.';
                
                // Add summarize tool usage instruction
                systemPrompt += '\n\nIMPORTANT: Use the summarize tool proactively in these situations:\n' +
                    '- When analyzing long files or documentation, summarize key points before proceeding\n' +
                    '- After completing multiple related tasks, summarize what was accomplished\n' +
                    '- When encountering verbose output or logs, summarize the essential information\n' +
                    '- Before presenting findings from research or file exploration, summarize the key insights\n' +
                    '- When dealing with complex codebases, summarize the structure and relationships\n' +
                    'The summarize tool helps maintain clarity and ensures important information is highlighted efficiently.';

                actions.setStreaming(true);
                actions.setProcessing(false);

                const response = await agent.chat(messages, systemPrompt || undefined, true);

                let hasToolCalls = false;

                if (typeof response === 'string') {
                    messageRegistry.addMessage({
                        role: "assistant",
                        content: response,
                    });
                } else {
                    for await (const chunk of response) {
                        switch (chunk.type) {
                            case 'content':
                                if (chunk.content) {
                                    if (!currentAssistantMessage || hasToolCalls) {
                                        currentAssistantMessage = messageRegistry.addMessage({
                                            role: "assistant",
                                            content: "", // Start with empty content since we'll append
                                            metadata: {isStreaming: true},
                                        });
                                        hasToolCalls = false; // Reset for new message
                                    }

                                    // Append content directly without buffering
                                    messageRegistry.appendToMessage(currentAssistantMessage.id, chunk.content);
                                }
                                break;

                            case 'tool_calls':
                                if (chunk.toolCalls) {
                                    hasToolCalls = true;

                                    if (currentAssistantMessage) {
                                        messageRegistry.updateMessage(currentAssistantMessage.id, {
                                            toolCalls: chunk.toolCalls,
                                            metadata: {...currentAssistantMessage.metadata, isStreaming: false},
                                        });
                                    }

                                    for (const toolCall of chunk.toolCalls) {
                                        messageRegistry.addMessage({
                                            role: "tool",
                                            content: `Calling ${toolCall.function.name}...`,
                                            toolCallId: toolCall.id,
                                        });

                                        // Track execution start
                                        let args: Record<string, unknown> = {};
                                        try {
                                            args = JSON.parse(toolCall.function.arguments);
                                        } catch (error) {
                                            // If parsing fails, use empty args for tracking
                                            debug.error(`Failed to parse tool arguments for tracking: ${error}`);
                                        }
                                        executionRegistry.start(
                                            toolCall.id,
                                            toolCall.function.name,
                                            args
                                        );
                                    }
                                }
                                break;

                            case 'tool_result':
                                if (chunk.toolCall && chunk.toolResult) {
                                    // Track execution completion
                                    executionRegistry.complete(
                                        chunk.toolCall.id,
                                        chunk.toolResult
                                    );

                                    const toolMessage = messageRegistry.getMessages().find(
                                        m => m.toolCallId === chunk.toolCall?.id
                                    );

                                    if (toolMessage) {
                                        messageRegistry.updateMessage(toolMessage.id, {
                                            content: chunk.toolResult.success
                                                ? `✓ ${chunk.toolCall.function.name} completed`
                                                : `✗ ${chunk.toolCall.function.name} failed: ${chunk.toolResult.error}`,
                                        });
                                    }
                                }
                                break;

                            case 'token_count':
                                if (chunk.tokenCount !== undefined) {
                                    actions.updateTokenCount(chunk.tokenCount);
                                    if (currentAssistantMessage) {
                                        messageRegistry.updateMessage(currentAssistantMessage.id, {
                                            metadata: {
                                                ...currentAssistantMessage.metadata,
                                                tokenCount: chunk.tokenCount
                                            },
                                        });
                                    }
                                }
                                break;

                            case 'done':
                                if (currentAssistantMessage) {
                                    messageRegistry.updateMessage(currentAssistantMessage.id, {
                                        metadata: {
                                            ...currentAssistantMessage.metadata,
                                            isStreaming: false,
                                            processingTime: Date.now() - processingStartTime.current,
                                        },
                                    });
                                }
                                // Exit the async generator loop
                                return;
                        }
                    }
                }
            } catch (error) {
                messageRegistry.addMessage({
                    role: "system",
                    content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                });
            } finally {
                actions.setProcessing(false);
                actions.setStreaming(false);
                processingStartTime.current = 0;
            }
        },
        [agent, messageRegistry, executionRegistry, processingStartTime]
    );

    return {
        sendMessage,
    };
};