import React, { useCallback } from "react";
import {Box, Text, useStdout} from "ink";
import {useSnapshot} from "valtio";
import {store} from "../../store";
import {messageRegistry as MessageRegistryType, MessageRegistryMessage} from "../../registry/messages";
import {executionRegistry as ExecutionRegistryType, ToolExecution} from "../../registry/execution";
import {ToolRegistry} from "../../registry/types";
import {MarkdownRenderer} from "../utils/markdown-renderer";
import {VirtualScroll} from "./VirtualScroll";
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

/**
 * Format tool execution display - shows tool name and primary argument
 */
function formatToolExecution(toolName: string, args: Record<string, unknown>): React.ReactElement {
    // Get the primary argument based on tool name
    let primaryArg: string | undefined;

    switch (toolName) {
        case 'bash':
            primaryArg = args.command as string;
            break;
        case 'read_file':
        case 'write_file':
        case 'list':
            primaryArg = args.path as string || args.file_path as string;
            break;
        case 'search':
            primaryArg = args.query as string;
            break;
        case 'pwd':
            // No args for pwd
            break;
        default:
            // Try to find the first string argument
            const firstArg = Object.values(args).find(v => typeof v === 'string');
            if (firstArg) {
                primaryArg = firstArg as string;
            }
    }

    if (primaryArg) {
        return (
            <>
                <Text underline color="white">{toolName}</Text>
                <Text color="gray"> ~{'>'} </Text>
                <Text color="cyan">{primaryArg}</Text>
            </>
        );
    }

    return <Text underline color="white">{toolName}</Text>;
}

interface ChatHistoryProps {
    messageRegistry: typeof MessageRegistryType;
    executionRegistry: typeof ExecutionRegistryType;
    toolRegistry: ToolRegistry;
    isConfirmationActive?: boolean;
}

// Helper to determine if we should add extra spacing before this message
const shouldAddExtraSpacing = (entry: MessageRegistryMessage, previousEntry?: MessageRegistryMessage): boolean => {
    if (!previousEntry) return false;
    
    // Add space between tool execution and assistant response
    if (previousEntry.role === 'tool' && entry.role === 'assistant') {
        return true;
    }
    
    // Add space between assistant message with tools and next message
    if (previousEntry.role === 'assistant' && previousEntry.toolCalls && entry.role === 'tool') {
        return true;
    }
    
    return false;
};

const ChatEntry = ({
                       entry,
                       index,
                       execution,
                       toolRegistry,
                       previousEntry
                   }: {
    entry: MessageRegistryMessage;
    index: number;
    execution?: ToolExecution;
    toolRegistry: ToolRegistry;
    previousEntry?: MessageRegistryMessage;
}) => {
    const extraSpacing = shouldAddExtraSpacing(entry, previousEntry);

    switch (entry.role) {
        case "user":
            return (
                <Box key={index} flexDirection="column" marginTop={extraSpacing ? 2 : 1} flexShrink={0}>
                    <Box>
                        <Text color="gray">
                            {">"} {entry.content}
                        </Text>
                    </Box>
                </Box>
            );

        case "assistant":
            // Only hide tool-only messages that have no content and aren't streaming
            if (entry.toolCalls && entry.toolCalls.length > 0 &&
                !entry.content?.trim() &&
                !entry.metadata?.isStreaming) {
                return null;
            }

            return (
                <Box key={index} flexDirection="column" marginTop={extraSpacing ? 3 : 2} marginBottom={1} flexShrink={0}>
                    <Box flexDirection="row" alignItems="flex-start">
                        <Text color="white">⏺ </Text>
                        <Box flexDirection="column" flexGrow={1}>
                            {entry.content && entry.content.trim() ? (
                                <MarkdownRenderer
                                    content={entry.content.trim()}
                                    streamingCursor={entry.metadata?.isStreaming === true}
                                />
                            ) : (
                                entry.metadata?.isStreaming && <Text color="cyan">█</Text>
                            )}
                        </Box>
                    </Box>
                </Box>
            );

        case "tool":
            // Always render based on execution data, not the message content
            if (!execution) {
                // If no execution found, show a placeholder
                return (
                    <Box key={index} flexDirection="column" marginTop={extraSpacing ? 2 : 1} flexShrink={0}>
                        <Box>
                            <Text color="magenta">⏺</Text>
                            <Text> Tool execution pending...</Text>
                        </Box>
                    </Box>
                );
            }

            const isExecuting = execution.status === "executing";
            const result = execution.result;

            // Try to get the tool definition and its custom renderer
            const tool = toolRegistry.get(execution.toolName);

            if (tool?.definition?.renderResult) {
                // Use the custom renderer
                const customRender = tool.definition.renderResult({
                    toolName: execution.toolName,
                    arguments: execution.arguments,
                    result: result,
                    isExecuting: isExecuting
                });

                if (customRender) {
                    return (
                        <Box key={index} flexDirection="column" marginTop={extraSpacing ? 2 : 1} marginBottom={1} flexShrink={0}>
                            <Box>
                                <Text color="magenta">⏺</Text>
                                <Text> </Text>
                                {formatToolExecution(execution.toolName, execution.arguments)}
                            </Box>
                            <Box flexDirection="column">
                                {customRender}
                            </Box>
                        </Box>
                    );
                }
            }

            // Default rendering for tools without custom renderer
            return (
                <Box key={index} flexDirection="column" marginTop={extraSpacing ? 2 : 1} marginBottom={1} flexShrink={0}>
                    <Box>
                        <Text color="magenta">⏺</Text>
                        <Text> </Text>
                        {formatToolExecution(execution.toolName, execution.arguments)}
                    </Box>
                    <Box marginLeft={2} flexDirection="column">
                        {isExecuting ? (
                            <Text color="cyan">⎿ Executing...</Text>
                        ) : result ? (
                            result.success ? (
                                result.output ? (
                                    <Text color="gray">⎿ {result.output}</Text>
                                ) : (
                                    <Text color="green">⎿ Completed</Text>
                                )
                            ) : (
                                <Text color="red">⎿ Error: {result.error}</Text>
                            )
                        ) : null}
                    </Box>
                </Box>
            );

        default:
            return null;
    }
};

export function ChatHistory({
                                messageRegistry,
                                executionRegistry,
                                toolRegistry,
                                isConfirmationActive = false,
                            }: ChatHistoryProps) {
    // Don't memoize ChatHistory - let Valtio handle reactivity
    const snap = useSnapshot(store);
    // Cast to correct type - Valtio's snapshot makes arrays readonly
    const messages = snap.messages as MessageRegistryMessage[];
    
    // Get terminal dimensions
    const {stdout} = useStdout();
    const terminalHeight = stdout?.rows || 30;
    // Account for: input (4) + status bar (2) + loading (2) + margins (4) = 12
    // No header now since logo is part of scrollable content
    const maxHeight = Math.max(5, terminalHeight - 12);

    // Filter out executing tool messages when in confirmation mode
    const filteredMessages = isConfirmationActive
        ? messages.filter(msg => {
            if (msg.role !== "tool" || !msg.toolCallId) return true;
            const execution = executionRegistry.get(msg.toolCallId);
            return execution?.status !== "executing";
        })
        : messages;
    
    // Map messages to chat entries
    const chatEntries = filteredMessages.map((entry, index) => {
        // Use executionRegistry.get to properly map tool call ID to execution
        const execution = entry.toolCallId
            ? executionRegistry.get(entry.toolCallId)
            : undefined;
        
        const previousEntry = index > 0 ? filteredMessages[index - 1] : undefined;

        return (
            <ChatEntry
                key={`${entry.id}-${execution?.status || 'pending'}-${execution?.result ? 'done' : 'running'}`}
                entry={entry}
                index={index}
                execution={execution}
                toolRegistry={toolRegistry}
                previousEntry={previousEntry}
            />
        );
    });

    // Create a height estimation function based on message content
    const getItemHeight = useCallback((index: number): number => {
        const entry = filteredMessages[index];
        if (!entry) return 4;
        
        let baseHeight = 3; // Base height with margins
        
        switch (entry.role) {
            case 'user':
                // User messages are typically single line
                baseHeight = 3;
                break;
                
            case 'assistant':
                // Assistant messages can be much longer
                if (entry.content) {
                    const lines = entry.content.split('\n').length;
                    baseHeight = Math.min(lines + 4, 25); // Cap at 25 lines
                } else {
                    baseHeight = 3;
                }
                break;
                
            case 'tool':
                // Tool messages vary based on execution
                const execution = entry.toolCallId ? executionRegistry.get(entry.toolCallId) : undefined;
                if (execution?.result?.output) {
                    // Tool with output - estimate based on output length
                    const outputLines = String(execution.result.output).split('\n').length;
                    baseHeight = Math.min(outputLines + 5, 20); // Header + output + margins
                } else {
                    baseHeight = 4; // Just header and status
                }
                break;
        }
        
        return baseHeight;
    }, [filteredMessages, executionRegistry]);

    // Show logo only when there are no messages
    if (messages.length === 0) {
        return (
            <Box flexDirection="column" height={maxHeight} paddingX={2}>
                <Box paddingX={2} flexShrink={0} height={8}>
                    <Box justifyContent="center" marginBottom={1}>
                        <Gradient name="passion">
                            <BigText text="CLANK" font="3d" />
                        </Gradient>
                    </Box>
                    <Box flexDirection="column" marginBottom={0}>
                        <Text dimColor>
                            Type your request in natural language. Type '/exit' or press Ctrl+C to quit.
                        </Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <VirtualScroll 
            maxHeight={maxHeight}
            estimatedItemHeight={4}
            getItemHeight={getItemHeight}
        >
            {chatEntries}
        </VirtualScroll>
    );
}