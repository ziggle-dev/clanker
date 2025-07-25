import React, { useEffect } from 'react';
import { Input, InputProps } from './Input';
import { useForm } from './Form';

export interface FormInputProps extends Omit<InputProps, 'value' | 'onChange' | 'error' | 'errorMessage' | 'autoFocus'> {
    name: string;
    row?: number;
    column?: number;
    required?: boolean;
    validation?: (value: string) => string | undefined;
}

export const FormInput: React.FC<FormInputProps> = ({
    name,
    row = 0,
    column = 0,
    required = false,
    validation,
    ...inputProps
}) => {
    const { 
        registerField, 
        unregisterField, 
        setValue, 
        values, 
        errors, 
        focusedFieldId,
        vimMode
    } = useForm();

    useEffect(() => {
        registerField({
            id: name,
            type: 'input',
            row,
            column,
            required,
            validation
        });

        return () => {
            unregisterField(name);
        };
    }, [name, row, column, required, validation, registerField, unregisterField]);

    const handleChange = (value: string) => {
        setValue(name, value);
    };

    return (
        <Input
            {...inputProps}
            value={values[name] || ''}
            onChange={handleChange}
            error={!!errors[name]}
            errorMessage={errors[name]}
            autoFocus={focusedFieldId === name}
            readOnly={vimMode === 'normal'}
        />
    );
};