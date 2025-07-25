import React from 'react';
import { Modal } from '../components/Modal';
import { ModalOptions, ModalResult } from '../stage/types';
import { actions } from '../../store';

interface ModalScreenProps extends ModalOptions {
    onResult?: (result: ModalResult) => void;
}

export const ModalScreen: React.FC<ModalScreenProps> = ({ 
    title, 
    message, 
    options,
    onResult 
}) => {
    const handleSubmit = (result: ModalResult) => {
        // Call the callback if provided
        if (onResult) {
            onResult(result);
        }
        
        // Pop the modal from the stage stack
        actions.popStage();
    };
    
    return (
        <Modal
            title={title}
            message={message}
            options={options}
            onSubmit={handleSubmit}
        />
    );
};