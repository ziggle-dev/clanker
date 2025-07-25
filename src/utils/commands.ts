import { GrokAgent } from "../clanker/agent";
import { MessageRegistryMessage } from "../registry/messages";
import { ConfirmationService } from "./confirmation-service";
import React from "react";

// Type alias for backward compatibility
type ChatEntry = MessageRegistryMessage;

export interface Command {
  name: string;
  description: string;
  usage?: string;
  execute?: (options: CommandExecuteOptions) => Promise<void> | void;
}

export interface CommandExecuteOptions {
  args: string;
  agent: GrokAgent;
  chatHistory: ChatEntry[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setShowModelSelection?: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoEditEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  confirmationService: ConfirmationService;
}

export function getDefaultCommands(): Command[] {
  return [
    {
      name: "help",
      description: "Show available commands",
      execute: ({ setChatHistory }) => {
        const helpMessage = `Available commands:
/help - Show this help message
/clear - Clear chat history
/model - Change AI model
/save - Save chat history to file
/load - Load chat history from file
/auto - Toggle auto-edit mode
/exit - Exit the application
/tools - List available tools
/stats - Show tool usage statistics`;

        setChatHistory((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: helpMessage,
            timestamp: new Date(),
          } as MessageRegistryMessage,
        ]);
      },
    },
    {
      name: "clear",
      description: "Clear chat history",
      execute: ({ setChatHistory }) => {
        setChatHistory([]);
      },
    },
    {
      name: "model",
      description: "Change AI model",
      execute: ({ setShowModelSelection }) => {
        if (setShowModelSelection) {
          setShowModelSelection(true);
        }
      },
    },
    {
      name: "save",
      description: "Save chat history to file",
      usage: "/save [filename]",
      execute: async ({ args, chatHistory, setChatHistory }) => {
        const filename = args || `chat-${Date.now()}.json`;
        try {
          const fs = await import("fs/promises");
          await fs.writeFile(
            filename,
            JSON.stringify(chatHistory, null, 2),
            "utf-8"
          );
          setChatHistory((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              role: "system",
              content: `Chat history saved to ${filename}`,
              timestamp: new Date(),
            } as MessageRegistryMessage,
          ]);
        } catch (error) {
          setChatHistory((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              role: "system",
              content: `Error saving chat: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date(),
            } as MessageRegistryMessage,
          ]);
        }
      },
    },
    {
      name: "load",
      description: "Load chat history from file",
      usage: "/load <filename>",
      execute: async ({ args, setChatHistory }) => {
        if (!args) {
          setChatHistory((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              role: "system",
              content: "Please provide a filename: /load <filename>",
              timestamp: new Date(),
            } as MessageRegistryMessage,
          ]);
          return;
        }
        
        try {
          const fs = await import("fs/promises");
          const data = await fs.readFile(args, "utf-8");
          const loadedHistory = JSON.parse(data) as ChatEntry[];
          setChatHistory(loadedHistory);
        } catch (error) {
          setChatHistory((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              role: "system",
              content: `Error loading chat: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date(),
            } as MessageRegistryMessage,
          ]);
        }
      },
    },
    {
      name: "auto",
      description: "Toggle auto-edit mode",
      execute: ({ setAutoEditEnabled, setChatHistory }) => {
        if (setAutoEditEnabled) {
          setAutoEditEnabled((prev) => {
            const newValue = !prev;
            setChatHistory((history) => [
              ...history,
              {
                id: `system-${Date.now()}`,
                role: "system",
                content: `Auto-edit mode ${newValue ? "enabled" : "disabled"}`,
                timestamp: new Date(),
              } as MessageRegistryMessage,
            ]);
            return newValue;
          });
        }
      },
    },
    {
      name: "exit",
      description: "Exit the application",
      execute: () => {
        process.exit(0);
      },
    },
    {
      name: "tools",
      description: "List available tools",
      execute: ({ agent, setChatHistory }) => {
        const registry = agent.getRegistry();
        const tools = registry.list();
        const toolsList = tools
          .map((tool) => `• ${tool.name} (${tool.id}) - ${tool.description}`)
          .join("\n");
        
        setChatHistory((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: `Available tools (${tools.length}):\n${toolsList}`,
            timestamp: new Date(),
          } as MessageRegistryMessage,
        ]);
      },
    },
    {
      name: "stats",
      description: "Show tool usage statistics",
      execute: ({ agent, setChatHistory }) => {
        const stats = agent.getToolStats();
        let statsMessage = "Tool usage statistics:\n";
        
        const entries = Object.entries(stats);
        if (entries.length === 0) {
          statsMessage += "No tools have been used yet.";
        } else {
          entries.forEach(([toolId, toolStats]) => {
            if (toolStats.executionCount > 0) {
              statsMessage += `• ${toolId}: ${toolStats.executionCount} calls\n`;
            }
          });
        }
        
        setChatHistory((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: statsMessage,
            timestamp: new Date(),
          } as MessageRegistryMessage,
        ]);
      },
    },
  ];
}