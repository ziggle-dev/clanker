/**
 * Registry client for fetching tool information from GitHub
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { debug } from '../utils/debug-logger';
import { 
  ToolRegistry, 
  ToolPackageMetadata, 
  ToolIdentifier,
  PackageManagerOptions 
} from './types';
import { RepositoryManager } from './repository-manager';

export class RegistryClient {
  private registryUrl: string;
  private cacheDir: string;
  private cacheTimeout: number = 1000; // 1 second for testing
  private repoManager: RepositoryManager;

  constructor(options: PackageManagerOptions = {}) {
    this.registryUrl = options.registryUrl || 'https://raw.githubusercontent.com/ziggle-dev/clanker-tools/main';
    this.cacheDir = options.cacheDir || path.join(process.env.HOME || '', '.clanker', 'cache');
    this.repoManager = new RepositoryManager();
  }

  /**
   * Fetch the tool registry from all configured repositories
   */
  async fetchRegistry(): Promise<ToolRegistry> {
    const repositories = await this.repoManager.getRepositories();
    const allTools: ToolRegistry['tools'] = [];
    const errors: string[] = [];
    
    // Fetch from each repository in priority order
    for (const repo of repositories) {
      try {
        debug.log(`[Registry] Fetching from ${repo.name}`);
        const registryUrl = this.getRegistryUrl(repo.url);
        const cacheFile = path.join(this.cacheDir, `registry-${this.hashUrl(repo.url)}.json`);
        
        // Check cache first
        try {
          const cached = await this.readCache<ToolRegistry>(cacheFile);
          if (cached) {
            debug.log(`[Registry] Using cached registry for ${repo.name}`);
            allTools.push(...cached.tools);
            continue;
          }
        } catch {
          debug.log(`[Registry] Cache miss for ${repo.name}`);
        }
        
        // Fetch from repository
        const url = `${registryUrl}/registry.json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from ${repo.name}: ${response.statusText}`);
        }
        
        const registry = await response.json() as ToolRegistry;
        
        // Cache the result
        await this.writeCache(cacheFile, registry);
        
        // Add tools from this repository
        allTools.push(...registry.tools);
        
      } catch (error) {
        const errorMsg = `Failed to fetch from ${repo.name}: ${error instanceof Error ? error.message : String(error)}`;
        debug.error(`[Registry] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    if (allTools.length === 0 && errors.length > 0) {
      throw new Error(`Failed to fetch from any repository:\n${errors.join('\n')}`);
    }
    
    // Deduplicate tools (first repository wins)
    const uniqueTools = new Map<string, typeof allTools[0]>();
    for (const tool of allTools) {
      const key = `${tool.org}/${tool.name}`;
      if (!uniqueTools.has(key)) {
        uniqueTools.set(key, tool);
      }
    }
    
    return {
      version: '1.0.0',
      tools: Array.from(uniqueTools.values()),
      updated: new Date().toISOString()
    };
  }

  /**
   * Fetch metadata for a specific tool from repositories
   */
  async fetchToolMetadata(tool: ToolIdentifier): Promise<ToolPackageMetadata> {
    const repositories = await this.repoManager.getRepositories();
    const errors: string[] = [];
    
    // Try each repository in priority order
    for (const repo of repositories) {
      try {
        const registryUrl = this.getRegistryUrl(repo.url);
        const cacheFile = path.join(this.cacheDir, 'tools', `${this.hashUrl(repo.url)}-${tool.org}-${tool.name}.json`);
        
        // Check cache first
        try {
          const cached = await this.readCache<ToolPackageMetadata>(cacheFile);
          if (cached) {
            debug.log(`[Registry] Using cached metadata for ${tool.org}/${tool.name} from ${repo.name}`);
            return cached;
          }
        } catch {
          debug.log(`[Registry] Cache miss for ${tool.org}/${tool.name} from ${repo.name}`);
        }
        
        // Fetch from repository
        const url = `${registryUrl}/tools/${tool.org}/${tool.name}/metadata.json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Not found in ${repo.name}`);
        }
        
        const metadata = await response.json() as ToolPackageMetadata;
        
        // Cache the result
        await this.writeCache(cacheFile, metadata);
        
        return metadata;
        
      } catch (error) {
        const errorMsg = `${repo.name}: ${error instanceof Error ? error.message : String(error)}`;
        debug.log(`[Registry] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    // Tool not found in any repository
    throw new Error(`Tool not found: ${tool.org}/${tool.name}\nSearched in:\n${errors.join('\n')}`);
  }

  /**
   * Download a tool file from repositories
   */
  async downloadTool(tool: ToolIdentifier, version: string): Promise<Buffer> {
    const repositories = await this.repoManager.getRepositories();
    const errors: string[] = [];
    
    // Try each repository in priority order
    for (const repo of repositories) {
      try {
        const registryUrl = this.getRegistryUrl(repo.url);
        const url = `${registryUrl}/tools/${tool.org}/${tool.name}/${version}/index.js`;
        
        debug.log(`[Registry] Downloading ${tool.org}/${tool.name}@${version} from ${repo.name}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Not found in ${repo.name}: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
        
      } catch (error) {
        const errorMsg = `${repo.name}: ${error instanceof Error ? error.message : String(error)}`;
        debug.log(`[Registry] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    // Tool not found in any repository
    throw new Error(`Failed to download tool ${tool.org}/${tool.name}@${version}\nTried:\n${errors.join('\n')}`);
  }

  /**
   * Search for tools in the registry
   */
  async searchTools(query: string): Promise<ToolRegistry['tools']> {
    const registry = await this.fetchRegistry();
    
    const lowerQuery = query.toLowerCase();
    return registry.tools.filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.org.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Read from cache
   */
  private async readCache<T>(filePath: string): Promise<T | null> {
    try {
      const stat = await fs.stat(filePath);
      const age = Date.now() - stat.mtime.getTime();
      
      if (age > this.cacheTimeout) {
        debug.log(`[Registry] Cache expired for ${filePath}`);
        return null;
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Write to cache
   */
  private async writeCache<T>(filePath: string, data: T): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      debug.warn(`[Registry] Failed to write cache for ${filePath}:`, error);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      debug.log('[Registry] Cache cleared');
    } catch (error) {
      debug.warn('[Registry] Failed to clear cache:', error);
    }
  }
  
  /**
   * Get registry URL from repository URL
   */
  private getRegistryUrl(repoUrl: string): string {
    // Convert GitHub repo URL to raw content URL
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        return `https://raw.githubusercontent.com/${owner}/${repo}/main`;
      }
    }
    
    // If it's already a raw URL or other format, use as-is
    return repoUrl;
  }
  
  /**
   * Hash URL for cache file naming
   */
  private hashUrl(url: string): string {
    // Simple hash for filename
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}