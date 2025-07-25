/**
 * Tool installer for downloading and installing Clanker tools
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { debug } from '../utils/debug-logger';
import { RegistryClient } from './registry';
import { VersionResolver } from './resolver';
import {
  ToolIdentifier,
  ToolManifest,
  InstalledTool,
  InstallOptions,
  PackageManagerOptions
} from './types';

export class ToolInstaller {
  private toolsDir: string;
  private registry: RegistryClient;
  private resolver: VersionResolver;
  private manifestPath: string;

  constructor(options: PackageManagerOptions = {}) {
    this.toolsDir = options.toolsDir || path.join(process.env.HOME || '', '.clanker', 'tools');
    this.manifestPath = path.join(this.toolsDir, 'manifest.json');
    this.registry = new RegistryClient(options);
    this.resolver = new VersionResolver();
  }

  /**
   * Install a tool
   */
  async install(toolSpec: string, options: InstallOptions = {}): Promise<void> {
    const tool = this.parseToolSpec(toolSpec);
    
    debug.log(`[Installer] Installing ${tool.org}/${tool.name}${tool.version ? '@' + tool.version : ''}`);
    
    try {
      // Fetch tool metadata
      const metadata = await this.registry.fetchToolMetadata(tool);
      
      // Resolve version
      const version = this.resolver.resolveVersion(metadata, tool.version || 'latest');
      tool.version = version;
      
      // Check if already installed
      const manifest = await this.loadManifest();
      const existing = manifest.installedTools.find(t => 
        t.org === tool.org && t.name === tool.name
      );
      
      if (existing && existing.version === version && !options.force) {
        console.log(`✅ ${tool.org}/${tool.name}@${version} is already installed`);
        return;
      }
      
      // Check Clanker compatibility
      const versionInfo = metadata.versions[version];
      const clankerVersion = await this.getClankerVersion();
      if (!this.resolver.checkClankerCompatibility(versionInfo, clankerVersion)) {
        throw new Error(`This tool requires Clanker ${versionInfo.minClankerVersion} or higher (current: ${clankerVersion})`);
      }
      
      // Download the tool
      console.log(`📥 Downloading ${tool.org}/${tool.name}@${version}...`);
      const toolContent = await this.registry.downloadTool(tool, version);
      
      // Verify checksum if provided (skip if it's the example hash)
      if (versionInfo.sha256 && versionInfo.sha256 !== 'example-hash-will-be-computed') {
        const hash = crypto.createHash('sha256').update(toolContent).digest('hex');
        if (hash !== versionInfo.sha256) {
          throw new Error('Checksum verification failed');
        }
      }
      
      // Install to filesystem
      const installPath = await this.installToFilesystem(tool, version, toolContent);
      
      // Update manifest
      await this.updateManifest(tool, version, installPath);
      
      console.log(`✅ Successfully installed ${tool.org}/${tool.name}@${version}`);
      
      // Install dependencies if needed
      if (!options.skipDependencies && versionInfo.dependencies) {
        for (const [depName, depVersion] of Object.entries(versionInfo.dependencies)) {
          console.log(`📦 Installing dependency: ${depName}@${depVersion}`);
          await this.install(`${depName}@${depVersion}`, { ...options, skipDependencies: true });
        }
      }
    } catch (error) {
      console.error(`❌ Failed to install ${toolSpec}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Uninstall a tool
   */
  async uninstall(toolSpec: string): Promise<void> {
    const tool = this.parseToolSpec(toolSpec);
    
    debug.log(`[Installer] Uninstalling ${tool.org}/${tool.name}`);
    
    try {
      const manifest = await this.loadManifest();
      const installedIndex = manifest.installedTools.findIndex(t => 
        t.org === tool.org && t.name === tool.name
      );
      
      if (installedIndex === -1) {
        throw new Error(`Tool ${tool.org}/${tool.name} is not installed`);
      }
      
      const installed = manifest.installedTools[installedIndex];
      
      // Remove from filesystem
      const toolDir = path.dirname(installed.path);
      await fs.rm(toolDir, { recursive: true, force: true });
      
      // Update manifest
      manifest.installedTools.splice(installedIndex, 1);
      await this.saveManifest(manifest);
      
      console.log(`✅ Successfully uninstalled ${tool.org}/${tool.name}`);
    } catch (error) {
      console.error(`❌ Failed to uninstall ${toolSpec}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * List installed tools
   */
  async listInstalled(): Promise<InstalledTool[]> {
    const manifest = await this.loadManifest();
    return manifest.installedTools;
  }

  /**
   * Update a tool to the latest version
   */
  async update(toolSpec: string): Promise<void> {
    const tool = this.parseToolSpec(toolSpec);
    tool.version = 'latest';
    
    await this.install(`${tool.org}/${tool.name}@latest`, { force: true });
  }

  /**
   * Parse tool specification string
   */
  private parseToolSpec(spec: string): ToolIdentifier {
    // Support formats: "org/name", "org/name@version"
    const match = spec.match(/^([^/]+)\/([^@]+)(?:@(.+))?$/);
    
    if (!match) {
      throw new Error(`Invalid tool specification: ${spec}`);
    }
    
    return {
      org: match[1],
      name: match[2],
      version: match[3]
    };
  }

  /**
   * Install tool to filesystem
   */
  private async installToFilesystem(tool: ToolIdentifier, version: string, content: Buffer): Promise<string> {
    const toolDir = path.join(this.toolsDir, tool.org, tool.name, version);
    const toolFile = path.join(toolDir, 'index.js');
    
    // Create directory structure
    await fs.mkdir(toolDir, { recursive: true });
    
    // Write tool file
    await fs.writeFile(toolFile, content);
    
    // Update current symlink
    const currentLink = path.join(this.toolsDir, tool.org, tool.name, 'current');
    try {
      await fs.unlink(currentLink);
    } catch {
      // Ignore if doesn't exist
    }
    await fs.symlink(version, currentLink);
    
    return toolFile;
  }

  /**
   * Load manifest file
   */
  private async loadManifest(): Promise<ToolManifest> {
    try {
      const content = await fs.readFile(this.manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Return empty manifest if doesn't exist
      return {
        version: '1.0.0',
        installedTools: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Save manifest file
   */
  private async saveManifest(manifest: ToolManifest): Promise<void> {
    manifest.lastUpdated = new Date().toISOString();
    
    await fs.mkdir(path.dirname(this.manifestPath), { recursive: true });
    await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Update manifest with new tool
   */
  private async updateManifest(tool: ToolIdentifier, version: string, installPath: string): Promise<void> {
    const manifest = await this.loadManifest();
    
    // Remove existing entry if any
    const existingIndex = manifest.installedTools.findIndex(t => 
      t.org === tool.org && t.name === tool.name
    );
    
    if (existingIndex >= 0) {
      manifest.installedTools.splice(existingIndex, 1);
    }
    
    // Add new entry
    manifest.installedTools.push({
      org: tool.org,
      name: tool.name,
      version,
      installedAt: new Date().toISOString(),
      path: installPath
    });
    
    await this.saveManifest(manifest);
  }

  /**
   * Get current Clanker version
   */
  private async getClankerVersion(): Promise<string> {
    try {
      // In bundled environment, package.json is at the root
      const possiblePaths = [
        path.join(__dirname, 'package.json'),
        path.join(__dirname, '..', 'package.json'),
        path.join(__dirname, '..', '..', 'package.json'),
        path.join(process.cwd(), 'package.json')
      ];
      
      for (const packagePath of possiblePaths) {
        try {
          const content = await fs.readFile(packagePath, 'utf-8');
          const pkg = JSON.parse(content);
          if (pkg.name === '@ziggler/clanker') {
            return pkg.version;
          }
        } catch {
          // Try next path
        }
      }
      
      // Fallback to hardcoded version
      return '0.1.1';
    } catch {
      return '0.1.1';
    }
  }
}