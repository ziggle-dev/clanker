import React, {useCallback, useEffect, useRef} from "react";
import {useApp} from "ink";
import {useInput} from "ink";
import {useSnapshot} from "valtio";
import {GrokAgent} from "../../clanker/agent";
import {ChatLayout} from "../components/chat/ChatLayout";
import {CommandSuggestions} from "../components/command-suggestions";
import {ChatHistory} from "../components/chat-history";
import {ChatInput} from "../components/chat/ChatInput";
import {StatusBar} from "../components/chat/StatusBar";
import {LoadingAndStatus} from "../components/chat/LoadingAndStatus";
import {ModelSelection} from "../components/model-selection";
import ConfirmationDialog from "../components/confirmation-dialog";
import {CommandForm} from "../components/CommandFormWrapper";
import {ConfirmationService} from "../../utils/confirmation-service";
import {useInputHandler} from "../../hooks/useInputHandler";
import {useConfirmationHandler} from "../../hooks/useConfirmationHandler";
import {useProcessingTimer} from "../../hooks/useProcessingTimer";
import {useRegistries} from "../../hooks/useRegistries";
import {store, actions} from "../../store";
import {registerBuiltinCommands} from "../../commands/builtin";

interface ChatContainerProps {
    agent: GrokAgent;
}

/**
 * Main chat container component
 * Manages the overall chat interface and state
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function ChatContainer({agent}: ChatContainerProps) {
    // Use Valtio's useSnapshot as intended
    const snap = useSnapshot(store);

    // Get registries
    const {messageRegistry, executionRegistry} = useRegistries();
    const toolRegistry = agent.getRegistry();
    const {handleConfirmation, handleRejection} = useConfirmationHandler();

    // Timer for processing duration
    const processingStartTime = useRef<number>(Date.now());
    useProcessingTimer();

    // Input handler state
    const {
        showCommandSuggestions,
        showModelSelection,
        handleEnter,
        handleEscape,
        handleUpArrow,
        handleDownArrow,
    } = useInputHandler({
        agent,
        messageRegistry,
        executionRegistry,
        processingStartTime,
        confirmationOptions: snap.confirmationOptions,
    });

    // App and confirmation service
    const {exit} = useApp();
    const confirmationService = ConfirmationService.getInstance();

    // Handle Ctrl+C
    const handleCtrlC = useCallback(() => {
        const now = Date.now();
        const exitConfirmationTime = snap.exitConfirmation ? Date.now() - 3000 : 0;

        if (snap.exitConfirmation && now - exitConfirmationTime < 3000) {
            exit();
            setTimeout(() => process.exit(0), 100);
        } else {
            actions.setExitConfirmation(true);
            setTimeout(() => actions.setExitConfirmation(false), 3000);
        }
    }, [snap.exitConfirmation, exit]);

    // Toggle auto-edit
    const toggleAutoEdit = useCallback(() => {
        const newAutoEditState = !snap.autoEditEnabled;
        actions.setAutoEdit(newAutoEditState);
        confirmationService.setSessionFlag("allOperations", newAutoEditState);
    }, [snap.autoEditEnabled, confirmationService]);

    // Initialize store settings and commands on mount
    useEffect(() => {
        actions.loadSettings();
        registerBuiltinCommands();
    }, []);

    // Handle keyboard input directly here
    useInput((inputChar: string, key: { [key: string]: boolean }) => {
        // Skip all input if confirmation is active
        if (snap.confirmationOptions) return;

        // Check for Ctrl+C (ETX character, code 3)
        if (inputChar.charCodeAt(0) === 3) {
            handleCtrlC();
            return;
        }

        // Shift+Tab: Toggle auto-edit
        if (key.shift && key.tab) {
            toggleAutoEdit();
            return;
        }

        // Enter key
        if (key.return) {
            handleEnter();
            return;
        }

        // Escape key
        if (key.escape) {
            handleEscape();
            return;
        }

        // Arrow keys
        if (key.upArrow) {
            handleUpArrow();
            return;
        }

        if (key.downArrow) {
            handleDownArrow();
            return;
        }

        // Backspace/Delete
        if (key.backspace || key.delete) {
            actions.setInputValue(snap.inputValue.slice(0, -1));
            return;
        }

        // Regular character input
        if (!key.ctrl && !key.meta && inputChar) {
            // Check for / command at start of input
            if (inputChar === '/' && snap.inputValue === '') {
                actions.setShowCommandForm(true);
                return;
            }
            actions.setInputValue(snap.inputValue + inputChar);
        }
    });

    const handleCommandExecute = useCallback(async (commandName: string, args: Record<string, any>) => {
        // Close the command form
        actions.setShowCommandForm(false);
        
        // Get the command and execute it
        const { getCommandRegistry } = await import('../../commands/registry');
        const registry = getCommandRegistry();
        const command = registry.get(commandName);
        if (command) {
            try {
                await command.exec(args);
            } catch (error) {
                console.error(`Error executing command ${commandName}:`, error);
            }
        }
    }, []);

    return (
        <ChatLayout>
            {showCommandSuggestions && <CommandSuggestions/>}
            {showModelSelection && <ModelSelection/>}
            <ChatHistory messageRegistry={messageRegistry} executionRegistry={executionRegistry}
                         toolRegistry={toolRegistry}/>
            <LoadingAndStatus/>
            <ChatInput/>
            <StatusBar/>
            {snap.confirmationOptions && (
                <ConfirmationDialog
                    {...snap.confirmationOptions}
                    onConfirm={handleConfirmation}
                    onReject={handleRejection}
                />
            )}
            {snap.showCommandForm && (
                <CommandForm
                    onCancel={() => actions.setShowCommandForm(false)}
                    onExecute={handleCommandExecute}
                />
            )}
        </ChatLayout>
    );
}