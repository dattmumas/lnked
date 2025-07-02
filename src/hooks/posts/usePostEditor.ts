import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useUser } from '@/hooks/useUser';
import { Database } from '@/lib/database.types';
import {
  usePostEditorStore,
  type PostEditorFormData,
  CollectiveSharingSettings,
} from '@/lib/stores/post-editor-v2-store';
import createBrowserSupabaseClient from '@/lib/supabase/browser';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

// Type definitions
type PostRow = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostCollectiveRow =
  Database['public']['Tables']['post_collectives']['Row'];
type PostCollectiveInsert =
  Database['public']['Tables']['post_collectives']['Insert'];

// Auto-save mutation hook using proper database types
export const useAutoSavePost = (): UseMutationResult<
  PostEditorFormData,
  Error,
  PostEditorFormData & { author_id: string }
> => {
  const queryClient = useQueryClient();
  const store = usePostEditorStore();
  const { markSaving, markSaved, markError, updateFormData } = store;

  return useMutation({
    retry: false,
    mutationFn: async (
      data: PostEditorFormData & { author_id: string },
    ): Promise<PostEditorFormData> => {
      const supabase = createBrowserSupabaseClient;

      // Validate required fields - for autosave, we only need author_id and at least some content
      if (
        !data.author_id ||
        !data.id ||
        ((data.title?.trim() ?? '') === '' && (data.content ?? '') === '')
      ) {
        throw new Error('Missing required fields');
      }

      // Determine tenant_id: use collective_id if present, otherwise use author_id as personal tenant
      const tenant_id = data.collective_id || data.author_id;

      // Use client-side UUID for slug temporarily to avoid collisions
      // The slug will be properly generated when the post is published
      const tempSlug = data.id || `draft-${crypto.randomUUID()}`;

      const postData: PostInsert = {
        id: data.id, // Validated above to be non-null
        title: data.title || 'Untitled Post',
        content: data.content ?? null,
        subtitle: data.subtitle || null,
        author_id: data.author_id,
        tenant_id,
        slug: tempSlug,
        seo_title: data.seo_title || null,
        meta_description: data.meta_description || null,
        thumbnail_url: data.thumbnail_url || null,
        post_type: data.post_type,
        metadata: {
          ...data.metadata,
          ...(data.collective_sharing_settings
            ? {
                collective_sharing_settings: data.collective_sharing_settings,
              }
            : {}),
          ...(data.selected_collectives
            ? { selected_collectives: data.selected_collectives }
            : {}),
        } as unknown as Database['public']['Tables']['posts']['Row']['metadata'],
        is_public: data.is_public,
        status: data.status,
        collective_id: data.collective_id || null,
        published_at: data.published_at || null,
      };

      // Use upsert to handle both create and update in one operation
      const { data: post, error } = await supabase
        .from('posts')
        .upsert(postData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Auto-save failed:', error);
        throw new Error(`Failed to save post: ${error.message}`);
      }

      if (!post) {
        throw new Error('Post was not returned from database after save');
      }

      return {
        ...data,
        id: post.id,
      };
    },
    onMutate: () => markSaving(),
    onSuccess: (savedPost) => {
      markSaved();
      if (savedPost.id && !store.formData.id) {
        updateFormData({ id: savedPost.id });
      }
      queryClient.setQueryData(['post', savedPost.id], savedPost);
    },
    onError: (error) => {
      console.error('Auto-save error:', error.message);
      markError();
    },
  });
};

// Load existing post data
export const usePostData = (
  postId?: string,
): UseQueryResult<PostEditorFormData | null, Error> => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostEditorFormData | null> => {
      if (!postId) return null;

      const supabase = createBrowserSupabaseClient;

      // Check if postId is a UUID or a slug
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          postId,
        );

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', postId)
        .single();

      if (error) {
        console.error('Failed to load post:', error);
        throw error;
      }

      // Extract metadata
      const metadata = (data.metadata as Record<string, unknown>) ?? {};
      const collectiveSharingSettings = (metadata[
        'collective_sharing_settings'
      ] ?? {}) as Record<string, CollectiveSharingSettings>;
      const selectedCollectives =
        (metadata['selected_collectives'] as string[] | undefined) ?? [];

      const postData: PostEditorFormData = {
        id: data.id,
        title: data.title ?? '',
        content: data.content ?? '',
        ...(data.subtitle ? { subtitle: data.subtitle } : {}),
        ...(data.seo_title ? { seo_title: data.seo_title } : {}),
        ...(data.meta_description
          ? { meta_description: data.meta_description }
          : {}),
        ...(data.thumbnail_url ? { thumbnail_url: data.thumbnail_url } : {}),
        post_type: data.post_type,
        metadata,
        is_public: data.is_public,
        status: data.status,
        ...(data.collective_id ? { collective_id: data.collective_id } : {}),
        selected_collectives: selectedCollectives,
        collective_sharing_settings: collectiveSharingSettings,
        ...(data.published_at ? { published_at: data.published_at } : {}),
      };

      return postData;
    },
    enabled: Boolean(postId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

interface UsePostEditorReturn {
  // Form data and state
  formData: PostEditorFormData;
  originalData: PostEditorFormData | undefined;
  isDirty: boolean;
  isLoading: boolean;

  // Auto-save status
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Current page
  currentPage: string;

  // Collective data
  selectedCollectives: string[];
  collectiveSharingSettings: Record<string, CollectiveSharingSettings>;

  // Actions
  updateFormData: (data: Partial<PostEditorFormData>) => void;
  setCurrentPage: (page: 'editor' | 'details') => void;
  resetForm: () => void;
  savePost: () => Promise<PostEditorFormData | undefined>;
  publishPost: () => Promise<PostEditorFormData | undefined>;

  // Collective management
  addCollective: (collectiveId: string) => void;
  removeCollective: (collectiveId: string) => void;
  updateCollectiveSharingSettings: (
    collectiveId: string,
    settings: Partial<CollectiveSharingSettings>,
  ) => void;
  setSelectedCollectives: (collectiveIds: string[]) => void;
  clearCollectiveSelections: () => void;

  // Backward compatibility
  getLegacyCollectiveId: () => string | undefined;
  setLegacyCollectiveId: (collectiveId: string | undefined) => void;
  migrateFromLegacyData: (data: PostEditorFormData) => void;

  // React Query states
  isSaving: boolean;
  saveError: Error | null;
}

// Main post editor hook
export const usePostEditor = (postId?: string): UsePostEditorReturn => {
  const store = usePostEditorStore();
  const autoSave = useAutoSavePost();
  const { data: postData, isLoading: isLoadingPost } = usePostData(postId);
  const { user } = useUser();

  // Initialize form data from server when post loads
  useEffect(() => {
    if (postData && !store.originalData) {
      store.initializeForm(postData);
    }
  }, [postData, store.originalData, store]);

  // Manual save function
  const savePost = useCallback((): Promise<PostEditorFormData | undefined> => {
    if (store.formData && user?.id) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        selected_collectives: store.selectedCollectives,
        collective_sharing_settings: store.collectiveSharingSettings,
      };
      return autoSave.mutateAsync(dataToSave);
    }
    return Promise.resolve(undefined);
  }, [
    store.formData,
    autoSave,
    user?.id,
    store.selectedCollectives,
    store.collectiveSharingSettings,
  ]);

  // Publish post function (save + set status to published)
  const publishPost = useCallback((): Promise<
    PostEditorFormData | undefined
  > => {
    if (store.formData && user?.id) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        status: 'active' as const,
        published_at: new Date().toISOString(),
        selected_collectives: store.selectedCollectives,
        collective_sharing_settings: store.collectiveSharingSettings,
      };
      return autoSave.mutateAsync(dataToSave);
    }
    return Promise.resolve(undefined);
  }, [
    store.formData,
    autoSave,
    user?.id,
    store.selectedCollectives,
    store.collectiveSharingSettings,
  ]);

  return {
    // Form data and state
    formData: store.formData,
    originalData: store.originalData,
    isDirty: store.isDirty,
    isLoading: store.isLoading || isLoadingPost,

    // Auto-save status
    autoSaveStatus: store.autoSaveStatus,

    // Current page
    currentPage: store.currentPage,

    // Collective data
    selectedCollectives: store.selectedCollectives,
    collectiveSharingSettings: store.collectiveSharingSettings,

    // Actions
    updateFormData: store.updateFormData,
    setCurrentPage: store.setCurrentPage,
    resetForm: store.resetForm,
    savePost,
    publishPost,

    // Collective management
    addCollective: store.addCollective,
    removeCollective: store.removeCollective,
    updateCollectiveSharingSettings: store.updateCollectiveSharingSettings,
    setSelectedCollectives: store.setSelectedCollectives,
    clearCollectiveSelections: store.clearCollectiveSelections,

    // Backward compatibility
    getLegacyCollectiveId: store.getLegacyCollectiveId,
    setLegacyCollectiveId: store.setLegacyCollectiveId,
    migrateFromLegacyData: store.migrateFromLegacyData,

    // React Query states
    isSaving: autoSave.isPending,
    saveError: autoSave.error,
  };
};

// Backward compatibility export
export { usePostEditor as useEnhancedPostEditor };
