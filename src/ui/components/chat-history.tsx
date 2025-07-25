import React from "react";
import { Box, Text, useStdout } from "ink";
import { messageRegistry as MessageRegistryType, MessageRegistryMessage } from "../../registry/messages";
import { executionRegistry as ExecutionRegistryType, ToolExecution } from "../../registry/execution";
import { ToolRegistry } from "../../registry/types";
import { MarkdownRenderer } from "../utils/markdown-renderer";

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

const ChatEntry = ({ 
    entry, 
    index,
    execution,
    toolRegistry
  }: { 
    entry: MessageRegistryMessage; 
    index: number;
    execution?: ToolExecution;
    toolRegistry: ToolRegistry;
  }) => {

    switch (entry.role) {
      case "user":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              <Text color="gray">
                {">"} {entry.content}
              </Text>
            </Box>
          </Box>
        );

      case "assistant":
        if (entry.toolCalls && (!entry.content || entry.content.trim() === "")) {
          return null;
        }
        
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box flexDirection="row" alignItems="flex-start">
              <Text color="white">⏺ </Text>
              <Box flexDirection="column" flexGrow={1}>
                {entry.content && entry.content.trim() ? (
                  <MarkdownRenderer 
                    content={entry.content.trim()} 
                    streamingCursor={entry.metadata?.isStreaming ? true : false}
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
          // If no execution found, show nothing (it's likely still being set up)
          return null;
        }

        const isExecuting = execution.status === "executing";
        const result = execution.result;
        
        // Try to get the tool definition and its custom renderer
        const tool = toolRegistry.get(execution.toolName);
        
        if (tool?.definition.renderResult) {
          // Use the custom renderer
          const customRender = tool.definition.renderResult({
            toolName: execution.toolName,
            arguments: execution.arguments,
            result: result,
            isExecuting: isExecuting
          });
          
          if (customRender) {
            return (
              <Box key={index} flexDirection="column" marginTop={1}>
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
          <Box key={index} flexDirection="column" marginTop={1}>
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
  const messages = messageRegistry.getMessages();
  
  // Dynamic message limit based on terminal height
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows || 30;
  // Reserve space for input, loading spinner, etc (approximately 10 lines)
  const maxMessages = Math.max(5, Math.floor((terminalHeight - 10) / 3));
  
  // Filter out executing tool messages when in confirmation mode
  const filteredMessages = isConfirmationActive
    ? messages.filter(msg => {
        if (msg.role !== "tool" || !msg.toolCallId) return true;
        const execution = executionRegistry.get(msg.toolCallId);
        return execution?.status !== "executing";
      })
    : messages;

  // Apply dynamic message limit
  const displayMessages = filteredMessages.slice(-maxMessages);
  
  return (
    <Box flexDirection="column" marginTop={0}>
      {displayMessages.map((entry, index) => {
          const execution = entry.toolCallId 
            ? executionRegistry.get(entry.toolCallId)
            : undefined;
            
          return (
            <ChatEntry
              key={`${entry.id}-${index}`}
              entry={entry}
              index={index}
              execution={execution}
              toolRegistry={toolRegistry}
            />
          );
        })}
    </Box>
  );
}