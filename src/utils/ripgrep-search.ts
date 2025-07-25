/**
 * Ripgrep search utility wrapper
 */

import { spawn } from 'child_process';
import { debug } from '../utils/debug-logger';

export interface RipgrepSearchOptions {
  maxResults?: number;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  fileTypes?: string[];
  includes?: string[];
  excludes?: string[];
  includeHidden?: boolean;
}

export interface RipgrepSearchResult {
  file: string;
  line_number?: number;
  lineNumber?: number;
  line?: string;
  match?: string;
}

export class RipgrepSearch {
  async search(query: string, options: RipgrepSearchOptions = {}): Promise<RipgrepSearchResult[]> {
    const args: string[] = [];
    
    // Basic options
    if (!options.caseSensitive) args.push('-i');
    if (options.wholeWord) args.push('-w');
    if (!options.regex) args.push('-F'); // Fixed string search
    if (options.includeHidden) args.push('--hidden');
    
    // File type filters
    if (options.fileTypes && options.fileTypes.length > 0) {
      options.fileTypes.forEach(type => {
        args.push('-t', type);
      });
    }
    
    // Include patterns
    if (options.includes && options.includes.length > 0) {
      options.includes.forEach(pattern => {
        args.push('--glob', pattern);
      });
    }
    
    // Exclude patterns
    if (options.excludes && options.excludes.length > 0) {
      options.excludes.forEach(pattern => {
        args.push('--glob', `!${pattern}`);
      });
    }
    
    // Max results
    if (options.maxResults) {
      args.push('-m', options.maxResults.toString());
    }
    
    // Output format
    args.push('--json');
    
    // Query and path
    args.push(query);
    args.push('.');
    
    return new Promise((resolve, reject) => {
      const results: RipgrepSearchResult[] = [];
      const rg = spawn('rg', args, { cwd: process.cwd() });
      
      let buffer = '';
      
      rg.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'match') {
                results.push({
                  file: parsed.data.path.text,
                  line_number: parsed.data.line_number,
                  lineNumber: parsed.data.line_number,
                  line: parsed.data.lines.text,
                  match: parsed.data.lines.text
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      });
      
      rg.stderr.on('data', (data) => {
        debug.error('ripgrep error:', data.toString());
      });
      
      rg.on('close', (code) => {
        if (code === 0 || code === 1) { // 1 = no matches found
          resolve(results.slice(0, options.maxResults));
        } else {
          reject(new Error(`ripgrep exited with code ${code}`));
        }
      });
      
      rg.on('error', (err) => {
        reject(new Error(`Failed to start ripgrep: ${err.message}`));
      });
    });
  }
}