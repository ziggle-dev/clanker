/**
 * Tool builder for creating tools with a fluent API
 */

import {
    ToolDefinition,
    ToolMetadata,
    ArgumentSpec,
    ToolExecutor,
    ToolContext,
    ToolCategory,
    ToolCapability,
    Schema,
    ToolResultRenderer,
    ToolArguments
} from './types';

/**
 * Builder for creating tool definitions
 */
export class ToolBuilder {
    private metadata: Partial<ToolMetadata> = {};
    private args: ArgumentSpec[] = [];
    private executor?: ToolExecutor;
    private initHook?: (context: ToolContext) => Promise<void>;
    private cleanupHook?: (context: ToolContext) => Promise<void>;
    private schemas: { input?: Schema; output?: Schema } = {};
    private isComposable?: boolean;
    private renderer?: ToolResultRenderer;
    private examplesList?: { description: string; arguments: ToolArguments; result?: string }[];

    /**
     * Set tool ID (required)
     */
    id(id: string): ToolBuilder {
        this.metadata.id = id;
        return this;
    }

    /**
     * Set tool name
     */
    name(name: string): ToolBuilder {
        this.metadata.name = name;
        return this;
    }

    /**
     * Set tool description
     */
    description(description: string): ToolBuilder {
        this.metadata.description = description;
        return this;
    }

    /**
     * Set tool version
     */
    version(version: string): ToolBuilder {
        this.metadata.version = version;
        return this;
    }

    /**
     * Set tool author
     */
    author(author: string): ToolBuilder {
        this.metadata.author = author;
        return this;
    }

    /**
     * Set tool category
     */
    category(category: ToolCategory): ToolBuilder {
        this.metadata.category = category;
        return this;
    }

    /**
     * Add tags
     */
    tags(...tags: string[]): ToolBuilder {
        this.metadata.tags = [...(this.metadata.tags || []), ...tags];
        return this;
    }

    /**
     * Add capabilities
     */
    capabilities(...capabilities: ToolCapability[]): ToolBuilder {
        this.metadata.capabilities = [...(this.metadata.capabilities || []), ...capabilities];
        return this;
    }

    /**
     * Add an argument
     */
    argument(spec: ArgumentSpec): ToolBuilder {
        this.args.push(spec);
        return this;
    }

    /**
     * Add a string argument (convenience method)
     */
    stringArg(name: string, description: string, options?: {
        required?: boolean;
        default?: string;
        enum?: string[];
        validate?: (value: string) => true | string;
    }): ToolBuilder {
        return this.argument({
            name,
            type: 'string',
            description,
            ...options
        });
    }

    /**
     * Add a number argument (convenience method)
     */
    numberArg(name: string, description: string, options?: {
        required?: boolean;
        default?: number;
        validate?: (value: number) => true | string;
    }): ToolBuilder {
        return this.argument({
            name,
            type: 'number',
            description,
            ...options
        });
    }

    /**
     * Add a boolean argument (convenience method)
     */
    booleanArg(name: string, description: string, options?: {
        required?: boolean;
        default?: boolean;
    }): ToolBuilder {
        return this.argument({
            name,
            type: 'boolean',
            description,
            ...options
        });
    }

    /**
     * Add an array argument (convenience method)
     */
    arrayArg(name: string, description: string, options?: {
        required?: boolean;
        default?: unknown[];
        validate?: (value: unknown[]) => boolean | string;
    }): ToolBuilder {
        return this.argument({
            name,
            type: 'array',
            description,
            ...options
        });
    }

    /**
     * Set input schema for composition
     */
    inputSchema(schema: Schema): ToolBuilder {
        this.schemas.input = schema;
        return this;
    }

    /**
     * Set output schema for composition
     */
    outputSchema(schema: Schema): ToolBuilder {
        this.schemas.output = schema;
        return this;
    }

    /**
     * Make tool composable
     */
    composable(value: boolean = true): ToolBuilder {
        this.isComposable = value;
        return this;
    }

    /**
     * Set execution function
     */
    execute(executor: ToolExecutor): ToolBuilder {
        this.executor = executor;
        return this;
    }

    /**
     * Set initialization hook
     */
    onInitialize(hook: (context: ToolContext) => Promise<void>): ToolBuilder {
        this.initHook = hook;
        return this;
    }

    /**
     * Set cleanup hook
     */
    onCleanup(hook: (context: ToolContext) => Promise<void>): ToolBuilder {
        this.cleanupHook = hook;
        return this;
    }

    /**
     * Set custom result renderer
     */
    renderResult(renderer: ToolResultRenderer): ToolBuilder {
        this.renderer = renderer;
        return this;
    }

    /**
     * Add examples for better AI understanding
     */
    examples(examples: { description: string; arguments: ToolArguments; result?: string }[]): ToolBuilder {
        this.examplesList = examples;
        return this;
    }

    /**
     * Build the tool definition
     */
    build(): ToolDefinition {
        if (!this.metadata.id) {
            throw new Error('Tool ID is required');
        }

        if (!this.metadata.name) {
            this.metadata.name = this.metadata.id;
        }

        if (!this.metadata.description) {
            throw new Error('Tool description is required');
        }

        if (!this.executor) {
            throw new Error('Tool executor is required');
        }

        const tool: ToolDefinition = {
            id: this.metadata.id,
            name: this.metadata.name,
            description: this.metadata.description,
            version: this.metadata.version,
            author: this.metadata.author,
            tags: this.metadata.tags,
            category: this.metadata.category,
            capabilities: this.metadata.capabilities,
            arguments: this.args.length > 0 ? this.args : undefined,
            execute: this.executor,
            composable: this.isComposable,
            inputSchema: this.schemas.input,
            outputSchema: this.schemas.output,
            renderResult: this.renderer,
            examples: this.examplesList
        };

        if (this.initHook) {
            tool.initialize = this.initHook;
        }

        if (this.cleanupHook) {
            tool.cleanup = this.cleanupHook;
        }

        return tool;
    }
}

/**
 * Create a new tool builder
 */
export function createTool(): ToolBuilder {
    return new ToolBuilder();
}
