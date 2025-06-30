'use client';

import { ArrowLeft, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React, { useEffect, useCallback, useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePostEditor } from '@/hooks/posts/usePostEditor';
import { usePostEditorStore } from '@/lib/stores/post-editor-store';

// Dynamic import for the editor to avoid SSR issues
const PostEditor = dynamic(() => import('@/components/editor/PostEditor'), {
  ssr: false,
  loading: (): React.ReactElement => (
    <div className="h-96 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-muted-foreground">Loading editor...</span>
    </div>
  ),
});

export default function NewPostEditorPage(): React.ReactElement {
  const router = useRouter();
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const {
    formData,
    updateFormData,
    autoSaveStatus,
    isDirty,
    savePost,
    setCurrentPage,
    resetForm,
  } = usePostEditor();

  // Set current page for state management
  useEffect((): void => {
    setCurrentPage('editor');
  }, [setCurrentPage]);

  // Clean up on unmount to prevent form persistence
  useEffect(() => {
    return () => {
      // Use the store directly to get the latest state
      const currentStore = usePostEditorStore.getState();
      // Only clear form if it's a new post (no ID) and not dirty
      if (!currentStore.formData.id && !currentStore.isDirty) {
        currentStore.clearForm();
      }
    };
  }, []); // Empty dependency array to run only on mount/unmount

  const handleContinue = useCallback(async (): Promise<void> => {
    // Save before navigating if there are changes
    if (isDirty && formData.title.trim()) {
      await savePost();
    }
    void router.push('/posts/new/details');
  }, [isDirty, formData.title, savePost, router]);

  const handleGoBack = useCallback((): void => {
    if (isDirty) {
      setShowUnsavedWarning(true);
      return;
    }
    void router.push('/posts');
  }, [isDirty, router]);

  const handleConfirmLeave = useCallback((): void => {
    // Reset form when leaving without saving
    resetForm();
    setShowUnsavedWarning(false);
    void router.push('/posts');
  }, [router, resetForm]);

  const handleCancelLeave = useCallback((): void => {
    setShowUnsavedWarning(false);
  }, []);

  // Memoize the content change handler to prevent unnecessary re-renders
  const handleContentChange = useCallback(
    (content: string): void => {
      updateFormData({ content });
    },
    [updateFormData],
  );

  const handleManualSave = useCallback(async (): Promise<void> => {
    if (formData.title.trim()) {
      await savePost();
    }
  }, [formData.title, savePost]);

  const handleManualSaveClick = useCallback((): void => {
    void handleManualSave();
  }, [handleManualSave]);

  const handleContinueClick = useCallback((): void => {
    void handleContinue();
  }, [handleContinue]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      updateFormData({ title: e.target.value });
    },
    [updateFormData],
  );

  // Memoize the initial content to prevent the editor from re-initializing
  const stableInitialContent = useMemo((): string => {
    // For new posts, use the current content from the store or empty string
    return formData.content || '';
  }, []); // Empty dependency array to stabilize the value

  return (
    <div className="min-h-screen bg-background">
      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Alert className="max-w-md bg-background border shadow-lg">
            <AlertDescription className="space-y-4">
              <p>You have unsaved changes. Are you sure you want to leave?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelLeave}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmLeave}>
                  Leave Without Saving
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

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
              onClick={handleManualSaveClick}
              disabled={!formData.title.trim() || autoSaveStatus === 'saving'}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            {/* Floating continue button */}
            <Button
              size="sm"
              className=""
              onClick={handleContinueClick}
              disabled={!formData.title.trim()}
            >
              Continue to Settings →
            </Button>
          </div>
        </div>
      </header>

      {/* Full-screen editor */}
      <main className="px-4 py-8 lg:ml-16">
        <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto space-y-6">
          {/* Title input */}
          <div>
            <input
              type="text"
              placeholder="Post title..."
              value={formData.title}
              onChange={handleTitleChange}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground focus:ring-0 p-0"
            />
          </div>

          {/* Content editor */}
          <div className="min-h-[500px]">
            <PostEditor
              key="new-post-editor"
              initialContent={stableInitialContent}
              onChange={handleContentChange}
              placeholder="Start writing your post..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
