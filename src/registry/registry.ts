/**
 * Core tool registry implementation
 */

import {
  ToolDefinition,
  RegisteredTool,
  ToolRegistry,
  ToolArguments,
  ToolFilter,
  ValidationResult,
  ToolContext,
  CompositionPattern,
  ComposedTool
} from './types';
import { ToolResult } from '../types';
import { validateArguments } from './validation';
import { createComposedTool } from './composition';
import { ConfirmationService } from '../utils/confirmation-service';
import { createToolLogger } from './logger';

/**
 * Main tool registry implementation
 */
export class ToolRegistryImpl implements ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private context: ToolContext;
  
  constructor(workingDirectory: string = process.cwd()) {
    this.context = {
      registry: this,
      workingDirectory,
      confirmationService: ConfirmationService.getInstance(),
      state: new Map()
    };
  }
  
  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id '${tool.id}' already registered`);
    }
    
    this.tools.set(tool.id, {
      definition: tool,
      initialized: false,
      executionCount: 0,
      totalDuration: 0
    });
  }
  
  /**
   * Unregister a tool
   */
  async unregister(toolId: string): Promise<void> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool '${toolId}' not found`);
    }
    
    // Cleanup if needed
    if (tool.definition.cleanup && tool.initialized) {
      await tool.definition.cleanup(this.context);
    }
    
    this.tools.delete(toolId);
  }
  
  /**
   * Get a registered tool
   */
  get(toolId: string): RegisteredTool | undefined {
    return this.tools.get(toolId);
  }
  
  /**
   * List tools with optional filter
   */
  list(filter?: ToolFilter): ToolDefinition[] {
    let tools = Array.from(this.tools.values()).map(t => t.definition);
    
    if (filter) {
      if (filter.category) {
        tools = tools.filter(t => t.category === filter.category);
      }
      
      if (filter.capabilities && filter.capabilities.length > 0) {
        tools = tools.filter(t => 
          t.capabilities && 
          filter.capabilities!.every(cap => t.capabilities!.includes(cap))
        );
      }
      
      if (filter.tags && filter.tags.length > 0) {
        tools = tools.filter(t =>
          t.tags &&
          filter.tags!.some(tag => t.tags!.includes(tag))
        );
      }
      
      if (filter.composable !== undefined) {
        tools = tools.filter(t => t.composable === filter.composable);
      }
    }
    
    return tools;
  }
  
  /**
   * Search tools by query
   */
  search(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values())
      .map(t => t.definition)
      .filter(tool => {
        const searchText = [
          tool.id,
          tool.name,
          tool.description,
          ...(tool.tags || [])
        ].join(' ').toLowerCase();
        
        return searchText.includes(lowerQuery);
      });
  }
  
  /**
   * Execute a tool
   */
  async execute(toolId: string, args: ToolArguments): Promise<ToolResult> {
    const registeredTool = this.tools.get(toolId);
    if (!registeredTool) {
      return {
        success: false,
        error: `Tool '${toolId}' not found`
      };
    }
    
    const tool = registeredTool.definition;
    
    // Validate arguments
    const validation = this.validateArguments(toolId, args);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors!.map(e => e.message).join(', ')}`
      };
    }
    
    // Initialize tool if needed
    if (!registeredTool.initialized && tool.initialize) {
      try {
        const initContext: ToolContext = {
          ...this.context,
          logger: createToolLogger(toolId)
        };
        await tool.initialize(initContext);
        registeredTool.initialized = true;
      } catch (error) {
        return {
          success: false,
          error: `Failed to initialize tool: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // Execute tool
    const startTime = Date.now();
    
    try {
      // Create a context with logger for this specific execution
      const executionContext: ToolContext = {
        ...this.context,
        logger: createToolLogger(toolId)
      };
      
      const result = await tool.execute(args, executionContext);
      
      // Update metrics
      const duration = Date.now() - startTime;
      registeredTool.executionCount++;
      registeredTool.lastExecuted = new Date();
      registeredTool.totalDuration += duration;
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Create a composed tool
   */
  compose(pattern: CompositionPattern, toolIds: string[], config?: Record<string, unknown>): ComposedTool {
    // Verify all tools exist
    const tools = toolIds.map(id => {
      const tool = this.get(id);
      if (!tool) {
        throw new Error(`Tool '${id}' not found for composition`);
      }
      return tool.definition;
    });
    
    return createComposedTool(pattern, tools, config || {});
  }
  
  /**
   * Validate tool arguments
   */
  validateArguments(toolId: string, args: ToolArguments): ValidationResult {
    const tool = this.get(toolId);
    if (!tool) {
      return {
        valid: false,
        errors: [{ field: 'toolId', message: `Tool '${toolId}' not found` }]
      };
    }
    
    return validateArguments(tool.definition.arguments || [], args);
  }
  
  /**
   * Get the registry context
   */
  getContext(): ToolContext {
    return this.context;
  }
  
  /**
   * Update working directory
   */
  setWorkingDirectory(dir: string): void {
    this.context.workingDirectory = dir;
  }
  
  /**
   * Get tool statistics
   */
  getStats(): {
    totalTools: number;
    byCategory: Record<string, number>;
    byCapability: Record<string, number>;
    mostUsed: Array<{ toolId: string; count: number }>;
  } {
    const tools = Array.from(this.tools.entries());
    
    const byCategory: Record<string, number> = {};
    const byCapability: Record<string, number> = {};
    
    tools.forEach(([_, tool]) => {
      const def = tool.definition;
      
      // Count by category
      if (def.category) {
        byCategory[def.category] = (byCategory[def.category] || 0) + 1;
      }
      
      // Count by capability
      if (def.capabilities) {
        def.capabilities.forEach(cap => {
          byCapability[cap] = (byCapability[cap] || 0) + 1;
        });
      }
    });
    
    // Get most used tools
    const mostUsed = tools
      .map(([id, tool]) => ({ toolId: id, count: tool.executionCount }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalTools: tools.length,
      byCategory,
      byCapability,
      mostUsed
    };
  }

  /**
   * Get execution stats in the format expected by tests
   */
  getExecutionStats(): Record<string, { executionCount: number; totalDuration: number }> {
    const stats: Record<string, { executionCount: number; totalDuration: number }> = {};
    
    this.tools.forEach((tool, id) => {
      stats[id] = {
        executionCount: tool.executionCount,
        totalDuration: tool.totalDuration
      };
    });
    
    return stats;
  }
}

/**
 * Create a new tool registry instance
 */
export function createToolRegistry(workingDirectory?: string): ToolRegistry {
  return new ToolRegistryImpl(workingDirectory);
}