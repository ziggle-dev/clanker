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
 * ChatProgress component - shows animated dots pattern responsive to token counts
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
    // Calculate available width
    const loadingTextWidth = 25; // spinner + loading text
    const marginWidth = 4; // margin between loading and progress
    const tokenDisplayWidth = snap.tokenCount > 0 ? 15 : 0; // space for token count
    const bracketsWidth = 2; // [ and ]

    const availableWidth = terminalWidth - loadingTextWidth - marginWidth - tokenDisplayWidth - bracketsWidth - 5;
    const maxBarWidth = Math.max(40, availableWidth);

    // Animate progress based on token count
    useEffect(() => {
        if (!isActive) {
            setProgressFrame(0);
            return;
        }

        // Adjust animation speed based on token count
        const baseSpeed = 100;
        const tokenFactor = Math.max(1, Math.log10(snap.tokenCount + 1));
        const animationSpeed = baseSpeed / tokenFactor;

        const progressInterval = setInterval(() => {
            setProgressFrame((prev) => (prev + 1) % 360);
        }, animationSpeed);

        return () => clearInterval(progressInterval);
    }, [isActive, snap.tokenCount]);

    if (!isActive) return null;

    // Create animated dots pattern
    const createDotsPattern = () => {
        const dots = [];
        const dotCount = Math.min(maxBarWidth, 80);
        
        // Create wave effect based on token count
        const waveAmplitude = Math.min(10, Math.log10(snap.tokenCount + 1) * 3);
        const waveFrequency = 0.1;
        const phaseShift = progressFrame * 0.02;
        
        for (let i = 0; i < dotCount; i++) {
            const position = i / dotCount;
            const wave = Math.sin(position * Math.PI * 2 * waveFrequency + phaseShift) * waveAmplitude;
            const intensity = Math.abs(wave) / waveAmplitude;
            
            // Different dot characters based on intensity
            let dotChar = '·';
            if (intensity > 0.8) {
                dotChar = '●';
            } else if (intensity > 0.6) {
                dotChar = '•';
            } else if (intensity > 0.4) {
                dotChar = '◦';
            } else if (intensity > 0.2) {
                dotChar = '∙';
            }
            
            // Color based on position and intensity
            const isHighIntensity = intensity > 0.6;
            dots.push({
                char: dotChar,
                color: isHighIntensity ? 'cyan' : 'gray',
                dim: intensity < 0.3
            });
        }
        
        return dots;
    };

    const dots = createDotsPattern();

    // Format elapsed time as MM:SS
    const formatElapsedTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box width="100%">
            <Text color="gray">[</Text>
            {dots.map((dot, i) => (
                <Text key={i} color={dot.color} dimColor={dot.dim}>
                    {dot.char}
                </Text>
            ))}
            <Text color="gray">]</Text>
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