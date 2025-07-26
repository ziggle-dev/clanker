/**
 * Core tools management
 * Handles auto-installation of core tools on first run
 */

import { ToolInstaller } from './installer';
import { debug } from '../utils/debug-logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// List of core tools that should be auto-installed
const CORE_TOOLS = [
  'clanker/bash',
  'clanker/pwd',
  'clanker/list',
  'clanker/read-file',
  'clanker/write-to-file',
  'clanker/remove',
  'clanker/search',
  'clanker/input',
  'clanker/summarize',
  'clanker/view-file',
  'clanker/multi-edit',
  'clanker/create-todo-list',
  'clanker/list-todos',
  'clanker/update-todo-list'
];

export class CoreToolsManager {
  private installer: ToolInstaller;
  private coreToolsFile: string;

  constructor() {
    this.installer = new ToolInstaller();
    this.coreToolsFile = path.join(os.homedir(), '.clanker', 'core-tools-installed.json');
  }

  /**
   * Check if core tools are installed and install them if needed
   */
  async ensureCoreToolsInstalled(): Promise<void> {
    try {
      debug.log('[CoreTools] Checking core tools installation...');
      
      // Check if we've already installed core tools
      const isInstalled = await this.checkInstallationStatus();
      if (isInstalled) {
        debug.log('[CoreTools] Core tools already installed');
        return;
      }

      console.log('🔧 Installing core tools for first-time setup...');
      
      // Install each core tool
      const results = await Promise.allSettled(
        CORE_TOOLS.map(tool => this.installTool(tool))
      );

      // Count successes and failures
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        console.log(`⚠️  Installed ${succeeded}/${CORE_TOOLS.length} core tools (${failed} failed)`);
        console.log('   You can manually install missing tools with: clanker --install <tool>');
      } else {
        console.log(`✅ Successfully installed all ${succeeded} core tools`);
      }

      // Mark as installed
      await this.markAsInstalled();
      
    } catch (error) {
      debug.error('[CoreTools] Failed to ensure core tools:', error);
      console.error('⚠️  Failed to install core tools. You can install them manually.');
    }
  }

  /**
   * Install a single tool
   */
  private async installTool(toolSpec: string): Promise<void> {
    try {
      debug.log(`[CoreTools] Installing ${toolSpec}...`);
      await this.installer.install(toolSpec);
    } catch (error) {
      debug.error(`[CoreTools] Failed to install ${toolSpec}:`, error);
      throw error;
    }
  }

  /**
   * Check if core tools have been installed
   */
  private async checkInstallationStatus(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.coreToolsFile, 'utf-8');
      const status = JSON.parse(data);
      return status.installed === true;
    } catch {
      return false;
    }
  }

  /**
   * Mark core tools as installed
   */
  private async markAsInstalled(): Promise<void> {
    const dir = path.dirname(this.coreToolsFile);
    await fs.mkdir(dir, { recursive: true });
    
    const status = {
      installed: true,
      version: '1.0.0',
      installedAt: new Date().toISOString(),
      tools: CORE_TOOLS
    };
    
    await fs.writeFile(this.coreToolsFile, JSON.stringify(status, null, 2));
  }

  /**
   * Force reinstall core tools
   */
  async reinstallCoreTools(): Promise<void> {
    try {
      // Remove installation marker
      await fs.unlink(this.coreToolsFile).catch(() => {});
      
      // Reinstall
      await this.ensureCoreToolsInstalled();
    } catch (error) {
      debug.error('[CoreTools] Failed to reinstall:', error);
      throw error;
    }
  }

  /**
   * Get list of core tools
   */
  getCoreTools(): string[] {
    return [...CORE_TOOLS];
  }
}