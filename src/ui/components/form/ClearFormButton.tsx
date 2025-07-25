import React from 'react';
import { FormButton, FormButtonProps } from './FormButton';
import { useForm } from './Form';

export interface ClearFormButtonProps extends Omit<FormButtonProps, 'onPress' | 'type'> {
    onClear?: () => void;
}

export const ClearFormButton: React.FC<ClearFormButtonProps> = ({
    onClear,
    ...props
}) => {
    const { clearForm } = useForm();
    
    const handlePress = () => {
        clearForm();
        onClear?.();
    };
    
    return (
        <FormButton
            {...props}
            onPress={handlePress}
            type="button"
        />
    );
};