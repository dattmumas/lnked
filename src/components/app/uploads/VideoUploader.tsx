'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, Video, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadService } from '@/lib/services/upload-service';

// Simple inline Progress component
const Progress = ({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

interface VideoFile {
  id: string;
  file: File;
  metadata: {
    title: string;
    description: string;
    is_public: boolean;
    collective_id?: string;
  };
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  asset_id?: string;
}

interface VideoUploaderProps {
  onUploadComplete?: (assetId: string, metadata: VideoFile['metadata']) => void;
  onUploadError?: (error: string) => void;
  collectiveId?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export default function VideoUploader({
  onUploadComplete,
  onUploadError,
  collectiveId,
  maxFiles = 5,
  acceptedTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
  ],
}: VideoUploaderProps) {
  const [uploads, setUploads] = useState<VideoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createVideoFile = useCallback(
    (file: File): VideoFile => {
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          is_public: false,
          collective_id: collectiveId,
        },
        progress: 0,
        status: 'pending',
      };
    },
    [collectiveId],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      // Validate file count
      if (uploads.length + files.length > maxFiles) {
        onUploadError?.(`Cannot upload more than ${maxFiles} files at once`);
        return;
      }

      // Validate file types
      const invalidFiles = files.filter(
        (file) => !acceptedTypes.includes(file.type),
      );
      if (invalidFiles.length > 0) {
        onUploadError?.(
          `Invalid file types: ${invalidFiles.map((f) => f.name).join(', ')}`,
        );
        return;
      }

      // Validate file sizes (5GB limit)
      const oversizedFiles = files.filter(
        (file) => file.size > 5 * 1024 * 1024 * 1024,
      );
      if (oversizedFiles.length > 0) {
        onUploadError?.(
          `Files exceed 5GB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`,
        );
        return;
      }

      const newUploads = files.map(createVideoFile);
      setUploads((prev) => [...prev, ...newUploads]);

      // Clear the input
      event.target.value = '';
    },
    [uploads.length, maxFiles, acceptedTypes, onUploadError, createVideoFile],
  );

  const updateUploadMetadata = useCallback(
    (
      uploadId: string,
      field: keyof VideoFile['metadata'],
      value: string | boolean | string[],
    ) => {
      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === uploadId
            ? { ...upload, metadata: { ...upload.metadata, [field]: value } }
            : upload,
        ),
      );
    },
    [],
  );

  const removeUpload = useCallback((uploadId: string) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
  }, []);

  const startUpload = useCallback(
    async (uploadId: string) => {
      const upload = uploads.find((u) => u.id === uploadId);
      if (!upload) return;

      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, status: 'uploading', progress: 0 } : u,
        ),
      );

      try {
        const result = await uploadService.uploadVideo(
          upload.file,
          upload.metadata,
          (percentage) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId ? { ...u, progress: percentage } : u,
              ),
            );
          },
        );

        if (result.success && result.data) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? {
                    ...u,
                    status: 'completed',
                    progress: 100,
                    asset_id: result.data!.asset_id,
                  }
                : u,
            ),
          );

          onUploadComplete?.(result.data.asset_id, upload.metadata);
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? {
                    ...u,
                    status: 'failed',
                    error: result.error || 'Upload failed',
                  }
                : u,
            ),
          );

          onUploadError?.(result.error || 'Upload failed');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: 'failed', error: errorMessage }
              : u,
          ),
        );

        onUploadError?.(errorMessage);
      }
    },
    [uploads, onUploadComplete, onUploadError],
  );

  const startAllUploads = useCallback(async () => {
    const pendingUploads = uploads.filter((u) => u.status === 'pending');
    if (pendingUploads.length === 0) return;

    setIsUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (const upload of pendingUploads) {
      await startUpload(upload.id);
    }

    setIsUploading(false);
  }, [uploads, startUpload]);

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Video className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Video className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <div className="space-y-2">
                <Label htmlFor="video-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Choose video files
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    or drag and drop
                  </span>
                </Label>
                <Input
                  id="video-upload"
                  type="file"
                  multiple
                  accept={acceptedTypes.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">
                  MP4, MOV, AVI, WebM up to 5GB each • Max {maxFiles} files
                </p>
              </div>
            </div>

            {uploads.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {uploads.length} file{uploads.length > 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={startAllUploads}
                  disabled={
                    isUploading || uploads.every((u) => u.status !== 'pending')
                  }
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upload Queue</h3>

          {uploads.map((upload) => (
            <Card key={upload.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(upload.status)}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{upload.file.name}</h4>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(upload.file.size)} •{' '}
                          {upload.file.type}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            upload.status === 'completed'
                              ? 'default'
                              : upload.status === 'failed'
                                ? 'destructive'
                                : upload.status === 'uploading'
                                  ? 'secondary'
                                  : 'outline'
                          }
                        >
                          {upload.status}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUpload(upload.id)}
                          disabled={upload.status === 'uploading'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {upload.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={upload.progress} className="h-2" />
                        <p className="text-xs text-gray-500">
                          {upload.progress}% uploaded
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {upload.status === 'failed' && upload.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-sm text-red-600">{upload.error}</p>
                      </div>
                    )}

                    {/* Metadata Form */}
                    {upload.status === 'pending' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                        <div className="space-y-2">
                          <Label htmlFor={`title-${upload.id}`}>Title</Label>
                          <Input
                            id={`title-${upload.id}`}
                            value={upload.metadata.title}
                            onChange={(e) =>
                              updateUploadMetadata(
                                upload.id,
                                'title',
                                e.target.value,
                              )
                            }
                            placeholder="Video title"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`description-${upload.id}`}>
                            Description
                          </Label>
                          <Textarea
                            id={`description-${upload.id}`}
                            value={upload.metadata.description}
                            onChange={(e) =>
                              updateUploadMetadata(
                                upload.id,
                                'description',
                                e.target.value,
                              )
                            }
                            placeholder="Video description"
                            rows={2}
                          />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={upload.metadata.is_public}
                              onChange={(e) =>
                                updateUploadMetadata(
                                  upload.id,
                                  'is_public',
                                  e.target.checked,
                                )
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Make public</span>
                          </label>

                          <Button
                            onClick={() => startUpload(upload.id)}
                            disabled={!upload.metadata.title.trim()}
                            size="sm"
                          >
                            Upload
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Success State */}
                    {upload.status === 'completed' && upload.asset_id && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-sm text-green-600">
                          ✅ Upload completed! Asset ID: {upload.asset_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
