import React from 'react';
import { Modal } from '../components/Modal';
import { ModalOption } from '../stage/types';
import { actions } from '../../store';
import { useApp } from 'ink';

export const ExitConfirmationModal: React.FC = () => {
    const { exit } = useApp();
    
    const options: ModalOption[] = [
        { label: 'Cancel', value: 'cancel', variant: 'secondary' },
        { label: 'Exit', value: 'exit', variant: 'danger' }
    ];
    
    const handleSubmit = (result: { selected: string; cancelled: boolean }) => {
        if (result.selected === 'exit') {
            // Exit the application
            exit();
            setTimeout(() => process.exit(0), 100);
        } else {
            // Pop the modal and clear any input
            actions.popStage();
            actions.setInputValue("");
        }
    };
    
    return (
        <Modal
            title="Exit Confirmation"
            message="Are you sure you want to exit?"
            options={options}
            onSubmit={handleSubmit}
        />
    );
};