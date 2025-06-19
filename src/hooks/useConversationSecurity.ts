'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { chatSecurity } from '@/lib/chat/security';

interface ConversationSecurityState {
  isAuthenticated: boolean;
  canViewConversation: boolean;
  canSendMessages: boolean;
  isLoading: boolean;
  error: string | null;
}

type ConversationSecurityAction =
  | { type: 'CHECK_START' }
  | { type: 'CHECK_SUCCESS'; payload: Omit<ConversationSecurityState, 'isLoading' | 'error'> }
  | { type: 'CHECK_ERROR'; payload: string };

const initialState: ConversationSecurityState = {
  isAuthenticated: false,
  canViewConversation: false,
  canSendMessages: false,
  isLoading: false,
  error: null,
};

function securityReducer(
  state: ConversationSecurityState,
  action: ConversationSecurityAction,
): ConversationSecurityState {
  switch (action.type) {
    case 'CHECK_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'CHECK_SUCCESS':
      return {
        ...action.payload,
        isLoading: false,
        error: null,
      };
    case 'CHECK_ERROR':
      return {
        ...initialState,
        isLoading: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

interface UseConversationSecurityOptions {
  onStateChange?: (state: ConversationSecurityState) => void;
}

interface UseConversationSecurityReturn extends ConversationSecurityState {
  refresh: () => Promise<void>;
}

export function useConversationSecurity(
  conversationId?: string,
  options: UseConversationSecurityOptions = {},
): UseConversationSecurityReturn {
  const { onStateChange } = options;
  const [state, dispatch] = useReducer(securityReducer, initialState);
  const isCheckingRef = useRef(false);

  const checkSecurity = useCallback(async (): Promise<void> => {
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    dispatch({ type: 'CHECK_START' });

    try {
      const hasConversationId = Boolean(conversationId?.trim());
      let isAuthenticated = false;
      let canViewConversation = false;
      let canSendMessages = false;

      if (hasConversationId && conversationId !== null && conversationId !== undefined && conversationId !== '') {
        // Check conversation-specific permissions which will also verify authentication
        canViewConversation = await chatSecurity.canViewConversation(conversationId);
        canSendMessages = await chatSecurity.canSendMessage(conversationId);

        // If user can view or send messages, they must be authenticated
        isAuthenticated = canViewConversation || canSendMessages;
      } else {
        // For cases without conversationId, we need a different way to check authentication
        try {
          // Try to validate an empty participant list - this will fail if not authenticated
          const validation = await chatSecurity.validateParticipants([]);
          isAuthenticated = validation.valid;
        } catch {
          isAuthenticated = false;
        }
      }

      const newState = {
        isAuthenticated,
        canViewConversation,
        canSendMessages,
      };

      dispatch({ type: 'CHECK_SUCCESS', payload: newState });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Security check failed';
      console.error('Security check failed:', error);
      
      dispatch({ type: 'CHECK_ERROR', payload: errorMessage });
    } finally {
      isCheckingRef.current = false;
    }
  }, [conversationId]);

  // Initial security check
  useEffect((): (() => void) => {
    let active = true;
    
    const performCheck = async (): Promise<void> => {
      if (isCheckingRef.current) return;
      
      isCheckingRef.current = true;
      dispatch({ type: 'CHECK_START' });

      try {
        const hasConversationId = Boolean(conversationId?.trim());
        let isAuthenticated = false;
        let canViewConversation = false;
        let canSendMessages = false;

        if (hasConversationId && conversationId !== null && conversationId !== undefined && conversationId !== '') {
          // Check conversation-specific permissions which will also verify authentication
          canViewConversation = await chatSecurity.canViewConversation(conversationId);
          canSendMessages = await chatSecurity.canSendMessage(conversationId);

          // If user can view or send messages, they must be authenticated
          isAuthenticated = canViewConversation || canSendMessages;
        } else {
          // For cases without conversationId, we need a different way to check authentication
          try {
            // Try to validate an empty participant list - this will fail if not authenticated
            const validation = await chatSecurity.validateParticipants([]);
            isAuthenticated = validation.valid;
          } catch {
            isAuthenticated = false;
          }
        }

        const newState = {
          isAuthenticated,
          canViewConversation,
          canSendMessages,
        };

        if (active) {
          dispatch({ type: 'CHECK_SUCCESS', payload: newState });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Security check failed';
        console.error('Security check failed:', error);
        
        if (active) {
          dispatch({ type: 'CHECK_ERROR', payload: errorMessage });
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    void performCheck();

    return () => {
      active = false;
    };
  }, [conversationId]);

  // Call onStateChange callback when state changes
  useEffect((): void => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const refresh = useCallback((): Promise<void> => {
    return checkSecurity();
  }, [checkSecurity]);

  return {
    ...state,
    refresh,
  };
} 