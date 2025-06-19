'use client';

import { useCallback, useEffect, useRef } from 'react';

import { selectAdapter } from '@/lib/chat/realtime-adapter';

const realTime = selectAdapter();

// Constants
const TYPING_TIMEOUT_MS = 3000;

interface UseTypingStatusReturn {
  registerKeystroke: () => void;
}

export function useTypingStatus(channelId: string): UseTypingStatusReturn {
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const broadcastTypingStop = useCallback((): void => {
    if (!isMountedRef.current) return;
    
    isTypingRef.current = false;
    void realTime.broadcastTyping(channelId, false);
  }, [channelId]);

  const broadcastTypingStart = useCallback((): void => {
    if (!isMountedRef.current) return;
    
    isTypingRef.current = true;
    void realTime.broadcastTyping(channelId, true);
  }, [channelId]);

  const scheduleTypingStop = useCallback((): void => {
    // Clear any existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      broadcastTypingStop();
      timeoutRef.current = null;
    }, TYPING_TIMEOUT_MS);
  }, [broadcastTypingStop]);

  const registerKeystroke = useCallback((): void => {
    if (!isMountedRef.current) return;
    
    // Start typing if not already typing
    if (!isTypingRef.current) {
      broadcastTypingStart();
    }

    // Always reschedule the stop timeout
    scheduleTypingStop();
  }, [broadcastTypingStart, scheduleTypingStop]);

  // Cleanup on unmount or channelId change
  useEffect((): (() => void) => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      // Clear any pending timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Send final stop typing if we were typing
      if (isTypingRef.current) {
        isTypingRef.current = false;
        void realTime.broadcastTyping(channelId, false);
      }
    };
  }, [channelId]);

  return {
    registerKeystroke,
  };
} 