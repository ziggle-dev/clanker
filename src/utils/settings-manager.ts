import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';

// Provider configuration
export const ProviderModels = {
    grok: {
        name: 'Grok',
        baseURL: 'https://api.x.ai/v1',
        models: [
            { value: 'grok-4-0709', label: 'Grok 4' },
            { value: 'grok-3', label: 'Grok 3' },
            { value: 'grok-3-mini', label: 'Grok 3 Mini' },
            { value: 'grok-3-fast', label: 'Grok 3 Fast' },
            { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast' },
            { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
            { value: 'grok-2-image-1212', label: 'Grok 2 Image' }
        ],
        defaultModel: 'grok-3'
    },
    openai: {
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        models: [
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ],
        defaultModel: 'gpt-4-turbo'
    },
    custom: {
        name: 'Custom',
        baseURL: '',
        models: [],
        defaultModel: ''
    }
} as const;

export type Provider = keyof typeof ProviderModels;

// Define the settings schema
export const SettingsSchema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    provider: z.enum(['grok', 'openai', 'custom'] as const).default('grok'),
    customBaseURL: z.string().url().optional(),
    model: z.string().default(ProviderModels.grok.defaultModel),
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    autoEditEnabled: z.boolean().default(false),
    vsCodeOpenEnabled: z.boolean().default(false),
    dangerousBypassPermission: z.boolean().default(false),
    virtualScrollingEnabled: z.boolean().default(true),
    confirmationSettings: z.object({
        alwaysEdit: z.boolean().default(false),
        alwaysBash: z.boolean().default(false),
        alwaysSearch: z.boolean().default(false),
    }).default({}),
    // Add version to track schema changes
    version: z.number().default(1)
});

export type Settings = z.infer<typeof SettingsSchema>;

export class SettingsManager {
    private static instance: SettingsManager;
    private settingsPath: string;
    private settingsDir: string;
    private currentVersion = 2;

    private constructor() {
        this.settingsDir = path.join(os.homedir(), '.clanker');
        this.settingsPath = path.join(this.settingsDir, 'settings.json');
    }

    static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    /**
     * Ensure the settings directory exists
     */
    private ensureSettingsDir(): void {
        if (!fs.existsSync(this.settingsDir)) {
            fs.mkdirSync(this.settingsDir, { recursive: true });
        }
    }

    /**
     * Load settings from file
     */
    loadSettings(): { settings: Partial<Settings>, isValid: boolean, errors: z.ZodError | null } {
        try {
            this.ensureSettingsDir();
            
            if (!fs.existsSync(this.settingsPath)) {
                return { settings: {}, isValid: false, errors: null };
            }

            const fileContent = fs.readFileSync(this.settingsPath, 'utf-8');
            const rawSettings = JSON.parse(fileContent);
            
            // Try to parse with schema
            const result = SettingsSchema.safeParse(rawSettings);
            
            if (result.success) {
                return { settings: result.data, isValid: true, errors: null };
            } else {
                // Return partial settings and validation errors
                return { settings: rawSettings, isValid: false, errors: result.error };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            return { settings: {}, isValid: false, errors: null };
        }
    }

    /**
     * Save settings to file
     */
    saveSettings(settings: Settings): void {
        try {
            this.ensureSettingsDir();
            
            // Add version
            const settingsWithVersion = { ...settings, version: this.currentVersion };
            
            fs.writeFileSync(
                this.settingsPath,
                JSON.stringify(settingsWithVersion, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
        }
    }

    /**
     * Check if settings need to be configured
     * Returns true if settings are missing, invalid, or have new fields
     */
    needsConfiguration(): boolean {
        const { isValid, settings } = this.loadSettings();
        
        if (!isValid) return true;
        
        // Check if we have all required fields
        const requiredFields = ['apiKey'];
        for (const field of requiredFields) {
            if (!settings[field as keyof Settings]) {
                return true;
            }
        }
        
        // Check version for schema changes
        if (!settings.version || settings.version < this.currentVersion) {
            return true;
        }
        
        return false;
    }

    /**
     * Get fields that need configuration
     */
    getMissingFields(): string[] {
        const { settings } = this.loadSettings();
        const schema = SettingsSchema.shape;
        const missingFields: string[] = [];
        
        // Check each field in the schema
        for (const [key, value] of Object.entries(schema)) {
            if (key === 'version') continue;
            
            // Check if field is required and missing
            if (!value.isOptional() && !settings[key as keyof Settings]) {
                missingFields.push(key);
            }
        }
        
        return missingFields;
    }

    /**
     * Validate a single field
     */
    validateField(field: keyof Settings, value: any): string | undefined {
        try {
            const fieldSchema = SettingsSchema.shape[field];
            fieldSchema.parse(value);
            return undefined;
        } catch (error) {
            if (error instanceof z.ZodError) {
                return error.errors[0]?.message || 'Invalid value';
            }
            return 'Invalid value';
        }
    }
}