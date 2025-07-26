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
        
        // Try to fetch from GitHub releases first
        let registry: ToolRegistry | null = null;
        
        if (repo.url.includes('github.com')) {
          registry = await this.fetchFromGitHubReleases(repo);
        }
        
        // Fallback to registry.json if no releases
        if (!registry) {
          const url = `${registryUrl}/registry.json`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch from ${repo.name}: ${response.statusText}`);
          }
          
          registry = await response.json() as ToolRegistry;
        }
        
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
    debug.log(`[Registry] Fetching metadata for ${tool.org}/${tool.name}`);
    
    // First try to get from registry (which uses releases)
    const registry = await this.fetchRegistry();
    debug.log(`[Registry] Found ${registry.tools.length} tools in registry`);
    
    const toolInfo = registry.tools.find(t => 
      t.org === tool.org && t.name === tool.name
    );
    
    if (toolInfo) {
      debug.log(`[Registry] Found tool in registry:`, toolInfo);
      // Convert registry format to metadata format
      const version = toolInfo.version || toolInfo.latest || '1.0.0';
      debug.log(`[Registry] Converting toolInfo to metadata. Version: ${version}`);
      const metadata = {
        id: toolInfo.id || `${toolInfo.org}/${toolInfo.name}`,
        name: `${toolInfo.org}-clanker-tool-${toolInfo.name}`,
        description: toolInfo.description,
        author: toolInfo.author || 'Unknown',
        homepage: toolInfo.homepage || toolInfo.repository || '',
        repository: toolInfo.repository || '',
        latest: version,
        versions: {
          [version]: {
            date: toolInfo.updated || toolInfo.created || new Date().toISOString(),
            minClankerVersion: '0.1.0',
            sha256: 'example-hash-will-be-computed'
          }
        },
        tags: toolInfo.keywords || []
      };
      debug.log(`[Registry] Created metadata:`, JSON.stringify(metadata, null, 2));
      return metadata;
    }
    
    // Fallback to old method for backward compatibility
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
        // Try to download from releases first
        if (repo.url.includes('github.com')) {
          const releaseBuffer = await this.downloadFromRelease(repo, tool, version);
          if (releaseBuffer) {
            return releaseBuffer;
          }
        }
        
        // Fallback to raw content
        const registryUrl = this.getRegistryUrl(repo.url);
        const url = `${registryUrl}/tools/${tool.org}/${tool.name}/${version}/index.js`;
        
        debug.log(`[Registry] Downloading ${tool.org}/${tool.name}@${version} from ${repo.name} (raw)`);
        
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
   * Download tool from GitHub release
   */
  private async downloadFromRelease(repo: any, tool: ToolIdentifier, version: string): Promise<Buffer | null> {
    try {
      const match = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return null;
      
      const [, owner, repoName] = match;
      
      // Get the release (use cached if available)
      let release = (this as any).currentRelease;
      
      if (!release) {
        const releaseUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/latest`;
        const releaseResponse = await fetch(releaseUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            ...(process.env.GITHUB_TOKEN && {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`
            })
          }
        });
        
        if (!releaseResponse.ok) {
          return null;
        }
        
        release = await releaseResponse.json();
      }
      
      // Look for the org archive
      const orgAsset = release.assets?.find((asset: any) => 
        asset.name === `${tool.org}.tar.gz`
      );
      
      if (!orgAsset) {
        debug.log(`[Registry] No ${tool.org}.tar.gz in release`);
        return null;
      }
      
      // Download the archive
      debug.log(`[Registry] Downloading ${tool.org}.tar.gz from release`);
      const response = await fetch(orgAsset.browser_download_url);
      
      if (!response.ok) {
        throw new Error(`Failed to download archive: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
      
    } catch (error) {
      debug.error(`[Registry] Error downloading from release:`, error);
      return null;
    }
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
  
  /**
   * Fetch tools from GitHub releases
   */
  private async fetchFromGitHubReleases(repo: any): Promise<ToolRegistry | null> {
    try {
      const match = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return null;
      
      const [, owner, repoName] = match;
      debug.log(`[Registry] Checking for releases in ${owner}/${repoName}`);
      
      // Get latest release
      const releaseUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/latest`;
      const releaseResponse = await fetch(releaseUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
        }
      });
      
      if (!releaseResponse.ok) {
        debug.log(`[Registry] No releases found for ${repo.name} (${releaseResponse.status})`);
        return null;
      }
      
      const release = await releaseResponse.json() as any;
      
      // Find tools.json asset
      const toolsAsset = release.assets?.find((asset: any) => 
        asset.name === 'tools.json'
      );
      
      if (!toolsAsset) {
        debug.log(`[Registry] No tools.json in release for ${repo.name}`);
        return null;
      }
      
      // Download tools.json
      debug.log(`[Registry] Downloading tools.json from release ${release.tag_name}`);
      const toolsResponse = await fetch(toolsAsset.browser_download_url);
      
      if (!toolsResponse.ok) {
        throw new Error(`Failed to download tools.json: ${toolsResponse.statusText}`);
      }
      
      const toolsIndex = await toolsResponse.json() as any;
      
      // Store release info for later use in downloadTool
      (this as any).currentRelease = release;
      
      // Transform to our format
      return {
        version: toolsIndex.version || '1.0.0',
        tools: toolsIndex.tools || [],
        updated: toolsIndex.timestamp || new Date().toISOString()
      };
      
    } catch (error) {
      debug.error(`[Registry] Error fetching from releases:`, error);
      return null;
    }
  }
}