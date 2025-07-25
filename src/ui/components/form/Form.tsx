import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Box, Text, useInput } from 'ink';

interface FormField {
    id: string;
    type: 'input' | 'button' | 'checkbox' | 'select' | 'toggle';
    row: number;
    column: number;
    required?: boolean;
    validation?: (value: any) => string | undefined;
}

interface FormContextValue {
    fields: FormField[];
    values: Record<string, any>;
    errors: Record<string, string>;
    focusedFieldId: string | null;
    registerField: (field: FormField) => void;
    unregisterField: (id: string) => void;
    setValue: (id: string, value: any) => void;
    setError: (id: string, error: string | undefined) => void;
    focusField: (id: string) => void;
    submitForm: () => void;
    isSubmitting: boolean;
    dropdownOpen: boolean;
    setDropdownOpen: (open: boolean) => void;
    vimMode: 'normal' | 'insert';
    setVimMode: (mode: 'normal' | 'insert') => void;
    blockNextTab: () => void;
    shouldBlockTab: boolean;
    setHasSearchQuery: (hasQuery: boolean) => void;
    clearForm: () => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export const useForm = () => {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error('useForm must be used within a Form component');
    }
    return context;
};

export interface FormProps {
    onSubmit: (values: Record<string, any>) => void | Promise<void>;
    initialValues?: Record<string, any>;
    children: ReactNode;
    layout?: 'vertical' | 'horizontal';
}

export const Form: React.FC<FormProps> = ({
    onSubmit,
    initialValues = {},
    children,
    layout = 'vertical'
}) => {
    const [fields, setFields] = useState<FormField[]>([]);
    const [values, setValues] = useState<Record<string, any>>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [vimMode, setVimMode] = useState<'normal' | 'insert'>('normal');
    const [shouldBlockTab, setShouldBlockTab] = useState(false);
    const [hasSearchQuery, setHasSearchQuery] = useState(false);

    // Register/unregister fields
    const registerField = useCallback((field: FormField) => {
        setFields(prev => {
            // Remove existing field with same id and add the new one
            const filtered = prev.filter(f => f.id !== field.id);
            return [...filtered, field].sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                return a.column - b.column;
            });
        });
    }, []);

    const unregisterField = useCallback((id: string) => {
        setFields(prev => prev.filter(f => f.id !== id));
    }, []);

    // Value and error management
    const setValue = useCallback((id: string, value: any) => {
        setValues(prev => ({ ...prev, [id]: value }));
        // Clear error when value changes
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[id];
            return newErrors;
        });
    }, []);

    const setError = useCallback((id: string, error: string | undefined) => {
        if (error) {
            setErrors(prev => ({ ...prev, [id]: error }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    }, []);

    // Focus management
    const focusField = useCallback((id: string) => {
        setFocusedFieldId(id);
    }, []);

    // Find next/previous field for navigation
    const getNextField = (currentId: string, direction: 'next' | 'prev' | 'up' | 'down' | 'left' | 'right') => {
        const sortedFields = [...fields].sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.column - b.column;
        });

        const currentIndex = sortedFields.findIndex(f => f.id === currentId);
        if (currentIndex === -1) return null;

        const currentField = sortedFields[currentIndex];

        switch (direction) {
            case 'next': {
                const nextIndex = (currentIndex + 1) % sortedFields.length;
                return sortedFields[nextIndex];
            }
            case 'prev': {
                const prevIndex = currentIndex === 0 ? sortedFields.length - 1 : currentIndex - 1;
                return sortedFields[prevIndex];
            }
            case 'up': {
                // Find fields in the previous row
                const prevRowFields = sortedFields.filter(f => f.row === currentField.row - 1);
                if (prevRowFields.length === 0) {
                    // No previous row, wrap to last row
                    const lastRow = Math.max(...sortedFields.map(f => f.row));
                    const lastRowFields = sortedFields.filter(f => f.row === lastRow);
                    // Find closest column
                    return lastRowFields.sort((a, b) => 
                        Math.abs(a.column - currentField.column) - Math.abs(b.column - currentField.column)
                    )[0] || null;
                }
                // Find field with closest column
                return prevRowFields.sort((a, b) => 
                    Math.abs(a.column - currentField.column) - Math.abs(b.column - currentField.column)
                )[0] || null;
            }
            case 'down': {
                // Find fields in the next row
                const nextRowFields = sortedFields.filter(f => f.row === currentField.row + 1);
                if (nextRowFields.length === 0) {
                    // No next row, wrap to first row
                    const firstRowFields = sortedFields.filter(f => f.row === 0);
                    // Find closest column
                    return firstRowFields.sort((a, b) => 
                        Math.abs(a.column - currentField.column) - Math.abs(b.column - currentField.column)
                    )[0] || null;
                }
                // Find field with closest column
                return nextRowFields.sort((a, b) => 
                    Math.abs(a.column - currentField.column) - Math.abs(b.column - currentField.column)
                )[0] || null;
            }
            case 'left': {
                // Find all fields in same row
                const sameRowFields = sortedFields.filter(f => f.row === currentField.row);
                if (sameRowFields.length <= 1) return null; // Only current field in row
                
                // Find previous field in same row
                const currentIndexInRow = sameRowFields.findIndex(f => f.id === currentId);
                const prevIndex = currentIndexInRow === 0 ? sameRowFields.length - 1 : currentIndexInRow - 1;
                return sameRowFields[prevIndex];
            }
            case 'right': {
                // Find all fields in same row
                const sameRowFields = sortedFields.filter(f => f.row === currentField.row);
                if (sameRowFields.length <= 1) return null; // Only current field in row
                
                // Find next field in same row
                const currentIndexInRow = sameRowFields.findIndex(f => f.id === currentId);
                const nextIndex = (currentIndexInRow + 1) % sameRowFields.length;
                return sameRowFields[nextIndex];
            }
            default:
                return null;
        }
    };

    // Function to block next tab
    const blockNextTab = useCallback(() => {
        setShouldBlockTab(true);
        // Clear the block after a longer delay to ensure it catches the Tab
        setTimeout(() => setShouldBlockTab(false), 250);
    }, []);

    // Handle keyboard navigation with high priority
    useInput((input, key) => {
        // Handle Tab blocking
        if (key.tab && shouldBlockTab) {
            setShouldBlockTab(false);
            return; // Consume the Tab key
        }
        
        // Prevent Tab navigation entirely in vim mode
        if (key.tab && !key.shift) {
            return; // Consume all Tab keys
        }

        // Handle ESC to go back to normal mode from anywhere
        if (key.escape) {
            setVimMode('normal');
            return;
        }

        if (!focusedFieldId) {
            // Don't handle input if no field is focused
            return;
        }

        // If dropdown is open, don't handle navigation keys
        if (dropdownOpen) {
            return;
        }

        // Handle vim mode switching
        if (vimMode === 'normal') {
            if (input === 'i') {
                setVimMode('insert');
                return;
            }
            
            // Navigation only works in normal mode
            if (key.upArrow || input === 'k') {
                const nextField = getNextField(focusedFieldId, 'up');
                if (nextField) {
                    setFocusedFieldId(nextField.id);
                }
            } else if (key.downArrow || input === 'j') {
                const nextField = getNextField(focusedFieldId, 'down');
                if (nextField) {
                    setFocusedFieldId(nextField.id);
                }
            } else if (key.leftArrow || input === 'h') {
                const nextField = getNextField(focusedFieldId, 'left');
                if (nextField) {
                    setFocusedFieldId(nextField.id);
                }
            } else if (key.rightArrow || input === 'l') {
                const nextField = getNextField(focusedFieldId, 'right');
                if (nextField) {
                    setFocusedFieldId(nextField.id);
                }
            }
        }

        // Enter key always submits the form
        if (key.return) {
            submitForm();
            return;
        }
    }, { isActive: true }); // High priority to intercept Tab before Ink's focus system

    // Form submission
    const submitForm = useCallback(async () => {
        // Validate all fields
        const newErrors: Record<string, string> = {};
        let hasErrors = false;

        for (const field of fields) {
            if (field.required && !values[field.id]) {
                newErrors[field.id] = 'This field is required';
                hasErrors = true;
            } else if (field.validation) {
                const error = field.validation(values[field.id]);
                if (error) {
                    newErrors[field.id] = error;
                    hasErrors = true;
                }
            }
        }

        setErrors(newErrors);

        if (hasErrors) {
            // Focus first error field
            const firstErrorField = fields.find(f => newErrors[f.id]);
            if (firstErrorField) {
                setFocusedFieldId(firstErrorField.id);
            }
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(values);
        } finally {
            setIsSubmitting(false);
        }
    }, [fields, values, onSubmit]);
    
    // Clear form
    const clearForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setHasSearchQuery(false);
        // Reset to first field
        if (fields.length > 0) {
            setFocusedFieldId(fields[0].id);
        }
    }, [initialValues, fields]);

    // Set initial focus
    useEffect(() => {
        if (!focusedFieldId && fields.length > 0) {
            // Fields are already sorted in registerField
            setFocusedFieldId(fields[0].id);
        }
    }, [fields.length]); // Only depend on length to avoid re-focusing

    const contextValue: FormContextValue = {
        fields,
        values,
        errors,
        focusedFieldId,
        registerField,
        unregisterField,
        setValue,
        setError,
        focusField,
        submitForm,
        isSubmitting,
        dropdownOpen,
        setDropdownOpen,
        vimMode,
        setVimMode,
        blockNextTab,
        shouldBlockTab,
        setHasSearchQuery,
        clearForm
    };

    // Determine which tip to show
    const focusedField = fields.find(f => f.id === focusedFieldId);
    const isSelectFocused = focusedField?.type === 'select';
    const isInputFocused = focusedField?.type === 'input';
    const isButtonFocused = focusedField?.type === 'button';
    
    let contextualTip = '';
    if (dropdownOpen) {
        contextualTip = '↑↓/jk Nav • Space/Enter Select • ESC Cancel';
    } else if (isSelectFocused && vimMode === 'insert' && hasSearchQuery) {
        contextualTip = 'Type to search • Tab: complete';
    } else if (isSelectFocused && vimMode === 'normal') {
        contextualTip = 'Space: dropdown';
    } else if (isInputFocused && vimMode === 'normal') {
        contextualTip = 'i: insert mode';
    } else if (isButtonFocused) {
        contextualTip = 'Space/Enter: select';
    } else {
        contextualTip = '↑↓←→/hjkl: move • Enter: save';
    }

    return (
        <FormContext.Provider value={contextValue}>
            <Box flexDirection="column" width="100%">
                {/* Top corners - tip on right, vim mode on left */}
                <Box flexDirection="row" justifyContent="space-between" marginBottom={-1}>
                    {/* Vim mode indicator outside top left */}
                    <Box 
                        borderStyle="round"
                        borderColor="gray"
                        paddingX={1}
                        marginLeft={2}
                    >
                        <Text dimColor>mode: {vimMode}</Text>
                    </Box>
                    
                    {/* Contextual tip box outside top right */}
                    <Box 
                        borderStyle="round"
                        borderColor="gray"
                        paddingX={1}
                        marginRight={2}
                    >
                        <Text dimColor>{contextualTip}</Text>
                    </Box>
                </Box>
                
                <Box 
                    borderStyle="round"
                    borderColor="gray"
                    paddingX={2}
                    paddingY={1}
                    flexDirection="column"
                >
                    {children}
                </Box>
            </Box>
        </FormContext.Provider>
    );
};