import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ModalOptions, ModalResult } from '../stage/types';

interface ModalProps extends ModalOptions {
    onSubmit: (result: ModalResult) => void;
}

export const Modal: React.FC<ModalProps> = ({ title, message, options, onSubmit }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    useInput((input, key) => {
        // Escape key does not close the modal - use a cancel button instead
        
        if (key.upArrow || input === 'k') {
            setSelectedIndex(prev => prev > 0 ? prev - 1 : options.length - 1);
        } else if (key.downArrow || input === 'j') {
            setSelectedIndex(prev => (prev + 1) % options.length);
        } else if (key.return || input === ' ') {
            onSubmit({ 
                selected: options[selectedIndex].value, 
                cancelled: false 
            });
        }
    });
    
    return (
        <Box
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
        >
            <Box
                borderStyle="round"
                borderColor="cyan"
                paddingX={2}
                paddingY={1}
                minWidth={40}
                flexDirection="column"
            >
                <Box marginBottom={1} justifyContent="center">
                    <Text bold color="cyan">{title}</Text>
                </Box>
                
                {message && (
                    <Box marginBottom={1}>
                        <Text>{message}</Text>
                    </Box>
                )}
                
                <Box flexDirection="column" marginTop={1}>
                    {options.map((option, index) => {
                        const isSelected = index === selectedIndex;
                        const color = option.variant === 'danger' ? 'red' : 
                                     option.variant === 'primary' ? 'cyan' : 
                                     'white';
                        
                        return (
                            <Box key={option.value} paddingY={0}>
                                <Text color={isSelected ? color : 'gray'}>
                                    {isSelected ? '▶ ' : '  '}
                                    {option.label}
                                </Text>
                            </Box>
                        );
                    })}
                </Box>
                
                <Box marginTop={1}>
                    <Text dimColor>↑↓ Navigate • Enter/Space Select</Text>
                </Box>
            </Box>
        </Box>
    );
};