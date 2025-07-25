/**
 * Adapters for converting between tool formats
 */

import { GrokTool } from '../clanker/client';
import {
  ToolDefinition,
  ArgumentSpec,
  ToolCapability,
  ToolRegistry,
  ToolArguments,
  ToolContext
} from './types';
import { ToolResult } from '../types';
import { applyDefaults, coerceArguments } from './validation';

/**
 * Convert a ToolDefinition to GrokTool format
 */
export function toolDefinitionToGrokTool(tool: ToolDefinition): GrokTool {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  
  // Convert arguments to OpenAI function parameter format
  if (tool.arguments) {
    for (const arg of tool.arguments) {
      properties[arg.name] = argumentSpecToProperty(arg);
      
      if (arg.required) {
        required.push(arg.name);
      }
    }
  }
  
  return {
    type: "function",
    function: {
      name: tool.id,
      description: generateToolDescription(tool),
      parameters: {
        type: "object",
        properties,
        required
      }
    }
  };
}

/**
 * Convert ArgumentSpec to OpenAI property format
 */
function argumentSpecToProperty(arg: ArgumentSpec): Record<string, unknown> {
  const property: Record<string, unknown> = {
    type: mapArgumentType(arg.type),
    description: arg.description
  };
  
  // Add enum values
  if (arg.enum) {
    property.enum = arg.enum;
  }
  
  // Add default value
  if (arg.default !== undefined) {
    property.default = arg.default;
  }
  
  return property;
}

/**
 * Map argument types to OpenAI types
 */
function mapArgumentType(type: string): string {
  switch (type) {
    case 'any':
      return 'string'; // OpenAI doesn't have 'any', use string as fallback
    default:
      return type;
  }
}

/**
 * Generate a comprehensive description from ToolDefinition
 */
function generateToolDescription(tool: ToolDefinition): string {
  const parts: string[] = [tool.description];
  
  // Add capability information
  if (tool.capabilities && tool.capabilities.length > 0) {
    const capabilities = tool.capabilities
      .map(cap => describeCapability(cap))
      .filter(desc => desc)
      .join(', ');
    
    if (capabilities) {
      parts.push(`Capabilities: ${capabilities}`);
    }
  }
  
  // Add tags
  if (tool.tags && tool.tags.length > 0) {
    parts.push(`Tags: ${tool.tags.join(', ')}`);
  }
  
  // Add examples
  if (tool.examples && tool.examples.length > 0) {
    parts.push('\n\nExamples:');
    tool.examples.forEach((example, index) => {
      parts.push(`\nExample ${index + 1}: ${example.description}`);
      parts.push(`Arguments: ${JSON.stringify(example.arguments, null, 2)}`);
      if (example.result) {
        parts.push(`Expected result: ${example.result}`);
      }
    });
  }
  
  return parts.join('. ');
}

/**
 * Describe a capability in natural language
 */
function describeCapability(capability: ToolCapability): string {
  const descriptions: Record<ToolCapability, string> = {
    [ToolCapability.FileRead]: 'read files',
    [ToolCapability.FileWrite]: 'write files',
    [ToolCapability.SystemExecute]: 'execute system commands',
    [ToolCapability.NetworkAccess]: 'access network resources',
    [ToolCapability.UserConfirmation]: 'request user confirmation'
  };
  
  return descriptions[capability] || '';
}

/**
 * Generate all Grok tools from registry
 */
export function generateGrokTools(registry: ToolRegistry): GrokTool[] {
  const tools = registry.list();
  return tools.map(tool => toolDefinitionToGrokTool(tool));
}

/**
 * Create a legacy tool wrapper for backward compatibility
 */
export function createLegacyToolWrapper(
  tool: ToolDefinition,
  context: ToolContext
): { name: string; description: string; execute: (...args: unknown[]) => Promise<ToolResult> } {
  return {
    name: tool.name,
    description: tool.description,
    
    execute: async (...args: unknown[]): Promise<ToolResult> => {
      // Convert positional arguments to named arguments
      let namedArgs: ToolArguments = {};
      
      if (tool.arguments && args.length > 0) {
        // If first arg is an object and we have multiple args defined,
        // assume it contains all named arguments
        if (typeof args[0] === 'object' && !Array.isArray(args[0]) && 
            tool.arguments.length > 1) {
          namedArgs = args[0] as ToolArguments;
        } else {
          // Map positional args to named args
          tool.arguments.forEach((spec, index) => {
            if (index < args.length) {
              namedArgs[spec.name] = args[index];
            }
          });
        }
      }
      
      // Apply defaults and coercion
      namedArgs = applyDefaults(tool.arguments || [], namedArgs);
      namedArgs = coerceArguments(tool.arguments || [], namedArgs);
      
      // Execute with context
      return tool.execute(namedArgs, context);
    }
  };
}

/**
 * Create a tool execution wrapper for Grok agent
 */
export function createToolExecutor(registry: ToolRegistry) {
  return async (toolName: string, args: unknown): Promise<ToolResult> => {
    // Parse arguments if they come as a string
    let parsedArgs = args;
    if (typeof args === 'string') {
      try {
        parsedArgs = JSON.parse(args);
      } catch {
        parsedArgs = { input: args };
      }
    }
    
    return registry.execute(toolName, parsedArgs as ToolArguments);
  };
}

/**
 * Create dynamic tool descriptions for prompts
 */
export function generateToolPromptSection(tools: ToolDefinition[]): string {
  const sections: string[] = [
    `You have access to ${tools.length} tools:`
  ];
  
  // Group tools by category
  const byCategory = new Map<string, ToolDefinition[]>();
  const uncategorized: ToolDefinition[] = [];
  
  for (const tool of tools) {
    if (tool.category) {
      const existing = byCategory.get(tool.category) || [];
      existing.push(tool);
      byCategory.set(tool.category, existing);
    } else {
      uncategorized.push(tool);
    }
  }
  
  // Add categorized tools
  for (const [category, categoryTools] of byCategory) {
    sections.push(`\n## ${category.charAt(0).toUpperCase() + category.slice(1)} Tools\n`);
    
    for (const tool of categoryTools) {
      sections.push(formatToolForPrompt(tool));
    }
  }
  
  // Add uncategorized tools
  if (uncategorized.length > 0) {
    sections.push('\n## Other Tools\n');
    
    for (const tool of uncategorized) {
      sections.push(formatToolForPrompt(tool));
    }
  }
  
  // Add usage instructions
  sections.push('\n## Tool Usage\n');
  sections.push('- Always check tool arguments before calling');
  sections.push('- Handle tool errors gracefully');
  sections.push('- Use appropriate tools for the task');
  sections.push('- Combine tools when needed for complex tasks');
  
  return sections.join('\n');
}

/**
 * Format a single tool for prompt
 */
function formatToolForPrompt(tool: ToolDefinition): string {
  const lines: string[] = [
    `### ${tool.name}`,
    tool.description
  ];
  
  if (tool.arguments && tool.arguments.length > 0) {
    lines.push('\nArguments:');
    
    for (const arg of tool.arguments) {
      const required = arg.required ? ' (required)' : ' (optional)';
      const defaultStr = arg.default !== undefined ? `, default: ${JSON.stringify(arg.default)}` : '';
      
      lines.push(`- ${arg.name}: ${arg.type}${required} - ${arg.description}${defaultStr}`);
      
      if (arg.enum) {
        lines.push(`  Allowed values: ${arg.enum.join(', ')}`);
      }
    }
  }
  
  if (tool.capabilities && tool.capabilities.length > 0) {
    lines.push(`\nRequires: ${tool.capabilities.map(c => describeCapability(c)).join(', ')}`);
  }
  
  return lines.join('\n');
}
