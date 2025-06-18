import { useState, useCallback } from 'react';

import { validateThumbnailFile } from '@/lib/utils/thumbnail';

// Constants for progress and timing
const PROGRESS_INTERVAL_MS = 200;
const PROGRESS_INCREMENT = 10;
const PROGRESS_MAX_BEFORE_COMPLETE = 90;
const PROGRESS_COMPLETE = 100;
const PROGRESS_RESET_DELAY_MS = 1000;

interface UseThumbnailUploadProps {
  postId?: string;
  onUploadSuccess?: (thumbnailUrl: string) => void;
  onUploadError?: (error: string) => void;
}

interface UseThumbnailUploadReturn {
  isUploading: boolean;
  uploadError: string | undefined;
  uploadProgress: number;
  isDragOver: boolean;
  uploadThumbnail: (file: File) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearError: () => void;
}

interface UploadResponse {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

export function useThumbnailUpload({
  postId,
  onUploadSuccess,
  onUploadError,
}: UseThumbnailUploadProps): UseThumbnailUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const clearError = useCallback(() => {
    setUploadError(undefined);
  }, []);

  // Upload thumbnail file to API endpoint
  const uploadThumbnailFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    
    const hasPostId = postId !== undefined && postId !== null && postId !== '';
    if (hasPostId) {
      formData.append('postId', postId);
    }

    const response = await fetch('/api/upload-thumbnail', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json() as UploadResponse;

    const hasSuccessAndUrl = result.success === true && 
                            result.thumbnailUrl !== undefined && 
                            result.thumbnailUrl !== null && 
                            result.thumbnailUrl !== '';
    if (hasSuccessAndUrl && result.thumbnailUrl !== undefined) {
      return result.thumbnailUrl;
    }
    
    const hasError = result.error !== undefined && result.error !== null && result.error !== '';
    throw new Error(hasError ? result.error : 'Upload failed');
  }, [postId]);

  // Process and upload thumbnail
  const uploadThumbnail = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(undefined);
      setUploadProgress(0);

      try {
        // Validate file using utility function
        const validation = validateThumbnailFile(file);
        if (!validation.isValid) {
          const hasValidationError = validation.error !== undefined && 
                                    validation.error !== null && 
                                    validation.error !== '';
          throw new Error(hasValidationError ? validation.error : 'Invalid file');
        }

        // Simulate upload progress (since FormData doesn't provide real progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= PROGRESS_MAX_BEFORE_COMPLETE) {
              clearInterval(progressInterval);
              return PROGRESS_MAX_BEFORE_COMPLETE;
            }
            return prev + PROGRESS_INCREMENT;
          });
        }, PROGRESS_INTERVAL_MS);

        // Upload file to server
        const thumbnailUrl = await uploadThumbnailFile(file);

        // Complete progress
        clearInterval(progressInterval);
        setUploadProgress(PROGRESS_COMPLETE);

        // Call success callback
        if (onUploadSuccess) {
          onUploadSuccess(thumbnailUrl);
        }

        // Reset progress after a short delay
        setTimeout(() => {
          setUploadProgress(0);
        }, PROGRESS_RESET_DELAY_MS);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to upload thumbnail. Please try again.';
        
        setUploadError(errorMessage);
        
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, onUploadError, uploadThumbnailFile]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (imageFile) {
        void uploadThumbnail(imageFile);
      } else {
        const error = 'Please drop an image file (JPEG, PNG, WebP).';
        setUploadError(error);
        if (onUploadError) {
          onUploadError(error);
        }
      }
    },
    [uploadThumbnail, onUploadError]
  );

  // File input handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void uploadThumbnail(file);
      }
      // Reset the input value so the same file can be selected again
      const { target } = e;
      target.value = '';
    },
    [uploadThumbnail]
  );

  return {
    isUploading,
    uploadError,
    uploadProgress,
    isDragOver,
    uploadThumbnail,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    clearError,
  };
} 