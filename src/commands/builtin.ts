import { registerCommand } from './registry';
import { actions, store } from '../store';
import { StageType } from '../ui/stage/types';

let hasRegistered = false;

// Register built-in commands
export function registerBuiltinCommands() {
    if (hasRegistered) {
        return;
    }
    hasRegistered = true;
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
                    { value: 'grok-4-0709', label: 'Grok 4' },
                    { value: 'grok-3', label: 'Grok 3' },
                    { value: 'grok-3-mini', label: 'Grok 3 Mini' },
                    { value: 'grok-3-fast', label: 'Grok 3 Fast' },
                    { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast' },
                    { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
                    { value: 'grok-2-image-1212', label: 'Grok 2 Image' }
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
        description: 'Toggle auto-edit mode (file operations only)',
        category: 'Settings',
        arguments: [
            {
                name: 'enabled',
                type: 'boolean',
                description: 'Enable auto-edit for file operations',
                default: false
            }
        ],
        exec: (args) => {
            actions.setAutoEdit(args.enabled);
            const status = args.enabled ? 'enabled' : 'disabled';
            console.log(`Auto-edit is now ${status} for file operations`);
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
    
    // Dangerous bypass permission command
    registerCommand({
        name: 'dbp',
        description: 'Toggle dangerously bypass permission',
        category: 'Settings',
        arguments: [
            {
                name: 'enabled',
                type: 'boolean',
                description: 'Enable dangerous bypass (skips ALL confirmations)',
                default: false
            }
        ],
        exec: (args) => {
            actions.setDangerousBypassPermission(args.enabled);
            const status = args.enabled ? 'ENABLED' : 'DISABLED';
            console.log(`⚠️  Dangerously Bypass Permission is now ${status}`);
        }
    });
    
    // Virtual scrolling toggle command
    registerCommand({
        name: 'toggle-virtual-scroll',
        description: 'Toggle virtual scrolling for chat history',
        category: 'Settings',
        exec: () => {
            const currentState = store.virtualScrollingEnabled;
            actions.setVirtualScrolling(!currentState);
            const status = !currentState ? 'enabled' : 'disabled';
            console.log(`📜 Virtual scrolling is now ${status}`);
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
        description: 'Configure application settings',
        category: 'System',
        arguments: [
            {
                name: 'model',
                type: 'enum',
                description: 'AI Model',
                required: false,
                options: [
                    { value: 'grok-4-0709', label: 'Grok 4' },
                    { value: 'grok-3', label: 'Grok 3' },
                    { value: 'grok-3-mini', label: 'Grok 3 Mini' },
                    { value: 'grok-3-fast', label: 'Grok 3 Fast' },
                    { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast' },
                    { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
                    { value: 'grok-2-image-1212', label: 'Grok 2 Image' }
                ]
            },
            {
                name: 'theme',
                type: 'enum',
                description: 'Theme',
                required: false,
                options: [
                    { value: 'auto', label: 'Auto' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' }
                ]
            },
            {
                name: 'autoEditEnabled',
                type: 'boolean',
                description: 'Auto-edit (file operations only)',
                default: false
            },
            {
                name: 'vsCodeOpenEnabled',
                type: 'boolean',
                description: 'VS Code integration',
                default: false
            },
            {
                name: 'dangerousBypassPermission',
                type: 'boolean',
                description: 'Dangerously bypass permissions ⚠️',
                default: false
            },
            {
                name: 'virtualScrollingEnabled',
                type: 'boolean',
                description: 'Virtual scrolling',
                default: true
            }
        ],
        exec: async (args) => {
            // Load current settings
            const { SettingsManager } = await import('../utils/settings-manager');
            const settingsManager = SettingsManager.getInstance();
            const { settings } = settingsManager.loadSettings();
            
            // Merge with provided arguments
            const updatedSettings = {
                ...settings,
                ...args
            };
            
            // Update store
            if (args.model !== undefined) actions.setModel(args.model);
            if (args.theme !== undefined) actions.setTheme(args.theme);
            if (args.autoEditEnabled !== undefined) actions.setAutoEdit(args.autoEditEnabled);
            if (args.vsCodeOpenEnabled !== undefined) actions.setVSCodeOpen(args.vsCodeOpenEnabled);
            if (args.dangerousBypassPermission !== undefined) actions.setDangerousBypassPermission(args.dangerousBypassPermission);
            if (args.virtualScrollingEnabled !== undefined) actions.setVirtualScrolling(args.virtualScrollingEnabled);
            
            // Save to settings.json
            if (settings.apiKey) {
                settingsManager.saveSettings({
                    ...settings,
                    ...updatedSettings
                } as any);
                console.log('Settings updated successfully');
            } else {
                console.log('Settings updated (not saved - API key required)');
            }
        }
    });
    
    // Help command
    registerCommand({
        name: 'help',
        description: 'Show available commands',
        category: 'System',
        exec: () => {
            // Check if we're in command palette and replace it with help
            const currentStage = actions.getCurrentStage();
            if (currentStage.type === StageType.COMMAND_PALETTE) {
                actions.replaceStage({ id: 'help', type: StageType.HELP });
            } else {
                actions.pushStage({ id: 'help', type: StageType.HELP });
            }
        }
    });
}