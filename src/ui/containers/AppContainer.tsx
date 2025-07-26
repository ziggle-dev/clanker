import React, { useState, useEffect } from 'react';
import { GrokAgent } from '../../clanker/agent';
import { ClankerLogo } from '../components/ClankerLogo';
import { StageRouter } from '../stage/StageRouter';
import { StageType } from '../stage/types';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SettingsManager, Settings, ProviderModels } from '../../utils/settings-manager';
import { actions } from '../../store';
import { registerBuiltinCommands } from '../../commands/builtin';
import { GrokAgent } from '../../clanker/agent';

interface AppContainerProps {
    agent?: GrokAgent;
    onRequestReload?: () => void;
}

export const AppContainer: React.FC<AppContainerProps> = ({ agent: initialAgent, onRequestReload }) => {
    const [showLogo, setShowLogo] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [agent, setAgent] = useState<GrokAgent | null>(initialAgent || null);
    const settingsManager = SettingsManager.getInstance();
    
    useEffect(() => {
        // Register built-in commands once on app startup
        registerBuiltinCommands();
        
        // Load settings
        actions.loadSettings();
        
        // Load tools if agent is provided
        if (agent) {
            agent.waitForToolsToLoad().then(() => {
                console.log('Tools loaded successfully');
            }).catch(error => {
                console.error('Failed to load tools:', error);
            });
        }
        
        // Check if settings need configuration
        if (!agent && settingsManager.needsConfiguration()) {
            setShowSettings(true);
            setShowLogo(false);
        }
    }, [agent]);
    
    const handleLogoComplete = () => {
        setShowLogo(false);
        
        // After logo, check if we need settings
        if (!agent) {
            setShowSettings(true);
        }
    };
    
    const handleSettingsComplete = async (settings: Settings) => {
        // Settings have been saved to disk by SettingsScreen
        console.log('\n✅ Settings saved successfully!');
        
        // Create the agent with proper initialization
        try {
            // Get the base URL from provider configuration
            let baseURL: string | undefined;
            if (settings.provider === 'custom') {
                baseURL = settings.customBaseURL;
            } else {
                const providerConfig = ProviderModels[settings.provider || 'grok'];
                baseURL = providerConfig.baseURL;
            }
            
            // Ensure core tools are installed
            const {CoreToolsManager} = await import('../../package-manager/core-tools');
            const coreToolsManager = new CoreToolsManager();
            await coreToolsManager.ensureCoreToolsInstalled();
            
            // Create new agent with all the proper settings
            const newAgent = new GrokAgent({
                apiKey: settings.apiKey,
                baseURL,
                model: settings.model || ProviderModels.grok.defaultModel,
                loadDynamicTools: true
            });
            
            // Wait for tools to load
            await newAgent.waitForToolsToLoad();
            
            // Update the app state
            setAgent(newAgent);
            actions.setAgent(newAgent);
            actions.clearMessages();
            
            // Update store settings
            actions.setModel(settings.model);
            actions.setTheme(settings.theme);
            actions.setAutoEdit(settings.autoEditEnabled);
            actions.setVSCodeOpen(settings.vsCodeOpenEnabled);
            actions.setDangerousBypassPermission(settings.dangerousBypassPermission);
            actions.updateConfirmationSettings(settings.confirmationSettings);
            
            // Hide settings and show logo for normal flow
            setShowSettings(false);
            setShowLogo(true);
            
            console.log('Agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize agent:', error);
            // Keep showing settings on error
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