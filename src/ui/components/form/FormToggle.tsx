import React, { useEffect } from 'react';
import { Toggle, ToggleProps } from './Toggle';
import { useForm } from './Form';

export interface FormToggleProps extends Omit<ToggleProps, 'value' | 'onChange' | 'autoFocus'> {
    name: string;
    row?: number;
    column?: number;
}

export const FormToggle: React.FC<FormToggleProps> = ({
    name,
    row = 0,
    column = 0,
    ...toggleProps
}) => {
    const { 
        registerField, 
        unregisterField, 
        setValue, 
        values, 
        focusedFieldId
    } = useForm();

    useEffect(() => {
        registerField({
            id: name,
            type: 'toggle',
            row,
            column
        });

        return () => {
            unregisterField(name);
        };
    }, [name, row, column, registerField, unregisterField]);

    const handleChange = (value: boolean) => {
        setValue(name, value);
    };

    return (
        <Toggle
            {...toggleProps}
            value={values[name] || false}
            onChange={handleChange}
            autoFocus={focusedFieldId === name}
        />
    );
};