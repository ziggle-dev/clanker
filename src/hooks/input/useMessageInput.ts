import {useCallback, MutableRefObject, useRef} from 'react';
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
    
    // Refs for throttled updates
    const contentBufferRef = useRef<{ [messageId: string]: string }>({});
    const updateTimerRef = useRef<{ [messageId: string]: NodeJS.Timeout | null }>({});

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
                debug.log('[useMessageInput] Starting to stream response...');

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
                                        debug.log('[useMessageInput] Creating new assistant message');
                                        // Create message with first chunk of content immediately
                                        currentAssistantMessage = messageRegistry.addMessage({
                                            role: "assistant",
                                            content: chunk.content, // Start with first chunk
                                            metadata: {isStreaming: true},
                                        });
                                        hasToolCalls = false; // Reset for new message
                                        
                                        // Initialize buffer with this content
                                        contentBufferRef.current[currentAssistantMessage.id] = chunk.content;
                                        debug.log(`[useMessageInput] Created message with initial content: ${chunk.content.substring(0, 50)}...`);
                                        continue; // Skip the buffering logic below since we already added content
                                    }

                                    // Buffer content and throttle updates
                                    const messageId = currentAssistantMessage.id;
                                    
                                    // Initialize buffer if needed
                                    if (!contentBufferRef.current[messageId]) {
                                        contentBufferRef.current[messageId] = messageRegistry.getMessages().find(m => m.id === messageId)?.content || '';
                                        
                                        // First chunk - update immediately for instant feedback
                                        contentBufferRef.current[messageId] += chunk.content;
                                        messageRegistry.updateMessage(messageId, {
                                            content: contentBufferRef.current[messageId]
                                        });
                                        debug.log(`[useMessageInput] First chunk displayed immediately for message ${messageId}`);
                                    } else {
                                        // Subsequent chunks - buffer and throttle
                                        contentBufferRef.current[messageId] += chunk.content;
                                        
                                        // Clear existing timer
                                        if (updateTimerRef.current[messageId]) {
                                            clearTimeout(updateTimerRef.current[messageId]!);
                                        }
                                        
                                        // Schedule update
                                        updateTimerRef.current[messageId] = setTimeout(() => {
                                            const bufferedContent = contentBufferRef.current[messageId];
                                            if (bufferedContent) {
                                                debug.log(`[useMessageInput] Updating message ${messageId} with ${bufferedContent.length} chars`);
                                                messageRegistry.updateMessage(messageId, {
                                                    content: bufferedContent
                                                });
                                            } else {
                                                debug.warn(`[useMessageInput] No buffered content for message ${messageId}`);
                                            }
                                            updateTimerRef.current[messageId] = null;
                                        }, 100); // Reduced from 250ms to 100ms for faster updates
                                        
                                        debug.log(`[useMessageInput] Buffered content for message ${messageId}: ${chunk.content.substring(0, 50)}...`);
                                    }
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
                                    
                                    // Reset currentAssistantMessage so the next content creates a new message
                                    currentAssistantMessage = null;
                                }
                                break;

                            case 'token_count':
                                if (chunk.tokenCount !== undefined) {
                                    actions.updateTokenCount(chunk.tokenCount);
                                    if (currentAssistantMessage) {
                                        // Get fresh message data to ensure we have latest metadata
                                        const currentMsg = messageRegistry.getMessages().find(m => m.id === currentAssistantMessage.id);
                                        if (currentMsg) {
                                            messageRegistry.updateMessage(currentAssistantMessage.id, {
                                                metadata: {
                                                    ...currentMsg.metadata,
                                                    tokenCount: chunk.tokenCount
                                                },
                                            });
                                        }
                                    }
                                }
                                break;

                            case 'done':
                                if (currentAssistantMessage) {
                                    const messageId = currentAssistantMessage.id;
                                    
                                    // Flush any remaining buffered content
                                    if (updateTimerRef.current[messageId]) {
                                        clearTimeout(updateTimerRef.current[messageId]!);
                                        updateTimerRef.current[messageId] = null;
                                    }
                                    
                                    const finalContent = contentBufferRef.current[messageId];
                                    const currentMsg = messageRegistry.getMessages().find(m => m.id === messageId);
                                    
                                    if (finalContent) {
                                        messageRegistry.updateMessage(messageId, {
                                            content: finalContent,
                                            metadata: {
                                                ...(currentMsg?.metadata || {}),
                                                isStreaming: false,
                                                processingTime: Date.now() - processingStartTime.current,
                                            },
                                        });
                                    } else {
                                        messageRegistry.updateMessage(messageId, {
                                            metadata: {
                                                ...(currentMsg?.metadata || {}),
                                                isStreaming: false,
                                                processingTime: Date.now() - processingStartTime.current,
                                            },
                                        });
                                    }
                                    
                                    // Clean up buffers
                                    delete contentBufferRef.current[messageId];
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
                
                // Clean up any remaining timers and buffers
                Object.keys(updateTimerRef.current).forEach(messageId => {
                    if (updateTimerRef.current[messageId]) {
                        clearTimeout(updateTimerRef.current[messageId]!);
                        
                        // Flush any remaining content
                        const bufferedContent = contentBufferRef.current[messageId];
                        if (bufferedContent) {
                            messageRegistry.updateMessage(messageId, {
                                content: bufferedContent
                            });
                        }
                    }
                });
                
                // Clear all refs
                contentBufferRef.current = {};
                updateTimerRef.current = {};
            }
        },
        [agent, messageRegistry, executionRegistry, processingStartTime]
    );

    return {
        sendMessage,
    };
};