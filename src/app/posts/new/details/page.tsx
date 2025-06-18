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
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

export default function NewPostDetailsPage() {
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
  } = useEnhancedPostEditor();

  // Set current page for state management
  useEffect((): void => {
    setCurrentPage('details');
  }, [setCurrentPage]);

  const handleBackToEditor = () => {
    void router.push('/posts/new');
  };

  const handleSaveDraft = async () => {
    await savePost();
  };

  const handlePublish = async () => {
    try {
      await publishPost();
      void router.push('/dashboard/posts');
    } catch (error: unknown) {
      console.error('Failed to publish post:', error);
      // Error will be handled by the enhanced error system
    }
  };

  const handlePreview = () => {
    // TODO: Implement preview functionality
    console.info('Preview functionality to be implemented');
  };

  const handleCollectiveSelectionChange = (collectiveIds: string[]) => {
    setSelectedCollectives(collectiveIds);
  };

  // Thumbnail upload functionality
  const thumbnailUpload = useThumbnailUpload({
    postId: formData.id, // Will be undefined for new posts
    onUploadSuccess: (thumbnailUrl) => {
      updateFormData({ thumbnail_url: thumbnailUrl });
    },
    onUploadError: (error) => {
      console.error('Thumbnail upload error:', error);
      // Could add a toast notification here
    },
  });

  const handleRemoveThumbnail = () => {
    updateFormData({ thumbnail_url: '' });
    thumbnailUpload.clearError();
  };

  // Check if post is ready to publish
  const canPublish = formData.title.trim() && formData.content.trim();

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

          <h1 className="text-lg font-semibold">Post Settings</h1>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleSaveDraft()}
              disabled={autoSaveStatus === 'saving'}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => void handlePublish()}
              disabled={!canPublish}
              className="flex items-center gap-2"
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
          {/* Collective Selection - New Feature */}
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
                  value={formData.subtitle || ''}
                  onChange={(e) => updateFormData({ subtitle: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="author">Author Byline</Label>
                <Input
                  id="author"
                  placeholder="Custom author name (optional)"
                  value={formData.author || ''}
                  onChange={(e) => updateFormData({ author: e.target.value })}
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
              {formData.thumbnail_url ? (
                <div className="space-y-4">
                  <div className="aspect-video rounded-lg bg-muted overflow-hidden relative">
                    <img
                      src={formData.thumbnail_url}
                      alt="Post thumbnail"
                      className="w-full h-full object-cover"
                    />
                    {thumbnailUpload.isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Uploading...</p>
                          {thumbnailUpload.uploadProgress > 0 && (
                            <div className="w-32 bg-white/20 rounded-full h-2 mx-auto mt-2">
                              <div
                                className="bg-white rounded-full h-2 transition-all duration-300"
                                style={{
                                  width: `${thumbnailUpload.uploadProgress}%`,
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
                      onClick={() =>
                        document.getElementById('thumbnail-input')?.click()
                      }
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
                  onClick={() =>
                    !thumbnailUpload.isUploading &&
                    document.getElementById('thumbnail-input')?.click()
                  }
                >
                  {thumbnailUpload.isUploading ? (
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Uploading thumbnail...
                      </p>
                      {thumbnailUpload.uploadProgress > 0 && (
                        <div className="w-32 bg-muted rounded-full h-2 mx-auto">
                          <div
                            className="bg-primary rounded-full h-2 transition-all duration-300"
                            style={{
                              width: `${thumbnailUpload.uploadProgress}%`,
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
                        Recommended: 1200×630px (1.91:1 ratio)
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
              {thumbnailUpload.uploadError && (
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
                  value={formData.seo_title || ''}
                  onChange={(e) =>
                    updateFormData({ seo_title: e.target.value })
                  }
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.seo_title?.length || 0}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  placeholder="Brief description for search engines (max 160 characters)"
                  value={formData.meta_description || ''}
                  onChange={(e) =>
                    updateFormData({ meta_description: e.target.value })
                  }
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.meta_description?.length || 0}/160 characters
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
                  {formData.is_public ? (
                    <Globe className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <Label className="text-base">
                      {formData.is_public ? 'Public Post' : 'Private Post'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.is_public
                        ? 'Anyone can see this post'
                        : 'Only collective members can see this post'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    updateFormData({ is_public: checked })
                  }
                />
              </div>

              {/* Enhanced status display with collective info */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">Current Status</Label>
                <p className="text-sm text-muted-foreground capitalize">
                  {formData.status || 'draft'}
                  {formData.published_at && (
                    <span className="ml-2">
                      • Published{' '}
                      {new Date(formData.published_at).toLocaleDateString()}
                    </span>
                  )}
                </p>

                {/* Show selected collectives count */}
                {selectedCollectives.length > 0 && (
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
                    {!formData.title.trim() && (
                      <li>• Add a title to your post</li>
                    )}
                    {!formData.content.trim() && (
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
