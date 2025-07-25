import React from 'react';
import { Box, Text } from 'ink';
import { useForm } from './Form';

export const VimModeIndicator: React.FC = () => {
    const { vimMode } = useForm();
    
    return (
        <Box 
            borderStyle="round"
            borderColor={vimMode === 'insert' ? 'green' : 'yellow'}
            paddingX={1}
        >
            <Text 
                color={vimMode === 'insert' ? 'green' : 'yellow'}
                bold
            >
                {vimMode === 'insert' ? 'INSERT' : 'NORMAL'}
            </Text>
        </Box>
    );
};