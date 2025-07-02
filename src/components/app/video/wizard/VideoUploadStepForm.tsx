'use client';

import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RotateCcw,
  Upload,
  Play,
  FileVideo,
  X,
} from 'lucide-react';
import React, { useCallback, useRef, useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useSimplifiedVideoUpload } from '@/hooks/video/useSimplifiedVideoUpload';

interface VideoUploadStepFormProps {
  onComplete: (videoId: string) => void;
  onCancel?: () => void;
  onReset?: () => void;
}

export default function VideoUploadStepForm({
  onComplete,
  onCancel,
  onReset,
}: VideoUploadStepFormProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Use the video upload hook but we'll control the flow differently
  const {
    formData,
    updateFormData,
    uploadState,
    uploadProgress,
    error,
    videoAsset,
    selectFile,
    uploadAndPublish,
    cancelUpload,
    reset,
    isUploading,
    isRetrying,
    isProcessing,
    isComplete,
    hasError,
  } = useSimplifiedVideoUpload();

  // Handle file selection with preview
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const isValid = selectFile(file);
        if (isValid) {
          setSelectedFile(file);

          // Create preview URL for video
          const url = URL.createObjectURL(file);
          setFilePreviewUrl(url);

          // Auto-populate title from filename for the upload
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
          updateFormData({ title: nameWithoutExtension });
        }
      }
    },
    [selectFile, updateFormData],
  );

  // Handle upload (without publish)
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      await uploadAndPublish();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [selectedFile, uploadAndPublish]);

  // When upload completes successfully, call onComplete with video ID
  useEffect(() => {
    if (isComplete && videoAsset) {
      onComplete(videoAsset.id);
    }
  }, [isComplete, videoAsset, onComplete]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Remove file and reset
  const handleRemoveFile = useCallback(() => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    reset();
    onReset?.();
  }, [filePreviewUrl, reset, onReset]);

  // Click handlers for upload area
  const handleUploadAreaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadAreaKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  // Form validation - only need file selection for upload step
  const canProceed = selectedFile && !isUploading && !isProcessing;

  return (
    <div className="space-y-6">
      {/* File Selection/Preview Area */}
      {!selectedFile ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={handleUploadAreaClick}
          role="button"
          tabIndex={0}
          onKeyDown={handleUploadAreaKeyDown}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">Choose a video file</p>
          <p className="text-sm text-gray-500">MP4, MOV, or AVI up to 10GB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-start gap-4">
            {/* Video Preview */}
            <div className="flex-shrink-0">
              <div className="relative w-24 h-16 bg-gray-100 rounded-lg overflow-hidden">
                {filePreviewUrl ? (
                  <video
                    src={filePreviewUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="h-8 w-8 p-0"
                  disabled={isUploading || isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {(isUploading || isRetrying || isProcessing) && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {isRetrying
                ? 'Retrying upload...'
                : isProcessing
                  ? 'Processing video...'
                  : 'Uploading...'}
            </span>
            {!isProcessing && (
              <span className="text-sm text-muted-foreground">
                {uploadProgress}%
              </span>
            )}
          </div>

          {!isProcessing && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isRetrying ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                This may take a few moments...
              </span>
            </div>
          )}

          {isRetrying && (
            <div className="flex items-center text-sm text-yellow-600">
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
              Network issue detected, retrying...
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-green-600 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span>Video uploaded successfully! Proceeding to next step...</span>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Upload failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleUpload} size="sm" variant="outline">
              Try Again
            </Button>
            <Button onClick={handleRemoveFile} size="sm" variant="ghost">
              Choose Different File
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          onClick={handleUpload}
          disabled={!canProceed}
          className="flex-1"
        >
          {isUploading || isRetrying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isRetrying ? 'Retrying...' : 'Uploading...'}
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Upload Video'
          )}
        </Button>

        {onCancel && (
          <Button
            onClick={() => {
              if (isUploading || isProcessing) {
                cancelUpload();
              }
              onCancel();
            }}
            variant="outline"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
