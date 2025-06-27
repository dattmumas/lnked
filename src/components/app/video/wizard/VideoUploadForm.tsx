'use client';

import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSimplifiedVideoUpload } from '@/hooks/video/useSimplifiedVideoUpload';

import type { VideoFormData } from '@/hooks/video/useSimplifiedVideoUpload';

// Constants
const REDIRECT_DELAY_MS = 1500;
const DRAFT_SAVE_DELAY_MS = 1000;

interface VideoUploadFormProps {
  collectiveId?: string;
  onComplete?: (videoId: string) => void;
  onCancel?: () => void;
}

export default function VideoUploadForm({
  collectiveId,
  onComplete,
  onCancel,
}: VideoUploadFormProps): React.ReactElement {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the enhanced hook with retry capabilities
  const {
    formData,
    updateFormData,
    uploadState,
    uploadProgress,
    error,
    videoAsset,
    retryAttempt,
    maxRetries,
    isRetryable,
    selectFile,
    uploadAndPublish,
    cancelUpload,
    reset,
    canSubmit,
    isUploading,
    isRetrying,
    isProcessing,
    isComplete,
    hasError,
  } = useSimplifiedVideoUpload(collectiveId);

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        selectFile(file);

        // Auto-populate title from filename if title is empty
        if (formData.title.trim().length === 0) {
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
          updateFormData({ title: nameWithoutExtension });
        }
      }
    },
    [selectFile, formData.title, updateFormData],
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      await uploadAndPublish();

      // Clear draft from localStorage on success
      localStorage.removeItem('video-upload-draft');

      // Navigate after completion
      if (isComplete && videoAsset) {
        setTimeout(() => {
          if (onComplete) {
            onComplete(videoAsset.id);
          } else {
            router.push(`/videos/${videoAsset.id}`);
          }
        }, REDIRECT_DELAY_MS);
      }
    } catch (error) {
      // Error is handled by the hook
      console.error('Upload failed:', error);
    }
  }, [uploadAndPublish, isComplete, videoAsset, onComplete, router]);

  // Event handlers with proper callbacks
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFormData({ title: e.target.value });
    },
    [updateFormData],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFormData({ description: e.target.value });
    },
    [updateFormData],
  );

  const handlePrivacyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFormData({
        privacySetting: e.target.value as 'public' | 'private',
      });
    },
    [updateFormData],
  );

  const handleEncodingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFormData({ encodingTier: e.target.value as 'baseline' | 'plus' });
    },
    [updateFormData],
  );

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('video-upload-draft');
    if (savedDraft !== null) {
      try {
        const draftData = JSON.parse(savedDraft) as {
          title?: string;
          description?: string;
          privacySetting?: 'public' | 'private';
          encodingTier?: 'baseline' | 'plus';
          collectiveId?: string;
        };
        // Apply draft data to form
        if (
          draftData !== null &&
          draftData !== undefined &&
          Object.keys(draftData).length > 0
        ) {
          const updates: Partial<VideoFormData> = {
            ...draftData,
          };

          if (collectiveId) {
            updates.collectiveId = collectiveId;
          }

          updateFormData(updates);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [
    collectiveId,
    updateFormData,
    handleTitleChange,
    handleDescriptionChange,
    handlePrivacyChange,
    handleEncodingChange,
  ]);

  // Save draft when form data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (
        formData.title.trim().length > 0 ||
        formData.description.trim().length > 0
      ) {
        localStorage.setItem('video-upload-draft', JSON.stringify(formData));
      }
    }, DRAFT_SAVE_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [formData]);

  // Click handlers
  const handleUploadAreaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadAreaKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  // Submit handler for retry button
  const handleRetrySubmit = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  // Submit handler for main upload button
  const handleMainSubmit = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  const renderUploadArea = useCallback(
    (): React.JSX.Element => (
      <div className="space-y-4">
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
      </div>
    ),
    [handleFileSelect, handleUploadAreaClick, handleUploadAreaKeyDown],
  );

  const renderForm = useCallback(
    (): React.JSX.Element => (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="Enter video title..."
            maxLength={100}
            disabled={isUploading || isRetrying || isProcessing}
          />
          <p className="text-xs text-gray-500">
            {formData.title.length}/100 characters (minimum 3)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe your video..."
            className="min-h-[100px]"
            disabled={isUploading || isRetrying || isProcessing}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy Setting</Label>
            <select
              id="privacy"
              value={formData.privacySetting}
              onChange={handlePrivacyChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isUploading || isRetrying || isProcessing}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="encoding">Encoding Quality</Label>
            <select
              id="encoding"
              value={formData.encodingTier}
              onChange={handleEncodingChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isUploading || isRetrying || isProcessing}
            >
              <option value="baseline">Baseline</option>
              <option value="plus">Plus (Higher Quality)</option>
            </select>
          </div>
        </div>
      </div>
    ),
    [
      formData,
      handleTitleChange,
      handleDescriptionChange,
      handlePrivacyChange,
      handleEncodingChange,
      isUploading,
      isRetrying,
      isProcessing,
    ],
  );

  const renderUploadStatus = (): React.JSX.Element | undefined => {
    if (uploadState === 'idle') return undefined;

    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Upload Progress */}
            {(isUploading || isRetrying) && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {isRetrying
                      ? `Retrying (${retryAttempt}/${maxRetries})...`
                      : 'Uploading...'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isRetrying ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {isRetrying && (
                  <div className="flex items-center text-sm text-yellow-600">
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Network issue detected, retrying upload...
                  </div>
                )}
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing video...</span>
              </div>
            )}

            {/* Success State */}
            {isComplete && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Upload completed successfully!</span>
              </div>
            )}

            {/* Error State */}
            {hasError && (
              <div className="space-y-3">
                <div className="flex items-start space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Upload failed</p>
                    <p className="text-sm">{error}</p>
                    {isRetryable === true && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Retryable Error
                        </Badge>
                        <span className="text-xs text-gray-500">
                          This error can be retried automatically
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              {(isUploading || isRetrying) && (
                <Button onClick={cancelUpload} variant="outline" size="sm">
                  Cancel Upload
                </Button>
              )}

              {hasError && (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleRetrySubmit}
                    size="sm"
                    disabled={!canSubmit}
                  >
                    {isRetryable === true ? 'Retry Upload' : 'Try Again'}
                  </Button>
                  <Button onClick={reset} variant="outline" size="sm">
                    Reset Form
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderUploadArea()}
          {renderForm()}

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleMainSubmit}
              disabled={!canSubmit}
              className="flex-1"
            >
              {isUploading || isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRetrying ? 'Retrying...' : 'Uploading...'}
                </>
              ) : (
                'Upload & Publish'
              )}
            </Button>

            {onCancel && (
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
          </div>

          {renderUploadStatus()}
        </CardContent>
      </Card>
    </div>
  );
}
