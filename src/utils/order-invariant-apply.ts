/**
 * Order-invariant diff application
 * Applies multiple search-and-replace operations in any order
 */

import { DiffBlock } from './diff-parser';

export interface Match {
    start: number;
    end: number;
    block: DiffBlock;
    content: string;
}

export interface ApplyResult {
    success: boolean;
    content?: string;
    original: string;
    applied: DiffBlock[];
    failed: DiffBlock[];
    conflicts: DiffBlock[][];
    stats: {
        totalBlocks: number;
        appliedCount: number;
        failedCount: number;
        conflictCount: number;
    };
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export class OrderInvariantApplicator {
    /**
     * Apply multiple diff blocks to content in an order-invariant way
     */
    apply(content: string, blocks: DiffBlock[]): ApplyResult {
        const result: ApplyResult = {
            success: false,
            original: content,
            applied: [],
            failed: [],
            conflicts: [],
            stats: {
                totalBlocks: blocks.length,
                appliedCount: 0,
                failedCount: 0,
                conflictCount: 0
            }
        };
        
        if (blocks.length === 0) {
            result.success = true;
            result.content = content;
            return result;
        }
        
        // Find all matches first
        const allMatches = this.findAllMatches(content, blocks);
        
        // Detect conflicts
        const conflicts = this.detectConflicts(allMatches);
        result.conflicts = conflicts.map(matches => matches.map(m => m.block));
        result.stats.conflictCount = conflicts.length;
        
        // Filter out conflicting matches
        const conflictingMatches = new Set<Match>();
        conflicts.forEach(group => group.forEach(match => conflictingMatches.add(match)));
        
        const validMatches = allMatches.filter(m => !conflictingMatches.has(m));
        
        // Separate blocks with empty search (append operations)
        const appendBlocks = blocks.filter(b => !b.search);
        const searchBlocks = blocks.filter(b => b.search);
        
        // Group failed blocks (only for non-append blocks)
        const matchedBlocks = new Set(validMatches.map(m => m.block));
        result.failed = searchBlocks.filter(b => !matchedBlocks.has(b));
        result.stats.failedCount = result.failed.length;
        
        // Sort matches by position (reverse order for correct application)
        validMatches.sort((a, b) => b.start - a.start);
        
        // Apply replacements
        let newContent = content;
        for (const match of validMatches) {
            const before = newContent.substring(0, match.start);
            const after = newContent.substring(match.end);
            newContent = before + match.block.replace + after;
            result.applied.push(match.block);
        }
        
        // Apply append operations
        for (const block of appendBlocks) {
            newContent += block.replace;
            result.applied.push(block);
        }
        
        result.content = newContent;
        result.stats.appliedCount = result.applied.length;
        result.success = result.stats.failedCount === 0 && result.stats.conflictCount === 0;
        
        return result;
    }
    
    /**
     * Find all matches for all blocks
     */
    private findAllMatches(content: string, blocks: DiffBlock[]): Match[] {
        const matches: Match[] = [];
        
        for (const block of blocks) {
            const blockMatches = this.findMatches(content, block);
            matches.push(...blockMatches);
        }
        
        return matches;
    }
    
    /**
     * Find all matches for a single block
     */
    private findMatches(content: string, block: DiffBlock): Match[] {
        const matches: Match[] = [];
        const searchStr = block.search;
        
        if (!searchStr) return matches;
        
        // Try exact matching first
        let index = content.indexOf(searchStr);
        while (index !== -1) {
            matches.push({
                start: index,
                end: index + searchStr.length,
                block: block,
                content: searchStr
            });
            index = content.indexOf(searchStr, index + 1);
        }
        
        // If no exact matches and it's multi-line, try normalized matching
        if (matches.length === 0 && searchStr.includes('\n')) {
            const normalizedSearch = this.normalizeWhitespace(searchStr);
            const normalizedContent = this.normalizeWhitespace(content);
            
            let normIndex = normalizedContent.indexOf(normalizedSearch);
            while (normIndex !== -1) {
                // Map back to original positions
                const originalMatch = this.mapNormalizedMatch(
                    content, 
                    normalizedContent, 
                    normIndex, 
                    normalizedSearch.length
                );
                
                if (originalMatch) {
                    matches.push({
                        start: originalMatch.start,
                        end: originalMatch.end,
                        block: block,
                        content: content.substring(originalMatch.start, originalMatch.end)
                    });
                }
                
                normIndex = normalizedContent.indexOf(normalizedSearch, normIndex + 1);
            }
        }
        
        return matches;
    }
    
    /**
     * Normalize whitespace for fuzzy matching
     */
    private normalizeWhitespace(text: string): string {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ')
            .replace(/\s+/g, ' ');
    }
    
    /**
     * Map normalized match back to original positions
     */
    private mapNormalizedMatch(
        original: string, 
        normalized: string, 
        normStart: number, 
        normLength: number
    ): { start: number; end: number } | null {
        // Build mapping from normalized to original positions
        let origIndex = 0;
        let normIndex = 0;
        const mapping: number[] = [];
        
        while (origIndex < original.length && normIndex < normalized.length) {
            // Skip whitespace in original
            while (origIndex < original.length && /\s/.test(original[origIndex])) {
                origIndex++;
            }
            
            if (origIndex < original.length) {
                mapping[normIndex] = origIndex;
                origIndex++;
                normIndex++;
            }
        }
        
        if (normStart >= mapping.length || normStart + normLength > mapping.length) {
            return null;
        }
        
        const start = mapping[normStart];
        let end = origIndex; // Default to end of string
        
        // Find the actual end position
        if (normStart + normLength < mapping.length) {
            end = mapping[normStart + normLength];
        } else {
            // Find the last mapped position and search forward
            const lastMapped = mapping[mapping.length - 1];
            end = original.length;
            
            // Try to find a more accurate end
            for (let i = lastMapped; i < original.length; i++) {
                if (this.normalizeWhitespace(original.substring(start, i)).length >= normLength) {
                    end = i;
                    break;
                }
            }
        }
        
        return { start, end };
    }
    
    /**
     * Detect overlapping/conflicting matches
     */
    private detectConflicts(matches: Match[]): Match[][] {
        const conflicts: Match[][] = [];
        const processed = new Set<Match>();
        
        for (let i = 0; i < matches.length; i++) {
            if (processed.has(matches[i])) continue;
            
            const conflictGroup: Match[] = [matches[i]];
            processed.add(matches[i]);
            
            for (let j = i + 1; j < matches.length; j++) {
                if (processed.has(matches[j])) continue;
                
                if (this.overlaps(matches[i], matches[j])) {
                    conflictGroup.push(matches[j]);
                    processed.add(matches[j]);
                }
            }
            
            if (conflictGroup.length > 1) {
                conflicts.push(conflictGroup);
            }
        }
        
        return conflicts;
    }
    
    /**
     * Check if two matches overlap
     */
    private overlaps(a: Match, b: Match): boolean {
        return !(a.end <= b.start || b.end <= a.start);
    }
    
    /**
     * Validate blocks before applying
     */
    validateBlocks(content: string, blocks: DiffBlock[]): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Check for empty blocks (but allow empty search for appending)
        blocks.forEach((block, i) => {
            // Empty search is allowed for appending
            if (!block.search && !block.replace) {
                errors.push(`Block ${i + 1}: Both search and replace are empty`);
            }
            if (block.search === block.replace) {
                warnings.push(`Block ${i + 1}: Search and replace are identical`);
            }
        });
        
        // Find all matches
        const matches = this.findAllMatches(content, blocks);
        
        // Check for blocks with no matches (but allow empty search for appending)
        const matchedBlocks = new Set(matches.map(m => m.block));
        blocks.forEach((block, i) => {
            if (!matchedBlocks.has(block) && block.search) {
                // Only error if search is non-empty and not found
                errors.push(`Block ${i + 1}: No matches found for "${block.search.substring(0, 50)}${block.search.length > 50 ? '...' : ''}"`);
            }
        });
        
        // Check for conflicts
        const conflicts = this.detectConflicts(matches);
        if (conflicts.length > 0) {
            warnings.push(`Found ${conflicts.length} conflicting replacement groups`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Get detailed match information for debugging
     */
    getMatchDetails(content: string, blocks: DiffBlock[]): {
        matches: Match[];
        conflicts: Match[][];
        unmatchedBlocks: DiffBlock[];
    } {
        const matches = this.findAllMatches(content, blocks);
        const conflicts = this.detectConflicts(matches);
        const matchedBlocks = new Set(matches.map(m => m.block));
        const unmatchedBlocks = blocks.filter(b => !matchedBlocks.has(b));
        
        return {
            matches,
            conflicts,
            unmatchedBlocks
        };
    }
}

// Export singleton instance
export const orderInvariantApplicator = new OrderInvariantApplicator();