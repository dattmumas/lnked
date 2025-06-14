import { useEffect, useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { usePostEditorStore, PostFormData } from '@/lib/stores/post-editor-store';
import { User } from '@supabase/supabase-js';
import { Json } from '@/lib/database.types';
import { AUTO_SAVE_DEBOUNCE_MS, POST_STALE_TIME_MS } from '@/lib/constants/post-editor';

/** Helper: value exists and is not an empty string */
const exists = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== '';

// Simple client-side user hook
const useUser = (): { user: User | null; loading: boolean } => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

// Auto-save mutation hook
export const useAutoSavePost = (): UseMutationResult<
  PostFormData,
  Error,
  PostFormData & { author_id: string }
> => {
  const queryClient = useQueryClient();
  const store = usePostEditorStore();
  const { markSaving, markSaved, markError, updateFormData } = store;

  return useMutation({
    mutationFn: async (data: PostFormData & { author_id: string }): Promise<PostFormData> => {
      const supabase = createSupabaseBrowserClient();

      // Validate required fields
      if (
        data.author_id === null ||
        data.author_id === undefined ||
        data.author_id === ''
      ) {
        throw new Error('Missing author_id - user not authenticated');
      }

      if (
        data.title === null ||
        data.title === undefined ||
        data.title.trim() === ''
      ) {
        throw new Error('Title is required for saving');
      }

      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError !== null && authError !== undefined) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (
        session === null ||
        session === undefined ||
        session.user === null ||
        session.user === undefined
      ) {
        throw new Error('User not authenticated');
      }

      // Use the post ID from the data (which comes from the store)
      // This ensures we update the same post after the first save
      const postData = {
        id: data.id, // This will be undefined for new posts, set after first save
        title: data.title,
        content: data.content,
        subtitle: data.subtitle || null,
        author: data.author || null,
        author_id: data.author_id,
        seo_title: data.seo_title || null,
        meta_description: data.meta_description || null,
        thumbnail_url: data.thumbnail_url || null,
        post_type: data.post_type,
        metadata: (data.metadata || {}) as Json,
        is_public: data.is_public,
        status: data.status,
        collective_id: data.collective_id || null,
        published_at: data.published_at || null,
      };

      const { data: post, error } = await supabase
        .from('posts')
        .upsert(postData)
        .select()
        .single();

      if (error !== null && error !== undefined) {
        console.error('❌ Auto-save failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      if (post === null || post === undefined) {
        throw new Error('Post was not returned from database after save');
      }

      return {
        ...data,
        id: post.id,
      };
    },
    onMutate: () => {
      markSaving();
    },
    onSuccess: (savedPost) => {
      console.warn('✅ Auto-save successful');
      markSaved();
      
      // Update the store with the post ID only if it's a new post (current form data has no ID)
      if (
        savedPost.id !== null &&
        savedPost.id !== undefined &&
        savedPost.id !== '' &&
        (store.formData.id === null ||
          store.formData.id === undefined ||
          store.formData.id === '')
      ) {
        updateFormData({ id: savedPost.id });
      }
      
      // Update the query cache
      queryClient.setQueryData(['post', savedPost.id], savedPost);
    },
    onError: (error) => {
      console.error('❌ Auto-save error:', error.message);
      markError();
    },
  });
};

// Load existing post data query
export const usePostData = (
  postId?: string,
): ReturnType<typeof useQuery<PostFormData | null>> => {
  return useQuery<PostFormData | null>({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostFormData | null> => {
      if (postId === null || postId === undefined || postId === '') {
        return null;
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error !== null && error !== undefined) {
        console.error('Failed to load post:', error);
        throw error;
      }

      // Transform database data to form data
      return {
        id: data.id,
        title: data.title,
        content: data.content || '',
        subtitle: data.subtitle || '',
        author: data.author || '',
        seo_title: data.seo_title || '',
        meta_description: data.meta_description || '',
        thumbnail_url: data.thumbnail_url || '',
        post_type: data.post_type,
        metadata: (data.metadata as Record<string, unknown>) || {},
        is_public: data.is_public ?? false,
        status: (data.status as 'draft' | 'active' | 'removed') || 'draft',
        collective_id: data.collective_id || undefined,
        published_at: data.published_at || undefined,
      };
    },
    enabled: postId !== null && postId !== undefined && postId !== '',
    staleTime: POST_STALE_TIME_MS,
  });
};

// Returned shape of the `usePostEditor` hook – kept explicit to satisfy
// `@typescript-eslint/explicit-function-return-type`.
interface UsePostEditorResult {
  formData: PostFormData | undefined;
  originalData: PostFormData | null;
  isDirty: boolean;
  isLoading: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  currentPage: 'editor' | 'details';
  updateFormData: (updates: Partial<PostFormData>) => void;
  setCurrentPage: (page: 'editor' | 'details') => void;
  resetForm: () => void;
  savePost: () => Promise<PostFormData | undefined> | undefined;
  publishPost: () => Promise<PostFormData | undefined> | undefined;
  isSaving: boolean;
  saveError: unknown;
}

// Main post editor hook that integrates everything
export const usePostEditor = (postId?: string): UsePostEditorResult => {
  const store = usePostEditorStore();
  const autoSave = useAutoSavePost();
  const { data: postData, isLoading: isLoadingPost } = usePostData(postId);
  const { user } = useUser();

  // Initialize form data from server when post loads
  useEffect(() => {
    if (
      postData !== null &&
      postData !== undefined &&
      (store.originalData === null || store.originalData === undefined)
    ) {
      store.initializeForm(postData);
    }
  }, [postData, store.originalData, store]);

  // Auto-save when dirty with 500ms debounce
  useEffect((): (() => void) | undefined => {
    // Don't auto-save while loading initial data
    if (isLoadingPost) {
      return undefined;
    }

    // Check all conditions for auto-save
    if (
      store.isDirty &&
      exists(store.formData) &&
      exists(store.formData.title) &&
      (store.formData.title as string).trim() !== '' &&
      exists(user) &&
      exists((user as User).id)
    ) {
      const timer = setTimeout(() => {
        console.warn('🚀 Auto-saving post...');
        // The store.formData already contains the post ID (if it exists)
        const dataToSave = {
          ...store.formData,
          author_id: user.id,
        };
        autoSave.mutate(dataToSave);
      }, AUTO_SAVE_DEBOUNCE_MS);

      return (): void => {
        clearTimeout(timer);
      };
    }

    return undefined;
  }, [store.formData, store.isDirty, autoSave, user, isLoadingPost]);

  // Manual save function
  const savePost = useCallback((): Promise<PostFormData | undefined> => {
    if (exists(store.formData) && exists(user) && exists((user as User).id)) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
      };
      return autoSave.mutateAsync(dataToSave);
    }

    return undefined;
  }, [store.formData, autoSave, user]);

  // Publish post function
  const publishPost = useCallback((): Promise<PostFormData | undefined> => {
    if (exists(store.formData) && exists(user) && exists((user as User).id)) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        status: 'active' as const,
        is_public: true,
        published_at: new Date().toISOString(),
      };
      
      store.updateFormData({
        status: 'active',
        is_public: true,
        published_at: dataToSave.published_at,
      });
      
      return autoSave.mutateAsync(dataToSave);
    }

    return undefined;
  }, [store, autoSave, user]);

  return {
    // Form data and state
    formData: store.formData,
    originalData: store.originalData,
    isDirty: store.isDirty,
    isLoading: isLoadingPost || store.isLoading,
    
    // Auto-save status
    autoSaveStatus: store.autoSaveStatus,
    
    // Current page
    currentPage: store.currentPage,
    
    // Actions
    updateFormData: store.updateFormData,
    setCurrentPage: store.setCurrentPage,
    resetForm: store.resetForm,
    savePost,
    publishPost,
    
    // React Query states
    isSaving: autoSave.isPending,
    saveError: autoSave.error,
  };
};