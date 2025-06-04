'use client';

import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';

interface UploadStepProps {
  videoUpload: ReturnType<typeof useVideoUpload>;
}

export function UploadStep({ videoUpload }: UploadStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
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
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 2GB';
    }

    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setDragActive(false);

      if (!files || files.length === 0) return;

      const file = files[0];
      const error = validateFile(file);

      if (error) {
        // Could add error state to videoUpload hook
        alert(error);
        return;
      }

      setSelectedFile(file);
      // Auto-start upload when file is selected
      videoUpload.uploadVideo(file);
    },
    [videoUpload],
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadStatusContent = () => {
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
              onClick={() =>
                selectedFile && videoUpload.uploadVideo(selectedFile)
              }
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
            Click "Continue to Details" to add video information.
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
              {selectedFile && (
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

    return null;
  };

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
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('video-file-input')?.click()}
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
            Supports MP4, MOV, AVI up to 2GB
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
      {selectedFile && (
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
