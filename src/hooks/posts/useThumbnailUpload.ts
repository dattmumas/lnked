import { useState, useCallback } from 'react';

import { validateThumbnailFile } from '@/lib/utils/thumbnail';

interface UseThumbnailUploadProps {
  postId?: string;
  onUploadSuccess?: (thumbnailUrl: string) => void;
  onUploadError?: (error: string) => void;
}

interface UseThumbnailUploadReturn {
  isUploading: boolean;
  uploadError: string | null;
  uploadProgress: number;
  isDragOver: boolean;
  uploadThumbnail: (file: File) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearError: () => void;
}

export function useThumbnailUpload({
  postId,
  onUploadSuccess,
  onUploadError,
}: UseThumbnailUploadProps): UseThumbnailUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  // Upload thumbnail file to API endpoint
  const uploadThumbnailFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    
    if (postId) {
      formData.append('postId', postId);
    }

    const response = await fetch('/api/upload-thumbnail', {
      method: 'POST',
      body: formData,
    });

    const result: { success: boolean; thumbnailUrl?: string; error?: string } = await response.json();

    if (result.success && result.thumbnailUrl) {
      return result.thumbnailUrl;
    }
    throw new Error(result.error || 'Upload failed');
  };

  // Process and upload thumbnail
  const uploadThumbnail = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      try {
        // Validate file using utility function
        const validation = validateThumbnailFile(file);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid file');
        }

        // Simulate upload progress (since FormData doesn't provide real progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Upload file to server
        const thumbnailUrl = await uploadThumbnailFile(file);

        // Complete progress
        clearInterval(progressInterval);
        setUploadProgress(100);

        // Call success callback
        if (onUploadSuccess) {
          onUploadSuccess(thumbnailUrl);
        }

        // Reset progress after a short delay
        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);

      } catch (error) {
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
    [postId, onUploadSuccess, onUploadError, uploadThumbnailFile]
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
        uploadThumbnail(imageFile);
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
        uploadThumbnail(file);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = '';
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