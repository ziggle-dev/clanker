import React, {useState, useEffect} from "react";
import {Box, Text, useStdout} from "ink";
import {useSnapshot} from "valtio";
import {store} from "../../store";


/**
 * ChatProgress component - shows animated dots pattern responsive to token counts
 */
export const ChatProgress: React.FC<{ elapsedSeconds: number }> = React.memo(({elapsedSeconds}) => {
    // Get state using Valtio's useSnapshot
    const snap = useSnapshot(store);

    // Check if any tools are executing from executions slice
    const hasExecutingTools = Array.from(snap.executions.values()).some(
        (execution) => execution.status === "executing"
    );

    // Determine if indicator should be active
    const isActive = snap.isProcessing || snap.isStreaming || hasExecutingTools;

    const [progressFrame, setProgressFrame] = useState(0);
    const [idleFrame, setIdleFrame] = useState(0);
    const {stdout} = useStdout();

    // Terminal width for progress bar calculation
    const terminalWidth = stdout.columns || 80;
    // Calculate available width
    const loadingTextWidth = 25; // spinner + loading text
    const marginWidth = 4; // margin between loading and progress
    const tokenDisplayWidth = (snap.inputTokenCount > 0 || snap.outputTokenCount > 0) ? 25 : 0; // space for token count
    const bracketsWidth = 2; // [ and ]

    const availableWidth = terminalWidth - loadingTextWidth - marginWidth - tokenDisplayWidth - bracketsWidth - 5;
    const maxBarWidth = Math.max(40, availableWidth);

    // Animate progress based on token count
    useEffect(() => {
        if (!isActive) {
            setProgressFrame(0);
            return;
        }

        // Adjust animation speed based on total token count
        const totalTokens = snap.inputTokenCount + snap.outputTokenCount;
        const baseSpeed = 50;
        const tokenFactor = Math.max(1, Math.log10(totalTokens + 1));
        const animationSpeed = baseSpeed / tokenFactor;

        const progressInterval = setInterval(() => {
            setProgressFrame((prev) => (prev + 1) % 720);
        }, animationSpeed);

        return () => clearInterval(progressInterval);
    }, [isActive, snap.inputTokenCount, snap.outputTokenCount]);

    // Idle animation for processing state
    useEffect(() => {
        if (!isActive) {
            setIdleFrame(0);
            return;
        }

        const idleInterval = setInterval(() => {
            setIdleFrame((prev) => (prev + 1) % 360);
        }, 30);

        return () => clearInterval(idleInterval);
    }, [isActive]);

    if (!isActive) return null;

    // Create animated dots pattern with bidirectional flow
    const createDotsPattern = () => {
        const dots = [];
        const dotCount = Math.min(maxBarWidth, 80);
        const midPoint = dotCount / 2;

        // Create different patterns based on token flow
        const inputTokens = snap.inputTokenCount;
        const outputTokens = snap.outputTokenCount;
        const totalTokens = inputTokens + outputTokens;

        // Base idle animation
        const idleWave = Math.sin(idleFrame * 0.02) * 0.5 + 0.5;

        for (let i = 0; i < dotCount; i++) {
            const distanceFromCenter = Math.abs(i - midPoint) / midPoint;

            // Create bidirectional wave effect
            let intensity = 0;
            let color = 'gray';

            if (outputTokens > 0 && i >= midPoint) {
                // Right side - output tokens (flowing right)
                const rightPosition = (i - midPoint) / midPoint;
                const rightWave = Math.sin((rightPosition * Math.PI * 2 - progressFrame * 0.03) + Math.PI);
                intensity = Math.max(0, rightWave) * (1 - rightPosition * 0.3);
                color = 'cyan';
            }

            if (inputTokens > 0 && i < midPoint) {
                // Left side - input tokens (flowing left)
                const leftPosition = (midPoint - i) / midPoint;
                const leftWave = Math.sin((leftPosition * Math.PI * 2 + progressFrame * 0.03) + Math.PI);
                const leftIntensity = Math.max(0, leftWave) * (1 - leftPosition * 0.3);
                if (leftIntensity > intensity) {
                    intensity = leftIntensity;
                    color = 'green';
                }
            }

            // Add idle animation when no tokens
            if (totalTokens === 0) {
                intensity = idleWave * (1 - distanceFromCenter) * 0.6;
                color = 'gray';
            }

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

            dots.push({
                char: dotChar,
                color: color,
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
            {(snap.inputTokenCount > 0 || snap.outputTokenCount > 0) && (
                <>
                    <Text color="gray"> • </Text>
                    {snap.inputTokenCount > 0 && (
                        <>
                            <Text color="green" dimColor>↑{snap.inputTokenCount}</Text>
                            {snap.outputTokenCount > 0 && <Text color="gray"> </Text>}
                        </>
                    )}
                    {snap.outputTokenCount > 0 && (
                        <Text color="cyan" dimColor>↓{snap.outputTokenCount}</Text>
                    )}
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
});