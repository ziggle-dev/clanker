import React from 'react';
import {Box, Text} from 'ink';
import {useSnapshot} from 'valtio';
import {store} from '../../../store';

/**
 * StatusBar component - shows auto-edit status and exit info at the bottom
 */
export const StatusBar: React.FC = React.memo(() => {
    const snap = useSnapshot(store);
    const autoEditEnabled = snap.autoEditEnabled;
    const dbpEnabled = snap.dangerousBypassPermission;

    return (
        <Box width="100%" justifyContent="space-between">
            {/* Left side - exit instruction */}
            <Text color="gray">Ctrl+C to exit</Text>
            
            {/* Right side - indicators */}
            <Box>
                {/* Only show auto-edit if it's enabled AND DBP is not on */}
                {autoEditEnabled && !dbpEnabled && (
                    <Text color="cyan">
                        ▶ auto-edit: on
                    </Text>
                )}
                {/* Show DBP as a badge */}
                {dbpEnabled && (
                    <Text backgroundColor="red" color="white" bold> BYPASS </Text>
                )}
            </Box>
        </Box>
    );
});