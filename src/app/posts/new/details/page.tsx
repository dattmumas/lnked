'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Eye,
  Globe,
  Lock,
  FileText,
  Video,
  Upload,
  Sparkles,
} from 'lucide-react';
import { usePostEditor } from '@/lib/hooks/use-post-editor';

export default function NewPostDetailsPage() {
  const router = useRouter();
  const {
    formData,
    updateFormData,
    autoSaveStatus,
    savePost,
    publishPost,
    setCurrentPage,
  } = usePostEditor();

  // Set current page for state management
  useEffect(() => {
    setCurrentPage('details');
  }, [setCurrentPage]);

  const handleBackToEditor = () => {
    router.push('/posts/new');
  };

  const handleSaveDraft = async () => {
    await savePost();
  };

  const handlePublish = async () => {
    await publishPost();
    router.push('/dashboard/posts');
  };

  const handlePreview = () => {
    // TODO: Implement preview functionality
    console.info('Preview functionality to be implemented');
  };

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
              onClick={handleSaveDraft}
              disabled={autoSaveStatus === 'saving'}
            >
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!formData.title.trim() || !formData.content.trim()}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              Publish Post
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Post Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Post Type
              </CardTitle>
              <CardDescription>
                Choose the type of content for your post
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={
                    formData.post_type === 'text' ? 'default' : 'outline'
                  }
                  onClick={() => updateFormData({ post_type: 'text' })}
                  className="h-20 flex-col gap-2"
                >
                  <FileText className="h-6 w-6" />
                  <span>Text Post</span>
                </Button>
                <Button
                  variant={
                    formData.post_type === 'video' ? 'default' : 'outline'
                  }
                  onClick={() => updateFormData({ post_type: 'video' })}
                  className="h-20 flex-col gap-2"
                >
                  <Video className="h-6 w-6" />
                  <span>Video Post</span>
                </Button>
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
                Add a thumbnail image for your post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload area */}
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop an image here or click to upload
                </p>
                <Button variant="outline" size="sm">
                  Choose File
                </Button>
              </div>

              {/* Thumbnail preview */}
              {formData.thumbnail_url && (
                <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                  <img
                    src={formData.thumbnail_url}
                    alt="Post thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* AI generation option */}
              <Button
                variant="ghost"
                className="w-full flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
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
                    <Label className="text-base">Public Post</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.is_public
                        ? 'Anyone can see this post'
                        : 'Only you and collaborators can see this post'}
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

              {/* Status display */}
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
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
