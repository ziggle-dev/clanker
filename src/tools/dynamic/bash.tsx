/**
 * Bash tool implementation using the new dynamic tool system
 */

import React from 'react';
import {Text} from 'ink';
import {exec} from 'child_process';
import {promisify} from 'util';
import {createTool, ToolCategory, ToolCapability, ExtractToolArgs} from '../../registry';
import {ConfirmationService} from '../../utils/confirmation-service';
import {CompactOutput, ToolOutput} from '../../ui/components/tool-output';
import {CodeBlock} from '../../ui/components/code-block';

const execAsync = promisify(exec);

// Tool state
let currentDirectory: string = process.cwd();
let confirmationService: ConfirmationService;

const bashTool = createTool()
    .id('bash')
    .name('Bash Command Executor')
    .description('Execute a bash command')
    .category(ToolCategory.System)
    .capabilities(ToolCapability.SystemExecute, ToolCapability.UserConfirmation)
    .tags('bash', 'shell', 'command', 'system')

    // Arguments
    .stringArg('command', 'The bash command to execute', {required: true})
    .numberArg('timeout', 'Command timeout in milliseconds', {
        default: 30000,
        validate: (value) => value > 0 || 'Timeout must be positive'
    })

    // Initialize
    .onInitialize(async (context) => {
        confirmationService = ConfirmationService.getInstance();
        currentDirectory = context.workingDirectory || process.cwd();
    })

    // Execute
    .execute(async (args, context) => {
        const {command, timeout} = args as {
            command: string;
            timeout: number;
        };

        context.logger?.debug(`Executing bash command: ${command}`);
        context.logger?.debug(`Working directory: ${currentDirectory}`);
        context.logger?.debug(`Timeout: ${timeout}ms`);

        try {
            // Check if user has already accepted bash commands for this session
            const sessionFlags = confirmationService.getSessionFlags();
            if (!sessionFlags.bashCommands && !sessionFlags.allOperations) {
                // Request confirmation showing the command
                const confirmationResult = await confirmationService.requestConfirmation({
                    operation: 'Run bash command',
                    filename: command,
                    content: `Command: ${command}\nWorking directory: ${currentDirectory}`
                }, 'bash');

                if (!confirmationResult.confirmed) {
                    context.logger?.info(`Command execution cancelled by user`);
                    return {
                        success: false,
                        error: confirmationResult.feedback || 'Command execution cancelled by user'
                    };
                }
            }

            // Handle cd command specially
            if (command.startsWith('cd ')) {
                const newDir = command.substring(3).trim();
                try {
                    process.chdir(newDir);
                    currentDirectory = process.cwd();

                    // Update context working directory
                    if (context.registry && typeof context.registry === 'object' && 'setWorkingDirectory' in context.registry) {
                        const registryWithSetDir = context.registry as { setWorkingDirectory(dir: string): void };
                        registryWithSetDir.setWorkingDirectory(currentDirectory);
                    }

                    context.logger?.info(`Changed directory to: ${currentDirectory}`);
                    return {
                        success: true,
                        output: `Changed directory to: ${currentDirectory}`
                    };
                } catch (error) {
                    context.logger?.error(`Failed to change directory: ${error instanceof Error ? error.message : String(error)}`);
                    return {
                        success: false,
                        error: `Cannot change directory: ${error instanceof Error ? error.message : String(error)}`
                    };
                }
            }

            // Execute command
            const {stdout, stderr} = await execAsync(command, {
                cwd: currentDirectory,
                timeout,
                maxBuffer: 1024 * 1024
            });

            const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');

            if (stderr) {
                context.logger?.warn(`Command produced stderr output: ${stderr}`);
            }
            
            context.logger?.info(`Command executed successfully`);
            context.logger?.debug(`Output: ${output.substring(0, 200)}${output.length > 200 ? '...' : ''}`);

            return {
                success: true,
                output: output.trim() || 'Command executed successfully (no output)'
            };
        } catch (error) {
            context.logger?.error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Command failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })
    // Custom renderer for bash output
    .renderResult(({ isExecuting, result }) => {
        if (isExecuting) {
            return (
                <CompactOutput>
                    <Text color="cyan"> Running command...</Text>
                </CompactOutput>
            );
        }

        if (!result) {
            return null;
        }

        if (!result.success) {
            return (
                <CompactOutput>
                    <Text color="red"> {result.error}</Text>
                </CompactOutput>
            );
        }

        // Show command output
        const output = result.output || '';
        if (!output.trim()) {
            return (
                <CompactOutput>
                    <Text color="gray"> (no output)</Text>
                </CompactOutput>
            );
        }

        // For single line output, use compact format
        const lines = output.trim().split('\n');
        if (lines.length === 1) {
            return (
                <CompactOutput>
                    <Text color="gray"> {output.trim()}</Text>
                </CompactOutput>
            );
        }

        // For multi-line output, use the tool output format
        // Try to detect if this is code/structured output
        const looksLikeCode = output.includes('{') || output.includes('function') || 
                             output.includes('class') || output.includes('import') ||
                             output.includes('export') || output.includes('const ') ||
                             output.includes('let ') || output.includes('var ');
        
        if (looksLikeCode) {
            // Try to guess the language based on content
            let language = 'text';
            if (output.includes('import React') || output.includes('export default')) {
                language = 'javascript';
            } else if (output.includes('interface ') || output.includes(': string')) {
                language = 'typescript';
            } else if (output.includes('def ') || output.includes('import ')) {
                language = 'python';
            } else if (output.includes('package ') || output.includes('func ')) {
                language = 'go';
            }
            
            return (
                <ToolOutput>
                    <CodeBlock content={output.trim()} language={language} />
                </ToolOutput>
            );
        }
        
        // Regular text output
        return (
            <ToolOutput>
                <Text color="gray">{output.trim()}</Text>
            </ToolOutput>
        );
    })
    
    .build();

export default bashTool;

// Type for the bash tool arguments
export type BashToolArgs = ExtractToolArgs<typeof bashTool>;

// Export utility functions for backward compatibility
export const getCurrentDirectory = (): string => currentDirectory;