import React from 'react';
import { Box } from 'ink';
import { Button } from './Button';
import { useForm } from './Form';

export interface FormActionButtonsProps {
    onSave?: () => void;
    onClear?: () => void;
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = ({
    onSave,
    onClear
}) => {
    const { submitForm, clearForm } = useForm();
    
    const handleSave = () => {
        submitForm();
        onSave?.();
    };
    
    const handleClear = () => {
        clearForm();
        onClear?.();
    };
    
    return (
        <Box flexDirection="row" gap={2}>
            <Button
                label="Clear Form"
                onPress={handleClear}
                variant="secondary"
            />
            <Button
                label="Save Settings"
                onPress={handleSave}
                variant="primary"
            />
        </Box>
    );
};