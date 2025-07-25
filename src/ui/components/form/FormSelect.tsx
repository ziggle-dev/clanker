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

    useEffect(() => {
        registerField({
            id: name,
            type: 'select',
            row,
            column,
            required,
            validation
        });

        // Set initial value if not set
        if (!values[name] && options.length > 0) {
            setValue(name, options[0].value);
        }

        return () => {
            unregisterField(name);
        };
    }, [name, row, column, required, validation, registerField, unregisterField, options, setValue, values]);

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