/**
 * Version resolver for tool dependencies and version constraints
 */

import { ToolPackageMetadata, VersionInfo } from './types';

export class VersionResolver {
  /**
   * Parse a version string (e.g., "1.2.3", "latest", "^1.2.0")
   */
  parseVersionSpec(spec: string): { 
    type: 'exact' | 'latest' | 'range';
    value: string;
  } {
    if (spec === 'latest') {
      return { type: 'latest', value: 'latest' };
    }
    
    if (spec.startsWith('^') || spec.startsWith('~') || spec.includes('*')) {
      return { type: 'range', value: spec };
    }
    
    return { type: 'exact', value: spec };
  }

  /**
   * Resolve a version spec to an exact version
   */
  resolveVersion(metadata: ToolPackageMetadata, spec: string): string {
    const parsed = this.parseVersionSpec(spec);
    
    switch (parsed.type) {
      case 'latest':
        return metadata.latest;
        
      case 'exact':
        if (!metadata.versions[parsed.value]) {
          throw new Error(`Version ${parsed.value} not found for ${metadata.id}`);
        }
        return parsed.value;
        
      case 'range':
        return this.resolveVersionRange(metadata, parsed.value);
    }
  }

  /**
   * Resolve a version range to the best matching version
   */
  private resolveVersionRange(metadata: ToolPackageMetadata, range: string): string {
    const versions = Object.keys(metadata.versions);
    
    // Sort versions in descending order
    const sortedVersions = versions.sort((a, b) => 
      this.compareVersions(b, a)
    );
    
    // For now, implement simple range matching
    if (range.startsWith('^')) {
      // Compatible with version (same major)
      const baseVersion = range.substring(1);
      const [major] = baseVersion.split('.');
      
      for (const version of sortedVersions) {
        if (version.startsWith(major + '.')) {
          return version;
        }
      }
    } else if (range.startsWith('~')) {
      // Approximately equivalent (same major.minor)
      const baseVersion = range.substring(1);
      const [major, minor] = baseVersion.split('.');
      
      for (const version of sortedVersions) {
        if (version.startsWith(`${major}.${minor}.`)) {
          return version;
        }
      }
    }
    
    // Fallback to latest
    return metadata.latest;
  }

  /**
   * Compare two version strings
   */
  compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    
    return 0;
  }

  /**
   * Check if a version satisfies a constraint
   */
  satisfiesVersion(version: string, constraint: string): boolean {
    const parsed = this.parseVersionSpec(constraint);
    
    switch (parsed.type) {
      case 'exact':
        return version === parsed.value;
        
      case 'latest':
        return true; // Any version satisfies "latest"
        
      case 'range':
        return this.versionInRange(version, parsed.value);
    }
  }

  /**
   * Check if a version is within a range
   */
  private versionInRange(version: string, range: string): boolean {
    if (range.startsWith('^')) {
      const baseVersion = range.substring(1);
      const [baseMajor] = baseVersion.split('.');
      const [versionMajor] = version.split('.');
      return baseMajor === versionMajor && this.compareVersions(version, baseVersion) >= 0;
    }
    
    if (range.startsWith('~')) {
      const baseVersion = range.substring(1);
      const [baseMajor, baseMinor] = baseVersion.split('.');
      const [versionMajor, versionMinor] = version.split('.');
      return baseMajor === versionMajor && 
             baseMinor === versionMinor && 
             this.compareVersions(version, baseVersion) >= 0;
    }
    
    return false;
  }

  /**
   * Check Clanker version compatibility
   */
  checkClankerCompatibility(versionInfo: VersionInfo, currentClankerVersion: string): boolean {
    if (!versionInfo.minClankerVersion) {
      return true;
    }
    
    return this.compareVersions(currentClankerVersion, versionInfo.minClankerVersion) >= 0;
  }
}