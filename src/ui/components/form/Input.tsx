import React, {useState, useEffect, useRef} from 'react';
import {Box, Text, useFocus, useInput} from 'ink';

export interface InputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    width?: number;
    password?: boolean;
    error?: boolean;
    errorMessage?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    autoFocus?: boolean;
    readOnly?: boolean;
}

export const Input: React.FC<InputProps> = ({
                                                value,
                                                onChange,
                                                placeholder = '',
                                                label,
                                                width,
                                                password = false,
                                                error = false,
                                                errorMessage,
                                                onFocus,
                                                onBlur,
                                                autoFocus = false,
                                                readOnly = false
                                            }) => {
    const {isFocused} = useFocus({autoFocus});
    const [cursorPosition, setCursorPosition] = useState(value.length);
    const [showCursor, setShowCursor] = useState(true);
    const [showPlaceholder, setShowPlaceholder] = useState(true);

    // Handle focus events
    useEffect(() => {
        if (isFocused) {
            onFocus?.();
            setShowPlaceholder(false); // Show placeholder when focused
        } else {
            onBlur?.();
            if (!value) {
                setShowPlaceholder(true); // Show placeholder when not focused and no value
            }
        }
    }, [isFocused, onFocus, onBlur]);

    // Cursor and placeholder blink effect
    useEffect(() => {
        if (isFocused) {
            const interval = setInterval(() => {
                setShowCursor(prev => !prev);
                // Only blink placeholder when there's no value
                if (!value) {
                    setShowPlaceholder(prev => !prev);
                }
            }, 500);
            return () => clearInterval(interval);
        } else {
            setShowCursor(false);
            setShowPlaceholder(true);
        }
    }, [isFocused, value]);

    // Handle keyboard input
    useInput((input, key) => {
        if (!isFocused) return;

        if (key.leftArrow) {
            setCursorPosition(Math.max(0, cursorPosition - 1));
        } else if (key.rightArrow) {
            setCursorPosition(Math.min(value.length, cursorPosition + 1));
        } else if (!readOnly && (key.backspace || key.delete)) {
            if (cursorPosition > 0) {
                const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
                onChange(newValue);
                setCursorPosition(cursorPosition - 1);
            }
        } else if (!readOnly && input && !key.ctrl && !key.meta) {
            const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
            onChange(newValue);
            setCursorPosition(cursorPosition + input.length);
        }
    });

    // Update cursor position when value changes externally
    useEffect(() => {
        setCursorPosition(value.length);
    }, [value]);

    // Render the display value with cursor
    const renderValue = () => {
        const displayValue = password ? '•'.repeat(value.length) : value;

        // Show placeholder when no value
        if (!displayValue && !isFocused) {
            return <Text color="gray">{placeholder}</Text>;
        }

        if (!displayValue && isFocused) {
            // Blinking placeholder with cursor
            return (
                <>
                    {showPlaceholder && <Text color="gray">{placeholder}</Text>}
                    {showCursor && !showPlaceholder && <Text inverse> </Text>}
                </>
            );
        }

        // Show value with cursor when focused
        if (isFocused && showCursor) {
            const beforeCursor = displayValue.slice(0, cursorPosition);
            const afterCursor = displayValue.slice(cursorPosition);

            return (
                <>
                    {beforeCursor}
                    <Text inverse> </Text>
                    {afterCursor}
                </>
            );
        }

        return displayValue;
    };

    // Determine border color
    const borderColor = error ? 'red' : (isFocused ? 'cyan' : 'gray');

    return (
        <Box flexDirection="column" width="100%">
            {label && (
                <Box>
                    <Text color={error ? 'red' : undefined}>{label}</Text>
                </Box>
            )}
            <Box
                borderStyle="single"
                borderColor={borderColor}
                width="100%"
                paddingX={1}
                flexDirection="row"
            >
                {isFocused && <Text color="cyan">❯ </Text>}
                {!isFocused && <Text> </Text>}
                <Text>
                    {renderValue()}
                </Text>
            </Box>
            {error && errorMessage && (
                <Box marginTop={1}>
                    <Text color="red" italic>{errorMessage}</Text>
                </Box>
            )}
        </Box>
    );
};