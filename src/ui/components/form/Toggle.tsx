import React from 'react';
import { Box, Text, useFocus, useInput } from 'ink';

export interface ToggleProps {
    value?: boolean;
    onChange?: (value: boolean) => void;
    label?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
}

export const Toggle: React.FC<ToggleProps> = ({
    value = false,
    onChange,
    label,
    disabled = false,
    autoFocus = false
}) => {
    const { isFocused } = useFocus({ 
        autoFocus, 
        isActive: !disabled
    });

    // Handle keyboard input
    useInput((input, key) => {
        if (!isFocused || disabled) return;

        // Space toggles the value
        if (input === ' ' || key.return) {
            onChange?.(!value);
        }
    });

    const borderColor = isFocused ? 'cyan' : 'gray';
    const textColor = disabled ? 'gray' : (isFocused ? 'cyan' : 'white');

    return (
        <Box flexDirection="column" width="100%">
            {label && (
                <Box>
                    <Text color={disabled ? 'gray' : undefined}>{label}</Text>
                </Box>
            )}
            <Box
                borderStyle="round"
                borderColor={borderColor}
                paddingX={1}
                width={10}
                justifyContent="center"
            >
                <Text color={textColor} bold={isFocused}>
                    {value ? '[✓]' : '[ ]'}
                </Text>
            </Box>
        </Box>
    );
};