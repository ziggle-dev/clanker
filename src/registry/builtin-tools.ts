/**
 * Built-in tools registry
 * 
 * As of v1.1.31, all core tools are now installed via the package manager
 * rather than being built into the CLI. This provides better modularity
 * and allows tools to be updated independently.
 * 
 * This file remains for backward compatibility but exports empty arrays.
 */

import { ToolDefinition } from './types';

// Array of all built-in tools - now empty as tools are loaded dynamically
export const builtInTools: ToolDefinition[] = [];

// Map for quick lookup - now empty
export const builtInToolsMap = new Map<string, ToolDefinition>();