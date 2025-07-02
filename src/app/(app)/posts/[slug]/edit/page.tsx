'use client';

import { ChevronLeft, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { usePostEditor } from '@/hooks/posts/usePostEditor';

// Load the rich text editor dynamically to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor'),
  { ssr: false },
);

export default function EditPostEditorPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const postId = params['slug'] as string;

  const { formData, updateFormData, savePost, publishPost } =
    usePostEditor(postId);

  const handleSaveDraft = useCallback(async (): Promise<void> => {
    await savePost();
  }, [savePost]);

  const handlePublish = useCallback(async (): Promise<void> => {
    await publishPost();
  }, [publishPost]);

  const handleSettingsClick = useCallback((): void => {
    router.push(`/posts/${postId}/edit/details`);
  }, [router, postId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/posts"
                className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="hidden md:block text-sm text-foreground/50">
                Editing Post
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSettingsClick}
                className="flex items-center gap-2 transition-all"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveDraft}
                disabled={!formData?.title}
                className="transition-all"
              >
                Save Draft
              </Button>

              <Button
                onClick={handlePublish}
                disabled={!formData?.title}
                size="sm"
                className="relative transition-all duration-200"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Post title..."
              value={formData?.title || ''}
              onChange={(e) => updateFormData({ title: e.target.value })}
              className="w-full text-3xl font-bold border-0 outline-none placeholder:text-muted-foreground focus:ring-0 p-0 bg-transparent"
            />
          </div>

          {/* Rich Text Editor with existing content */}
          <RichTextEditor postId={postId} />
        </div>
      </main>
    </div>
  );
}
