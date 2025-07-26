/**
 * Dynamic tool loader with clean, reusable directory scanning
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {pathToFileURL} from 'url';
import {ToolDefinition, ToolRegistry} from './types';
import {debug} from '../utils/debug-logger';
import {loadBuiltInToolsFromManifest} from './manifest-loader';

/**
 * Check if a module should be shared from the main clanker package
 */
function shouldShareDependency(request: string): boolean {
    // Share React and Ink
    if (request === 'react' || request === 'ink' || request.startsWith('ink/')) {
        return true;
    }

    // Share @ziggler/clanker and its exports
    if (request === '@ziggler/clanker' || request.startsWith('@ziggler/clanker/')) {
        return true;
    }

    // Share relative imports that are part of clanker's internal structure
    if (request.startsWith('../../registry') || request.startsWith('../../utils/') ||
        request.startsWith('../../ui/') || request.startsWith('../../store/')) {
        return true;
    }

    // Share other common dependencies that tools might need
    const sharedDeps = [
        'chalk', 'fs-extra', 'zod', 'commander', 'dotenv',
        'openai', 'axios', 'uuid', 'prismjs', 'immer'
    ];

    return sharedDeps.includes(request);
}

/**
 * Options for loading tools
 */
export interface LoaderOptions {
    /**
     * Base directories to search for tools
     * Defaults to ['.', '~/.clank']
     */
    directories?: string[];

    /**
     * Whether to search recursively
     * Defaults to true
     */
    recursive?: boolean;

    /**
     * File extensions to load
     * Defaults to ['.ts', '.tsx', '.js', '.jsx']
     */
    extensions?: string[];

    /**
     * Whether to watch for changes
     */
    watch?: boolean;

    /**
     * Whether to load built-in tools
     * Defaults to true
     */
    loadBuiltins?: boolean;
}

/**
 * Tool loader for dynamic tool discovery
 */
export class ToolLoader {
    private options: Required<LoaderOptions>;
    private loadedTools = new Map<string, { path: string; hash: string }>(); // toolId -> {filePath, hash}
    private watcherCleanup: (() => void)[] = [];
    private fileWatchers = new Map<string, fsSync.FSWatcher>(); // filePath -> watcher

    constructor(private registry: ToolRegistry, options: LoaderOptions = {}) {
        // Get user home directory in a cross-platform way
        const homeDir = os.homedir();
        const clankDir = path.join(homeDir, '.clanker');

        this.options = {
            directories: options.directories || [process.cwd(), clankDir],
            recursive: options.recursive ?? true,
            extensions: options.extensions || ['.ts', '.tsx', '.js', '.jsx'],
            watch: options.watch ?? false,
            loadBuiltins: options.loadBuiltins ?? true
        };

        debug.log(`[ToolLoader] Configured directories:`, this.options.directories);
    }

    /**
     * Load all tools from configured directories
     */
    async loadTools(): Promise<void> {
        // Load built-in tools first if enabled
        if (this.options.loadBuiltins) {
            await this.loadBuiltinTools();
        }

        // Load from each configured directory
        for (const dir of this.options.directories) {
            const toolsDir = path.join(dir, dir.endsWith('tools') ? '' : 'tools');
            debug.log(`[ToolLoader] Loading from directory: ${dir} -> ${toolsDir}`);
            await this.loadFromDirectory(toolsDir);
        }

        // Set up watchers if enabled
        if (this.options.watch) {
            await this.setupWatchers();
        }
    }

    /**
     * Load built-in tools from the package
     */
    private async loadBuiltinTools(): Promise<void> {
        try {
            // Try to load from manifest first, fall back to static imports
            const tools = await loadBuiltInToolsFromManifest();

            debug.log(`[ToolLoader] Loading ${tools.length} built-in tools`);

            // Register all built-in tools directly
            for (const tool of tools) {
                if (this.isValidTool(tool)) {
                    this.registry.register(tool);
                    const registeredTool = this.registry.get(tool.id);
                    if (registeredTool) {
                        registeredTool.hash = 'builtin';
                        registeredTool.filePath = `builtin:${tool.id}`;
                    }
                    this.loadedTools.set(tool.id, {path: `builtin:${tool.id}`, hash: 'builtin'});
                    debug.log(`[ToolLoader] Loaded built-in tool: ${tool.id}`);
                } else {
                    debug.warn(`[ToolLoader] Invalid built-in tool`);
                }
            }

            debug.log(`[ToolLoader] Successfully loaded ${tools.length} built-in tools`);
        } catch (error) {
            debug.warn('[ToolLoader] Failed to load built-in tools:', error);
        }
    }

    /**
     * Load tools from a directory
     */
    private async loadFromDirectory(directory: string): Promise<void> {
        // Early return if directory doesn't exist
        if (!await this.exists(directory)) {
            debug.log(`[ToolLoader] Directory does not exist: ${directory}`);
            return;
        }

        debug.log(`[ToolLoader] Scanning directory: ${directory}`);
        try {
            await this.scanDirectory(directory, this.options.recursive);
        } catch (error) {
            debug.error(`[ToolLoader] Error scanning directory ${directory}:`, error);
        }
    }

    /**
     * Recursively scan a directory for tool files
     */
    private async scanDirectory(directory: string, recursive: boolean): Promise<void> {
        let entries: fsSync.Dirent[];

        try {
            entries = await fs.readdir(directory, {withFileTypes: true});
        } catch (error) {
            // Directory not accessible, skip silently
            return;
        }

        // Check if this is a package-managed tool directory with 'current' symlink
        const currentLink = entries.find(entry => entry.name === 'current' && entry.isSymbolicLink());
        if (currentLink) {
            // This is a versioned tool directory, load from current version
            const currentPath = path.join(directory, 'current', 'index.js');
            if (await this.exists(currentPath)) {
                debug.log(`[ToolLoader] Found package-managed tool at ${currentPath}`);
                await this.loadToolFile(currentPath);
                return; // Don't scan subdirectories for versioned tools
            }
        }

        // Process files first
        const files = entries
            .filter(entry => entry.isFile() && this.isToolFile(entry.name))
            .map(entry => path.join(directory, entry.name));

        debug.log(`[ToolLoader] Found ${files.length} tool files in ${directory}`);
        for (const file of files) {
            await this.loadToolFile(file);
        }

        // Process subdirectories if recursive
        if (!recursive) return;

        const subdirs = entries
            .filter(entry => entry.isDirectory())
            .map(entry => path.join(directory, entry.name));

        for (const subdir of subdirs) {
            await this.scanDirectory(subdir, true);
        }
    }

    /**
     * Load a single tool file
     */
    private async loadToolFile(filePath: string): Promise<void> {
        try {
            debug.log(`[ToolLoader] Attempting to load: ${filePath}`);

            // Compute file hash
            const fileHash = await this.computeFileHash(filePath);
            debug.log(`[ToolLoader] File hash for ${filePath}: ${fileHash.substring(0, 8)}...`);

            // Check if tool is already loaded with same hash
            const existingEntry = Array.from(this.loadedTools.entries())
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .find(([_, info]) => info.path === filePath);

            if (existingEntry && existingEntry[1].hash === fileHash) {
                debug.log(`[ToolLoader] Tool already loaded with same version: ${existingEntry[0]}`);
                return;
            }

            // Dynamic import
            const moduleExports = await this.importModule(filePath);
            debug.log(`[ToolLoader] Module exports for ${filePath}:`, Object.keys(moduleExports));

            const tool = await this.extractTool(moduleExports);d

            if (!tool) {
                debug.warn(`[ToolLoader] No valid tool found in ${filePath}`);
                return;
            }

            debug.log(`[ToolLoader] Extracted tool:`, {id: tool.id, name: tool.name});

            // Validate tool
            if (!this.isValidTool(tool)) {
                debug.warn(`[ToolLoader] Invalid tool in ${filePath}`);
                return;
            }

            // Unload old version if exists
            if (this.loadedTools.has(tool.id)) {
                const oldInfo = this.loadedTools.get(tool.id)!;
                if (oldInfo.hash !== fileHash) {
                    debug.log(`[ToolLoader] Tool ${tool.id} has changed, unloading old version`);
                    await this.unloadTool(tool.id);
                } else {
                    debug.log(`[ToolLoader] Tool ${tool.id} unchanged, skipping reload`);
                    return;
                }
            }

            // Register the tool with hash info
            this.registry.register(tool);
            const registeredTool = this.registry.get(tool.id);
            if (registeredTool) {
                registeredTool.hash = fileHash;
                registeredTool.filePath = filePath;
            }

            this.loadedTools.set(tool.id, {path: filePath, hash: fileHash});

            debug.log(`[ToolLoader] Loaded tool: ${tool.id} from ${filePath}`);
        } catch (error) {
            debug.error(`[ToolLoader] Failed to load ${filePath}:`, error);
        }
    }

    /**
     * Import a module handling TypeScript if needed
     */
    private async importModule(filePath: string): Promise<any> {
        try {
            // For .js files in production, try different approaches
            if (filePath.endsWith('.js')) {
                // First try createRequire which works in ESM context
                try {
                    const {createRequire} = await import('module');
                    // Use process.cwd() as fallback if import.meta.url is not available
                    const baseUrl = typeof import.meta !== 'undefined' && import.meta.url
                        ? import.meta.url
                        : pathToFileURL(process.cwd() + '/').href;
                    const require = createRequire(baseUrl);

                    // Set up custom module resolution for shared dependencies
                    const loadedModule = this.loadWithSharedDependencies(require, filePath);

                    debug.log(`[ToolLoader] Loaded ${filePath} using createRequire with shared deps`);
                    return loadedModule;
                } catch (error) {
                    debug.log(`[ToolLoader] createRequire failed for ${filePath}:`, error);
                }

                // Try Node.js require directly (for CommonJS modules)
                try {
                    // Use eval to avoid bundler trying to resolve require
                    const requireFunc = eval('require');
                    const loadedModule = this.loadWithSharedDependencies(requireFunc, filePath);
                    debug.log(`[ToolLoader] Loaded ${filePath} using direct require with shared deps`);
                    return loadedModule;
                } catch (error) {
                    debug.log(`[ToolLoader] Direct require failed for ${filePath}:`, error);
                }

                // Try dynamic import with file URL
                try {
                    const fileUrl = pathToFileURL(filePath).href;
                    const module = await import(fileUrl);
                    debug.log(`[ToolLoader] Loaded ${filePath} using dynamic import`);
                    return module;
                } catch (error) {
                    debug.log(`[ToolLoader] Dynamic import failed for ${filePath}:`, error);
                }
            }

            // For TypeScript files (.ts, .tsx), use dynamic import
            const fileUrl = pathToFileURL(filePath).href;
            const module = await import(fileUrl);
            return module;
        } catch (error) {
            debug.error(`[ToolLoader] Import error for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Extract tool from module exports
     */
    private async extractTool(moduleExports: any): Promise<ToolDefinition | null> {
        // Handle default export
        if (moduleExports.default) {
            const defaultExport = moduleExports.default;

            // If it's a function, call it
            if (typeof defaultExport === 'function') {
                try {
                    const result = await defaultExport();
                    if (this.isValidTool(result)) return result;
                } catch {
                    // Function might not be callable, try as tool
                    if (this.isValidTool(defaultExport)) {
                        return defaultExport;
                    }
                }
            }

            // If it's already a tool
            if (this.isValidTool(defaultExport)) {
                return defaultExport;
            }

            // If it's an array of tools, take the first one
            if (Array.isArray(defaultExport) && defaultExport.length > 0) {
                const firstTool = defaultExport[0];
                if (this.isValidTool(firstTool)) return firstTool;
            }
        }

        // Handle named exports
        const namedExports = ['tool', 'createTool'];
        for (const exportName of namedExports) {
            if (exportName in moduleExports) {
                const exported = moduleExports[exportName];

                if (typeof exported === 'function') {
                    try {
                        const result = await exported();
                        if (this.isValidTool(result)) return result;
                    } catch {
                        // Not callable
                    }
                }

                if (this.isValidTool(exported)) {
                    return exported;
                }
            }
        }

        // Check if the module itself is a tool
        if (this.isValidTool(moduleExports)) {
            return moduleExports;
        }

        return null;
    }

    /**
     * Validate if an object is a valid tool
     */
    private isValidTool(obj: any): obj is ToolDefinition {
        return obj &&
            typeof obj === 'object' &&
            typeof obj.id === 'string' &&
            typeof obj.description === 'string' &&
            typeof obj.execute === 'function';
    }

    /**
     * Check if a file should be loaded as a tool
     */
    private isToolFile(filename: string): boolean {
        return this.options.extensions.some(ext => filename.endsWith(ext));
    }

    /**
     * Check if a path exists
     */
    private async exists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Compute hash of a file
     */
    private async computeFileHash(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
            debug.error(`[ToolLoader] Failed to compute hash for ${filePath}:`, error);
            return '';
        }
    }

    /**
     * Unload a tool and run cleanup
     */
    private async unloadTool(toolId: string): Promise<void> {
        debug.log(`[ToolLoader] Unloading tool: ${toolId}`);

        const tool = this.registry.get(toolId);
        if (tool && tool.definition.cleanup) {
            try {
                const context = {
                    registry: this.registry,
                    workingDirectory: process.cwd()
                };
                await tool.definition.cleanup(context);
                debug.log(`[ToolLoader] Cleanup completed for ${toolId}`);
            } catch (error) {
                debug.error(`[ToolLoader] Cleanup failed for ${toolId}:`, error);
            }
        }

        // Unregister from registry
        await this.registry.unregister(toolId);

        // Remove from loaded tools
        this.loadedTools.delete(toolId);
    }

    /**
     * Reload all tools (for --watch-tools command)
     */
    async reloadAllTools(): Promise<void> {
        debug.log('[ToolLoader] Reloading all tools...');

        // Unload all currently loaded tools
        const toolIds = Array.from(this.loadedTools.keys());
        for (const toolId of toolIds) {
            // Skip built-in tools
            if (this.loadedTools.get(toolId)?.path.startsWith('builtin:')) {
                continue;
            }
            await this.unloadTool(toolId);
        }

        // Clear module cache for dynamic imports
        if (typeof require !== 'undefined' && require.cache) {
            for (const [toolId, info] of this.loadedTools) {
                if (info.path && !info.path.startsWith('builtin:')) {
                    delete require.cache[info.path];
                }
            }
        }

        // Reload all tools
        await this.loadTools();

        debug.log('[ToolLoader] Tool reload complete');
    }

    /**
     * Set up file watchers for hot reloading
     */
    private async setupWatchers(): Promise<void> {
        const {watch} = await import('fs');

        for (const dir of this.options.directories) {
            const toolsDir = path.join(dir, dir.endsWith('tools') ? '' : 'tools');

            if (!await this.exists(toolsDir)) continue;

            const watcher = watch(toolsDir, {recursive: true}, async (eventType, filename) => {
                if (!filename || !this.isToolFile(filename)) return;

                const filePath = path.join(toolsDir, filename);

                try {
                    const stats = await fs.stat(filePath);
                    if (stats.isFile()) {
                        debug.log(`[ToolLoader] Reloading ${filename}...`);
                        await this.loadToolFile(filePath);
                    }
                } catch {
                    // File was deleted, unregister if loaded
                    const toolId = this.findToolByPath(filePath);
                    if (toolId) {
                        await this.registry.unregister(toolId);
                        this.loadedTools.delete(toolId);
                        debug.log(`[ToolLoader] Unregistered ${toolId}`);
                    }
                }
            });

            // Store cleanup function
            this.watcherCleanup.push(() => watcher.close());
        }
    }

    /**
     * Find tool ID by file path
     */
    private findToolByPath(filePath: string): string | undefined {
        for (const [toolId, info] of this.loadedTools.entries()) {
            if (info.path === filePath) return toolId;
        }
        return undefined;
    }

    /**
     * Get loaded tools info
     */
    getLoadedTools(): Array<{ toolId: string; filePath: string; hash: string }> {
        return Array.from(this.loadedTools.entries()).map(([toolId, info]) => ({
            toolId,
            filePath: info.path,
            hash: info.hash
        }));
    }

    /**
     * Reload all tools
     */
    async reloadTools(): Promise<void> {
        debug.log('[ToolLoader] Reloading all tools...');

        // Store current tools
        const currentTools = new Map(this.loadedTools);

        // Clear loaded tools
        this.loadedTools.clear();

        // Reload each tool
        for (const [_, info] of currentTools) {
            if (!info.path.startsWith('builtin:')) {
                await this.loadToolFile(info.path);
            }
        }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        // Close all watchers
        for (const cleanup of this.watcherCleanup) {
            cleanup();
        }
        this.watcherCleanup = [];

        // Clear loaded tools
        this.loadedTools.clear();
    }

    /**
     * Load a module with shared dependencies from the main clanker package
     */
    private loadWithSharedDependencies(requireFunc: any, filePath: string): any {
        const Module = requireFunc('module');
        const originalResolveFilename = Module._resolveFilename;

        // Create a custom resolver that shares dependencies from main clanker
        Module._resolveFilename = function (request: string, parent: any, isMain: boolean) {
            // Check if this is a dependency that should be shared
            if (shouldShareDependency(request)) {
                try {
                    // Try to resolve from the main clanker module context
                    // This allows tools to use React, Ink, and other deps from clanker
                    const mainModule = require.main || module;
                    return originalResolveFilename.call(this, request, mainModule, false);
                } catch (e) {
                    // If that fails, try from the current module context
                    try {
                        return originalResolveFilename.call(this, request, module, false);
                    } catch (e2) {
                        debug.log(`[ToolLoader] Failed to resolve shared dependency ${request}`);
                    }
                }
            }

            // Fall back to normal resolution
            return originalResolveFilename.call(this, request, parent, isMain);
        };

        try {
            // Clear cache to ensure fresh load
            delete requireFunc.cache[filePath];
            const loadedModule = requireFunc(filePath);
            return loadedModule;
        } finally {
            // Always restore original resolution
            Module._resolveFilename = originalResolveFilename;
        }
    }

    /**
     * Create a tool template file
     */
    static async createToolTemplate(toolName: string, baseDir: string = process.cwd()): Promise<void> {
        const toolsDir = path.join(baseDir, '.clank', 'tools');

        // Ensure directory exists
        await fs.mkdir(toolsDir, {recursive: true});

        const fileName = `${toolName}.ts`;
        const filePath = path.join(toolsDir, fileName);

        // Check if file already exists
        try {
            await fs.access(filePath);
            throw new Error(`Tool file already exists: ${filePath}`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') throw error;
        }

        // Create template content
        const template = `/**
 * ${toolName} tool
 * 
 * This is a template for creating a custom tool.
 * Edit this file to implement your tool's functionality.
 */

import { createTool, ToolCategory, ToolCapability } from '@ziggle/clanker';

// Using the builder API
export default createTool()
  .id('${toolName}')
  .name('${toolName.charAt(0).toUpperCase() + toolName.slice(1)} Tool')
  .description('Description of what this tool does')
  .category(ToolCategory.Utility)
  .capabilities(ToolCapability.FileRead)
  .tags('custom', 'example')
  
  // Define arguments
  .stringArg('input', 'Input value', { required: true })
  .booleanArg('verbose', 'Enable verbose output', { default: false })
  
  // Define the execution logic
  .execute(async (args, context) => {
    const { input, verbose } = args;
    
    if (verbose) {
      context.logger?.debug('Processing input:', input);
    }
    
    // Your tool logic here
    const result = \`Processed: \${input}\`;
    
    return {
      success: true,
      output: result,
      data: { processed: result }
    };
  })
  .build();
`;

        await fs.writeFile(filePath, template, 'utf-8');
        debug.log(`Created tool template: ${filePath}`);
    }
}

/**
 * Create a tool loader instance
 */
export function createToolLoader(registry: ToolRegistry, options?: LoaderOptions): ToolLoader {
    return new ToolLoader(registry, options);
}