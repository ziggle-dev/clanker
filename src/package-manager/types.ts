/**
 * Types for the Clanker tool package manager
 */

export interface ToolPackageMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  versions: Record<string, VersionInfo>;
  latest: string;
  tags?: string[];
  homepage?: string;
  repository?: string;
}

export interface VersionInfo {
  date: string;
  dependencies?: Record<string, string>;
  minClankerVersion?: string;
  sha256?: string;
  size?: number;
}

export interface InstalledTool {
  org: string;
  name: string;
  version: string;
  installedAt: string;
  path: string;
}

export interface ToolManifest {
  version: string;
  installedTools: InstalledTool[];
  lastUpdated: string;
}

export interface ToolRegistry {
  version: string;
  tools: ToolRegistryEntry[];
  lastUpdated: string;
}

export interface ToolRegistryEntry {
  org: string;
  name: string;
  description: string;
  latest: string;
  downloads?: number;
  stars?: number;
}

export interface PackageManagerOptions {
  toolsDir?: string;
  registryUrl?: string;
  cacheDir?: string;
  timeout?: number;
}

export interface InstallOptions {
  force?: boolean;
  skipDependencies?: boolean;
}

export interface SearchOptions {
  limit?: number;
  sortBy?: 'name' | 'downloads' | 'stars' | 'updated';
}

export type ToolIdentifier = {
  org: string;
  name: string;
  version?: string;
};

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}