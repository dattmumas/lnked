'use client';

import { useCallback, useEffect, useRef } from 'react';

import { selectAdapter } from '@/lib/chat/realtime-adapter';

const realTime = selectAdapter();

// Constants
const TYPING_TIMEOUT_MS = 3000;

interface UseTypingStatusReturn {
  registerKeystroke: () => void;
  stopTyping: () => void;
}

export function useTypingStatus(channelId: string): UseTypingStatusReturn {
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const sendTypingStop = useCallback((): void => {
    if (!isMountedRef.current || !isTypingRef.current) return;

    isTypingRef.current = false;
    void realTime.broadcastTyping(channelId, false);
  }, [channelId]);

  const sendTypingStart = useCallback((): void => {
    if (!isMountedRef.current || isTypingRef.current) return;

    isTypingRef.current = true;
    void realTime.broadcastTyping(channelId, true);
  }, [channelId]);

  // Single debounced function to handle typing timeout
  const scheduleTypingStop = useCallback((): void => {
    // Clear any existing timeout to avoid double scheduling
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      sendTypingStop();
      timeoutRef.current = null;
    }, TYPING_TIMEOUT_MS);
  }, [sendTypingStop]);

  const registerKeystroke = useCallback((): void => {
    if (!isMountedRef.current) return;

    // Start typing if not already typing
    sendTypingStart();

    // Always reschedule the stop timeout (this handles the debouncing)
    scheduleTypingStop();
  }, [sendTypingStart, scheduleTypingStop]);

  // Manual stop typing function
  const stopTyping = useCallback((): void => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    sendTypingStop();
  }, [sendTypingStop]);

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
    stopTyping,
  };
}
