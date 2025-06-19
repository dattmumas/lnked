'use client';

import React from 'react';

import { Toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

import {
  CheckIcon,
  XCircleIcon,
  InfoIcon,
  WarningIcon,
  XMarkIcon,
} from './icons/toast-icons';

// Variant styles constant to avoid duplication and allow easy theming
const VARIANT_STYLES = {
  success: {
    border: 'border-l-4 border-l-green-500',
    iconBg: 'bg-green-100 text-green-600',
    icon: CheckIcon,
  },
  error: {
    border: 'border-l-4 border-l-red-500',
    iconBg: 'bg-red-100 text-red-600',
    icon: XCircleIcon,
  },
  info: {
    border: 'border-l-4 border-l-blue-500',
    iconBg: 'bg-blue-100 text-blue-600',
    icon: InfoIcon,
  },
  warning: {
    border: 'border-l-4 border-l-yellow-500',
    iconBg: 'bg-yellow-100 text-yellow-600',
    icon: WarningIcon,
  },
} as const;

interface ToastItemProps {
  toast: Toast;
  onStartExit: (id: string) => void;
}

const ToastItemComponent: React.FC<ToastItemProps> = ({
  toast,
  onStartExit,
}) => {
  const variant = VARIANT_STYLES[toast.type];
  const IconComponent = variant.icon;

  const handleDismiss = React.useCallback((): void => {
    onStartExit(toast.id);
  }, [toast.id, onStartExit]);

  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-lg bg-background shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out',
        variant.border,
        {
          'animate-in slide-in-from-right-full': toast.isExiting !== true,
          'animate-out slide-out-to-right-full': toast.isExiting === true,
        },
      )}
    >
      <div className="flex w-0 flex-1 items-center p-4">
        <div className="flex-shrink-0">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full',
              variant.iconBg,
            )}
          >
            <IconComponent className="h-4 w-4" />
          </div>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-foreground">{toast.message}</p>
        </div>
      </div>
      <div className="flex border-l border-border">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-none rounded-r-lg border border-transparent p-2 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders when other toasts change
export const ToastItem = React.memo(ToastItemComponent);
