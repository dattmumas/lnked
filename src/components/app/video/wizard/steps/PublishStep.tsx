'use client';

import React from 'react';
import {
  CheckCircle,
  Upload,
  Loader2,
  AlertCircle,
  Share,
  Eye,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';

interface PublishStepProps {
  videoUpload: ReturnType<typeof useVideoUpload>;
  onComplete: () => void;
}

export function PublishStep({ videoUpload, onComplete }: PublishStepProps) {
  const { formData, videoAsset, isPublishing, publishVideo } = videoUpload;

  const handlePublish = async () => {
    const success = await publishVideo();
    if (success) {
      onComplete();
    }
  };

  if (isPublishing) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Publishing Your Video...
          </h2>
          <p className="text-muted-foreground">
            Please wait while we publish your video. This may take a few
            moments.
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 max-w-md mx-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Finalizing upload...</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Processing video...</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Publishing video...</span>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Ready to Publish!</h2>
        <p className="text-muted-foreground">
          Your video "{formData.title}" is ready to be published and made
          available for viewing.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Video Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Video Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Title</span>
                <span className="font-medium">{formData.title}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Privacy</span>
                <Badge variant="outline" className="capitalize">
                  {formData.privacySetting}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block">Quality</span>
                <span className="font-medium">
                  {formData.encodingTier === 'smart'
                    ? 'Smart Encoding'
                    : formData.encodingTier === 'baseline'
                      ? 'Standard Quality'
                      : 'High Quality'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Tags</span>
                <span className="font-medium">
                  {formData.tags.length > 0
                    ? `${formData.tags.length} tags`
                    : 'No tags'}
                </span>
              </div>
            </div>

            {formData.description && (
              <div>
                <span className="text-muted-foreground block text-sm">
                  Description
                </span>
                <p className="text-sm mt-1 line-clamp-3">
                  {formData.description}
                </p>
              </div>
            )}

            {formData.tags.length > 0 && (
              <div>
                <span className="text-muted-foreground block text-sm mb-2">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              What Happens Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Video Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Your video will be processed and optimized for streaming
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Video Publishing</p>
                  <p className="text-sm text-muted-foreground">
                    Your video will be made available for viewing and sharing
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Ready to Watch</p>
                  <p className="text-sm text-muted-foreground">
                    Your video will be available for viewing within a few
                    minutes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Publishing Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Publishing Notice</AlertTitle>
          <AlertDescription>
            Once published, your video will be visible according to your privacy
            settings. You can always edit the title, description, and settings
            later from your video management dashboard.
          </AlertDescription>
        </Alert>

        {/* Publish Button */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex-1 max-w-xs"
          >
            <Upload className="h-4 w-4 mr-2" />
            Publish Video
          </Button>
        </div>

        {/* Additional Actions */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need to make changes?{' '}
            <span className="text-foreground">
              Use the back button to edit your video details.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
