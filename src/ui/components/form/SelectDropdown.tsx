import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectOption } from './Select';

export interface SelectDropdownProps {
    options: SelectOption[];
    selectedValue?: string;
    onSelect: (value: string) => void;
    onClose: () => void;
    maxHeight?: number;
    width?: number | string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
    options,
    selectedValue,
    onSelect,
    onClose,
    maxHeight = 10,
    width
}) => {
    const [highlightedIndex, setHighlightedIndex] = useState(() => {
        const index = options.findIndex(opt => opt.value === selectedValue);
        return index >= 0 ? index : 0;
    });

    // Handle keyboard input
    useInput((input, key) => {
        if (key.escape) {
            onClose();
            return;
        }

        if (key.upArrow || input === 'k') {
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
        } else if (key.downArrow || input === 'j') {
            setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
        } else if (key.return || input === ' ') {
            onSelect(options[highlightedIndex].value);
            onClose();
        }
    });

    // Ensure highlighted item is visible
    const visibleStart = Math.max(0, highlightedIndex - Math.floor(maxHeight / 2));
    const visibleEnd = Math.min(options.length, visibleStart + maxHeight);
    const visibleOptions = options.slice(visibleStart, visibleEnd);

    return (
        <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="cyan"
            paddingX={1}
            paddingY={0}
            width="100%"
        >
            {visibleStart > 0 && (
                <Text dimColor>↑ {visibleStart} more...</Text>
            )}
            
            {visibleOptions.map((option, index) => {
                const actualIndex = visibleStart + index;
                const isHighlighted = actualIndex === highlightedIndex;
                const isSelected = option.value === selectedValue;

                return (
                    <Box key={option.value} paddingX={0} width="100%">
                        <Text
                            color={isHighlighted ? 'black' : isSelected ? 'cyan' : undefined}
                            backgroundColor={isHighlighted ? 'cyan' : undefined}
                            bold={isSelected}
                            wrap="truncate"
                        >
                            {isHighlighted ? '❯ ' : '  '}
                            {option.label}
                            {isSelected && !isHighlighted ? ' ✓' : ''}
                        </Text>
                    </Box>
                );
            })}
            
            {visibleEnd < options.length && (
                <Text dimColor>↓ {options.length - visibleEnd} more...</Text>
            )}
        </Box>
    );
};