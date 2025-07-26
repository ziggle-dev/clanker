/**
 * Main package manager for Clanker tools
 */

import { ToolInstaller } from './installer';
import { RegistryClient } from './registry';
import { PackageManagerOptions, SearchOptions } from './types';
import { ExperimentalToolManager } from './experimental';

export class ClankerPackageManager {
  private installer: ToolInstaller;
  private registry: RegistryClient;
  private experimental: ExperimentalToolManager;

  constructor(options: PackageManagerOptions = {}) {
    this.installer = new ToolInstaller(options);
    this.registry = new RegistryClient(options);
    this.experimental = new ExperimentalToolManager(options);
  }

  /**
   * Install a tool
   */
  async install(toolSpec: string, options?: { force?: boolean }): Promise<void> {
    return this.installer.install(toolSpec, options);
  }

  /**
   * Uninstall a tool
   */
  async uninstall(toolSpec: string): Promise<void> {
    return this.installer.uninstall(toolSpec);
  }

  /**
   * Search for tools
   */
  async search(query: string, options: SearchOptions = {}): Promise<void> {
    try {
      const results = await this.registry.searchTools(query);
      
      if (results.length === 0) {
        console.log('No tools found matching your query.');
        return;
      }
      
      // Sort results
      const sortedResults = [...results];
      if (options.sortBy) {
        sortedResults.sort((a, b) => {
          switch (options.sortBy) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'downloads':
              return (b.downloads || 0) - (a.downloads || 0);
            case 'stars':
              return (b.stars || 0) - (a.stars || 0);
            default:
              return 0;
          }
        });
      }
      
      // Limit results
      const limitedResults = options.limit 
        ? sortedResults.slice(0, options.limit)
        : sortedResults;
      
      console.log(`\n🔍 Found ${results.length} tools:\n`);
      
      for (const tool of limitedResults) {
        console.log(`${tool.org}/${tool.name} (v${tool.latest})`);
        console.log(`  ${tool.description}`);
        if (tool.downloads || tool.stars) {
          const stats = [];
          if (tool.downloads) stats.push(`${tool.downloads} downloads`);
          if (tool.stars) stats.push(`⭐ ${tool.stars}`);
          console.log(`  ${stats.join(' · ')}`);
        }
        console.log();
      }
      
      if (options.limit && results.length > options.limit) {
        console.log(`... and ${results.length - options.limit} more results`);
      }
    } catch (error) {
      console.error(`❌ Search failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * List installed tools
   */
  async listInstalled(): Promise<void> {
    try {
      const installed = await this.installer.listInstalled();
      
      if (installed.length === 0) {
        console.log('No tools installed.');
        return;
      }
      
      console.log(`\n📦 Installed tools (${installed.length}):\n`);
      
      for (const tool of installed) {
        console.log(`${tool.org}/${tool.name}@${tool.version}`);
        console.log(`  Installed: ${new Date(tool.installedAt).toLocaleDateString()}`);
        console.log(`  Path: ${tool.path}`);
        console.log();
      }
    } catch (error) {
      console.error(`❌ Failed to list installed tools: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update a tool to latest version
   */
  async update(toolSpec: string): Promise<void> {
    return this.installer.update(toolSpec);
  }

  /**
   * Clear registry cache
   */
  async clearCache(): Promise<void> {
    await this.registry.clearCache();
    console.log('✅ Cache cleared');
  }
  
  /**
   * Enable experimental mode
   */
  async enableExperimental(): Promise<void> {
    await this.experimental.enable();
    console.log('🧪 Experimental mode enabled');
    console.log('⚠️  Warning: Experimental tools have not been fully reviewed and may be unstable');
  }
  
  /**
   * List available experimental tools
   */
  async listExperimental(): Promise<void> {
    const isEnabled = await this.experimental.isEnabled();
    if (!isEnabled) {
      console.log('ℹ️  Experimental mode is not enabled. Use --enable-experimental to enable.');
      return;
    }
    
    try {
      const tools = await this.experimental.listAvailable();
      
      if (tools.length === 0) {
        console.log('No experimental tools available.');
        return;
      }
      
      console.log(`\n🧪 Available experimental tools (${tools.length}):\n`);
      
      // Group by source
      const branches = tools.filter(t => t.source === 'branch');
      const prs = tools.filter(t => t.source === 'pr');
      
      if (branches.length > 0) {
        console.log('From branches:');
        for (const tool of branches) {
          console.log(`  ${tool.org}/${tool.name}@${tool.version}`);
          console.log(`    Branch: ${tool.sourceRef}`);
        }
        console.log();
      }
      
      if (prs.length > 0) {
        console.log('From pull requests:');
        for (const tool of prs) {
          console.log(`  ${tool.org}/${tool.name}@pr-${tool.sourceRef}`);
          console.log(`    PR #${tool.sourceRef}`);
        }
      }
      
      console.log('\nℹ️  Install with: clanker --install org/tool@branch or org/tool@pr-123');
      
    } catch (error) {
      console.error(`❌ Failed to list experimental tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Install an experimental tool
   */
  async installExperimental(toolSpec: string): Promise<void> {
    const isEnabled = await this.experimental.isEnabled();
    if (!isEnabled) {
      console.log('ℹ️  Experimental mode is not enabled. Use --enable-experimental to enable.');
      return;
    }
    
    try {
      await this.experimental.install(toolSpec);
    } catch (error) {
      console.error(`❌ Failed to install experimental tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * List installed experimental tools
   */
  async listInstalledExperimental(): Promise<void> {
    try {
      const tools = await this.experimental.listInstalled();
      
      if (tools.length === 0) {
        console.log('No experimental tools installed.');
        return;
      }
      
      console.log(`\n🧪 Installed experimental tools (${tools.length}):\n`);
      
      for (const tool of tools) {
        console.log(`${tool.org}/${tool.name}@${tool.version}`);
        console.log(`  Source: ${tool.source === 'pr' ? `PR #${tool.sourceRef}` : `Branch ${tool.sourceRef}`}`);
        console.log(`  Installed: ${new Date(tool.installedAt).toLocaleDateString()}`);
        console.log();
      }
      
    } catch (error) {
      console.error(`❌ Failed to list experimental tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upgrade experimental tools to stable versions
   */
  async upgradeExperimental(): Promise<void> {
    try {
      await this.experimental.upgradeToStable();
    } catch (error) {
      console.error(`❌ Failed to upgrade experimental tools: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Export main class and types
export * from './types';
export * from './experimental';
export { ClankerPackageManager as PackageManager };