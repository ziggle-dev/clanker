import { GrokAgent } from "../clanker/agent";
import { GrokMessage } from "../clanker/client";

export interface HeadlessEntry {
  type: "user" | "assistant" | "tool_result" | "tool_call";
  content: string;
  timestamp: Date;
  toolCall?: any;
  toolResult?: { success: boolean; output?: string; error?: string };
}

export async function processUserMessageHeadless(
  agent: GrokAgent,
  message: string
): Promise<HeadlessEntry[]> {
  const entries: HeadlessEntry[] = [];
  
  // Add user message
  const userEntry: HeadlessEntry = {
    type: "user",
    content: message,
    timestamp: new Date(),
  };
  entries.push(userEntry);

  // Create messages array
  const messages: GrokMessage[] = [
    { role: "user", content: message }
  ];

  // Process with agent
  const response = await agent.chat(messages, undefined, true);
  
  if (typeof response === 'string') {
    // Non-streaming response
    entries.push({
      type: "assistant",
      content: response,
      timestamp: new Date(),
    });
  } else {
    // Streaming response
    let currentAssistantContent = "";
    
    for await (const chunk of response) {
      switch (chunk.type) {
        case 'content':
          if (chunk.content) {
            currentAssistantContent += chunk.content;
          }
          break;
          
        case 'tool_calls':
          // Add assistant message if we have content
          if (currentAssistantContent) {
            entries.push({
              type: "assistant",
              content: currentAssistantContent,
              timestamp: new Date(),
            });
            currentAssistantContent = "";
          }
          
          if (chunk.toolCalls) {
            for (const toolCall of chunk.toolCalls) {
              entries.push({
                type: "tool_call",
                content: `Executing ${toolCall.function.name}...`,
                timestamp: new Date(),
                toolCall,
              });
            }
          }
          break;
          
        case 'tool_result':
          if (chunk.toolCall && chunk.toolResult) {
            // Find and update the tool call entry
            const toolIndex = entries.findIndex(
              e => e.type === 'tool_call' && e.toolCall?.id === chunk.toolCall?.id
            );
            
            if (toolIndex !== -1) {
              const toolResult = chunk.toolResult;
              let content = "";
              
              if (toolResult.success && toolResult.output) {
                content = toolResult.output;
              } else if (toolResult.error) {
                content = `Error: ${toolResult.error}`;
              } else if (toolResult.data) {
                content = JSON.stringify(toolResult.data);
              } else {
                content = "Tool executed";
              }
              
              entries[toolIndex] = {
                type: "tool_result",
                content,
                timestamp: new Date(),
                toolCall: chunk.toolCall,
                toolResult: chunk.toolResult,
              };
            }
          }
          break;
          
        case 'done':
          // Add any remaining assistant content
          if (currentAssistantContent) {
            entries.push({
              type: "assistant",
              content: currentAssistantContent,
              timestamp: new Date(),
            });
          }
          break;
      }
    }
  }
  
  return entries;
}