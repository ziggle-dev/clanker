import {useCallback} from 'react';
import {useSnapshot} from 'valtio';
import {store, actions} from '../../store';
import {GrokAgent} from '../../clanker/agent';
import {messageRegistry as MessageRegistryType} from '../../registry/messages';

interface UseModelSelectionProps {
    agent: GrokAgent;
    messageRegistry: typeof MessageRegistryType;
}

export function useModelSelection({agent, messageRegistry}: UseModelSelectionProps) {
    const snap = useSnapshot(store);
    const showModelSelection = snap.showModelSelection;
    const selectedModelIndex = snap.selectedModelIndex;
    const availableModels = snap.availableModels;
    // Use actions.setModel directly

    const setShowModelSelection = (show: boolean) => {
        store.showModelSelection = show;
    };

    const setSelectedModelIndex = (index: number) => {
        store.selectedModelIndex = index;
    };

    const selectModel = useCallback(() => {
        const selectedModel = availableModels[selectedModelIndex];
        agent.getClient().setModel(selectedModel);
        actions.setModel(selectedModel);

        messageRegistry.addMessage({
            role: "system",
            content: `Model changed to ${selectedModel}`,
        });

        setShowModelSelection(false);
        setSelectedModelIndex(0);
    }, [agent, messageRegistry, selectedModelIndex, availableModels]);

    const navigateModelSelection = useCallback((direction: 'up' | 'down') => {
        if (!showModelSelection) return;

        if (direction === 'up') {
            setSelectedModelIndex(
                selectedModelIndex > 0
                    ? selectedModelIndex - 1
                    : availableModels.length - 1
            );
        } else {
            setSelectedModelIndex(
                selectedModelIndex < availableModels.length - 1
                    ? selectedModelIndex + 1
                    : 0
            );
        }
    }, [showModelSelection, selectedModelIndex, availableModels.length]);

    const cancelModelSelection = useCallback(() => {
        if (showModelSelection) {
            setShowModelSelection(false);
            setSelectedModelIndex(0);
        }
    }, [showModelSelection]);

    return {
        showModelSelection,
        selectedModelIndex,
        availableModels,
        selectModel,
        navigateModelSelection,
        cancelModelSelection,
    };
}