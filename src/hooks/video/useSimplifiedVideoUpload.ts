'use client';

import { useState, useCallback, useRef } from 'react';

import { VideoAsset } from '@/lib/data-access/schemas/video.schema';
import {
  withUploadRetry,
  createRetryableFetch,
  isRetryableError,
} from '@/lib/utils/upload-retry';

// Constants for magic numbers
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 100;
const MAX_FILE_SIZE_GB = 10;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const BYTES_PER_GB = BYTES_PER_MB * BYTES_PER_KB;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_GB * BYTES_PER_GB;
const UPLOAD_PROGRESS_COMPLETE = 100;
const STATUS_OK_MIN = 200;
const STATUS_OK_MAX = 300;

// Simplified form data interface matching backend API
export interface VideoFormData {
  title: string;
  description: string;
  privacySetting: 'public' | 'private';
  encodingTier: 'baseline' | 'plus';
  collectiveId?: string;
}

// Upload states
export type UploadState =
  | 'idle'
  | 'uploading'
  | 'retrying'
  | 'processing'
  | 'complete'
  | 'error';

interface UseSimplifiedVideoUploadReturn {
  // Form state
  formData: VideoFormData;
  updateFormData: (updates: Partial<VideoFormData>) => void;
  isFormValid: boolean;

  // Upload state
  uploadState: UploadState;
  uploadProgress: number;
  error: string | null;
  videoAsset: VideoAsset | null;

  // Retry state
  retryAttempt?: number;
  maxRetries?: number;
  isRetryable?: boolean;

  // Operations
  selectFile: (file: File) => boolean;
  uploadAndPublish: () => Promise<void>;
  cancelUpload: () => void;
  reset: () => void;

  // Status helpers
  canSubmit: boolean;
  isUploading: boolean;
  isRetrying: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  hasError: boolean;
}

const initialFormData: VideoFormData = {
  title: '',
  description: '',
  privacySetting: 'public',
  encodingTier: 'baseline',
};

export const useSimplifiedVideoUpload = (
  collectiveId?: string,
): UseSimplifiedVideoUploadReturn => {
  // Form state
  const [formData, setFormData] = useState<VideoFormData>({
    ...initialFormData,
    ...(collectiveId ? { collectiveId } : {}),
  });

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null);

  // Retry state
  const [retryAttempt, setRetryAttempt] = useState<number | undefined>(
    undefined,
  );
  const [maxRetries, setMaxRetries] = useState<number | undefined>(undefined);
  const [isRetryable, setIsRetryable] = useState<boolean | undefined>(
    undefined,
  );

  // Refs for upload control
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form validation
  const isFormValid =
    formData.title.trim().length >= MIN_TITLE_LENGTH &&
    formData.title.length <= MAX_TITLE_LENGTH;
  const canSubmit =
    selectedFile !== null &&
    isFormValid &&
    (uploadState === 'idle' || uploadState === 'error');

  // Update form data
  const updateFormData = useCallback((updates: Partial<VideoFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // File selection with validation
  const selectFile = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_FILE_SIZE_GB}GB`);
      return false;
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid video file (MP4, MOV, or AVI)');
      return false;
    }

    setSelectedFile(file);
    setError(null);
    return true;
  }, []);

  // Modern upload with progress tracking and retry support
  const uploadFile = useCallback(
    async (file: File, uploadUrl: string): Promise<void> => {
      return withUploadRetry(
        (onProgress) => {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Set up abort controller
            const controller = new AbortController();
            abortControllerRef.current = controller;

            // Progress tracking
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round(
                  (event.loaded / event.total) * UPLOAD_PROGRESS_COMPLETE,
                );
                if (onProgress) {
                  onProgress(percentComplete);
                }
                setUploadProgress(percentComplete);
              }
            });

            // Success handler
            xhr.addEventListener('load', () => {
              if (xhr.status >= STATUS_OK_MIN && xhr.status < STATUS_OK_MAX) {
                if (onProgress) {
                  onProgress(UPLOAD_PROGRESS_COMPLETE);
                }
                setUploadProgress(UPLOAD_PROGRESS_COMPLETE);
                resolve();
              } else {
                const uploadError = new Error(
                  `Upload failed: ${xhr.status} ${xhr.statusText}`,
                ) as Error & { status: number };
                uploadError.status = xhr.status;
                reject(uploadError);
              }
            });

            // Error handlers
            xhr.addEventListener('error', () => {
              const networkError = new Error(
                'Upload failed due to network error',
              ) as Error & { code: string };
              networkError.code = 'NETWORK_ERROR';
              reject(networkError);
            });

            xhr.addEventListener('abort', () => {
              const abortError = new Error('Upload cancelled') as Error & {
                retryable: boolean;
              };
              abortError.retryable = false; // Don't retry manual cancellations
              reject(abortError);
            });

            // Handle abort signal
            controller.signal.addEventListener('abort', () => {
              xhr.abort();
            });

            // Start upload
            xhr.open('PUT', uploadUrl);
            xhr.send(file);
          });
        },
        {
          maxRetries: 3,
          baseDelay: 2000, // 2 seconds
          maxDelay: 30000, // 30 seconds
          onRetryProgress: (attempt, max): void => {
            setUploadState('retrying');
            setRetryAttempt(attempt);
            setMaxRetries(max);
          },
        },
      );
    },
    [],
  );

  // Main upload and publish operation with retry support
  const uploadAndPublish = useCallback(async (): Promise<void> => {
    if (!selectedFile || !isFormValid) {
      throw new Error('Invalid form data or no file selected');
    }

    setUploadState('uploading');
    setError(null);
    setUploadProgress(0);
    setRetryAttempt(undefined);
    setMaxRetries(undefined);
    setIsRetryable(undefined);

    // Create retryable fetch with configuration
    const retryableFetch = createRetryableFetch({
      maxRetries: 2, // Fewer retries for API calls
      baseDelay: 1000,
      maxDelay: 10000,
    });

    try {
      // Step 1: Create upload URL
      const createResponse = await retryableFetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          privacy_setting: formData.privacySetting,
          encoding_tier: formData.encodingTier,
          collective_id: formData.collectiveId,
          is_published: false,
        }),
      });

      const responseData = (await createResponse.json()) as {
        uploadUrl: string;
        video: VideoAsset;
      };
      const { uploadUrl, video } = responseData;
      setVideoAsset(video);

      // Step 2: Upload file with retry logic
      await uploadFile(selectedFile, uploadUrl);

      // Step 3: Publish video
      setUploadState('processing');
      setUploadProgress(UPLOAD_PROGRESS_COMPLETE);

      const publishResponse = await retryableFetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          privacy_setting: formData.privacySetting,
          encoding_tier: formData.encodingTier,
        }),
      });

      const publishData = (await publishResponse.json()) as {
        data: VideoAsset;
      };
      setVideoAsset(publishData.data);
      setUploadState('complete');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadState('idle');
        setUploadProgress(0);
      } else {
        setUploadState('error');
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
        setError(errorMessage);

        // Set retry information
        const retryable = isRetryableError(error);
        setIsRetryable(retryable);

        if (retryable) {
          console.warn('[upload_failed_retryable]', {
            error: errorMessage,
            retry_attempt: retryAttempt,
            max_retries: maxRetries,
          });
        }
      }
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    selectedFile,
    formData,
    isFormValid,
    uploadFile,
    retryAttempt,
    maxRetries,
  ]);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploadState('idle');
    setUploadProgress(0);
    setError(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setFormData({
      ...initialFormData,
      ...(collectiveId ? { collectiveId } : {}),
    });
    setSelectedFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setError(null);
    setVideoAsset(null);

    // Reset retry state
    setRetryAttempt(undefined);
    setMaxRetries(undefined);
    setIsRetryable(undefined);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [collectiveId]);

  return {
    // Form state
    formData,
    updateFormData,
    isFormValid,

    // Upload state
    uploadState,
    uploadProgress,
    error,
    videoAsset,

    // Retry state
    ...(retryAttempt !== undefined ? { retryAttempt } : {}),
    ...(maxRetries !== undefined ? { maxRetries } : {}),
    ...(isRetryable !== undefined ? { isRetryable } : {}),

    // Operations
    selectFile,
    uploadAndPublish,
    cancelUpload,
    reset,

    // Status helpers
    canSubmit,
    isUploading: uploadState === 'uploading',
    isRetrying: uploadState === 'retrying',
    isProcessing: uploadState === 'processing',
    isComplete: uploadState === 'complete',
    hasError: uploadState === 'error',
  };
};
