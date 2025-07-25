import React, { useState, useEffect } from 'react';
import { Box, Text, useFocus, useInput } from 'ink';

export interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    width?: number;
    autoFocus?: boolean;
    filled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    disabled = false,
    width,
    autoFocus = false,
    filled = false
}) => {
    const { isFocused } = useFocus({ autoFocus, isActive: !disabled });
    const [isPressed, setIsPressed] = useState(false);

    // Handle keyboard input
    useInput((input, key) => {
        if (!isFocused || disabled) return;

        // Only space activates button when focused (Enter is handled by Form for submission)
        if (input === ' ') {
            setIsPressed(true);
            setTimeout(() => {
                setIsPressed(false);
                onPress();
            }, 150);
        }
    });

    // Determine colors based on state and variant
    const getColors = () => {
        if (disabled) {
            return {
                borderColor: 'gray',
                textColor: 'gray',
                bgColor: undefined
            };
        }

        if (isPressed) {
            return {
                borderColor: 'white',
                textColor: 'black',
                bgColor: 'white'
            };
        }

        // Handle filled button styling
        if (filled) {
            const filledColors = {
                primary: {
                    borderColor: isFocused ? 'cyan' : 'white',
                    textColor: isFocused ? 'black' : 'white',
                    bgColor: isFocused ? 'cyan' : undefined
                },
                secondary: {
                    borderColor: isFocused ? 'cyan' : 'gray',
                    textColor: isFocused ? 'black' : 'gray',
                    bgColor: isFocused ? 'cyan' : undefined
                },
                danger: {
                    borderColor: isFocused ? 'red' : 'white',
                    textColor: isFocused ? 'white' : 'white',
                    bgColor: isFocused ? 'red' : undefined
                }
            };
            return filledColors[variant];
        }

        const variantColors = {
            primary: {
                borderColor: isFocused ? 'cyan' : 'blue',
                textColor: isFocused ? 'cyan' : 'blue',
                bgColor: undefined
            },
            secondary: {
                borderColor: isFocused ? 'magenta' : 'gray',
                textColor: isFocused ? 'magenta' : 'white',
                bgColor: undefined
            },
            danger: {
                borderColor: isFocused ? 'red' : 'red',
                textColor: isFocused ? 'redBright' : 'red',
                bgColor: undefined
            }
        };

        return variantColors[variant];
    };

    const { borderColor, textColor, bgColor } = getColors();

    const buttonContent = filled && bgColor ? (
        // Filled button - apply background to entire box
        <Box
            borderStyle="round"
            borderColor={borderColor}
            width={width || undefined}
            minWidth={label.length + 6}
        >
            <Text
                color={textColor}
                backgroundColor={bgColor}
                bold={isFocused && !disabled}
            >
                {`  ${label}  `}
            </Text>
        </Box>
    ) : (
        // Regular button - padding without background
        <Box
            borderStyle="round"
            borderColor={borderColor}
            paddingX={2}
            paddingY={0}
            width={width || undefined}
            minWidth={label.length + 6}
        >
            <Text
                color={textColor}
                backgroundColor={bgColor}
                bold={isFocused && !disabled}
            >
                {label}
            </Text>
        </Box>
    );

    // Add focus indicator
    if (isFocused && !disabled) {
        return (
            <Box>
                <Text color={borderColor}>▶ </Text>
                {buttonContent}
            </Box>
        );
    }

    return (
        <Box>
            <Text>  </Text>
            {buttonContent}
        </Box>
    );
};