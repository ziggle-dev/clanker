import { GrokMessage, GrokToolCall } from "../clanker/client";
import { store, actions } from "../store";

export interface MessageRegistryMessage {
    id: string;
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    timestamp: Date;
    toolCalls?: GrokToolCall[];
    toolCallId?: string;
    metadata?: {
        isStreaming?: boolean;
        tokenCount?: number;
        processingTime?: number;
    };
}

export interface MessageRegistryEvent {
    type: "added" | "updated" | "removed" | "cleared";
    message?: MessageRegistryMessage;
    messages?: MessageRegistryMessage[];
}

/**
 * Message registry is now just a facade over the Valtio store
 * All methods directly manipulate the store
 */
export const messageRegistry = {
    addMessage(message: Omit<MessageRegistryMessage, "id" | "timestamp">): MessageRegistryMessage {
        actions.addMessage(message);
        return store.messages[store.messages.length - 1];
    },

    updateMessage(id: string, updates: Partial<MessageRegistryMessage>): void {
        actions.updateMessage(id, updates);
    },

    removeMessage(id: string): void {
        const index = store.messages.findIndex((m) => m.id === id);
        if (index === -1) return;
        
        store.messages.splice(index, 1);
        store.messageCount = store.messages.length;
    },

    clearMessages(): void {
        actions.clearMessages();
    },

    getMessages(): MessageRegistryMessage[] {
        return [...store.messages];
    },

    getMessage(id: string): MessageRegistryMessage | undefined {
        return store.messages.find(m => m.id === id);
    },

    getMessagesByRole(role: MessageRegistryMessage["role"]): MessageRegistryMessage[] {
        return store.messages.filter((m) => m.role === role);
    },

    getLastMessage(): MessageRegistryMessage | undefined {
        return store.messages[store.messages.length - 1];
    },

    getLastMessageByRole(role: MessageRegistryMessage["role"]): MessageRegistryMessage | undefined {
        for (let i = store.messages.length - 1; i >= 0; i--) {
            if (store.messages[i].role === role) {
                return store.messages[i];
            }
        }
        return undefined;
    },

    findMessageWithToolCall(toolCallId: string): MessageRegistryMessage | undefined {
        return store.messages.find((m) =>
            m.toolCalls?.some((tc) => tc.id === toolCallId)
        );
    },

    toGrokMessages(): GrokMessage[] {
        return store.messages.map((msg) => {
            const grokMsg: Record<string, unknown> = {
                role: msg.role,
                content: msg.content,
            };

            if (msg.toolCalls && msg.toolCalls.length > 0) {
                grokMsg.tool_calls = msg.toolCalls;
            }

            if (msg.role === "tool" && msg.toolCallId) {
                grokMsg.tool_call_id = msg.toolCallId;
            }

            return grokMsg as unknown as GrokMessage;
        });
    },

    getStats(): {
        totalMessages: number;
        messagesByRole: Record<MessageRegistryMessage["role"], number>;
        averageTokenCount: number;
        totalTokenCount: number;
    } {
        const stats = {
            totalMessages: store.messages.length,
            messagesByRole: {
                user: 0,
                assistant: 0,
                tool: 0,
                system: 0,
            } as Record<MessageRegistryMessage["role"], number>,
            averageTokenCount: 0,
            totalTokenCount: 0,
        };

        let tokenSum = 0;
        let tokenCount = 0;

        for (const msg of store.messages) {
            stats.messagesByRole[msg.role]++;
            if (msg.metadata?.tokenCount) {
                tokenSum += msg.metadata.tokenCount;
                tokenCount++;
            }
        }

        stats.totalTokenCount = tokenSum;
        stats.averageTokenCount = tokenCount > 0 ? tokenSum / tokenCount : 0;

        return stats;
    },

    // Streaming methods
    startStreaming(messageId: string): void {
        actions.startStreaming(messageId);
    },

    appendToMessage(messageId: string, content: string): void {
        actions.appendToMessage(messageId, content);
    },

    finishStreaming(messageId: string, metadata?: MessageRegistryMessage['metadata']): void {
        actions.finishStreaming(messageId, metadata);
    },

    addToolCalls(messageId: string, toolCalls: GrokToolCall[]): void {
        actions.addToolCalls(messageId, toolCalls);
    }
};

// For backward compatibility - just return the global registry object
export function createMessageRegistry(): typeof messageRegistry {
    return messageRegistry;
}

// Re-export for backward compatibility
export const createRegistry = createMessageRegistry;
export const Messages = messageRegistry;