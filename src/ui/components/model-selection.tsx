import React from "react";
import {Box, Text} from "ink";
import {useSnapshot} from "valtio";
import {store} from "../../store";

/**
 * ModelSelection component - shows model selection UI
 * Uses Zustand store directly - no props needed
 */
export const ModelSelection: React.FC = () => {
    // Get state directly from store
    const snap = useSnapshot(store);
    const showModelSelection = snap.showModelSelection;
    const selectedModelIndex = snap.selectedModelIndex;
    const availableModels = snap.availableModels;
    const currentModel = snap.model || availableModels[0];

    if (!showModelSelection) return null;

    return (
        <Box marginTop={1} flexDirection="column">
            <Box marginBottom={1}>
                <Text color="cyan">Select Grok Model (current: {currentModel}):</Text>
            </Box>
            {availableModels.map((model, index) => (
                <Box key={index} paddingLeft={1}>
                    <Text
                        color={index === selectedModelIndex ? "black" : "white"}
                        backgroundColor={index === selectedModelIndex ? "cyan" : undefined}
                    >
                        {model}
                    </Text>
                </Box>
            ))}
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    ↑↓ navigate • Enter/Tab select • Esc cancel
                </Text>
            </Box>
        </Box>
    );
};