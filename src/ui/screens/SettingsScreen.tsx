import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Form, FormInput, FormButton, FormSelect, ProviderSelect, ClearFormButton, VimModeIndicator } from '../components/form';
import { SettingsManager, Settings, ProviderModels, Provider } from '../../utils/settings-manager';

// Compact Clank logo component with color cycling
const CompactClankLogo: React.FC = () => {
    const [colorIndex, setColorIndex] = useState(0);
    const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];

    useEffect(() => {
        const interval = setInterval(() => {
            setColorIndex((prev) => (prev + 1) % colors.length);
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box 
            borderStyle="round" 
            borderColor={colors[colorIndex]}
            paddingX={2}
            marginBottom={2}
        >
            <Text color={colors[colorIndex]}>
                {'██████╗██╗      █████╗ ███╗   ██╗██╗  ██╗\n'}
                {'██╔════╝██║     ██╔══██╗████╗  ██║██║ ██╔╝\n'}
                {'██║     ██║     ███████║██╔██╗ ██║█████╔╝ \n'}
                {'██║     ██║     ██╔══██║██║╚██╗██║██╔═██╗ \n'}
                {'╚██████╗███████╗██║  ██║██║ ╚████║██║  ██╗\n'}
                {' ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝'}
            </Text>
        </Box>
    );
};


interface SettingsScreenProps {
    onComplete: (settings: Settings) => void;
    onCancel?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onComplete, onCancel }) => {
    const settingsManager = SettingsManager.getInstance();
    const [initialValues, setInitialValues] = useState<Partial<Settings>>({});
    const [selectedProvider, setSelectedProvider] = useState<Provider>('grok');

    useEffect(() => {
        const { settings } = settingsManager.loadSettings();
        setInitialValues(settings);
        if (settings.provider) {
            setSelectedProvider(settings.provider as Provider);
        }
    }, []);

    // Escape key is handled by the form system, not here

    const handleSubmit = async (values: Record<string, any>) => {
        try {
            // Ensure all required fields are present
            const settings: Settings = {
                apiKey: values.apiKey,
                provider: values.provider || selectedProvider,
                model: values.model || ProviderModels[selectedProvider].defaultModel,
                theme: values.theme || 'auto',
                autoEditEnabled: values.autoEditEnabled || false,
                vsCodeOpenEnabled: values.vsCodeOpenEnabled || false,
                confirmationSettings: values.confirmationSettings || {
                    alwaysEdit: false,
                    alwaysBash: false,
                    alwaysSearch: false
                },
                ...(selectedProvider === 'custom' && values.customBaseURL ? { customBaseURL: values.customBaseURL } : {})
            };
            
            console.log('Saving settings:', { ...settings, apiKey: '***' });
            settingsManager.saveSettings(settings);
            onComplete(settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    // Get provider options
    const providerOptions = Object.entries(ProviderModels).map(([key, value]) => ({
        value: key,
        label: value.name
    }));

    // Get model options for selected provider
    const modelOptions = [...(ProviderModels[selectedProvider]?.models || [])];

    const validateApiKey = (value: string): string | undefined => {
        if (!value || value.trim().length === 0) {
            return 'API key is required';
        }
        if (value.length < 10) {
            return 'API key seems too short';
        }
        return undefined;
    };

    const validateBaseURL = (value: string): string | undefined => {
        if (!value) return undefined; // Optional field
        try {
            new URL(value);
            return undefined;
        } catch {
            return 'Invalid URL format';
        }
    };

    return (
        <Box flexDirection="column" paddingX={2} paddingY={1} width="100%">
            <Box justifyContent="center">
                <CompactClankLogo />
            </Box>
            
            <Box justifyContent="center" marginBottom={2}>
                <Text bold color="cyan">Initial Configuration</Text>
            </Box>

            <Form onSubmit={handleSubmit} initialValues={initialValues}>
                <FormInput
                    name="apiKey"
                    label="Grok API Key"
                    placeholder="sk-..."
                    password
                    required
                    validation={validateApiKey}
                    row={0}
                    column={0}
                />

                <ProviderSelect
                    name="provider"
                    label="Provider"
                    options={providerOptions}
                    row={1}
                    column={0}
                    onProviderChange={setSelectedProvider}
                />

                {selectedProvider === 'custom' && (
                    <FormInput
                        name="customBaseURL"
                        label="Custom API Base URL"
                        placeholder="https://api.example.com/v1"
                        validation={validateBaseURL}
                        required
                        row={2}
                        column={0}
                    />
                )}

                <Box flexDirection="row" gap={2}>
                    {selectedProvider !== 'custom' && (
                        <Box flexGrow={1} flexBasis="50%">
                            <FormSelect
                                name="model"
                                label="Default Model"
                                options={modelOptions}
                                row={2}
                                column={0}
                            />
                        </Box>
                    )}
                    
                    <Box flexGrow={1} flexBasis={selectedProvider === 'custom' ? "100%" : "50%"}>
                        <FormSelect
                            name="theme"
                            label="Theme"
                            options={[
                                { label: 'Auto', value: 'auto' },
                                { label: 'Light', value: 'light' },
                                { label: 'Dark', value: 'dark' }
                            ]}
                            row={selectedProvider === 'custom' ? 3 : 2}
                            column={selectedProvider === 'custom' ? 0 : 1}
                        />
                    </Box>
                </Box>

                {/* Action buttons row with overlap styling */}
                <Box marginTop={2} marginBottom={-2} flexDirection="row" justifyContent="space-between">
                    <Box>
                        {onCancel && (
                            <FormButton
                                name="cancel"
                                label="Cancel"
                                onPress={onCancel}
                                variant="secondary"
                                row={selectedProvider === 'custom' ? 4 : 3}
                                column={0}
                            />
                        )}
                    </Box>
                    
                    <Box flexDirection="row" gap={1}>
                        <ClearFormButton
                            name="clear"
                            label="Clear"
                            variant="secondary"
                            filled
                            row={selectedProvider === 'custom' ? 4 : 3}
                            column={1}
                        />
                        <FormButton
                            name="save"
                            label="Save"
                            type="submit"
                            variant="primary"
                            filled
                            row={selectedProvider === 'custom' ? 4 : 3}
                            column={2}
                        />
                    </Box>
                </Box>
            </Form>
        </Box>
    );
};