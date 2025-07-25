import {useSnapshot} from 'valtio';
import {store, actions} from '../store';
import {useMessageInput} from './input/useMessageInput';
import {useCommandInput} from './input/useCommandInput';
import {useInputHistory} from './input/useInputHistory';
import {useModelSelection} from './ui/useModelSelection';
import {GrokAgent} from '../clanker/agent';
import {messageRegistry} from '../registry/messages';
import {executionRegistry} from '../registry/execution';
import {ConfirmationOptions} from '../utils/confirmation-service';
import {MutableRefObject, useCallback} from "react";

interface UseInputHandlerProps {
    agent: GrokAgent;
    messageRegistry: typeof messageRegistry;
    executionRegistry: typeof executionRegistry;
    processingStartTime: MutableRefObject<number>;
    confirmationOptions: ConfirmationOptions | null;
}

/**
 * Main orchestrator hook that combines all input handling functionality
 * This is a thin wrapper that delegates to specialized hooks
 */
export const useInputHandler = ({
                                    agent,
                                    messageRegistry,
                                    executionRegistry,
                                    processingStartTime,
                                }: UseInputHandlerProps) => {
    const snap = useSnapshot(store);
    const inputValue = snap.inputValue;
    // Use actions.setInputValue directly
    const autoEditEnabled = snap.autoEditEnabled;

    // Message handling
    const {sendMessage} = useMessageInput({
        agent,
        messageRegistry,
        executionRegistry,
        processingStartTime,
    });

    // Command handling
    const {
        showCommandSuggestions,
        selectedCommandIndex,
        commandSuggestions,
        handleCommand,
        selectCommandSuggestion,
        navigateCommandSuggestions,
        cancelCommandSuggestions,
        isCommand,
    } = useCommandInput({agent, messageRegistry});

    // History navigation
    const {
        navigateHistory,
        saveToHistory,
    } = useInputHistory({messageRegistry});

    // Model selection
    const {
        showModelSelection,
        selectedModelIndex,
        availableModels,
        selectModel,
        navigateModelSelection,
        cancelModelSelection,
    } = useModelSelection({agent, messageRegistry});

    // Main enter handler
    const handleEnter = useCallback(async () => {
        if (showCommandSuggestions) {
            selectCommandSuggestion();
        } else if (showModelSelection) {
            selectModel();
        } else if (inputValue.trim()) {
            if (isCommand) {
                await handleCommand(inputValue);
            } else {
                await sendMessage(inputValue);
            }
            saveToHistory(inputValue);
        }
    }, [
        showCommandSuggestions,
        showModelSelection,
        inputValue,
        isCommand,
        selectCommandSuggestion,
        selectModel,
        handleCommand,
        sendMessage,
        saveToHistory,
    ]);

    // Main escape handler
    const handleEscape = useCallback(() => {
        if (showCommandSuggestions) {
            cancelCommandSuggestions();
        } else if (showModelSelection) {
            cancelModelSelection();
        } else {
            actions.setInputValue("");
        }
    }, [
        showCommandSuggestions,
        showModelSelection,
        cancelCommandSuggestions,
        cancelModelSelection,
    ]);

    // Main up arrow handler
    const handleUpArrow = useCallback(() => {
        if (showCommandSuggestions) {
            navigateCommandSuggestions('up');
        } else if (showModelSelection) {
            navigateModelSelection('up');
        } else {
            navigateHistory('up');
        }
    }, [
        showCommandSuggestions,
        showModelSelection,
        navigateCommandSuggestions,
        navigateModelSelection,
        navigateHistory,
    ]);

    // Main down arrow handler
    const handleDownArrow = useCallback(() => {
        if (showCommandSuggestions) {
            navigateCommandSuggestions('down');
        } else if (showModelSelection) {
            navigateModelSelection('down');
        } else {
            navigateHistory('down');
        }
    }, [
        showCommandSuggestions,
        showModelSelection,
        navigateCommandSuggestions,
        navigateModelSelection,
        navigateHistory,
    ]);

    return {
        input: inputValue,
        showCommandSuggestions,
        selectedCommandIndex,
        showModelSelection,
        selectedModelIndex,
        commandSuggestions,
        availableModels,
        autoEditEnabled,
        handleEnter,
        handleEscape,
        handleUpArrow,
        handleDownArrow,
    };
};