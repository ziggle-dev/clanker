import React, {useCallback, useEffect, useRef} from "react";
import {Box, useInput} from "ink";
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
import {ConfirmationService} from "../../utils/confirmation-service";
import {useInputHandler} from "../../hooks/useInputHandler";
import {useConfirmationHandler} from "../../hooks/useConfirmationHandler";
import {useProcessingTimer} from "../../hooks/useProcessingTimer";
import {useRegistries} from "../../hooks/useRegistries";
import {store, actions} from "../../store";
import {StageType} from "../stage/types";

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

    // Confirmation service
    const confirmationService = ConfirmationService.getInstance();

    // Handle Ctrl+C
    const handleCtrlC = useCallback(() => {
        // Show exit confirmation modal
        actions.pushStage({ id: 'exit-confirmation', type: StageType.EXIT_CONFIRMATION });
    }, []);

    // Toggle auto-edit
    const toggleAutoEdit = useCallback(() => {
        const newAutoEditState = !snap.autoEditEnabled;
        actions.setAutoEdit(newAutoEditState);
        // Don't set session flag anymore - auto-edit only affects file operations
    }, [snap.autoEditEnabled]);


    // Handle keyboard input directly here
    useInput((inputChar: string, key: { [key: string]: boolean }) => {
        // Skip all input if confirmation is active
        if (snap.confirmationOptions) return;

        // Check for Ctrl+C (ETX character, code 3)
        if (inputChar.charCodeAt(0) === 3 || (key.ctrl && inputChar === 'c')) {
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
                actions.pushStage({ id: 'command-palette', type: StageType.COMMAND_PALETTE });
                return;
            }
            actions.setInputValue(snap.inputValue + inputChar);
        }
    });

    // Command execution is now handled in CommandPaletteScreen

    return (
        <ChatLayout>
            <Box paddingX={2}>
                {showCommandSuggestions && <CommandSuggestions/>}
                {showModelSelection && <ModelSelection/>}
                <ChatHistory messageRegistry={messageRegistry} executionRegistry={executionRegistry}
                             toolRegistry={toolRegistry}/>
                <LoadingAndStatus/>
            </Box>
            <ChatInput/>
            <Box paddingX={2}>
                <StatusBar/>
            </Box>
            {snap.confirmationOptions && (
                <ConfirmationDialog
                    {...snap.confirmationOptions}
                    onConfirm={handleConfirmation}
                    onReject={handleRejection}
                />
            )}
        </ChatLayout>
    );
}