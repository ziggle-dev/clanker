import React from 'react';
import { Box, Text } from 'ink';
import { Form, FormInput, FormToggle, FormButton, useForm } from '../components/form';
import { ConfirmationOptions } from '../../utils/confirmation-service';
import { actions } from '../../store';

interface ToolConfirmationScreenProps {
    options: ConfirmationOptions;
    onConfirm: (result: { confirmed: boolean; feedback?: string; dontAskAgain?: boolean }) => void;
    onReject: (result: { confirmed: boolean; feedback?: string; dontAskAgain?: boolean }) => void;
}

// Separate component to access form context
const ToolConfirmationFormContent: React.FC<{
    options: ConfirmationOptions;
    onCancel: () => void;
}> = ({ options, onCancel }) => {
    const { values } = useForm();
    const isApproved = values.approve || false;
    
    // Determine the border color based on operation type
    // const getBorderColor = () => {
    //     const operation = options.operation.toLowerCase();
    //     if (operation.includes('bash') || operation.includes('execute')) {
    //         return 'red';
    //     } else if (operation.includes('file') || operation.includes('write') || operation.includes('create')) {
    //         return 'yellow';
    //     } else {
    //         return 'cyan';
    //     }
    // };
    
    return (
        <>
            <FormToggle
                name="approve"
                label="Approve this action"
                row={0}
                column={0}
            />
            
            {!isApproved && (
                <FormInput
                    name="feedback"
                    label="Reason for rejection (optional)"
                    placeholder="Enter your concerns or feedback..."
                    row={1}
                    column={0}
                />
            )}
            
            <FormToggle
                name="dontAskAgain"
                label={isApproved ? "Always allow this type of action" : "Never allow this type of action"}
                row={isApproved ? 1 : 2}
                column={0}
            />
            
            <Box 
                flexDirection="row" 
                gap={2} 
                marginTop={2}
                justifyContent="flex-end"
            >
                <FormButton
                    name="cancel"
                    label="Cancel"
                    onPress={onCancel}
                    variant="secondary"
                    row={isApproved ? 2 : 3}
                    column={0}
                />
                <FormButton
                    name="submit"
                    label={isApproved ? "Approve" : "Reject"}
                    type="submit"
                    variant={isApproved ? "primary" : "danger"}
                    filled
                    row={isApproved ? 2 : 3}
                    column={1}
                />
            </Box>
        </>
    );
};

export const ToolConfirmationScreen: React.FC<ToolConfirmationScreenProps> = ({ 
    options, 
    onConfirm, 
    onReject 
}) => {
    const handleSubmit = (values: Record<string, any>) => {
        if (values.approve) {
            // User approved
            onConfirm({
                confirmed: true,
                dontAskAgain: values.dontAskAgain || false
            });
        } else {
            // User rejected with feedback
            onReject({
                confirmed: false,
                feedback: values.feedback || '',
                dontAskAgain: values.dontAskAgain || false
            });
        }
        
        // Close the confirmation screen
        actions.popStage();
    };
    
    const handleCancel = () => {
        // Treat cancel as rejection without feedback
        onReject({
            confirmed: false,
            feedback: 'Cancelled by user'
        });
        actions.popStage();
    };
    
    // Determine the border color based on operation type
    // const getBorderColor = () => {
    //     const operation = options.operation.toLowerCase();
    //     if (operation.includes('bash') || operation.includes('execute')) {
    //         return 'red';
    //     } else if (operation.includes('file') || operation.includes('write') || operation.includes('create')) {
    //         return 'yellow';
    //     } else {
    //         return 'cyan';
    //     }
    // };
    
    return (
        <Box
            width="100%"
            height="100%"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
        >
            <Box
                borderStyle="round"
                borderColor="cyan"
                paddingX={2}
                paddingY={1}
                width={80}
                flexDirection="column"
            >
                <Box marginBottom={1} justifyContent="center">
                    <Text bold color="cyan">
                        Tool Confirmation Required
                    </Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text>Operation: {options.operation}</Text>
                    <Text>File: {options.filename}</Text>
                </Box>
                
                {options.content && (
                    <Box 
                        marginBottom={1}
                        borderStyle="single"
                        borderColor="gray"
                        paddingX={1}
                        paddingY={1}
                        height={10}
                    >
                        <Text color="gray">{options.content}</Text>
                    </Box>
                )}
                
                <Form 
                    onSubmit={handleSubmit} 
                    initialValues={{ 
                        approve: false, 
                        feedback: '',
                        dontAskAgain: false 
                    }}
                >
                    <ToolConfirmationFormContent
                        options={options}
                        onCancel={handleCancel}
                    />
                </Form>
            </Box>
        </Box>
    );
};