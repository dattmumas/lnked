'use client';

import { useState, useCallback } from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface VideoMetadata {
  title: string;
  description: string;
  is_public: boolean;
  collective_id?: string;
}

interface VideoUploaderProps {
  onUploadComplete?: (_assetId: string, _metadata: VideoMetadata) => void;
  onUploadError?: (_error: string) => void;
  collectiveId?: string;
}

export default function VideoUploader({
  onUploadComplete,
  onUploadError,
  collectiveId,
}: VideoUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'completed' | 'error'
  >('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);

  // Function to get upload URL from API
  const getUploadUrl = useCallback(async () => {
    try {
      const response = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Video',
          description: '',
          is_public: false,
          collective_id: collectiveId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.uploadUrl) {
        // Store the video ID for later use
        if (result.video?.id) {
          setAssetId(result.video.id);
        }
        return result.uploadUrl;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to get upload URL:', error);
      throw error;
    }
  }, [collectiveId]);

  const handleUploadStart = useCallback(() => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);
  }, []);

  const handleProgress = useCallback((e: CustomEvent<number>) => {
    setUploadProgress(e.detail);
  }, []);

  const handleSuccess = useCallback(() => {
    setUploadStatus('completed');
    setUploadProgress(100);

    if (assetId) {
      onUploadComplete?.(assetId, {
        title: 'Untitled Video',
        description: '',
        is_public: false,
        collective_id: collectiveId,
      });
    }
  }, [assetId, collectiveId, onUploadComplete]);

  const handleError = useCallback(
    (e: CustomEvent<{ message?: string }>) => {
      const message = e.detail?.message || 'Upload failed';
      setUploadStatus('error');
      setErrorMessage(message);
      onUploadError?.(message);
    },
    [onUploadError],
  );

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5" />;
    }
  };

  const getStatusBadge = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <Badge variant="secondary">Uploading... {uploadProgress}%</Badge>
        );
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon()}
              Upload Videos
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* MUX Uploader Component - Used as documented */}
            {/* Note: Type assertions are required here due to MuxUploader's complex event handler types */}
            {/* The component expects both React event handlers and DOM event listeners */}
            {/* eslint-disable @typescript-eslint/no-explicit-any */}
            <MuxUploader
              endpoint={getUploadUrl}
              onUploadStart={handleUploadStart}
              onProgress={handleProgress as any}
              onSuccess={handleSuccess}
              onError={handleError as any}
            />
            {/* eslint-enable @typescript-eslint/no-explicit-any */}

            {/* Error Message */}
            {uploadStatus === 'error' && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            {/* Success Message */}
            {uploadStatus === 'completed' && assetId && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-600">
                  Upload completed successfully! Video ID: {assetId}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
