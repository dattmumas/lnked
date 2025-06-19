'use client';

import React from 'react';

import { useToast } from '@/hooks/useToast';

import { ToastItem } from './toast-item';

// Main toast container component
export const ToastContainer: React.FC = (): React.JSX.Element | undefined => {
  const { toasts, startExit } = useToast();

  if (toasts.length === 0) {
    return undefined;
  }

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onStartExit={startExit} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
