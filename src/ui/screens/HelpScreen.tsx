import React from 'react';
import { Box, Text, useInput } from 'ink';
import { actions } from '../../store';

export const HelpScreen: React.FC = () => {
    useInput((input, key) => {
        if (key.escape || key.return) {
            actions.popStage();
        }
    });
    
    return (
        <Box
            width="100%"
            height="100%"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
        >
            <Box
                borderStyle="round"
                borderColor="cyan"
                paddingX={2}
                paddingY={1}
                width={60}
                flexDirection="column"
            >
                <Box marginBottom={1} justifyContent="center">
                    <Text bold color="cyan">Help</Text>
                </Box>
                
                <Text>Commands:</Text>
                <Text>  /clear - Clear chat history</Text>
                <Text>  /theme - Change theme</Text>
                <Text>  /model - Switch AI model</Text>
                <Text>  /settings - Open settings</Text>
                <Text>  /help - Show this help</Text>
                
                <Box marginTop={1}>
                    <Text dimColor>Press Enter or ESC to close</Text>
                </Box>
            </Box>
        </Box>
    );
};