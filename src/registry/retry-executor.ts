/**
 * Enhanced tool executor with retry logic and intelligent error correction
 */

import {ToolRegistry, ToolArguments} from './types';
import {ToolResult} from '../types';
import {debug} from '../utils/debug-logger';

interface RetryContext {
    toolName: string;
    originalArgs: ToolArguments;
    attempt: number;
    previousErrors: Array<{
        error: string;
        args: ToolArguments;
    }>;
}

/**
 * Analyze error and suggest argument corrections
 */
function analyzeErrorAndSuggestFix(error: string, args: ToolArguments, toolName: string): ToolArguments | null {
    const errorLower = error.toLowerCase();

    // Handle quoting issues in bash/input commands
    if ((toolName === 'bash' || toolName === 'input') &&
        (errorLower.includes('unexpected eof') || errorLower.includes('matching'))) {
        // Try to fix quoting issues
        if (args.command && typeof args.command === 'string') {
            // Escape single quotes properly
            const fixed = args.command.replace(/'/g, "'\"'\"'");
            return {...args, command: fixed};
        }
        if (args.prompt && typeof args.prompt === 'string') {
            // For input tool, escape quotes
            const fixed = args.prompt.replace(/"/g, '\\"').replace(/'/g, "\\'");
            return {...args, prompt: fixed};
        }
    }

    // Handle file not found errors
    if (errorLower.includes('no such file') || errorLower.includes('not found') ||
        errorLower.includes('does not exist')) {
        // For file operations, try different path variations
        if (args.path || args.file_path) {
            const originalPath = (args.path || args.file_path) as string;

            // Try without leading ./
            if (originalPath.startsWith('./')) {
                return {...args, path: originalPath.substring(2), file_path: originalPath.substring(2)};
            }

            // Try with ./ prefix
            if (!originalPath.startsWith('/') && !originalPath.startsWith('./')) {
                return {...args, path: './' + originalPath, file_path: './' + originalPath};
            }

            // Try with different extensions
            if (toolName === 'search' && args.query) {
                // If searching for a file, try different patterns
                const query = args.query as string;
                if (!query.includes('*')) {
                    return {...args, query: `*${query}*`};
                }
            }
        }
    }

    // Handle permission errors
    if (errorLower.includes('permission denied') || errorLower.includes('access denied')) {
        // For bash commands, try with sudo (but be careful)
        if (toolName === 'bash' && args.command && typeof args.command === 'string') {
            const cmd = args.command as string;
            if (!cmd.startsWith('sudo ')) {
                debug.warn('[RetryExecutor] Permission denied, but NOT auto-adding sudo for safety');
                // Don't auto-add sudo, but suggest it in the error
                return null;
            }
        }
    }

    // Handle argument type errors
    if (errorLower.includes('invalid argument') || errorLower.includes('type error')) {
        // Try to coerce types
        const newArgs = {...args};
        for (const [key, value] of Object.entries(newArgs)) {
            if (typeof value === 'string' && value.match(/^\d+$/)) {
                // Try converting string numbers to actual numbers
                newArgs[key] = parseInt(value, 10);
            }
        }
        return newArgs;
    }

    return null;
}

/**
 * Generate fallback suggestions after max retries
 */
function generateFallbackSuggestions(context: RetryContext): string {
    const {toolName, originalArgs, previousErrors} = context;
    const suggestions: string[] = [];

    // Analyze the pattern of errors
    const lastError = previousErrors[previousErrors.length - 1]?.error || '';

    const preamble = `After ${context.attempt} attempts, the last error was: "${lastError}, the original arguments were: ${JSON.stringify(originalArgs)}"`

    if (toolName === 'search') {
        suggestions.push(
            'Try using the list tool to explore the directory structure',
            'Use the bash tool with "find . -name \'*pattern*\'" for a broader search',
            'Check if the file has a different extension (e.g., .txt instead of .md)'
        );
    } else if (toolName === 'read_file' || toolName === 'view_file') {
        suggestions.push(
            'Use the list tool to verify the file exists in the expected location',
            'Try the pwd tool to confirm the current working directory',
            'Use bash with "ls -la" to see all files including hidden ones'
        );
    } else if (toolName === 'bash') {
        if (lastError.includes('command not found')) {
            suggestions.push(
                'Check if the command is installed with "which <command>"',
                'Try using the full path to the command',
                'Consider using an alternative command'
            );
        } else if (lastError.includes('permission')) {
            suggestions.push(
                'The command may require elevated permissions',
                'Try a different approach that doesn\'t require special permissions',
                'Check file ownership and permissions with "ls -la"'
            );
        }
    } else if (toolName === 'input') {
        suggestions.push(
            'The input dialog may not be supported in this environment',
            'Consider asking the user to provide the information directly in their message',
            'Try a simpler prompt without special characters'
        );
    }

    // General suggestions
    suggestions.push(
        'Review the error messages for clues about what went wrong',
        'Consider breaking down the task into smaller steps',
        'Ask the user for clarification or additional information'
    );

    return `${preamble}. Consider these alternative approaches:\n${suggestions.map(s => `- ${s}`).join('\n')}`;
}

/**
 * Create an enhanced tool executor with retry logic
 */
export function createRetryToolExecutor(registry: ToolRegistry) {
    return async (toolName: string, args: ToolArguments, maxRetries: number = 5): Promise<ToolResult> => {
        const context: RetryContext = {
            toolName,
            originalArgs: args,
            attempt: 0,
            previousErrors: []
        };

        let currentArgs = args;

        while (context.attempt < maxRetries) {
            context.attempt++;
            debug.log(`[RetryExecutor] Attempt ${context.attempt} for ${toolName}`);

            try {
                const result = await registry.execute(toolName, currentArgs);

                if (result.success) {
                    if (context.attempt > 1) {
                        debug.log(`[RetryExecutor] Succeeded on attempt ${context.attempt}`);
                    }
                    return result;
                }

                // Tool executed but returned an error
                const error = result.error || 'Unknown error';
                context.previousErrors.push({error, args: currentArgs});

                debug.warn(`[RetryExecutor] Tool ${toolName} failed: ${error}`);

                // Try to fix the error
                const fixedArgs = analyzeErrorAndSuggestFix(error, currentArgs, toolName);

                if (fixedArgs && context.attempt < maxRetries) {
                    debug.log(`[RetryExecutor] Attempting to fix error with modified arguments`);
                    currentArgs = fixedArgs;
                    continue;
                }

                // Can't fix automatically, but still have retries
                if (context.attempt < maxRetries) {
                    debug.log(`[RetryExecutor] No automatic fix available, retrying with original args`);
                    currentArgs = args;
                    continue;
                }

                // Max retries reached
                const fallbackMsg = generateFallbackSuggestions(context);
                return {
                    success: false,
                    error: `${error}\n\n${fallbackMsg}`,
                    data: {
                        attempts: context.attempt,
                        errors: context.previousErrors
                    }
                };

            } catch (error) {
                // Unexpected error during execution
                const errorMsg = error instanceof Error ? error.message : String(error);
                context.previousErrors.push({error: errorMsg, args: currentArgs});

                debug.error(`[RetryExecutor] Unexpected error: ${errorMsg}`);

                if (context.attempt >= maxRetries) {
                    const fallbackMsg = generateFallbackSuggestions(context);
                    return {
                        success: false,
                        error: `Execution failed: ${errorMsg}\n\n${fallbackMsg}`,
                        data: {
                            attempts: context.attempt,
                            errors: context.previousErrors
                        }
                    };
                }
            }
        }

        // Should not reach here, but just in case
        return {
            success: false,
            error: 'Max retries exceeded',
            data: {
                attempts: context.attempt,
                errors: context.previousErrors
            }
        };
    };
}

/**
 * Try to fix malformed JSON
 */
function tryFixJson(jsonString: string): string | null {
    // Remove trailing non-JSON characters after the last }
    let cleaned = jsonString.replace(/\}[^}]*$/, '}');
    
    // Try to extract JSON object from string
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0];
    }
    
    // If it's just whitespace, return empty object
    if (!cleaned.trim()) {
        return '{}';
    }
    
    return null;
}

/**
 * Wrapper for the standard createToolExecutor that adds retry logic
 */
export function createToolExecutorWithRetry(registry: ToolRegistry) {
    const retryExecutor = createRetryToolExecutor(registry);

    return async (toolName: string, args: unknown): Promise<ToolResult> => {
        // Parse arguments if they come as a string
        let parsedArgs = args;
        if (typeof args === 'string') {
            try {
                parsedArgs = JSON.parse(args);
            } catch (error) {
                // Try to fix common JSON errors
                const fixed = tryFixJson(args as string);
                if (fixed) {
                    try {
                        parsedArgs = JSON.parse(fixed);
                    } catch {
                        // If still fails, check if tool accepts no arguments
                        const tool = registry.get(toolName);
                        if (tool && (!tool.definition.arguments || tool.definition.arguments.length === 0)) {
                            parsedArgs = {};
                        } else {
                            parsedArgs = {input: args};
                        }
                    }
                } else {
                    parsedArgs = {input: args};
                }
            }
        }

        // Use retry executor with default 5 retries
        return retryExecutor(toolName, parsedArgs as ToolArguments, 5);
    };
}