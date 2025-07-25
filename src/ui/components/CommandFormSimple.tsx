import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { 
    Form, 
    FormSelect, 
    FormButton, 
    SelectOption 
} from './form';
import { getCommandRegistry } from '../../commands/registry';

interface CommandFormProps {
    onCancel: () => void;
    onExecute: (commandName: string, args: Record<string, any>) => void;
}

export const CommandForm: React.FC<CommandFormProps> = ({ onCancel, onExecute }) => {
    const registry = getCommandRegistry();
    
    // Get command options for the select
    const commandOptions: SelectOption[] = useMemo(() => 
        registry.list().map(cmd => ({
            value: cmd.name,
            label: `${cmd.name} - ${cmd.description}`
        })),
        []
    );
    
    // Handle escape key
    useInput((input, key) => {
        if (key.escape) {
            onCancel();
        }
    });
    
    const handleSubmit = async (values: Record<string, any>) => {
        const selectedCommand = values.command;
        if (!selectedCommand) return;
        
        const commandDef = registry.get(selectedCommand);
        if (!commandDef) return;
        
        // For now, just execute without arguments
        onExecute(selectedCommand, {});
    };
    
    // Calculate initial values with defaults
    const initialValues: Record<string, any> = {
        command: commandOptions[0]?.value || ''
    };
    
    return (
        <Box
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            paddingTop={2}
            paddingBottom={2}
        >
            {/* Form container */}
            <Box
                borderStyle="round"
                borderColor="cyan"
                paddingX={2}
                paddingY={1}
                width={60}
                flexDirection="column"
            >
                <Box marginBottom={1} justifyContent="center">
                    <Text bold color="cyan">Command Palette</Text>
                </Box>
                
                <Form 
                    onSubmit={handleSubmit} 
                    initialValues={initialValues}
                >
                    <FormSelect
                        name="command"
                        label="Command"
                        options={commandOptions}
                        row={0}
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
                            row={1}
                            column={0}
                        />
                        <FormButton
                            name="execute"
                            label="Execute"
                            type="submit"
                            variant="primary"
                            filled
                            row={1}
                            column={1}
                        />
                    </Box>
                </Form>
            </Box>
        </Box>
    );
};