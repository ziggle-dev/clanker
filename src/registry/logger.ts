/**
 * Logger implementation for tool execution
 */

import { ToolLogger } from './types';

/**
 * Console logger implementation
 */
export class ConsoleLogger implements ToolLogger {
  private prefix: string;
  private enabled: boolean;

  constructor(prefix: string = '[Tool]', enabled: boolean = true) {
    this.prefix = prefix;
    this.enabled = enabled;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.enabled && process.env.DEBUG === 'true') {
      console.log(`${this.prefix} DEBUG:`, message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.log(`${this.prefix} INFO:`, message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.warn(`${this.prefix} WARN:`, message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.error(`${this.prefix} ERROR:`, message, ...args);
    }
  }
}

/**
 * Create a logger instance for a specific tool
 */
export function createToolLogger(toolId: string, enabled: boolean = true): ToolLogger {
  // Disable logging in interactive mode to avoid interfering with TUI
  const isInteractive = process.stdout.isTTY && !process.env.CI;
  return isInteractive ? new NullLogger() : new ConsoleLogger(`[${toolId}]`, enabled);
}

/**
 * Null logger that discards all messages
 */
export class NullLogger implements ToolLogger {
  debug(): void {
    // No-op
  }

  info(): void {
    // No-op
  }

  warn(): void {
    // No-op
  }

  error(): void {
    // No-op
  }
}