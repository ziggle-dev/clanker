import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { store, actions } from '../store';

/**
 * Hook to track and update processing time
 */
export function useProcessingTimer() {
  const snap = useSnapshot(store);
  const isProcessing = snap.isProcessing;
  const isStreaming = snap.isStreaming;
  const processingStartTime = useRef<number>(0);
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isProcessing || isStreaming) {
      interval = setInterval(() => {
        if (processingStartTime.current > 0) {
          actions.updateProcessingTime(Date.now() - processingStartTime.current);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isProcessing, isStreaming]);
  
  return {
    processingStartTime,
  };
}