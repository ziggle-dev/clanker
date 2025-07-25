import { z } from 'zod';

export interface ArgDefinition<T = any> {
  name: string;
  short?: string;
  description: string;
  schema?: z.ZodSchema<T>;
  defaultValue?: T;
  handler?: (value: T, context: ArgsContext) => void | Promise<void>;
}

export interface ArgsContext {
  args: Record<string, any>;
  options: Record<string, any>;
  remainingArgs: string[];
  setOption: (key: string, value: any) => void;
  getOption: (key: string) => any;
}

export class ArgsParser {
  private definitions: Map<string, ArgDefinition> = new Map();
  private shortHandMap: Map<string, string> = new Map();
  private context: ArgsContext;

  constructor() {
    this.context = {
      args: {},
      options: {},
      remainingArgs: [],
      setOption: (key: string, value: any) => {
        this.context.options[key] = value;
      },
      getOption: (key: string) => {
        return this.context.options[key];
      }
    };
  }

  register<T>(definition: ArgDefinition<T>): this {
    this.definitions.set(definition.name, definition);
    
    if (definition.short) {
      this.shortHandMap.set(definition.short, definition.name);
    }

    return this;
  }

  async parse(argv: string[]): Promise<ArgsContext> {
    const args = [...argv];
    const parsedArgs: Record<string, any> = {};
    const remainingArgs: string[] = [];

    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const flagName = arg.slice(2);
        const definition = this.definitions.get(flagName);

        if (definition) {
          const { value, consumed } = await this.parseArgValue(definition, args, i);
          parsedArgs[flagName] = value;
          i += consumed;
        } else {
          // Unknown flag, add to remaining args
          remainingArgs.push(arg);
          i++;
        }
      } else if (arg.startsWith('-') && arg.length === 2) {
        const shortFlag = arg.slice(1);
        const fullName = this.shortHandMap.get(shortFlag);

        if (fullName) {
          const definition = this.definitions.get(fullName);
          if (definition) {
            const { value, consumed } = await this.parseArgValue(definition, args, i);
            parsedArgs[fullName] = value;
            i += consumed;
          } else {
            remainingArgs.push(arg);
            i++;
          }
        } else {
          remainingArgs.push(arg);
          i++;
        }
      } else {
        remainingArgs.push(arg);
        i++;
      }
    }

    // Apply default values for missing args
    for (const [name, definition] of this.definitions) {
      if (!(name in parsedArgs) && definition.defaultValue !== undefined) {
        parsedArgs[name] = definition.defaultValue;
      }
    }

    // Update context
    this.context.args = parsedArgs;
    this.context.remainingArgs = remainingArgs;

    // Execute handlers in registration order
    for (const [name, definition] of this.definitions) {
      if (definition.handler && name in parsedArgs) {
        await definition.handler(parsedArgs[name], this.context);
      }
    }

    return this.context;
  }

  private async parseArgValue(definition: ArgDefinition, args: string[], index: number): Promise<{ value: any, consumed: number }> {
    if (!definition.schema) {
      // Boolean flag
      return { value: true, consumed: 1 };
    }

    // Check if next argument exists and is not a flag
    const nextIndex = index + 1;
    if (nextIndex < args.length && !args[nextIndex].startsWith('-')) {
      const rawValue = args[nextIndex];
      
      try {
        const parsedValue = await definition.schema.parseAsync(rawValue);
        return { value: parsedValue, consumed: 2 };
      } catch (error) {
        throw new Error(`Invalid value for --${definition.name}: ${error instanceof z.ZodError ? error.errors[0].message : String(error)}`);
      }
    } else {
      throw new Error(`Flag --${definition.name} requires a value`);
    }
  }

  generateHelp(): string {
    const lines: string[] = ['Options:'];
    const maxNameLength = Math.max(...Array.from(this.definitions.values()).map(d => {
      const nameStr = d.short ? `  -${d.short}, --${d.name}` : `      --${d.name}`;
      return nameStr.length;
    }));

    for (const definition of this.definitions.values()) {
      const nameStr = definition.short 
        ? `  -${definition.short}, --${definition.name}`
        : `      --${definition.name}`;
      
      const padding = ' '.repeat(maxNameLength - nameStr.length + 2);
      lines.push(`${nameStr}${padding}${definition.description}`);
      
      if (definition.defaultValue !== undefined) {
        const defaultStr = `[default: ${JSON.stringify(definition.defaultValue)}]`;
        lines.push(`${' '.repeat(maxNameLength + 4)}${defaultStr}`);
      }
    }

    return lines.join('\n');
  }

  getContext(): ArgsContext {
    return this.context;
  }
}

// Global instance
export const argsParser = new ArgsParser();