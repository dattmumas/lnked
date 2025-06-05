'use client';

import { useState, useCallback } from 'react';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export const useVideoUploadState = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const start = useCallback(() => {
    setStatus('uploading');
    setProgress(0);
    setError(null);
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
  }, []);

  const setUploading = useCallback(() => {
    setStatus('uploading');
    setError(null);
  }, []);

  const setProcessing = useCallback(() => {
    setStatus('processing');
    setProgress(100);
  }, []);

  const setComplete = useCallback(() => {
    setStatus('complete');
    setProgress(100);
    setError(null);
  }, []);

  const setErrorState = useCallback((errorMessage: string) => {
    setStatus('error');
    setError(errorMessage);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setUploadId(null);
  }, []);

  const upload = useCallback((file: File, uploadUrl: string) => {
    setUploading();
    setError(null);

    const HTTP_OK_MIN = 200;
    const HTTP_OK_MAX = 300;

    try {
      // Create XMLHttpRequest to track upload progress
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            updateProgress(percentComplete);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= HTTP_OK_MIN && xhr.status < HTTP_OK_MAX) {
            setProcessing();
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });

        // Start the upload
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrorState(errorMessage);
      throw error;
    }
  }, [setUploading, updateProgress, setProcessing, setErrorState]);

  return {
    progress,
    status,
    error,
    uploadId,
    start,
    upload,
    updateProgress,
    setUploading,
    setProcessing,
    setComplete,
    setError: setErrorState,
    reset,
    setUploadId,
    // Status helpers
    isIdle: status === 'idle',
    isUploading: status === 'uploading',
    isProcessing: status === 'processing',
    isComplete: status === 'complete',
    hasError: status === 'error',
  };
}; 