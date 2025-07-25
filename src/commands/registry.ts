import { CommandDefinition, CommandRegistry } from './types';

export class CommandRegistryImpl implements CommandRegistry {
    private commands = new Map<string, CommandDefinition>();

    register(command: CommandDefinition): void {
        if (this.commands.has(command.name)) {
            throw new Error(`Command "${command.name}" is already registered`);
        }
        this.commands.set(command.name, command);
    }

    unregister(name: string): void {
        this.commands.delete(name);
    }

    get(name: string): CommandDefinition | undefined {
        return this.commands.get(name);
    }

    list(): CommandDefinition[] {
        return Array.from(this.commands.values());
    }

    listByCategory(): Record<string, CommandDefinition[]> {
        const categories: Record<string, CommandDefinition[]> = {};
        
        for (const command of this.commands.values()) {
            const category = command.category || 'General';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(command);
        }
        
        // Sort commands within each category
        for (const category in categories) {
            categories[category].sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return categories;
    }
}

// Global singleton instance
let globalRegistry: CommandRegistryImpl | null = null;

export function getCommandRegistry(): CommandRegistryImpl {
    if (!globalRegistry) {
        globalRegistry = new CommandRegistryImpl();
    }
    return globalRegistry;
}

// Helper function to register commands
export function registerCommand(command: CommandDefinition): void {
    getCommandRegistry().register(command);
}

// Helper decorator for registering commands
export function command(definition: Omit<CommandDefinition, 'exec'>) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const exec = descriptor.value;
        registerCommand({
            ...definition,
            exec
        });
        return descriptor;
    };
}