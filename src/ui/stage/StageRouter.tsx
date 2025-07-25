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
        <Box width="100%" height="100%">
            {renderStage()}
        </Box>
    );
};