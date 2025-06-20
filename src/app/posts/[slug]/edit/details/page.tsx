'use client';

import {
  ArrowLeft,
  Eye,
  Globe,
  Lock,
  Upload,
  Users,
  Share2,
  X,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import React, { useEffect, useCallback } from 'react';

import {
  CollectiveSelectionSummary,
  CollectiveValidationFeedback,
} from '@/components/app/posts/collective-selection';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useEnhancedPostEditor } from '@/hooks/posts/useEnhancedPostEditor';
import { useThumbnailUpload } from '@/hooks/posts/useThumbnailUpload';

// Constants
const SEO_TITLE_MAX_LENGTH = 60;
const META_DESCRIPTION_MAX_LENGTH = 160;
const THUMBNAIL_RECOMMENDED_WIDTH = 1200;
const THUMBNAIL_RECOMMENDED_HEIGHT = 630;
const THUMBNAIL_ASPECT_RATIO = 1.91;

export default function EditPostDetailsPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const postId = params.slug as string;

  const {
    formData,
    updateFormData,
    autoSaveStatus,
    isLoading,
    savePost,
    publishPost,
    setCurrentPage,
    selectedCollectives,
    setSelectedCollectives,
  } = useEnhancedPostEditor(postId);

  // Set current page for state management
  useEffect((): void => {
    setCurrentPage('details');
  }, [setCurrentPage]);

  const handleBackToEditor = useCallback((): void => {
    void router.push(`/posts/${postId}/edit`);
  }, [router, postId]);

  const handleSaveDraft = useCallback(async (): Promise<void> => {
    await savePost();
  }, [savePost]);

  const handleSaveDraftClick = useCallback((): void => {
    void handleSaveDraft();
  }, [handleSaveDraft]);

  const handlePublish = useCallback(async (): Promise<void> => {
    try {
      await publishPost();
      void router.push('/dashboard/posts');
    } catch (error: unknown) {
      console.error('Failed to publish post:', error);
      // Error will be handled by the enhanced error system
    }
  }, [publishPost, router]);

  const handlePublishClick = useCallback((): void => {
    void handlePublish();
  }, [handlePublish]);

  const handlePreview = useCallback((): void => {
    // Open preview in new tab
    window.open(`/posts/${postId}`, '_blank');
  }, [postId]);

  const handleCollectiveSelectionChange = useCallback(
    (collectiveIds: string[]): void => {
      setSelectedCollectives(collectiveIds);
    },
    [setSelectedCollectives],
  );

  const handleSubtitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      updateFormData({ subtitle: e.target.value });
    },
    [updateFormData],
  );

  const handleAuthorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      updateFormData({ author: e.target.value });
    },
    [updateFormData],
  );

  const handleSeoTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      updateFormData({ seo_title: e.target.value });
    },
    [updateFormData],
  );

  const handleMetaDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      updateFormData({ meta_description: e.target.value });
    },
    [updateFormData],
  );

  const handlePublicToggle = useCallback(
    (checked: boolean): void => {
      updateFormData({ is_public: checked });
    },
    [updateFormData],
  );

  // Thumbnail upload functionality
  const thumbnailUpload = useThumbnailUpload({
    postId,
    onUploadSuccess: useCallback(
      (thumbnailUrl: string): void => {
        updateFormData({ thumbnail_url: thumbnailUrl });
      },
      [updateFormData],
    ),
    onUploadError: useCallback((error: string): void => {
      console.error('Thumbnail upload error:', error);
      // Could add a toast notification here
    }, []),
  });

  const handleRemoveThumbnail = useCallback((): void => {
    updateFormData({ thumbnail_url: '' });
    thumbnailUpload.clearError();
  }, [updateFormData, thumbnailUpload]);

  const handleThumbnailInputClick = useCallback((): void => {
    const input = document.getElementById(
      'edit-thumbnail-input',
    ) as HTMLInputElement | null;
    if (input !== null && input !== undefined) {
      input.click();
    }
  }, []);

  const handleChangeThumbnailClick = useCallback((): void => {
    if (!thumbnailUpload.isUploading) {
      handleThumbnailInputClick();
    }
  }, [thumbnailUpload.isUploading, handleThumbnailInputClick]);

  const handleUploadAreaClick = useCallback((): void => {
    if (!thumbnailUpload.isUploading) {
      handleThumbnailInputClick();
    }
  }, [thumbnailUpload.isUploading, handleThumbnailInputClick]);

  const handleUploadAreaKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        !thumbnailUpload.isUploading
      ) {
        e.preventDefault();
        handleThumbnailInputClick();
      }
    },
    [thumbnailUpload.isUploading, handleThumbnailInputClick],
  );

  // Check if post is ready to publish
  const canPublish =
    (formData.title ?? '').trim().length > 0 &&
    (formData.content ?? '').trim().length > 0;

  // Show loading state while post data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading post settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToEditor}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </Button>

          <h1 className="text-lg font-semibold">
            {formData.status === 'active'
              ? 'Edit Published Post'
              : 'Post Settings'}
          </h1>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex items-center gap-2"
              disabled={formData.status === 'draft'}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraftClick}
              disabled={autoSaveStatus === 'saving'}
            >
              Save Changes
            </Button>
            {formData.status === 'draft' && (
              <Button
                onClick={handlePublishClick}
                disabled={!canPublish}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Publish Post
              </Button>
            )}
            {formData.status === 'active' && (
              <Button
                onClick={handlePublishClick}
                disabled={!canPublish}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Update Post
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Post Status Banner */}
          {formData.status === 'active' && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-100">
                    This post is currently published
                  </span>
                </div>
                {(formData.published_at ?? '').trim().length > 0 && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Published on{' '}
                    {new Date(formData.published_at ?? '').toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Collective Selection - Enhanced Feature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Share with Collectives
              </CardTitle>
              <CardDescription>
                Choose which collectives to share this post with. You can select
                multiple collectives where you have posting permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CollectiveSelectionSummary
                selectedCollectiveIds={selectedCollectives}
                onSelectionChange={handleCollectiveSelectionChange}
                placeholder="Select collectives to share your post with"
                showRoles
              />

              {/* Real-time validation feedback */}
              <div className="mt-4">
                <CollectiveValidationFeedback
                  selectedCollectiveIds={selectedCollectives}
                  minSelections={0}
                  showPermissionWarnings
                  showCollectiveInfo
                />
              </div>
            </CardContent>
          </Card>

          {/* Post Details */}
          <Card>
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
              <CardDescription>
                Additional information about your post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  placeholder="Optional subtitle for your post"
                  value={formData.subtitle ?? ''}
                  onChange={handleSubtitleChange}
                />
              </div>

              <div>
                <Label htmlFor="author">Author Byline</Label>
                <Input
                  id="author"
                  placeholder="Custom author name (optional)"
                  value={formData.author ?? ''}
                  onChange={handleAuthorChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Thumbnail Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Post Thumbnail
              </CardTitle>
              <CardDescription>
                Add a thumbnail image for your post (JPEG, PNG, WebP up to 15MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current thumbnail or upload area */}
              {(formData.thumbnail_url ?? '').trim().length > 0 ? (
                <div className="space-y-4">
                  <div className="aspect-video rounded-lg bg-muted overflow-hidden relative">
                    <Image
                      src={formData.thumbnail_url ?? ''}
                      alt="Post thumbnail"
                      width={THUMBNAIL_RECOMMENDED_WIDTH}
                      height={THUMBNAIL_RECOMMENDED_HEIGHT}
                      className="w-full h-full object-cover"
                    />
                    {thumbnailUpload.isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Uploading...</p>
                          {(thumbnailUpload.uploadProgress ?? 0) > 0 && (
                            <div className="w-32 bg-white/20 rounded-full h-2 mx-auto mt-2">
                              <div
                                className="bg-white rounded-full h-2 transition-all duration-300"
                                style={{
                                  width: `${thumbnailUpload.uploadProgress ?? 0}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleChangeThumbnailClick}
                      disabled={thumbnailUpload.isUploading}
                      className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      disabled={thumbnailUpload.isUploading}
                      className="px-3 py-2 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4 mr-1 inline" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    thumbnailUpload.isDragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${thumbnailUpload.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragOver={thumbnailUpload.handleDragOver}
                  onDragLeave={thumbnailUpload.handleDragLeave}
                  onDrop={thumbnailUpload.handleDrop}
                  onClick={handleUploadAreaClick}
                  onKeyDown={handleUploadAreaKeyDown}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload thumbnail image"
                >
                  {thumbnailUpload.isUploading ? (
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Uploading thumbnail...
                      </p>
                      {(thumbnailUpload.uploadProgress ?? 0) > 0 && (
                        <div className="w-32 bg-muted rounded-full h-2 mx-auto">
                          <div
                            className="bg-primary rounded-full h-2 transition-all duration-300"
                            style={{
                              width: `${thumbnailUpload.uploadProgress ?? 0}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        {thumbnailUpload.isDragOver
                          ? 'Drop your image here'
                          : 'Drop an image here or click to browse'}
                      </p>
                      <Button variant="outline" size="sm" type="button">
                        Choose File
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: {THUMBNAIL_RECOMMENDED_WIDTH}×
                        {THUMBNAIL_RECOMMENDED_HEIGHT}px (
                        {THUMBNAIL_ASPECT_RATIO}:1 ratio)
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Hidden File Input */}
              <input
                id="edit-thumbnail-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={thumbnailUpload.handleFileSelect}
                disabled={thumbnailUpload.isUploading}
                className="hidden"
              />

              {/* Upload Error */}
              {(thumbnailUpload.uploadError ?? '').trim().length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive mb-2">
                    {thumbnailUpload.uploadError}
                  </p>
                  <button
                    type="button"
                    onClick={thumbnailUpload.clearError}
                    className="text-xs text-destructive hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SEO & Metadata</CardTitle>
              <CardDescription>
                Optimize your post for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  placeholder="SEO-optimized title (max 60 characters)"
                  value={formData.seo_title ?? ''}
                  onChange={handleSeoTitleChange}
                  maxLength={SEO_TITLE_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(formData.seo_title ?? '').length}/{SEO_TITLE_MAX_LENGTH}{' '}
                  characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  placeholder="Brief description for search engines (max 160 characters)"
                  value={formData.meta_description ?? ''}
                  onChange={handleMetaDescriptionChange}
                  maxLength={META_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(formData.meta_description ?? '').length}/
                  {META_DESCRIPTION_MAX_LENGTH} characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Publishing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Publishing Settings
              </CardTitle>
              <CardDescription>Control who can see your post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {formData.is_public === true ? (
                    <Globe className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <Label className="text-base">
                      {formData.is_public === true
                        ? 'Public Post'
                        : 'Private Post'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.is_public === true
                        ? 'Anyone can see this post'
                        : 'Only you and collaborators can see this post'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_public === true}
                  onCheckedChange={handlePublicToggle}
                />
              </div>

              {/* Status display */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">Current Status</Label>
                <p className="text-sm text-muted-foreground capitalize">
                  {formData.status ?? 'draft'}
                  {(formData.published_at ?? '').trim().length > 0 && (
                    <span className="ml-2">
                      • Published{' '}
                      {new Date(
                        formData.published_at ?? '',
                      ).toLocaleDateString()}
                    </span>
                  )}
                </p>

                {/* Show selected collectives count */}
                {(selectedCollectives ?? []).length > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Ready to share with {selectedCollectives.length} collective
                    {selectedCollectives.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Publishing requirements */}
              {!canPublish && (
                <div className="pt-4 border-t bg-amber-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    Before you can publish:
                  </h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {(formData.title ?? '').trim().length === 0 && (
                      <li>• Add a title to your post</li>
                    )}
                    {(formData.content ?? '').trim().length === 0 && (
                      <li>• Add content to your post</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
