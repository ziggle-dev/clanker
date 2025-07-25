/**
 * Input tool - Platform-specific input dialog for getting user input
 */

import React from 'react';
import {Text} from 'ink';
import * as child_process from 'child_process';
import * as os from 'os';
import {promisify} from 'util';
import {createTool, ToolCategory, ToolCapability} from '../../registry';

const execAsync = promisify(child_process.exec);

/**
 * Input tool - Shows a platform-specific input dialog to get user input
 */
export const inputTool = createTool()
    .id('input')
    .name('Get User Input')
    .description('Show a platform-specific input dialog to get arbitrary information from the user')
    .category(ToolCategory.Utility)
    .capabilities(ToolCapability.UserConfirmation)
    .tags('input', 'dialog', 'user', 'prompt', 'ask')

    // Arguments
    .stringArg('prompt', 'The prompt/question to show to the user', {required: true})
    .stringArg('default_value', 'Default value to pre-fill in the input field (optional)', {required: false})
    .stringArg('title', 'Title for the dialog window (optional)', {required: false, default: 'Input Required'})
    .booleanArg('password', 'Whether to mask the input for password entry (optional)', {
        required: false,
        default: false
    })

    // Examples
    .examples([
        {
            description: 'Ask for user\'s name',
            arguments: {
                prompt: 'What is your name?',
                title: 'Name Input'
            },
            result: 'User enters: John Doe'
        },
        {
            description: 'Ask for API key with password masking',
            arguments: {
                prompt: 'Please enter your API key:',
                title: 'API Key',
                password: true
            },
            result: 'User enters masked input'
        }
    ])

    // Render result
    .renderResult(({ isExecuting, result, arguments: args }) => {
        if (isExecuting) {
            return <Text color="cyan">⎿ Waiting for user input...</Text>;
        }
        
        if (!result?.success) {
            return <Text color="red">⎿ {result?.error || 'Failed to get input'}</Text>;
        }
        
        if (args.password) {
            return <Text color="gray">⎿ User provided input (hidden)</Text>;
        }
        
        return <Text color="gray">⎿ User input: {result.output}</Text>;
    })
    
    // Execute
    .execute(async (args, context) => {
        const {prompt, default_value, title, password} = args as {
            prompt: string;
            default_value?: string;
            title?: string;
            password?: boolean;
        };

        const platform = os.platform();
        context.logger?.debug(`Showing input dialog on ${platform}`);

        try {
            let result: string;

            switch (platform) {
                case 'darwin': // macOS
                    result = await showMacOSDialog(prompt, default_value, title || 'Input Required', password || false);
                    break;

                case 'win32': // Windows
                    result = await showWindowsDialog(prompt, default_value, title || 'Input Required', password || false);
                    break;

                case 'linux': // Linux
                    result = await showLinuxDialog(prompt, default_value, title || 'Input Required', password || false);
                    break;

                default:
                    return {
                        success: false,
                        error: `Unsupported platform: ${platform}`
                    };
            }

            if (result === null || result === undefined) {
                return {
                    success: false,
                    error: 'User cancelled the input dialog'
                };
            }

            context.logger?.info(`User provided input: ${password ? '[HIDDEN]' : result}`);
            return {
                success: true,
                output: result,
                data: {input: result}
            };

        } catch (error) {
            context.logger?.error(`Failed to show input dialog: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: `Failed to show input dialog: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    })
    .build();

/**
 * Show input dialog on macOS using AppleScript
 */
async function showMacOSDialog(prompt: string, defaultValue?: string, title?: string, password?: boolean): Promise<string> {
    // Escape both single and double quotes properly for AppleScript
    const escapedPrompt = prompt
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "'\\''")
        .replace(/\n/g, ' ');
    const escapedTitle = (title || 'Input Required')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "'\\''")
        .replace(/\n/g, ' ');
    const escapedDefault = (defaultValue || '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "'\\''")
        .replace(/\n/g, ' ');

    let script: string;
    if (password) {
        script = `osascript -e 'tell application "System Events" to display dialog "${escapedPrompt}" default answer "" with title "${escapedTitle}" with hidden answer' -e 'text returned of result'`;
    } else {
        script = `osascript -e 'tell application "System Events" to display dialog "${escapedPrompt}" default answer "${escapedDefault}" with title "${escapedTitle}"' -e 'text returned of result'`;
    }

    try {
        const {stdout} = await execAsync(script);
        return stdout.trim();
    } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.message.includes('User canceled')) {
            throw new Error('User cancelled the input dialog');
        }
        throw error;
    }
}

/**
 * Show input dialog on Windows using PowerShell
 */
async function showWindowsDialog(prompt: string, defaultValue?: string, title?: string, password?: boolean): Promise<string> {
    const escapedPrompt = prompt.replace(/'/g, "''");
    const escapedTitle = (title || 'Input Required').replace(/'/g, "''");
    const escapedDefault = (defaultValue || '').replace(/'/g, "''");

    let script: string;
    if (password) {
        // PowerShell script for password input
        script = `
            Add-Type -AssemblyName Microsoft.VisualBasic
            $secure = Read-Host '${escapedPrompt}' -AsSecureString
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            Write-Output $plain
        `;
    } else {
        // PowerShell script for regular input
        script = `
            Add-Type -AssemblyName Microsoft.VisualBasic
            [Microsoft.VisualBasic.Interaction]::InputBox('${escapedPrompt}', '${escapedTitle}', '${escapedDefault}')
        `;
    }

    const {stdout} = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    const result = stdout.trim();

    // PowerShell might return empty string if cancelled
    if (result === '') {
        throw new Error('User cancelled the input dialog');
    }

    return result;
}

/**
 * Show input dialog on Linux using zenity or kdialog
 */
async function showLinuxDialog(prompt: string, defaultValue?: string, title?: string, password?: boolean): Promise<string> {
    // Try zenity first (GNOME)
    try {
        await execAsync('which zenity');
        return await showZenityDialog(prompt, defaultValue, title, password);
    } catch {
        // Try kdialog (KDE)
        try {
            await execAsync('which kdialog');
            return await showKdialogDialog(prompt, defaultValue, title, password);
        } catch {
            // Fallback to terminal input
            return await showTerminalInput(prompt, defaultValue, password);
        }
    }
}

/**
 * Show input dialog using zenity (GNOME)
 */
async function showZenityDialog(prompt: string, defaultValue?: string, title?: string, password?: boolean): Promise<string> {
    const args = [
        'zenity',
        '--entry',
        `--text="${prompt.replace(/"/g, '\\"')}"`,
        `--title="${(title || 'Input Required').replace(/"/g, '\\"')}"`
    ];

    if (defaultValue) {
        args.push(`--entry-text="${defaultValue.replace(/"/g, '\\"')}"`);
    }

    if (password) {
        args.push('--hide-text');
    }

    try {
        const {stdout} = await execAsync(args.join(' '));
        return stdout.trim();
    } catch (error) {
        if (error instanceof Error && (error.message.includes('code 1') || error.message.includes('code 255'))) {
            throw new Error('User cancelled the input dialog');
        }
        throw error;
    }
}

/**
 * Show input dialog using kdialog (KDE)
 */
async function showKdialogDialog(prompt: string, defaultValue?: string, title?: string, password?: boolean): Promise<string> {
    const args = [
        'kdialog',
        password ? '--password' : '--inputbox',
        `"${prompt.replace(/"/g, '\\"')}"`,
        defaultValue ? `"${defaultValue.replace(/"/g, '\\"')}"` : '""',
        `--title "${(title || 'Input Required').replace(/"/g, '\\"')}"`
    ];

    try {
        const {stdout} = await execAsync(args.join(' '));
        return stdout.trim();
    } catch (error) {
        if (error instanceof Error && error.message.includes('code 1')) {
            throw new Error('User cancelled the input dialog');
        }
        throw error;
    }
}

/**
 * Fallback to terminal input using read command
 */
async function showTerminalInput(prompt: string, defaultValue?: string, password?: boolean): Promise<string> {
    const script = password
        ? `read -s -p "${prompt.replace(/"/g, '\\"')}: " input && echo "$input"`
        : `read -p "${prompt.replace(/"/g, '\\"')} [${defaultValue || ''}]: " input && echo "\${input:-${defaultValue || ''}}"`;

    try {
        const {stdout} = await execAsync(script, {shell: '/bin/bash'});
        return stdout.trim();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error('Failed to read input from terminal');
    }
}

// Export the tool
export default inputTool;