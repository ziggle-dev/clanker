import React, { useEffect } from 'react';
import { Select, SelectProps, SelectOption } from './Select';
import { useForm } from './Form';

export interface FormSelectProps extends Omit<SelectProps, 'value' | 'onChange' | 'error' | 'errorMessage' | 'autoFocus'> {
    name: string;
    row?: number;
    column?: number;
    required?: boolean;
    validation?: (value: string) => string | undefined;
    onChange?: (value: string) => void;
}

export const FormSelect: React.FC<FormSelectProps> = ({
    name,
    row = 0,
    column = 0,
    required = false,
    validation,
    options,
    ...selectProps
}) => {
    const { 
        registerField, 
        unregisterField, 
        setValue, 
        values, 
        errors, 
        focusedFieldId,
        setDropdownOpen,
        vimMode,
        blockNextTab,
        setVimMode,
        setHasSearchQuery
    } = useForm();

    // Register field on mount
    useEffect(() => {
        registerField({
            id: name,
            type: 'select',
            row,
            column,
            required,
            validation
        });

        return () => {
            unregisterField(name);
        };
    }, [name, row, column, required, validation, registerField, unregisterField]);
    
    // Set initial value only once when component mounts and options are available
    const hasInitialized = React.useRef(false);
    useEffect(() => {
        if (!hasInitialized.current && values[name] === undefined && options.length > 0) {
            hasInitialized.current = true;
            setValue(name, options[0].value);
        }
    }, [name, options, setValue]); // Don't include values to avoid loops

    const handleChange = (value: string) => {
        setValue(name, value);
        // Call custom onChange if provided
        selectProps.onChange?.(value);
    };

    return (
        <Select
            {...selectProps}
            options={options}
            value={values[name] || options[0]?.value}
            onChange={handleChange}
            error={!!errors[name]}
            errorMessage={errors[name]}
            autoFocus={focusedFieldId === name}
            onDropdownOpen={setDropdownOpen}
            vimMode={vimMode}
            onAutocompleteAccept={blockNextTab}
            onVimModeChange={setVimMode}
            onSearchQueryChange={(hasQuery) => {
                if (focusedFieldId === name) {
                    setHasSearchQuery(hasQuery);
                }
            }}
        />
    );
};