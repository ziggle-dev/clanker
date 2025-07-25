import React, { useState, useEffect } from 'react';
import { GrokAgent } from '../../clanker/agent';
import { ClankerLogo } from '../components/ClankerLogo';
import { StageRouter } from '../stage/StageRouter';
import { StageType } from '../stage/types';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SettingsManager, Settings, ProviderModels } from '../../utils/settings-manager';
import { actions } from '../../store';

interface AppContainerProps {
    agent?: GrokAgent;
}

export const AppContainer: React.FC<AppContainerProps> = ({ agent: initialAgent }) => {
    const [showLogo, setShowLogo] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [agent, setAgent] = useState<GrokAgent | null>(initialAgent || null);
    const settingsManager = SettingsManager.getInstance();
    
    useEffect(() => {
        // Check if settings need configuration
        if (!agent && settingsManager.needsConfiguration()) {
            setShowSettings(true);
            setShowLogo(false);
        }
    }, []);
    
    const handleLogoComplete = () => {
        setShowLogo(false);
        
        // After logo, check if we need settings
        if (!agent) {
            setShowSettings(true);
        }
    };
    
    const handleSettingsComplete = async (settings: Settings) => {
        setShowSettings(false);
        
        // Create agent with new settings
        try {
            // Get the base URL from provider configuration
            let baseURL: string | undefined;
            if (settings.provider === 'custom') {
                baseURL = settings.customBaseURL;
            } else {
                const providerConfig = ProviderModels[settings.provider || 'grok'];
                baseURL = providerConfig.baseURL;
            }
            
            console.log('Creating new agent with settings:', {
                provider: settings.provider,
                baseURL,
                model: settings.model,
                apiKey: settings.apiKey ? '***' : 'missing'
            });
            
            const newAgent = new GrokAgent({
                apiKey: settings.apiKey,
                baseURL,
                model: settings.model,
                loadDynamicTools: true
            });
            
            // Clear any previous messages when creating new agent
            actions.clearMessages();
            
            setAgent(newAgent);
            actions.setAgent(newAgent);
            
            // Update store settings
            actions.setModel(settings.model);
            actions.setTheme(settings.theme);
            actions.setAutoEdit(settings.autoEditEnabled);
            actions.setVSCodeOpen(settings.vsCodeOpenEnabled);
            actions.updateConfirmationSettings(settings.confirmationSettings);
            
            console.log('Agent created successfully');
        } catch (error) {
            console.error('Failed to create agent:', error);
            setShowSettings(true);
        }
    };
    
    const handleSettingsCancel = () => {
        // If we have an agent, just close settings
        if (agent) {
            setShowSettings(false);
        }
        // Otherwise, we can't proceed without settings
    };
    
    if (showSettings) {
        return (
            <SettingsScreen 
                onComplete={handleSettingsComplete}
                onCancel={agent ? handleSettingsCancel : undefined}
            />
        );
    }
    
    if (showLogo && agent) {
        return <ClankerLogo agent={agent} onComplete={handleLogoComplete} />;
    }
    
    if (agent) {
        return <StageRouter agent={agent} />;
    }
    
    // This shouldn't happen, but just in case
    return <SettingsScreen onComplete={handleSettingsComplete} />;
};