import {useEffect, useCallback} from 'react';
import {actions} from '../store';
import {ConfirmationService, ConfirmationOptions} from '../utils/confirmation-service';
import {StageType} from '../ui/stage/types';

/**
 * Hook to handle confirmation dialogs with the confirmation service
 */
export const useConfirmationHandler = () => {
    const confirmationService = ConfirmationService.getInstance();
    // Use actions.requestConfirmation directly
    // Use actions.respondToConfirmation directly
    // Use actions.setProcessing directly
    // Use actions.setStreaming directly
    // Use actions.updateProcessingTime directly

    useEffect(() => {
        const handleConfirmationRequest = async (options: ConfirmationOptions) => {
            // Push the tool confirmation stage
            actions.pushStage({
                id: 'tool-confirmation',
                type: StageType.TOOL_CONFIRMATION,
                props: {
                    options,
                    onConfirm: (result: { confirmed: boolean; dontAskAgain?: boolean }) => {
                        confirmationService.confirmOperation(result.confirmed, result.dontAskAgain);
                    },
                    onReject: (result: { confirmed: boolean; feedback?: string; dontAskAgain?: boolean }) => {
                        confirmationService.rejectOperation(result.feedback);
                    }
                }
            });
        };

        confirmationService.on("confirmation-requested", handleConfirmationRequest);

        return () => {
            confirmationService.off("confirmation-requested", handleConfirmationRequest);
        };
    }, [confirmationService]);

    const handleConfirmation = useCallback((dontAskAgain?: boolean) => {
        actions.respondToConfirmation({confirmed: true, dontAskAgain});
    }, []);

    const handleRejection = useCallback((feedback?: string) => {
        actions.respondToConfirmation({confirmed: false, feedback});
        actions.setProcessing(false);
        actions.setStreaming(false);
        actions.updateProcessingTime(0);
    }, []);

    return {
        handleConfirmation,
        handleRejection,
    };
};