/**
 * Search tool implementation using the new dynamic tool system
 * Provides unified search functionality for text and files
 */

import React from 'react';
import { Box, Text } from 'ink';
import {RipgrepSearch} from '../../utils/ripgrep-search';
import {createTool, ToolCategory, ToolCapability, validators, ExtractToolArgs} from '../../registry';
import * as path from 'path';
import * as fs from 'fs/promises';

// Tool state
let ripgrepSearch: RipgrepSearch;

// Type for search arguments
interface SearchArgs {
    query: string;
    search_type?: 'text' | 'files' | 'both';
    include_pattern?: string;
    exclude_pattern?: string;
    case_sensitive?: boolean;
    whole_word?: boolean;
    regex?: boolean;
    max_results?: number;
    file_types?: string[];
    include_hidden?: boolean;
}

const searchTool = createTool()
    .id('search')
    .name('Unified Search Tool')
    .description("Unified search tool for finding text content or files (similar to Cursor's search)")
    .category(ToolCategory.Search)
    .capabilities(ToolCapability.FileRead)
    .tags('search', 'find', 'grep', 'ripgrep', 'rg')

    // Arguments
    .stringArg('query', 'Text to search for or file name/path pattern', {required: true})
    .stringArg('search_type', 'Type of search: "text" for content search, "files" for file names, "both" for both', {
        default: 'both',
        enum: ['text', 'files', 'both']
    })
    .stringArg('include_pattern', 'Glob pattern for files to include (e.g. "*.ts", "*.js")')
    .stringArg('exclude_pattern', 'Glob pattern for files to exclude (e.g. "*.log", "node_modules")')
    .booleanArg('case_sensitive', 'Whether search should be case sensitive', {default: false})
    .booleanArg('whole_word', 'Whether to match whole words only', {default: false})
    .booleanArg('regex', 'Whether query is a regex pattern', {default: false})
    .numberArg('max_results', 'Maximum number of results to return', {
        default: 50,
        validate: validators.min(1)
    })
    .arrayArg('file_types', 'File types to search (e.g. ["js", "ts", "py"])')
    .booleanArg('include_hidden', 'Whether to include hidden files', {default: false})

    // Initialize
    .onInitialize(async (context) => {
        ripgrepSearch = new RipgrepSearch();
        context.logger?.info('Search tool initialized with RipgrepSearch');
    })

    // Execute
    .execute(async (args, context) => {
        let {
            query,
            search_type = 'both',
            include_pattern,
            exclude_pattern,
            case_sensitive = false,
            whole_word = false,
            regex = false,
            max_results = 50,
            file_types,
            include_hidden = false
        } = args as unknown as SearchArgs;

        // Parse special syntax: "search ~> *.py *.txt"
        // This means search for files matching these patterns
        if (query.includes('~>')) {
            const parts = query.split('~>').map(p => p.trim());
            if (parts.length === 2 && parts[0] === '') {
                // Format: "~> *.py *.txt"
                search_type = 'files';
                const patterns = parts[1].split(/\s+/).filter(p => p);
                if (patterns.length > 0) {
                    query = patterns[0];
                    // Convert multiple patterns to a single glob pattern
                    if (patterns.length > 1) {
                        query = `{${patterns.join(',')}}`;
                    }
                    regex = true; // Enable regex/glob matching
                }
            }
        }

        context.logger?.debug(`Searching for: ${query}`);
        context.logger?.debug(`Search type: ${search_type}`);
        context.logger?.debug(`Options: case_sensitive=${case_sensitive}, whole_word=${whole_word}, regex=${regex}`);

        try {
            const results: string[] = [];
            let totalMatches = 0;

            // Perform text search
            if (search_type === 'text' || search_type === 'both') {
                const textResults = await performTextSearch({
                    query: query,
                    case_sensitive: case_sensitive,
                    whole_word: whole_word,
                    regex: regex,
                    max_results: max_results,
                    file_types: file_types,
                    include_pattern: include_pattern,
                    exclude_pattern: exclude_pattern,
                    include_hidden: include_hidden
                });

                if (textResults.matches.length > 0) {
                    context.logger?.info(`Found ${textResults.matches.length} text matches`);
                    results.push('=== Text Search Results ===');
                    results.push(...textResults.formatted);
                    totalMatches += textResults.matches.length;
                }
            }

            // Perform file search
            if (search_type === 'files' || search_type === 'both') {
                const fileResults = await performFileSearch({
                    query: query,
                    case_sensitive: case_sensitive,
                    include_pattern: include_pattern,
                    exclude_pattern: exclude_pattern,
                    include_hidden: include_hidden,
                    max_results: Math.max(0, (max_results || 50) - totalMatches)
                });

                if (fileResults.length > 0) {
                    context.logger?.info(`Found ${fileResults.length} file matches`);
                    if (results.length > 0) results.push('');
                    results.push('=== File Search Results ===');
                    results.push(...fileResults);
                    totalMatches += fileResults.length;
                }
            }

            if (results.length === 0) {
                context.logger?.info(`No matches found for query: ${query}`);
                return {
                    success: true,
                    output: 'No matches found'
                };
            }

            // Add summary
            const summary = [`Found ${totalMatches} match${totalMatches === 1 ? '' : 'es'}`];
            if (totalMatches >= max_results) {
                summary.push(`(showing first ${max_results} results)`);
            }

            context.logger?.info(`Search completed: ${totalMatches} total matches`);
            return {
                success: true,
                output: [...summary, '', ...results].join('\n')
            };
        } catch (error) {
            context.logger?.error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Search failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })
    
    .renderResult(({ isExecuting, result, arguments: args }) => {
        if (isExecuting) {
            return <Text color="cyan">⎿ Searching for "{(args as any).query}"...</Text>;
        }
        
        if (!result?.success) {
            return <Text color="red">⎿ {result?.error || 'Search failed'}</Text>;
        }
        
        const data = result.data as any;
        const matchCount = data?.results?.length || 0;
        
        if (matchCount === 0) {
            return <Text color="gray">⎿ No matches found</Text>;
        }
        
        return (
            <Box flexDirection="column" marginLeft={2}>
                <Text color="gray">⎿ Found {matchCount} match{matchCount === 1 ? '' : 'es'}</Text>
                {data.results.slice(0, 5).map((match: any, i: number) => (
                    <Text key={i} color="cyan">⎿ {match.file}{match.line_number ? `:${match.line_number}` : ''}</Text>
                ))}
                {matchCount > 5 && (
                    <Text color="gray" italic>⎿ ... and {matchCount - 5} more</Text>
                )}
            </Box>
        );
    })
    
    .build();

export default searchTool;


/**
 * Perform text content search
 */
async function performTextSearch(options: {
    query: string;
    case_sensitive: boolean;
    whole_word: boolean;
    regex: boolean;
    max_results: number;
    file_types?: string[];
    include_pattern?: string;
    exclude_pattern?: string;
    include_hidden: boolean;
}): Promise<{
    matches: Array<{ file: string; line_number?: number; lineNumber?: number; line?: string; match?: string }>;
    formatted: string[]
}> {
    interface SearchMatch {
        file: string;
        line_number?: number;
        lineNumber?: number;
        line?: string;
        match?: string;
    }

    const searchOptions: Record<string, unknown> = {
        maxResults: options.max_results,
        caseSensitive: options.case_sensitive,
        wholeWord: options.whole_word,
        regex: options.regex,
        includeHidden: options.include_hidden
    };

    // Add file type filters
    if (options.file_types && options.file_types.length > 0) {
        searchOptions.fileTypes = options.file_types;
    }

    // Add include/exclude patterns
    if (options.include_pattern) {
        searchOptions.includes = [options.include_pattern];
    }

    if (options.exclude_pattern) {
        searchOptions.excludes = [options.exclude_pattern];
    }

    const results = await ripgrepSearch.search(options.query, searchOptions);

    // Format results
    const formatted: string[] = [];
    const groupedByFile = new Map<string, SearchMatch[]>();

    for (const match of results as SearchMatch[]) {
        if (!groupedByFile.has(match.file)) {
            groupedByFile.set(match.file, []);
        }
        groupedByFile.get(match.file)!.push(match);
    }

    for (const [file, matches] of groupedByFile) {
        formatted.push(`\n${file}:`);
        for (const match of matches) {
            const lineNum = match.line_number || match.lineNumber || '?';
            const text = match.line || match.match || '';
            formatted.push(`  ${lineNum}: ${text.trim()}`);
        }
    }

    return {matches: results as SearchMatch[], formatted};
}

/**
 * Perform file name/path search
 */
async function performFileSearch(options: {
    query: string;
    case_sensitive: boolean;
    include_pattern?: string;
    exclude_pattern?: string;
    include_hidden: boolean;
    max_results: number;
}): Promise<string[]> {
    const results: string[] = [];
    const isRegex = options.query.includes('*') || options.query.includes('?') || options.query.includes('{');
    const searchPattern = options.case_sensitive ? options.query : options.query.toLowerCase();

    // Walk directory tree
    async function walkDir(dir: string, depth: number = 0): Promise<void> {
        if (results.length >= options.max_results) return;
        if (depth > 20) return; // Prevent infinite recursion

        try {
            const entries = await fs.readdir(dir, {withFileTypes: true});

            for (const entry of entries) {
                if (results.length >= options.max_results) break;

                const fullPath = path.join(dir, entry.name);
                const relativePath = path.relative(process.cwd(), fullPath);

                // Skip hidden files/directories unless requested
                if (!options.include_hidden && entry.name.startsWith('.')) {
                    continue;
                }

                // Skip node_modules and other common excludes
                if (entry.name === 'node_modules' ||
                    entry.name === '.git' ||
                    entry.name === 'dist' ||
                    entry.name === 'build') {
                    continue;
                }

                // Check exclude pattern
                if (options.exclude_pattern && matchesGlob(relativePath, options.exclude_pattern)) {
                    continue;
                }

                // Check include pattern
                if (options.include_pattern && !matchesGlob(relativePath, options.include_pattern)) {
                    if (entry.isDirectory()) {
                        // Still traverse directories even if they don't match include
                        await walkDir(fullPath, depth + 1);
                    }
                    continue;
                }

                // Check if name matches query
                const nameToCheck = options.case_sensitive ? entry.name : entry.name.toLowerCase();
                const pathToCheck = options.case_sensitive ? relativePath : relativePath.toLowerCase();

                let matches = false;
                if (isRegex) {
                    // Use the original query for glob matching (not lowercased)
                    matches = matchesGlob(entry.name, options.query) || matchesGlob(relativePath, options.query);
                } else {
                    matches = nameToCheck.includes(searchPattern) || pathToCheck.includes(searchPattern);
                }

                if (matches) {
                    results.push(relativePath);
                }

                // Recurse into directories
                if (entry.isDirectory()) {
                    await walkDir(fullPath, depth + 1);
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
    }

    await walkDir(process.cwd());
    return results;
}

/**
 * Simple glob matching
 */
function matchesGlob(path: string, pattern: string): boolean {
    // Handle brace expansion like {*.py,*.txt}
    if (pattern.includes('{') && pattern.includes('}')) {
        const match = pattern.match(/\{([^}]+)\}/);
        if (match) {
            const alternatives = match[1].split(',');
            return alternatives.some(alt => {
                const expandedPattern = pattern.replace(match[0], alt);
                return matchesGlob(path, expandedPattern);
            });
        }
    }

    // Convert glob to regex
    let regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '§§§') // Temporary placeholder for **
        .replace(/\*/g, '[^/]*')  // * matches anything except /
        .replace(/§§§/g, '.*')    // ** matches anything including /
        .replace(/\?/g, '.');

    try {
        // For simple patterns like *.py, match just the filename
        if (!pattern.includes('/')) {
            const filename = path.split('/').pop() || path;
            return new RegExp(`^${regex}$`).test(filename);
        }
        // For path patterns, match the full path
        return new RegExp(`^${regex}$`).test(path);
    } catch {
        return false;
    }
}