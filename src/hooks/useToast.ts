import { useCallback, useReducer, useEffect, useRef } from 'react';

// Types
interface Toast {
  readonly id: string;
  readonly message: string;
  readonly type: 'success' | 'error' | 'info' | 'warning';
  readonly duration: number;
  readonly timestamp: number;
  readonly isExiting?: boolean;
}

interface ToastOptions {
  readonly type?: Toast['type'];
  readonly duration?: number;
  readonly onClose?: () => void;
}

interface ToastState {
  readonly toasts: readonly Toast[];
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'DISMISS'; id: string }
  | { type: 'START_EXIT'; id: string }
  | { type: 'CLEAR_ALL' };

// Constants
const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 4; // FIFO eviction when exceeded
const ID_LENGTH = 10;
const FALLBACK_RADIX = 36;
const FALLBACK_SUBSTRING_START = 2;

// Export animation duration to keep UI and logic in sync
export const ANIMATION_DURATION_MS = 300;

// Collision-safe ID generation
let idCounter = 0;
function generateToastId(): string {
  const timestamp = Date.now();
  const counter = ++idCounter;
  
  // Use crypto.randomUUID() when available for better entropy
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `toast-${timestamp}-${counter}-${crypto.randomUUID().slice(0, ID_LENGTH)}`;
  }
  
  // Fallback: timestamp + counter + random suffix (SSR-safe)
  const randomSuffix = Math.random().toString(FALLBACK_RADIX).substring(FALLBACK_SUBSTRING_START, ID_LENGTH);
  return `toast-${timestamp}-${counter}-${randomSuffix}`;
}

// Reducer for atomic state updates
function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD': {
      let newToasts = [...state.toasts, action.toast];
      
      // FIFO eviction if exceeding max
      if (newToasts.length > MAX_TOASTS) {
        newToasts = newToasts.slice(-MAX_TOASTS);
      }
      
      return { toasts: newToasts };
    }
    
    case 'START_EXIT': {
      return {
        toasts: state.toasts.map(toast =>
          toast.id === action.id ? { ...toast, isExiting: true } : toast
        ),
      };
    }
    
    case 'DISMISS': {
      return {
        toasts: state.toasts.filter(toast => toast.id !== action.id),
      };
    }
    
    case 'CLEAR_ALL': {
      return { toasts: [] };
    }
    
    default:
      return state;
  }
}

// Global state and timer management
class ToastManager {
  private static instance: ToastManager;
  private listeners = new Set<(state: ToastState) => void>();
  private state: ToastState = { toasts: [] };
  private timers = new Map<string, number>();
  private closeCallbacks = new Map<string, () => void>();

  static getInstance(): ToastManager {
    if (typeof ToastManager.instance === 'undefined') {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  subscribe(listener: (state: ToastState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  dispatch(action: ToastAction): void {
    this.state = toastReducer(this.state, action);
    this.notify();
  }

  addToast(message: string, options: ToastOptions = {}): string {
    const id = generateToastId();
    const duration = options.duration ?? DEFAULT_DURATION;
    
    const toast: Toast = {
      id,
      message,
      type: options.type ?? 'info',
      duration,
      timestamp: Date.now(),
    };

    // Store close callback if provided
    if (typeof options.onClose === 'function') {
      this.closeCallbacks.set(id, options.onClose);
    }

    this.dispatch({ type: 'ADD', toast });

    // Set auto-dismiss timer with proper cleanup
    if (duration > 0) {
      const timerId = window.setTimeout(() => {
        this.dismissToast(id);
      }, duration);
      
      this.timers.set(id, timerId);
    }

    return id;
  }

  dismissToast(id: string): void {
    // Clear timer if exists
    const timerId = this.timers.get(id);
    if (typeof timerId === 'number') {
      clearTimeout(timerId);
      this.timers.delete(id);
    }

    // Call onClose callback if exists
    const onClose = this.closeCallbacks.get(id);
    if (typeof onClose === 'function') {
      onClose();
      this.closeCallbacks.delete(id);
    }

    this.dispatch({ type: 'DISMISS', id });
  }

  startExit(id: string): void {
    this.dispatch({ type: 'START_EXIT', id });
    
    // Auto-dismiss after animation completes
    setTimeout(() => {
      this.dismissToast(id);
    }, ANIMATION_DURATION_MS);
  }

  clearAll(): void {
    // Clear all timers
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers.clear();
    
    // Call all onClose callbacks
    this.closeCallbacks.forEach(callback => callback());
    this.closeCallbacks.clear();
    
    this.dispatch({ type: 'CLEAR_ALL' });
  }

  getState(): ToastState {
    return this.state;
  }
}

// SSR-safe manager instance
function getToastManager(): ToastManager | null {
  if (typeof window === 'undefined') {
    return null; // SSR safety
  }
  return ToastManager.getInstance();
}

// Main hook
export function useToast(): {
  toasts: readonly Toast[];
  toast: (message: string, options?: ToastOptions) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  errorFrom: (err: Error, duration?: number) => string;
  startExit: (id: string) => void;
} {
  const manager = getToastManager();
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Subscribe to global manager
  useEffect(() => {
    if (manager === null) return undefined;

    const unsubscribe = manager.subscribe((newState) => {
      if (JSON.stringify(stateRef.current) !== JSON.stringify(newState)) {
        dispatch({ type: 'CLEAR_ALL' });
        newState.toasts.forEach(toast => {
          dispatch({ type: 'ADD', toast });
        });
      }
    });

    // Sync initial state
    const initialState = manager.getState();
    if (initialState.toasts.length > 0) {
      initialState.toasts.forEach(toast => {
        dispatch({ type: 'ADD', toast });
      });
    }

    return unsubscribe;
  }, [manager]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (manager !== null) {
        manager.clearAll();
      }
    };
  }, [manager]);

  // API methods
  const toast = useCallback((message: string, options?: ToastOptions) => {
    return manager?.addToast(message, options) ?? '';
  }, [manager]);

  const success = useCallback((message: string, duration?: number) => {
    return toast(message, { type: 'success', ...(duration !== undefined ? { duration } : {}) });
  }, [toast]);

  const error = useCallback((message: string, duration?: number) => {
    return toast(message, { type: 'error', ...(duration !== undefined ? { duration } : {}) });
  }, [toast]);

  const info = useCallback((message: string, duration?: number) => {
    return toast(message, { type: 'info', ...(duration !== undefined ? { duration } : {}) });
  }, [toast]);

  const warning = useCallback((message: string, duration?: number) => {
    return toast(message, { type: 'warning', ...(duration !== undefined ? { duration } : {}) });
  }, [toast]);

  const dismiss = useCallback((id: string) => {
    if (manager !== null) {
      manager.dismissToast(id);
    }
  }, [manager]);

  const clear = useCallback(() => {
    if (manager !== null) {
      manager.clearAll();
    }
  }, [manager]);

  // Error boundary integration helper
  const errorFrom = useCallback((err: Error, duration?: number) => {
    const { message } = err;
    return error(message, duration);
  }, [error]);

  return {
    // State
    toasts: state.toasts,
    
    // Actions
    toast,
    success,
    error,
    info,
    warning,
    dismiss,
    clear,
    errorFrom,
    
    // Animation helpers
    startExit: useCallback((id: string) => {
      if (manager !== null) {
        manager.startExit(id);
      }
    }, [manager]),
  };
}

// Accessibility helper for toast containers
export const TOAST_ARIA_PROPS = {
  role: 'status' as const,
  'aria-live': 'polite' as const,
  'aria-atomic': 'false' as const, // Allow incremental announcements
} as const;

export const ERROR_TOAST_ARIA_PROPS = {
  role: 'alert' as const,
  'aria-live': 'assertive' as const,
  'aria-atomic': 'true' as const, // Announce full message for errors
} as const;

// Export types
export type { Toast, ToastOptions, ToastState }; 