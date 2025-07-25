import React from 'react';
import { Box, Text, useInput } from 'ink';

interface CommandFormProps {
    onCancel: () => void;
    onExecute: (commandName: string, args: Record<string, any>) => void;
}

export const CommandForm: React.FC<CommandFormProps> = ({ onCancel, onExecute }) => {
    // Handle escape key
    useInput((input, key) => {
        if (key.escape) {
            onCancel();
        }
        if (key.return) {
            onExecute('clear', {});
        }
    });
    
    return (
        <Box
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            paddingTop={2}
            paddingBottom={2}
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
                    <Text bold color="cyan">Command Palette (Static Test)</Text>
                </Box>
                
                <Text>Press Enter to execute 'clear' command</Text>
                <Text>Press Escape to cancel</Text>
            </Box>
        </Box>
    );
};