'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Info,
  Eye,
  Play,
  Calendar,
  Tag,
  Settings,
  Globe,
  Link,
  Lock,
} from 'lucide-react';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';

interface PreviewStepProps {
  videoUpload: ReturnType<typeof useVideoUpload>;
}

export function PreviewStep({ videoUpload }: PreviewStepProps) {
  const { formData, videoAsset } = videoUpload;

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return Globe;
      case 'unlisted':
        return Link;
      case 'private':
        return Lock;
      default:
        return Globe;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return 'Public';
      case 'unlisted':
        return 'Unlisted';
      case 'private':
        return 'Private';
      default:
        return 'Public';
    }
  };

  const getQualityLabel = (tier: string) => {
    switch (tier) {
      case 'smart':
        return 'Smart Encoding';
      case 'baseline':
        return 'Standard Quality';
      case 'high':
        return 'High Quality';
      default:
        return 'Smart Encoding';
    }
  };

  // Mock user data for preview (in real app, this would come from auth context)
  const mockUser = {
    username: 'your_username',
    full_name: 'Your Name',
    avatar_url: null,
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Preview Your Video</h2>
        <p className="text-muted-foreground">
          Here's how your video will appear in the home feed
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Feed Preview */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Home Feed Preview
          </h3>

          <div className="border rounded-lg p-4 bg-muted/30">
            {/* Mock Feed Card */}
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {mockUser.full_name?.charAt(0) || 'Y'}
                  </div>

                  {/* User Info and Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">
                        {mockUser.full_name}
                      </h4>
                      <span className="text-muted-foreground text-sm">
                        @{mockUser.username}
                      </span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Just now
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mt-1 line-clamp-2">
                      {formData.title || 'Your video title will appear here'}
                    </h3>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Video Thumbnail/Player */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg mb-3 flex items-center justify-center">
                  {videoAsset?.thumbnail_url ? (
                    <img
                      src={videoAsset.thumbnail_url}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Play className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Video thumbnail
                      </p>
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
                      <Play className="h-8 w-8 text-white ml-1" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    0:00
                  </div>
                </div>

                {/* Description */}
                {formData.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {formData.description}
                  </p>
                )}

                {/* Tags */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        #{tag}
                      </Badge>
                    ))}
                    {formData.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{formData.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Interaction Buttons */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <div className="w-5 h-5 rounded border flex items-center justify-center">
                        👍
                      </div>
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <div className="w-5 h-5 rounded border flex items-center justify-center">
                        💬
                      </div>
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <div className="w-5 h-5 rounded border flex items-center justify-center">
                        🔖
                      </div>
                    </button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <div className="w-5 h-5 rounded border flex items-center justify-center">
                        📤
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Video Information Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Video Details */}
          <Card>
            <CardHeader>
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Video Details
              </h4>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Title:</span>
                <p className="font-medium">
                  {formData.title || 'No title set'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  Description:
                </span>
                <p className="text-sm">
                  {formData.description || 'No description provided'}
                </p>
              </div>
              {formData.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <Tag className="h-3 w-3" />
                    Tags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Settings */}
          <Card>
            <CardHeader>
              <h4 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Upload Settings
              </h4>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Privacy:</span>
                <div className="flex items-center gap-2">
                  {React.createElement(
                    getPrivacyIcon(formData.privacySetting),
                    {
                      className: 'h-4 w-4',
                    },
                  )}
                  <span className="font-medium">
                    {getPrivacyLabel(formData.privacySetting)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quality:</span>
                <span className="font-medium">
                  {getQualityLabel(formData.encodingTier)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="outline">Ready to Publish</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Publishing Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ready to Publish</AlertTitle>
          <AlertDescription>
            Your video will be processed and available in the feed within a few
            minutes after publishing. You can always edit the title,
            description, and privacy settings later.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
