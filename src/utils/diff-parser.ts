/**
 * Diff parser for multiple formats
 * Supports unified diff, marker-based diffs, and custom formats
 */

export interface DiffBlock {
    search: string;
    replace: string;
    format: 'literal' | 'unified' | 'markers' | 'multi-line';
    lineContext?: number;
    metadata?: {
        startLine?: number;
        endLine?: number;
        file?: string;
    };
}

export interface ParseResult {
    blocks: DiffBlock[];
    format: string;
    errors: string[];
}

export class DiffParser {
    /**
     * Auto-detect format and parse diff content
     */
    autoDetectFormat(content: string): ParseResult {
        // Try different parsers in order of specificity
        
        // Check for unified diff format
        if (this.isUnifiedDiff(content)) {
            return this.parseUnified(content);
        }
        
        // Check for triple markers (>>>...<<<)
        if (content.includes('>>>') && content.includes('<<<')) {
            return this.parseTripleMarkers(content);
        }
        
        // Check for dash markers (---...+++)
        if (this.hasDashMarkers(content)) {
            return this.parseDashMarkers(content);
        }
        
        // Check for multi-block format
        if (this.isMultiBlockFormat(content)) {
            return this.parseMultiBlock(content);
        }
        
        // Default to literal format
        return {
            blocks: [{
                search: content,
                replace: '',
                format: 'literal'
            }],
            format: 'literal',
            errors: ['No recognized diff format found, treating as literal']
        };
    }
    
    /**
     * Parse unified diff format
     */
    parseUnified(content: string): ParseResult {
        const blocks: DiffBlock[] = [];
        const errors: string[] = [];
        
        const lines = content.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            // Look for @@ markers
            if (lines[i].startsWith('@@')) {
                const hunkHeader = lines[i];
                const match = hunkHeader.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
                
                if (match) {
                    const oldStart = parseInt(match[1]);
                    const newStart = parseInt(match[3]);
                    
                    const searchLines: string[] = [];
                    const replaceLines: string[] = [];
                    
                    i++;
                    while (i < lines.length && !lines[i].startsWith('@@')) {
                        if (lines[i].startsWith('-')) {
                            searchLines.push(lines[i].substring(1));
                        } else if (lines[i].startsWith('+')) {
                            replaceLines.push(lines[i].substring(1));
                        } else if (lines[i].startsWith(' ')) {
                            // Context line - add to both
                            searchLines.push(lines[i].substring(1));
                            replaceLines.push(lines[i].substring(1));
                        }
                        i++;
                    }
                    
                    blocks.push({
                        search: searchLines.join('\n'),
                        replace: replaceLines.join('\n'),
                        format: 'unified',
                        metadata: {
                            startLine: oldStart
                        }
                    });
                    continue;
                }
            }
            i++;
        }
        
        return { blocks, format: 'unified', errors };
    }
    
    /**
     * Parse triple marker format (>>> ... <<<)
     */
    parseTripleMarkers(content: string): ParseResult {
        const blocks: DiffBlock[] = [];
        const errors: string[] = [];
        
        // Regular expression to match >>> old <<< === new >>>
        const blockRegex = />>>\s*([\s\S]*?)\s*<<<\s*===\s*([\s\S]*?)\s*>>>/g;
        let match;
        
        while ((match = blockRegex.exec(content)) !== null) {
            blocks.push({
                search: match[1].trim(),
                replace: match[2].trim(),
                format: 'markers'
            });
        }
        
        // Also try simpler format: >>> old <<< new >>>
        const simpleRegex = />>>\s*([\s\S]*?)\s*<<<\s*([\s\S]*?)\s*>>>/g;
        let simpleMatch;
        
        if (blocks.length === 0) {
            while ((simpleMatch = simpleRegex.exec(content)) !== null) {
                blocks.push({
                    search: simpleMatch[1].trim(),
                    replace: simpleMatch[2].trim(),
                    format: 'markers'
                });
            }
        }
        
        if (blocks.length === 0) {
            errors.push('No valid triple marker blocks found');
        }
        
        return { blocks, format: 'markers', errors };
    }
    
    /**
     * Parse dash marker format (--- old +++ new)
     */
    parseDashMarkers(content: string): ParseResult {
        const blocks: DiffBlock[] = [];
        const errors: string[] = [];
        
        const lines = content.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            if (lines[i].startsWith('---') && i + 1 < lines.length) {
                const searchLines: string[] = [];
                const replaceLines: string[] = [];
                
                // Skip the --- line
                i++;
                
                // Collect old content
                while (i < lines.length && !lines[i].startsWith('+++')) {
                    searchLines.push(lines[i]);
                    i++;
                }
                
                if (i < lines.length && lines[i].startsWith('+++')) {
                    // Skip the +++ line
                    i++;
                    
                    // Collect new content
                    while (i < lines.length && !lines[i].startsWith('---')) {
                        replaceLines.push(lines[i]);
                        i++;
                    }
                    
                    blocks.push({
                        search: searchLines.join('\n').trim(),
                        replace: replaceLines.join('\n').trim(),
                        format: 'markers'
                    });
                    continue;
                }
            }
            i++;
        }
        
        return { blocks, format: 'markers', errors };
    }
    
    /**
     * Parse multi-block format with explicit separators
     */
    parseMultiBlock(content: string): ParseResult {
        const blocks: DiffBlock[] = [];
        const errors: string[] = [];
        
        // Look for numbered blocks like:
        // 1. Search:
        // ...
        // Replace:
        // ...
        const blockRegex = /\d+\.\s*Search:\s*([\s\S]*?)\s*Replace:\s*([\s\S]*?)(?=\d+\.\s*Search:|$)/g;
        let match;
        
        while ((match = blockRegex.exec(content)) !== null) {
            blocks.push({
                search: match[1].trim(),
                replace: match[2].trim(),
                format: 'multi-line'
            });
        }
        
        // Also try SEARCH/REPLACE blocks
        const capsRegex = /SEARCH:\s*([\s\S]*?)\s*REPLACE:\s*([\s\S]*?)(?=SEARCH:|$)/gi;
        let capsMatch;
        
        if (blocks.length === 0) {
            while ((capsMatch = capsRegex.exec(content)) !== null) {
                blocks.push({
                    search: capsMatch[1].trim(),
                    replace: capsMatch[2].trim(),
                    format: 'multi-line'
                });
            }
        }
        
        return { blocks, format: 'multi-line', errors };
    }
    
    /**
     * Check if content looks like unified diff
     */
    private isUnifiedDiff(content: string): boolean {
        return content.includes('@@') && 
               (content.includes('---') || content.includes('+++'));
    }
    
    /**
     * Check if content has dash markers
     */
    private hasDashMarkers(content: string): boolean {
        const lines = content.split('\n');
        let hasOld = false;
        let hasNew = false;
        
        for (const line of lines) {
            if (line.startsWith('---')) hasOld = true;
            if (line.startsWith('+++')) hasNew = true;
        }
        
        return hasOld && hasNew;
    }
    
    /**
     * Check if content looks like multi-block format
     */
    private isMultiBlockFormat(content: string): boolean {
        return /\d+\.\s*(Search|SEARCH):/i.test(content) ||
               /SEARCH:\s*[\s\S]*?\s*REPLACE:/i.test(content);
    }
    
    /**
     * Validate diff blocks
     */
    validateBlocks(blocks: DiffBlock[]): string[] {
        const errors: string[] = [];
        
        blocks.forEach((block, index) => {
            if (!block.search) {
                errors.push(`Block ${index + 1}: Search content is empty`);
            }
            if (block.search === block.replace) {
                errors.push(`Block ${index + 1}: Search and replace are identical`);
            }
        });
        
        return errors;
    }
}

// Export singleton instance
export const diffParser = new DiffParser();