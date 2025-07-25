/**
 * Core types for the dynamic tool registry system
 */

import {ToolResult} from '../types';
import React from 'react';

// ============================================================================
// Core Tool Types
// ============================================================================

/**
 * Tool metadata for registration and discovery
 */
export interface ToolMetadata {
    id: string;
    name: string;
    description: string;
    version?: string;
    author?: string;
    tags?: string[];
    category?: ToolCategory;
    capabilities?: ToolCapability[];
}

/**
 * Tool categories for organization
 */
export enum ToolCategory {
    FileSystem = 'filesystem',
    System = 'system',
    Search = 'search',
    Development = 'development',
    Task = 'task',
    Utility = 'utility',
    Composition = 'composition'
}

/**
 * Tool capabilities for permission checking
 */
export enum ToolCapability {
    FileRead = 'file:read',
    FileWrite = 'file:write',
    SystemExecute = 'system:execute',
    NetworkAccess = 'network:access',
    UserConfirmation = 'user:confirmation'
}

// ============================================================================
// Argument Specification
// ============================================================================

/**
 * Argument type definitions
 */
export type ArgumentType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';

/**
 * Argument specification for tools
 */
export interface ArgumentSpec {
    name: string;
    type: ArgumentType;
    description: string;
    required?: boolean;
    default?: string | number | boolean | unknown[] | Record<string, unknown>;
    enum?: Array<string | number | boolean>;
    validate?: (value: unknown) => boolean | string;
}

/**
 * Tool arguments definition
 */
export type ToolArguments = Record<string, unknown>;

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * Tool execution context
 */
export interface ToolContext {
    registry: ToolRegistry;
    workingDirectory: string;
    confirmationService?: unknown;
    logger?: ToolLogger;
    state?: Map<string, unknown>;
}

/**
 * Tool execution function
 */
export type ToolExecutor = (
    args: ToolArguments,
    context: ToolContext
) => Promise<ToolResult>;

/**
 * Tool result render function for custom UI display
 */
export type ToolResultRenderer = (args: {
    toolName: string;
    arguments: ToolArguments;
    result?: ToolResult;
    isExecuting: boolean;
}) => React.ReactElement | null;

/**
 * Complete tool definition
 */
export interface ToolDefinition extends ToolMetadata {
    arguments?: ArgumentSpec[];
    execute: ToolExecutor;

    // Optional lifecycle hooks
    initialize?: (context: ToolContext) => Promise<void>;
    cleanup?: (context: ToolContext) => Promise<void>;

    // Composition support
    inputSchema?: Schema;
    outputSchema?: Schema;
    composable?: boolean;

    // Optional custom renderer for chat history
    renderResult?: ToolResultRenderer;

    // Optional examples for better AI understanding
    examples?: {
        description: string;
        arguments: ToolArguments;
        result?: string;
    }[];
}

/**
 * Registered tool instance
 */
export interface RegisteredTool {
    definition: ToolDefinition;
    initialized: boolean;
    lastExecuted?: Date;
    executionCount: number;
    totalDuration: number; // Total execution time in milliseconds
    hash?: string; // Hash of the tool file for version tracking
    filePath?: string; // Path to the tool file
}

// ============================================================================
// Composition Types
// ============================================================================

/**
 * Schema for type validation in compositions
 */
export interface Schema {
    type: ArgumentType;
    properties?: Record<string, Schema>;
    items?: Schema;
    required?: string[];
}

/**
 * Composition patterns
 */
export type CompositionPattern =
    | 'pipeline'    // Sequential execution
    | 'parallel'    // Concurrent execution
    | 'conditional' // Branching based on conditions
    | 'map'        // Apply to collection
    | 'reduce';    // Aggregate results

/**
 * Composed tool that can be registered
 */
export interface ComposedTool extends ToolDefinition {
    pattern: CompositionPattern;
    tools: string[]; // Tool IDs
    config?: Record<string, unknown>;    // Pattern-specific configuration
}

// ============================================================================
// Registry Interface
// ============================================================================

/**
 * Tool registry for managing tools
 */
export interface ToolRegistry {
    // Registration
    register(tool: ToolDefinition): void;

    unregister(toolId: string): void;

    // Discovery
    get(toolId: string): RegisteredTool | undefined;

    list(filter?: ToolFilter): ToolDefinition[];

    search(query: string): ToolDefinition[];

    // Execution
    execute(toolId: string, args: ToolArguments): Promise<ToolResult>;

    // Composition
    compose(pattern: CompositionPattern, tools: string[], config?: Record<string, unknown>): ComposedTool;

    // Validation
    validateArguments(toolId: string, args: ToolArguments): ValidationResult;
}

/**
 * Tool filter options
 */
export interface ToolFilter {
    category?: ToolCategory;
    capabilities?: ToolCapability[];
    tags?: string[];
    composable?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    expected?: unknown;
    received?: unknown;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Tool logger interface
 */
export interface ToolLogger {
    debug(message: string, ...args: unknown[]): void;

    info(message: string, ...args: unknown[]): void;

    warn(message: string, ...args: unknown[]): void;

    error(message: string, ...args: unknown[]): void;
}

/**
 * Extract argument types from tool definition
 */
export type ExtractToolArgs<T extends ToolDefinition> = T extends {
        arguments: infer Args;
    }
    ? Args extends readonly ArgumentSpec[]
        ? { [K in Args[number] as K['name']]: unknown }
        : Record<string, unknown>
    : Record<string, unknown>;

