// Base argument types
export type ArgumentType = 'string' | 'boolean' | 'enum';

// Argument definition
export interface ArgumentDefinition {
    name: string;
    type: ArgumentType;
    description?: string;
    required?: boolean;
    default?: any;
    // For enum types
    options?: Array<{ value: string; label: string }>;
    // For string types
    placeholder?: string;
    validation?: (value: any) => string | undefined;
}

// Command definition
export interface CommandDefinition {
    name: string;
    description: string;
    category?: string;
    arguments?: ArgumentDefinition[];
    exec: (args: Record<string, any>) => void | Promise<void>;
}

// Command registry interface
export interface CommandRegistry {
    register(command: CommandDefinition): void;
    unregister(name: string): void;
    get(name: string): CommandDefinition | undefined;
    list(): CommandDefinition[];
    listByCategory(): Record<string, CommandDefinition[]>;
}