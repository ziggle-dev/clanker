import React, { useEffect } from 'react';
import { Button, ButtonProps } from './Button';
import { useForm } from './Form';

export interface FormButtonProps extends Omit<ButtonProps, 'onPress' | 'autoFocus'> {
    name: string;
    row?: number;
    column?: number;
    type?: 'submit' | 'button';
    onPress?: () => void;
}

export const FormButton: React.FC<FormButtonProps> = ({
    name,
    row = 0,
    column = 0,
    type = 'button',
    onPress,
    ...buttonProps
}) => {
    const { 
        registerField, 
        unregisterField, 
        focusedFieldId,
        submitForm,
        isSubmitting
    } = useForm();

    useEffect(() => {
        registerField({
            id: name,
            type: 'button',
            row,
            column
        });

        return () => {
            unregisterField(name);
        };
    }, [name, row, column, registerField, unregisterField]);

    const handlePress = () => {
        if (type === 'submit') {
            submitForm();
        } else if (onPress) {
            onPress();
        }
    };

    return (
        <Button
            {...buttonProps}

            onPress={handlePress}
            autoFocus={focusedFieldId === name}
            disabled={buttonProps.disabled || (type === 'submit' && isSubmitting)}
        />
    );
};