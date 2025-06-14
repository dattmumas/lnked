'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save } from 'lucide-react';
import { usePostEditor } from '@/lib/hooks/use-post-editor';
import dynamic from 'next/dynamic';

// Dynamic import for the editor to avoid SSR issues
const PostEditor = dynamic(() => import('@/components/editor/PostEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-muted-foreground">Loading editor...</span>
    </div>
  ),
});

export default function EditPostEditorPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.slug as string;

  const {
    formData,
    updateFormData,
    autoSaveStatus,
    isDirty,
    isLoading,
    savePost,
    setCurrentPage,
    originalData,
  } = usePostEditor(postId);

  // Set current page for state management
  useEffect(() => {
    setCurrentPage('editor');
  }, [setCurrentPage]);

  const handleContinue = async () => {
    // Save before navigating if there are changes
    if (isDirty && formData?.title?.trim()) {
      await savePost();
    }
    router.push(`/posts/${postId}/edit/details`);
  };

  const handleGoBack = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?',
      );
      if (!confirmed) return;
    }
    router.push('/dashboard/posts');
  };

  // Memoize the content change handler to prevent unnecessary re-renders
  const handleContentChange = useCallback(
    (content: string) => {
      updateFormData({ content });
    },
    [updateFormData],
  );

  const handleManualSave = async () => {
    if (formData?.title?.trim()) {
      await savePost();
    }
  };

  // Memoize the initial content to prevent the editor from re-initializing
  // Only use the original content from when the post was first loaded
  const stableInitialContent = useMemo(() => {
    return originalData?.content || undefined;
  }, [originalData?.id]); // Only change when we load a different post

  // Show loading state while post data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-3">
            {/* Auto-save status */}
            <div className="flex items-center gap-2">
              {autoSaveStatus === 'saving' && (
                <Badge variant="outline" className="animate-pulse">
                  Saving...
                </Badge>
              )}
              {autoSaveStatus === 'saved' && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  Saved
                </Badge>
              )}
              {autoSaveStatus === 'error' && (
                <Badge variant="destructive">Save Failed</Badge>
              )}
              {isDirty && autoSaveStatus === 'idle' && (
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-600"
                >
                  Unsaved Changes
                </Badge>
              )}
            </div>

            {/* Manual save button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSave}
              disabled={!formData?.title?.trim() || autoSaveStatus === 'saving'}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </header>

      {/* Full-screen editor */}
      <main className="px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title input */}
          <div>
            <input
              type="text"
              placeholder="Post title..."
              value={formData?.title?.trim() ?? ''}
              onChange={(e) => updateFormData({ title: e.target.value })}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground focus:ring-0 p-0"
            />
          </div>

          {/* Content editor */}
          <div className="min-h-[500px]">
            <PostEditor
              key={`edit-post-editor-${postId}`}
              initialContent={stableInitialContent}
              onChange={handleContentChange}
              placeholder="Start writing your post..."
            />
          </div>
        </div>
      </main>

      {/* Floating continue button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="shadow-lg"
          onClick={handleContinue}
          disabled={!formData?.title?.trim()}
        >
          Continue to Settings →
        </Button>
      </div>
    </div>
  );
}
