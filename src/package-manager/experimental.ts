/**
 * Experimental tool support for testing unmerged PRs and staging branches
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { debug } from '../utils/debug-logger';
import { 
  ToolIdentifier, 
  InstalledTool,
  PackageManagerOptions 
} from './types';

export interface ExperimentalTool extends InstalledTool {
  experimental: true;
  source: 'branch' | 'pr';
  sourceRef: string; // branch name or PR number
}

export interface ExperimentalManifest {
  version: string;
  experimental: ExperimentalTool[];
  lastUpdated: string;
}

export class ExperimentalToolManager {
  private manifestPath: string;
  private registryUrl: string;
  
  constructor(private options: PackageManagerOptions = {}) {
    const baseDir = options.toolsDir || path.join(process.env.HOME || '', '.clanker', 'tools');
    this.manifestPath = path.join(baseDir, 'experimental-manifest.json');
    this.registryUrl = 'https://api.github.com/repos/ziggle-dev/clanker-tools';
  }
  
  /**
   * Check if experimental mode is enabled
   */
  async isEnabled(): Promise<boolean> {
    // Check environment variable
    if (process.env.CLANKER_EXPERIMENTAL === 'true') {
      return true;
    }
    
    // Check config file
    try {
      const configPath = path.join(process.env.HOME || '', '.clanker', 'config.json');
      const config = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(config);
      return parsed.experimental?.enabled === true;
    } catch {
      return false;
    }
  }
  
  /**
   * Enable experimental mode
   */
  async enable(): Promise<void> {
    const configPath = path.join(process.env.HOME || '', '.clanker', 'config.json');
    let config: any = {};
    
    try {
      const existing = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existing);
    } catch {
      // Config doesn't exist yet
    }
    
    config.experimental = {
      enabled: true,
      autoUpgrade: true,
      sources: ['branches', 'pull-requests']
    };
    
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    debug.log('[Experimental] Experimental mode enabled');
  }
  
  /**
   * List available experimental tools from branches
   */
  async listAvailable(): Promise<ExperimentalTool[]> {
    const tools: ExperimentalTool[] = [];
    
    try {
      // Fetch branches from GitHub API
      const response = await fetch(`${this.registryUrl}/branches`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'clanker-cli'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.statusText}`);
      }
      
      const branches = await response.json();
      
      // Filter for tool branches (format: org/tool@version)
      const toolBranches = branches.filter((branch: any) => 
        branch.name.match(/^[^/]+\/[^/]+@[\d.]+$/)
      );
      
      for (const branch of toolBranches) {
        const [orgTool, version] = branch.name.split('@');
        const [org, name] = orgTool.split('/');
        
        tools.push({
          org,
          name,
          version,
          installedAt: '',
          path: '',
          experimental: true,
          source: 'branch',
          sourceRef: branch.name
        });
      }
      
      // Also fetch open PRs
      const prResponse = await fetch(`${this.registryUrl}/pulls?state=open`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'clanker-cli'
        }
      });
      
      if (prResponse.ok) {
        const prs = await prResponse.json();
        
        for (const pr of prs) {
          // Check if PR has a tool submission
          if (pr.head.ref.match(/^[^/]+\/[^/]+@[\d.]+$/)) {
            const [orgTool, version] = pr.head.ref.split('@');
            const [org, name] = orgTool.split('/');
            
            tools.push({
              org,
              name,
              version,
              installedAt: '',
              path: '',
              experimental: true,
              source: 'pr',
              sourceRef: pr.number.toString()
            });
          }
        }
      }
      
    } catch (error) {
      debug.error('[Experimental] Failed to list available tools:', error);
    }
    
    return tools;
  }
  
  /**
   * Install an experimental tool
   */
  async install(toolSpec: string): Promise<void> {
    debug.log(`[Experimental] Installing experimental tool: ${toolSpec}`);
    
    // Parse tool spec (org/tool@version, org/tool@pr-123, org/tool@branch)
    let org: string, name: string, ref: string;
    let source: 'branch' | 'pr';
    
    if (toolSpec.includes('@pr-')) {
      // PR reference: org/tool@pr-123
      const [orgTool, prRef] = toolSpec.split('@pr-');
      [org, name] = orgTool.split('/');
      ref = prRef;
      source = 'pr';
    } else if (toolSpec.includes('@')) {
      // Branch reference: org/tool@branch-name
      const [orgTool, branchRef] = toolSpec.split('@');
      [org, name] = orgTool.split('/');
      ref = branchRef;
      source = 'branch';
    } else {
      throw new Error('Experimental tools must specify a version, branch, or PR number');
    }
    
    // Resolve to actual branch name
    let branchName = ref;
    if (source === 'pr') {
      // Get branch name from PR
      const response = await fetch(`${this.registryUrl}/pulls/${ref}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'clanker-cli'
        }
      });
      
      if (!response.ok) {
        throw new Error(`PR #${ref} not found`);
      }
      
      const pr = await response.json();
      branchName = pr.head.ref;
    }
    
    // Download tool from branch
    const toolUrl = `https://raw.githubusercontent.com/ziggle-dev/clanker-tools/${branchName}/tools/${org}/${name}`;
    
    // Get latest version from branch
    const versionsResponse = await fetch(`${toolUrl}`, {
      headers: { 'User-Agent': 'clanker-cli' }
    });
    
    if (!versionsResponse.ok) {
      throw new Error(`Tool ${org}/${name} not found in branch ${branchName}`);
    }
    
    // For now, assume version is in the branch name
    const version = branchName.split('@')[1] || 'experimental';
    
    // Download tool files
    const toolDir = path.join(
      this.options.toolsDir || path.join(process.env.HOME || '', '.clanker', 'tools'),
      org,
      name,
      version
    );
    
    await fs.mkdir(toolDir, { recursive: true });
    
    // Download index.js
    const indexResponse = await fetch(`${toolUrl}/${version}/index.js`, {
      headers: { 'User-Agent': 'clanker-cli' }
    });
    
    if (!indexResponse.ok) {
      throw new Error(`Failed to download tool files`);
    }
    
    const indexContent = await indexResponse.text();
    await fs.writeFile(path.join(toolDir, 'index.js'), indexContent);
    
    // Download manifest.json
    const manifestResponse = await fetch(`${toolUrl}/${version}/manifest.json`, {
      headers: { 'User-Agent': 'clanker-cli' }
    });
    
    if (manifestResponse.ok) {
      const manifestContent = await manifestResponse.text();
      await fs.writeFile(path.join(toolDir, 'manifest.json'), manifestContent);
    }
    
    // Update experimental manifest
    await this.addToManifest({
      org,
      name,
      version,
      installedAt: new Date().toISOString(),
      path: toolDir,
      experimental: true,
      source,
      sourceRef: ref
    });
    
    console.log(`✅ Installed experimental tool: ${org}/${name}@${version} from ${source} ${ref}`);
  }
  
  /**
   * List installed experimental tools
   */
  async listInstalled(): Promise<ExperimentalTool[]> {
    try {
      const manifest = await this.loadManifest();
      return manifest.experimental;
    } catch {
      return [];
    }
  }
  
  /**
   * Upgrade experimental tools to stable versions
   */
  async upgradeToStable(): Promise<void> {
    const experimental = await this.listInstalled();
    let upgraded = 0;
    
    for (const tool of experimental) {
      try {
        // Check if tool is now in main registry
        const registryResponse = await fetch(
          `https://raw.githubusercontent.com/ziggle-dev/clanker-tools/main/tools/${tool.org}/${tool.name}/metadata.json`,
          { headers: { 'User-Agent': 'clanker-cli' } }
        );
        
        if (registryResponse.ok) {
          const metadata = await registryResponse.json();
          
          // Check if our version is now stable
          if (metadata.versions && metadata.versions[tool.version]) {
            console.log(`📦 Upgrading ${tool.org}/${tool.name}@${tool.version} to stable`);
            
            // Remove experimental flag
            await this.removeFromManifest(tool);
            
            // Tool is already installed in the right place, just remove experimental tracking
            upgraded++;
          }
        }
      } catch (error) {
        debug.error(`[Experimental] Failed to check ${tool.org}/${tool.name}:`, error);
      }
    }
    
    if (upgraded > 0) {
      console.log(`✅ Upgraded ${upgraded} tools to stable versions`);
    } else {
      console.log('ℹ️  No experimental tools ready for upgrade');
    }
  }
  
  /**
   * Load experimental manifest
   */
  private async loadManifest(): Promise<ExperimentalManifest> {
    try {
      const content = await fs.readFile(this.manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        version: '1.0.0',
        experimental: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  /**
   * Save experimental manifest
   */
  private async saveManifest(manifest: ExperimentalManifest): Promise<void> {
    await fs.mkdir(path.dirname(this.manifestPath), { recursive: true });
    await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }
  
  /**
   * Add tool to experimental manifest
   */
  private async addToManifest(tool: ExperimentalTool): Promise<void> {
    const manifest = await this.loadManifest();
    
    // Remove existing entry if present
    manifest.experimental = manifest.experimental.filter(
      t => !(t.org === tool.org && t.name === tool.name)
    );
    
    // Add new entry
    manifest.experimental.push(tool);
    manifest.lastUpdated = new Date().toISOString();
    
    await this.saveManifest(manifest);
  }
  
  /**
   * Remove tool from experimental manifest
   */
  private async removeFromManifest(tool: ExperimentalTool): Promise<void> {
    const manifest = await this.loadManifest();
    
    manifest.experimental = manifest.experimental.filter(
      t => !(t.org === tool.org && t.name === tool.name && t.version === tool.version)
    );
    
    manifest.lastUpdated = new Date().toISOString();
    await this.saveManifest(manifest);
  }
}

export function createExperimentalToolManager(options?: PackageManagerOptions): ExperimentalToolManager {
  return new ExperimentalToolManager(options);
}