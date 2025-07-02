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
import { useRouter } from 'next/navigation';
import React, { useEffect, useCallback } from 'react';

import {
  CollectiveValidationFeedback,
  CollectiveSelectionModal,
} from '@/components/app/posts/collective-selection';
import { Badge } from '@/components/ui/badge';
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
import { usePostEditor } from '@/hooks/posts/usePostEditor';
import { useThumbnailUpload } from '@/hooks/posts/useThumbnailUpload';

import type { CollectiveWithPermission } from '@/lib/data-loaders/posts-loader';

// Constants
const SEO_TITLE_MAX_LENGTH = 60;
const META_DESCRIPTION_MAX_LENGTH = 160;
const THUMBNAIL_RECOMMENDED_WIDTH = 1200;
const THUMBNAIL_RECOMMENDED_HEIGHT = 630;

interface NewPostDetailsClientProps {
  userCollectives: CollectiveWithPermission[];
}

export function NewPostDetailsClient({
  userCollectives,
}: NewPostDetailsClientProps): React.ReactElement {
  const router = useRouter();
  const {
    formData,
    updateFormData,
    autoSaveStatus,
    savePost,
    publishPost,
    setCurrentPage,
    selectedCollectives,
    setSelectedCollectives,
  } = usePostEditor();

  // Modal state
  const [isCollectiveModalOpen, setIsCollectiveModalOpen] =
    React.useState(false);

  // Set current page for state management
  useEffect((): void => {
    setCurrentPage('details');
  }, [setCurrentPage]);

  const handleBackToEditor = useCallback((): void => {
    void router.push('/posts/new');
  }, [router]);

  const handleSaveDraft = useCallback(async (): Promise<void> => {
    await savePost();
  }, [savePost]);

  const handleSaveDraftClick = useCallback((): void => {
    void handleSaveDraft();
  }, [handleSaveDraft]);

  const handlePublish = useCallback(async (): Promise<void> => {
    try {
      await publishPost();
      void router.push('/posts');
    } catch (error: unknown) {
      // Error will be handled by the enhanced error system
      if (error instanceof Error) {
        console.error('Failed to publish post:', error.message);
      } else {
        console.error('Failed to publish post: Unknown error');
      }
    }
  }, [publishPost, router]);

  const handlePublishClick = useCallback((): void => {
    void handlePublish();
  }, [handlePublish]);

  const handlePreview = useCallback((): void => {
    // TODO: Implement preview functionality
    console.warn('Preview functionality to be implemented');
  }, []);

  const handleCollectiveSelectionChange = useCallback(
    (collectiveIds: string[]): void => {
      setSelectedCollectives(collectiveIds);
    },
    [setSelectedCollectives],
  );

  const handleOpenCollectiveModal = useCallback((): void => {
    setIsCollectiveModalOpen(true);
  }, []);

  const handleCloseCollectiveModal = useCallback((): void => {
    setIsCollectiveModalOpen(false);
  }, []);

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
    ...(formData.id ? { postId: formData.id } : {}),
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
      'thumbnail-input',
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

  // Convert server-side collective data to format expected by CollectiveSelectionSummary
  const selectedCollectiveData = userCollectives.filter((collective) =>
    selectedCollectives.includes(collective.id),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 py-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToEditor}
            className="flex items-center gap-2"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </Button>

          <h1 className="text-base font-semibold">Post Settings</h1>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex items-center gap-2"
              size="sm"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handlePublishClick}
              disabled={!canPublish}
              className="flex items-center gap-2"
              size="sm"
            >
              <Share2 className="h-4 w-4" />
              Publish Post
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Collective Selection - Now with server-side data */}
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
              <div className="space-y-4">
                {/* Compact Selection Display */}
                {selectedCollectives.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Selected collectives:
                      </span>
                      <span className="font-medium">
                        {selectedCollectives.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCollectiveData.map((collective) => (
                        <div
                          key={collective.id}
                          className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
                        >
                          <span className="font-medium">{collective.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {collective.user_role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No collectives selected</p>
                  </div>
                )}

                {/* Select Collectives Button */}
                <Button
                  variant="outline"
                  onClick={handleOpenCollectiveModal}
                  className="w-full flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {selectedCollectives.length === 0
                    ? 'Select Collectives'
                    : `Edit Collectives (${selectedCollectives.length} selected)`}
                </Button>

                {/* Real-time validation feedback */}
                {selectedCollectives.length > 0 && (
                  <CollectiveValidationFeedback
                    selectedCollectiveIds={selectedCollectives}
                    minSelections={0}
                    showPermissionWarnings={false}
                    showCollectiveInfo={false}
                  />
                )}
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
                      <p className="text-xs text-muted-foreground">
                        Supports: JPG, PNG, WebP (max 5MB)
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Hidden File Input */}
              <input
                id="thumbnail-input"
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
                <Globe className="h-5 w-5" />
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
                        : 'Only collective members can see this post'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_public === true}
                  onCheckedChange={handlePublicToggle}
                />
              </div>

              {/* Enhanced status display with collective info */}
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

      {/* Collective Selection Modal */}
      <CollectiveSelectionModal
        isOpen={isCollectiveModalOpen}
        onClose={handleCloseCollectiveModal}
        selectedCollectiveIds={selectedCollectives}
        onSelectionChange={handleCollectiveSelectionChange}
        title="Select Collectives"
        description="Choose which collectives to share this post with. You can select multiple collectives where you have posting permissions."
        initialCollectives={userCollectives}
      />
    </div>
  );
}
