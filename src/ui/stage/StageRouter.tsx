import React, { useCallback } from 'react';
import { Box, useInput } from 'ink';
import { useSnapshot } from 'valtio';
import { store, actions } from '../../store';
import { StageType } from './types';
import { ChatContainer } from '../containers/ChatContainer';
import { CommandPaletteScreen } from '../screens/CommandPaletteScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { ModalScreen } from '../screens/ModalScreen';
import { ExitConfirmationModal } from '../screens/ExitConfirmationModal';
import { GrokAgent } from '../../clanker/agent';
import { StatusBar } from '../components/chat/StatusBar';

interface StageRouterProps {
    agent: GrokAgent;
}

export const StageRouter: React.FC<StageRouterProps> = ({ agent }) => {
    const snap = useSnapshot(store);
    const currentStage = snap.stageStack[snap.stageStack.length - 1];
    
    // Global Ctrl+C handler
    const handleCtrlC = useCallback(() => {
        // Show exit confirmation modal
        actions.pushStage({ id: 'exit-confirmation', type: StageType.EXIT_CONFIRMATION });
    }, []);
    
    // Global keyboard input handler
    useInput((inputChar: string, key: { [key: string]: boolean }) => {
        // Skip if we're in the chat container (it has its own handler)
        if (currentStage.type === StageType.CHAT) return;
        
        // Check for Ctrl+C (ETX character, code 3)
        if (inputChar.charCodeAt(0) === 3 || (key.ctrl && inputChar === 'c')) {
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
                
            case StageType.EXIT_CONFIRMATION:
                return <ExitConfirmationModal />;
                
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