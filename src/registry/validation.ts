/**
 * Argument validation utilities
 */

import {
    ArgumentSpec,
    ToolArguments,
    ValidationResult,
    ValidationError,
    ArgumentType
} from './types';

/**
 * Validate arguments against specifications
 */
export function validateArguments(
    specs: ArgumentSpec[],
    args: ToolArguments
): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required arguments
    for (const spec of specs) {
        const value = args[spec.name];

        // Check required
        if (spec.required && (value === undefined || value === null)) {
            errors.push({
                field: spec.name,
                message: `Required argument '${spec.name}' is missing`,
                expected: spec.type
            });
            continue;
        }

        // Skip validation if not provided and not required
        if (value === undefined || value === null) {
            continue;
        }

        // Check type
        const typeError = validateType(value, spec.type, spec.name);
        if (typeError) {
            errors.push(typeError);
            continue;
        }

        // Check enum values
        if (spec.enum && !spec.enum.includes(value as string | number | boolean)) {
            errors.push({
                field: spec.name,
                message: `Value must be one of: ${spec.enum.join(', ')}`,
                expected: spec.enum,
                received: value
            });
        }

        // Run custom validation
        if (spec.validate) {
            const result = spec.validate(value);
            if (typeof result === 'string') {
                errors.push({
                    field: spec.name,
                    message: result,
                    received: value
                });
            } else if (result === false) {
                errors.push({
                    field: spec.name,
                    message: `Validation failed for '${spec.name}'`,
                    received: value
                });
            }
        }
    }

    // Check for unknown arguments
    const knownArgs = new Set(specs.map(s => s.name));
    for (const key of Object.keys(args)) {
        if (!knownArgs.has(key)) {
            errors.push({
                field: key,
                message: `Unknown argument '${key}'`
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

/**
 * Validate value type
 */
function validateType(value: unknown, expectedType: ArgumentType, fieldName: string): ValidationError | null {
    const actualType = getActualType(value);

    if (expectedType === 'any') {
        return null;
    }

    if (actualType !== expectedType) {
        // Special case: number type can accept numeric strings
        if (expectedType === 'number' && actualType === 'string' && !isNaN(Number(value))) {
            return null;
        }

        return {
            field: fieldName,
            message: `Expected ${expectedType} but got ${actualType}`,
            expected: expectedType,
            received: actualType
        };
    }

    return null;
}

/**
 * Get the actual type of a value
 */
function getActualType(value: unknown): ArgumentType {
    if (value === null || value === undefined) {
        return 'any';
    }

    if (Array.isArray(value)) {
        return 'array';
    }

    const type = typeof value;

    switch (type) {
        case 'string':
        case 'number':
        case 'boolean':
            return type;
        case 'object':
            return 'object';
        default:
            return 'any';
    }
}

/**
 * Apply default values to arguments
 */
export function applyDefaults(
    specs: ArgumentSpec[],
    args: ToolArguments
): ToolArguments {
    const result = {...args};

    for (const spec of specs) {
        if (spec.default !== undefined && result[spec.name] === undefined) {
            result[spec.name] = spec.default;
        }
    }

    return result;
}

/**
 * Coerce argument types
 */
export function coerceArguments(
    specs: ArgumentSpec[],
    args: ToolArguments
): ToolArguments {
    const result = {...args};

    for (const spec of specs) {
        const value = result[spec.name];
        if (value === undefined || value === null) {
            continue;
        }

        result[spec.name] = coerceValue(value, spec.type);
    }

    return result;
}

/**
 * Coerce a value to the expected type
 */
function coerceValue(value: unknown, targetType: ArgumentType): unknown {
    const actualType = getActualType(value);

    if (actualType === targetType || targetType === 'any') {
        return value;
    }

    // String to number
    if (targetType === 'number' && actualType === 'string') {
        const num = Number(value);
        return isNaN(num) ? value : num;
    }

    // String to boolean
    if (targetType === 'boolean' && actualType === 'string') {
        return value === 'true' || value === '1' || value === 'yes';
    }

    // String to array (split by comma)
    if (targetType === 'array' && actualType === 'string') {
        return (value as string).split(',').map((s: string) => s.trim());
    }

    // String to object (parse JSON)
    if (targetType === 'object' && actualType === 'string') {
        try {
            return JSON.parse(value as string);
        } catch {
            return value;
        }
    }

    return value;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
    return errors.map(error => {
        let message = `• ${error.message}`;
        if (error.expected && error.received) {
            message += ` (expected: ${JSON.stringify(error.expected)}, received: ${JSON.stringify(error.received)})`;
        }
        return message;
    }).join('\n');
}

/**
 * Create a validation function for common patterns
 */
export const validators = {
    /**
     * String validators
     */
    minLength: (min: number) => (value: string) =>
        value.length >= min || `Must be at least ${min} characters`,

    maxLength: (max: number) => (value: string) =>
        value.length <= max || `Must be at most ${max} characters`,

    pattern: (regex: RegExp) => (value: string) =>
        regex.test(value) || `Does not match required pattern`,

    email: () => (value: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Must be a valid email address',

    url: () => (value: string) => {
        try {
            new URL(value);
            return true;
        } catch {
            return 'Must be a valid URL';
        }
    },

    /**
     * Number validators
     */
    min: (min: number) => (value: number) =>
        value >= min || `Must be at least ${min}`,

    max: (max: number) => (value: number) =>
        value <= max || `Must be at most ${max}`,

    integer: () => (value: number) =>
        Number.isInteger(value) || 'Must be an integer',

    positive: () => (value: number) =>
        value > 0 || 'Must be positive',

    /**
     * Array validators
     */
    minItems: (min: number) => (value: unknown[]) =>
        value.length >= min || `Must have at least ${min} items`,

    maxItems: (max: number) => (value: unknown[]) =>
        value.length <= max || `Must have at most ${max} items`,

    unique: () => (value: unknown[]) =>
        new Set(value).size === value.length || 'Items must be unique',

    /**
     * Combine multiple validators
     */
    combine: (...validators: Array<(value: unknown) => boolean | string>) =>
        (value: unknown) => {
            for (const validator of validators) {
                const result = validator(value);
                if (result !== true) {
                    return result;
                }
            }
            return true;
        }
};