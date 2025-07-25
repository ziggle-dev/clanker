import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { 
    Form, 
    FormSelect, 
    FormInput, 
    FormToggle, 
    FormButton, 
    SelectOption,
    useForm 
} from '../components/form';
import { getCommandRegistry } from '../../commands/registry';
import { ArgumentDefinition } from '../../commands/types';
import { actions, store } from '../../store';
import { useSnapshot } from 'valtio';
import { StageType } from '../stage/types';

export const CommandPaletteScreen: React.FC = () => {
    const registry = getCommandRegistry();
    const snap = useSnapshot(store);
    
    // Get command options for the select
    const commandOptions: SelectOption[] = useMemo(() => 
        registry.list().map(cmd => ({
            value: cmd.name,
            label: `${cmd.name} - ${cmd.description}`
        })),
        []
    );
    
    // Escape key is handled by the form system, not here
    
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
        
        // Clear the "/" from input if it's there
        if (snap.inputValue === '/') {
            actions.setInputValue('');
        }
        
        // Execute command first (it might need to know we're in command palette)
        commandDef.exec(args);
        
        // Only pop if the command didn't replace the stage
        const currentStage = actions.getCurrentStage();
        if (currentStage.type === StageType.COMMAND_PALETTE) {
            actions.popStage();
        }
    };
    
    const handleCancel = () => {
        // Clear the "/" from input when canceling
        if (snap.inputValue === '/') {
            actions.setInputValue('');
        }
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
    const { setValue } = useForm();
    
    const commandDef = useMemo(() => 
        selectedCommand ? registry.get(selectedCommand) : null,
        [selectedCommand, registry]
    );
    
    // Load settings values when settings command is selected
    React.useEffect(() => {
        if (selectedCommand === 'settings') {
            // Load current settings from store
            const currentSettings = {
                model: store.model,
                theme: store.theme,
                autoEditEnabled: store.autoEditEnabled,
                vsCodeOpenEnabled: store.vsCodeOpenEnabled,
                dangerousBypassPermission: store.dangerousBypassPermission,
                virtualScrollingEnabled: store.virtualScrollingEnabled
            };
            
            // Set form values
            Object.entries(currentSettings).forEach(([key, value]) => {
                setValue(key, value);
            });
        }
    }, [selectedCommand, setValue]);
    
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