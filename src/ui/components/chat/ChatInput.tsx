import React from "react";
import {Box, Text} from "ink";
import {useSnapshot} from "valtio";
import {store} from "../../../store";

/**
 * ChatInput component - displays the current input with a cursor
 * Uses Valtio store directly - no props needed
 */
export const ChatInput: React.FC = () => {
    // Get state values - Valtio handles reactivity automatically
    const snap = useSnapshot(store);
    const inputValue = snap.inputValue;
    const isProcessing = snap.isProcessing;
    const isStreaming = snap.isStreaming;
    return (
        <Box borderStyle="round" borderColor="gray" paddingX={1} marginTop={0}>
            <Text color="gray">❯ </Text>
            <Text>
                {inputValue}
                {!isProcessing && !isStreaming && <Text color="white">█</Text>}
            </Text>
        </Box>
    );
}
