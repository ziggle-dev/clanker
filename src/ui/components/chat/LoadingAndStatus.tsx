import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSnapshot } from 'valtio';
import { store } from '../../../store';
import { ChatProgress } from '../chat-indicator';

const loadingTexts = [
  "Thinking.......",
  "Computing......",
  "Analyzing......",
  "Processing.....",
  "Calculating....",
  "Interfacing....",
  "Optimizing.....",
  "Synthesizing...",
  "Decrypting.....",
  "Calibrating....",
  "Bootstrapping..",
  "Synchronizing..",
  "Compiling......",
  "Downloading....",
];

const spinnerFrames = ["⣷", "⣯", "⣟", "⡿", "⢿", "⣻", "⣽", "⣾"];

/**
 * LoadingAndStatus component - shows loading indicator and progress bar
 * Positioned above the chat input
 */
export const LoadingAndStatus: React.FC = () => {
  const snap = useSnapshot(store);
  
  // Check if any tools are executing
  const hasExecutingTools = Array.from(snap.executions.values()).some(
    (execution) => execution.status === "executing"
  );
  
  // Determine if loading indicator should be active
  const isActive = snap.isProcessing || snap.isStreaming || hasExecutingTools;
  
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Change loading text periodically
  useEffect(() => {
    if (!isActive) {
      setLoadingTextIndex(Math.floor(Math.random() * loadingTexts.length));
      return;
    }

    const textInterval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 3000);

    return () => clearInterval(textInterval);
  }, [isActive]);

  // Animate spinner
  useEffect(() => {
    if (!isActive) {
      setSpinnerFrame(0);
      return;
    }

    const spinnerInterval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
    }, 100);

    return () => clearInterval(spinnerInterval);
  }, [isActive]);

  // Track elapsed time
  useEffect(() => {
    if (!isActive) {
      // Reset when inactive
      setElapsedSeconds(0);
      setStartTime(null);
      return;
    }

    // Set start time when becoming active
    if (!startTime) {
      setStartTime(Date.now());
    }

    // Update elapsed time every second
    const timerInterval = setInterval(() => {
      if (startTime) {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isActive, startTime]);

  const currentLoadingText = loadingTexts[loadingTextIndex];
  
  return (
    <Box width="100%" marginTop={1}>
      {isActive && (
        <Box width="100%" flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" flexGrow={1}>
            <Box flexShrink={0}>
              <Text color="cyan">{spinnerFrames[spinnerFrame]} </Text>
              <Text color="gray">{currentLoadingText}</Text>
            </Box>
            <Box marginLeft={4} flexGrow={1}>
              <ChatProgress elapsedSeconds={elapsedSeconds} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};