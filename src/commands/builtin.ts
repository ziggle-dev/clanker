import { registerCommand } from './registry';
import { actions } from '../store';

// Register built-in commands
export function registerBuiltinCommands() {
    // Clear command
    registerCommand({
        name: 'clear',
        description: 'Clear the chat history',
        category: 'Chat',
        exec: () => {
            actions.clearMessages();
        }
    });
    
    // Theme command
    registerCommand({
        name: 'theme',
        description: 'Change the application theme',
        category: 'Settings',
        arguments: [
            {
                name: 'theme',
                type: 'enum',
                description: 'Theme',
                required: true,
                options: [
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto' }
                ]
            }
        ],
        exec: (args) => {
            actions.setTheme(args.theme);
        }
    });
    
    // Model command
    registerCommand({
        name: 'model',
        description: 'Switch AI model',
        category: 'Settings',
        arguments: [
            {
                name: 'model',
                type: 'enum',
                description: 'Model',
                required: true,
                options: [
                    { value: 'grok-4-latest', label: 'Grok 4 Latest' },
                    { value: 'grok-3-latest', label: 'Grok 3 Latest' },
                    { value: 'grok-4', label: 'Grok 4' },
                    { value: 'grok-3', label: 'Grok 3' },
                    { value: 'grok-beta', label: 'Grok Beta' }
                ]
            }
        ],
        exec: (args) => {
            actions.setModel(args.model);
        }
    });
    
    // Toggle commands
    registerCommand({
        name: 'toggle-auto-edit',
        description: 'Toggle auto-edit mode',
        category: 'Settings',
        arguments: [
            {
                name: 'enabled',
                type: 'boolean',
                description: 'Enable auto-edit',
                default: false
            }
        ],
        exec: (args) => {
            actions.setAutoEdit(args.enabled);
        }
    });
    
    registerCommand({
        name: 'toggle-vscode',
        description: 'Toggle VS Code integration',
        category: 'Settings',
        arguments: [
            {
                name: 'enabled',
                type: 'boolean',
                description: 'Enable VS Code integration',
                default: false
            }
        ],
        exec: (args) => {
            actions.setVSCodeOpen(args.enabled);
        }
    });
    
    // Search command
    registerCommand({
        name: 'search',
        description: 'Search for text in files',
        category: 'Tools',
        arguments: [
            {
                name: 'query',
                type: 'string',
                description: 'Search query',
                required: true,
                placeholder: 'Enter search term...'
            },
            {
                name: 'path',
                type: 'string',
                description: 'Path to search in',
                default: '.',
                placeholder: 'Path (default: current directory)'
            },
            {
                name: 'caseSensitive',
                type: 'boolean',
                description: 'Case sensitive search',
                default: false
            }
        ],
        exec: async (args) => {
            // This would integrate with the search tool
            const message = `Searching for "${args.query}" in ${args.path}${args.caseSensitive ? ' (case sensitive)' : ''}`;
            console.log(message);
            // In a real implementation, this would call the search tool
        }
    });
    
    // Settings command
    registerCommand({
        name: 'settings',
        description: 'Open settings configuration',
        category: 'System',
        exec: () => {
            // This would open the settings screen
            console.log('Opening settings...');
            // In a real implementation, this would trigger the settings screen
        }
    });
    
    // Help command
    registerCommand({
        name: 'help',
        description: 'Show available commands',
        category: 'System',
        exec: () => {
            actions.setShowHelp(true);
        }
    });
}