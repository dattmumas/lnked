'use client';

import { ChevronLeft, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { usePostEditor } from '@/hooks/posts/usePostEditor';
import { useUser } from '@/hooks/useUser';
import { draftService } from '@/lib/services/draft-service';
import { usePostEditorStore } from '@/lib/stores/post-editor-v2-store';
import { useTenant } from '@/providers/TenantProvider';

// Load the rich text editor dynamically to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor'),
  { ssr: false },
);

export default function NewPostEditorPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formData, updateFormData, publishPost, autoSaveStatus } =
    usePostEditor();
  const { user } = useUser();
  const { currentTenant, isPersonalTenant } = useTenant();
  const postEditorStore = usePostEditorStore();

  // Only render the editor once we have attempted to restore any draft
  const [draftReady, setDraftReady] = useState(false);

  // Generate ID if missing, then attempt to restore any persisted draft

  useEffect(() => {
    (async () => {
      // ---------- ID PERSISTENCE ----------
      let postId = formData.id;

      // 1️⃣ Try to pick up ?id=<uuid> from the URL
      if (!postId) {
        postId = searchParams.get('id') || undefined;
      }

      // 2️⃣ If still missing, create a new one and write it back to the URL
      if (!postId) {
        postId = crypto.randomUUID();
        console.log('🆕 Generated post ID for new post:', postId);

        // Append ?id=postId to the current URL without adding to history
        const url = new URL(window.location.href);
        url.searchParams.set('id', postId);
        router.replace(url.toString());
      }

      // 3️⃣ Hydrate store if changed
      if (formData.id !== postId) {
        updateFormData({ id: postId });
      }

      // 4️⃣ Try to restore a persisted draft (IndexedDB ➜ Supabase fallback)
      if (user?.id && postId) {
        try {
          const persisted = await draftService.loadDraft(postId, user.id);
          if (persisted) {
            console.log('📥 Restored draft after refresh');
            updateFormData(persisted);
          }
        } catch (err) {
          console.warn('Failed to restore draft:', err);
        }
      }

      // after all attempts finish (success or error) mark draft ready
      setDraftReady(true);
    })();
  }, [formData.id, user?.id, searchParams, router, updateFormData]);

  // Seed collective when tenant is collective and not already selected
  useEffect(() => {
    if (
      currentTenant &&
      !isPersonalTenant &&
      currentTenant.tenant_id &&
      postEditorStore.selectedCollectives.length === 0
    ) {
      postEditorStore.addCollective(currentTenant.tenant_id);
      postEditorStore.setLegacyCollectiveId(currentTenant.tenant_id);
    }
  }, [
    currentTenant,
    isPersonalTenant,
    postEditorStore.addCollective,
    postEditorStore.setLegacyCollectiveId,
    postEditorStore.selectedCollectives.length,
  ]);

  // Title changes are now autosaved through the unified editor autosave pipeline

  const handlePublish = useCallback(async (): Promise<void> => {
    await publishPost();

    if (formData.id) {
      draftService.deleteDraftLocal(formData.id).catch(console.error);
    }

    // Redirect to posts list (starts fresh next time)
    router.replace('/posts');
  }, [publishPost, formData.id, router]);

  const handleSettingsClick = useCallback((): void => {
    router.push('/posts/new/details');
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 border-b bg-background z-0">
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
            </div>

            <div className="flex items-center gap-3">
              {/* Autosave status indicator */}
              {autoSaveStatus !== 'idle' && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                      Saving...
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      Saved
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <div className="h-2 w-2 bg-red-500 rounded-full" />
                      Error saving
                    </>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSettingsClick}
                className="flex items-center gap-2 transition-all"
              >
                <Settings className="h-4 w-4" />
                Continue to Publish
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
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              className="w-full text-3xl font-bold border-0 outline-none placeholder:text-muted-foreground focus:ring-0 p-0 bg-transparent"
            />
          </div>

          {/* Rich Text Editor for post content */}
          {draftReady ? (
            <RichTextEditor />
          ) : (
            <div className="rounded-lg p-4 text-sm text-muted-foreground animate-pulse bg-card">
              Loading editor…
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
