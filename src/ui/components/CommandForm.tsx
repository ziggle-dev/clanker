import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { 
    Form, 
    FormSelect, 
    FormInput, 
    FormToggle, 
    FormButton, 
    SelectOption 
} from './form';
import { getCommandRegistry } from '../../commands/registry';
import { CommandDefinition, ArgumentDefinition } from '../../commands/types';

interface CommandFormProps {
    onCancel: () => void;
    onExecute: (commandName: string, args: Record<string, any>) => void;
}

export const CommandForm: React.FC<CommandFormProps> = ({ onCancel, onExecute }) => {
    const registry = getCommandRegistry();
    const [formValues, setFormValues] = useState<Record<string, any>>({ command: '' });
    
    // Get command options for the select
    const commandOptions: SelectOption[] = registry.list().map(cmd => ({
        value: cmd.name,
        label: `${cmd.name} - ${cmd.description}`
    }));
    
    // Handle escape key
    useInput((input, key) => {
        if (key.escape) {
            onCancel();
        }
    });
    
    // Get command definition based on current selection
    const commandDef = formValues.command ? registry.get(formValues.command) : null;
    
    const handleSubmit = async (values: Record<string, any>) => {
        const selectedCommand = values.command;
        if (!selectedCommand || !commandDef) return;
        
        // Extract command arguments from form values
        const args: Record<string, any> = {};
        if (commandDef.arguments) {
            for (const arg of commandDef.arguments) {
                if (values[arg.name] !== undefined) {
                    args[arg.name] = values[arg.name];
                }
            }
        }
        
        onExecute(selectedCommand, args);
    };
    
    const renderArgument = (arg: ArgumentDefinition, index: number) => {
        const row = index + 1; // First row is for command selection
        
        switch (arg.type) {
            case 'string':
                return (
                    <FormInput
                        key={arg.name}
                        name={arg.name}
                        label={arg.description || arg.name}
                        placeholder={arg.placeholder}
                        required={arg.required}
                        validation={arg.validation}
                        row={row}
                        column={0}
                    />
                );
                
            case 'boolean':
                return (
                    <FormToggle
                        key={arg.name}
                        name={arg.name}
                        label={arg.description || arg.name}
                        row={row}
                        column={0}
                    />
                );
                
            case 'enum':
                return (
                    <FormSelect
                        key={arg.name}
                        name={arg.name}
                        label={arg.description || arg.name}
                        options={arg.options || []}
                        required={arg.required}
                        row={row}
                        column={0}
                    />
                );
                
            default:
                return null;
        }
    };
    
    // Calculate initial values with defaults
    const initialValues: Record<string, any> = {
        command: ''
    };
    
    if (commandDef?.arguments) {
        for (const arg of commandDef.arguments) {
            if (arg.default !== undefined) {
                initialValues[arg.name] = arg.default;
            }
        }
    }
    
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
                    
                    {commandDef?.arguments?.map((arg, index) => renderArgument(arg, index))}
                    
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
                            row={commandDef?.arguments?.length ? commandDef.arguments.length + 1 : 1}
                            column={0}
                        />
                        <FormButton
                            name="execute"
                            label="Execute"
                            type="submit"
                            variant="primary"
                            filled
                            row={commandDef?.arguments?.length ? commandDef.arguments.length + 1 : 1}
                            column={1}
                        />
                    </Box>
                </Form>
            </Box>
        </Box>
    );
};