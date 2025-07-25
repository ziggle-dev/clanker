import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { 
    Form, 
    FormSelect, 
    FormInput, 
    FormToggle, 
    FormButton, 
    SelectOption 
} from '../components/form';
import { getCommandRegistry } from '../../commands/registry';
import { ArgumentDefinition } from '../../commands/types';
import { actions } from '../../store';

export const CommandPaletteScreen: React.FC = () => {
    const registry = getCommandRegistry();
    
    // Get command options for the select
    const commandOptions: SelectOption[] = useMemo(() => 
        registry.list().map(cmd => ({
            value: cmd.name,
            label: `${cmd.name} - ${cmd.description}`
        })),
        []
    );
    
    // Handle escape key at screen level
    useInput((input, key) => {
        if (key.escape) {
            actions.popStage();
        }
    });
    
    const handleSubmit = async (values: Record<string, any>) => {
        const selectedCommand = values.command;
        if (!selectedCommand) return;
        
        const commandDef = registry.get(selectedCommand);
        if (!commandDef) return;
        
        // Extract command arguments from form values
        const args: Record<string, any> = {};
        if (commandDef.arguments) {
            for (const arg of commandDef.arguments) {
                if (values[arg.name] !== undefined) {
                    args[arg.name] = values[arg.name];
                }
            }
        }
        
        // Execute command
        await commandDef.exec(args);
        
        // Close the command palette
        actions.popStage();
    };
    
    const handleCancel = () => {
        actions.popStage();
    };
    
    // Initial values
    const initialValues: Record<string, any> = {
        command: commandOptions[0]?.value || ''
    };
    
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
                    <CommandFormContent 
                        commandOptions={commandOptions}
                        onCancel={handleCancel}
                    />
                </Form>
            </Box>
        </Box>
    );
};

// Separate component to access form context
const CommandFormContent: React.FC<{
    commandOptions: SelectOption[];
    onCancel: () => void;
}> = ({ commandOptions, onCancel }) => {
    const registry = getCommandRegistry();
    const [selectedCommand, setSelectedCommand] = React.useState(commandOptions[0]?.value || '');
    
    const commandDef = useMemo(() => 
        selectedCommand ? registry.get(selectedCommand) : null,
        [selectedCommand, registry]
    );
    
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
    
    return (
        <>
            <FormSelect
                name="command"
                label="Command"
                options={commandOptions}
                row={0}
                column={0}
                onChange={setSelectedCommand}
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
        </>
    );
};