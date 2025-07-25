import React, {useState, useEffect} from "react";
import {Box, Text, useStdout} from "ink";
import {useSnapshot} from "valtio";
import {store} from "../../store";

/**
 * ChatIndicator component - placeholder for spacing
 * The actual indicator is now in the StatusBar
 */
export function ChatIndicator() {
    return null;
}

/**
 * ChatProgress component - shows progress bar and token info inline with status bar
 */
export function ChatProgress({elapsedSeconds = 0}: { elapsedSeconds?: number }) {
    // Get state using Valtio's useSnapshot
    const snap = useSnapshot(store);

    // Check if any tools are executing from executions slice
    const hasExecutingTools = Array.from(snap.executions.values()).some(
        (execution) => execution.status === "executing"
    );

    // Determine if indicator should be active
    const isActive = snap.isProcessing || snap.isStreaming || hasExecutingTools;

    const [progressFrame, setProgressFrame] = useState(0);
    const {stdout} = useStdout();

    // Terminal width for progress bar calculation
    const terminalWidth = stdout.columns || 80;
    // Calculate available width: terminal width - loading text (approx 25 chars) - margins - token display
    const loadingTextWidth = 25; // spinner + loading text
    const marginWidth = 4; // margin between loading and progress
    const tokenDisplayWidth = snap.tokenCount > 0 ? 15 : 0; // space for token count
    const bracketsWidth = 2; // [ and ]

    const availableWidth = terminalWidth - loadingTextWidth - marginWidth - tokenDisplayWidth - bracketsWidth - 5; // 5 for padding
    const maxBarWidth = Math.max(20, availableWidth);

    // Animate progress bar
    useEffect(() => {
        if (!isActive) {
            setProgressFrame(0);
            return;
        }

        const progressInterval = setInterval(() => {
            setProgressFrame((prev) => (prev + 1) % 100);
        }, 50);

        return () => clearInterval(progressInterval);
    }, [isActive]);

    if (!isActive) return null;

    // Create animated progress bar
    const progressPosition = Math.floor((progressFrame / 100) * maxBarWidth);
    const progressBar = Array(maxBarWidth)
        .fill("─")
        .map((char, i) => {
            const distance = Math.abs(i - progressPosition);
            if (distance === 0) return "█";
            if (distance === 1) return "▓";
            if (distance === 2) return "▒";
            if (distance === 3) return "░";
            return char;
        })
        .join("");

    // Format elapsed time as MM:SS
    const formatElapsedTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box width="100%">
            <Text color="cyan">[{progressBar}]</Text>
            {snap.tokenCount > 0 && (
                <>
                    <Text color="gray"> • </Text>
                    <Text color="gray" dimColor>
                        {snap.tokenCount} tokens
                    </Text>
                </>
            )}
            {elapsedSeconds > 0 && (
                <>
                    <Text color="gray"> • </Text>
                    <Text color="gray" dimColor>
                        {formatElapsedTime(elapsedSeconds)}
                    </Text>
                </>
            )}
        </Box>
    );
}