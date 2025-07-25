import React, { useState, useEffect } from 'react';
import { Box, Text, useFocus, useInput } from 'ink';
import { SelectDropdown } from './SelectDropdown';

export interface SelectOption {
    label: string;
    value: string;
}

export interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange?: (value: string) => void;
    label?: string;
    width?: number;
    error?: boolean;
    errorMessage?: string;
    autoFocus?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    onDropdownOpen?: (open: boolean) => void;
    vimMode?: 'normal' | 'insert';
    onAutocompleteAccept?: () => void;
    onVimModeChange?: (mode: 'normal' | 'insert') => void;
    onSearchQueryChange?: (hasQuery: boolean) => void;
}

export const Select: React.FC<SelectProps> = ({
    options,
    value,
    onChange,
    label,
    width,
    error = false,
    errorMessage,
    autoFocus = false,
    onFocus,
    onBlur,
    onDropdownOpen,
    vimMode = 'normal',
    onAutocompleteAccept,
    onVimModeChange,
    onSearchQueryChange
}) => {
    const { isFocused } = useFocus({ autoFocus });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Update dropdown state in parent
    useEffect(() => {
        onDropdownOpen?.(showDropdown);
    }, [showDropdown, onDropdownOpen]);
    
    // Update search query state in parent
    useEffect(() => {
        onSearchQueryChange?.(searchQuery.length > 0);
    }, [searchQuery, onSearchQueryChange]);
    
    // Sync selected index with value
    useEffect(() => {
        if (value) {
            const index = options.findIndex(opt => opt.value === value);
            if (index >= 0) {
                setSelectedIndex(index);
            }
        }
    }, [value, options]);
    
    // Handle focus events
    useEffect(() => {
        if (isFocused) {
            onFocus?.();
        } else {
            onBlur?.();
            // Clear search when focus is lost
            setSearchQuery('');
        }
    }, [isFocused, onFocus, onBlur]);
    
    // Find autocomplete match
    const getAutocompleteMatch = () => {
        if (!searchQuery) return null;
        return options.find(opt => 
            opt.label.toLowerCase().startsWith(searchQuery.toLowerCase())
        );
    };

    // Handle keyboard input
    useInput((input, key) => {
        if (!isFocused || options.length === 0) return;
        
        // Don't handle navigation keys if dropdown is open
        if (showDropdown) return;
        
        if (input === ' ' && vimMode === 'normal') {
            // Open dropdown on Space in normal mode
            setShowDropdown(true);
        } else if (key.tab && searchQuery && vimMode === 'insert') {
            // Tab accepts autocomplete in insert mode when there's a search query
            const match = getAutocompleteMatch();
            if (match) {
                const matchIndex = options.findIndex(opt => opt.value === match.value);
                setSelectedIndex(matchIndex);
                onChange?.(match.value);
                setSearchQuery('');
                onAutocompleteAccept?.(); // Block the next Tab navigation
                onVimModeChange?.('normal'); // Switch back to normal mode
                return; // Prevent further processing
            }
        } else if (vimMode === 'insert') {
            // Handle typing in insert mode
            if (key.backspace || key.delete) {
                setSearchQuery(prev => prev.slice(0, -1));
            } else if (input && !key.ctrl && !key.meta && input !== ' ') {
                setSearchQuery(prev => prev + input);
            }
        }
        // Left and right arrows are now handled by the Form for navigation
    }, { isActive: true }); // Make this input handler higher priority
    
    const currentOption = options[selectedIndex] || options[0];
    const borderColor = error ? 'red' : (isFocused ? 'cyan' : 'gray');
    
    // Handle dropdown selection
    const handleDropdownSelect = (selectedValue: string) => {
        const index = options.findIndex(opt => opt.value === selectedValue);
        if (index >= 0) {
            setSelectedIndex(index);
            onChange?.(selectedValue);
        }
    };
    
    // Show dropdown overlay if open
    if (showDropdown && isFocused) {
        return (
            <Box flexDirection="column" width="100%">
                {label && (
                    <Box>
                        <Text color={error ? 'red' : undefined}>{label}</Text>
                    </Box>
                )}
                <SelectDropdown
                    options={options}
                    selectedValue={currentOption?.value}
                    onSelect={handleDropdownSelect}
                    onClose={() => setShowDropdown(false)}
                    width={width}
                />
            </Box>
        );
    }
    
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
                alignItems="center"
            >
                {isFocused && <Text color="cyan">❯ </Text>}
                {!isFocused && <Text>  </Text>}
                <Box flexGrow={1} justifyContent="space-between" flexDirection="row">
                    {searchQuery && vimMode === 'insert' ? (
                        <Box>
                            <Text>{searchQuery}</Text>
                            {(() => {
                                const match = getAutocompleteMatch();
                                if (match && match.label.toLowerCase().startsWith(searchQuery.toLowerCase())) {
                                    const suggestion = match.label.slice(searchQuery.length);
                                    return <Text dimColor>{suggestion}</Text>;
                                }
                                return null;
                            })()}
                        </Box>
                    ) : (
                        <Text>{currentOption?.label || ''}</Text>
                    )}
                    <Box flexGrow={1} />
                </Box>
            </Box>
            {error && errorMessage && (
                <Box marginTop={1}>
                    <Text color="red" italic>{errorMessage}</Text>
                </Box>
            )}
        </Box>
    );
};