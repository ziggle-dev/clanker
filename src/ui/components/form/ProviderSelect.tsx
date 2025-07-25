import React from 'react';
import { FormSelect, FormSelectProps } from './FormSelect';
import { useForm } from './Form';
import { Provider, ProviderModels } from '../../../utils/settings-manager';

export interface ProviderSelectProps extends FormSelectProps {
    onProviderChange?: (provider: Provider) => void;
}

export const ProviderSelect: React.FC<ProviderSelectProps> = ({
    onProviderChange,
    ...props
}) => {
    const { setValue } = useForm();

    const handleChange = (value: string) => {
        const provider = value as Provider;
        
        // Update the model to the default for this provider
        const providerConfig = ProviderModels[provider];
        if (providerConfig && providerConfig.defaultModel) {
            setValue('model', providerConfig.defaultModel);
        }
        
        // Call the parent's change handler
        if (onProviderChange) {
            onProviderChange(provider);
        }
    };

    return (
        <FormSelect
            {...props}
            onChange={handleChange}
        />
    );
};