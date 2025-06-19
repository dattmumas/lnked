'use client';

import { Upload, AlertCircle, CheckCircle2, Loader2, Film } from 'lucide-react';
import React, { useCallback, useState } from 'react';

// Constants
const BYTES_PER_KB = 1024;
const KB_TO_MB = 1024;
const MB_TO_GB = 1024;
const GB_TO_BYTES = BYTES_PER_KB * KB_TO_MB * MB_TO_GB;
const MAX_FILE_SIZE_GB = 2;
const FILE_SIZE_DECIMAL_PLACES = 2;

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';
import { cn } from '@/lib/utils';

interface UploadStepProps {
  videoUpload: ReturnType<typeof useVideoUpload>;
}

export function UploadStep({
  videoUpload,
}: UploadStepProps): React.ReactElement {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = useCallback((file: File): string | undefined => {
    // Check file type
    const validTypes = [
      'video/mp4',
      'video/mov',
      'video/avi',
      'video/quicktime',
    ];
    if (!validTypes.includes(file.type)) {
      return 'Please select a valid video file (MP4, MOV, or AVI)';
    }

    // Check file size (2GB limit)
    const maxSize = MAX_FILE_SIZE_GB * GB_TO_BYTES; // 2GB in bytes
    if (file.size > maxSize) {
      return `File size must be less than ${MAX_FILE_SIZE_GB}GB`;
    }

    return undefined;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null | undefined) => {
      setDragActive(false);

      if (files === undefined || files === null || files.length === 0) return;

      const file = files[0];
      const error = validateFile(file);

      if (error !== undefined) {
        // Use console.error instead of alert for better UX
        console.error('File validation error:', error);
        // TODO: Add proper error state to videoUpload hook
        return;
      }

      setSelectedFile(file);
      // Auto-start upload when file is selected
      void videoUpload.uploadVideo(file);
    },
    [videoUpload, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles],
  );

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = BYTES_PER_KB;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(FILE_SIZE_DECIMAL_PLACES))} ${sizes[i]}`;
  }, []);

  const handleRetryUpload = useCallback((): void => {
    if (selectedFile !== undefined) {
      void videoUpload.uploadVideo(selectedFile);
    }
  }, [selectedFile, videoUpload]);

  const getUploadStatusContent = useCallback(():
    | React.ReactElement
    | undefined => {
    if (videoUpload.hasUploadError) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>
            {videoUpload.uploadError}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleRetryUpload}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (videoUpload.isUploadComplete) {
      return (
        <Alert className="mb-4">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Upload Complete!</AlertTitle>
          <AlertDescription>
            Your video has been uploaded successfully and is being processed.
            Click &quot;Continue to Details&quot; to add video information.
          </AlertDescription>
        </Alert>
      );
    }

    if (videoUpload.isUploading || videoUpload.isProcessing) {
      return (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div className="flex-1">
              <p className="font-medium">
                {videoUpload.isUploading
                  ? 'Uploading video...'
                  : 'Processing video...'}
              </p>
              {selectedFile !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
          </div>
          <Progress value={videoUpload.uploadProgress} className="mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            {videoUpload.uploadProgress}% complete
          </p>
        </div>
      );
    }

    return undefined;
  }, [videoUpload, selectedFile, formatFileSize, handleRetryUpload]);

  const handleFileInputClick = useCallback((): void => {
    const element = document.getElementById('video-file-input');
    if (element) {
      element.click();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFileInputClick();
      }
    },
    [handleFileInputClick],
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Upload Your Video</h2>
        <p className="text-muted-foreground">
          Select a video file to get started with your upload
        </p>
      </div>

      {getUploadStatusContent()}

      {!videoUpload.isUploading && !videoUpload.isUploadComplete && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-border hover:border-blue-300 hover:bg-muted/50',
          )}
          role="button"
          tabIndex={0}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleFileInputClick}
          onKeyDown={handleKeyDown}
        >
          <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {dragActive ? 'Drop your video here' : 'Upload Your Video'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop your video file or click to browse
          </p>
          <Button size="lg" className="gap-2">
            <Upload className="h-4 w-4" />
            Choose File
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Supports MP4, MOV, AVI up to {MAX_FILE_SIZE_GB}GB
          </p>

          <input
            id="video-file-input"
            type="file"
            accept="video/mp4,video/mov,video/avi,video/quicktime"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* File Information */}
      {selectedFile !== undefined && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium mb-2">Selected File:</h4>
          <div className="flex items-center gap-3">
            <Film className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
