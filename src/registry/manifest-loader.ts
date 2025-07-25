/**
 * Manifest-based tool loader for built-in tools
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ToolDefinition } from './types';
import { debug } from '../utils/debug-logger';

interface ToolManifest {
  version: string;
  generated: string;
  tools: Array<{
    id: string;
    module: string;
  }>;
}

export async function loadBuiltInToolsFromManifest(): Promise<ToolDefinition[]> {
  const tools: ToolDefinition[] = [];
  
  try {
    // Determine the base directory
    let baseDir: string;
    
    // Check if we're in a bundled environment
    if (typeof __dirname !== 'undefined') {
      // CommonJS environment
      baseDir = __dirname;
    } else if (typeof import.meta.url !== 'undefined') {
      // ES module environment
      const __filename = fileURLToPath(import.meta.url);
      baseDir = path.dirname(__filename);
    } else {
      // Fallback
      baseDir = process.cwd();
    }
    
    // Look for manifest in dist directory
    // In bundled environment, we're in dist/index.js, so manifest is in same directory
    // In dev environment, we're in src/registry/, so go up to find dist/
    let manifestPath = path.join(baseDir, 'tool-manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      // Try going up from registry folder (dev environment)
      manifestPath = path.join(baseDir, '..', '..', 'dist', 'tool-manifest.json');
    }
    
    debug.log(`[ManifestLoader] Looking for manifest at: ${manifestPath}`);
    
    if (!fs.existsSync(manifestPath)) {
      debug.warn('[ManifestLoader] No tool manifest found, falling back to static imports');
      // Fall back to using the static builtin-tools.ts
      const { builtInTools } = await import('./builtin-tools');
      return builtInTools;
    }
    
    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest: ToolManifest = JSON.parse(manifestContent);
    
    debug.log(`[ManifestLoader] Found manifest with ${manifest.tools.length} tools`);
    
    // Load each tool from the manifest
    for (const toolInfo of manifest.tools) {
      try {
        // In bundled environment, modules are relative to dist/
        // In dev environment, they're relative to dist/ as well
        const modulePath = path.isAbsolute(toolInfo.module) 
          ? toolInfo.module 
          : path.join(path.dirname(manifestPath), toolInfo.module);
        debug.log(`[ManifestLoader] Loading tool ${toolInfo.id} from ${modulePath}`);
        
        // Dynamic import
        const module = await import(modulePath);
        const tool = module.default || module;
        
        if (isValidTool(tool)) {
          tools.push(tool);
          debug.log(`[ManifestLoader] Successfully loaded tool: ${tool.id}`);
        } else {
          debug.warn(`[ManifestLoader] Invalid tool in ${modulePath}`);
        }
      } catch (error) {
        debug.error(`[ManifestLoader] Failed to load tool ${toolInfo.id}:`, error);
      }
    }
    
    debug.log(`[ManifestLoader] Loaded ${tools.length} tools from manifest`);
    return tools;
    
  } catch (error) {
    debug.error('[ManifestLoader] Error loading manifest:', error);
    // Fall back to static imports
    const { builtInTools } = await import('./builtin-tools');
    return builtInTools;
  }
}

function isValidTool(obj: any): obj is ToolDefinition {
  return obj && 
         typeof obj === 'object' &&
         typeof obj.id === 'string' &&
         typeof obj.description === 'string' &&
         typeof obj.execute === 'function';
}