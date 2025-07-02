'use client';

import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';

import { CollectiveSelectionModal } from '@/components/app/posts/collective-selection';
import VideoUploadStepForm from '@/components/app/video/wizard/VideoUploadStepForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import type { CollectiveWithPermission } from '@/lib/data-loaders/posts-loader';

interface VideoPostCreationClientProps {
  userCollectives: CollectiveWithPermission[];
}

type Step = 'upload' | 'details' | 'settings' | 'complete';

interface PostData {
  is_public: boolean;
  selectedCollectives: string[];
  videoTitle: string;
  videoDescription: string;
}

const STEPS: {
  key: Step;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'upload', label: 'Upload Video', icon: Upload },
  { key: 'details', label: 'Post Details', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'complete', label: 'Complete', icon: CheckCircle },
];

export default function VideoPostCreationClient({
  userCollectives,
}: VideoPostCreationClientProps): React.ReactElement {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isCollectiveModalOpen, setIsCollectiveModalOpen] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postData, setPostData] = useState<PostData>({
    is_public: true,
    selectedCollectives: [],
    videoTitle: '',
    videoDescription: '',
  });

  const currentStepIndex = STEPS.findIndex((step) => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleVideoUploadComplete = useCallback((uploadedVideoId: string) => {
    setVideoId(uploadedVideoId);
    setCurrentStep('details');
  }, []);

  const handleBackToUpload = useCallback(() => {
    setCurrentStep('upload');
    setVideoId(null); // Reset video ID when going back
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 'details') {
      setCurrentStep('settings');
    } else if (currentStep === 'settings') {
      handleCreatePost();
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 'settings') {
      setCurrentStep('details');
    } else if (currentStep === 'details') {
      setCurrentStep('upload');
    }
  }, [currentStep]);

  const handleCreatePost = useCallback(async () => {
    if (!videoId) return;

    setIsCreatingPost(true);
    try {
      // First, update the video metadata
      const videoUpdateResponse = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postData.videoTitle,
          description: postData.videoDescription,
        }),
      });

      if (!videoUpdateResponse.ok) {
        throw new Error('Failed to update video metadata');
      }

      // Then, create the post using the same title and description
      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          video_id: videoId,
          title: postData.videoTitle,
          body: postData.videoDescription,
          is_public: postData.is_public,
        }),
      });

      if (!postResponse.ok) {
        throw new Error('Failed to create post');
      }

      const result = await postResponse.json();
      if (result.success) {
        setCurrentStep('complete');
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/posts');
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating video post:', error);
      // TODO: Show error toast
    } finally {
      setIsCreatingPost(false);
    }
  }, [videoId, postData, router]);

  const handleCollectiveSelectionChange = useCallback(
    (collectiveIds: string[]) => {
      setPostData((prev) => ({ ...prev, selectedCollectives: collectiveIds }));
    },
    [],
  );

  const selectedCollectiveData = userCollectives.filter((collective) =>
    postData.selectedCollectives.includes(collective.id),
  );

  const canProceedFromDetails = postData.videoTitle.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/posts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <h1 className="text-lg font-semibold">Create Video Post</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mt-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.key === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-2 text-sm ${
                    isActive
                      ? 'text-primary font-medium'
                      : isCompleted
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {currentStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Video</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUploadStepForm
                  onComplete={handleVideoUploadComplete}
                  onReset={() => setVideoId(null)}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle>Post Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Details Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-title">Video Title *</Label>
                    <Input
                      id="video-title"
                      placeholder="Enter the video title"
                      value={postData.videoTitle}
                      onChange={(e) =>
                        setPostData((prev) => ({
                          ...prev,
                          videoTitle: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video-description">Video Description</Label>
                    <Textarea
                      id="video-description"
                      placeholder="Describe your video content..."
                      className="min-h-[100px]"
                      value={postData.videoDescription}
                      onChange={(e) =>
                        setPostData((prev) => ({
                          ...prev,
                          videoDescription: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedFromDetails}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Post Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Visibility Setting */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Public Post</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this post visible to everyone
                    </p>
                  </div>
                  <Switch
                    checked={postData.is_public}
                    onCheckedChange={(checked) =>
                      setPostData((prev) => ({ ...prev, is_public: checked }))
                    }
                  />
                </div>

                {/* Collective Selection */}
                <div className="space-y-4">
                  <Label>Share with Collectives</Label>

                  {postData.selectedCollectives.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedCollectiveData.map((collective) => (
                          <div
                            key={collective.id}
                            className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
                          >
                            <span className="font-medium">
                              {collective.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {collective.user_role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No collectives selected
                    </p>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setIsCollectiveModalOpen(true)}
                    className="w-full"
                  >
                    {postData.selectedCollectives.length === 0
                      ? 'Select Collectives'
                      : `Edit Collectives (${postData.selectedCollectives.length} selected)`}
                  </Button>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={isCreatingPost}>
                    {isCreatingPost ? 'Creating Post...' : 'Create Post'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'complete' && (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">
                  Post Created Successfully!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Your video post has been created and is ready to share.
                </p>
                <Button onClick={() => router.push('/posts')}>
                  View All Posts
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Collective Selection Modal */}
      <CollectiveSelectionModal
        isOpen={isCollectiveModalOpen}
        onClose={() => setIsCollectiveModalOpen(false)}
        initialCollectives={userCollectives}
        selectedCollectiveIds={postData.selectedCollectives}
        onSelectionChange={handleCollectiveSelectionChange}
        maxSelections={5}
        title="Share with Collectives"
        description="Choose which collectives to share this video post with"
      />
    </div>
  );
}
