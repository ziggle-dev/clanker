import React, { useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import { useSnapshot } from 'valtio';
import { store, actions } from '../../store';
import { StageType } from './types';
import { ChatContainer } from '../containers/ChatContainer';
import { CommandPaletteScreen } from '../screens/CommandPaletteScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { ModalScreen } from '../screens/ModalScreen';
import { GrokAgent } from '../../clanker/agent';
import { StatusBar } from '../components/chat/StatusBar';

interface StageRouterProps {
    agent: GrokAgent;
}

export const StageRouter: React.FC<StageRouterProps> = ({ agent }) => {
    const snap = useSnapshot(store);
    const currentStage = snap.stageStack[snap.stageStack.length - 1];
    const { exit } = useApp();
    
    // Global Ctrl+C handler
    const handleCtrlC = useCallback(() => {
        const now = Date.now();

        if (snap.exitConfirmation && snap.exitConfirmationTime && (now - snap.exitConfirmationTime) < 3000) {
            // Second Ctrl+C within 3 seconds - exit
            exit();
            setTimeout(() => process.exit(0), 100);
        } else {
            // First Ctrl+C or after timeout
            // Clear input when in chat stage
            if (currentStage.type === StageType.CHAT && snap.inputValue.trim()) {
                actions.setInputValue("");
            }
            actions.setExitConfirmation(true);
            setTimeout(() => actions.setExitConfirmation(false), 3000);
        }
    }, [snap.exitConfirmation, snap.exitConfirmationTime, snap.inputValue, currentStage.type, exit]);
    
    // Global keyboard input handler
    useInput((inputChar: string, key: { [key: string]: boolean }) => {
        // Skip if we're in the chat container (it has its own handler)
        if (currentStage.type === StageType.CHAT) return;
        
        // Check for Ctrl+C (ETX character, code 3)
        if (inputChar.charCodeAt(0) === 3) {
            handleCtrlC();
        }
    });
    
    const renderStage = () => {
        switch (currentStage.type) {
            case StageType.CHAT:
                return <ChatContainer agent={agent} />;
                
            case StageType.COMMAND_PALETTE:
                return <CommandPaletteScreen />;
                
            case StageType.SETTINGS:
                return <SettingsScreen 
                    onComplete={(settings) => {
                        // Handle settings update
                        actions.popStage();
                    }}
                    onCancel={() => actions.popStage()}
                />;
                
            case StageType.HELP:
                return <HelpScreen />;
                
            case StageType.MODAL:
                return <ModalScreen {...currentStage.props} />;
                
            default:
                return <ChatContainer agent={agent} />;
        }
    };
    
    return (
        <Box width="100%" height="100%" flexDirection="column">
            <Box flexGrow={1}>
                {renderStage()}
            </Box>
            {/* Show status bar on all screens except chat (which has its own) */}
            {currentStage.type !== StageType.CHAT && (
                <Box>
                    <StatusBar />
                </Box>
            )}
        </Box>
    );
};